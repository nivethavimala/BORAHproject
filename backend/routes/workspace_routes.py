from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from flask import Blueprint, g, jsonify, request

from backend.extensions import db_orm
from backend.models import (
    ActivityLog,
    Attachment,
    Meeting,
    Notification,
    Project,
    Schedule,
    Task,
    TaskActivityLink,
    now_iso,
    rand_id,
)
from backend.security import authenticate_token
from backend.utils_time import (
    calc_duration_minutes,
    format_duration_minutes,
    get_week_bounds,
    parse_ymd,
)

workspace_bp = Blueprint('workspace_bp', __name__)


def _today_ymd() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%d')


def _attachment_counts(user_id: str, entity_type: str) -> Dict[str, int]:
    rows = Attachment.query.filter_by(user_id=user_id, entity_type=entity_type).all()
    counts: Dict[str, int] = defaultdict(int)
    for row in rows:
        counts[row.entity_id] += 1
    return counts


# ==========================================
# PROFESSIONAL DASHBOARD OVERVIEW
# ==========================================


@workspace_bp.get('/api/dashboard')
@authenticate_token
def get_dashboard_overview() -> Any:
    uid = g.user['userId']
    target_date_str = request.args.get('date') or _today_ymd()
    anchor = parse_ymd(target_date_str) or datetime.now(timezone.utc).date()
    target_date = anchor.strftime('%Y-%m-%d')
    week_start, week_end = get_week_bounds(anchor)
    ws_str, we_str = week_start.strftime('%Y-%m-%d'), week_end.strftime('%Y-%m-%d')

    today_activities = (
        ActivityLog.query.filter_by(user_id=uid, activity_date=target_date)
        .order_by(ActivityLog.start_time.asc())
        .all()
    )
    week_activities = (
        ActivityLog.query.filter(
            ActivityLog.user_id == uid,
            ActivityLog.activity_date >= ws_str,
            ActivityLog.activity_date <= we_str,
        )
        .order_by(ActivityLog.activity_date.desc(), ActivityLog.start_time.desc())
        .all()
    )
    recent_activities = (
        ActivityLog.query.filter_by(user_id=uid)
        .order_by(ActivityLog.activity_date.desc(), ActivityLog.start_time.desc())
        .limit(6)
        .all()
    )

    all_tasks = Task.query.filter_by(user_id=uid).all()
    completed_tasks = [t for t in all_tasks if t.completed or t.status == 'completed']
    pending_tasks = [t for t in all_tasks if not (t.completed or t.status == 'completed')]

    upcoming_schedules = (
        Schedule.query.filter(Schedule.user_id == uid, Schedule.date >= target_date)
        .order_by(Schedule.date.asc(), Schedule.start_time.asc())
        .limit(6)
        .all()
    )
    today_schedules = [s for s in upcoming_schedules if s.date == target_date]

    unread_notifications = (
        Notification.query.filter_by(user_id=uid, is_read=False)
        .order_by(Notification.created_at.desc())
        .limit(5)
        .all()
    )
    active_projects = Project.query.filter_by(user_id=uid, status='active').count()

    # Strictly sum actual recorded time from logged activities
    recorded_minutes_today = sum(int(a.duration_minutes or 0) for a in today_activities)
    recorded_minutes_week = sum(int(a.duration_minutes or 0) for a in week_activities)

    # Weekly daily bar series
    daily_minutes_map: Dict[str, int] = defaultdict(int)
    daily_count_map: Dict[str, int] = defaultdict(int)
    category_minutes_map: Dict[str, int] = defaultdict(int)
    for act in week_activities:
        daily_minutes_map[act.activity_date] += int(act.duration_minutes or 0)
        daily_count_map[act.activity_date] += 1
        category_minutes_map[act.category or 'Other'] += int(act.duration_minutes or 0)

    weekly_series = []
    for offset in range(7):
        d = week_start + timedelta(days=offset)
        d_str = d.strftime('%Y-%m-%d')
        weekly_series.append({
            'date': d_str,
            'label': d.strftime('%a'),
            'minutes': daily_minutes_map[d_str],
            'hours': round(daily_minutes_map[d_str] / 60.0, 2),
            'count': daily_count_map[d_str],
        })

    category_breakdown = [
        {'category': cat, 'minutes': mins, 'hours': round(mins / 60.0, 2)}
        for cat, mins in sorted(category_minutes_map.items(), key=lambda item: item[1], reverse=True)
    ]

    return jsonify({
        'success': True,
        'date': target_date,
        'overview': {
            'activities_today': len(today_activities),
            'activities_completed_today': sum(1 for a in today_activities if a.status == 'completed'),
            'activities_pending_today': sum(1 for a in today_activities if a.status != 'completed'),
            'recorded_minutes_today': recorded_minutes_today,
            'recorded_duration_label': format_duration_minutes(recorded_minutes_today),
            'recorded_minutes_week': recorded_minutes_week,
            'recorded_week_label': format_duration_minutes(recorded_minutes_week),
            'tasks_total': len(all_tasks),
            'tasks_completed': len(completed_tasks),
            'tasks_pending': len(pending_tasks),
            'upcoming_events_count': len(upcoming_schedules),
            'today_events_count': len(today_schedules),
            'active_projects_count': active_projects,
        },
        'today_activities': [a.to_dict() for a in today_activities],
        'recent_activities': [a.to_dict() for a in recent_activities],
        'upcoming_schedules': [s.to_dict() for s in upcoming_schedules],
        'pending_task_highlights': [t.to_dict() for t in pending_tasks[:5]],
        'reminders': [n.to_dict() for n in unread_notifications],
        'weekly_series': weekly_series,
        'category_breakdown': category_breakdown,
    })


# ==========================================
# DAILY ACTIVITY LOG ROUTES (PRIMARY MODULE)
# ==========================================


def _serialize_activity(act: ActivityLog, link_map: Dict[str, List[str]], att_counts: Dict[str, int]) -> Dict[str, Any]:
    data = act.to_dict()
    data['linked_task_ids'] = link_map.get(act.id, [])
    data['attachment_count'] = att_counts.get(act.id, 0)
    data['duration_label'] = format_duration_minutes(act.duration_minutes)
    return data


def _sync_task_links_for_activity(user_id: str, activity_id: str, task_ids: List[str]) -> None:
    TaskActivityLink.query.filter_by(user_id=user_id, activity_id=activity_id).delete()
    clean_ids = {str(tid) for tid in task_ids if tid}
    for tid in clean_ids:
        task = Task.query.filter_by(id=tid, user_id=user_id).first()
        if task:
            # Deliberately only links task <-> activity; never alters task.completed or task.status
            db_orm.session.add(
                TaskActivityLink(
                    id=rand_id('lnk_'),
                    user_id=user_id,
                    task_id=task.id,
                    activity_id=activity_id,
                    created_at=now_iso(),
                )
            )


@workspace_bp.get('/api/activities')
@authenticate_token
def list_activities() -> Any:
    uid = g.user['userId']
    query = ActivityLog.query.filter_by(user_id=uid)

    date_filter = request.args.get('date')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    category = request.args.get('category')
    status = request.args.get('status')
    project_id = request.args.get('project_id')
    search_q = (request.args.get('q') or '').strip().lower()

    if date_filter:
        query = query.filter(ActivityLog.activity_date == date_filter)
    if start_date:
        query = query.filter(ActivityLog.activity_date >= start_date)
    if end_date:
        query = query.filter(ActivityLog.activity_date <= end_date)
    if category and category != 'all':
        query = query.filter(ActivityLog.category == category)
    if status and status != 'all':
        query = query.filter(ActivityLog.status == status)
    if project_id:
        query = query.filter(ActivityLog.project_id == project_id)

    rows = query.order_by(ActivityLog.activity_date.desc(), ActivityLog.start_time.asc()).all()
    if search_q:
        rows = [
            a
            for a in rows
            if search_q in (a.title or '').lower()
            or search_q in (a.description or '').lower()
            or search_q in (a.remarks or '').lower()
            or search_q in (a.category or '').lower()
        ]

    links = TaskActivityLink.query.filter_by(user_id=uid).all()
    link_map: Dict[str, List[str]] = defaultdict(list)
    for lnk in links:
        link_map[lnk.activity_id].append(lnk.task_id)

    att_counts = _attachment_counts(uid, 'activity')
    return jsonify({
        'success': True,
        'activities': [_serialize_activity(a, link_map, att_counts) for a in rows],
    })


@workspace_bp.post('/api/activities')
@authenticate_token
def create_activity() -> Any:
    uid = g.user['userId']
    body = request.get_json(silent=True) or {}

    title = (body.get('title') or '').strip()
    activity_date = (body.get('activity_date') or _today_ymd()).strip()
    start_time = (body.get('start_time') or '').strip()
    end_time = (body.get('end_time') or '').strip()

    if not title or not start_time or not end_time:
        return jsonify({'success': False, 'message': 'Title, start time, and end time are required.'}), 400

    duration = calc_duration_minutes(start_time, end_time)
    if duration is None:
        return jsonify({'success': False, 'message': 'End time must be equal to or after start time (HH:MM).'}), 400

    project_id = body.get('project_id') or None
    if project_id and not Project.query.filter_by(id=project_id, user_id=uid).first():
        project_id = None

    meeting_id = body.get('meeting_id') or None
    if meeting_id and not Meeting.query.filter_by(id=meeting_id, user_id=uid).first():
        meeting_id = None

    now = now_iso()
    act = ActivityLog(
        id=rand_id('act_'),
        user_id=uid,
        project_id=project_id,
        meeting_id=meeting_id,
        title=title[:220],
        description=body.get('description') or '',
        activity_date=activity_date[:32],
        start_time=start_time[:16],
        end_time=end_time[:16],
        duration_minutes=duration,
        category=(body.get('category') or 'Other')[:64],
        priority=(body.get('priority') or 'medium').lower()[:32],
        status=(body.get('status') or 'completed').lower()[:32],
        remarks=body.get('remarks') or '',
        is_shared_with_org=bool(body.get('is_shared_with_org', False)),
        created_at=now,
        updated_at=now,
    )
    db_orm.session.add(act)
    db_orm.session.flush()

    if isinstance(body.get('linked_task_ids'), list):
        _sync_task_links_for_activity(uid, act.id, body['linked_task_ids'])

    db_orm.session.commit()
    links = [lnk.task_id for lnk in TaskActivityLink.query.filter_by(user_id=uid, activity_id=act.id).all()]
    payload = act.to_dict()
    payload['linked_task_ids'] = links
    payload['attachment_count'] = 0
    payload['duration_label'] = format_duration_minutes(act.duration_minutes)
    return jsonify({'success': True, 'activity': payload, 'message': 'Activity recorded.'}), 201


@workspace_bp.put('/api/activities/<activity_id>')
@authenticate_token
def update_activity(activity_id: str) -> Any:
    uid = g.user['userId']
    act = ActivityLog.query.filter_by(id=activity_id, user_id=uid).first()
    if not act:
        return jsonify({'success': False, 'message': 'Activity record not found.'}), 404

    body = request.get_json(silent=True) or {}
    if 'title' in body and (body['title'] or '').strip():
        act.title = body['title'].strip()[:220]
    if 'description' in body:
        act.description = body['description'] or ''
    if 'activity_date' in body and body['activity_date']:
        act.activity_date = str(body['activity_date']).strip()[:32]
    if 'start_time' in body and body['start_time']:
        act.start_time = str(body['start_time']).strip()[:16]
    if 'end_time' in body and body['end_time']:
        act.end_time = str(body['end_time']).strip()[:16]

    duration = calc_duration_minutes(act.start_time, act.end_time)
    if duration is None:
        return jsonify({'success': False, 'message': 'End time must be equal to or after start time (HH:MM).'}), 400
    act.duration_minutes = duration

    if 'category' in body and body['category']:
        act.category = str(body['category'])[:64]
    if 'priority' in body and body['priority']:
        act.priority = str(body['priority']).lower()[:32]
    if 'status' in body and body['status']:
        act.status = str(body['status']).lower()[:32]
    if 'remarks' in body:
        act.remarks = body['remarks'] or ''
    if 'is_shared_with_org' in body:
        act.is_shared_with_org = bool(body['is_shared_with_org'])
    if 'project_id' in body:
        pid = body['project_id'] or None
        act.project_id = pid if (pid and Project.query.filter_by(id=pid, user_id=uid).first()) else None
    if isinstance(body.get('linked_task_ids'), list):
        _sync_task_links_for_activity(uid, act.id, body['linked_task_ids'])

    act.updated_at = now_iso()
    db_orm.session.commit()

    links = [lnk.task_id for lnk in TaskActivityLink.query.filter_by(user_id=uid, activity_id=act.id).all()]
    att_count = Attachment.query.filter_by(user_id=uid, entity_type='activity', entity_id=act.id).count()
    payload = act.to_dict()
    payload['linked_task_ids'] = links
    payload['attachment_count'] = att_count
    payload['duration_label'] = format_duration_minutes(act.duration_minutes)
    return jsonify({'success': True, 'activity': payload, 'message': 'Activity updated.'})


@workspace_bp.post('/api/activities/<activity_id>/duplicate')
@authenticate_token
def duplicate_activity(activity_id: str) -> Any:
    uid = g.user['userId']
    source = ActivityLog.query.filter_by(id=activity_id, user_id=uid).first()
    if not source:
        return jsonify({'success': False, 'message': 'Activity record not found.'}), 404

    body = request.get_json(silent=True) or {}
    target_date = (body.get('activity_date') or _today_ymd()).strip()[:32]
    now = now_iso()
    copy_act = ActivityLog(
        id=rand_id('act_'),
        user_id=uid,
        project_id=source.project_id,
        meeting_id=source.meeting_id,
        title=source.title,
        description=source.description,
        activity_date=target_date,
        start_time=source.start_time,
        end_time=source.end_time,
        duration_minutes=source.duration_minutes,
        category=source.category,
        priority=source.priority,
        status=body.get('status') or 'planned',
        remarks=source.remarks,
        is_shared_with_org=source.is_shared_with_org,
        created_at=now,
        updated_at=now,
    )
    db_orm.session.add(copy_act)
    db_orm.session.commit()
    payload = copy_act.to_dict()
    payload['linked_task_ids'] = []
    payload['attachment_count'] = 0
    payload['duration_label'] = format_duration_minutes(copy_act.duration_minutes)
    return jsonify({'success': True, 'activity': payload, 'message': 'Activity duplicated.'}), 201


@workspace_bp.delete('/api/activities/<activity_id>')
@authenticate_token
def delete_activity(activity_id: str) -> Any:
    uid = g.user['userId']
    act = ActivityLog.query.filter_by(id=activity_id, user_id=uid).first()
    if not act:
        return jsonify({'success': False, 'message': 'Activity record not found.'}), 404
    db_orm.session.delete(act)
    db_orm.session.commit()
    return jsonify({'success': True, 'message': 'Activity deleted.'})


# ==========================================
# TASKS MANAGEMENT ROUTES
# ==========================================


@workspace_bp.get('/api/tasks')
@authenticate_token
def list_tasks() -> Any:
    uid = g.user['userId']
    tasks = Task.query.filter_by(user_id=uid).order_by(Task.created_at.desc()).all()
    links = TaskActivityLink.query.filter_by(user_id=uid).all()
    task_links: Dict[str, List[str]] = defaultdict(list)
    for lnk in links:
        task_links[lnk.task_id].append(lnk.activity_id)
    att_counts = _attachment_counts(uid, 'task')

    result = []
    for t in tasks:
        d = t.to_dict()
        d['linked_activity_ids'] = task_links.get(t.id, [])
        d['attachment_count'] = att_counts.get(t.id, 0)
        result.append(d)
    return jsonify({'success': True, 'tasks': result})


@workspace_bp.post('/api/tasks')
@authenticate_token
def create_task() -> Any:
    uid = g.user['userId']
    body = request.get_json(silent=True) or {}
    title = (body.get('title') or '').strip()
    if not title:
        return jsonify({'success': False, 'message': 'Task title is required.'}), 400

    status = (body.get('status') or 'not_started').lower()
    completed = bool(body.get('completed', status == 'completed'))
    if completed:
        status = 'completed'
        progress = 100
    else:
        try:
            progress = min(100, max(0, int(body.get('progress_percent', 0))))
        except (TypeError, ValueError):
            progress = 0

    project_id = body.get('project_id') or None
    if project_id and not Project.query.filter_by(id=project_id, user_id=uid).first():
        project_id = None

    now = now_iso()
    task = Task(
        id=rand_id('tsk_'),
        user_id=uid,
        project_id=project_id,
        title=title[:220],
        description=body.get('description') or '',
        priority=(body.get('priority') or 'medium').lower()[:32],
        category=(body.get('category') or 'Personal')[:64],
        status=status[:32],
        progress_percent=progress,
        due_date=body.get('due_date') or _today_ymd(),
        due_time=body.get('due_time') or '',
        reminder_at=body.get('reminder_at') or '',
        completed=completed,
        created_at=now,
        updated_at=now,
    )
    db_orm.session.add(task)
    db_orm.session.commit()
    d = task.to_dict()
    d['linked_activity_ids'] = []
    d['attachment_count'] = 0
    return jsonify({'success': True, 'task': d, 'message': 'Task added.'}), 201


@workspace_bp.put('/api/tasks/<task_id>')
@authenticate_token
def update_task(task_id: str) -> Any:
    uid = g.user['userId']
    task = Task.query.filter_by(id=task_id, user_id=uid).first()
    if not task:
        return jsonify({'success': False, 'message': 'Task not found.'}), 404

    body = request.get_json(silent=True) or {}
    if 'title' in body and (body['title'] or '').strip():
        task.title = body['title'].strip()[:220]
    if 'description' in body:
        task.description = body['description'] or ''
    if 'priority' in body and body['priority']:
        task.priority = str(body['priority']).lower()[:32]
    if 'category' in body and body['category']:
        task.category = str(body['category'])[:64]
    if 'due_date' in body:
        task.due_date = str(body['due_date'] or '')[:32]
    if 'due_time' in body:
        task.due_time = str(body['due_time'] or '')[:16]
    if 'reminder_at' in body:
        task.reminder_at = str(body['reminder_at'] or '')[:64]
    if 'project_id' in body:
        pid = body['project_id'] or None
        task.project_id = pid if (pid and Project.query.filter_by(id=pid, user_id=uid).first()) else None

    if 'status' in body and body['status']:
        task.status = str(body['status']).lower()[:32]
        task.completed = task.status == 'completed'
        if task.completed:
            task.progress_percent = 100
    if 'completed' in body:
        task.completed = bool(body['completed'])
        if task.completed:
            task.status = 'completed'
            task.progress_percent = 100
        elif task.status == 'completed':
            task.status = 'in_progress'
    if 'progress_percent' in body and not task.completed:
        try:
            task.progress_percent = min(99, max(0, int(body['progress_percent'])))
        except (TypeError, ValueError):
            pass

    task.updated_at = now_iso()
    db_orm.session.commit()

    linked_ids = [lnk.activity_id for lnk in TaskActivityLink.query.filter_by(user_id=uid, task_id=task.id).all()]
    att_count = Attachment.query.filter_by(user_id=uid, entity_type='task', entity_id=task.id).count()
    d = task.to_dict()
    d['linked_activity_ids'] = linked_ids
    d['attachment_count'] = att_count
    return jsonify({'success': True, 'task': d})


@workspace_bp.delete('/api/tasks/<task_id>')
@authenticate_token
def delete_task(task_id: str) -> Any:
    uid = g.user['userId']
    task = Task.query.filter_by(id=task_id, user_id=uid).first()
    if not task:
        return jsonify({'success': False, 'message': 'Task not found.'}), 404
    db_orm.session.delete(task)
    db_orm.session.commit()
    return jsonify({'success': True, 'message': 'Task deleted.'})


# ==========================================
# PLANNER / TIMETABLE ROUTES
# ==========================================


@workspace_bp.get('/api/schedule')
@authenticate_token
def list_schedule() -> Any:
    uid = g.user['userId']
    query = Schedule.query.filter_by(user_id=uid)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    if start_date:
        query = query.filter(Schedule.date >= start_date)
    if end_date:
        query = query.filter(Schedule.date <= end_date)
    rows = query.order_by(Schedule.date.asc(), Schedule.start_time.asc()).all()
    return jsonify({'success': True, 'schedules': [s.to_dict() for s in rows]})


@workspace_bp.post('/api/schedule')
@authenticate_token
def create_schedule() -> Any:
    uid = g.user['userId']
    body = request.get_json(silent=True) or {}
    title = (body.get('title') or '').strip()
    start_time = body.get('start_time')
    end_time = body.get('end_time')
    date_val = body.get('date')

    if not title or not start_time or not end_time or not date_val:
        return jsonify({'success': False, 'message': 'Title, date, start time, and end time are required.'}), 400

    project_id = body.get('project_id') or None
    if project_id and not Project.query.filter_by(id=project_id, user_id=uid).first():
        project_id = None

    now = now_iso()
    sch = Schedule(
        id=rand_id('sch_'),
        user_id=uid,
        project_id=project_id,
        title=title[:220],
        description=body.get('description') or '',
        event_type=(body.get('event_type') or 'Schedule')[:64],
        category=(body.get('category') or 'Work')[:64],
        date=str(date_val)[:32],
        start_time=str(start_time)[:16],
        end_time=str(end_time)[:16],
        location=str(body.get('location') or '')[:180],
        reminder_enabled=bool(body.get('reminder_enabled', True)),
        reminder_minutes=int(body.get('reminder_minutes') or 15),
        created_at=now,
        updated_at=now,
    )
    db_orm.session.add(sch)
    db_orm.session.commit()
    return jsonify({'success': True, 'schedule': sch.to_dict(), 'message': 'Event scheduled.'}), 201


@workspace_bp.put('/api/schedule/<schedule_id>')
@authenticate_token
def update_schedule(schedule_id: str) -> Any:
    uid = g.user['userId']
    sch = Schedule.query.filter_by(id=schedule_id, user_id=uid).first()
    if not sch:
        return jsonify({'success': False, 'message': 'Schedule event not found.'}), 404

    body = request.get_json(silent=True) or {}
    for field in ('title', 'description', 'event_type', 'category', 'date', 'start_time', 'end_time', 'location'):
        if field in body and body[field] is not None:
            setattr(sch, field, str(body[field]))
    if 'reminder_enabled' in body:
        sch.reminder_enabled = bool(body['reminder_enabled'])
    if 'reminder_minutes' in body:
        try:
            sch.reminder_minutes = int(body['reminder_minutes'])
        except (TypeError, ValueError):
            pass
    sch.updated_at = now_iso()
    db_orm.session.commit()
    return jsonify({'success': True, 'schedule': sch.to_dict()})


@workspace_bp.delete('/api/schedule/<schedule_id>')
@authenticate_token
def delete_schedule(schedule_id: str) -> Any:
    uid = g.user['userId']
    sch = Schedule.query.filter_by(id=schedule_id, user_id=uid).first()
    if not sch:
        return jsonify({'success': False, 'message': 'Schedule event not found.'}), 404
    db_orm.session.delete(sch)
    db_orm.session.commit()
    return jsonify({'success': True, 'message': 'Event removed.'})


# ==========================================
# PROJECT TRACKER ROUTES
# ==========================================


@workspace_bp.get('/api/projects')
@authenticate_token
def list_projects() -> Any:
    uid = g.user['userId']
    projects = Project.query.filter_by(user_id=uid).order_by(Project.created_at.desc()).all()
    acts = ActivityLog.query.filter_by(user_id=uid).all()
    tasks = Task.query.filter_by(user_id=uid).all()
    att_counts = _attachment_counts(uid, 'project')

    mins_by_proj: Dict[str, int] = defaultdict(int)
    act_count_by_proj: Dict[str, int] = defaultdict(int)
    for a in acts:
        if a.project_id:
            mins_by_proj[a.project_id] += int(a.duration_minutes or 0)
            act_count_by_proj[a.project_id] += 1

    tasks_by_proj: Dict[str, int] = defaultdict(int)
    tasks_done_by_proj: Dict[str, int] = defaultdict(int)
    for t in tasks:
        if t.project_id:
            tasks_by_proj[t.project_id] += 1
            if t.completed or t.status == 'completed':
                tasks_done_by_proj[t.project_id] += 1

    out = []
    for p in projects:
        d = p.to_dict()
        d['logged_minutes'] = mins_by_proj[p.id]
        d['logged_duration_label'] = format_duration_minutes(mins_by_proj[p.id])
        d['activity_count'] = act_count_by_proj[p.id]
        d['task_count'] = tasks_by_proj[p.id]
        d['completed_task_count'] = tasks_done_by_proj[p.id]
        d['attachment_count'] = att_counts.get(p.id, 0)
        out.append(d)
    return jsonify({'success': True, 'projects': out})


@workspace_bp.post('/api/projects')
@authenticate_token
def create_project() -> Any:
    uid = g.user['userId']
    body = request.get_json(silent=True) or {}
    title = (body.get('title') or '').strip()
    if not title:
        return jsonify({'success': False, 'message': 'Project title is required.'}), 400

    now = now_iso()
    proj = Project(
        id=rand_id('prj_'),
        user_id=uid,
        title=title[:220],
        code=str(body.get('code') or '')[:64],
        category=str(body.get('category') or 'Project')[:64],
        status=str(body.get('status') or 'active').lower()[:32],
        start_date=str(body.get('start_date') or _today_ymd())[:32],
        target_date=str(body.get('target_date') or '')[:32],
        progress_percent=min(100, max(0, int(body.get('progress_percent') or 0))),
        description=body.get('description') or '',
        created_at=now,
        updated_at=now,
    )
    db_orm.session.add(proj)
    db_orm.session.commit()
    d = proj.to_dict()
    d.update({'logged_minutes': 0, 'logged_duration_label': '0 min', 'activity_count': 0, 'task_count': 0, 'completed_task_count': 0, 'attachment_count': 0})
    return jsonify({'success': True, 'project': d, 'message': 'Project created.'}), 201


@workspace_bp.put('/api/projects/<project_id>')
@authenticate_token
def update_project(project_id: str) -> Any:
    uid = g.user['userId']
    proj = Project.query.filter_by(id=project_id, user_id=uid).first()
    if not proj:
        return jsonify({'success': False, 'message': 'Project not found.'}), 404

    body = request.get_json(silent=True) or {}
    for field in ('title', 'code', 'category', 'status', 'start_date', 'target_date', 'description'):
        if field in body and body[field] is not None:
            setattr(proj, field, str(body[field]))
    if 'progress_percent' in body:
        try:
            proj.progress_percent = min(100, max(0, int(body['progress_percent'])))
        except (TypeError, ValueError):
            pass
    proj.updated_at = now_iso()
    db_orm.session.commit()
    return jsonify({'success': True, 'project': proj.to_dict(), 'message': 'Project updated.'})


@workspace_bp.delete('/api/projects/<project_id>')
@authenticate_token
def delete_project(project_id: str) -> Any:
    uid = g.user['userId']
    proj = Project.query.filter_by(id=project_id, user_id=uid).first()
    if not proj:
        return jsonify({'success': False, 'message': 'Project not found.'}), 404
    db_orm.session.delete(proj)
    db_orm.session.commit()
    return jsonify({'success': True, 'message': 'Project deleted.'})


# ==========================================
# MEETING RECORDS ROUTES
# ==========================================


@workspace_bp.get('/api/meetings')
@authenticate_token
def list_meetings() -> Any:
    uid = g.user['userId']
    meetings = Meeting.query.filter_by(user_id=uid).order_by(Meeting.meeting_date.desc(), Meeting.start_time.desc()).all()
    att_counts = _attachment_counts(uid, 'meeting')
    out = []
    for m in meetings:
        d = m.to_dict()
        d['duration_minutes'] = calc_duration_minutes(m.start_time, m.end_time) or 0
        d['duration_label'] = format_duration_minutes(d['duration_minutes'])
        d['attachment_count'] = att_counts.get(m.id, 0)
        out.append(d)
    return jsonify({'success': True, 'meetings': out})


@workspace_bp.post('/api/meetings')
@authenticate_token
def create_meeting() -> Any:
    uid = g.user['userId']
    body = request.get_json(silent=True) or {}
    title = (body.get('title') or '').strip()
    meeting_date = (body.get('meeting_date') or _today_ymd()).strip()
    start_time = (body.get('start_time') or '').strip()
    end_time = (body.get('end_time') or '').strip()

    if not title or not start_time or not end_time:
        return jsonify({'success': False, 'message': 'Meeting title, start time, and end time are required.'}), 400
    duration = calc_duration_minutes(start_time, end_time)
    if duration is None:
        return jsonify({'success': False, 'message': 'End time must be equal to or after start time.'}), 400

    project_id = body.get('project_id') or None
    if project_id and not Project.query.filter_by(id=project_id, user_id=uid).first():
        project_id = None

    now = now_iso()
    mtg = Meeting(
        id=rand_id('mtg_'),
        user_id=uid,
        project_id=project_id,
        title=title[:220],
        meeting_date=meeting_date[:32],
        start_time=start_time[:16],
        end_time=end_time[:16],
        location=str(body.get('location') or '')[:180],
        participants=body.get('participants') or '',
        agenda=body.get('agenda') or '',
        decisions=body.get('decisions') or '',
        action_items=body.get('action_items') or '',
        created_at=now,
        updated_at=now,
    )
    db_orm.session.add(mtg)
    db_orm.session.flush()

    if body.get('log_as_activity'):
        db_orm.session.add(
            ActivityLog(
                id=rand_id('act_'),
                user_id=uid,
                project_id=project_id,
                meeting_id=mtg.id,
                title=mtg.title,
                description=mtg.agenda or f'Participants: {mtg.participants}',
                activity_date=mtg.meeting_date,
                start_time=mtg.start_time,
                end_time=mtg.end_time,
                duration_minutes=duration,
                category='Meetings',
                priority='medium',
                status='completed',
                remarks=mtg.decisions or mtg.action_items or '',
                created_at=now,
                updated_at=now,
            )
        )

    db_orm.session.commit()
    d = mtg.to_dict()
    d['duration_minutes'] = duration
    d['duration_label'] = format_duration_minutes(duration)
    d['attachment_count'] = 0
    return jsonify({'success': True, 'meeting': d, 'message': 'Meeting saved.'}), 201


@workspace_bp.put('/api/meetings/<meeting_id>')
@authenticate_token
def update_meeting(meeting_id: str) -> Any:
    uid = g.user['userId']
    mtg = Meeting.query.filter_by(id=meeting_id, user_id=uid).first()
    if not mtg:
        return jsonify({'success': False, 'message': 'Meeting not found.'}), 404

    body = request.get_json(silent=True) or {}
    for field in ('title', 'meeting_date', 'start_time', 'end_time', 'location', 'participants', 'agenda', 'decisions', 'action_items'):
        if field in body and body[field] is not None:
            setattr(mtg, field, str(body[field]))
    if 'project_id' in body:
        pid = body['project_id'] or None
        mtg.project_id = pid if (pid and Project.query.filter_by(id=pid, user_id=uid).first()) else None
    duration = calc_duration_minutes(mtg.start_time, mtg.end_time)
    if duration is None:
        return jsonify({'success': False, 'message': 'End time must be equal to or after start time.'}), 400
    mtg.updated_at = now_iso()
    db_orm.session.commit()
    d = mtg.to_dict()
    d['duration_minutes'] = duration
    d['duration_label'] = format_duration_minutes(duration)
    return jsonify({'success': True, 'meeting': d, 'message': 'Meeting updated.'})


@workspace_bp.delete('/api/meetings/<meeting_id>')
@authenticate_token
def delete_meeting(meeting_id: str) -> Any:
    uid = g.user['userId']
    mtg = Meeting.query.filter_by(id=meeting_id, user_id=uid).first()
    if not mtg:
        return jsonify({'success': False, 'message': 'Meeting not found.'}), 404
    db_orm.session.delete(mtg)
    db_orm.session.commit()
    return jsonify({'success': True, 'message': 'Meeting deleted.'})

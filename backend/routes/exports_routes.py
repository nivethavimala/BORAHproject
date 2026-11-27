from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Tuple

from flask import Blueprint, Response, g, jsonify, request

from backend.exports.csv_builder import build_csv_bytes
from backend.exports.excel_builder import build_excel_workbook
from backend.exports.pdf_builder import build_pdf_report
from backend.models import (
    ActivityLog,
    ImportantNote,
    JournalEntry,
    Meeting,
    MoodEntry,
    Project,
    Schedule,
    Task,
    User,
)
from backend.routes.reports_routes import (
    build_daily_report_data,
    build_monthly_report_data,
    build_weekly_report_data,
)
from backend.security import authenticate_token
from backend.utils_time import (
    format_duration_minutes,
    get_month_bounds,
    get_week_bounds,
    parse_ymd,
)

exports_bp = Blueprint('exports_bp', __name__)


def _today_ymd() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%d')


def _get_date_range() -> Tuple[str, str]:
    s = (request.args.get('start_date') or '').strip()
    e = (request.args.get('end_date') or '').strip()
    return s, e


def _filter_by_date_attr(rows: List[Any], attr: str, start_date: str, end_date: str) -> List[Any]:
    out = []
    for row in rows:
        val = (getattr(row, attr, '') or '')[:10]
        if start_date and val and val < start_date:
            continue
        if end_date and val and val > end_date:
            continue
        if (start_date or end_date) and not val:
            continue
        out.append(row)
    return out


def _range_label(start_date: str, end_date: str, default_label: str = 'All Dates') -> str:
    if start_date and end_date:
        return f'{start_date} to {end_date}'
    if start_date:
        return f'From {start_date}'
    if end_date:
        return f'Until {end_date}'
    return default_label


def _send_export(filename_base: str, fmt: str, data: bytes) -> Response:
    fmt = fmt.lower()
    if fmt == 'pdf':
        mime = 'application/pdf'
        ext = 'pdf'
    elif fmt in ('xlsx', 'excel'):
        mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ext = 'xlsx'
    else:
        mime = 'text/csv; charset=utf-8'
        ext = 'csv'

    return Response(
        data,
        mimetype=mime,
        headers={'Content-Disposition': f'attachment; filename="{filename_base}.{ext}"'},
    )


def _export_tabular_dataset(
    fmt: str,
    filename_base: str,
    title: str,
    subtitle: str,
    user_name: str,
    summary_items: List[tuple[str, str]],
    headers: List[str],
    rows: List[List[Any]],
    weights: List[float] | None = None,
    sheet_name: str = 'Records',
) -> Response:
    fmt_norm = fmt.lower()
    if fmt_norm == 'pdf':
        pdf_bytes = build_pdf_report(
            title=title,
            subtitle=subtitle,
            user_name=user_name,
            summary_items=summary_items,
            sections=[{'heading': '', 'headers': headers, 'rows': [[str(c) for c in r] for r in rows], 'weights': weights}],
            landscape_mode=len(headers) >= 6,
        )
        return _send_export(filename_base, 'pdf', pdf_bytes)
    if fmt_norm in ('xlsx', 'excel'):
        xls_bytes = build_excel_workbook(
            report_title=title,
            subtitle=subtitle,
            user_name=user_name,
            sheets=[{'name': sheet_name, 'headers': headers, 'rows': rows, 'summary_items': summary_items}],
        )
        return _send_export(filename_base, 'xlsx', xls_bytes)
    csv_bytes = build_csv_bytes(headers, rows, empty_note='No records found for the selected criteria.')
    return _send_export(filename_base, 'csv', csv_bytes)


@exports_bp.get('/api/export/<module>')
@authenticate_token
def handle_independent_export(module: str) -> Any:
    uid = g.user['userId']
    user = User.query.get(uid)
    if not user:
        return jsonify({'success': False, 'message': 'Account not found.'}), 404

    fmt = (request.args.get('format') or 'pdf').strip().lower()
    if fmt not in ('pdf', 'xlsx', 'excel', 'csv'):
        return jsonify({'success': False, 'message': 'Unsupported export format. Use pdf, xlsx, or csv.'}), 400

    start_date, end_date = _get_date_range()
    today = _today_ymd()
    user_name = user.name

    # 1. Daily Activity Report
    if module == 'daily-report':
        target_date = (request.args.get('date') or start_date or today).strip()[:10]
        report = build_daily_report_data(uid, target_date)
        s = report['summary']
        headers = ['Activity', 'Category', 'Time', 'Duration', 'Priority', 'Status', 'Remarks']
        rows = [
            [
                a['title'],
                a['category'],
                f"{a['start_time']} - {a['end_time']}",
                a['duration_label'],
                a['priority'].title(),
                a['status'].title(),
                a['remarks'] or '—',
            ]
            for a in report['activities']
        ]
        summary_items = [
            ('Total Activities', str(s['total_activities'])),
            ('Completed', str(s['completed_activities'])),
            ('Pending / Ongoing', str(s['pending_activities'])),
            ('Total Recorded Time', s['total_duration_label']),
        ]
        return _export_tabular_dataset(
            fmt,
            f'BORAH_Daily_Report_{target_date}',
            f'Daily Activity Report — {target_date}',
            f'Date: {target_date}',
            user_name,
            summary_items,
            headers,
            rows,
            weights=[2.2, 1.2, 1.2, 0.9, 0.8, 0.9, 1.8],
            sheet_name='Daily Report',
        )

    # 2. Weekly Activity Report
    if module == 'weekly-report':
        anchor_str = start_date or request.args.get('date') or today
        report = build_weekly_report_data(uid, anchor_str if start_date else None)
        s = report['summary']
        ws, we = report['start_date'], report['end_date']
        summary_items = [
            ('Activities Recorded', str(s['total_activities'])),
            ('Completed / Pending', f"{s['completed_activities']} / {s['pending_activities']}"),
            ('Recorded Hours', f"{s['total_recorded_hours']} hrs ({s['total_duration_label']})"),
            ('Task Completion', f"{s['task_completion_percentage']}% ({s['tasks_completed']}/{s['tasks_total']})"),
        ]
        if fmt == 'pdf':
            cat_rows = [[c['category'], str(c['count']), c['duration_label']] for c in report['category_breakdown']]
            act_rows = [
                [a['activity_date'], a['title'], a['category'], f"{a['start_time']}-{a['end_time']}", a['duration_label'], a['status'].title()]
                for a in report['activities']
            ]
            pdf_bytes = build_pdf_report(
                f'Weekly Activity Report ({ws} to {we})',
                f'Range: {ws} to {we}',
                user_name,
                summary_items,
                [
                    {'heading': 'Category-Wise Time Distribution', 'headers': ['Category', 'Activities', 'Recorded Time'], 'rows': cat_rows, 'weights': [2, 1, 1.2]},
                    {'heading': 'Activity Log Details', 'headers': ['Date', 'Activity', 'Category', 'Time', 'Duration', 'Status'], 'rows': act_rows, 'weights': [1.0, 2.2, 1.2, 1.1, 0.9, 0.9]},
                ],
                landscape_mode=True,
            )
            return _send_export(f'BORAH_Weekly_Report_{ws}_to_{we}', 'pdf', pdf_bytes)
        if fmt in ('xlsx', 'excel'):
            xls_bytes = build_excel_workbook(
                f'Weekly Activity Report ({ws} to {we})',
                f'Range: {ws} to {we}',
                user_name,
                [
                    {
                        'name': 'Summary & Categories',
                        'summary_items': summary_items,
                        'headers': ['Category', 'Activities Count', 'Minutes', 'Hours'],
                        'rows': [[c['category'], c['count'], c['minutes'], c['hours']] for c in report['category_breakdown']],
                    },
                    {
                        'name': 'Daily Comparison',
                        'headers': ['Date', 'Day', 'Activities', 'Recorded Minutes', 'Recorded Hours'],
                        'rows': [[d['date'], d['day'], d['count'], d['minutes'], d['hours']] for d in report['daily_comparison']],
                    },
                    {
                        'name': 'Activities',
                        'headers': ['Date', 'Title', 'Category', 'Start', 'End', 'Minutes', 'Status', 'Remarks'],
                        'rows': [[a['activity_date'], a['title'], a['category'], a['start_time'], a['end_time'], a['duration_minutes'], a['status'], a['remarks']] for a in report['activities']],
                    },
                ],
            )
            return _send_export(f'BORAH_Weekly_Report_{ws}_to_{we}', 'xlsx', xls_bytes)
        rows = [[a['activity_date'], a['title'], a['category'], a['start_time'], a['end_time'], a['duration_label'], a['status'], a['remarks']] for a in report['activities']]
        return _send_export(
            f'BORAH_Weekly_Report_{ws}_to_{we}',
            'csv',
            build_csv_bytes(['Date', 'Title', 'Category', 'Start Time', 'End Time', 'Duration', 'Status', 'Remarks'], rows, 'No activities recorded in this week.'),
        )

    # 3. Monthly Activity Report
    if module == 'monthly-report':
        month_param = request.args.get('month') or (start_date[:7] if start_date else today[:7])
        report = build_monthly_report_data(uid, month_param)
        s = report['summary']
        summary_items = [
            ('Total Activities', str(s['total_activities'])),
            ('Active Days', str(s['active_days_count'])),
            ('Recorded Time', f"{s['total_recorded_hours']} hrs ({s['total_duration_label']})"),
            ('Task Completion', f"{s['task_completion_percentage']}%"),
        ]
        if fmt == 'pdf':
            cat_rows = [[c['category'], str(c['count']), c['duration_label']] for c in report['category_distribution']]
            top_rows = [[d['date'], str(d['count']), d['duration_label']] for d in report['most_active_days']]
            act_rows = [[a['activity_date'], a['title'], a['category'], a['duration_label'], a['status'].title()] for a in report['activities']]
            pdf_bytes = build_pdf_report(
                f"Monthly Activity Report — {report['month_label']}",
                f"Range: {report['start_date']} to {report['end_date']}",
                user_name,
                summary_items,
                [
                    {'heading': 'Most Active Days', 'headers': ['Date', 'Activities', 'Recorded Time'], 'rows': top_rows, 'weights': [1.2, 1, 1.2]},
                    {'heading': 'Category Distribution', 'headers': ['Category', 'Activities', 'Recorded Time'], 'rows': cat_rows, 'weights': [2, 1, 1.2]},
                    {'heading': 'Recorded Activities', 'headers': ['Date', 'Title', 'Category', 'Duration', 'Status'], 'rows': act_rows, 'weights': [1.0, 2.5, 1.3, 1.0, 0.9]},
                ],
                landscape_mode=True,
            )
            return _send_export(f"BORAH_Monthly_Report_{report['month']}", 'pdf', pdf_bytes)
        if fmt in ('xlsx', 'excel'):
            xls_bytes = build_excel_workbook(
                f"Monthly Activity Report — {report['month_label']}",
                f"Range: {report['start_date']} to {report['end_date']}",
                user_name,
                [
                    {
                        'name': 'Monthly Overview',
                        'summary_items': summary_items,
                        'headers': ['Category', 'Count', 'Minutes', 'Hours'],
                        'rows': [[c['category'], c['count'], c['minutes'], c['hours']] for c in report['category_distribution']],
                    },
                    {
                        'name': 'Most Active Days',
                        'headers': ['Date', 'Activities', 'Minutes', 'Hours'],
                        'rows': [[d['date'], d['count'], d['minutes'], d['hours']] for d in report['most_active_days']],
                    },
                    {
                        'name': 'All Monthly Logs',
                        'headers': ['Date', 'Title', 'Category', 'Start', 'End', 'Minutes', 'Status', 'Remarks'],
                        'rows': [[a['activity_date'], a['title'], a['category'], a['start_time'], a['end_time'], a['duration_minutes'], a['status'], a['remarks']] for a in report['activities']],
                    },
                ],
            )
            return _send_export(f"BORAH_Monthly_Report_{report['month']}", 'xlsx', xls_bytes)
        rows = [[a['activity_date'], a['title'], a['category'], a['start_time'], a['end_time'], a['duration_label'], a['status'], a['remarks']] for a in report['activities']]
        return _send_export(
            f"BORAH_Monthly_Report_{report['month']}",
            'csv',
            build_csv_bytes(['Date', 'Title', 'Category', 'Start Time', 'End Time', 'Duration', 'Status', 'Remarks'], rows, 'No activities recorded in this month.'),
        )

    # 4. All Activity Logs
    if module == 'activities':
        acts = ActivityLog.query.filter_by(user_id=uid).order_by(ActivityLog.activity_date.desc(), ActivityLog.start_time.asc()).all()
        acts = _filter_by_date_attr(acts, 'activity_date', start_date, end_date)
        total_mins = sum(int(a.duration_minutes or 0) for a in acts)
        rows = [[a.activity_date, a.title, a.category, f'{a.start_time}-{a.end_time}', format_duration_minutes(a.duration_minutes), a.priority.title(), a.status.title(), a.remarks or ''] for a in acts]
        return _export_tabular_dataset(
            fmt,
            f'BORAH_Activity_Logs_{today}',
            'Activity Logs Export',
            f'Date Filter: {_range_label(start_date, end_date)}',
            user_name,
            [('Total Activities', str(len(acts))), ('Total Recorded Time', format_duration_minutes(total_mins))],
            ['Date', 'Title', 'Category', 'Time', 'Duration', 'Priority', 'Status', 'Remarks'],
            rows,
            weights=[1.0, 2.0, 1.2, 1.1, 0.9, 0.8, 0.9, 1.6],
            sheet_name='Activity Logs',
        )

    # 5, 6, 7. Tasks (All / Completed / Pending)
    if module in ('tasks', 'tasks-completed', 'tasks-pending'):
        tasks = Task.query.filter_by(user_id=uid).order_by(Task.due_date.asc(), Task.created_at.desc()).all()
        tasks = _filter_by_date_attr(tasks, 'due_date', start_date, end_date)
        if module == 'tasks-completed':
            tasks = [t for t in tasks if t.completed or t.status == 'completed']
            label = 'Completed Tasks'
            fname = f'BORAH_Completed_Tasks_{today}'
        elif module == 'tasks-pending':
            tasks = [t for t in tasks if not (t.completed or t.status == 'completed')]
            label = 'Pending Tasks'
            fname = f'BORAH_Pending_Tasks_{today}'
        else:
            label = 'All Tasks'
            fname = f'BORAH_All_Tasks_{today}'
        rows = [[t.title, t.category, t.priority.title(), t.status.replace('_', ' ').title(), f'{t.progress_percent}%', t.due_date or '—', t.due_time or '—', t.description or ''] for t in tasks]
        return _export_tabular_dataset(
            fmt,
            fname,
            label,
            f'Date Filter: {_range_label(start_date, end_date)}',
            user_name,
            [('Total Exported Tasks', str(len(tasks)))],
            ['Task Title', 'Category', 'Priority', 'Status', 'Progress', 'Due Date', 'Due Time', 'Description'],
            rows,
            weights=[2.1, 1.0, 0.8, 1.0, 0.7, 1.0, 0.8, 2.0],
            sheet_name=label[:31],
        )

    # 8, 9, 10. Planner (Daily / Weekly / Monthly)
    if module in ('planner-daily', 'planner-weekly', 'planner-monthly'):
        all_sch = Schedule.query.filter_by(user_id=uid).order_by(Schedule.date.asc(), Schedule.start_time.asc()).all()
        if module == 'planner-daily':
            target = (request.args.get('date') or start_date or today)[:10]
            filtered = [s for s in all_sch if s.date == target]
            title = f'Daily Planner — {target}'
            sub = f'Date: {target}'
            fname = f'BORAH_Daily_Planner_{target}'
        elif module == 'planner-weekly':
            anchor = parse_ymd(start_date or request.args.get('date') or today) or datetime.now(timezone.utc).date()
            ws, we = (anchor, anchor + timedelta(days=6)) if start_date else get_week_bounds(anchor)
            ws_s, we_s = ws.strftime('%Y-%m-%d'), we.strftime('%Y-%m-%d')
            filtered = _filter_by_date_attr(all_sch, 'date', ws_s, we_s)
            title = f'Weekly Planner ({ws_s} to {we_s})'
            sub = f'Range: {ws_s} to {we_s}'
            fname = f'BORAH_Weekly_Planner_{ws_s}_to_{we_s}'
        else:
            m_param = request.args.get('month') or (start_date[:7] if start_date else today[:7])
            anchor = parse_ymd(f'{m_param[:7]}-01') or datetime.now(timezone.utc).date()
            ms, me = get_month_bounds(anchor)
            ms_s, me_s = ms.strftime('%Y-%m-%d'), me.strftime('%Y-%m-%d')
            filtered = _filter_by_date_attr(all_sch, 'date', ms_s, me_s)
            title = f'Monthly Planner — {ms.strftime("%B %Y")}'
            sub = f'Range: {ms_s} to {me_s}'
            fname = f'BORAH_Monthly_Planner_{ms.strftime("%Y-%m")}'

        rows = [[s.date, s.title, s.event_type, s.category, f'{s.start_time}-{s.end_time}', s.location or '—', s.description or ''] for s in filtered]
        return _export_tabular_dataset(
            fmt,
            fname,
            title,
            sub,
            user_name,
            [('Scheduled Events', str(len(filtered)))],
            ['Date', 'Event Title', 'Type', 'Category', 'Time', 'Location', 'Description'],
            rows,
            weights=[1.0, 2.0, 1.0, 1.0, 1.1, 1.2, 2.0],
            sheet_name='Planner',
        )

    # 11. Journal Entries
    if module == 'journal':
        entries = JournalEntry.query.filter_by(user_id=uid).order_by(JournalEntry.entry_date.desc()).all()
        entries = _filter_by_date_attr(entries, 'entry_date', start_date, end_date)
        rows = [[j.entry_date, j.title, j.mood, j.emotion or '—', j.content] for j in entries]
        return _export_tabular_dataset(
            fmt,
            f'BORAH_Journal_Entries_{today}',
            'Personal Journal Entries',
            f'Date Filter: {_range_label(start_date, end_date)}',
            user_name,
            [('Journal Entries', str(len(entries)))],
            ['Date', 'Title', 'Mood', 'Emotion', 'Content'],
            rows,
            weights=[1.0, 1.8, 0.9, 1.2, 3.6],
            sheet_name='Journal Entries',
        )

    # 12. Personal Notes
    if module == 'notes':
        notes = ImportantNote.query.filter_by(user_id=uid).order_by(ImportantNote.is_pinned.desc(), ImportantNote.created_at.desc()).all()
        notes = _filter_by_date_attr(notes, 'created_at', start_date, end_date)
        rows = [[n.created_at[:10], n.title, n.priority.title(), 'Yes' if n.is_pinned else 'No', n.reminder_date or '—', n.content] for n in notes]
        return _export_tabular_dataset(
            fmt,
            f'BORAH_Personal_Notes_{today}',
            'Personal Notes',
            f'Date Filter: {_range_label(start_date, end_date)}',
            user_name,
            [('Total Notes', str(len(notes)))],
            ['Created', 'Title', 'Priority', 'Pinned', 'Reminder', 'Content'],
            rows,
            weights=[1.0, 1.6, 0.8, 0.7, 1.0, 3.2],
            sheet_name='Notes',
        )

    # 13. Mood History
    if module == 'mood':
        moods = MoodEntry.query.filter_by(user_id=uid).order_by(MoodEntry.date.desc()).all()
        moods = _filter_by_date_attr(moods, 'date', start_date, end_date)
        avg_int = round(sum(int(m.intensity or 0) for m in moods) / len(moods), 1) if moods else 0
        rows = [[m.date, m.mood.title(), f'{m.intensity}/10', m.emotion or '—', m.note or ''] for m in moods]
        return _export_tabular_dataset(
            fmt,
            f'BORAH_Mood_History_{today}',
            'Personal Mood History',
            f'Date Filter: {_range_label(start_date, end_date)}',
            user_name,
            [('Mood Entries', str(len(moods))), ('Average Intensity', f'{avg_int}/10' if moods else '—')],
            ['Date', 'Mood', 'Intensity', 'Emotion', 'Reflection Note'],
            rows,
            weights=[1.1, 1.1, 0.9, 1.4, 3.2],
            sheet_name='Mood History',
        )

    # 14. Complete Personal & Workspace Data
    if module == 'complete-archive':
        acts = _filter_by_date_attr(ActivityLog.query.filter_by(user_id=uid).order_by(ActivityLog.activity_date.desc()).all(), 'activity_date', start_date, end_date)
        tasks = _filter_by_date_attr(Task.query.filter_by(user_id=uid).order_by(Task.due_date.asc()).all(), 'due_date', start_date, end_date)
        schs = _filter_by_date_attr(Schedule.query.filter_by(user_id=uid).order_by(Schedule.date.asc()).all(), 'date', start_date, end_date)
        projs = Project.query.filter_by(user_id=uid).all()
        mtgs = _filter_by_date_attr(Meeting.query.filter_by(user_id=uid).order_by(Meeting.meeting_date.desc()).all(), 'meeting_date', start_date, end_date)
        journals = _filter_by_date_attr(JournalEntry.query.filter_by(user_id=uid).order_by(JournalEntry.entry_date.desc()).all(), 'entry_date', start_date, end_date)
        notes = _filter_by_date_attr(ImportantNote.query.filter_by(user_id=uid).all(), 'created_at', start_date, end_date)
        moods = _filter_by_date_attr(MoodEntry.query.filter_by(user_id=uid).order_by(MoodEntry.date.desc()).all(), 'date', start_date, end_date)

        summary_items = [
            ('Activities', str(len(acts))),
            ('Tasks', str(len(tasks))),
            ('Planner Events', str(len(schs))),
            ('Projects / Meetings', f'{len(projs)} / {len(mtgs)}'),
            ('Journals / Notes / Moods', f'{len(journals)} / {len(notes)} / {len(moods)}'),
        ]

        if fmt in ('xlsx', 'excel'):
            xls_bytes = build_excel_workbook(
                'Complete Personal & Workspace Archive',
                f'Date Filter: {_range_label(start_date, end_date)}',
                user_name,
                [
                    {
                        'name': 'Activities',
                        'summary_items': summary_items,
                        'headers': ['Date', 'Title', 'Category', 'Start', 'End', 'Minutes', 'Status', 'Remarks'],
                        'rows': [[a.activity_date, a.title, a.category, a.start_time, a.end_time, a.duration_minutes, a.status, a.remarks] for a in acts],
                    },
                    {
                        'name': 'Tasks',
                        'headers': ['Title', 'Category', 'Priority', 'Status', 'Progress %', 'Due Date', 'Due Time'],
                        'rows': [[t.title, t.category, t.priority, t.status, t.progress_percent, t.due_date, t.due_time] for t in tasks],
                    },
                    {
                        'name': 'Planner',
                        'headers': ['Date', 'Title', 'Type', 'Category', 'Start', 'End', 'Location'],
                        'rows': [[s.date, s.title, s.event_type, s.category, s.start_time, s.end_time, s.location] for s in schs],
                    },
                    {
                        'name': 'Projects & Meetings',
                        'headers': ['Kind', 'Title', 'Date / Target', 'Category / Participants', 'Status / Decisions'],
                        'rows': [[ 'Project', p.title, p.target_date, p.category, f'{p.status} ({p.progress_percent}%)' ] for p in projs] + [[ 'Meeting', m.title, m.meeting_date, m.participants, m.decisions ] for m in mtgs],
                    },
                    {
                        'name': 'Journal',
                        'headers': ['Date', 'Title', 'Mood', 'Content'],
                        'rows': [[j.entry_date, j.title, j.mood, j.content] for j in journals],
                    },
                    {
                        'name': 'Notes & Mood',
                        'headers': ['Type', 'Date', 'Title / Mood', 'Priority / Intensity', 'Content / Note'],
                        'rows': [['Note', n.created_at[:10], n.title, n.priority, n.content] for n in notes] + [['Mood', m.date, m.mood, f'{m.intensity}/10', m.note] for m in moods],
                    },
                ],
            )
            return _send_export(f'BORAH_Complete_Data_{today}', 'xlsx', xls_bytes)

        if fmt == 'pdf':
            pdf_bytes = build_pdf_report(
                'Complete Personal & Workspace Archive',
                f'Date Filter: {_range_label(start_date, end_date)}',
                user_name,
                summary_items,
                [
                    {
                        'heading': 'Activity Logs',
                        'headers': ['Date', 'Title', 'Category', 'Time', 'Duration', 'Status'],
                        'rows': [[a.activity_date, a.title, a.category, f'{a.start_time}-{a.end_time}', format_duration_minutes(a.duration_minutes), a.status] for a in acts],
                        'weights': [1.0, 2.2, 1.2, 1.1, 0.9, 0.9],
                    },
                    {
                        'heading': 'Tasks',
                        'headers': ['Title', 'Category', 'Priority', 'Status', 'Due Date'],
                        'rows': [[t.title, t.category, t.priority, t.status, t.due_date or '—'] for t in tasks],
                        'weights': [2.4, 1.1, 0.8, 1.0, 1.0],
                    },
                    {
                        'heading': 'Planner Events',
                        'headers': ['Date', 'Title', 'Type', 'Time'],
                        'rows': [[s.date, s.title, s.event_type, f'{s.start_time}-{s.end_time}'] for s in schs],
                        'weights': [1.0, 2.5, 1.1, 1.1],
                    },
                    {
                        'heading': 'Journal Entries',
                        'headers': ['Date', 'Title', 'Mood', 'Excerpt'],
                        'rows': [[j.entry_date, j.title, j.mood, (j.content or '')[:220]] for j in journals],
                        'weights': [1.0, 1.8, 0.8, 2.8],
                    },
                    {
                        'heading': 'Notes & Mood History',
                        'headers': ['Type', 'Date', 'Title / Mood', 'Detail'],
                        'rows': [['Note', n.created_at[:10], n.title, (n.content or '')[:180]] for n in notes] + [['Mood', m.date, f'{m.mood} ({m.intensity}/10)', m.note or '—'] for m in moods],
                        'weights': [0.8, 1.0, 1.5, 2.8],
                    },
                ],
                landscape_mode=True,
            )
            return _send_export(f'BORAH_Complete_Data_{today}', 'pdf', pdf_bytes)

        combined_rows: List[List[Any]] = []
        for a in acts:
            combined_rows.append(['Activity', a.activity_date, a.title, a.category, f'{a.start_time}-{a.end_time}', format_duration_minutes(a.duration_minutes), a.status, a.remarks])
        for t in tasks:
            combined_rows.append(['Task', t.due_date, t.title, t.category, t.due_time, f'{t.progress_percent}%', t.status, t.description])
        for s in schs:
            combined_rows.append(['Planner', s.date, s.title, s.category, f'{s.start_time}-{s.end_time}', s.event_type, s.location, s.description])
        for j in journals:
            combined_rows.append(['Journal', j.entry_date, j.title, j.mood, '', '', 'Private', j.content])
        for n in notes:
            combined_rows.append(['Note', n.created_at[:10], n.title, n.priority, '', '', 'Pinned' if n.is_pinned else 'Note', n.content])
        for m in moods:
            combined_rows.append(['Mood', m.date, m.mood, '', '', f'{m.intensity}/10', m.emotion, m.note])
        return _send_export(
            f'BORAH_Complete_Data_{today}',
            'csv',
            build_csv_bytes(['Module', 'Date', 'Title', 'Category / Mood', 'Time', 'Metric / Duration', 'Status', 'Details'], combined_rows, 'No records found in archive.'),
        )

    return jsonify({'success': False, 'message': f'Unknown export module "{module}".'}), 404

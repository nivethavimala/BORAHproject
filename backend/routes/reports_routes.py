from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from flask import Blueprint, g, jsonify, request

from backend.models import ActivityLog, Task
from backend.security import authenticate_token
from backend.utils_time import (
    format_duration_minutes,
    get_month_bounds,
    get_week_bounds,
    parse_ymd,
)

reports_bp = Blueprint('reports_bp', __name__)


def build_daily_report_data(uid: str, date_str: str) -> Dict[str, Any]:
    anchor = parse_ymd(date_str) or datetime.now(timezone.utc).date()
    target = anchor.strftime('%Y-%m-%d')
    acts = (
        ActivityLog.query.filter_by(user_id=uid, activity_date=target)
        .order_by(ActivityLog.start_time.asc())
        .all()
    )

    total_minutes = sum(int(a.duration_minutes or 0) for a in acts)
    completed = sum(1 for a in acts if a.status == 'completed')
    pending = len(acts) - completed

    cat_mins: Dict[str, int] = defaultdict(int)
    cat_counts: Dict[str, int] = defaultdict(int)
    remarks_list = []
    for a in acts:
        cat = a.category or 'Other'
        cat_mins[cat] += int(a.duration_minutes or 0)
        cat_counts[cat] += 1
        if (a.remarks or '').strip():
            remarks_list.append({'title': a.title, 'remarks': a.remarks.strip(), 'category': cat})

    category_distribution = [
        {
            'category': cat,
            'count': cat_counts[cat],
            'minutes': mins,
            'duration_label': format_duration_minutes(mins),
            'hours': round(mins / 60.0, 2),
        }
        for cat, mins in sorted(cat_mins.items(), key=lambda kv: kv[1], reverse=True)
    ]

    return {
        'date': target,
        'summary': {
            'total_activities': len(acts),
            'completed_activities': completed,
            'pending_activities': pending,
            'total_recorded_minutes': total_minutes,
            'total_recorded_hours': round(total_minutes / 60.0, 2),
            'total_duration_label': format_duration_minutes(total_minutes),
        },
        'category_distribution': category_distribution,
        'remarks': remarks_list,
        'activities': [{**a.to_dict(), 'duration_label': format_duration_minutes(a.duration_minutes)} for a in acts],
    }


def build_weekly_report_data(uid: str, start_str: str | None = None) -> Dict[str, Any]:
    anchor = parse_ymd(start_str or '') or datetime.now(timezone.utc).date()
    if start_str and parse_ymd(start_str):
        week_start = anchor
        week_end = anchor + timedelta(days=6)
    else:
        week_start, week_end = get_week_bounds(anchor)

    ws_str, we_str = week_start.strftime('%Y-%m-%d'), week_end.strftime('%Y-%m-%d')
    acts = (
        ActivityLog.query.filter(
            ActivityLog.user_id == uid,
            ActivityLog.activity_date >= ws_str,
            ActivityLog.activity_date <= we_str,
        )
        .order_by(ActivityLog.activity_date.asc(), ActivityLog.start_time.asc())
        .all()
    )
    tasks_in_range = Task.query.filter(
        Task.user_id == uid,
        Task.due_date >= ws_str,
        Task.due_date <= we_str,
    ).all()
    if not tasks_in_range:
        tasks_in_range = Task.query.filter_by(user_id=uid).all()

    total_tasks = len(tasks_in_range)
    completed_tasks = sum(1 for t in tasks_in_range if t.completed or t.status == 'completed')
    task_completion_pct = round((completed_tasks / total_tasks) * 100, 1) if total_tasks else 0.0

    total_minutes = sum(int(a.duration_minutes or 0) for a in acts)
    completed_acts = sum(1 for a in acts if a.status == 'completed')
    pending_acts = len(acts) - completed_acts

    day_mins: Dict[str, int] = defaultdict(int)
    day_counts: Dict[str, int] = defaultdict(int)
    cat_mins: Dict[str, int] = defaultdict(int)
    cat_counts: Dict[str, int] = defaultdict(int)
    for a in acts:
        day_mins[a.activity_date] += int(a.duration_minutes or 0)
        day_counts[a.activity_date] += 1
        cat = a.category or 'Other'
        cat_mins[cat] += int(a.duration_minutes or 0)
        cat_counts[cat] += 1

    daily_comparison = []
    for i in range(7):
        d = week_start + timedelta(days=i)
        d_str = d.strftime('%Y-%m-%d')
        daily_comparison.append({
            'date': d_str,
            'day': d.strftime('%a'),
            'count': day_counts[d_str],
            'minutes': day_mins[d_str],
            'hours': round(day_mins[d_str] / 60.0, 2),
            'duration_label': format_duration_minutes(day_mins[d_str]),
        })

    category_breakdown = [
        {
            'category': cat,
            'count': cat_counts[cat],
            'minutes': mins,
            'hours': round(mins / 60.0, 2),
            'duration_label': format_duration_minutes(mins),
        }
        for cat, mins in sorted(cat_mins.items(), key=lambda kv: kv[1], reverse=True)
    ]

    return {
        'start_date': ws_str,
        'end_date': we_str,
        'summary': {
            'total_activities': len(acts),
            'completed_activities': completed_acts,
            'pending_activities': pending_acts,
            'total_recorded_minutes': total_minutes,
            'total_recorded_hours': round(total_minutes / 60.0, 2),
            'total_duration_label': format_duration_minutes(total_minutes),
            'tasks_total': total_tasks,
            'tasks_completed': completed_tasks,
            'task_completion_percentage': task_completion_pct,
        },
        'daily_comparison': daily_comparison,
        'category_breakdown': category_breakdown,
        'activities': [{**a.to_dict(), 'duration_label': format_duration_minutes(a.duration_minutes)} for a in acts],
    }


def build_monthly_report_data(uid: str, month_str: str | None = None) -> Dict[str, Any]:
    if month_str and len(month_str.strip()) >= 7:
        anchor = parse_ymd(f'{month_str.strip()[:7]}-01') or datetime.now(timezone.utc).date()
    else:
        anchor = datetime.now(timezone.utc).date()

    m_start, m_end = get_month_bounds(anchor)
    ms_str, me_str = m_start.strftime('%Y-%m-%d'), m_end.strftime('%Y-%m-%d')

    acts = (
        ActivityLog.query.filter(
            ActivityLog.user_id == uid,
            ActivityLog.activity_date >= ms_str,
            ActivityLog.activity_date <= me_str,
        )
        .order_by(ActivityLog.activity_date.asc(), ActivityLog.start_time.asc())
        .all()
    )
    tasks_month = Task.query.filter(
        Task.user_id == uid,
        Task.due_date >= ms_str,
        Task.due_date <= me_str,
    ).all()

    total_minutes = sum(int(a.duration_minutes or 0) for a in acts)
    day_mins: Dict[str, int] = defaultdict(int)
    day_counts: Dict[str, int] = defaultdict(int)
    cat_mins: Dict[str, int] = defaultdict(int)
    cat_counts: Dict[str, int] = defaultdict(int)
    for a in acts:
        day_mins[a.activity_date] += int(a.duration_minutes or 0)
        day_counts[a.activity_date] += 1
        cat = a.category or 'Other'
        cat_mins[cat] += int(a.duration_minutes or 0)
        cat_counts[cat] += 1

    most_active_days = [
        {
            'date': d,
            'count': day_counts[d],
            'minutes': mins,
            'hours': round(mins / 60.0, 2),
            'duration_label': format_duration_minutes(mins),
        }
        for d, mins in sorted(day_mins.items(), key=lambda kv: (kv[1], day_counts[kv[0]]), reverse=True)[:5]
    ]

    category_distribution = [
        {
            'category': cat,
            'count': cat_counts[cat],
            'minutes': mins,
            'hours': round(mins / 60.0, 2),
            'duration_label': format_duration_minutes(mins),
        }
        for cat, mins in sorted(cat_mins.items(), key=lambda kv: kv[1], reverse=True)
    ]

    total_tasks = len(tasks_month)
    completed_tasks = sum(1 for t in tasks_month if t.completed or t.status == 'completed')

    return {
        'month': m_start.strftime('%Y-%m'),
        'month_label': m_start.strftime('%B %Y'),
        'start_date': ms_str,
        'end_date': me_str,
        'summary': {
            'total_activities': len(acts),
            'completed_activities': sum(1 for a in acts if a.status == 'completed'),
            'pending_activities': sum(1 for a in acts if a.status != 'completed'),
            'active_days_count': len(day_mins),
            'total_recorded_minutes': total_minutes,
            'total_recorded_hours': round(total_minutes / 60.0, 2),
            'total_duration_label': format_duration_minutes(total_minutes),
            'tasks_total': total_tasks,
            'tasks_completed': completed_tasks,
            'task_completion_percentage': round((completed_tasks / total_tasks) * 100, 1) if total_tasks else 0.0,
        },
        'most_active_days': most_active_days,
        'category_distribution': category_distribution,
        'daily_totals': [
            {
                'date': d,
                'count': day_counts[d],
                'minutes': day_mins[d],
                'hours': round(day_mins[d] / 60.0, 2),
            }
            for d in sorted(day_mins.keys())
        ],
        'activities': [{**a.to_dict(), 'duration_label': format_duration_minutes(a.duration_minutes)} for a in acts],
    }


@reports_bp.get('/api/reports/daily')
@authenticate_token
def get_daily_report() -> Any:
    date_str = request.args.get('date') or datetime.now(timezone.utc).strftime('%Y-%m-%d')
    return jsonify({'success': True, 'report': build_daily_report_data(g.user['userId'], date_str)})


@reports_bp.get('/api/reports/weekly')
@authenticate_token
def get_weekly_report() -> Any:
    start_str = request.args.get('start_date')
    return jsonify({'success': True, 'report': build_weekly_report_data(g.user['userId'], start_str)})


@reports_bp.get('/api/reports/monthly')
@authenticate_token
def get_monthly_report() -> Any:
    month_str = request.args.get('month')
    return jsonify({'success': True, 'report': build_monthly_report_data(g.user['userId'], month_str)})

from datetime import date, datetime, timedelta
from typing import Optional, Tuple


def parse_hhmm(time_str: str) -> Optional[int]:
    """Convert 'HH:MM' (or 'HH:MM:SS') into minutes since midnight."""
    if not time_str or not isinstance(time_str, str):
        return None
    clean = time_str.strip()
    parts = clean.split(':')
    if len(parts) < 2:
        return None
    try:
        hours = int(parts[0])
        minutes = int(parts[1])
        if 0 <= hours <= 23 and 0 <= minutes <= 59:
            return hours * 60 + minutes
    except ValueError:
        return None
    return None


def calc_duration_minutes(start_time: str, end_time: str) -> Optional[int]:
    """Calculate duration in minutes from start_time to end_time (supports cross-midnight if end <= start)."""
    s = parse_hhmm(start_time)
    e = parse_hhmm(end_time)
    if s is None or e is None:
        return None
    diff = e - s
    if diff < 0:
        return None
    return diff


def format_duration_minutes(minutes: int) -> str:
    mins = max(0, int(minutes or 0))
    hrs = mins // 60
    rem = mins % 60
    if hrs == 0:
        return f'{rem} min'
    if rem == 0:
        return f'{hrs} hr' if hrs == 1 else f'{hrs} hrs'
    return f'{hrs}h {rem}m'


def parse_ymd(date_str: str) -> Optional[date]:
    if not date_str or not isinstance(date_str, str):
        return None
    try:
        return datetime.strptime(date_str.strip()[:10], '%Y-%m-%d').date()
    except ValueError:
        return None


def get_week_bounds(anchor: date) -> Tuple[date, date]:
    start = anchor - timedelta(days=anchor.weekday())
    end = start + timedelta(days=6)
    return start, end


def get_month_bounds(anchor: date) -> Tuple[date, date]:
    start = anchor.replace(day=1)
    if start.month == 12:
        next_month = start.replace(year=start.year + 1, month=1, day=1)
    else:
        next_month = start.replace(month=start.month + 1, day=1)
    end = next_month - timedelta(days=1)
    return start, end

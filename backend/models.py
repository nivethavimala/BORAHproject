import json
import secrets
import string
from datetime import datetime, timezone
from typing import Any, Dict

from sqlalchemy import ForeignKey, Index, UniqueConstraint

from backend.extensions import db_orm


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def rand_id(prefix: str, length: int = 8) -> str:
    alphabet = string.ascii_lowercase + string.digits
    token = ''.join(secrets.choice(alphabet) for _ in range(length))
    return f'{prefix}{token}'


def _parse_json(raw: str | None, default: Any) -> Any:
    if not raw:
        return default
    try:
        return json.loads(raw)
    except Exception:
        return default


def _dump_json(val: Any) -> str:
    return json.dumps(val, ensure_ascii=False)


class User(db_orm.Model):
    __tablename__ = 'users'

    id = db_orm.Column(db_orm.String(64), primary_key=True)
    name = db_orm.Column(db_orm.String(160), nullable=False)
    email = db_orm.Column(db_orm.String(255), unique=True, nullable=False, index=True)
    password_hash = db_orm.Column(db_orm.String(255), nullable=False)
    profile_photo = db_orm.Column(db_orm.Text, nullable=True)
    role = db_orm.Column(db_orm.String(32), nullable=False, default='individual')
    org_id = db_orm.Column(db_orm.String(64), nullable=True, index=True)
    job_title = db_orm.Column(db_orm.String(160), nullable=True, default='')
    department = db_orm.Column(db_orm.String(160), nullable=True, default='')
    is_verified = db_orm.Column(db_orm.Boolean, nullable=False, default=True)
    is_active = db_orm.Column(db_orm.Boolean, nullable=False, default=True)
    created_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)
    updated_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)

    def to_safe_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'profile_photo': self.profile_photo,
            'role': self.role or 'individual',
            'org_id': self.org_id,
            'job_title': self.job_title or '',
            'department': self.department or '',
            'is_verified': bool(self.is_verified),
            'is_active': bool(self.is_active),
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }


class UserSignin(db_orm.Model):
    __tablename__ = 'user_signins'

    id = db_orm.Column(db_orm.Integer, primary_key=True, autoincrement=True)
    user_id = db_orm.Column(db_orm.String(64), nullable=False, index=True)
    email = db_orm.Column(db_orm.String(255), nullable=False)
    signin_time = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)
    status = db_orm.Column(db_orm.String(64), nullable=False)
    user_agent = db_orm.Column(db_orm.Text, nullable=True)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'email': self.email,
            'signin_time': self.signin_time,
            'status': self.status,
            'user_agent': self.user_agent,
        }


class UserSettings(db_orm.Model):
    __tablename__ = 'user_settings'

    id = db_orm.Column(db_orm.String(64), primary_key=True)
    user_id = db_orm.Column(
        db_orm.String(64), ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False, index=True
    )
    theme = db_orm.Column(db_orm.String(64), nullable=False, default='warm-sunrise')
    font_family = db_orm.Column(db_orm.String(64), nullable=False, default='sans')
    font_size = db_orm.Column(db_orm.String(32), nullable=False, default='medium')
    accent_color = db_orm.Column(db_orm.String(32), nullable=False, default='#5F8D7B')
    dark_mode = db_orm.Column(db_orm.Boolean, nullable=False, default=False)
    onboarding_completed = db_orm.Column(db_orm.Boolean, nullable=False, default=False)
    primary_interests_json = db_orm.Column(
        db_orm.Text, nullable=False, default='["activities", "tasks", "planner", "reports"]'
    )
    visible_modules_json = db_orm.Column(
        db_orm.Text,
        nullable=False,
        default='{"activities": true, "tasks": true, "planner": true, "projects": true, "meetings": true, "reports": true, "exports": true, "journal": true, "memories": true, "notes": true, "mood": true, "companion": true}',
    )
    workspace_mode = db_orm.Column(db_orm.String(32), nullable=False, default='balanced')
    org_mode_enabled = db_orm.Column(db_orm.Boolean, nullable=False, default=False)
    show_companion = db_orm.Column(db_orm.Boolean, nullable=False, default=True)
    daily_reminder_time = db_orm.Column(db_orm.String(16), nullable=True, default='18:00')

    def to_dict(self) -> Dict[str, Any]:
        default_vis = {
            'activities': True,
            'tasks': True,
            'planner': True,
            'projects': True,
            'meetings': True,
            'reports': True,
            'exports': True,
            'journal': True,
            'memories': True,
            'notes': True,
            'mood': True,
            'companion': True,
        }
        parsed_vis = _parse_json(self.visible_modules_json, default_vis)
        if isinstance(parsed_vis, dict):
            merged_vis = {**default_vis, **parsed_vis}
        else:
            merged_vis = default_vis
        return {
            'id': self.id,
            'user_id': self.user_id,
            'theme': self.theme,
            'font_family': self.font_family,
            'font_size': self.font_size,
            'accent_color': self.accent_color,
            'dark_mode': bool(self.dark_mode),
            'onboarding_completed': bool(self.onboarding_completed),
            'primary_interests': _parse_json(self.primary_interests_json, ['activities', 'tasks', 'planner', 'reports']),
            'visible_modules': merged_vis,
            'workspace_mode': self.workspace_mode or 'balanced',
            'org_mode_enabled': bool(self.org_mode_enabled),
            'show_companion': bool(self.show_companion),
            'daily_reminder_time': self.daily_reminder_time or '18:00',
        }


class Organization(db_orm.Model):
    __tablename__ = 'organizations'

    id = db_orm.Column(db_orm.String(64), primary_key=True)
    name = db_orm.Column(db_orm.String(160), nullable=False)
    join_code = db_orm.Column(db_orm.String(32), unique=True, nullable=False)
    created_by = db_orm.Column(db_orm.String(64), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'join_code': self.join_code,
            'created_by': self.created_by,
            'created_at': self.created_at,
        }


class Project(db_orm.Model):
    __tablename__ = 'projects'

    id = db_orm.Column(db_orm.String(64), primary_key=True)
    user_id = db_orm.Column(db_orm.String(64), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db_orm.Column(db_orm.String(220), nullable=False)
    code = db_orm.Column(db_orm.String(64), nullable=True, default='')
    category = db_orm.Column(db_orm.String(64), nullable=False, default='Project')
    status = db_orm.Column(db_orm.String(32), nullable=False, default='active')
    start_date = db_orm.Column(db_orm.String(32), nullable=True, default='')
    target_date = db_orm.Column(db_orm.String(32), nullable=True, default='')
    progress_percent = db_orm.Column(db_orm.Integer, nullable=False, default=0)
    description = db_orm.Column(db_orm.Text, nullable=False, default='')
    created_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)
    updated_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'code': self.code or '',
            'category': self.category,
            'status': self.status,
            'start_date': self.start_date or '',
            'target_date': self.target_date or '',
            'progress_percent': int(self.progress_percent or 0),
            'description': self.description or '',
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }


class Meeting(db_orm.Model):
    __tablename__ = 'meetings'

    id = db_orm.Column(db_orm.String(64), primary_key=True)
    user_id = db_orm.Column(db_orm.String(64), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    project_id = db_orm.Column(db_orm.String(64), ForeignKey('projects.id', ondelete='SET NULL'), nullable=True, index=True)
    title = db_orm.Column(db_orm.String(220), nullable=False)
    meeting_date = db_orm.Column(db_orm.String(32), nullable=False, index=True)
    start_time = db_orm.Column(db_orm.String(16), nullable=False)
    end_time = db_orm.Column(db_orm.String(16), nullable=False)
    location = db_orm.Column(db_orm.String(180), nullable=False, default='')
    participants = db_orm.Column(db_orm.Text, nullable=False, default='')
    agenda = db_orm.Column(db_orm.Text, nullable=False, default='')
    decisions = db_orm.Column(db_orm.Text, nullable=False, default='')
    action_items = db_orm.Column(db_orm.Text, nullable=False, default='')
    created_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)
    updated_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'project_id': self.project_id,
            'title': self.title,
            'meeting_date': self.meeting_date,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'location': self.location or '',
            'participants': self.participants or '',
            'agenda': self.agenda or '',
            'decisions': self.decisions or '',
            'action_items': self.action_items or '',
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }


class ActivityLog(db_orm.Model):
    __tablename__ = 'activity_logs'

    id = db_orm.Column(db_orm.String(64), primary_key=True)
    user_id = db_orm.Column(db_orm.String(64), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    project_id = db_orm.Column(db_orm.String(64), ForeignKey('projects.id', ondelete='SET NULL'), nullable=True, index=True)
    meeting_id = db_orm.Column(db_orm.String(64), ForeignKey('meetings.id', ondelete='SET NULL'), nullable=True, index=True)
    title = db_orm.Column(db_orm.String(220), nullable=False)
    description = db_orm.Column(db_orm.Text, nullable=False, default='')
    activity_date = db_orm.Column(db_orm.String(32), nullable=False, index=True)
    start_time = db_orm.Column(db_orm.String(16), nullable=False)
    end_time = db_orm.Column(db_orm.String(16), nullable=False)
    duration_minutes = db_orm.Column(db_orm.Integer, nullable=False, default=0)
    category = db_orm.Column(db_orm.String(64), nullable=False, default='Other', index=True)
    priority = db_orm.Column(db_orm.String(32), nullable=False, default='medium')
    status = db_orm.Column(db_orm.String(32), nullable=False, default='completed', index=True)
    remarks = db_orm.Column(db_orm.Text, nullable=False, default='')
    is_shared_with_org = db_orm.Column(db_orm.Boolean, nullable=False, default=False)
    created_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)
    updated_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)

    __table_args__ = (
        Index('idx_activity_user_date', 'user_id', 'activity_date'),
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'project_id': self.project_id,
            'meeting_id': self.meeting_id,
            'title': self.title,
            'description': self.description or '',
            'activity_date': self.activity_date,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'duration_minutes': int(self.duration_minutes or 0),
            'category': self.category or 'Other',
            'priority': self.priority or 'medium',
            'status': self.status or 'completed',
            'remarks': self.remarks or '',
            'is_shared_with_org': bool(self.is_shared_with_org),
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }


class Task(db_orm.Model):
    __tablename__ = 'tasks'

    id = db_orm.Column(db_orm.String(64), primary_key=True)
    user_id = db_orm.Column(db_orm.String(64), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    project_id = db_orm.Column(db_orm.String(64), ForeignKey('projects.id', ondelete='SET NULL'), nullable=True, index=True)
    title = db_orm.Column(db_orm.String(220), nullable=False)
    description = db_orm.Column(db_orm.Text, nullable=False, default='')
    priority = db_orm.Column(db_orm.String(32), nullable=False, default='medium')
    category = db_orm.Column(db_orm.String(64), nullable=False, default='Personal')
    status = db_orm.Column(db_orm.String(32), nullable=False, default='not_started', index=True)
    progress_percent = db_orm.Column(db_orm.Integer, nullable=False, default=0)
    due_date = db_orm.Column(db_orm.String(32), nullable=False, default='')
    due_time = db_orm.Column(db_orm.String(16), nullable=False, default='')
    reminder_at = db_orm.Column(db_orm.String(64), nullable=True, default='')
    completed = db_orm.Column(db_orm.Boolean, nullable=False, default=False)
    created_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)
    updated_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'project_id': self.project_id,
            'title': self.title,
            'description': self.description or '',
            'priority': self.priority or 'medium',
            'category': self.category or 'Personal',
            'status': self.status or ('completed' if self.completed else 'not_started'),
            'progress_percent': int(self.progress_percent if self.progress_percent is not None else (100 if self.completed else 0)),
            'due_date': self.due_date or '',
            'due_time': self.due_time or '',
            'reminder_at': self.reminder_at or '',
            'completed': bool(self.completed),
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }


class TaskActivityLink(db_orm.Model):
    __tablename__ = 'task_activity_links'

    id = db_orm.Column(db_orm.String(64), primary_key=True)
    user_id = db_orm.Column(db_orm.String(64), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    task_id = db_orm.Column(db_orm.String(64), ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False, index=True)
    activity_id = db_orm.Column(db_orm.String(64), ForeignKey('activity_logs.id', ondelete='CASCADE'), nullable=False, index=True)
    created_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)

    __table_args__ = (
        UniqueConstraint('task_id', 'activity_id', name='uq_task_activity'),
    )


class Schedule(db_orm.Model):
    __tablename__ = 'schedules'

    id = db_orm.Column(db_orm.String(64), primary_key=True)
    user_id = db_orm.Column(db_orm.String(64), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    project_id = db_orm.Column(db_orm.String(64), ForeignKey('projects.id', ondelete='SET NULL'), nullable=True)
    title = db_orm.Column(db_orm.String(220), nullable=False)
    description = db_orm.Column(db_orm.Text, nullable=False, default='')
    event_type = db_orm.Column(db_orm.String(64), nullable=False, default='Schedule')
    category = db_orm.Column(db_orm.String(64), nullable=False, default='Work')
    date = db_orm.Column(db_orm.String(32), nullable=False, index=True)
    start_time = db_orm.Column(db_orm.String(16), nullable=False)
    end_time = db_orm.Column(db_orm.String(16), nullable=False)
    location = db_orm.Column(db_orm.String(180), nullable=False, default='')
    reminder_enabled = db_orm.Column(db_orm.Boolean, nullable=False, default=True)
    reminder_minutes = db_orm.Column(db_orm.Integer, nullable=False, default=15)
    created_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)
    updated_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'project_id': self.project_id,
            'title': self.title,
            'description': self.description or '',
            'event_type': self.event_type or 'Schedule',
            'category': self.category or 'Work',
            'date': self.date,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'location': self.location or '',
            'reminder_enabled': bool(self.reminder_enabled),
            'reminder_minutes': int(self.reminder_minutes or 15),
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }


class Attachment(db_orm.Model):
    __tablename__ = 'attachments'

    id = db_orm.Column(db_orm.String(64), primary_key=True)
    user_id = db_orm.Column(db_orm.String(64), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    entity_type = db_orm.Column(db_orm.String(32), nullable=False, index=True)
    entity_id = db_orm.Column(db_orm.String(64), nullable=False, index=True)
    original_filename = db_orm.Column(db_orm.String(255), nullable=False)
    stored_filename = db_orm.Column(db_orm.String(255), nullable=False)
    mime_type = db_orm.Column(db_orm.String(128), nullable=False)
    size_bytes = db_orm.Column(db_orm.Integer, nullable=False, default=0)
    uploaded_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'original_filename': self.original_filename,
            'mime_type': self.mime_type,
            'size_bytes': int(self.size_bytes or 0),
            'uploaded_at': self.uploaded_at,
        }


class Notification(db_orm.Model):
    __tablename__ = 'notifications'

    id = db_orm.Column(db_orm.String(64), primary_key=True)
    user_id = db_orm.Column(db_orm.String(64), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db_orm.Column(db_orm.String(220), nullable=False)
    message = db_orm.Column(db_orm.Text, nullable=False, default='')
    category = db_orm.Column(db_orm.String(64), nullable=False, default='reminder')
    target_view = db_orm.Column(db_orm.String(64), nullable=True, default='dashboard')
    target_id = db_orm.Column(db_orm.String(64), nullable=True)
    is_read = db_orm.Column(db_orm.Boolean, nullable=False, default=False)
    trigger_at = db_orm.Column(db_orm.String(64), nullable=True)
    created_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'message': self.message or '',
            'category': self.category or 'reminder',
            'target_view': self.target_view or 'dashboard',
            'target_id': self.target_id,
            'is_read': bool(self.is_read),
            'trigger_at': self.trigger_at,
            'created_at': self.created_at,
        }


# ==========================================
# STRICTLY PRIVATE PERSONAL SPACE MODELS
# ==========================================


class JournalEntry(db_orm.Model):
    __tablename__ = 'journal_entries'

    id = db_orm.Column(db_orm.String(64), primary_key=True)
    user_id = db_orm.Column(db_orm.String(64), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db_orm.Column(db_orm.String(255), nullable=False, default='Untitled Entry')
    content = db_orm.Column(db_orm.Text, nullable=False, default='')
    mood = db_orm.Column(db_orm.String(64), nullable=False, default='neutral')
    emotion = db_orm.Column(db_orm.String(120), nullable=False, default='')
    entry_date = db_orm.Column(db_orm.String(32), nullable=False, index=True)
    is_favorite = db_orm.Column(db_orm.Boolean, nullable=False, default=False)
    is_private = db_orm.Column(db_orm.Boolean, nullable=False, default=True)
    font_family = db_orm.Column(db_orm.String(64), nullable=False, default='serif')
    text_color = db_orm.Column(db_orm.String(32), nullable=False, default='#334155')
    stickers_json = db_orm.Column(db_orm.Text, nullable=False, default='[]')
    photos_json = db_orm.Column(db_orm.Text, nullable=False, default='[]')
    audio_url = db_orm.Column(db_orm.Text, nullable=True)
    audio_duration = db_orm.Column(db_orm.Float, nullable=True)
    has_audio = db_orm.Column(db_orm.Boolean, nullable=False, default=False)
    audio_clips_json = db_orm.Column(db_orm.Text, nullable=False, default='[]')
    wallpaper_theme = db_orm.Column(db_orm.String(64), nullable=False, default='original')
    bullet_style = db_orm.Column(db_orm.String(32), nullable=False, default='check')
    font_size_preset = db_orm.Column(db_orm.String(32), nullable=False, default='body')
    text_align = db_orm.Column(db_orm.String(16), nullable=False, default='left')
    tags_json = db_orm.Column(db_orm.Text, nullable=False, default='[]')
    eyes_protection = db_orm.Column(db_orm.Boolean, nullable=False, default=False)
    prompt_active = db_orm.Column(db_orm.Boolean, nullable=False, default=False)
    current_prompt = db_orm.Column(db_orm.Text, nullable=False, default='')
    created_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)
    updated_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'content': self.content,
            'mood': self.mood,
            'emotion': self.emotion,
            'entry_date': self.entry_date,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'is_favorite': bool(self.is_favorite),
            'is_private': bool(self.is_private),
            'font_family': self.font_family,
            'text_color': self.text_color,
            'stickers': _parse_json(self.stickers_json, []),
            'photos': _parse_json(self.photos_json, []),
            'audio_url': self.audio_url,
            'audio_duration': self.audio_duration,
            'has_audio': bool(self.has_audio),
            'audio_clips': _parse_json(self.audio_clips_json, []),
            'wallpaper_theme': self.wallpaper_theme,
            'bullet_style': self.bullet_style,
            'font_size_preset': self.font_size_preset,
            'text_align': self.text_align,
            'tags': _parse_json(self.tags_json, []),
            'eyes_protection': bool(self.eyes_protection),
            'prompt_active': bool(self.prompt_active),
            'current_prompt': self.current_prompt,
        }


class Memory(db_orm.Model):
    __tablename__ = 'memories'

    id = db_orm.Column(db_orm.String(64), primary_key=True)
    user_id = db_orm.Column(db_orm.String(64), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db_orm.Column(db_orm.String(220), nullable=False)
    description = db_orm.Column(db_orm.Text, nullable=False, default='')
    memory_date = db_orm.Column(db_orm.String(32), nullable=False, index=True)
    location = db_orm.Column(db_orm.String(180), nullable=False, default='')
    cover_image = db_orm.Column(db_orm.Text, nullable=False, default='')
    is_favorite = db_orm.Column(db_orm.Boolean, nullable=False, default=False)
    created_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)

    def to_dict(self, photos: list | None = None) -> Dict[str, Any]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'description': self.description,
            'memory_date': self.memory_date,
            'location': self.location,
            'cover_image': self.cover_image,
            'is_favorite': bool(self.is_favorite),
            'created_at': self.created_at,
            'photos': photos if photos is not None else [],
        }


class MemoryPhoto(db_orm.Model):
    __tablename__ = 'memory_photos'

    id = db_orm.Column(db_orm.String(64), primary_key=True)
    memory_id = db_orm.Column(db_orm.String(64), ForeignKey('memories.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db_orm.Column(db_orm.String(64), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    image_path = db_orm.Column(db_orm.Text, nullable=False)
    caption = db_orm.Column(db_orm.Text, nullable=False, default='')
    uploaded_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'memory_id': self.memory_id,
            'user_id': self.user_id,
            'image_path': self.image_path,
            'caption': self.caption,
            'uploaded_at': self.uploaded_at,
        }


class ImportantNote(db_orm.Model):
    __tablename__ = 'notes'

    id = db_orm.Column(db_orm.String(64), primary_key=True)
    user_id = db_orm.Column(db_orm.String(64), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db_orm.Column(db_orm.String(220), nullable=False, default='Quick Note')
    content = db_orm.Column(db_orm.Text, nullable=False, default='')
    priority = db_orm.Column(db_orm.String(32), nullable=False, default='medium')
    is_pinned = db_orm.Column(db_orm.Boolean, nullable=False, default=False)
    color = db_orm.Column(db_orm.String(32), nullable=False, default='#FEF3C7')
    reminder_date = db_orm.Column(db_orm.String(32), nullable=True)
    created_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)
    updated_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'content': self.content,
            'priority': self.priority,
            'is_pinned': bool(self.is_pinned),
            'color': self.color,
            'reminder_date': self.reminder_date,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }


class MoodEntry(db_orm.Model):
    __tablename__ = 'mood_entries'

    id = db_orm.Column(db_orm.String(64), primary_key=True)
    user_id = db_orm.Column(db_orm.String(64), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    mood = db_orm.Column(db_orm.String(64), nullable=False)
    emotion = db_orm.Column(db_orm.String(120), nullable=False, default='')
    intensity = db_orm.Column(db_orm.Integer, nullable=False, default=5)
    note = db_orm.Column(db_orm.Text, nullable=False, default='')
    date = db_orm.Column(db_orm.String(32), nullable=False, index=True)
    created_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'mood': self.mood,
            'emotion': self.emotion,
            'intensity': int(self.intensity or 5),
            'note': self.note,
            'date': self.date,
            'created_at': self.created_at,
        }


class CustomAffirmation(db_orm.Model):
    __tablename__ = 'custom_affirmations'

    id = db_orm.Column(db_orm.String(64), primary_key=True)
    user_id = db_orm.Column(db_orm.String(64), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    quote = db_orm.Column(db_orm.Text, nullable=False)
    prompt = db_orm.Column(db_orm.Text, nullable=False, default='')
    tag = db_orm.Column(db_orm.String(64), nullable=False, default='Personal')
    created_at = db_orm.Column(db_orm.String(64), nullable=False, default=now_iso)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'quote': self.quote,
            'prompt': self.prompt,
            'tag': self.tag or 'Personal',
            'is_custom': True,
            'created_at': self.created_at,
        }

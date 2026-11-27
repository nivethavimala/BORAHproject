import json
import os
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, List

from flask import Blueprint, Response, g, jsonify, request, send_file
from werkzeug.utils import secure_filename

from backend.ai_service import (
    detect_emotion,
    generate_music_track,
    generate_weekly_summary,
    transcribe_audio,
)
from backend.extensions import db_orm
from backend.models import (
    ActivityLog,
    Attachment,
    CustomAffirmation,
    ImportantNote,
    JournalEntry,
    Meeting,
    Memory,
    MemoryPhoto,
    MoodEntry,
    Notification,
    Organization,
    Project,
    Schedule,
    Task,
    User,
    UserSettings,
    _dump_json,
    now_iso,
    rand_id,
)
from backend.paths import UPLOAD_DIR
from backend.security import authenticate_token
from backend.utils_time import format_duration_minutes

personal_bp = Blueprint('personal_bp', __name__)

ALLOWED_ATTACHMENT_EXTS = {'.pdf', '.docx', '.xlsx', '.csv', '.txt', '.png', '.jpg', '.jpeg', '.webp'}
MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024


def _today_ymd() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%d')


# ==========================================
# JOURNAL ROUTES (STRICTLY PRIVATE)
# ==========================================


@personal_bp.get('/api/journal')
@authenticate_token
def list_journals() -> Any:
    rows = (
        JournalEntry.query.filter_by(user_id=g.user['userId'])
        .order_by(JournalEntry.entry_date.desc(), JournalEntry.updated_at.desc())
        .all()
    )
    return jsonify({'success': True, 'entries': [r.to_dict() for r in rows]})


@personal_bp.get('/api/journal/<entry_id>')
@authenticate_token
def get_journal(entry_id: str) -> Any:
    entry = JournalEntry.query.filter_by(id=entry_id, user_id=g.user['userId']).first()
    if not entry:
        return jsonify({'success': False, 'message': 'Journal entry not found.'}), 404
    return jsonify({'success': True, 'entry': entry.to_dict()})


@personal_bp.post('/api/journal')
@authenticate_token
def create_journal() -> Any:
    body = request.get_json(silent=True) or {}
    title = body.get('title') or ''
    content = body.get('content') or ''
    audio_url = body.get('audio_url')
    audio_clips = body.get('audio_clips') or []

    if not title and not content and not audio_url and len(audio_clips) == 0:
        return jsonify({'success': False, 'message': 'Entry must have a title, content, or voice recording.'}), 400

    now = now_iso()
    audio_duration = body.get('audio_duration')
    entry = JournalEntry(
        id=rand_id('j_'),
        user_id=g.user['userId'],
        title=title or ('Voice Reflection' if audio_url else 'Untitled Entry'),
        content=content,
        mood=body.get('mood') or 'neutral',
        emotion=body.get('emotion') or '',
        entry_date=body.get('entry_date') or _today_ymd(),
        is_favorite=bool(body.get('is_favorite', False)),
        is_private=bool(body.get('is_private')) if 'is_private' in body else True,
        font_family=body.get('font_family') or 'serif',
        text_color=body.get('text_color') or '#334155',
        stickers_json=_dump_json(body.get('stickers') or []),
        photos_json=_dump_json(body.get('photos') or []),
        audio_url=audio_url or None,
        audio_duration=float(audio_duration) if isinstance(audio_duration, (int, float)) else None,
        has_audio=bool(body.get('has_audio')) or bool(audio_url) or (isinstance(audio_clips, list) and len(audio_clips) > 0),
        audio_clips_json=_dump_json(audio_clips),
        wallpaper_theme=body.get('wallpaper_theme') or 'original',
        bullet_style=body.get('bullet_style') or 'check',
        font_size_preset=body.get('font_size_preset') or 'body',
        text_align=body.get('text_align') or 'left',
        tags_json=_dump_json(body.get('tags') or []),
        eyes_protection=bool(body.get('eyes_protection', False)),
        prompt_active=bool(body.get('prompt_active', False)),
        current_prompt=body.get('current_prompt') or '',
        created_at=now,
        updated_at=now,
    )
    db_orm.session.add(entry)
    db_orm.session.commit()
    return jsonify({'success': True, 'entry': entry.to_dict(), 'message': 'Journal entry saved.'}), 201


@personal_bp.put('/api/journal/<entry_id>')
@authenticate_token
def update_journal(entry_id: str) -> Any:
    entry = JournalEntry.query.filter_by(id=entry_id, user_id=g.user['userId']).first()
    if not entry:
        return jsonify({'success': False, 'message': 'Journal entry not found.'}), 404

    body = request.get_json(silent=True) or {}
    for field in (
        'title', 'content', 'mood', 'emotion', 'entry_date', 'font_family', 'text_color',
        'audio_url', 'wallpaper_theme', 'bullet_style', 'font_size_preset', 'text_align', 'current_prompt'
    ):
        if field in body and body[field] is not None:
            setattr(entry, field, body[field])
    for bool_field in ('is_favorite', 'is_private', 'has_audio', 'eyes_protection', 'prompt_active'):
        if bool_field in body:
            setattr(entry, bool_field, bool(body[bool_field]))
    if 'audio_duration' in body:
        entry.audio_duration = float(body['audio_duration']) if isinstance(body['audio_duration'], (int, float)) else None
    if 'stickers' in body:
        entry.stickers_json = _dump_json(body['stickers'] or [])
    if 'photos' in body:
        entry.photos_json = _dump_json(body['photos'] or [])
    if 'audio_clips' in body:
        entry.audio_clips_json = _dump_json(body['audio_clips'] or [])
    if 'tags' in body:
        entry.tags_json = _dump_json(body['tags'] or [])
    entry.updated_at = now_iso()
    db_orm.session.commit()
    return jsonify({'success': True, 'entry': entry.to_dict(), 'message': 'Journal entry updated.'})


@personal_bp.delete('/api/journal/<entry_id>')
@authenticate_token
def delete_journal(entry_id: str) -> Any:
    entry = JournalEntry.query.filter_by(id=entry_id, user_id=g.user['userId']).first()
    if not entry:
        return jsonify({'success': False, 'message': 'Entry not found or already deleted.'}), 404
    db_orm.session.delete(entry)
    db_orm.session.commit()
    return jsonify({'success': True, 'message': 'Journal entry removed.'})


# ==========================================
# MEMORY ALBUM ROUTES (STRICTLY PRIVATE)
# ==========================================


def _serialize_memory(mem: Memory) -> Dict[str, Any]:
    photos = MemoryPhoto.query.filter_by(memory_id=mem.id, user_id=mem.user_id).all()
    return mem.to_dict([p.to_dict() for p in photos])


@personal_bp.get('/api/memories')
@authenticate_token
def list_memories() -> Any:
    mems = Memory.query.filter_by(user_id=g.user['userId']).order_by(Memory.memory_date.desc()).all()
    return jsonify({'success': True, 'memories': [_serialize_memory(m) for m in mems]})


@personal_bp.get('/api/memories/<memory_id>')
@authenticate_token
def get_memory(memory_id: str) -> Any:
    mem = Memory.query.filter_by(id=memory_id, user_id=g.user['userId']).first()
    if not mem:
        return jsonify({'success': False, 'message': 'Memory not found.'}), 404
    return jsonify({'success': True, 'memory': _serialize_memory(mem)})


@personal_bp.post('/api/memories')
@authenticate_token
def create_memory() -> Any:
    uid = g.user['userId']
    body = request.get_json(silent=True) or {}
    title = (body.get('title') or '').strip()
    if not title:
        return jsonify({'success': False, 'message': 'Memory title is required.'}), 400

    photos = body.get('photos') or []
    cover_image = body.get('cover_image') or (photos[0].get('image_path') if photos and isinstance(photos[0], dict) else '')
    now = now_iso()

    mem = Memory(
        id=rand_id('mem_'),
        user_id=uid,
        title=title[:220],
        description=body.get('description') or '',
        memory_date=body.get('memory_date') or _today_ymd(),
        location=body.get('location') or '',
        cover_image=cover_image or '',
        is_favorite=bool(body.get('is_favorite', False)),
        created_at=now,
    )
    db_orm.session.add(mem)
    db_orm.session.flush()

    if isinstance(photos, list):
        for p in photos:
            if isinstance(p, dict) and p.get('image_path'):
                db_orm.session.add(
                    MemoryPhoto(
                        id=rand_id('p_'),
                        memory_id=mem.id,
                        user_id=uid,
                        image_path=p['image_path'],
                        caption=p.get('caption') or '',
                        uploaded_at=now,
                    )
                )

    db_orm.session.commit()
    return jsonify({'success': True, 'memory': _serialize_memory(mem), 'message': 'Memory preserved.'}), 201


@personal_bp.put('/api/memories/<memory_id>')
@authenticate_token
def update_memory(memory_id: str) -> Any:
    mem = Memory.query.filter_by(id=memory_id, user_id=g.user['userId']).first()
    if not mem:
        return jsonify({'success': False, 'message': 'Memory not found.'}), 404
    body = request.get_json(silent=True) or {}
    for field in ('title', 'description', 'memory_date', 'location', 'cover_image'):
        if field in body and body[field] is not None:
            setattr(mem, field, str(body[field]))
    if 'is_favorite' in body:
        mem.is_favorite = bool(body['is_favorite'])
    db_orm.session.commit()
    return jsonify({'success': True, 'memory': _serialize_memory(mem), 'message': 'Memory updated.'})


@personal_bp.delete('/api/memories/<memory_id>')
@authenticate_token
def delete_memory(memory_id: str) -> Any:
    mem = Memory.query.filter_by(id=memory_id, user_id=g.user['userId']).first()
    if not mem:
        return jsonify({'success': False, 'message': 'Memory not found.'}), 404
    db_orm.session.delete(mem)
    db_orm.session.commit()
    return jsonify({'success': True, 'message': 'Memory deleted.'})


@personal_bp.post('/api/memories/<memory_id>/photos')
@authenticate_token
def add_memory_photo(memory_id: str) -> Any:
    uid = g.user['userId']
    body = request.get_json(silent=True) or {}
    image_path = body.get('image_path')
    if not image_path:
        return jsonify({'success': False, 'message': 'Image path or data URL required.'}), 400
    if not Memory.query.filter_by(id=memory_id, user_id=uid).first():
        return jsonify({'success': False, 'message': 'Memory not found.'}), 404

    photo = MemoryPhoto(
        id=rand_id('p_'),
        memory_id=memory_id,
        user_id=uid,
        image_path=image_path,
        caption=body.get('caption') or '',
        uploaded_at=now_iso(),
    )
    db_orm.session.add(photo)
    db_orm.session.commit()
    return jsonify({'success': True, 'photo': photo.to_dict(), 'message': 'Photo added to album.'}), 201


@personal_bp.delete('/api/photos/<photo_id>')
@authenticate_token
def delete_photo(photo_id: str) -> Any:
    photo = MemoryPhoto.query.filter_by(id=photo_id, user_id=g.user['userId']).first()
    if not photo:
        return jsonify({'success': False, 'message': 'Photo not found.'}), 404
    db_orm.session.delete(photo)
    db_orm.session.commit()
    return jsonify({'success': True, 'message': 'Photo removed.'})


# ==========================================
# MOOD & IMPORTANT NOTES (STRICTLY PRIVATE)
# ==========================================


@personal_bp.get('/api/moods')
@authenticate_token
def list_moods() -> Any:
    rows = (
        MoodEntry.query.filter_by(user_id=g.user['userId'])
        .order_by(MoodEntry.date.desc(), MoodEntry.created_at.desc())
        .all()
    )
    return jsonify({'success': True, 'moods': [m.to_dict() for m in rows]})


@personal_bp.post('/api/moods')
@authenticate_token
def create_mood() -> Any:
    body = request.get_json(silent=True) or {}
    mood = body.get('mood')
    if not mood:
        return jsonify({'success': False, 'message': 'Please select a mood.'}), 400
    try:
        intensity = min(10, max(1, int(body.get('intensity', 5))))
    except (TypeError, ValueError):
        intensity = 5

    entry = MoodEntry(
        id=rand_id('md_'),
        user_id=g.user['userId'],
        mood=str(mood)[:64],
        emotion=body.get('emotion') or '',
        intensity=intensity,
        note=body.get('note') or '',
        date=body.get('date') or _today_ymd(),
        created_at=now_iso(),
    )
    db_orm.session.add(entry)
    db_orm.session.commit()
    return jsonify({'success': True, 'mood': entry.to_dict(), 'message': 'Mood recorded.'}), 201


@personal_bp.delete('/api/moods/<mood_id>')
@authenticate_token
def delete_mood(mood_id: str) -> Any:
    row = MoodEntry.query.filter_by(id=mood_id, user_id=g.user['userId']).first()
    if not row:
        return jsonify({'success': False, 'message': 'Mood entry not found.'}), 404
    db_orm.session.delete(row)
    db_orm.session.commit()
    return jsonify({'success': True, 'message': 'Mood record deleted.'})


@personal_bp.get('/api/notes')
@authenticate_token
def list_notes() -> Any:
    rows = (
        ImportantNote.query.filter_by(user_id=g.user['userId'])
        .order_by(ImportantNote.is_pinned.desc(), ImportantNote.created_at.desc())
        .all()
    )
    return jsonify({'success': True, 'notes': [n.to_dict() for n in rows]})


@personal_bp.post('/api/notes')
@authenticate_token
def create_note() -> Any:
    body = request.get_json(silent=True) or {}
    title = body.get('title') or ''
    content = body.get('content') or ''
    if not title and not content:
        return jsonify({'success': False, 'message': 'Note must contain a title or content.'}), 400

    now = now_iso()
    note = ImportantNote(
        id=rand_id('nt_'),
        user_id=g.user['userId'],
        title=(title or 'Quick Note')[:220],
        content=content,
        priority=(body.get('priority') or 'medium')[:32],
        is_pinned=bool(body.get('is_pinned', False)),
        color=(body.get('color') or '#FEF3C7')[:32],
        reminder_date=body.get('reminder_date'),
        created_at=now,
        updated_at=now,
    )
    db_orm.session.add(note)
    db_orm.session.commit()
    return jsonify({'success': True, 'note': note.to_dict(), 'message': 'Note saved.'}), 201


@personal_bp.put('/api/notes/<note_id>')
@authenticate_token
def update_note(note_id: str) -> Any:
    note = ImportantNote.query.filter_by(id=note_id, user_id=g.user['userId']).first()
    if not note:
        return jsonify({'success': False, 'message': 'Note not found.'}), 404
    body = request.get_json(silent=True) or {}
    for field in ('title', 'content', 'priority', 'color', 'reminder_date'):
        if field in body:
            setattr(note, field, body[field])
    if 'is_pinned' in body:
        note.is_pinned = bool(body['is_pinned'])
    note.updated_at = now_iso()
    db_orm.session.commit()
    return jsonify({'success': True, 'note': note.to_dict()})


@personal_bp.delete('/api/notes/<note_id>')
@authenticate_token
def delete_note(note_id: str) -> Any:
    note = ImportantNote.query.filter_by(id=note_id, user_id=g.user['userId']).first()
    if not note:
        return jsonify({'success': False, 'message': 'Note not found.'}), 404
    db_orm.session.delete(note)
    db_orm.session.commit()
    return jsonify({'success': True, 'message': 'Note deleted.'})


# ==========================================
# CUSTOM DAILY AFFIRMATIONS
# ==========================================


@personal_bp.get('/api/affirmations')
@authenticate_token
def list_affirmations() -> Any:
    rows = (
        CustomAffirmation.query.filter_by(user_id=g.user['userId'])
        .order_by(CustomAffirmation.created_at.desc())
        .all()
    )
    return jsonify({'success': True, 'affirmations': [a.to_dict() for a in rows]})


@personal_bp.post('/api/affirmations')
@authenticate_token
def create_affirmation() -> Any:
    body = request.get_json(silent=True) or {}
    quote = (body.get('quote') or '').strip()
    if not quote:
        return jsonify({'success': False, 'message': 'Affirmation quote is required.'}), 400
    aff = CustomAffirmation(
        id=rand_id('aff_'),
        user_id=g.user['userId'],
        quote=quote[:500],
        prompt=(body.get('prompt') or '').strip()[:300],
        tag=(body.get('tag') or 'Personal').strip()[:64] or 'Personal',
        created_at=now_iso(),
    )
    db_orm.session.add(aff)
    db_orm.session.commit()
    return jsonify({'success': True, 'affirmation': aff.to_dict(), 'message': 'Custom affirmation added.'}), 201


@personal_bp.delete('/api/affirmations/<aff_id>')
@authenticate_token
def delete_affirmation(aff_id: str) -> Any:
    aff = CustomAffirmation.query.filter_by(id=aff_id, user_id=g.user['userId']).first()
    if not aff:
        return jsonify({'success': False, 'message': 'Affirmation not found.'}), 404
    db_orm.session.delete(aff)
    db_orm.session.commit()
    return jsonify({'success': True, 'message': 'Custom affirmation removed.'})


# ==========================================
# DOCUMENT ATTACHMENTS
# ==========================================


@personal_bp.get('/api/attachments')
@authenticate_token
def list_attachments() -> Any:
    uid = g.user['userId']
    entity_type = request.args.get('entity_type')
    entity_id = request.args.get('entity_id')
    query = Attachment.query.filter_by(user_id=uid)
    if entity_type:
        query = query.filter_by(entity_type=entity_type)
    if entity_id:
        query = query.filter_by(entity_id=entity_id)
    rows = query.order_by(Attachment.uploaded_at.desc()).all()
    return jsonify({'success': True, 'attachments': [r.to_dict() for r in rows]})


@personal_bp.post('/api/attachments')
@authenticate_token
def upload_attachment() -> Any:
    uid = g.user['userId']
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided.'}), 400

    file = request.files['file']
    entity_type = (request.form.get('entity_type') or 'activity').strip()
    entity_id = (request.form.get('entity_id') or '').strip()
    if not entity_id:
        return jsonify({'success': False, 'message': 'Target record ID is required.'}), 400

    raw_name = secure_filename(file.filename or 'document')
    ext = os.path.splitext(raw_name)[1].lower()
    if ext not in ALLOWED_ATTACHMENT_EXTS:
        return jsonify({'success': False, 'message': f'Unsupported file type ({ext or "unknown"}).'}), 400

    file.seek(0, os.SEEK_END)
    size_bytes = file.tell()
    file.seek(0)
    if size_bytes <= 0 or size_bytes > MAX_ATTACHMENT_BYTES:
        return jsonify({'success': False, 'message': 'File size must be up to 10 MB.'}), 400

    stored_name = f'{uid}_{secrets.token_hex(8)}{ext}'
    dest_path = os.path.join(UPLOAD_DIR, stored_name)
    file.save(dest_path)

    att = Attachment(
        id=rand_id('att_'),
        user_id=uid,
        entity_type=entity_type[:32],
        entity_id=entity_id[:64],
        original_filename=(file.filename or raw_name)[:255],
        stored_filename=stored_name,
        mime_type=(file.mimetype or 'application/octet-stream')[:128],
        size_bytes=size_bytes,
        uploaded_at=now_iso(),
    )
    db_orm.session.add(att)
    db_orm.session.commit()
    return jsonify({'success': True, 'attachment': att.to_dict(), 'message': 'Attachment uploaded.'}), 201


@personal_bp.get('/api/attachments/<attachment_id>/download')
@authenticate_token
def download_attachment(attachment_id: str) -> Any:
    att = Attachment.query.filter_by(id=attachment_id, user_id=g.user['userId']).first()
    if not att:
        return jsonify({'success': False, 'message': 'Attachment not found.'}), 404
    file_path = os.path.join(UPLOAD_DIR, att.stored_filename)
    if not os.path.exists(file_path):
        return jsonify({'success': False, 'message': 'Attachment file no longer exists on disk.'}), 404
    return send_file(file_path, as_attachment=True, download_name=att.original_filename, mimetype=att.mime_type)


@personal_bp.delete('/api/attachments/<attachment_id>')
@authenticate_token
def delete_attachment(attachment_id: str) -> Any:
    att = Attachment.query.filter_by(id=attachment_id, user_id=g.user['userId']).first()
    if not att:
        return jsonify({'success': False, 'message': 'Attachment not found.'}), 404
    file_path = os.path.join(UPLOAD_DIR, att.stored_filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass
    db_orm.session.delete(att)
    db_orm.session.commit()
    return jsonify({'success': True, 'message': 'Attachment deleted.'})


# ==========================================
# NOTIFICATIONS CENTER
# ==========================================


@personal_bp.get('/api/notifications')
@authenticate_token
def list_notifications() -> Any:
    uid = g.user['userId']
    # Auto-generate gentle upcoming task/schedule alerts if due today and not yet logged as notification
    today = _today_ymd()
    due_tasks = Task.query.filter_by(user_id=uid, due_date=today, completed=False).limit(3).all()
    existing_titles = {n.title for n in Notification.query.filter_by(user_id=uid).order_by(Notification.created_at.desc()).limit(30).all()}
    created_any = False
    for t in due_tasks:
        alert_title = f'Pending Task Today: {t.title}'
        if alert_title not in existing_titles:
            db_orm.session.add(
                Notification(
                    id=rand_id('ntf_'),
                    user_id=uid,
                    title=alert_title[:220],
                    message=f'Category: {t.category} • Priority: {t.priority.title()}',
                    category='task',
                    target_view='tasks',
                    target_id=t.id,
                    is_read=False,
                    trigger_at=t.due_time or '',
                    created_at=now_iso(),
                )
            )
            created_any = True
    if created_any:
        db_orm.session.commit()

    rows = (
        Notification.query.filter_by(user_id=uid)
        .order_by(Notification.is_read.asc(), Notification.created_at.desc())
        .limit(40)
        .all()
    )
    unread_count = sum(1 for r in rows if not r.is_read)
    return jsonify({
        'success': True,
        'unread_count': unread_count,
        'notifications': [r.to_dict() for r in rows],
    })


@personal_bp.put('/api/notifications/<notif_id>/read')
@authenticate_token
def mark_notification_read(notif_id: str) -> Any:
    row = Notification.query.filter_by(id=notif_id, user_id=g.user['userId']).first()
    if not row:
        return jsonify({'success': False, 'message': 'Notification not found.'}), 404
    row.is_read = True
    db_orm.session.commit()
    return jsonify({'success': True, 'notification': row.to_dict()})


@personal_bp.put('/api/notifications/read-all')
@authenticate_token
def mark_all_notifications_read() -> Any:
    Notification.query.filter_by(user_id=g.user['userId'], is_read=False).update({'is_read': True})
    db_orm.session.commit()
    return jsonify({'success': True, 'message': 'All notifications marked read.'})


# ==========================================
# GLOBAL SEARCH & JSON BACKUP / RESTORE
# ==========================================


@personal_bp.get('/api/search')
@authenticate_token
def global_search() -> Any:
    uid = g.user['userId']
    q = (request.args.get('q') or '').strip().lower()
    if not q:
        return jsonify({
            'success': True,
            'results': {
                'activities': [], 'tasks': [], 'schedules': [], 'projects': [], 'meetings': [],
                'journals': [], 'memories': [], 'notes': [],
            },
        })

    activities = [
        a.to_dict()
        for a in ActivityLog.query.filter_by(user_id=uid).all()
        if q in (a.title or '').lower() or q in (a.description or '').lower() or q in (a.category or '').lower()
    ][:10]
    tasks = [
        t.to_dict()
        for t in Task.query.filter_by(user_id=uid).all()
        if q in (t.title or '').lower() or q in (t.description or '').lower()
    ][:10]
    schedules = [
        s.to_dict()
        for s in Schedule.query.filter_by(user_id=uid).all()
        if q in (s.title or '').lower() or q in (s.description or '').lower()
    ][:10]
    projects = [
        p.to_dict()
        for p in Project.query.filter_by(user_id=uid).all()
        if q in (p.title or '').lower() or q in (p.description or '').lower() or q in (p.code or '').lower()
    ][:10]
    meetings = [
        m.to_dict()
        for m in Meeting.query.filter_by(user_id=uid).all()
        if q in (m.title or '').lower() or q in (m.agenda or '').lower() or q in (m.participants or '').lower()
    ][:10]
    journals = [
        j.to_dict()
        for j in JournalEntry.query.filter_by(user_id=uid).all()
        if q in (j.title or '').lower() or q in (j.content or '').lower()
    ][:10]
    memories = [
        _serialize_memory(m)
        for m in Memory.query.filter_by(user_id=uid).all()
        if q in (m.title or '').lower() or q in (m.description or '').lower() or q in (m.location or '').lower()
    ][:10]
    notes = [
        n.to_dict()
        for n in ImportantNote.query.filter_by(user_id=uid).all()
        if q in (n.title or '').lower() or q in (n.content or '').lower()
    ][:10]

    return jsonify({
        'success': True,
        'results': {
            'activities': activities,
            'tasks': tasks,
            'schedules': schedules,
            'projects': projects,
            'meetings': meetings,
            'journals': journals,
            'memories': memories,
            'notes': notes,
        },
    })


@personal_bp.get('/api/export')
@authenticate_token
def export_json_backup() -> Any:
    uid = g.user['userId']
    user = User.query.get(uid)
    if not user:
        return jsonify({'success': False, 'message': 'Data not found.'}), 404
    settings = UserSettings.query.filter_by(user_id=uid).first()
    payload = {
        'schema_version': 'borah_v2',
        'user': user.to_safe_dict(),
        'settings': settings.to_dict() if settings else {},
        'activities': [a.to_dict() for a in ActivityLog.query.filter_by(user_id=uid).all()],
        'tasks': [t.to_dict() for t in Task.query.filter_by(user_id=uid).all()],
        'schedules': [s.to_dict() for s in Schedule.query.filter_by(user_id=uid).all()],
        'projects': [p.to_dict() for p in Project.query.filter_by(user_id=uid).all()],
        'meetings': [m.to_dict() for m in Meeting.query.filter_by(user_id=uid).all()],
        'journal_entries': [j.to_dict() for j in JournalEntry.query.filter_by(user_id=uid).all()],
        'memories': [_serialize_memory(m) for m in Memory.query.filter_by(user_id=uid).all()],
        'mood_entries': [m.to_dict() for m in MoodEntry.query.filter_by(user_id=uid).all()],
        'notes': [n.to_dict() for n in ImportantNote.query.filter_by(user_id=uid).all()],
        'exported_at': now_iso(),
    }
    today = _today_ymd()
    return Response(
        json.dumps(payload, indent=2, ensure_ascii=False),
        mimetype='application/json',
        headers={'Content-Disposition': f'attachment; filename="BORAH_Backup_{today}.json"'},
    )


@personal_bp.post('/api/backup/restore')
@authenticate_token
def restore_json_backup() -> Any:
    uid = g.user['userId']
    body = request.get_json(silent=True)
    if not isinstance(body, dict) or not any(
        k in body for k in ('activities', 'tasks', 'schedules', 'journal_entries', 'notes', 'projects', 'meetings')
    ):
        return jsonify({'success': False, 'message': 'Invalid BORAH backup JSON structure.'}), 400

    restored_counts = {'activities': 0, 'tasks': 0, 'schedules': 0, 'notes': 0, 'journals': 0}

    for a in (body.get('activities') or []):
        if isinstance(a, dict) and a.get('title') and a.get('start_time') and a.get('end_time'):
            db_orm.session.add(
                ActivityLog(
                    id=rand_id('act_'),
                    user_id=uid,
                    title=str(a['title'])[:220],
                    description=str(a.get('description') or ''),
                    activity_date=str(a.get('activity_date') or _today_ymd())[:32],
                    start_time=str(a['start_time'])[:16],
                    end_time=str(a['end_time'])[:16],
                    duration_minutes=int(a.get('duration_minutes') or 0),
                    category=str(a.get('category') or 'Other')[:64],
                    priority=str(a.get('priority') or 'medium')[:32],
                    status=str(a.get('status') or 'completed')[:32],
                    remarks=str(a.get('remarks') or ''),
                    created_at=now_iso(),
                    updated_at=now_iso(),
                )
            )
            restored_counts['activities'] += 1

    for t in (body.get('tasks') or []):
        if isinstance(t, dict) and t.get('title'):
            done = bool(t.get('completed', False))
            db_orm.session.add(
                Task(
                    id=rand_id('tsk_'),
                    user_id=uid,
                    title=str(t['title'])[:220],
                    description=str(t.get('description') or ''),
                    priority=str(t.get('priority') or 'medium')[:32],
                    category=str(t.get('category') or 'Personal')[:64],
                    status='completed' if done else str(t.get('status') or 'not_started')[:32],
                    progress_percent=100 if done else int(t.get('progress_percent') or 0),
                    due_date=str(t.get('due_date') or '')[:32],
                    due_time=str(t.get('due_time') or '')[:16],
                    completed=done,
                    created_at=now_iso(),
                    updated_at=now_iso(),
                )
            )
            restored_counts['tasks'] += 1

    for n in (body.get('notes') or []):
        if isinstance(n, dict) and (n.get('title') or n.get('content')):
            db_orm.session.add(
                ImportantNote(
                    id=rand_id('nt_'),
                    user_id=uid,
                    title=str(n.get('title') or 'Restored Note')[:220],
                    content=str(n.get('content') or ''),
                    priority=str(n.get('priority') or 'medium')[:32],
                    is_pinned=bool(n.get('is_pinned', False)),
                    color=str(n.get('color') or '#FEF3C7')[:32],
                    created_at=now_iso(),
                    updated_at=now_iso(),
                )
            )
            restored_counts['notes'] += 1

    for j in (body.get('journal_entries') or []):
        if isinstance(j, dict) and (j.get('title') or j.get('content')):
            db_orm.session.add(
                JournalEntry(
                    id=rand_id('j_'),
                    user_id=uid,
                    title=str(j.get('title') or 'Restored Entry')[:255],
                    content=str(j.get('content') or ''),
                    mood=str(j.get('mood') or 'neutral')[:64],
                    entry_date=str(j.get('entry_date') or _today_ymd())[:32],
                    is_private=True,
                    created_at=now_iso(),
                    updated_at=now_iso(),
                )
            )
            restored_counts['journals'] += 1

    db_orm.session.commit()
    return jsonify({'success': True, 'restored': restored_counts, 'message': 'Backup restored into your account.'})


# ==========================================
# OPTIONAL ORGANIZATIONAL MODE (STRICTLY SHARED WORK ONLY)
# ==========================================


@personal_bp.get('/api/org/status')
@authenticate_token
def org_status() -> Any:
    uid = g.user['userId']
    user = User.query.get(uid)
    if not user:
        return jsonify({'success': False, 'message': 'User not found.'}), 404

    org = Organization.query.get(user.org_id) if user.org_id else None
    members: List[Dict[str, Any]] = []
    shared_activities: List[Dict[str, Any]] = []
    if org:
        org_users = User.query.filter_by(org_id=org.id).all()
        members = [
            {'id': m.id, 'name': m.name, 'email': m.email, 'role': m.role, 'department': m.department}
            for m in org_users
        ]
        # STRICT PRIVACY: Only explicitly opted-in work ActivityLogs (`is_shared_with_org=True`) are visible!
        if user.role in ('admin', 'supervisor'):
            rows = (
                ActivityLog.query.filter(
                    ActivityLog.user_id.in_([m.id for m in org_users]),
                    ActivityLog.is_shared_with_org.is_(True),
                )
                .order_by(ActivityLog.activity_date.desc())
                .limit(50)
                .all()
            )
            name_map = {m.id: m.name for m in org_users}
            shared_activities = [
                {
                    **r.to_dict(),
                    'member_name': name_map.get(r.user_id, 'Member'),
                    'duration_label': format_duration_minutes(r.duration_minutes),
                }
                for r in rows
            ]

    return jsonify({
        'success': True,
        'organization': org.to_dict() if org else None,
        'role': user.role,
        'members': members,
        'shared_activities': shared_activities,
    })


@personal_bp.post('/api/org/create')
@authenticate_token
def org_create() -> Any:
    uid = g.user['userId']
    user = User.query.get(uid)
    body = request.get_json(silent=True) or {}
    name = (body.get('name') or '').strip()
    if not user or not name:
        return jsonify({'success': False, 'message': 'Organization name is required.'}), 400

    org = Organization(
        id=rand_id('org_'),
        name=name[:160],
        join_code=secrets.token_hex(3).upper(),
        created_by=uid,
        created_at=now_iso(),
    )
    db_orm.session.add(org)
    user.org_id = org.id
    user.role = 'admin'
    setting = UserSettings.query.filter_by(user_id=uid).first()
    if setting:
        setting.org_mode_enabled = True
    db_orm.session.commit()
    return jsonify({'success': True, 'organization': org.to_dict(), 'role': user.role, 'message': 'Organization workspace created.'}), 201


@personal_bp.post('/api/org/join')
@authenticate_token
def org_join() -> Any:
    uid = g.user['userId']
    user = User.query.get(uid)
    body = request.get_json(silent=True) or {}
    code = (body.get('join_code') or '').strip().upper()
    org = Organization.query.filter_by(join_code=code).first()
    if not user or not org:
        return jsonify({'success': False, 'message': 'Invalid organization join code.'}), 404
    user.org_id = org.id
    user.role = 'member'
    setting = UserSettings.query.filter_by(user_id=uid).first()
    if setting:
        setting.org_mode_enabled = True
    db_orm.session.commit()
    return jsonify({'success': True, 'organization': org.to_dict(), 'role': user.role, 'message': f'Joined {org.name}.'})


@personal_bp.post('/api/org/leave')
@authenticate_token
def org_leave() -> Any:
    uid = g.user['userId']
    user = User.query.get(uid)
    if not user:
        return jsonify({'success': False, 'message': 'User not found.'}), 404
    user.org_id = None
    user.role = 'individual'
    db_orm.session.commit()
    return jsonify({'success': True, 'message': 'Returned to individual mode.'})


# ==========================================
# AI COMPANION & REFLECTIONS ROUTES
# ==========================================


@personal_bp.post('/api/ai/emotion')
@authenticate_token
def ai_emotion() -> Any:
    body = request.get_json(silent=True) or {}
    text = (body.get('text') or '').strip()
    if len(text) < 5:
        return jsonify({'success': False, 'message': 'Please provide some text to analyze.'}), 400
    return jsonify({'success': True, 'detection': detect_emotion(text)})


@personal_bp.post('/api/ai/summary')
@authenticate_token
def ai_summary() -> Any:
    uid = g.user['userId']
    entries = [j.to_dict() for j in JournalEntry.query.filter_by(user_id=uid).order_by(JournalEntry.entry_date.desc()).limit(7).all()]
    tasks = [t.to_dict() for t in Task.query.filter_by(user_id=uid).all()]
    moods = [m.to_dict() for m in MoodEntry.query.filter_by(user_id=uid).order_by(MoodEntry.date.desc()).limit(7).all()]
    summary = generate_weekly_summary(entries, tasks, moods)
    return jsonify({'success': True, 'summary': summary})


@personal_bp.get('/api/ai/prompts')
@authenticate_token
def ai_prompts() -> Any:
    prompts = [
        'What was the most meaningful accomplishment in your work today?',
        'What task brought you clarity or momentum this week?',
        'If you could simplify one part of tomorrow’s schedule, what would it be?',
        'What quiet personal moment helped you recharge today?',
        'What lesson or pattern stood out in your activities today?',
    ]
    return jsonify({'success': True, 'prompts': prompts})


@personal_bp.post('/api/ai/music')
@authenticate_token
def ai_music() -> Any:
    body = request.get_json(silent=True) or {}
    prompt = body.get('prompt')
    duration_type = body.get('durationType') or 'clip'
    if not prompt or not isinstance(prompt, str):
        return jsonify({'success': False, 'message': 'Please provide a prompt for music generation.'}), 400
    result = generate_music_track(prompt, duration_type)
    status_code = result.pop('status', 200)
    return jsonify(result), status_code


@personal_bp.post('/api/ai/transcribe')
@authenticate_token
def ai_transcribe() -> Any:
    body = request.get_json(silent=True) or {}
    audio_base64 = body.get('audioBase64')
    mime_type = body.get('mimeType') or 'audio/webm'
    if not audio_base64 or not isinstance(audio_base64, str):
        return jsonify({'success': False, 'message': 'Please provide audio data to transcribe.'}), 400
    result = transcribe_audio(audio_base64, mime_type)
    status_code = result.pop('status', 200)
    return jsonify(result), status_code

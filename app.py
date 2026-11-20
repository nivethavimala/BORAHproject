import json
import os
import re
from datetime import datetime, timedelta, timezone
from functools import wraps
from typing import Any, Callable

import bcrypt
import jwt
from dotenv import load_dotenv
from flask import Flask, Response, g, jsonify, render_template, request, send_file, send_from_directory

from backend.ai_service import (
    detect_emotion,
    generate_music_track,
    generate_weekly_summary,
    transcribe_audio,
)
from backend.db import _now_iso, _rand_id, db
from backend.sql_db import (
    init_sql_database,
    sql_get_total_users_count,
    sql_get_user_signins,
    sql_insert_user,
    sql_record_signin,
)

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
MSC_DOCS_DIR = os.path.join(BASE_DIR, 'msc_docs')
PORT = int(os.environ.get('PORT', '3000'))
JWT_SECRET = os.environ.get('JWT_SECRET', 'borah-super-secret-key-msc-2026')

app = Flask(__name__, template_folder='templates', static_folder='static', static_url_path='/static')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB payload limit for inline audio/photos

EMAIL_REGEX = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')


def _safe_user(user: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in user.items() if k != 'password_hash'}


def _create_token(user_id: str, email: str) -> str:
    payload = {
        'userId': user_id,
        'email': email,
        'exp': datetime.now(timezone.utc) + timedelta(days=7),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    return token.decode('utf-8') if isinstance(token, bytes) else token


def authenticate_token(fn: Callable[..., Any]) -> Callable[..., Any]:
    @wraps(fn)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        auth_header = request.headers.get('Authorization', '')
        parts = auth_header.split(' ')
        token = parts[1] if len(parts) >= 2 and parts[0].lower() == 'bearer' else None

        if not token:
            return jsonify({'success': False, 'message': 'Authentication required. Please sign in.'}), 401

        try:
            decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            g.user = {'userId': decoded['userId'], 'email': decoded['email']}
        except Exception:
            return jsonify({'success': False, 'message': 'Session expired or invalid. Please log in again.'}), 403

        return fn(*args, **kwargs)

    return wrapper


# ==========================================
# AUTHENTICATION ROUTES
# ==========================================


@app.post('/api/auth/register')
def auth_register() -> Any:
    try:
        body = request.get_json(silent=True) or {}
        name = body.get('name') or ''
        email = body.get('email') or ''
        password = body.get('password') or ''
        confirm_password = body.get('confirmPassword')

        if not name or not email or not password:
            return jsonify({'success': False, 'message': 'Please provide name, email, and password.'}), 400
        if len(password) < 6:
            return jsonify({'success': False, 'message': 'Password must be at least 6 characters long.'}), 400
        if confirm_password and password != confirm_password:
            return jsonify({'success': False, 'message': 'Passwords do not match.'}), 400
        if not EMAIL_REGEX.match(email):
            return jsonify({'success': False, 'message': 'Please provide a valid email address.'}), 400

        if db.get_user_by_email(email):
            return jsonify({'success': False, 'message': 'An account with this email already exists.'}), 409

        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8')
        now = _now_iso()
        new_user = {
            'id': _rand_id('usr_', 8),
            'name': name.strip(),
            'email': email.lower().strip(),
            'password_hash': password_hash,
            'created_at': now,
            'updated_at': now,
            'is_verified': True,
            'is_active': True,
        }

        db.create_user(new_user)
        try:
            sql_insert_user(new_user)
            sql_record_signin(new_user['id'], new_user['email'], 'REGISTRATION_SUCCESS', request.headers.get('User-Agent'))
        except Exception as exc:
            print(f'SQL insert error: {exc}')

        db.seed_starter_data(new_user['id'], new_user['name'])
        token = _create_token(new_user['id'], new_user['email'])
        settings = db.get_settings(new_user['id'])

        return jsonify({
            'success': True,
            'message': 'Account created successfully & saved to SQL database! Welcome to BORAH ✨',
            'token': token,
            'user': _safe_user(new_user),
            'settings': settings,
        }), 201
    except Exception as exc:
        print(f'Registration error: {exc}')
        return jsonify({'success': False, 'message': 'An error occurred during registration.'}), 500


@app.post('/api/auth/login')
def auth_login() -> Any:
    try:
        body = request.get_json(silent=True) or {}
        email = body.get('email') or ''
        password = body.get('password') or ''

        if not email or not password:
            return jsonify({'success': False, 'message': 'Please provide both email and password.'}), 400

        user = db.get_user_by_email(email)
        ua = request.headers.get('User-Agent')

        if not user:
            try:
                sql_record_signin('unregistered', email, 'FAILED_USER_NOT_FOUND', ua)
            except Exception:
                pass
            return jsonify({'success': False, 'message': 'Invalid email or password.'}), 401

        stored_hash = user.get('password_hash') or ''
        try:
            is_match = bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
        except Exception:
            is_match = False

        if not is_match:
            try:
                sql_record_signin(user['id'], user['email'], 'FAILED_INVALID_PASSWORD', ua)
            except Exception:
                pass
            return jsonify({'success': False, 'message': 'Invalid email or password.'}), 401

        try:
            sql_record_signin(user['id'], user['email'], 'SIGNIN_SUCCESS', ua)
        except Exception as exc:
            print(f'SQL signin record error: {exc}')

        token = _create_token(user['id'], user['email'])
        settings = db.get_settings(user['id'])

        return jsonify({
            'success': True,
            'message': f"Welcome back, {user['name']}! 🌷",
            'token': token,
            'user': _safe_user(user),
            'settings': settings,
        })
    except Exception as exc:
        print(f'Login error: {exc}')
        return jsonify({'success': False, 'message': 'Unable to log in at this moment.'}), 500


@app.get('/api/auth/sql-status')
@authenticate_token
def auth_sql_status() -> Any:
    try:
        signins = sql_get_user_signins(g.user['userId'])
        total_users = sql_get_total_users_count()
        return jsonify({
            'success': True,
            'sqlDatabase': 'SQLite 3 (Relational SQL Database)',
            'databasePath': 'database/borah.sqlite',
            'totalUsersInSql': total_users,
            'userSigninsCount': len(signins),
            'recentSignins': signins,
        })
    except Exception as exc:
        return jsonify({'success': False, 'message': str(exc) or 'Failed to query SQL database'}), 500


@app.get('/api/auth/me')
@authenticate_token
def auth_me() -> Any:
    user = db.get_user_by_id(g.user['userId'])
    if not user:
        return jsonify({'success': False, 'message': 'User not found.'}), 404
    settings = db.get_settings(user['id'])
    return jsonify({'success': True, 'user': _safe_user(user), 'settings': settings})


@app.put('/api/auth/profile')
@authenticate_token
def auth_update_profile() -> Any:
    body = request.get_json(silent=True) or {}
    updates: dict[str, Any] = {}
    if body.get('name'):
        updates['name'] = str(body['name']).strip()
    if 'profile_photo' in body:
        updates['profile_photo'] = body['profile_photo']

    updated = db.update_user(g.user['userId'], updates)
    if not updated:
        return jsonify({'success': False, 'message': 'User not found.'}), 404
    return jsonify({'success': True, 'user': _safe_user(updated), 'message': 'Profile updated successfully.'})


@app.put('/api/auth/password')
@authenticate_token
def auth_change_password() -> Any:
    body = request.get_json(silent=True) or {}
    current_password = body.get('currentPassword') or ''
    new_password = body.get('newPassword') or ''

    if not current_password or not new_password:
        return jsonify({'success': False, 'message': 'Please provide current and new passwords.'}), 400
    if len(new_password) < 6:
        return jsonify({'success': False, 'message': 'New password must be at least 6 characters.'}), 400

    user = db.get_user_by_id(g.user['userId'])
    if not user:
        return jsonify({'success': False, 'message': 'User not found.'}), 404

    if not bcrypt.checkpw(current_password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        return jsonify({'success': False, 'message': 'Current password does not match.'}), 401

    new_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8')
    updated = db.update_user(user['id'], {'password_hash': new_hash})
    if updated:
        try:
            sql_insert_user(updated)
        except Exception:
            pass
    return jsonify({'success': True, 'message': 'Password updated successfully.'})


@app.get('/api/settings')
@authenticate_token
def get_settings() -> Any:
    return jsonify({'success': True, 'settings': db.get_settings(g.user['userId'])})


@app.put('/api/settings')
@authenticate_token
def update_settings() -> Any:
    body = request.get_json(silent=True) or {}
    settings = db.update_settings(g.user['userId'], body)
    return jsonify({'success': True, 'settings': settings, 'message': 'Preferences updated.'})


# ==========================================
# JOURNAL ROUTES
# ==========================================


@app.get('/api/journal')
@authenticate_token
def list_journals() -> Any:
    return jsonify({'success': True, 'entries': db.get_journal_entries(g.user['userId'])})


@app.get('/api/journal/<entry_id>')
@authenticate_token
def get_journal(entry_id: str) -> Any:
    entry = db.get_journal_entry_by_id(entry_id, g.user['userId'])
    if not entry:
        return jsonify({'success': False, 'message': 'Journal entry not found.'}), 404
    return jsonify({'success': True, 'entry': entry})


@app.post('/api/journal')
@authenticate_token
def create_journal() -> Any:
    body = request.get_json(silent=True) or {}
    title = body.get('title') or ''
    content = body.get('content') or ''
    audio_url = body.get('audio_url')
    audio_clips = body.get('audio_clips') or []

    if not title and not content and not audio_url and len(audio_clips) == 0:
        return jsonify({'success': False, 'message': 'Entry must have a title, content, or voice recording.'}), 400

    now = _now_iso()
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    audio_duration = body.get('audio_duration')

    new_entry = db.create_journal_entry({
        'id': _rand_id('j_'),
        'user_id': g.user['userId'],
        'title': title or ('Voice Reflection' if audio_url else 'Untitled Entry'),
        'content': content,
        'mood': body.get('mood') or 'neutral',
        'emotion': body.get('emotion') or '',
        'entry_date': body.get('entry_date') or today,
        'created_at': now,
        'updated_at': now,
        'is_favorite': bool(body.get('is_favorite', False)),
        'is_private': bool(body.get('is_private')) if 'is_private' in body else True,
        'font_family': body.get('font_family') or 'serif',
        'text_color': body.get('text_color') or '#334155',
        'stickers': body.get('stickers') or [],
        'photos': body.get('photos') or [],
        'audio_url': audio_url or None,
        'audio_duration': audio_duration if isinstance(audio_duration, (int, float)) else None,
        'has_audio': bool(body.get('has_audio')) or bool(audio_url) or (isinstance(audio_clips, list) and len(audio_clips) > 0),
        'audio_clips': audio_clips,
        'wallpaper_theme': body.get('wallpaper_theme') or 'original',
        'bullet_style': body.get('bullet_style') or 'check',
        'font_size_preset': body.get('font_size_preset') or 'body',
        'text_align': body.get('text_align') or 'left',
        'tags': body.get('tags') or [],
        'eyes_protection': bool(body.get('eyes_protection', False)),
        'prompt_active': bool(body.get('prompt_active', False)),
        'current_prompt': body.get('current_prompt') or '',
    })
    return jsonify({'success': True, 'entry': new_entry, 'message': 'Saved to your little corner of the world ✨'}), 201


@app.put('/api/journal/<entry_id>')
@authenticate_token
def update_journal(entry_id: str) -> Any:
    body = request.get_json(silent=True) or {}
    updated = db.update_journal_entry(entry_id, g.user['userId'], body)
    if not updated:
        return jsonify({'success': False, 'message': 'Journal entry not found.'}), 404
    return jsonify({'success': True, 'entry': updated, 'message': 'Journal entry updated.'})


@app.delete('/api/journal/<entry_id>')
@authenticate_token
def delete_journal(entry_id: str) -> Any:
    if not db.delete_journal_entry(entry_id, g.user['userId']):
        return jsonify({'success': False, 'message': 'Entry not found or already deleted.'}), 404
    return jsonify({'success': True, 'message': 'Journal entry removed.'})


# ==========================================
# MEMORY ALBUM ROUTES
# ==========================================


@app.get('/api/memories')
@authenticate_token
def list_memories() -> Any:
    return jsonify({'success': True, 'memories': db.get_memories(g.user['userId'])})


@app.get('/api/memories/<memory_id>')
@authenticate_token
def get_memory(memory_id: str) -> Any:
    mem = db.get_memory_by_id(memory_id, g.user['userId'])
    if not mem:
        return jsonify({'success': False, 'message': 'Memory not found.'}), 404
    return jsonify({'success': True, 'memory': mem})


@app.post('/api/memories')
@authenticate_token
def create_memory() -> Any:
    body = request.get_json(silent=True) or {}
    title = (body.get('title') or '').strip()
    if not title:
        return jsonify({'success': False, 'message': 'Memory title is required.'}), 400

    mem_id = _rand_id('mem_')
    photos = body.get('photos') or []
    cover_image = body.get('cover_image') or (photos[0].get('image_path') if photos and isinstance(photos[0], dict) else '')
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    now = _now_iso()

    db.create_memory({
        'id': mem_id,
        'user_id': g.user['userId'],
        'title': title,
        'description': body.get('description') or '',
        'memory_date': body.get('memory_date') or today,
        'location': body.get('location') or '',
        'cover_image': cover_image,
        'is_favorite': bool(body.get('is_favorite', False)),
        'created_at': now,
    })

    if isinstance(photos, list):
        for p in photos:
            if isinstance(p, dict) and p.get('image_path'):
                db.add_memory_photo({
                    'id': _rand_id('p_'),
                    'memory_id': mem_id,
                    'user_id': g.user['userId'],
                    'image_path': p['image_path'],
                    'caption': p.get('caption') or '',
                    'uploaded_at': now,
                })

    complete = db.get_memory_by_id(mem_id, g.user['userId'])
    return jsonify({'success': True, 'memory': complete, 'message': 'Memory preserved forever 📸'}), 201


@app.put('/api/memories/<memory_id>')
@authenticate_token
def update_memory(memory_id: str) -> Any:
    body = request.get_json(silent=True) or {}
    updated = db.update_memory(memory_id, g.user['userId'], body)
    if not updated:
        return jsonify({'success': False, 'message': 'Memory not found.'}), 404
    return jsonify({'success': True, 'memory': updated, 'message': 'Memory updated.'})


@app.delete('/api/memories/<memory_id>')
@authenticate_token
def delete_memory(memory_id: str) -> Any:
    if not db.delete_memory(memory_id, g.user['userId']):
        return jsonify({'success': False, 'message': 'Memory not found.'}), 404
    return jsonify({'success': True, 'message': 'Memory deleted.'})


@app.post('/api/memories/<memory_id>/photos')
@authenticate_token
def add_memory_photo(memory_id: str) -> Any:
    body = request.get_json(silent=True) or {}
    image_path = body.get('image_path')
    if not image_path:
        return jsonify({'success': False, 'message': 'Image path or data URL required.'}), 400
    if not db.get_memory_by_id(memory_id, g.user['userId']):
        return jsonify({'success': False, 'message': 'Memory not found.'}), 404

    photo = db.add_memory_photo({
        'id': _rand_id('p_'),
        'memory_id': memory_id,
        'user_id': g.user['userId'],
        'image_path': image_path,
        'caption': body.get('caption') or '',
        'uploaded_at': _now_iso(),
    })
    return jsonify({'success': True, 'photo': photo, 'message': 'Photo added to album.'}), 201


@app.delete('/api/photos/<photo_id>')
@authenticate_token
def delete_photo(photo_id: str) -> Any:
    if not db.delete_memory_photo(photo_id, g.user['userId']):
        return jsonify({'success': False, 'message': 'Photo not found.'}), 404
    return jsonify({'success': True, 'message': 'Photo removed.'})


# ==========================================
# TASKS & TO-DO ROUTES
# ==========================================


@app.get('/api/tasks')
@authenticate_token
def list_tasks() -> Any:
    return jsonify({'success': True, 'tasks': db.get_tasks(g.user['userId'])})


@app.post('/api/tasks')
@authenticate_token
def create_task() -> Any:
    body = request.get_json(silent=True) or {}
    title = (body.get('title') or '').strip()
    if not title:
        return jsonify({'success': False, 'message': 'Task title is required.'}), 400

    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    task = db.create_task({
        'id': _rand_id('tsk_'),
        'user_id': g.user['userId'],
        'title': title,
        'description': body.get('description') or '',
        'priority': body.get('priority') or 'medium',
        'category': body.get('category') or 'personal',
        'due_date': body.get('due_date') or today,
        'due_time': body.get('due_time') or '',
        'completed': False,
        'created_at': _now_iso(),
    })
    return jsonify({'success': True, 'task': task, 'message': 'Task added.'}), 201


@app.put('/api/tasks/<task_id>')
@authenticate_token
def update_task(task_id: str) -> Any:
    body = request.get_json(silent=True) or {}
    updated = db.update_task(task_id, g.user['userId'], body)
    if not updated:
        return jsonify({'success': False, 'message': 'Task not found.'}), 404
    return jsonify({'success': True, 'task': updated})


@app.delete('/api/tasks/<task_id>')
@authenticate_token
def delete_task(task_id: str) -> Any:
    if not db.delete_task(task_id, g.user['userId']):
        return jsonify({'success': False, 'message': 'Task not found.'}), 404
    return jsonify({'success': True, 'message': 'Task deleted.'})


# ==========================================
# SCHEDULE / PLANNER ROUTES
# ==========================================


@app.get('/api/schedule')
@authenticate_token
def list_schedule() -> Any:
    return jsonify({'success': True, 'schedules': db.get_schedules(g.user['userId'])})


@app.post('/api/schedule')
@authenticate_token
def create_schedule() -> Any:
    body = request.get_json(silent=True) or {}
    title = (body.get('title') or '').strip()
    start_time = body.get('start_time')
    end_time = body.get('end_time')
    date_val = body.get('date')

    if not title or not start_time or not end_time or not date_val:
        return jsonify({'success': False, 'message': 'Title, date, start time, and end time are required.'}), 400

    schedule = db.create_schedule({
        'id': _rand_id('sch_'),
        'user_id': g.user['userId'],
        'title': title,
        'description': body.get('description') or '',
        'start_time': start_time,
        'end_time': end_time,
        'date': date_val,
        'category': body.get('category') or 'personal',
        'reminder_enabled': bool(body.get('reminder_enabled')) if 'reminder_enabled' in body else True,
    })
    return jsonify({'success': True, 'schedule': schedule, 'message': 'Event scheduled.'}), 201


@app.put('/api/schedule/<schedule_id>')
@authenticate_token
def update_schedule(schedule_id: str) -> Any:
    body = request.get_json(silent=True) or {}
    updated = db.update_schedule(schedule_id, g.user['userId'], body)
    if not updated:
        return jsonify({'success': False, 'message': 'Schedule event not found.'}), 404
    return jsonify({'success': True, 'schedule': updated})


@app.delete('/api/schedule/<schedule_id>')
@authenticate_token
def delete_schedule(schedule_id: str) -> Any:
    if not db.delete_schedule(schedule_id, g.user['userId']):
        return jsonify({'success': False, 'message': 'Schedule event not found.'}), 404
    return jsonify({'success': True, 'message': 'Event removed.'})


# ==========================================
# MOOD TRACKING ROUTES
# ==========================================


@app.get('/api/moods')
@authenticate_token
def list_moods() -> Any:
    return jsonify({'success': True, 'moods': db.get_mood_entries(g.user['userId'])})


@app.post('/api/moods')
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

    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    entry = db.create_mood_entry({
        'id': _rand_id('md_'),
        'user_id': g.user['userId'],
        'mood': mood,
        'emotion': body.get('emotion') or '',
        'intensity': intensity,
        'note': body.get('note') or '',
        'date': body.get('date') or today,
        'created_at': _now_iso(),
    })
    return jsonify({'success': True, 'mood': entry, 'message': 'Mood recorded 🌿'}), 201


@app.delete('/api/moods/<mood_id>')
@authenticate_token
def delete_mood(mood_id: str) -> Any:
    if not db.delete_mood_entry(mood_id, g.user['userId']):
        return jsonify({'success': False, 'message': 'Mood entry not found.'}), 404
    return jsonify({'success': True, 'message': 'Mood record deleted.'})


# ==========================================
# IMPORTANT NOTES ROUTES
# ==========================================


@app.get('/api/notes')
@authenticate_token
def list_notes() -> Any:
    return jsonify({'success': True, 'notes': db.get_notes(g.user['userId'])})


@app.post('/api/notes')
@authenticate_token
def create_note() -> Any:
    body = request.get_json(silent=True) or {}
    title = body.get('title') or ''
    content = body.get('content') or ''
    if not title and not content:
        return jsonify({'success': False, 'message': 'Note must contain a title or content.'}), 400

    note = db.create_note({
        'id': _rand_id('nt_'),
        'user_id': g.user['userId'],
        'title': title or 'Quick Note',
        'content': content,
        'priority': body.get('priority') or 'medium',
        'is_pinned': bool(body.get('is_pinned', False)),
        'color': body.get('color') or '#FEF3C7',
        'reminder_date': body.get('reminder_date'),
        'created_at': _now_iso(),
    })
    return jsonify({'success': True, 'note': note, 'message': 'Note saved.'}), 201


@app.put('/api/notes/<note_id>')
@authenticate_token
def update_note(note_id: str) -> Any:
    body = request.get_json(silent=True) or {}
    updated = db.update_note(note_id, g.user['userId'], body)
    if not updated:
        return jsonify({'success': False, 'message': 'Note not found.'}), 404
    return jsonify({'success': True, 'note': updated})


@app.delete('/api/notes/<note_id>')
@authenticate_token
def delete_note(note_id: str) -> Any:
    if not db.delete_note(note_id, g.user['userId']):
        return jsonify({'success': False, 'message': 'Note not found.'}), 404
    return jsonify({'success': True, 'message': 'Note deleted.'})


# ==========================================
# GLOBAL SEARCH & DATA EXPORT
# ==========================================


@app.get('/api/search')
@authenticate_token
def global_search() -> Any:
    query = request.args.get('q', '')
    return jsonify({'success': True, 'results': db.global_search(g.user['userId'], query)})


@app.get('/api/export')
@authenticate_token
def export_data() -> Any:
    export_payload = db.get_user_export_data(g.user['userId'])
    if not export_payload:
        return jsonify({'success': False, 'message': 'Data not found.'}), 404
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    return Response(
        json.dumps(export_payload, indent=2, ensure_ascii=False),
        mimetype='application/json',
        headers={'Content-Disposition': f'attachment; filename="borah_backup_{today}.json"'},
    )


@app.delete('/api/account')
@authenticate_token
def delete_account() -> Any:
    if not db.delete_user(g.user['userId']):
        return jsonify({'success': False, 'message': 'User account not found.'}), 404
    return jsonify({'success': True, 'message': 'Your account and all associated data have been permanently removed.'})


# ==========================================
# AI FEATURES (GEMINI 3.8 FLASH & LYRIA)
# ==========================================


@app.post('/api/ai/emotion')
@authenticate_token
def ai_emotion() -> Any:
    body = request.get_json(silent=True) or {}
    text = (body.get('text') or '').strip()
    if len(text) < 5:
        return jsonify({'success': False, 'message': 'Please provide some text to analyze.'}), 400
    detection = detect_emotion(text)
    return jsonify({'success': True, 'detection': detection})


@app.post('/api/ai/summary')
@authenticate_token
def ai_summary() -> Any:
    uid = g.user['userId']
    entries = db.get_journal_entries(uid)[:7]
    tasks = db.get_tasks(uid)
    moods = db.get_mood_entries(uid)[:7]
    summary = generate_weekly_summary(entries, tasks, moods)
    return jsonify({'success': True, 'summary': summary})


@app.get('/api/ai/prompts')
@authenticate_token
def ai_prompts() -> Any:
    prompts = [
        'What was the quietest, most peaceful moment you experienced today?',
        'What is one small accomplishment you are genuinely proud of this week?',
        'If you could give yourself one kind piece of advice for tomorrow, what would it be?',
        'Who or what brought an unexpected smile to your face recently?',
        'What is a challenge you faced today that taught you something valuable about yourself?',
    ]
    return jsonify({'success': True, 'prompts': prompts})


@app.post('/api/ai/music')
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


@app.post('/api/ai/transcribe')
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


# ==========================================
# RESEARCH PAPER DOWNLOAD ROUTES
# ==========================================


def _resolve_doc_path(filename: str) -> str:
    primary = os.path.join(PUBLIC_DIR, filename)
    backup = os.path.join(MSC_DOCS_DIR, filename)
    return primary if os.path.exists(primary) else backup


@app.get('/api/download/paper-docx')
def download_paper_docx() -> Any:
    target = _resolve_doc_path('BORAH_Research_Paper.docx')
    if not os.path.exists(target):
        return jsonify({'success': False, 'message': 'Could not download Word document.'}), 404
    return send_file(target, as_attachment=True, download_name='BORAH_Research_Paper.docx')


@app.get('/api/download/paper-tex')
def download_paper_tex() -> Any:
    target = _resolve_doc_path('BORAH_Research_Paper.tex')
    if not os.path.exists(target):
        return jsonify({'success': False, 'message': 'Could not download LaTeX source.'}), 404
    return send_file(target, as_attachment=True, download_name='BORAH_Research_Paper.tex')


@app.get('/api/download/paper-pdf')
def download_paper_pdf() -> Any:
    target = _resolve_doc_path('BORAH_Research_Paper.pdf')
    if not os.path.exists(target):
        return jsonify({'success': False, 'message': 'Could not download PDF document.'}), 404
    return send_file(target, as_attachment=True, download_name='BORAH_Research_Paper.pdf', mimetype='application/pdf')


@app.get('/api/download/presentation-pdf')
def download_presentation_pdf() -> Any:
    target = _resolve_doc_path('BORAH_Project_Presentation.pdf')
    if not os.path.exists(target):
        return jsonify({'success': False, 'message': 'Could not download presentation PDF.'}), 404
    return send_file(
        target,
        as_attachment=True,
        download_name='BORAH_Project_Presentation.pdf',
        mimetype='application/pdf',
    )


@app.get('/BORAH_Research_Paper.pdf')
@app.get('/BORAH_Research_Paper.docx')
@app.get('/BORAH_Research_Paper.tex')
@app.get('/BORAH_Project_Presentation.pdf')
def serve_public_research_doc() -> Any:
    filename = request.path.lstrip('/')
    target = _resolve_doc_path(filename)
    if not os.path.exists(target):
        return jsonify({'success': False, 'message': 'File not found.'}), 404
    mimetype = 'application/pdf' if filename.endswith('.pdf') else None
    return send_file(target, mimetype=mimetype)


@app.get('/assets/<path:filename>')
def serve_public_assets(filename: str) -> Any:
    assets_dir = os.path.join(PUBLIC_DIR, 'assets')
    return send_from_directory(assets_dir, filename)


# ==========================================
# FRONTEND SPA ENTRYPOINT
# ==========================================


@app.get('/')
def index() -> Any:
    return render_template('index.html')


def bootstrap_database() -> None:
    try:
        init_sql_database()
        existing_users = db.get_all_users()
        for user in existing_users:
            try:
                sql_insert_user(user)
            except Exception:
                pass
        print(f'🗄️ SQLite database initialized: {len(existing_users)} user records synchronized to SQL database.')
    except Exception as exc:
        print(f'Failed to initialize SQL database: {exc}')


bootstrap_database()

if __name__ == '__main__':
    print(f'💜 BORAH Python/Flask server listening on http://0.0.0.0:{PORT}')
    app.run(host='0.0.0.0', port=PORT, debug=False, threaded=True)

import re
from typing import Any, Dict

import bcrypt
from flask import Blueprint, g, jsonify, request

from backend.extensions import db_orm
from backend.migrate_legacy import seed_starter_data
from backend.models import (
    User,
    UserSettings,
    UserSignin,
    _dump_json,
    now_iso,
    rand_id,
)
from backend.paths import get_database_uri
from backend.security import authenticate_token, create_access_token

auth_bp = Blueprint('auth_bp', __name__)
EMAIL_REGEX = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')


def _get_or_create_settings(user_id: str) -> UserSettings:
    setting = UserSettings.query.filter_by(user_id=user_id).first()
    if not setting:
        setting = UserSettings(
            id=rand_id('set_'),
            user_id=user_id,
            theme='warm-sunrise',
            font_family='sans',
            font_size='medium',
            accent_color='#5F8D7B',
            dark_mode=False,
            onboarding_completed=False,
        )
        db_orm.session.add(setting)
        db_orm.session.commit()
    return setting


def _record_signin(user_id: str, email: str, status: str, ua: str | None) -> None:
    try:
        db_orm.session.add(
            UserSignin(
                user_id=user_id,
                email=(email or '').lower().strip(),
                signin_time=now_iso(),
                status=status,
                user_agent=ua or 'Web Client',
            )
        )
        db_orm.session.commit()
    except Exception:
        db_orm.session.rollback()


@auth_bp.post('/api/auth/register')
def auth_register() -> Any:
    try:
        body: Dict[str, Any] = request.get_json(silent=True) or {}
        name = (body.get('name') or '').strip()
        email = (body.get('email') or '').lower().strip()
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
        if User.query.filter_by(email=email).first():
            return jsonify({'success': False, 'message': 'An account with this email already exists.'}), 409

        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8')
        now = now_iso()
        new_user = User(
            id=rand_id('usr_', 8),
            name=name,
            email=email,
            password_hash=password_hash,
            role='individual',
            job_title=(body.get('job_title') or '').strip(),
            department=(body.get('department') or '').strip(),
            is_verified=True,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        db_orm.session.add(new_user)
        db_orm.session.commit()

        _record_signin(new_user.id, new_user.email, 'REGISTRATION_SUCCESS', request.headers.get('User-Agent'))
        seed_starter_data(new_user.id, new_user.name)
        settings = _get_or_create_settings(new_user.id)
        token = create_access_token(new_user.id, new_user.email, new_user.role)

        return jsonify({
            'success': True,
            'message': 'Account created successfully! Welcome to BORAH.',
            'token': token,
            'user': new_user.to_safe_dict(),
            'settings': settings.to_dict(),
        }), 201
    except Exception as exc:
        db_orm.session.rollback()
        print(f'Registration error: {exc}', flush=True)
        return jsonify({'success': False, 'message': 'An error occurred during registration.'}), 500


@auth_bp.post('/api/auth/login')
def auth_login() -> Any:
    try:
        body = request.get_json(silent=True) or {}
        email = (body.get('email') or '').lower().strip()
        password = body.get('password') or ''
        ua = request.headers.get('User-Agent')

        if not email or not password:
            return jsonify({'success': False, 'message': 'Please provide both email and password.'}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            _record_signin('unregistered', email, 'FAILED_USER_NOT_FOUND', ua)
            return jsonify({'success': False, 'message': 'Invalid email or password.'}), 401

        try:
            is_match = bcrypt.checkpw(password.encode('utf-8'), (user.password_hash or '').encode('utf-8'))
        except Exception:
            is_match = False

        if not is_match:
            _record_signin(user.id, user.email, 'FAILED_INVALID_PASSWORD', ua)
            return jsonify({'success': False, 'message': 'Invalid email or password.'}), 401

        _record_signin(user.id, user.email, 'SIGNIN_SUCCESS', ua)
        settings = _get_or_create_settings(user.id)
        token = create_access_token(user.id, user.email, user.role)

        return jsonify({
            'success': True,
            'message': f'Welcome back, {user.name}.',
            'token': token,
            'user': user.to_safe_dict(),
            'settings': settings.to_dict(),
        })
    except Exception as exc:
        print(f'Login error: {exc}', flush=True)
        return jsonify({'success': False, 'message': 'Unable to log in at this moment.'}), 500


@auth_bp.get('/api/auth/sql-status')
@authenticate_token
def auth_sql_status() -> Any:
    signins = (
        UserSignin.query.filter_by(user_id=g.user['userId'])
        .order_by(UserSignin.signin_time.desc())
        .limit(50)
        .all()
    )
    total_users = User.query.count()
    uri = get_database_uri()
    engine_label = 'PostgreSQL (SQLAlchemy ORM)' if uri.startswith('postgresql') else 'SQLite 3 (SQLAlchemy ORM)'
    return jsonify({
        'success': True,
        'sqlDatabase': engine_label,
        'databasePath': 'PostgreSQL' if uri.startswith('postgresql') else 'database/borah_v2.sqlite',
        'totalUsersInSql': total_users,
        'userSigninsCount': len(signins),
        'recentSignins': [s.to_dict() for s in signins],
    })


@auth_bp.get('/api/auth/me')
@authenticate_token
def auth_me() -> Any:
    user = User.query.get(g.user['userId'])
    if not user:
        return jsonify({'success': False, 'message': 'User not found.'}), 404
    settings = _get_or_create_settings(user.id)
    return jsonify({'success': True, 'user': user.to_safe_dict(), 'settings': settings.to_dict()})


@auth_bp.put('/api/auth/profile')
@authenticate_token
def auth_update_profile() -> Any:
    user = User.query.get(g.user['userId'])
    if not user:
        return jsonify({'success': False, 'message': 'User not found.'}), 404

    body = request.get_json(silent=True) or {}
    if body.get('name'):
        user.name = str(body['name']).strip()[:160]
    if 'profile_photo' in body:
        user.profile_photo = body['profile_photo']
    if 'job_title' in body:
        user.job_title = str(body['job_title'] or '').strip()[:160]
    if 'department' in body:
        user.department = str(body['department'] or '').strip()[:160]
    user.updated_at = now_iso()
    db_orm.session.commit()
    return jsonify({'success': True, 'user': user.to_safe_dict(), 'message': 'Profile updated successfully.'})


@auth_bp.put('/api/auth/password')
@authenticate_token
def auth_change_password() -> Any:
    body = request.get_json(silent=True) or {}
    current_password = body.get('currentPassword') or ''
    new_password = body.get('newPassword') or ''

    if not current_password or not new_password:
        return jsonify({'success': False, 'message': 'Please provide current and new passwords.'}), 400
    if len(new_password) < 6:
        return jsonify({'success': False, 'message': 'New password must be at least 6 characters.'}), 400

    user = User.query.get(g.user['userId'])
    if not user:
        return jsonify({'success': False, 'message': 'User not found.'}), 404
    if not bcrypt.checkpw(current_password.encode('utf-8'), user.password_hash.encode('utf-8')):
        return jsonify({'success': False, 'message': 'Current password does not match.'}), 401

    user.password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8')
    user.updated_at = now_iso()
    db_orm.session.commit()
    return jsonify({'success': True, 'message': 'Password updated successfully.'})


@auth_bp.get('/api/settings')
@authenticate_token
def get_settings() -> Any:
    return jsonify({'success': True, 'settings': _get_or_create_settings(g.user['userId']).to_dict()})


@auth_bp.put('/api/settings')
@authenticate_token
def update_settings() -> Any:
    setting = _get_or_create_settings(g.user['userId'])
    body = request.get_json(silent=True) or {}

    if 'theme' in body and isinstance(body['theme'], str):
        setting.theme = body['theme'][:64]
    if 'font_family' in body and isinstance(body['font_family'], str):
        setting.font_family = body['font_family'][:64]
    if 'font_size' in body and isinstance(body['font_size'], str):
        setting.font_size = body['font_size'][:32]
    if 'accent_color' in body and isinstance(body['accent_color'], str):
        setting.accent_color = body['accent_color'][:32]
    if 'dark_mode' in body:
        setting.dark_mode = bool(body['dark_mode'])
    if 'onboarding_completed' in body:
        setting.onboarding_completed = bool(body['onboarding_completed'])
    if 'primary_interests' in body and isinstance(body['primary_interests'], list):
        setting.primary_interests_json = _dump_json(body['primary_interests'])
    if 'visible_modules' in body and isinstance(body['visible_modules'], dict):
        setting.visible_modules_json = _dump_json(body['visible_modules'])
    if 'workspace_mode' in body and isinstance(body['workspace_mode'], str):
        setting.workspace_mode = body['workspace_mode'][:32]
    if 'org_mode_enabled' in body:
        setting.org_mode_enabled = bool(body['org_mode_enabled'])
    if 'show_companion' in body:
        setting.show_companion = bool(body['show_companion'])
    if 'daily_reminder_time' in body:
        setting.daily_reminder_time = str(body['daily_reminder_time'] or '18:00')[:16]

    db_orm.session.commit()
    return jsonify({'success': True, 'settings': setting.to_dict(), 'message': 'Preferences updated.'})


@auth_bp.delete('/api/account')
@authenticate_token
def delete_account() -> Any:
    user = User.query.get(g.user['userId'])
    if not user:
        return jsonify({'success': False, 'message': 'User account not found.'}), 404
    db_orm.session.delete(user)
    db_orm.session.commit()
    return jsonify({
        'success': True,
        'message': 'Your account and all associated data have been permanently removed.',
    })

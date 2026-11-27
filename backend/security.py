import os
from datetime import datetime, timedelta, timezone
from functools import wraps
from typing import Any, Callable

import jwt
from flask import g, jsonify, request

JWT_SECRET = os.environ.get('JWT_SECRET', 'borah-professional-workspace-secret-key-2026')


def create_access_token(user_id: str, email: str, role: str = 'individual') -> str:
    payload = {
        'userId': user_id,
        'email': email,
        'role': role,
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
            user_id = decoded.get('userId') or decoded.get('sub')
            if not user_id:
                raise ValueError('Missing user claim')
            g.user = {
                'userId': str(user_id),
                'email': str(decoded.get('email') or ''),
                'role': str(decoded.get('role') or 'individual'),
            }
        except Exception:
            return jsonify({'success': False, 'message': 'Session expired or invalid. Please log in again.'}), 403

        return fn(*args, **kwargs)

    return wrapper

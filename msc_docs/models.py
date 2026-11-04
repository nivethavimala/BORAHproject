"""
BORAH — Private Journal, Memory, Planner & Life Companion
MSc Architecture Reference: Python Flask-SQLAlchemy Database Models
"""

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.String(36), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    profile_photo = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_verified = db.Column(db.Boolean, default=True)
    is_active = db.Column(db.Boolean, default=True)

    # Relationships with cascade delete for strict data privacy
    journals = db.relationship('JournalEntry', backref='user', cascade='all, delete-orphan', lazy=True)
    memories = db.relationship('Memory', backref='user', cascade='all, delete-orphan', lazy=True)
    tasks = db.relationship('Task', backref='user', cascade='all, delete-orphan', lazy=True)
    schedules = db.relationship('Schedule', backref='user', cascade='all, delete-orphan', lazy=True)
    moods = db.relationship('MoodEntry', backref='user', cascade='all, delete-orphan', lazy=True)
    notes = db.relationship('ImportantNote', backref='user', cascade='all, delete-orphan', lazy=True)
    settings = db.relationship('UserSettings', backref='user', uselist=False, cascade='all, delete-orphan')

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)


class JournalEntry(db.Model):
    __tablename__ = 'journal_entries'

    id = db.Column(db.String(36), primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    mood = db.Column(db.String(50), default='calm')
    emotion = db.Column(db.String(100), nullable=True)
    entry_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_favorite = db.Column(db.Boolean, default=False)
    is_private = db.Column(db.Boolean, default=True)
    font_family = db.Column(db.String(50), default='serif')
    text_color = db.Column(db.String(30), default='#334155')
    stickers_json = db.Column(db.Text, default='[]')
    photos_json = db.Column(db.Text, default='[]')


class Memory(db.Model):
    __tablename__ = 'memories'

    id = db.Column(db.String(36), primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    memory_date = db.Column(db.Date, nullable=False)
    location = db.Column(db.String(200), nullable=True)
    cover_image = db.Column(db.String(500), nullable=True)
    is_favorite = db.Column(db.Boolean, default=False)
    is_special = db.Column(db.Boolean, default=False) # 7-Star feature
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    photos = db.relationship('MemoryPhoto', backref='memory', cascade='all, delete-orphan', lazy=True)


class MemoryPhoto(db.Model):
    __tablename__ = 'memory_photos'

    id = db.Column(db.String(36), primary_key=True)
    memory_id = db.Column(db.String(36), db.ForeignKey('memories.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    image_path = db.Column(db.String(500), nullable=False)
    caption = db.Column(db.String(255), nullable=True)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)


class Task(db.Model):
    __tablename__ = 'tasks'

    id = db.Column(db.String(36), primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    priority = db.Column(db.String(20), default='medium') # high, medium, low
    category = db.Column(db.String(50), default='personal') # study, work, personal, health, project
    due_date = db.Column(db.Date, nullable=True)
    due_time = db.Column(db.String(10), nullable=True)
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Schedule(db.Model):
    __tablename__ = 'schedules'

    id = db.Column(db.String(36), primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.String(10), nullable=False)
    end_time = db.Column(db.String(10), nullable=False)
    category = db.Column(db.String(50), default='study')
    reminder_enabled = db.Column(db.Boolean, default=True)


class MoodEntry(db.Model):
    __tablename__ = 'mood_entries'

    id = db.Column(db.String(36), primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    mood = db.Column(db.String(50), nullable=False) # happy, calm, neutral, sad, anxious, angry, tired, excited
    emotion = db.Column(db.String(100), nullable=True)
    intensity = db.Column(db.Integer, default=5) # 1 - 10
    note = db.Column(db.Text, nullable=True)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ImportantNote(db.Model):
    __tablename__ = 'important_notes'

    id = db.Column(db.String(36), primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(20), default='medium')
    is_pinned = db.Column(db.Boolean, default=False)
    color = db.Column(db.String(20), default='#FEF3C7')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class UserSettings(db.Model):
    __tablename__ = 'user_settings'

    id = db.Column(db.String(36), primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    theme = db.Column(db.String(50), default='warm-sunrise')
    font_family = db.Column(db.String(50), default='serif')
    font_size = db.Column(db.String(20), default='medium')
    accent_color = db.Column(db.String(20), default='#8B5CF6')
    dark_mode = db.Column(db.Boolean, default=False)
    onboarding_completed = db.Column(db.Boolean, default=False)
    interests_json = db.Column(db.Text, default='["journal", "mood", "tasks"]')

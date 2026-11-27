import json
import os
import sqlite3
from datetime import datetime, timedelta, timezone

from backend.extensions import db_orm
from backend.models import (
    ActivityLog,
    ImportantNote,
    JournalEntry,
    Meeting,
    Memory,
    MemoryPhoto,
    MoodEntry,
    Notification,
    Project,
    Schedule,
    Task,
    User,
    UserSettings,
    UserSignin,
    _dump_json,
    now_iso,
    rand_id,
)
from backend.paths import LEGACY_JSON_PATH, LEGACY_SQLITE_PATH


def migrate_legacy_data() -> None:
    """Safely migrate existing JSON + legacy SQLite records into SQLAlchemy ORM once."""
    if os.path.exists(LEGACY_JSON_PATH):
        try:
            with open(LEGACY_JSON_PATH, 'r', encoding='utf-8') as f:
                raw = json.load(f)
        except Exception as exc:
            print(f'Legacy JSON read skipped: {exc}', flush=True)
            raw = {}

        if isinstance(raw, dict):
            migrated_users = 0
            for u in raw.get('users', []):
                if not u.get('id') or not u.get('email'):
                    continue
                if not User.query.get(u['id']) and not User.query.filter_by(email=u['email'].lower().strip()).first():
                    db_orm.session.add(
                        User(
                            id=u['id'],
                            name=u.get('name') or 'BORAH User',
                            email=u['email'].lower().strip(),
                            password_hash=u.get('password_hash') or '',
                            profile_photo=u.get('profile_photo'),
                            role=u.get('role') or 'individual',
                            is_verified=bool(u.get('is_verified', True)),
                            is_active=bool(u.get('is_active', True)),
                            created_at=u.get('created_at') or now_iso(),
                            updated_at=u.get('updated_at') or now_iso(),
                        )
                    )
                    migrated_users += 1

            db_orm.session.flush()

            for s in raw.get('settings', []):
                uid = s.get('user_id')
                if not uid or not User.query.get(uid):
                    continue
                if not UserSettings.query.filter_by(user_id=uid).first():
                    db_orm.session.add(
                        UserSettings(
                            id=s.get('id') or rand_id('set_'),
                            user_id=uid,
                            theme=s.get('theme') or 'warm-sunrise',
                            font_family=s.get('font_family') or 'sans',
                            font_size=s.get('font_size') or 'medium',
                            accent_color=s.get('accent_color') or '#5F8D7B',
                            dark_mode=bool(s.get('dark_mode', False)),
                            onboarding_completed=bool(s.get('onboarding_completed', False)),
                            primary_interests_json=_dump_json(
                                s.get('primary_interests') or ['activities', 'tasks', 'planner', 'reports']
                            ),
                        )
                    )

            for j in raw.get('journal_entries', []):
                uid = j.get('user_id')
                if not j.get('id') or not uid or not User.query.get(uid):
                    continue
                if not JournalEntry.query.get(j['id']):
                    db_orm.session.add(
                        JournalEntry(
                            id=j['id'],
                            user_id=uid,
                            title=j.get('title') or 'Untitled Entry',
                            content=j.get('content') or '',
                            mood=j.get('mood') or 'neutral',
                            emotion=j.get('emotion') or '',
                            entry_date=j.get('entry_date') or now_iso()[:10],
                            is_favorite=bool(j.get('is_favorite', False)),
                            is_private=bool(j.get('is_private', True)),
                            font_family=j.get('font_family') or 'serif',
                            text_color=j.get('text_color') or '#334155',
                            stickers_json=_dump_json(j.get('stickers') or []),
                            photos_json=_dump_json(j.get('photos') or []),
                            audio_url=j.get('audio_url'),
                            audio_duration=j.get('audio_duration'),
                            has_audio=bool(j.get('has_audio', False)),
                            audio_clips_json=_dump_json(j.get('audio_clips') or []),
                            wallpaper_theme=j.get('wallpaper_theme') or 'original',
                            bullet_style=j.get('bullet_style') or 'check',
                            font_size_preset=j.get('font_size_preset') or 'body',
                            text_align=j.get('text_align') or 'left',
                            tags_json=_dump_json(j.get('tags') or []),
                            eyes_protection=bool(j.get('eyes_protection', False)),
                            prompt_active=bool(j.get('prompt_active', False)),
                            current_prompt=j.get('current_prompt') or '',
                            created_at=j.get('created_at') or now_iso(),
                            updated_at=j.get('updated_at') or now_iso(),
                        )
                    )

            for m in raw.get('memories', []):
                uid = m.get('user_id')
                if not m.get('id') or not uid or not User.query.get(uid):
                    continue
                if not Memory.query.get(m['id']):
                    db_orm.session.add(
                        Memory(
                            id=m['id'],
                            user_id=uid,
                            title=m.get('title') or 'Memory',
                            description=m.get('description') or '',
                            memory_date=m.get('memory_date') or now_iso()[:10],
                            location=m.get('location') or '',
                            cover_image=m.get('cover_image') or '',
                            is_favorite=bool(m.get('is_favorite', False)),
                            created_at=m.get('created_at') or now_iso(),
                        )
                    )

            db_orm.session.flush()

            for p in raw.get('memory_photos', []):
                uid = p.get('user_id')
                mid = p.get('memory_id')
                if not p.get('id') or not uid or not mid:
                    continue
                if Memory.query.get(mid) and not MemoryPhoto.query.get(p['id']):
                    db_orm.session.add(
                        MemoryPhoto(
                            id=p['id'],
                            memory_id=mid,
                            user_id=uid,
                            image_path=p.get('image_path') or '',
                            caption=p.get('caption') or '',
                            uploaded_at=p.get('uploaded_at') or now_iso(),
                        )
                    )

            for t in raw.get('tasks', []):
                uid = t.get('user_id')
                if not t.get('id') or not uid or not User.query.get(uid):
                    continue
                if not Task.query.get(t['id']):
                    done = bool(t.get('completed', False))
                    db_orm.session.add(
                        Task(
                            id=t['id'],
                            user_id=uid,
                            title=t.get('title') or 'Task',
                            description=t.get('description') or '',
                            priority=(t.get('priority') or 'medium').lower(),
                            category=t.get('category') or 'Personal',
                            status='completed' if done else (t.get('status') or 'not_started'),
                            progress_percent=100 if done else int(t.get('progress_percent') or 0),
                            due_date=t.get('due_date') or '',
                            due_time=t.get('due_time') or '',
                            completed=done,
                            created_at=t.get('created_at') or now_iso(),
                            updated_at=now_iso(),
                        )
                    )

            for s in raw.get('schedules', []):
                uid = s.get('user_id')
                if not s.get('id') or not uid or not User.query.get(uid):
                    continue
                if not Schedule.query.get(s['id']):
                    db_orm.session.add(
                        Schedule(
                            id=s['id'],
                            user_id=uid,
                            title=s.get('title') or 'Schedule Event',
                            description=s.get('description') or '',
                            category=s.get('category') or 'Work',
                            date=s.get('date') or now_iso()[:10],
                            start_time=s.get('start_time') or '09:00',
                            end_time=s.get('end_time') or '10:00',
                            reminder_enabled=bool(s.get('reminder_enabled', True)),
                            created_at=now_iso(),
                            updated_at=now_iso(),
                        )
                    )

            for md in raw.get('mood_entries', []):
                uid = md.get('user_id')
                if not md.get('id') or not uid or not User.query.get(uid):
                    continue
                if not MoodEntry.query.get(md['id']):
                    db_orm.session.add(
                        MoodEntry(
                            id=md['id'],
                            user_id=uid,
                            mood=md.get('mood') or 'calm',
                            emotion=md.get('emotion') or '',
                            intensity=int(md.get('intensity') or 5),
                            note=md.get('note') or '',
                            date=md.get('date') or now_iso()[:10],
                            created_at=md.get('created_at') or now_iso(),
                        )
                    )

            for nt in raw.get('notes', []):
                uid = nt.get('user_id')
                if not nt.get('id') or not uid or not User.query.get(uid):
                    continue
                if not ImportantNote.query.get(nt['id']):
                    db_orm.session.add(
                        ImportantNote(
                            id=nt['id'],
                            user_id=uid,
                            title=nt.get('title') or 'Note',
                            content=nt.get('content') or '',
                            priority=nt.get('priority') or 'medium',
                            is_pinned=bool(nt.get('is_pinned', False)),
                            color=nt.get('color') or '#FEF3C7',
                            reminder_date=nt.get('reminder_date'),
                            created_at=nt.get('created_at') or now_iso(),
                            updated_at=now_iso(),
                        )
                    )

            db_orm.session.commit()
            if migrated_users:
                print(f'Migrated {migrated_users} user accounts from legacy JSON store to SQLAlchemy.', flush=True)

    # Import legacy sqlite signins if empty
    if os.path.exists(LEGACY_SQLITE_PATH) and UserSignin.query.count() == 0:
        try:
            conn = sqlite3.connect(LEGACY_SQLITE_PATH)
            conn.row_factory = sqlite3.Row
            rows = conn.execute('SELECT * FROM user_signins ORDER BY id DESC LIMIT 200').fetchall()
            for r in rows:
                db_orm.session.add(
                    UserSignin(
                        user_id=r['user_id'],
                        email=r['email'],
                        signin_time=r['signin_time'],
                        status=r['status'],
                        user_agent=r['user_agent'],
                    )
                )
            db_orm.session.commit()
            conn.close()
        except Exception:
            db_orm.session.rollback()


def seed_starter_data(user_id: str, user_name: str) -> None:
    """Seed helpful starter entries across professional and personal modules for new accounts."""
    today_dt = datetime.now(timezone.utc)
    today = today_dt.strftime('%Y-%m-%d')
    yesterday = (today_dt - timedelta(days=1)).strftime('%Y-%m-%d')
    now = now_iso()

    proj_id = rand_id('prj_')
    db_orm.session.add(
        Project(
            id=proj_id,
            user_id=user_id,
            title='AI & Federated Analytics Initiative',
            code='RES-2026',
            category='Research',
            status='active',
            start_date=yesterday,
            target_date=(today_dt + timedelta(days=30)).strftime('%Y-%m-%d'),
            progress_percent=45,
            description='Ongoing academic research, curriculum preparation, and documentation workflow.',
            created_at=now,
            updated_at=now,
        )
    )

    mtg_id = rand_id('mtg_')
    db_orm.session.add(
        Meeting(
            id=mtg_id,
            user_id=user_id,
            project_id=proj_id,
            title='Weekly Academic & Project Sync',
            meeting_date=today,
            start_time='11:00',
            end_time='11:45',
            location='Seminar Room B / Online',
            participants=f'{user_name}, Research Team, Department Coordinator',
            agenda='Review module milestones, student guidance slots, and documentation deadlines.',
            decisions='Adopted standardized daily activity logging and weekly PDF reporting.',
            action_items='Finalize lecture slides; circulate weekly progress digest.',
            created_at=now,
            updated_at=now,
        )
    )

    db_orm.session.add_all([
        ActivityLog(
            id=rand_id('act_'),
            user_id=user_id,
            project_id=proj_id,
            title='Morning Lecture / Focused Deep Work Session',
            description='Prepared materials and delivered structured session notes on applied systems.',
            activity_date=today,
            start_time='09:00',
            end_time='10:30',
            duration_minutes=90,
            category='Teaching',
            priority='high',
            status='completed',
            remarks='Session completed smoothly with strong engagement.',
            created_at=now,
            updated_at=now,
        ),
        ActivityLog(
            id=rand_id('act_'),
            user_id=user_id,
            project_id=proj_id,
            meeting_id=mtg_id,
            title='Weekly Academic & Project Sync',
            description='Coordinated project deliverables and reviewed research milestones.',
            activity_date=today,
            start_time='11:00',
            end_time='11:45',
            duration_minutes=45,
            category='Meetings',
            priority='medium',
            status='completed',
            remarks='Action items recorded under Meetings.',
            created_at=now,
            updated_at=now,
        ),
        ActivityLog(
            id=rand_id('act_'),
            user_id=user_id,
            title='Student Guidance & Consultation Hour',
            description='Reviewed draft outlines and offered structured feedback.',
            activity_date=yesterday,
            start_time='14:00',
            end_time='15:15',
            duration_minutes=75,
            category='Student Guidance',
            priority='medium',
            status='completed',
            remarks='Follow-up check planned next week.',
            created_at=now,
            updated_at=now,
        ),
    ])

    db_orm.session.add_all([
        Task(
            id=rand_id('tsk_'),
            user_id=user_id,
            project_id=proj_id,
            title='Review literature notes and methodology outline',
            description='Summarize key references for upcoming deliverable',
            priority='high',
            category='Research',
            status='completed',
            progress_percent=100,
            due_date=today,
            due_time='14:00',
            completed=True,
            created_at=now,
            updated_at=now,
        ),
        Task(
            id=rand_id('tsk_'),
            user_id=user_id,
            project_id=proj_id,
            title='Prepare lecture handouts & weekly summary report',
            description='Compile notes and export PDF summary at end of day',
            priority='medium',
            category='Teaching',
            status='in_progress',
            progress_percent=50,
            due_date=today,
            due_time='17:30',
            completed=False,
            created_at=now,
            updated_at=now,
        ),
    ])

    db_orm.session.add_all([
        Schedule(
            id=rand_id('sch_'),
            user_id=user_id,
            project_id=proj_id,
            title='AI & Data Systems Seminar',
            description='Lecture Hall B — Applied Systems Session',
            event_type='Lecture',
            category='Teaching',
            date=today,
            start_time='10:00',
            end_time='11:00',
            location='Lecture Hall B',
            reminder_enabled=True,
            reminder_minutes=15,
            created_at=now,
            updated_at=now,
        ),
        Schedule(
            id=rand_id('sch_'),
            user_id=user_id,
            title='Daily Wrap-Up & Activity Log Review',
            description='Log remaining work hours and prepare tomorrow’s plan',
            event_type='Reminder',
            category='Administrative',
            date=today,
            start_time='17:45',
            end_time='18:00',
            reminder_enabled=True,
            reminder_minutes=10,
            created_at=now,
            updated_at=now,
        ),
    ])

    db_orm.session.add(
        JournalEntry(
            id=rand_id('j_'),
            user_id=user_id,
            title='Welcome to your BORAH workspace',
            content=(
                'This private space stays strictly yours—separate from work reports and team logs. '
                'Use BORAH to organize your daily activities, reflect calmly, and track progress at your own pace.'
            ),
            mood='calm',
            emotion='Focused & Grounded',
            entry_date=today,
            is_favorite=True,
            is_private=True,
            font_family='serif',
            text_color='#334155',
            created_at=now,
            updated_at=now,
        )
    )

    db_orm.session.add(
        ImportantNote(
            id=rand_id('nt_'),
            user_id=user_id,
            title='Workspace Quick Tip',
            content='Log daily activities with start & end times so Daily, Weekly, and Monthly PDF/Excel reports populate automatically.',
            priority='medium',
            is_pinned=True,
            color='#EEF5F0',
            created_at=now,
            updated_at=now,
        )
    )

    db_orm.session.add(
        MoodEntry(
            id=rand_id('md_'),
            user_id=user_id,
            mood='calm',
            intensity=8,
            note='Starting the day organized and clear-headed.',
            date=today,
            created_at=now,
        )
    )

    db_orm.session.add(
        Notification(
            id=rand_id('ntf_'),
            user_id=user_id,
            title='Welcome to BORAH Professional Workspace',
            message='Start by logging today’s activities or reviewing your Planner & Tasks.',
            category='system',
            target_view='activities',
            is_read=False,
            created_at=now,
        )
    )

    db_orm.session.commit()

import json
import os
import secrets
import string
import threading
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DB_DIR = os.path.join(BASE_DIR, 'database')
DB_FILE = os.path.join(DB_DIR, 'borah_store.json')
LEGACY_DB_FILE = os.path.join(DB_DIR, 'lumora_store.json')


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def _rand_id(prefix: str, length: int = 7) -> str:
    alphabet = string.ascii_lowercase + string.digits
    token = ''.join(secrets.choice(alphabet) for _ in range(length))
    return f'{prefix}{token}'


def _default_data() -> Dict[str, Any]:
    return {
        'users': [],
        'journal_entries': [],
        'memories': [],
        'memory_photos': [],
        'tasks': [],
        'schedules': [],
        'mood_entries': [],
        'notes': [],
        'settings': [],
    }


class BorahDatabase:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._ensure_directory()
        self.data: Dict[str, Any] = self._load()

    def _ensure_directory(self) -> None:
        os.makedirs(DB_DIR, exist_ok=True)

    def _load(self) -> Dict[str, Any]:
        with self._lock:
            try:
                if os.path.exists(DB_FILE):
                    with open(DB_FILE, 'r', encoding='utf-8') as f:
                        loaded = json.load(f)
                        for key, val in _default_data().items():
                            loaded.setdefault(key, val)
                        return loaded
                if os.path.exists(LEGACY_DB_FILE):
                    with open(LEGACY_DB_FILE, 'r', encoding='utf-8') as f:
                        legacy = json.load(f)
                        for key, val in _default_data().items():
                            legacy.setdefault(key, val)
                        self._save(legacy)
                        return legacy
            except Exception as exc:
                print(f'Error reading database file, initializing fresh store: {exc}')

            fresh = _default_data()
            self._save(fresh)
            return fresh

    def _save(self, data_to_save: Optional[Dict[str, Any]] = None) -> None:
        with self._lock:
            try:
                self._ensure_directory()
                payload = data_to_save if data_to_save is not None else self.data
                tmp_file = DB_FILE + '.tmp'
                with open(tmp_file, 'w', encoding='utf-8') as f:
                    json.dump(payload, f, indent=2, ensure_ascii=False)
                os.replace(tmp_file, DB_FILE)
            except Exception as exc:
                print(f'Failed to write to database: {exc}')

    # --- Users ---
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return next((u for u in self.data['users'] if u.get('id') == user_id), None)

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        target = (email or '').strip().lower()
        with self._lock:
            return next((u for u in self.data['users'] if (u.get('email') or '').lower() == target), None)

    def get_all_users(self) -> List[Dict[str, Any]]:
        with self._lock:
            return list(self.data['users'])

    def create_user(self, user: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            self.data['users'].append(user)
            self._save()
            return user

    def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        with self._lock:
            for idx, u in enumerate(self.data['users']):
                if u.get('id') == user_id:
                    updated = {**u, **updates, 'updated_at': _now_iso()}
                    self.data['users'][idx] = updated
                    self._save()
                    return updated
            return None

    def delete_user(self, user_id: str) -> bool:
        with self._lock:
            prev_len = len(self.data['users'])
            self.data['users'] = [u for u in self.data['users'] if u.get('id') != user_id]
            for table in (
                'journal_entries',
                'memories',
                'memory_photos',
                'tasks',
                'schedules',
                'mood_entries',
                'notes',
                'settings',
            ):
                self.data[table] = [item for item in self.data[table] if item.get('user_id') != user_id]
            self._save()
            return len(self.data['users']) < prev_len

    # --- Settings ---
    def get_settings(self, user_id: str) -> Dict[str, Any]:
        with self._lock:
            setting = next((s for s in self.data['settings'] if s.get('user_id') == user_id), None)
            if not setting:
                setting = {
                    'id': _rand_id('set_'),
                    'user_id': user_id,
                    'theme': 'warm-sunrise',
                    'font_family': 'sans',
                    'font_size': 'medium',
                    'accent_color': '#E07A5F',
                    'dark_mode': False,
                    'onboarding_completed': False,
                    'primary_interests': ['journal', 'mood', 'tasks', 'memories'],
                }
                self.data['settings'].append(setting)
                self._save()
            return setting

    def update_settings(self, user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            setting = self.get_settings(user_id)
            for k, v in updates.items():
                if k not in ('id', 'user_id'):
                    setting[k] = v
            self._save()
            return setting

    # --- Journal Entries ---
    def get_journal_entries(self, user_id: str) -> List[Dict[str, Any]]:
        with self._lock:
            entries = [j for j in self.data['journal_entries'] if j.get('user_id') == user_id]
            entries.sort(key=lambda x: (x.get('entry_date') or '', x.get('updated_at') or ''), reverse=True)
            return entries

    def get_journal_entry_by_id(self, entry_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return next(
                (j for j in self.data['journal_entries'] if j.get('id') == entry_id and j.get('user_id') == user_id),
                None,
            )

    def create_journal_entry(self, entry: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            self.data['journal_entries'].append(entry)
            self._save()
            return entry

    def update_journal_entry(
        self, entry_id: str, user_id: str, updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        with self._lock:
            for idx, j in enumerate(self.data['journal_entries']):
                if j.get('id') == entry_id and j.get('user_id') == user_id:
                    updated = {**j, **updates, 'updated_at': _now_iso()}
                    self.data['journal_entries'][idx] = updated
                    self._save()
                    return updated
            return None

    def delete_journal_entry(self, entry_id: str, user_id: str) -> bool:
        with self._lock:
            prev_len = len(self.data['journal_entries'])
            self.data['journal_entries'] = [
                j for j in self.data['journal_entries'] if not (j.get('id') == entry_id and j.get('user_id') == user_id)
            ]
            self._save()
            return len(self.data['journal_entries']) < prev_len

    # --- Memories & Photos ---
    def get_memories(self, user_id: str) -> List[Dict[str, Any]]:
        with self._lock:
            mem_list = [m for m in self.data['memories'] if m.get('user_id') == user_id]
            mem_list.sort(key=lambda x: x.get('memory_date') or '', reverse=True)
            return [
                {
                    **m,
                    'photos': [
                        p
                        for p in self.data['memory_photos']
                        if p.get('memory_id') == m.get('id') and p.get('user_id') == user_id
                    ],
                }
                for m in mem_list
            ]

    def get_memory_by_id(self, memory_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            mem = next(
                (m for m in self.data['memories'] if m.get('id') == memory_id and m.get('user_id') == user_id),
                None,
            )
            if not mem:
                return None
            return {
                **mem,
                'photos': [
                    p
                    for p in self.data['memory_photos']
                    if p.get('memory_id') == mem.get('id') and p.get('user_id') == user_id
                ],
            }

    def create_memory(self, memory: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            self.data['memories'].append(memory)
            self._save()
            return memory

    def update_memory(
        self, memory_id: str, user_id: str, updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        with self._lock:
            for idx, m in enumerate(self.data['memories']):
                if m.get('id') == memory_id and m.get('user_id') == user_id:
                    updated = {**m, **updates}
                    self.data['memories'][idx] = updated
                    self._save()
                    return updated
            return None

    def delete_memory(self, memory_id: str, user_id: str) -> bool:
        with self._lock:
            prev_len = len(self.data['memories'])
            self.data['memories'] = [
                m for m in self.data['memories'] if not (m.get('id') == memory_id and m.get('user_id') == user_id)
            ]
            self.data['memory_photos'] = [
                p
                for p in self.data['memory_photos']
                if not (p.get('memory_id') == memory_id and p.get('user_id') == user_id)
            ]
            self._save()
            return len(self.data['memories']) < prev_len

    def add_memory_photo(self, photo: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            self.data['memory_photos'].append(photo)
            self._save()
            return photo

    def delete_memory_photo(self, photo_id: str, user_id: str) -> bool:
        with self._lock:
            prev_len = len(self.data['memory_photos'])
            self.data['memory_photos'] = [
                p
                for p in self.data['memory_photos']
                if not (p.get('id') == photo_id and p.get('user_id') == user_id)
            ]
            self._save()
            return len(self.data['memory_photos']) < prev_len

    # --- Tasks ---
    def get_tasks(self, user_id: str) -> List[Dict[str, Any]]:
        with self._lock:
            tasks = [t for t in self.data['tasks'] if t.get('user_id') == user_id]
            tasks.sort(key=lambda x: x.get('created_at') or '', reverse=True)
            return tasks

    def create_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            self.data['tasks'].append(task)
            self._save()
            return task

    def update_task(self, task_id: str, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        with self._lock:
            for idx, t in enumerate(self.data['tasks']):
                if t.get('id') == task_id and t.get('user_id') == user_id:
                    updated = {**t, **updates}
                    self.data['tasks'][idx] = updated
                    self._save()
                    return updated
            return None

    def delete_task(self, task_id: str, user_id: str) -> bool:
        with self._lock:
            prev_len = len(self.data['tasks'])
            self.data['tasks'] = [
                t for t in self.data['tasks'] if not (t.get('id') == task_id and t.get('user_id') == user_id)
            ]
            self._save()
            return len(self.data['tasks']) < prev_len

    # --- Schedules ---
    def get_schedules(self, user_id: str) -> List[Dict[str, Any]]:
        with self._lock:
            schedules = [s for s in self.data['schedules'] if s.get('user_id') == user_id]
            schedules.sort(key=lambda x: (x.get('date') or '', x.get('start_time') or ''))
            return schedules

    def create_schedule(self, schedule: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            self.data['schedules'].append(schedule)
            self._save()
            return schedule

    def update_schedule(
        self, schedule_id: str, user_id: str, updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        with self._lock:
            for idx, s in enumerate(self.data['schedules']):
                if s.get('id') == schedule_id and s.get('user_id') == user_id:
                    updated = {**s, **updates}
                    self.data['schedules'][idx] = updated
                    self._save()
                    return updated
            return None

    def delete_schedule(self, schedule_id: str, user_id: str) -> bool:
        with self._lock:
            prev_len = len(self.data['schedules'])
            self.data['schedules'] = [
                s for s in self.data['schedules'] if not (s.get('id') == schedule_id and s.get('user_id') == user_id)
            ]
            self._save()
            return len(self.data['schedules']) < prev_len

    # --- Moods ---
    def get_mood_entries(self, user_id: str) -> List[Dict[str, Any]]:
        with self._lock:
            moods = [m for m in self.data['mood_entries'] if m.get('user_id') == user_id]
            moods.sort(key=lambda x: (x.get('date') or '', x.get('created_at') or ''), reverse=True)
            return moods

    def create_mood_entry(self, entry: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            self.data['mood_entries'].append(entry)
            self._save()
            return entry

    def delete_mood_entry(self, mood_id: str, user_id: str) -> bool:
        with self._lock:
            prev_len = len(self.data['mood_entries'])
            self.data['mood_entries'] = [
                m for m in self.data['mood_entries'] if not (m.get('id') == mood_id and m.get('user_id') == user_id)
            ]
            self._save()
            return len(self.data['mood_entries']) < prev_len

    # --- Important Notes ---
    def get_notes(self, user_id: str) -> List[Dict[str, Any]]:
        with self._lock:
            notes = [n for n in self.data['notes'] if n.get('user_id') == user_id]
            notes.sort(key=lambda x: (bool(x.get('is_pinned')), x.get('created_at') or ''), reverse=True)
            return notes

    def create_note(self, note: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            self.data['notes'].append(note)
            self._save()
            return note

    def update_note(self, note_id: str, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        with self._lock:
            for idx, n in enumerate(self.data['notes']):
                if n.get('id') == note_id and n.get('user_id') == user_id:
                    updated = {**n, **updates}
                    self.data['notes'][idx] = updated
                    self._save()
                    return updated
            return None

    def delete_note(self, note_id: str, user_id: str) -> bool:
        with self._lock:
            prev_len = len(self.data['notes'])
            self.data['notes'] = [
                n for n in self.data['notes'] if not (n.get('id') == note_id and n.get('user_id') == user_id)
            ]
            self._save()
            return len(self.data['notes']) < prev_len

    # --- Full Export ---
    def get_user_export_data(self, user_id: str) -> Optional[Dict[str, Any]]:
        user = self.get_user_by_id(user_id)
        if not user:
            return None
        safe_user = {k: v for k, v in user.items() if k != 'password_hash'}
        return {
            'user': safe_user,
            'settings': self.get_settings(user_id),
            'journal_entries': self.get_journal_entries(user_id),
            'memories': self.get_memories(user_id),
            'tasks': self.get_tasks(user_id),
            'schedules': self.get_schedules(user_id),
            'mood_entries': self.get_mood_entries(user_id),
            'notes': self.get_notes(user_id),
            'exported_at': _now_iso(),
        }

    # --- Global Search ---
    def global_search(self, user_id: str, query: str) -> Dict[str, List[Dict[str, Any]]]:
        q = (query or '').lower().strip()
        if not q:
            return {'journals': [], 'memories': [], 'tasks': [], 'notes': []}

        journals = [
            j
            for j in self.data['journal_entries']
            if j.get('user_id') == user_id
            and (q in (j.get('title') or '').lower() or q in (j.get('content') or '').lower())
        ][:10]

        memories = [
            m
            for m in self.data['memories']
            if m.get('user_id') == user_id
            and (
                q in (m.get('title') or '').lower()
                or q in (m.get('description') or '').lower()
                or q in (m.get('location') or '').lower()
            )
        ][:10]

        tasks = [
            t
            for t in self.data['tasks']
            if t.get('user_id') == user_id
            and (q in (t.get('title') or '').lower() or q in (t.get('description') or '').lower())
        ][:10]

        notes = [
            n
            for n in self.data['notes']
            if n.get('user_id') == user_id
            and (q in (n.get('title') or '').lower() or q in (n.get('content') or '').lower())
        ][:10]

        return {'journals': journals, 'memories': memories, 'tasks': tasks, 'notes': notes}

    # --- Seed Starter Data ---
    def seed_starter_data(self, user_id: str, user_name: str) -> None:
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime('%Y-%m-%d')
        now = _now_iso()

        self.create_journal_entry({
            'id': _rand_id('j_welcome_'),
            'user_id': user_id,
            'title': 'Welcome to your private sanctuary 🌸',
            'content': (
                'Dear Diary,\n\n'
                'Today marks the beginning of my journey with BORAH. A quiet corner just for my thoughts, memories, and daily steps.\n\n'
                'I want to focus on small daily reflections, staying mindful, and celebrating progress—no matter how small. Everything written here is completely mine, safe and peaceful.'
            ),
            'mood': 'happy',
            'emotion': 'Grateful & Inspired',
            'entry_date': today,
            'created_at': now,
            'updated_at': now,
            'is_favorite': True,
            'is_private': True,
            'font_family': 'serif',
            'text_color': '#4A3E3D',
            'stickers': [
                {'id': 'st_1', 'sticker_type': '🌸', 'x': 20, 'y': 15},
                {'id': 'st_2', 'sticker_type': '✨', 'x': 80, 'y': 25},
            ],
        })

        self.create_memory({
            'id': _rand_id('m_sample_'),
            'user_id': user_id,
            'title': 'Autumn Campus Walk & Cozy Coffee',
            'description': 'Golden maple leaves falling across the university courtyard. Took an hour to read by the window with a warm hazelnut latte.',
            'memory_date': yesterday,
            'location': 'Central Library Courtyard',
            'cover_image': 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
            'is_favorite': True,
            'created_at': now,
        })

        self.create_task({
            'id': _rand_id('t_1_'),
            'user_id': user_id,
            'title': 'Review MSc project literature notes',
            'description': 'Summarize key findings from 3 recent papers',
            'priority': 'high',
            'category': 'study',
            'due_date': today,
            'due_time': '14:00',
            'completed': True,
            'created_at': now,
        })

        self.create_task({
            'id': _rand_id('t_2_'),
            'user_id': user_id,
            'title': '15-minute afternoon stretch & mindfulness walk',
            'description': 'Step outside away from screens',
            'priority': 'medium',
            'category': 'health',
            'due_date': today,
            'due_time': '17:00',
            'completed': False,
            'created_at': now,
        })

        self.create_task({
            'id': _rand_id('t_3_'),
            'user_id': user_id,
            'title': 'Reflect and write evening entry in BORAH',
            'description': 'Write about three things that went well today',
            'priority': 'low',
            'category': 'personal',
            'due_date': today,
            'due_time': '21:30',
            'completed': False,
            'created_at': now,
        })

        self.create_schedule({
            'id': _rand_id('s_1_'),
            'user_id': user_id,
            'title': 'AI & Data Systems Seminar',
            'description': 'Lecture Hall B — Topic: Secure Federated Analytics',
            'date': today,
            'start_time': '10:00',
            'end_time': '11:30',
            'category': 'study',
            'reminder_enabled': True,
        })

        self.create_schedule({
            'id': _rand_id('s_2_'),
            'user_id': user_id,
            'title': 'Team Project Sync',
            'description': 'Discuss architecture milestones and documentation',
            'date': today,
            'start_time': '15:00',
            'end_time': '16:00',
            'category': 'work',
            'reminder_enabled': True,
        })

        self.create_note({
            'id': _rand_id('n_1_'),
            'user_id': user_id,
            'title': 'Quiet Reminders for Busy Days 🌿',
            'content': (
                '1. Breathe deeply along your tasks.\n'
                '2. Progress in small steady steps counts as real progress.\n'
                '3. Keep your personal thoughts private and honored.'
            ),
            'priority': 'high',
            'is_pinned': True,
            'color': '#FEF3C7',
            'created_at': now,
        })

        self.create_mood_entry({
            'id': _rand_id('md_1_'),
            'user_id': user_id,
            'mood': 'calm',
            'intensity': 8,
            'note': 'Feeling centered and ready to make progress on my plans.',
            'date': today,
            'created_at': now,
        })


db = BorahDatabase()

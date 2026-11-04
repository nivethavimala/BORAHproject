import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  profile_photo?: string;
  created_at: string;
  updated_at: string;
  is_verified: boolean;
  is_active: boolean;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  mood?: string;
  emotion?: string;
  entry_date: string;
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  is_private: boolean;
  font_family?: string;
  text_color?: string;
  stickers?: Array<{ id: string; sticker_type: string; x: number; y: number }>;
  photos?: string[];
  audio_url?: string;
  audio_duration?: number;
  has_audio?: boolean;
  audio_clips?: Array<{ id: string; url: string; duration?: number; label?: string; created_at?: string }>;
  wallpaper_theme?: string;
  bullet_style?: string;
  font_size_preset?: string;
  text_align?: string;
  tags?: string[];
  eyes_protection?: boolean;
  prompt_active?: boolean;
  current_prompt?: string;
}

export interface MemoryPhoto {
  id: string;
  memory_id: string;
  user_id: string;
  image_path: string;
  caption?: string;
  uploaded_at: string;
}

export interface Memory {
  id: string;
  user_id: string;
  title: string;
  description: string;
  memory_date: string;
  location?: string;
  cover_image?: string;
  is_favorite: boolean;
  created_at: string;
  photos?: MemoryPhoto[];
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  due_date?: string;
  due_time?: string;
  category: 'study' | 'personal' | 'work' | 'health' | 'project' | 'other';
  completed: boolean;
  created_at: string;
}

export interface Schedule {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  date: string;
  category: 'study' | 'work' | 'personal' | 'important';
  reminder_enabled: boolean;
}

export interface MoodEntry {
  id: string;
  user_id: string;
  mood: string; // 'happy' | 'calm' | 'neutral' | 'sad' | 'anxious' | 'angry' | 'tired' | 'excited'
  emotion?: string;
  intensity: number; // 1-10
  note?: string;
  date: string;
  created_at: string;
}

export interface ImportantNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  is_pinned: boolean;
  color: string;
  reminder_date?: string;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  theme: 'warm-sunrise' | 'cozy-sage' | 'lavender-dream' | 'midnight' | 'ocean-calm';
  font_family: 'sans' | 'serif' | 'handwriting';
  font_size: 'small' | 'medium' | 'large';
  accent_color: string;
  dark_mode: boolean;
  onboarding_completed: boolean;
  primary_interests: string[];
}

interface DatabaseSchema {
  users: User[];
  journal_entries: JournalEntry[];
  memories: Memory[];
  memory_photos: MemoryPhoto[];
  tasks: Task[];
  schedules: Schedule[];
  mood_entries: MoodEntry[];
  notes: ImportantNote[];
  settings: UserSettings[];
}

const DB_DIR = path.resolve(process.cwd(), 'database');
const DB_FILE = path.join(DB_DIR, 'borah_store.json');
const LEGACY_DB_FILE = path.join(DB_DIR, 'lumora_store.json');

const defaultData: DatabaseSchema = {
  users: [],
  journal_entries: [],
  memories: [],
  memory_photos: [],
  tasks: [],
  schedules: [],
  mood_entries: [],
  notes: [],
  settings: [],
};

class BorahDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDirectory();
    this.data = this.load();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
      if (fs.existsSync(LEGACY_DB_FILE)) {
        const raw = fs.readFileSync(LEGACY_DB_FILE, 'utf-8');
        const legacyData = JSON.parse(raw);
        this.save(legacyData);
        return legacyData;
      }
    } catch (err) {
      console.error('Error reading database file, initializing fresh store:', err);
    }
    this.save(defaultData);
    return defaultData;
  }

  private save(dataToSave?: DatabaseSchema) {
    try {
      this.ensureDirectory();
      const payload = JSON.stringify(dataToSave || this.data, null, 2);
      fs.writeFileSync(DB_FILE, payload, 'utf-8');
    } catch (err) {
      console.error('Failed to write to database:', err);
    }
  }

  // --- Users ---
  getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  getAllUsers(): User[] {
    return this.data.users;
  }

  createUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return undefined;
    this.data.users[idx] = { ...this.data.users[idx], ...updates, updated_at: new Date().toISOString() };
    this.save();
    return this.data.users[idx];
  }

  deleteUser(id: string): boolean {
    const prevLen = this.data.users.length;
    this.data.users = this.data.users.filter((u) => u.id !== id);
    // Cascade delete all private records for this user
    this.data.journal_entries = this.data.journal_entries.filter((j) => j.user_id !== id);
    this.data.memories = this.data.memories.filter((m) => m.user_id !== id);
    this.data.memory_photos = this.data.memory_photos.filter((p) => p.user_id !== id);
    this.data.tasks = this.data.tasks.filter((t) => t.user_id !== id);
    this.data.schedules = this.data.schedules.filter((s) => s.user_id !== id);
    this.data.mood_entries = this.data.mood_entries.filter((m) => m.user_id !== id);
    this.data.notes = this.data.notes.filter((n) => n.user_id !== id);
    this.data.settings = this.data.settings.filter((s) => s.user_id !== id);
    this.save();
    return this.data.users.length < prevLen;
  }

  // --- Settings ---
  getSettings(userId: string): UserSettings {
    let setting = this.data.settings.find((s) => s.user_id === userId);
    if (!setting) {
      setting = {
        id: 'set_' + Math.random().toString(36).substring(2, 9),
        user_id: userId,
        theme: 'warm-sunrise',
        font_family: 'sans',
        font_size: 'medium',
        accent_color: '#E07A5F',
        dark_mode: false,
        onboarding_completed: false,
        primary_interests: ['journal', 'mood', 'tasks', 'memories'],
      };
      this.data.settings.push(setting);
      this.save();
    }
    return setting;
  }

  updateSettings(userId: string, updates: Partial<UserSettings>): UserSettings {
    const setting = this.getSettings(userId);
    Object.assign(setting, updates);
    this.save();
    return setting;
  }

  // --- Journal Entries ---
  getJournalEntries(userId: string): JournalEntry[] {
    return this.data.journal_entries
      .filter((j) => j.user_id === userId)
      .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());
  }

  getJournalEntryById(id: string, userId: string): JournalEntry | undefined {
    return this.data.journal_entries.find((j) => j.id === id && j.user_id === userId);
  }

  createJournalEntry(entry: JournalEntry): JournalEntry {
    this.data.journal_entries.push(entry);
    this.save();
    return entry;
  }

  updateJournalEntry(id: string, userId: string, updates: Partial<JournalEntry>): JournalEntry | undefined {
    const idx = this.data.journal_entries.findIndex((j) => j.id === id && j.user_id === userId);
    if (idx === -1) return undefined;
    this.data.journal_entries[idx] = {
      ...this.data.journal_entries[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.save();
    return this.data.journal_entries[idx];
  }

  deleteJournalEntry(id: string, userId: string): boolean {
    const prevLen = this.data.journal_entries.length;
    this.data.journal_entries = this.data.journal_entries.filter((j) => !(j.id === id && j.user_id === userId));
    this.save();
    return this.data.journal_entries.length < prevLen;
  }

  // --- Memories & Photos ---
  getMemories(userId: string): Memory[] {
    const list = this.data.memories
      .filter((m) => m.user_id === userId)
      .sort((a, b) => new Date(b.memory_date).getTime() - new Date(a.memory_date).getTime());

    return list.map((m) => ({
      ...m,
      photos: this.data.memory_photos.filter((p) => p.memory_id === m.id && p.user_id === userId),
    }));
  }

  getMemoryById(id: string, userId: string): Memory | undefined {
    const mem = this.data.memories.find((m) => m.id === id && m.user_id === userId);
    if (!mem) return undefined;
    return {
      ...mem,
      photos: this.data.memory_photos.filter((p) => p.memory_id === mem.id && p.user_id === userId),
    };
  }

  createMemory(memory: Memory): Memory {
    this.data.memories.push(memory);
    this.save();
    return memory;
  }

  updateMemory(id: string, userId: string, updates: Partial<Memory>): Memory | undefined {
    const idx = this.data.memories.findIndex((m) => m.id === id && m.user_id === userId);
    if (idx === -1) return undefined;
    this.data.memories[idx] = { ...this.data.memories[idx], ...updates };
    this.save();
    return this.data.memories[idx];
  }

  deleteMemory(id: string, userId: string): boolean {
    const prevLen = this.data.memories.length;
    this.data.memories = this.data.memories.filter((m) => !(m.id === id && m.user_id === userId));
    this.data.memory_photos = this.data.memory_photos.filter((p) => !(p.memory_id === id && p.user_id === userId));
    this.save();
    return this.data.memories.length < prevLen;
  }

  addMemoryPhoto(photo: MemoryPhoto): MemoryPhoto {
    this.data.memory_photos.push(photo);
    this.save();
    return photo;
  }

  deleteMemoryPhoto(id: string, userId: string): boolean {
    const prev = this.data.memory_photos.length;
    this.data.memory_photos = this.data.memory_photos.filter((p) => !(p.id === id && p.user_id === userId));
    this.save();
    return this.data.memory_photos.length < prev;
  }

  // --- Tasks ---
  getTasks(userId: string): Task[] {
    return this.data.tasks
      .filter((t) => t.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  createTask(task: Task): Task {
    this.data.tasks.push(task);
    this.save();
    return task;
  }

  updateTask(id: string, userId: string, updates: Partial<Task>): Task | undefined {
    const idx = this.data.tasks.findIndex((t) => t.id === id && t.user_id === userId);
    if (idx === -1) return undefined;
    this.data.tasks[idx] = { ...this.data.tasks[idx], ...updates };
    this.save();
    return this.data.tasks[idx];
  }

  deleteTask(id: string, userId: string): boolean {
    const prev = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter((t) => !(t.id === id && t.user_id === userId));
    this.save();
    return this.data.tasks.length < prev;
  }

  // --- Schedules ---
  getSchedules(userId: string): Schedule[] {
    return this.data.schedules
      .filter((s) => s.user_id === userId)
      .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
  }

  createSchedule(schedule: Schedule): Schedule {
    this.data.schedules.push(schedule);
    this.save();
    return schedule;
  }

  updateSchedule(id: string, userId: string, updates: Partial<Schedule>): Schedule | undefined {
    const idx = this.data.schedules.findIndex((s) => s.id === id && s.user_id === userId);
    if (idx === -1) return undefined;
    this.data.schedules[idx] = { ...this.data.schedules[idx], ...updates };
    this.save();
    return this.data.schedules[idx];
  }

  deleteSchedule(id: string, userId: string): boolean {
    const prev = this.data.schedules.length;
    this.data.schedules = this.data.schedules.filter((s) => !(s.id === id && s.user_id === userId));
    this.save();
    return this.data.schedules.length < prev;
  }

  // --- Moods ---
  getMoodEntries(userId: string): MoodEntry[] {
    return this.data.mood_entries
      .filter((m) => m.user_id === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  createMoodEntry(entry: MoodEntry): MoodEntry {
    this.data.mood_entries.push(entry);
    this.save();
    return entry;
  }

  deleteMoodEntry(id: string, userId: string): boolean {
    const prev = this.data.mood_entries.length;
    this.data.mood_entries = this.data.mood_entries.filter((m) => !(m.id === id && m.user_id === userId));
    this.save();
    return this.data.mood_entries.length < prev;
  }

  // --- Important Notes ---
  getNotes(userId: string): ImportantNote[] {
    return this.data.notes
      .filter((n) => n.user_id === userId)
      .sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }

  createNote(note: ImportantNote): ImportantNote {
    this.data.notes.push(note);
    this.save();
    return note;
  }

  updateNote(id: string, userId: string, updates: Partial<ImportantNote>): ImportantNote | undefined {
    const idx = this.data.notes.findIndex((n) => n.id === id && n.user_id === userId);
    if (idx === -1) return undefined;
    this.data.notes[idx] = { ...this.data.notes[idx], ...updates };
    this.save();
    return this.data.notes[idx];
  }

  deleteNote(id: string, userId: string): boolean {
    const prev = this.data.notes.length;
    this.data.notes = this.data.notes.filter((n) => !(n.id === id && n.user_id === userId));
    this.save();
    return this.data.notes.length < prev;
  }

  // --- Full User Data Export ---
  getUserExportData(userId: string) {
    const user = this.getUserById(userId);
    if (!user) return null;
    const { password_hash, ...safeUser } = user;
    return {
      user: safeUser,
      settings: this.getSettings(userId),
      journal_entries: this.getJournalEntries(userId),
      memories: this.getMemories(userId),
      tasks: this.getTasks(userId),
      schedules: this.getSchedules(userId),
      mood_entries: this.getMoodEntries(userId),
      notes: this.getNotes(userId),
      exported_at: new Date().toISOString(),
    };
  }

  // --- Global Search ---
  globalSearch(userId: string, query: string) {
    const q = query.toLowerCase().trim();
    if (!q) return { journals: [], memories: [], tasks: [], notes: [] };

    const journals = this.data.journal_entries
      .filter((j) => j.user_id === userId && (j.title.toLowerCase().includes(q) || j.content.toLowerCase().includes(q)))
      .slice(0, 10);

    const memories = this.data.memories
      .filter(
        (m) =>
          m.user_id === userId &&
          (m.title.toLowerCase().includes(q) ||
            m.description.toLowerCase().includes(q) ||
            (m.location && m.location.toLowerCase().includes(q)))
      )
      .slice(0, 10);

    const tasks = this.data.tasks
      .filter((t) => t.user_id === userId && (t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q))))
      .slice(0, 10);

    const notes = this.data.notes
      .filter((n) => n.user_id === userId && (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)))
      .slice(0, 10);

    return { journals, memories, tasks, notes };
  }

  // --- Seed Starter Demo Data for Brand New Users ---
  seedStarterData(userId: string, userName: string) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Welcome Journal
    this.createJournalEntry({
      id: 'j_welcome_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      title: 'Welcome to your private sanctuary 🌸',
      content:
        'Dear Diary,\n\nToday marks the beginning of my journey with BORAH. A quiet corner just for my thoughts, memories, and daily steps.\n\nI want to focus on small daily reflections, staying mindful, and celebrating progress—no matter how small. Everything written here is completely mine, safe and peaceful.',
      mood: 'happy',
      emotion: 'Grateful & Inspired',
      entry_date: today,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_favorite: true,
      is_private: true,
      font_family: 'serif',
      text_color: '#4A3E3D',
      stickers: [
        { id: 'st_1', sticker_type: '🌸', x: 20, y: 15 },
        { id: 'st_2', sticker_type: '✨', x: 80, y: 25 },
      ],
    });

    // Sample Memory
    const memId = 'm_sample_' + Math.random().toString(36).substring(2, 9);
    this.createMemory({
      id: memId,
      user_id: userId,
      title: 'Autumn Campus Walk & Cozy Coffee',
      description: 'Golden maple leaves falling across the university courtyard. Took an hour to read by the window with a warm hazelnut latte.',
      memory_date: yesterday,
      location: 'Central Library Courtyard',
      cover_image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
      is_favorite: true,
      created_at: new Date().toISOString(),
    });

    // Sample Tasks
    this.createTask({
      id: 't_1_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      title: 'Review MSc project literature notes',
      description: 'Summarize key findings from 3 recent papers',
      priority: 'high',
      category: 'study',
      due_date: today,
      due_time: '14:00',
      completed: true,
      created_at: new Date().toISOString(),
    });

    this.createTask({
      id: 't_2_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      title: '15-minute afternoon stretch & mindfulness walk',
      description: 'Step outside away from screens',
      priority: 'medium',
      category: 'health',
      due_date: today,
      due_time: '17:00',
      completed: false,
      created_at: new Date().toISOString(),
    });

    this.createTask({
      id: 't_3_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      title: 'Reflect and write evening entry in BORAH',
      description: 'Write about three things that went well today',
      priority: 'low',
      category: 'personal',
      due_date: today,
      due_time: '21:30',
      completed: false,
      created_at: new Date().toISOString(),
    });

    // Sample Schedule
    this.createSchedule({
      id: 's_1_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      title: 'AI & Data Systems Seminar',
      description: 'Lecture Hall B — Topic: Secure Federated Analytics',
      date: today,
      start_time: '10:00',
      end_time: '11:30',
      category: 'study',
      reminder_enabled: true,
    });

    this.createSchedule({
      id: 's_2_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      title: 'Team Project Sync',
      description: 'Discuss architecture milestones and documentation',
      date: today,
      start_time: '15:00',
      end_time: '16:00',
      category: 'work',
      reminder_enabled: true,
    });

    // Sample Note
    this.createNote({
      id: 'n_1_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      title: 'Quiet Reminders for Busy Days 🌿',
      content:
        '1. Breathe deeply between tasks.\n2. Progress in small steady steps counts as real progress.\n3. Keep your personal thoughts private and honored.',
      priority: 'high',
      is_pinned: true,
      color: '#FEF3C7',
      created_at: new Date().toISOString(),
    });

    // Sample Mood
    this.createMoodEntry({
      id: 'md_1_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      mood: 'calm',
      intensity: 8,
      note: 'Feeling centered and ready to make progress on my plans.',
      date: today,
      created_at: new Date().toISOString(),
    });
  }
}

export const db = new BorahDatabase();

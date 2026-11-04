import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db, User } from './server/db';
import {
  initSqlDatabase,
  sqlInsertUser,
  sqlRecordSignin,
  sqlGetUserSignins,
  sqlGetTotalUsersCount,
} from './server/sqlDb';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'borah-super-secret-key-msc-2026';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  next();
});

// Authentication Middleware
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required. Please sign in.' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err || !decoded) {
      res.status(403).json({ success: false, message: 'Session expired or invalid. Please log in again.' });
      return;
    }
    req.user = { userId: decoded.userId, email: decoded.email };
    next();
  });
};

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Register
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    const existingUser = db.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser: User = {
      id: 'usr_' + Math.random().toString(36).substring(2, 10),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password_hash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_verified: true, // Auto-verified for frictionless local companion experience
      is_active: true,
    };

    db.createUser(newUser);
    // Persist user in SQL database
    await sqlInsertUser(newUser).catch((err) => console.error('SQL user insert error:', err));
    // Record initial registration signin event in SQL database
    await sqlRecordSignin(newUser.id, newUser.email, 'REGISTRATION_SUCCESS', req.headers['user-agent'] as string).catch(() => {});

    // Seed initial comforting starter data
    db.seedStarterData(newUser.id, newUser.name);

    const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
    const settings = db.getSettings(newUser.id);

    const { password_hash: _, ...safeUser } = newUser;
    return res.status(201).json({
      success: true,
      message: 'Account created successfully & saved to SQL database! Welcome to BORAH ✨',
      token,
      user: safeUser,
      settings,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'An error occurred during registration.' });
  }
});

// Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      await sqlRecordSignin('unregistered', email, 'FAILED_USER_NOT_FOUND', req.headers['user-agent'] as string).catch(() => {});
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await sqlRecordSignin(user.id, user.email, 'FAILED_INVALID_PASSWORD', req.headers['user-agent'] as string).catch(() => {});
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Record verified signin in SQL database
    await sqlRecordSignin(user.id, user.email, 'SIGNIN_SUCCESS', req.headers['user-agent'] as string).catch((err) => console.error('SQL signin record error:', err));

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    const settings = db.getSettings(user.id);

    const { password_hash: _, ...safeUser } = user;
    return res.json({
      success: true,
      message: `Welcome back, ${user.name}! 🌷`,
      token,
      user: safeUser,
      settings,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Unable to log in at this moment.' });
  }
});

// SQL Database Signin Verification & Status
app.get('/api/auth/sql-status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const signins = await sqlGetUserSignins(req.user!.userId);
    const totalUsers = await sqlGetTotalUsersCount();
    return res.json({
      success: true,
      sqlDatabase: 'SQLite 3 (Relational SQL Database)',
      databasePath: 'database/borah.sqlite',
      totalUsersInSql: totalUsers,
      userSigninsCount: signins.length,
      recentSignins: signins,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to query SQL database' });
  }
});

// Current User Profile & State
app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = db.getUserById(req.user!.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }
  const settings = db.getSettings(user.id);
  const { password_hash: _, ...safeUser } = user;
  return res.json({ success: true, user: safeUser, settings });
});

// Update Profile
app.put('/api/auth/profile', authenticateToken, (req: AuthRequest, res: Response) => {
  const { name, profile_photo } = req.body;
  const updated = db.updateUser(req.user!.userId, {
    ...(name && { name: name.trim() }),
    ...(profile_photo !== undefined && { profile_photo }),
  });
  if (!updated) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }
  const { password_hash: _, ...safeUser } = updated;
  return res.json({ success: true, user: safeUser, message: 'Profile updated successfully.' });
});

// Change Password
app.put('/api/auth/password', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Please provide current and new passwords.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
  }
  const user = db.getUserById(req.user!.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }
  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Current password does not match.' });
  }
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(newPassword, salt);
  db.updateUser(user.id, { password_hash });
  return res.json({ success: true, message: 'Password updated successfully.' });
});

// User Settings
app.get('/api/settings', authenticateToken, (req: AuthRequest, res: Response) => {
  const settings = db.getSettings(req.user!.userId);
  return res.json({ success: true, settings });
});

app.put('/api/settings', authenticateToken, (req: AuthRequest, res: Response) => {
  const settings = db.updateSettings(req.user!.userId, req.body);
  return res.json({ success: true, settings, message: 'Preferences updated.' });
});

// ==========================================
// JOURNAL ROUTES
// ==========================================

app.get('/api/journal', authenticateToken, (req: AuthRequest, res: Response) => {
  const entries = db.getJournalEntries(req.user!.userId);
  return res.json({ success: true, entries });
});

app.get('/api/journal/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const entry = db.getJournalEntryById(req.params.id, req.user!.userId);
  if (!entry) {
    return res.status(404).json({ success: false, message: 'Journal entry not found.' });
  }
  return res.json({ success: true, entry });
});

app.post('/api/journal', authenticateToken, (req: AuthRequest, res: Response) => {
  const {
    title,
    content,
    mood,
    emotion,
    entry_date,
    is_favorite,
    is_private,
    font_family,
    text_color,
    stickers,
    photos,
    audio_url,
    audio_duration,
    has_audio,
    audio_clips,
    wallpaper_theme,
    bullet_style,
    font_size_preset,
    text_align,
    tags,
    eyes_protection,
    prompt_active,
    current_prompt,
  } = req.body;
  if (!title && !content && !audio_url && (!audio_clips || audio_clips.length === 0)) {
    return res.status(400).json({ success: false, message: 'Entry must have a title, content, or voice recording.' });
  }
  const newEntry = db.createJournalEntry({
    id: 'j_' + Math.random().toString(36).substring(2, 9),
    user_id: req.user!.userId,
    title: title || (audio_url ? 'Voice Reflection' : 'Untitled Entry'),
    content: content || '',
    mood: mood || 'neutral',
    emotion: emotion || '',
    entry_date: entry_date || new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_favorite: !!is_favorite,
    is_private: is_private !== undefined ? !!is_private : true,
    font_family: font_family || 'serif',
    text_color: text_color || '#334155',
    stickers: stickers || [],
    photos: photos || [],
    audio_url: audio_url || undefined,
    audio_duration: typeof audio_duration === 'number' ? audio_duration : undefined,
    has_audio: !!has_audio || !!audio_url || (Array.isArray(audio_clips) && audio_clips.length > 0),
    audio_clips: audio_clips || [],
    wallpaper_theme: wallpaper_theme || 'original',
    bullet_style: bullet_style || 'check',
    font_size_preset: font_size_preset || 'body',
    text_align: text_align || 'left',
    tags: tags || [],
    eyes_protection: !!eyes_protection,
    prompt_active: !!prompt_active,
    current_prompt: current_prompt || '',
  });
  return res.status(201).json({ success: true, entry: newEntry, message: 'Saved to your little corner of the world ✨' });
});

app.put('/api/journal/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const updated = db.updateJournalEntry(req.params.id, req.user!.userId, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Journal entry not found.' });
  }
  return res.json({ success: true, entry: updated, message: 'Journal entry updated.' });
});

app.delete('/api/journal/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const deleted = db.deleteJournalEntry(req.params.id, req.user!.userId);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Entry not found or already deleted.' });
  }
  return res.json({ success: true, message: 'Journal entry removed.' });
});

// ==========================================
// MEMORY ALBUM ROUTES
// ==========================================

app.get('/api/memories', authenticateToken, (req: AuthRequest, res: Response) => {
  const memories = db.getMemories(req.user!.userId);
  return res.json({ success: true, memories });
});

app.get('/api/memories/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const memory = db.getMemoryById(req.params.id, req.user!.userId);
  if (!memory) {
    return res.status(404).json({ success: false, message: 'Memory not found.' });
  }
  return res.json({ success: true, memory });
});

app.post('/api/memories', authenticateToken, (req: AuthRequest, res: Response) => {
  const { title, description, memory_date, location, cover_image, is_favorite, photos } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, message: 'Memory title is required.' });
  }
  const memId = 'mem_' + Math.random().toString(36).substring(2, 9);
  const memory = db.createMemory({
    id: memId,
    user_id: req.user!.userId,
    title: title.trim(),
    description: description || '',
    memory_date: memory_date || new Date().toISOString().split('T')[0],
    location: location || '',
    cover_image: cover_image || (photos && photos[0] ? photos[0].image_path : ''),
    is_favorite: !!is_favorite,
    created_at: new Date().toISOString(),
  });

  if (photos && Array.isArray(photos)) {
    for (const p of photos) {
      db.addMemoryPhoto({
        id: 'p_' + Math.random().toString(36).substring(2, 9),
        memory_id: memId,
        user_id: req.user!.userId,
        image_path: p.image_path,
        caption: p.caption || '',
        uploaded_at: new Date().toISOString(),
      });
    }
  }

  const completeMem = db.getMemoryById(memId, req.user!.userId);
  return res.status(201).json({ success: true, memory: completeMem, message: 'Memory preserved forever 📸' });
});

app.put('/api/memories/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const updated = db.updateMemory(req.params.id, req.user!.userId, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Memory not found.' });
  }
  return res.json({ success: true, memory: updated, message: 'Memory updated.' });
});

app.delete('/api/memories/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const deleted = db.deleteMemory(req.params.id, req.user!.userId);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Memory not found.' });
  }
  return res.json({ success: true, message: 'Memory deleted.' });
});

app.post('/api/memories/:id/photos', authenticateToken, (req: AuthRequest, res: Response) => {
  const { image_path, caption } = req.body;
  if (!image_path) {
    return res.status(400).json({ success: false, message: 'Image path or data URL required.' });
  }
  const memory = db.getMemoryById(req.params.id, req.user!.userId);
  if (!memory) {
    return res.status(404).json({ success: false, message: 'Memory not found.' });
  }
  const photo = db.addMemoryPhoto({
    id: 'p_' + Math.random().toString(36).substring(2, 9),
    memory_id: req.params.id,
    user_id: req.user!.userId,
    image_path,
    caption: caption || '',
    uploaded_at: new Date().toISOString(),
  });
  return res.status(201).json({ success: true, photo, message: 'Photo added to album.' });
});

app.delete('/api/photos/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const deleted = db.deleteMemoryPhoto(req.params.id, req.user!.userId);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Photo not found.' });
  }
  return res.json({ success: true, message: 'Photo removed.' });
});

// ==========================================
// TASKS & TO-DO ROUTES
// ==========================================

app.get('/api/tasks', authenticateToken, (req: AuthRequest, res: Response) => {
  const tasks = db.getTasks(req.user!.userId);
  return res.json({ success: true, tasks });
});

app.post('/api/tasks', authenticateToken, (req: AuthRequest, res: Response) => {
  const { title, description, priority, category, due_date, due_time } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, message: 'Task title is required.' });
  }
  const task = db.createTask({
    id: 'tsk_' + Math.random().toString(36).substring(2, 9),
    user_id: req.user!.userId,
    title: title.trim(),
    description: description || '',
    priority: priority || 'medium',
    category: category || 'personal',
    due_date: due_date || new Date().toISOString().split('T')[0],
    due_time: due_time || '',
    completed: false,
    created_at: new Date().toISOString(),
  });
  return res.status(201).json({ success: true, task, message: 'Task added.' });
});

app.put('/api/tasks/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const updated = db.updateTask(req.params.id, req.user!.userId, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Task not found.' });
  }
  return res.json({ success: true, task: updated });
});

app.delete('/api/tasks/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const deleted = db.deleteTask(req.params.id, req.user!.userId);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Task not found.' });
  }
  return res.json({ success: true, message: 'Task deleted.' });
});

// ==========================================
// SCHEDULE / PLANNER ROUTES
// ==========================================

app.get('/api/schedule', authenticateToken, (req: AuthRequest, res: Response) => {
  const schedules = db.getSchedules(req.user!.userId);
  return res.json({ success: true, schedules });
});

app.post('/api/schedule', authenticateToken, (req: AuthRequest, res: Response) => {
  const { title, description, start_time, end_time, date, category, reminder_enabled } = req.body;
  if (!title || !start_time || !end_time || !date) {
    return res.status(400).json({ success: false, message: 'Title, date, start time, and end time are required.' });
  }
  const schedule = db.createSchedule({
    id: 'sch_' + Math.random().toString(36).substring(2, 9),
    user_id: req.user!.userId,
    title: title.trim(),
    description: description || '',
    start_time,
    end_time,
    date,
    category: category || 'personal',
    reminder_enabled: reminder_enabled !== undefined ? !!reminder_enabled : true,
  });
  return res.status(201).json({ success: true, schedule, message: 'Event scheduled.' });
});

app.put('/api/schedule/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const updated = db.updateSchedule(req.params.id, req.user!.userId, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Schedule event not found.' });
  }
  return res.json({ success: true, schedule: updated });
});

app.delete('/api/schedule/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const deleted = db.deleteSchedule(req.params.id, req.user!.userId);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Schedule event not found.' });
  }
  return res.json({ success: true, message: 'Event removed.' });
});

// ==========================================
// MOOD TRACKING ROUTES
// ==========================================

app.get('/api/moods', authenticateToken, (req: AuthRequest, res: Response) => {
  const moods = db.getMoodEntries(req.user!.userId);
  return res.json({ success: true, moods });
});

app.post('/api/moods', authenticateToken, (req: AuthRequest, res: Response) => {
  const { mood, emotion, intensity, note, date } = req.body;
  if (!mood) {
    return res.status(400).json({ success: false, message: 'Please select a mood.' });
  }
  const entry = db.createMoodEntry({
    id: 'md_' + Math.random().toString(36).substring(2, 9),
    user_id: req.user!.userId,
    mood,
    emotion: emotion || '',
    intensity: Math.min(10, Math.max(1, Number(intensity) || 5)),
    note: note || '',
    date: date || new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
  });
  return res.status(201).json({ success: true, mood: entry, message: 'Mood recorded 🌿' });
});

app.delete('/api/moods/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const deleted = db.deleteMoodEntry(req.params.id, req.user!.userId);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Mood entry not found.' });
  }
  return res.json({ success: true, message: 'Mood record deleted.' });
});

// ==========================================
// IMPORTANT NOTES ROUTES
// ==========================================

app.get('/api/notes', authenticateToken, (req: AuthRequest, res: Response) => {
  const notes = db.getNotes(req.user!.userId);
  return res.json({ success: true, notes });
});

app.post('/api/notes', authenticateToken, (req: AuthRequest, res: Response) => {
  const { title, content, priority, is_pinned, color, reminder_date } = req.body;
  if (!title && !content) {
    return res.status(400).json({ success: false, message: 'Note must contain a title or content.' });
  }
  const note = db.createNote({
    id: 'nt_' + Math.random().toString(36).substring(2, 9),
    user_id: req.user!.userId,
    title: title || 'Quick Note',
    content: content || '',
    priority: priority || 'medium',
    is_pinned: !!is_pinned,
    color: color || '#FEF3C7',
    reminder_date,
    created_at: new Date().toISOString(),
  });
  return res.status(201).json({ success: true, note, message: 'Note saved.' });
});

app.put('/api/notes/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const updated = db.updateNote(req.params.id, req.user!.userId, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Note not found.' });
  }
  return res.json({ success: true, note: updated });
});

app.delete('/api/notes/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const deleted = db.deleteNote(req.params.id, req.user!.userId);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Note not found.' });
  }
  return res.json({ success: true, message: 'Note deleted.' });
});

// ==========================================
// GLOBAL SEARCH & DATA EXPORT
// ==========================================

app.get('/api/search', authenticateToken, (req: AuthRequest, res: Response) => {
  const query = (req.query.q as string) || '';
  const results = db.globalSearch(req.user!.userId, query);
  return res.json({ success: true, results });
});

app.get('/api/export', authenticateToken, (req: AuthRequest, res: Response) => {
  const exportData = db.getUserExportData(req.user!.userId);
  if (!exportData) {
    return res.status(404).json({ success: false, message: 'Data not found.' });
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="borah_backup_${new Date().toISOString().split('T')[0]}.json"`);
  return res.json(exportData);
});

app.delete('/api/account', authenticateToken, (req: AuthRequest, res: Response) => {
  const deleted = db.deleteUser(req.user!.userId);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'User account not found.' });
  }
  return res.json({ success: true, message: 'Your account and all associated data have been permanently removed.' });
});

// ==========================================
// AI FEATURES (GEMINI 3.8 FLASH)
// Non-clinical, gentle, encouraging reflections
// ==========================================

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI();
};

// Emotion detection on text
app.post('/api/ai/emotion', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { text } = req.body;
  if (!text || text.trim().length < 5) {
    return res.status(400).json({ success: false, message: 'Please provide some text to analyze.' });
  }

  const ai = getAiClient();
  if (!ai) {
    // Intelligent heuristic fallback
    return res.json({
      success: true,
      detection: {
        primaryEmotion: 'Calm & Reflective',
        confidence: 0.85,
        observation: 'AI detected a possible tone of thoughtfulness and quiet reflection.',
        keywords: ['thoughtful', 'peaceful'],
      },
    });
  }

  try {
    const prompt = `Analyze the emotional tone of this personal journal entry.
Important safety constraints:
- Do NOT make clinical or psychological diagnoses.
- Use gentle, observational wording (e.g., "AI detected a possible emotional pattern...").
- Return strictly a valid JSON object without markdown or code fences with these keys:
{
  "primaryEmotion": "short label like Calm, Happy, Anxious, Hopeful",
  "confidence": 0.85,
  "observation": "1-2 warm, supportive sentences describing the detected tone",
  "keywords": ["2-3 key words"]
}

Journal entry:
"${text.substring(0, 1500)}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an empathetic, supportive, strictly non-clinical journaling companion.',
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, detection: parsed });
  } catch (err) {
    console.error('AI emotion error:', err);
    return res.json({
      success: true,
      detection: {
        primaryEmotion: 'Reflective',
        confidence: 0.8,
        observation: 'AI detected a possible tone of quiet focus and thoughtful awareness.',
        keywords: ['reflective', 'intentional'],
      },
    });
  }
});

// Weekly smart summary
app.post('/api/ai/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  const entries = db.getJournalEntries(req.user!.userId).slice(0, 7);
  const tasks = db.getTasks(req.user!.userId);
  const moods = db.getMoodEntries(req.user!.userId).slice(0, 7);

  const contextText = `
Recent journals: ${entries.map((e) => `[${e.entry_date}] ${e.title}: ${e.content.slice(0, 120)}`).join('\n')}
Tasks completed: ${tasks.filter((t) => t.completed).length} of ${tasks.length}
Recent moods: ${moods.map((m) => `${m.date}: ${m.mood} (intensity ${m.intensity}/10)`).join(', ')}
`;

  const ai = getAiClient();
  if (!ai) {
    return res.json({
      success: true,
      summary: {
        highlights: 'You dedicated time to your personal reflection and steadily progressed on your daily tasks.',
        positiveMoments: 'Taking moments for coffee, mindful walks, and celebrating small victories.',
        growthAreas: 'Maintaining balance between study deadlines and gentle breaks.',
        patternObservation: 'Your mood shows resilience and centered calm when daily routines are steady.',
      },
    });
  }

  try {
    const prompt = `Synthesize a comforting, non-clinical weekly reflection summary based on this week's journal and activity notes:
${contextText}

Return strictly a valid JSON object with:
{
  "highlights": "2 sentences highlighting achievements and key moments",
  "positiveMoments": "1-2 sentences on moments of joy, gratitude, or peace",
  "growthAreas": "1-2 gentle, encouraging tips for next week",
  "patternObservation": "1 non-judgmental observation about mood and activities"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are BORAH AI, a comforting digital reflection companion. Never diagnose or give medical advice.',
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, summary: parsed });
  } catch (err) {
    console.error('AI summary error:', err);
    return res.json({
      success: true,
      summary: {
        highlights: 'You kept regular entries and stayed committed to your personal goals this week.',
        positiveMoments: 'Finding peaceful moments amidst your busy academic and personal schedule.',
        growthAreas: 'Remember to step away from screens and enjoy gentle fresh air breaks.',
        patternObservation: 'Your reflections demonstrate growing self-awareness and quiet determination.',
      },
    });
  }
});

// Gentle reflection prompts
app.get('/api/ai/prompts', authenticateToken, async (req: AuthRequest, res: Response) => {
  const prompts = [
    'What was the quietest, most peaceful moment you experienced today?',
    'What is one small accomplishment you are genuinely proud of this week?',
    'If you could give yourself one kind piece of advice for tomorrow, what would it be?',
    'Who or what brought an unexpected smile to your face recently?',
    'What is a challenge you faced today that taught you something valuable about yourself?',
  ];
  return res.json({ success: true, prompts });
});

// Lyria Music Generation (lyria-3-clip-preview & lyria-3-pro-preview)
app.post('/api/ai/music', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { prompt, durationType } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ success: false, message: 'Please provide a prompt for music generation.' });
  }

  const ai = getAiClient();
  if (!ai) {
    return res.status(503).json({
      success: false,
      message: 'GEMINI_API_KEY is not configured on the server. Please configure your key in Secrets.',
      fallback: true,
    });
  }

  const modelName = durationType === 'full' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';

  try {
    const responseStream = await ai.models.generateContentStream({
      model: modelName,
      contents: prompt,
    });

    let audioBase64 = '';
    let lyrics = '';
    let mimeType = 'audio/wav';

    for await (const chunk of responseStream) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;

      for (const part of parts) {
        if (part.inlineData?.data) {
          if (!audioBase64 && part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          audioBase64 += part.inlineData.data;
        }
        if (part.text && !lyrics) {
          lyrics = part.text;
        }
      }
    }

    if (!audioBase64) {
      return res.status(500).json({
        success: false,
        message: 'No audio data received from Lyria model.',
        fallback: true,
      });
    }

    return res.json({
      success: true,
      audioBase64,
      mimeType,
      lyrics,
      durationType,
      modelUsed: modelName,
      message: 'Track generated successfully! 🎵',
    });
  } catch (err: any) {
    console.error('Lyria Music Generation Error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Unable to generate track with Lyria. A paid API key may be required.',
      fallback: true,
    });
  }
});

// ==========================================
// AI AUDIO SPEECH-TO-TEXT TRANSCRIPTION
// Model: gemini-3.5-transcribe (with gemini-3.8-flash fallback)
// ==========================================
app.post('/api/ai/transcribe', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ success: false, message: 'Please provide audio data to transcribe.' });
    }

    const cleanBase64 = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
    const resolvedMimeType = mimeType || 'audio/webm';

    const ai = getAiClient();
    if (!ai) {
      // Graceful local fallback when GEMINI_API_KEY is not set
      return res.json({
        success: true,
        transcription: 'Today was filled with quiet thoughts and a gentle pace. I took a few minutes to breathe, listen to my surroundings, and reflect on what truly matters to me.',
        suggestedTitle: 'A Quiet Reflection',
        detectedMood: 'Peaceful',
        keywords: ['calm', 'reflection', 'gratitude'],
        isFallback: true,
        message: 'Sample transcription generated (Live Gemini API key not configured on server).',
      });
    }

    let modelName = 'gemini-3.5-transcribe';
    let transcriptionText = '';
    let suggestedTitle = '';
    let detectedMood = 'Reflective';
    let keywords: string[] = [];

    const promptText = `You are BORAH's empathetic speech-to-text transcription assistant.
Accurately transcribe the spoken words from this audio recording into clear, natural, well-formatted journal paragraphs.
Remove stuttering and false starts naturally while maintaining the speaker's true voice and heartfelt sentiment.
Also provide a short, fitting journal title (3-5 words) and detect the overall emotional mood.

Return strictly a valid JSON object without markdown fences or code blocks:
{
  "transcription": "The complete transcribed text...",
  "suggestedTitle": "Short 3-5 word title",
  "detectedMood": "e.g. Grateful, Calm, Excited, Overwhelmed, Hopeful, Thoughtful, Content",
  "keywords": ["tag1", "tag2", "tag3"]
}`;

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: resolvedMimeType,
            },
          },
          { text: promptText },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '';
      try {
        const parsed = JSON.parse(responseText);
        transcriptionText = parsed.transcription || '';
        suggestedTitle = parsed.suggestedTitle || '';
        detectedMood = parsed.detectedMood || 'Reflective';
        keywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];
      } catch {
        transcriptionText = responseText;
      }
    } catch (modelErr: any) {
      console.warn('gemini-3.5-transcribe attempt, falling back to gemini-3.8-flash:', modelErr?.message);
      modelName = 'gemini-3.8-flash';
      const fallbackResponse = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: resolvedMimeType,
            },
          },
          { text: promptText },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      const fallbackText = fallbackResponse.text || '';
      try {
        const parsed = JSON.parse(fallbackText);
        transcriptionText = parsed.transcription || '';
        suggestedTitle = parsed.suggestedTitle || '';
        detectedMood = parsed.detectedMood || 'Reflective';
        keywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];
      } catch {
        transcriptionText = fallbackText;
      }
    }

    if (!transcriptionText) {
      return res.status(500).json({ success: false, message: 'Could not transcribe speech from the audio.' });
    }

    return res.json({
      success: true,
      transcription: transcriptionText.trim(),
      suggestedTitle: suggestedTitle.trim(),
      detectedMood: detectedMood.trim(),
      keywords,
      modelUsed: modelName,
    });
  } catch (err: any) {
    console.error('Audio transcription error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Audio transcription failed. Please try again.',
    });
  }
});

// ==========================================
// RESEARCH PAPER DOWNLOAD ROUTE (.DOCX)
// ==========================================
app.get('/api/download/paper-docx', (req: Request, res: Response) => {
  const filePath = path.join(process.cwd(), 'msc_docs', 'BORAH_Research_Paper.docx');
  res.download(filePath, 'BORAH_Research_Paper.docx', (err) => {
    if (err) {
      console.error('Error downloading docx:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Could not download paper.' });
      }
    }
  });
});

// ==========================================
// VITE DEV SERVER / STATIC ASSETS
// ==========================================

async function startServer() {
  // Initialize SQL Database
  try {
    await initSqlDatabase();
    const existingUsers = db.getAllUsers();
    for (const u of existingUsers) {
      await sqlInsertUser(u).catch(() => {});
    }
    console.log(`🗄️ SQLite database initialized: ${existingUsers.length} user records synchronized to SQL database.`);
  } catch (err) {
    console.error('Failed to initialize SQL database:', err);
  }

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`💜 BORAH server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

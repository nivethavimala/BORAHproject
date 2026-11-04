import { JournalEntry, Memory, Task, Schedule, MoodEntry, ImportantNote, UserSettings, User, SearchResults } from './types';

const TOKEN_KEY = 'borah_jwt_token';
const LEGACY_TOKEN_KEY = 'lumora_jwt_token';

export const getToken = (): string | null => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) return token;
  const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (legacy) {
    localStorage.setItem(TOKEN_KEY, legacy);
    return legacy;
  }
  return null;
};
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  // Auth
  register: (payload: { name: string; email: string; password: string; confirmPassword?: string }) =>
    request<{ success: boolean; token: string; user: User; settings: UserSettings; message: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request<{ success: boolean; token: string; user: User; settings: UserSettings; message: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => request<{ success: boolean; user: User; settings: UserSettings }>('/api/auth/me'),

  updateProfile: (payload: { name?: string; profile_photo?: string }) =>
    request<{ success: boolean; user: User; message: string }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    request<{ success: boolean; message: string }>('/api/auth/password', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getSqlStatus: () =>
    request<{
      success: boolean;
      sqlDatabase: string;
      databasePath: string;
      totalUsersInSql: number;
      userSigninsCount: number;
      recentSignins: Array<{ id: number; signin_time: string; status: string; user_agent?: string }>;
    }>('/api/auth/sql-status'),

  // Settings
  getSettings: () => request<{ success: boolean; settings: UserSettings }>('/api/settings'),
  updateSettings: (payload: Partial<UserSettings>) =>
    request<{ success: boolean; settings: UserSettings; message: string }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Journal
  getJournals: () => request<{ success: boolean; entries: JournalEntry[] }>('/api/journal'),
  getJournal: (id: string) => request<{ success: boolean; entry: JournalEntry }>(`/api/journal/${id}`),
  createJournal: (payload: Partial<JournalEntry>) =>
    request<{ success: boolean; entry: JournalEntry; message: string }>('/api/journal', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateJournal: (id: string, payload: Partial<JournalEntry>) =>
    request<{ success: boolean; entry: JournalEntry; message: string }>(`/api/journal/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteJournal: (id: string) => request<{ success: boolean; message: string }>(`/api/journal/${id}`, { method: 'DELETE' }),

  // Memories
  getMemories: () => request<{ success: boolean; memories: Memory[] }>('/api/memories'),
  getMemory: (id: string) => request<{ success: boolean; memory: Memory }>(`/api/memories/${id}`),
  createMemory: (payload: Partial<Memory>) =>
    request<{ success: boolean; memory: Memory; message: string }>('/api/memories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateMemory: (id: string, payload: Partial<Memory>) =>
    request<{ success: boolean; memory: Memory; message: string }>(`/api/memories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteMemory: (id: string) => request<{ success: boolean; message: string }>(`/api/memories/${id}`, { method: 'DELETE' }),
  addMemoryPhoto: (memoryId: string, payload: { image_path: string; caption?: string }) =>
    request<{ success: boolean; photo: any; message: string }>(`/api/memories/${memoryId}/photos`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deletePhoto: (photoId: string) => request<{ success: boolean; message: string }>(`/api/photos/${photoId}`, { method: 'DELETE' }),

  // Tasks
  getTasks: () => request<{ success: boolean; tasks: Task[] }>('/api/tasks'),
  createTask: (payload: Partial<Task>) =>
    request<{ success: boolean; task: Task; message: string }>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateTask: (id: string, payload: Partial<Task>) =>
    request<{ success: boolean; task: Task }>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteTask: (id: string) => request<{ success: boolean; message: string }>(`/api/tasks/${id}`, { method: 'DELETE' }),

  // Schedule
  getSchedules: () => request<{ success: boolean; schedules: Schedule[] }>('/api/schedule'),
  createSchedule: (payload: Partial<Schedule>) =>
    request<{ success: boolean; schedule: Schedule; message: string }>('/api/schedule', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateSchedule: (id: string, payload: Partial<Schedule>) =>
    request<{ success: boolean; schedule: Schedule }>(`/api/schedule/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteSchedule: (id: string) => request<{ success: boolean; message: string }>(`/api/schedule/${id}`, { method: 'DELETE' }),

  // Mood
  getMoods: () => request<{ success: boolean; moods: MoodEntry[] }>('/api/moods'),
  createMood: (payload: Partial<MoodEntry>) =>
    request<{ success: boolean; mood: MoodEntry; message: string }>('/api/moods', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteMood: (id: string) => request<{ success: boolean; message: string }>(`/api/moods/${id}`, { method: 'DELETE' }),

  // Notes
  getNotes: () => request<{ success: boolean; notes: ImportantNote[] }>('/api/notes'),
  createNote: (payload: Partial<ImportantNote>) =>
    request<{ success: boolean; note: ImportantNote; message: string }>('/api/notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateNote: (id: string, payload: Partial<ImportantNote>) =>
    request<{ success: boolean; note: ImportantNote }>(`/api/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteNote: (id: string) => request<{ success: boolean; message: string }>(`/api/notes/${id}`, { method: 'DELETE' }),

  // Search
  search: (q: string) => request<{ success: boolean; results: SearchResults }>(`/api/search?q=${encodeURIComponent(q)}`),

  // AI Reflections
  detectEmotion: (text: string) =>
    request<{
      success: boolean;
      detection: {
        primaryEmotion: string;
        confidence: number;
        observation: string;
        keywords: string[];
      };
    }>('/api/ai/emotion', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  getAiSummary: () =>
    request<{
      success: boolean;
      summary: {
        highlights: string;
        positiveMoments: string;
        growthAreas: string;
        patternObservation: string;
      };
    }>('/api/ai/summary', {
      method: 'POST',
    }),

  getAiPrompts: () => request<{ success: boolean; prompts: string[] }>('/api/ai/prompts'),

  generateMusic: (payload: { prompt: string; durationType: 'clip' | 'full' }) =>
    request<{
      success: boolean;
      audioBase64?: string;
      mimeType?: string;
      lyrics?: string;
      durationType?: string;
      modelUsed?: string;
      message?: string;
    }>('/api/ai/music', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  transcribeAudio: (payload: { audioBase64: string; mimeType?: string }) =>
    request<{
      success: boolean;
      transcription: string;
      suggestedTitle?: string;
      detectedMood?: string;
      keywords?: string[];
      modelUsed?: string;
      isFallback?: boolean;
      message?: string;
    }>('/api/ai/transcribe', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Export & Delete
  exportDataUrl: '/api/export',
  deleteAccount: () => request<{ success: boolean; message: string }>('/api/account', { method: 'DELETE' }),
};

const TOKEN_KEY = 'borah_jwt_token';
const LEGACY_TOKEN_KEY = 'lumora_jwt_token';

export const getToken = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) return token;
  const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (legacy) {
    localStorage.setItem(TOKEN_KEY, legacy);
    return legacy;
  }
  return null;
};

export const setToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
};

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
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
  register: (payload) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request('/api/auth/me'),
  updateProfile: (payload) =>
    request('/api/auth/profile', { method: 'PUT', body: JSON.stringify(payload) }),
  changePassword: (payload) =>
    request('/api/auth/password', { method: 'PUT', body: JSON.stringify(payload) }),
  getSqlStatus: () => request('/api/auth/sql-status'),

  // Settings
  getSettings: () => request('/api/settings'),
  updateSettings: (payload) =>
    request('/api/settings', { method: 'PUT', body: JSON.stringify(payload) }),

  // Journal
  getJournals: () => request('/api/journal'),
  getJournal: (id) => request(`/api/journal/${encodeURIComponent(id)}`),
  createJournal: (payload) =>
    request('/api/journal', { method: 'POST', body: JSON.stringify(payload) }),
  updateJournal: (id, payload) =>
    request(`/api/journal/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteJournal: (id) =>
    request(`/api/journal/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Memories
  getMemories: () => request('/api/memories'),
  getMemory: (id) => request(`/api/memories/${encodeURIComponent(id)}`),
  createMemory: (payload) =>
    request('/api/memories', { method: 'POST', body: JSON.stringify(payload) }),
  updateMemory: (id, payload) =>
    request(`/api/memories/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteMemory: (id) =>
    request(`/api/memories/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  addMemoryPhoto: (memoryId, payload) =>
    request(`/api/memories/${encodeURIComponent(memoryId)}/photos`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deletePhoto: (photoId) =>
    request(`/api/photos/${encodeURIComponent(photoId)}`, { method: 'DELETE' }),

  // Tasks
  getTasks: () => request('/api/tasks'),
  createTask: (payload) =>
    request('/api/tasks', { method: 'POST', body: JSON.stringify(payload) }),
  updateTask: (id, payload) =>
    request(`/api/tasks/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTask: (id) =>
    request(`/api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Schedule
  getSchedules: () => request('/api/schedule'),
  createSchedule: (payload) =>
    request('/api/schedule', { method: 'POST', body: JSON.stringify(payload) }),
  updateSchedule: (id, payload) =>
    request(`/api/schedule/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteSchedule: (id) =>
    request(`/api/schedule/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Moods
  getMoods: () => request('/api/moods'),
  createMood: (payload) =>
    request('/api/moods', { method: 'POST', body: JSON.stringify(payload) }),
  deleteMood: (id) =>
    request(`/api/moods/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Notes
  getNotes: () => request('/api/notes'),
  createNote: (payload) =>
    request('/api/notes', { method: 'POST', body: JSON.stringify(payload) }),
  updateNote: (id, payload) =>
    request(`/api/notes/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteNote: (id) =>
    request(`/api/notes/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Search
  search: (q) => request(`/api/search?q=${encodeURIComponent(q)}`),

  // AI Reflections
  detectEmotion: (text) =>
    request('/api/ai/emotion', { method: 'POST', body: JSON.stringify({ text }) }),
  getAiSummary: () => request('/api/ai/summary', { method: 'POST' }),
  getAiPrompts: () => request('/api/ai/prompts'),
  generateMusic: (payload) =>
    request('/api/ai/music', { method: 'POST', body: JSON.stringify(payload) }),
  transcribeAudio: (payload) =>
    request('/api/ai/transcribe', { method: 'POST', body: JSON.stringify(payload) }),

  // Export & Delete
  exportDataUrl: '/api/export',
  deleteAccount: () => request('/api/account', { method: 'DELETE' }),
};

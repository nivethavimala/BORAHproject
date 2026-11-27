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
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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

function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      qs.set(k, String(v));
    }
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export async function downloadAuthenticatedFile(url, fallbackFilename = 'BORAH_Export') {
  const token = getToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Download failed (${res.status})`);
  }
  const cd = res.headers.get('Content-Disposition') || '';
  const match = cd.match(/filename="([^"]+)"/i);
  const filename = match ? match[1] : fallbackFilename;
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
  return filename;
}

export const api = {
  // Auth & Profile
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

  // Dashboard
  getDashboard: (date) => request(`/api/dashboard${buildQuery({ date })}`),

  // Daily Activity Log
  getActivities: (params = {}) => request(`/api/activities${buildQuery(params)}`),
  createActivity: (payload) =>
    request('/api/activities', { method: 'POST', body: JSON.stringify(payload) }),
  updateActivity: (id, payload) =>
    request(`/api/activities/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  duplicateActivity: (id, payload = {}) =>
    request(`/api/activities/${encodeURIComponent(id)}/duplicate`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteActivity: (id) =>
    request(`/api/activities/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Tasks
  getTasks: () => request('/api/tasks'),
  createTask: (payload) =>
    request('/api/tasks', { method: 'POST', body: JSON.stringify(payload) }),
  updateTask: (id, payload) =>
    request(`/api/tasks/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTask: (id) =>
    request(`/api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Schedule / Planner
  getSchedules: (params = {}) => request(`/api/schedule${buildQuery(params)}`),
  createSchedule: (payload) =>
    request('/api/schedule', { method: 'POST', body: JSON.stringify(payload) }),
  updateSchedule: (id, payload) =>
    request(`/api/schedule/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteSchedule: (id) =>
    request(`/api/schedule/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Projects & Meetings
  getProjects: () => request('/api/projects'),
  createProject: (payload) =>
    request('/api/projects', { method: 'POST', body: JSON.stringify(payload) }),
  updateProject: (id, payload) =>
    request(`/api/projects/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteProject: (id) =>
    request(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  getMeetings: () => request('/api/meetings'),
  createMeeting: (payload) =>
    request('/api/meetings', { method: 'POST', body: JSON.stringify(payload) }),
  updateMeeting: (id, payload) =>
    request(`/api/meetings/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteMeeting: (id) =>
    request(`/api/meetings/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Reports & Exports
  getDailyReport: (date) => request(`/api/reports/daily${buildQuery({ date })}`),
  getWeeklyReport: (start_date) => request(`/api/reports/weekly${buildQuery({ start_date })}`),
  getMonthlyReport: (month) => request(`/api/reports/monthly${buildQuery({ month })}`),
  downloadExport: (moduleName, format = 'pdf', params = {}) =>
    downloadAuthenticatedFile(
      `/api/export/${encodeURIComponent(moduleName)}${buildQuery({ format, ...params })}`,
      `BORAH_${moduleName}.${format}`
    ),

  // Attachments
  getAttachments: (entity_type, entity_id) =>
    request(`/api/attachments${buildQuery({ entity_type, entity_id })}`),
  uploadAttachment: (entity_type, entity_id, file) => {
    const fd = new FormData();
    fd.append('entity_type', entity_type);
    fd.append('entity_id', entity_id);
    fd.append('file', file);
    return request('/api/attachments', { method: 'POST', body: fd });
  },
  downloadAttachment: (id, filename) =>
    downloadAuthenticatedFile(`/api/attachments/${encodeURIComponent(id)}/download`, filename),
  deleteAttachment: (id) =>
    request(`/api/attachments/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Notifications
  getNotifications: () => request('/api/notifications'),
  markNotificationRead: (id) =>
    request(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () =>
    request('/api/notifications/read-all', { method: 'PUT' }),

  // Personal Space (Journal, Memories, Moods, Notes)
  getJournals: () => request('/api/journal'),
  getJournal: (id) => request(`/api/journal/${encodeURIComponent(id)}`),
  createJournal: (payload) =>
    request('/api/journal', { method: 'POST', body: JSON.stringify(payload) }),
  updateJournal: (id, payload) =>
    request(`/api/journal/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteJournal: (id) =>
    request(`/api/journal/${encodeURIComponent(id)}`, { method: 'DELETE' }),

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

  getMoods: () => request('/api/moods'),
  createMood: (payload) =>
    request('/api/moods', { method: 'POST', body: JSON.stringify(payload) }),
  deleteMood: (id) =>
    request(`/api/moods/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  getNotes: () => request('/api/notes'),
  createNote: (payload) =>
    request('/api/notes', { method: 'POST', body: JSON.stringify(payload) }),
  updateNote: (id, payload) =>
    request(`/api/notes/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteNote: (id) =>
    request(`/api/notes/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Custom Daily Affirmations
  getAffirmations: () => request('/api/affirmations'),
  createAffirmation: (payload) =>
    request('/api/affirmations', { method: 'POST', body: JSON.stringify(payload) }),
  deleteAffirmation: (id) =>
    request(`/api/affirmations/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Search & Backup
  search: (q) => request(`/api/search?q=${encodeURIComponent(q)}`),
  exportDataUrl: '/api/export',
  restoreBackup: (payload) =>
    request('/api/backup/restore', { method: 'POST', body: JSON.stringify(payload) }),
  deleteAccount: () => request('/api/account', { method: 'DELETE' }),

  // Optional Organizational Mode
  getOrgStatus: () => request('/api/org/status'),
  createOrg: (name) => request('/api/org/create', { method: 'POST', body: JSON.stringify({ name }) }),
  joinOrg: (join_code) => request('/api/org/join', { method: 'POST', body: JSON.stringify({ join_code }) }),
  leaveOrg: () => request('/api/org/leave', { method: 'POST' }),

  // AI Reflections
  detectEmotion: (text) =>
    request('/api/ai/emotion', { method: 'POST', body: JSON.stringify({ text }) }),
  getAiSummary: () => request('/api/ai/summary', { method: 'POST' }),
  getAiPrompts: () => request('/api/ai/prompts'),
  generateMusic: (payload) =>
    request('/api/ai/music', { method: 'POST', body: JSON.stringify(payload) }),
  transcribeAudio: (payload) =>
    request('/api/ai/transcribe', { method: 'POST', body: JSON.stringify(payload) }),
};

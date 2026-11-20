import { api, getToken, setToken, removeToken } from './api.js';

export const store = {
  user: null,
  settings: null,
  isLoading: true,
};

const listeners = new Set();

export function subscribeAuth(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(store);
    } catch (err) {
      console.error('Auth listener error:', err);
    }
  });
}

export function applyThemeAndFont(theme, font, isDark) {
  const root = document.documentElement;
  root.classList.remove(
    'theme-warm-sunrise',
    'theme-cozy-sage',
    'theme-lavender-dream',
    'theme-ocean-calm',
    'theme-midnight',
    'theme-lavender',
    'theme-forest',
    'theme-rose-gold',
    'theme-purple-universe',
    'dark'
  );

  root.classList.add(`theme-${theme}`);
  root.dataset.theme = theme;

  if (isDark || theme === 'midnight' || theme === 'purple-universe') {
    root.classList.add('dark');
  }

  let fontCss = "'Plus Jakarta Sans', -apple-system, sans-serif";
  if (font === 'serif') fontCss = "'Lora', Georgia, serif";
  if (font === 'handwriting') fontCss = "'Caveat', cursive";
  root.style.setProperty('--font-primary', fontCss);
}

export async function refreshUser() {
  const token = getToken();
  if (!token) {
    store.user = null;
    store.settings = null;
    store.isLoading = false;
    notify();
    return;
  }

  try {
    const res = await api.getMe();
    if (res.success) {
      store.user = res.user;
      store.settings = res.settings;
      if (res.settings) {
        applyThemeAndFont(res.settings.theme, res.settings.font_family, res.settings.dark_mode);
      }
    } else {
      removeToken();
      store.user = null;
      store.settings = null;
    }
  } catch (err) {
    console.warn('Auth refresh notice:', err.message);
    removeToken();
    store.user = null;
    store.settings = null;
  } finally {
    store.isLoading = false;
    notify();
  }
}

export async function login(email, password) {
  try {
    const res = await api.login({ email, password });
    if (res.success && res.token) {
      setToken(res.token);
      store.user = res.user;
      store.settings = res.settings;
      if (res.settings) {
        applyThemeAndFont(res.settings.theme, res.settings.font_family, res.settings.dark_mode);
      }
      notify();
      return { success: true, message: res.message };
    }
    return { success: false, message: res.message || 'Login failed.' };
  } catch (err) {
    return { success: false, message: err.message || 'Unable to log in.' };
  }
}

export async function register(name, email, password, confirmPassword) {
  try {
    const res = await api.register({ name, email, password, confirmPassword });
    if (res.success && res.token) {
      setToken(res.token);
      store.user = res.user;
      store.settings = res.settings;
      if (res.settings) {
        applyThemeAndFont(res.settings.theme, res.settings.font_family, res.settings.dark_mode);
      }
      notify();
      return { success: true, message: res.message };
    }
    return { success: false, message: res.message || 'Registration failed.' };
  } catch (err) {
    return { success: false, message: err.message || 'Unable to create account.' };
  }
}

export function logout() {
  removeToken();
  store.user = null;
  store.settings = null;
  applyThemeAndFont('warm-sunrise', 'serif', false);
  notify();
}

export async function updateSettings(updates) {
  try {
    const res = await api.updateSettings(updates);
    if (res.success) {
      store.settings = res.settings;
      applyThemeAndFont(res.settings.theme, res.settings.font_family, res.settings.dark_mode);
      notify();
    }
  } catch (err) {
    console.error('Failed to update settings:', err);
  }
}

export async function updateProfile(updates) {
  try {
    const res = await api.updateProfile(updates);
    if (res.success) {
      store.user = res.user;
      notify();
    }
  } catch (err) {
    console.error('Failed to update profile:', err);
  }
}

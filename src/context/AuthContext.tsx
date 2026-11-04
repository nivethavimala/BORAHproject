import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserSettings, ThemeType, FontFamilyType } from '../types';
import { api, getToken, setToken, removeToken } from '../api';

interface AuthContextType {
  user: User | null;
  settings: UserSettings | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  register: (name: string, email: string, pass: string, confirm?: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  updateProfile: (profile: { name?: string; profile_photo?: string }) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Apply theme and font to the document
  const applyThemeAndFont = (theme: ThemeType, font: FontFamilyType, isDark: boolean) => {
    const root = document.documentElement;
    const allThemes = [
      'theme-lavender',
      'theme-midnight',
      'theme-forest',
      'theme-warm-sunrise',
      'theme-ocean-calm',
      'theme-rose-gold',
      'theme-purple-universe',
      'theme-lavender-dream',
      'theme-cozy-sage',
      'dark',
    ];
    root.classList.remove(...allThemes);
    root.classList.add(`theme-${theme}`);
    root.dataset.theme = theme;
    if (isDark || theme === 'midnight' || theme === 'purple-universe') {
      root.classList.add('dark');
    }


    // Set font family variable
    if (font === 'serif') {
      root.style.setProperty('--font-primary', "'Lora', Georgia, serif");
    } else if (font === 'handwriting') {
      root.style.setProperty('--font-primary', "'Caveat', cursive");
    } else {
      root.style.setProperty('--font-primary', "'Plus Jakarta Sans', system-ui, sans-serif");
    }
  };

  const refreshUserData = async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setSettings(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.getMe();
      if (res.success) {
        setUser(res.user);
        setSettings(res.settings);
        applyThemeAndFont(res.settings.theme, res.settings.font_family, res.settings.dark_mode);
      } else {
        removeToken();
        setUser(null);
      }
    } catch (err) {
      removeToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUserData();
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const res = await api.login({ email, password: pass });
      if (res.success) {
        setToken(res.token);
        setUser(res.user);
        setSettings(res.settings);
        applyThemeAndFont(res.settings.theme, res.settings.font_family, res.settings.dark_mode);
        return { success: true, message: res.message };
      }
      return { success: false, message: 'Login failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Login failed' };
    }
  };

  const register = async (name: string, email: string, pass: string, confirm?: string) => {
    try {
      const res = await api.register({ name, email, password: pass, confirmPassword: confirm });
      if (res.success) {
        setToken(res.token);
        setUser(res.user);
        setSettings(res.settings);
        applyThemeAndFont(res.settings.theme, res.settings.font_family, res.settings.dark_mode);
        return { success: true, message: res.message };
      }
      return { success: false, message: 'Registration failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Registration failed' };
    }
  };

  const logout = () => {
    removeToken();
    setUser(null);
    setSettings(null);
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!settings) return;
    try {
      const res = await api.updateSettings(newSettings);
      if (res.success) {
        setSettings(res.settings);
        applyThemeAndFont(res.settings.theme, res.settings.font_family, res.settings.dark_mode);
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  const updateProfile = async (profile: { name?: string; profile_photo?: string }) => {
    try {
      const res = await api.updateProfile(profile);
      if (res.success) {
        setUser(res.user);
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        settings,
        isLoading,
        login,
        register,
        logout,
        updateSettings,
        updateProfile,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { ThemeType, FontFamilyType } from '../types';
import { AchievementManager, AchievementBadge } from '../utils/achievementManager';
import {
  Settings,
  Palette,
  Type,
  Shield,
  Download,
  Trash2,
  Lock,
  User,
  Sparkles,
  Check,
  Star,
  Heart,
  Moon,
  AlertTriangle,
  Database,
  FileText,
  BookOpen,
} from 'lucide-react';
import { exportJournalEntriesToPDF, exportJournalEntriesToText } from '../utils/pdfExport';

export const SettingsView: React.FC = () => {
  const { user, settings, updateSettings, updateProfile, logout } = useAuth();
  const [badges, setBadges] = useState<AchievementBadge[]>([]);
  const [sqlStatus, setSqlStatus] = useState<any>(null);

  // Profile Form
  const [name, setName] = useState(user?.name || '');
  const [profilePhoto, setProfilePhoto] = useState(user?.profile_photo || '');

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setBadges(AchievementManager.getBadges());
    api
      .getSqlStatus()
      .then((res) => {
        if (res.success) setSqlStatus(res);
      })
      .catch(() => {});
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await updateProfile({ name: name.trim(), profile_photo: profilePhoto.trim() });
    showToast('Profile updated ✨');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showToast('Please fill in both current and new passwords.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters.');
      return;
    }
    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      if (res.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        showToast('Password changed successfully 🔒');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update password.');
    }
  };

  const handleExportData = () => {
    window.location.href = api.exportDataUrl;
    showToast('Your private sanctuary data is downloading as JSON 📥');
  };

  const handleDeleteAccount = async () => {
    try {
      const res = await api.deleteAccount();
      if (res.success) {
        logout();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete account.');
    }
  };

  const themes: Array<{ id: ThemeType; name: string; desc: string; preview: string }> = [
    { id: 'lavender', name: 'Lavender', desc: 'Gentle lilac, soft petal & pastel violet', preview: 'from-purple-200 via-fuchsia-100 to-indigo-100' },
    { id: 'midnight', name: 'Midnight', desc: 'Calm deep slate & indigo dark mode', preview: 'from-slate-800 via-indigo-950 to-slate-900' },
    { id: 'forest', name: 'Forest', desc: 'Earthy pine, moss greens & calm sage', preview: 'from-emerald-200 via-teal-100 to-green-100' },
    { id: 'rose-gold', name: 'Rose Gold', desc: 'Warm blush, copper & delicate petal', preview: 'from-rose-200 via-pink-100 to-orange-100' },
    { id: 'warm-sunrise', name: 'Warm Sunrise', desc: 'Soft cream & terracotta peach', preview: 'from-amber-200 via-orange-100 to-rose-100' },
    { id: 'ocean-calm', name: 'Ocean Calm', desc: 'Sky blues, sea glass & cool stone', preview: 'from-sky-200 via-cyan-100 to-blue-100' },
    { id: 'purple-universe', name: 'Purple Universe 💜', desc: 'Celestial violet & seven-star calm', preview: 'from-[#2E1065] to-[#4C1D95]' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl bg-slate-900 text-white text-xs font-medium shadow-xl border border-slate-700 animate-in fade-in duration-200">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-serif flex items-center gap-2">
          <span>Settings & Sanctuary Preferences</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Customize themes, typography, security credentials, and export your personal data.
        </p>
      </div>

      {/* Section 1: Atmosphere & Theme */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
            Atmosphere & Palette
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {themes.map((t) => {
            const isSelected =
              settings?.theme === t.id ||
              (t.id === 'lavender' && settings?.theme === 'lavender-dream') ||
              (t.id === 'forest' && settings?.theme === 'cozy-sage');
            return (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  updateSettings({
                    theme: t.id,
                    dark_mode: t.id === 'midnight' || t.id === 'purple-universe',
                  })
                }
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'border-amber-500 ring-2 ring-amber-400/30 bg-amber-50/50 dark:bg-slate-800'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${t.preview} shadow-inner border shrink-0`} />
                  <div>
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">{t.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{t.desc}</p>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Font Family */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
            Reading & Journal Typography
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'serif', name: 'Warm Editorial Serif', sample: 'Dear Diary, thoughtful reflections...', class: 'font-serif' },
            { id: 'sans', name: 'Clean Modern Sans', sample: 'Focus on today with clarity and structure...', class: 'font-sans' },
            { id: 'handwriting', name: 'Cozy Handwritten', sample: 'Notes that feel intimate and warm ✨', class: 'font-handwriting text-lg' },
          ].map((f) => {
            const isSelected = settings?.font_family === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => updateSettings({ font_family: f.id as any })}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-400/30 bg-indigo-50/50 dark:bg-slate-800'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{f.name}</span>
                  {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <p className={`text-xs text-slate-600 dark:text-slate-400 ${f.class}`}>"{f.sample}"</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 3: Secret Sanctuary Badges (ARMY_EASTER_EGG_LAYER) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-purple-200/70 dark:border-purple-900/60 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Secret Milestones & Badges
            </h2>
          </div>
          <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
            {badges.filter((b) => b.unlockedAt).length} / {badges.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {badges.map((b) => {
            const isUnlocked = !!b.unlockedAt;
            return (
              <div
                key={b.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isUnlocked
                    ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800'
                    : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="text-2xl">{isUnlocked ? b.icon : '🔒'}</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {isUnlocked ? b.title : 'Hidden Milestone'}
                    </h4>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                      {isUnlocked ? 'Discovered 💜' : 'Discover naturally'}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                  {isUnlocked ? b.description : 'A gentle milestone waiting in your sanctuary.'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 4: Profile Credentials */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-500" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
            Profile Details
          </h2>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Your Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Save Profile
          </button>
        </form>
      </div>

      {/* Section 5: Password Change */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-rose-500" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
            Change Password
          </h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Update Password
          </button>
        </form>
      </div>

      {/* Section 6: Data Privacy, Export & Account Deletion */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
            Data Privacy & Ownership
          </h2>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Every thought, photo, and task in BORAH belongs exclusively to you. Your data is isolated per account and never shared with third parties.
        </p>

        {/* SQL Database User Authentication & Signin Log Card */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                SQL Database Status: Connected & Synced
              </h4>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 font-mono">
              SQLite 3 Engine
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            User signups, credentials, and sign-in sessions are stored in the relational SQL database (<code className="font-mono text-[10px] bg-emerald-100/60 dark:bg-emerald-950/60 px-1 py-0.5 rounded">database/borah.sqlite</code>).
          </p>
          {sqlStatus && (
            <div className="pt-2 flex flex-wrap items-center gap-4 text-[11px] text-emerald-800 dark:text-emerald-300 border-t border-emerald-200/60 dark:border-emerald-900/40">
              <span>👤 <strong>{sqlStatus.totalUsersInSql}</strong> Registered User{sqlStatus.totalUsersInSql === 1 ? '' : 's'} in SQL</span>
              <span>🔒 <strong>{sqlStatus.userSigninsCount}</strong> Sign-in Record{sqlStatus.userSigninsCount === 1 ? '' : 's'} Logged</span>
              {sqlStatus.recentSignins?.[0] && (
                <span className="text-[10px] text-slate-500">
                  Last login: {new Date(sqlStatus.recentSignins[0].signin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Export Sanctuary Data</h4>
            <p className="text-[11px] text-slate-400">Download all your journal pages, memories, tasks, and notes in JSON format.</p>
          </div>
          <button
            type="button"
            onClick={handleExportData}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>



        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-rose-600">Permanently Delete Account</h4>
            <p className="text-[11px] text-slate-400">Irreversibly remove your account and all associated entries from the database.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>Are you completely sure?</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This action cannot be undone. All your journals, memories, schedule, and notes will be permanently purged from the system.
            </p>
            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer"
              >
                Yes, Delete My Sanctuary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

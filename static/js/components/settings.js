import { api, getToken } from '../api.js';
import { store, updateSettings, updateProfile, logout } from '../state.js';
import { AchievementManager } from '../utils/achievements.js';
import { escapeHtml, renderIcons, todayIso } from '../utils/dom.js';

const THEMES = [
  { id: 'lavender', name: 'Lavender', desc: 'Gentle lilac, soft petal & pastel violet', preview: 'from-purple-200 via-fuchsia-100 to-indigo-100' },
  { id: 'midnight', name: 'Midnight', desc: 'Calm deep slate & indigo dark mode', preview: 'from-slate-800 via-indigo-950 to-slate-900' },
  { id: 'forest', name: 'Forest', desc: 'Earthy pine, moss greens & calm sage', preview: 'from-emerald-200 via-teal-100 to-green-100' },
  { id: 'rose-gold', name: 'Rose Gold', desc: 'Warm blush, copper & delicate petal', preview: 'from-rose-200 via-pink-100 to-orange-100' },
  { id: 'warm-sunrise', name: 'Warm Sunrise', desc: 'Soft cream & terracotta peach', preview: 'from-amber-200 via-orange-100 to-rose-100' },
  { id: 'ocean-calm', name: 'Ocean Calm', desc: 'Sky blues, sea glass & cool stone', preview: 'from-sky-200 via-cyan-100 to-blue-100' },
  { id: 'purple-universe', name: 'Purple Universe 💜', desc: 'Celestial violet & seven-star calm', preview: 'from-[#2E1065] to-[#4C1D95]' },
];

const FONTS = [
  { id: 'serif', name: 'Warm Editorial Serif', sample: 'Dear Diary, thoughtful reflections...', cls: 'font-serif' },
  { id: 'sans', name: 'Clean Modern Sans', sample: 'Focus on today with clarity and structure...', cls: 'font-sans' },
  { id: 'handwriting', name: 'Cozy Handwritten', sample: 'Notes that feel intimate and warm ✨', cls: 'font-handwriting text-lg' },
];

export function renderSettingsView(container) {
  let badges = AchievementManager.getBadges();
  let sqlStatus = null;
  let showDeleteConfirm = false;
  let toastMessage = null;
  let toastTimer = null;
  let disposed = false;

  const showToast = (msg) => {
    toastMessage = msg;
    render();
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastMessage = null;
      render();
    }, 3000);
  };

  const render = () => {
    if (disposed) return;

    const user = store.user;
    const settings = store.settings;

    const themesHtml = THEMES.map((t) => {
      const isSelected =
        settings?.theme === t.id ||
        (t.id === 'lavender' && settings?.theme === 'lavender-dream') ||
        (t.id === 'forest' && settings?.theme === 'cozy-sage');
      return `
        <button type="button" data-set-theme="${t.id}" class="p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
          isSelected
            ? 'border-amber-500 ring-2 ring-amber-400/30 bg-amber-50/50 dark:bg-slate-800'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800/40'
        }">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-br ${t.preview} shadow-inner border shrink-0"></div>
            <div>
              <h4 class="text-xs font-semibold text-slate-800 dark:text-slate-200">${escapeHtml(t.name)}</h4>
              <p class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(t.desc)}</p>
            </div>
          </div>
          ${isSelected ? `<i data-lucide="check" class="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0"></i>` : ''}
        </button>`;
    }).join('');

    const fontsHtml = FONTS.map((f) => {
      const isSelected = settings?.font_family === f.id;
      return `
        <button type="button" data-set-font="${f.id}" class="p-4 rounded-2xl border text-left transition-all cursor-pointer ${
          isSelected
            ? 'border-indigo-500 ring-2 ring-indigo-400/30 bg-indigo-50/50 dark:bg-slate-800'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800/40'
        }">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">${escapeHtml(f.name)}</span>
            ${isSelected ? `<i data-lucide="check" class="w-4 h-4 text-indigo-600 dark:text-indigo-400"></i>` : ''}
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-400 ${f.cls}">"${escapeHtml(f.sample)}"</p>
        </button>`;
    }).join('');

    const badgesHtml = badges
      .map((b) => {
        const isUnlocked = !!b.unlockedAt;
        return `
          <div class="p-4 rounded-2xl border transition-all ${
            isUnlocked
              ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800'
              : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60'
          }">
            <div class="flex items-center gap-3 mb-1.5">
              <span class="text-2xl">${isUnlocked ? escapeHtml(b.icon) : '🔒'}</span>
              <div>
                <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200">${isUnlocked ? escapeHtml(b.title) : 'Hidden Milestone'}</h4>
                <span class="text-[10px] text-purple-600 dark:text-purple-400 font-mono">${isUnlocked ? 'Discovered 💜' : 'Discover naturally'}</span>
              </div>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
              ${isUnlocked ? escapeHtml(b.description) : 'A gentle milestone waiting in your sanctuary.'}
            </p>
          </div>`;
      })
      .join('');

    const sqlDetailsHtml = sqlStatus
      ? `
      <div class="pt-2 flex flex-wrap items-center gap-4 text-[11px] text-emerald-800 dark:text-emerald-300 border-t border-emerald-200/60 dark:border-emerald-900/40">
        <span>👤 <strong>${Number(sqlStatus.totalUsersInSql)}</strong> Registered User${sqlStatus.totalUsersInSql === 1 ? '' : 's'} in SQL</span>
        <span>🔒 <strong>${Number(sqlStatus.userSigninsCount)}</strong> Sign-in Record${sqlStatus.userSigninsCount === 1 ? '' : 's'} Logged</span>
        ${
          sqlStatus.recentSignins?.[0]
            ? `<span class="text-[10px] text-slate-500">Last login: ${escapeHtml(new Date(sqlStatus.recentSignins[0].signin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }))}</span>`
            : ''
        }
      </div>`
      : '';

    const deleteConfirmHtml = showDeleteConfirm
      ? `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900 p-6 sm:p-8 space-y-4">
          <div class="flex items-center gap-2 text-rose-600 font-bold text-sm">
            <i data-lucide="alert-triangle" class="w-5 h-5"></i>
            <span>Are you completely sure?</span>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            This action cannot be undone. All your journals, memories, schedule, and notes will be permanently purged from the system.
          </p>
          <div class="pt-4 flex justify-end gap-3">
            <button type="button" data-set-cancel-del class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">Cancel</button>
            <button type="button" data-set-confirm-del class="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer">Yes, Delete My Sanctuary</button>
          </div>
        </div>
      </div>`
      : '';

    container.innerHTML = `
      <div class="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-300">
        ${toastMessage ? `<div class="fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl bg-slate-900 text-white text-xs font-medium shadow-xl border border-slate-700 animate-in fade-in duration-200">${escapeHtml(toastMessage)}</div>` : ''}

        <div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-serif flex items-center gap-2">
            <span>Settings &amp; Sanctuary Preferences</span>
          </h1>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Customize themes, typography, security credentials, and export your personal data.
          </p>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          <div class="flex items-center gap-2">
            <i data-lucide="palette" class="w-4 h-4 text-amber-500"></i>
            <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Atmosphere &amp; Palette</h2>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">${themesHtml}</div>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          <div class="flex items-center gap-2">
            <i data-lucide="type" class="w-4 h-4 text-indigo-500"></i>
            <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Reading &amp; Journal Typography</h2>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">${fontsHtml}</div>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-purple-200/70 dark:border-purple-900/60 shadow-xs space-y-5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i data-lucide="sparkles" class="w-4 h-4 text-purple-600 dark:text-purple-400"></i>
              <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Secret Milestones &amp; Badges</h2>
            </div>
            <span class="text-xs text-purple-600 dark:text-purple-400 font-semibold">${badges.filter((b) => b.unlockedAt).length} / ${badges.length} Unlocked</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">${badgesHtml}</div>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          <div class="flex items-center gap-2">
            <i data-lucide="user" class="w-4 h-4 text-emerald-500"></i>
            <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Profile Details</h2>
          </div>
          <form data-set-profile-form class="space-y-4 max-w-md">
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Your Display Name</label>
              <input type="text" name="name" value="${escapeHtml(user?.name || '')}" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Email Address</label>
              <input type="email" disabled value="${escapeHtml(user?.email || '')}" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed" />
            </div>
            <button type="submit" class="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all cursor-pointer shadow-xs">Save Profile</button>
          </form>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          <div class="flex items-center gap-2">
            <i data-lucide="lock" class="w-4 h-4 text-rose-500"></i>
            <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Change Password</h2>
          </div>
          <form data-set-password-form class="space-y-4 max-w-md">
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Current Password</label>
              <input type="password" required name="currentPassword" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">New Password</label>
              <input type="password" required name="newPassword" placeholder="At least 6 characters" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Confirm New Password</label>
              <input type="password" required name="confirmNewPassword" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
            </div>
            <button type="submit" class="px-4 py-2 text-xs font-semibold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 rounded-xl transition-all cursor-pointer shadow-xs">Update Password</button>
          </form>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <div class="flex items-center gap-2">
            <i data-lucide="shield" class="w-4 h-4 text-emerald-500"></i>
            <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Data Privacy &amp; Ownership</h2>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Every thought, photo, and task in BORAH belongs exclusively to you. Your data is isolated per account and never shared with third parties.
          </p>
          <div class="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 space-y-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i data-lucide="database" class="w-4 h-4 text-emerald-600 dark:text-emerald-400"></i>
                <h4 class="text-xs font-bold text-emerald-950 dark:text-emerald-200">SQL Database Status: Connected &amp; Synced</h4>
              </div>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 font-mono">SQLite 3 Engine</span>
            </div>
            <p class="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              User signups, credentials, and sign-in sessions are stored in the relational SQL database (<code class="font-mono text-[10px] bg-emerald-100/60 dark:bg-emerald-950/60 px-1 py-0.5 rounded">database/borah.sqlite</code>).
            </p>
            ${sqlDetailsHtml}
          </div>

          <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200">Export Sanctuary Data</h4>
              <p class="text-[11px] text-slate-400">Download all your journal pages, memories, tasks, and notes in JSON format.</p>
            </div>
            <button type="button" data-set-export class="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs">
              <i data-lucide="download" class="w-3.5 h-3.5"></i>
              <span>Export JSON</span>
            </button>
          </div>

          <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 class="text-xs font-bold text-rose-600">Permanently Delete Account</h4>
              <p class="text-[11px] text-slate-400">Irreversibly remove your account and all associated entries from the database.</p>
            </div>
            <button type="button" data-set-open-del class="px-4 py-2 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              <span>Delete Account</span>
            </button>
          </div>
        </div>

        ${deleteConfirmHtml}
      </div>
    `;

    renderIcons(container);

    container.querySelectorAll('[data-set-theme]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const themeId = btn.getAttribute('data-set-theme');
        updateSettings({
          theme: themeId,
          dark_mode: themeId === 'midnight' || themeId === 'purple-universe',
        });
      });
    });

    container.querySelectorAll('[data-set-font]').forEach((btn) => {
      btn.addEventListener('click', () => {
        updateSettings({ font_family: btn.getAttribute('data-set-font') });
      });
    });

    container.querySelector('[data-set-profile-form]')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const name = String(fd.get('name') || '').trim();
      if (!name) return;
      await updateProfile({ name, profile_photo: store.user?.profile_photo || '' });
      showToast('Profile updated ✨');
    });

    container.querySelector('[data-set-password-form]')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const currentPassword = String(fd.get('currentPassword') || '');
      const newPassword = String(fd.get('newPassword') || '');
      const confirmNewPassword = String(fd.get('confirmNewPassword') || '');

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
          e.target.reset();
          showToast('Password changed successfully 🔒');
        }
      } catch (err) {
        showToast(err.message || 'Failed to update password.');
      }
    });

    container.querySelector('[data-set-export]')?.addEventListener('click', async () => {
      try {
        const token = getToken();
        const res = await fetch(api.exportDataUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`Export failed (${res.status})`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `borah_backup_${todayIso()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        showToast('Your private sanctuary data is downloading as JSON 📥');
      } catch (err) {
        showToast(err.message || 'Unable to export JSON.');
      }
    });

    container.querySelector('[data-set-open-del]')?.addEventListener('click', () => {
      showDeleteConfirm = true;
      render();
    });

    container.querySelector('[data-set-cancel-del]')?.addEventListener('click', () => {
      showDeleteConfirm = false;
      render();
    });

    container.querySelector('[data-set-confirm-del]')?.addEventListener('click', async () => {
      try {
        const res = await api.deleteAccount();
        if (res.success) logout();
      } catch (err) {
        showToast(err.message || 'Failed to delete account.');
      }
    });
  };

  render();

  api
    .getSqlStatus()
    .then((res) => {
      if (!disposed && res.success) {
        sqlStatus = res;
        render();
      }
    })
    .catch(() => {});

  return () => {
    disposed = true;
    if (toastTimer) clearTimeout(toastTimer);
  };
}

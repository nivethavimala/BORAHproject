import { api } from '../api.js';
import { escapeHtml, renderIcons } from '../utils/dom.js';

export function renderNotificationsView(container, { onNavigate, onUnreadChange } = {}) {
  let notifications = [];
  let filterMode = 'all'; // 'all' | 'unread'
  let loading = true;
  let toastMsg = '';
  let disposed = false;

  const showToast = (msg) => {
    toastMsg = msg;
    render();
    setTimeout(() => {
      if (!disposed) {
        toastMsg = '';
        render();
      }
    }, 2800);
  };

  const syncUnread = (list) => {
    const unread = list.filter((n) => !n.is_read).length;
    if (onUnreadChange) onUnreadChange(unread);
  };

  const load = async () => {
    try {
      const res = await api.getNotifications();
      if (!disposed) {
        notifications = res.notifications || [];
        loading = false;
        syncUnread(notifications);
        render();
      }
    } catch {
      if (!disposed) {
        loading = false;
        render();
      }
    }
  };

  const render = () => {
    if (disposed) return;

    const unreadCount = notifications.filter((n) => !n.is_read).length;
    const shown =
      filterMode === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

    const listHtml = loading
      ? `<div class="py-12 text-center text-xs text-slate-400">Loading reminders &amp; notifications...</div>`
      : shown.length === 0
        ? `<div class="py-14 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <i data-lucide="bell" class="w-9 h-9 mx-auto text-slate-300 dark:text-slate-700"></i>
            <p class="text-xs text-slate-500">${filterMode === 'unread' ? 'No unread notifications.' : 'You are completely caught up.'}</p>
          </div>`
        : `<div class="space-y-3">
            ${shown
              .map(
                (n) => `
              <div class="p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  n.is_read
                    ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 opacity-80'
                    : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60 shadow-xs'
                }">
                <div class="flex items-start gap-3">
                  <div class="p-2 rounded-xl shrink-0 ${
                    n.is_read
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                  }">
                    <i data-lucide="bell-ring" class="w-4 h-4"></i>
                  </div>
                  <div class="space-y-0.5">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="text-xs font-bold text-slate-800 dark:text-slate-100">${escapeHtml(n.title)}</span>
                      ${!n.is_read ? '<span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">New</span>' : ''}
                      <span class="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">${escapeHtml(n.category || 'system')}</span>
                    </div>
                    ${n.message ? `<p class="text-xs text-slate-600 dark:text-slate-300">${escapeHtml(n.message)}</p>` : ''}
                    <div class="text-[10px] text-slate-400 font-mono">${escapeHtml((n.created_at || '').slice(0, 16).replace('T', ' '))}</div>
                  </div>
                </div>
                <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
                  ${
                    n.target_view
                      ? `<button type="button" data-ntf-open="${escapeHtml(n.id)}" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 cursor-pointer">Open</button>`
                      : ''
                  }
                  ${
                    !n.is_read
                      ? `<button type="button" data-ntf-read="${escapeHtml(n.id)}" class="px-3 py-1.5 rounded-xl text-xs font-semibold borah-btn-sage cursor-pointer">Mark Read</button>`
                      : '<span class="text-[11px] text-slate-400 px-2">Read</span>'
                  }
                </div>
              </div>`
              )
              .join('')}
          </div>`;

    container.innerHTML = `
      <div class="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
        ${toastMsg ? `<div class="fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl bg-slate-900 text-white text-xs font-medium shadow-xl">${escapeHtml(toastMsg)}</div>` : ''}

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100 font-serif">Notifications &amp; Reminders</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Task due alerts, schedule reminders, and workspace updates (${unreadCount} unread).
            </p>
          </div>
          ${
            unreadCount > 0
              ? `<button type="button" data-ntf-read-all class="px-4 py-2 rounded-xl text-xs font-semibold borah-btn-sage flex items-center gap-1.5 cursor-pointer">
                  <i data-lucide="check-check" class="w-4 h-4"></i> Mark All Read
                </button>`
              : ''
          }
        </div>

        <div class="flex items-center gap-2">
          <button type="button" data-ntf-filter="all" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
            filterMode === 'all' ? 'borah-btn-sage' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600'
          }">All (${notifications.length})</button>
          <button type="button" data-ntf-filter="unread" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
            filterMode === 'unread' ? 'borah-btn-sage' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600'
          }">Unread (${unreadCount})</button>
        </div>

        ${listHtml}
      </div>
    `;

    renderIcons(container);

    container.querySelectorAll('[data-ntf-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        filterMode = btn.getAttribute('data-ntf-filter');
        render();
      });
    });

    container.querySelector('[data-ntf-read-all]')?.addEventListener('click', async () => {
      try {
        await api.markAllNotificationsRead();
        notifications = notifications.map((n) => ({ ...n, is_read: true }));
        syncUnread(notifications);
        showToast('All notifications marked as read.');
      } catch (err) {
        showToast(err.message || 'Unable to update notifications.');
      }
    });

    container.querySelectorAll('[data-ntf-read]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-ntf-read');
        try {
          await api.markNotificationRead(id);
          notifications = notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n));
          syncUnread(notifications);
          render();
        } catch {}
      });
    });

    container.querySelectorAll('[data-ntf-open]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-ntf-open');
        const target = notifications.find((n) => n.id === id);
        if (!target) return;
        if (!target.is_read) {
          try {
            await api.markNotificationRead(id);
            notifications = notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n));
            syncUnread(notifications);
          } catch {}
        }
        if (onNavigate && target.target_view) {
          onNavigate(target.target_view, target.target_id || null);
        }
      });
    });
  };

  load();

  return () => {
    disposed = true;
  };
}

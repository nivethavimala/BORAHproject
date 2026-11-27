import { store, updateSettings, logout } from '../state.js';
import { EasterEggManager } from '../utils/easterEggs.js';
import { escapeHtml, renderIcons } from '../utils/dom.js';

const NAV_GROUPS = [
  {
    title: 'Workspace',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', moduleKey: null },
      { id: 'activities', label: 'Daily Activity Log', icon: 'clock', moduleKey: 'activities' },
      { id: 'tasks', label: 'Tasks', icon: 'check-square', moduleKey: 'tasks' },
      { id: 'planner', label: 'Planner & Timetable', icon: 'calendar', moduleKey: 'planner' },
      { id: 'projects', label: 'Projects', icon: 'folder-kanban', moduleKey: 'projects' },
      { id: 'meetings', label: 'Meetings', icon: 'users', moduleKey: 'meetings' },
    ],
  },
  {
    title: 'Personal Space',
    items: [
      { id: 'journal', label: 'Journal', icon: 'book-open', moduleKey: 'journal' },
      { id: 'memories', label: 'Memories', icon: 'camera', moduleKey: 'memories' },
      { id: 'notes', label: 'Notes', icon: 'sticky-note', moduleKey: 'notes' },
      { id: 'mood', label: 'Mood Tracker', icon: 'smile', moduleKey: 'mood' },
    ],
  },
  {
    title: 'Reports',
    items: [
      { id: 'reports', label: 'Activity Reports', icon: 'bar-chart-2', moduleKey: 'reports' },
      { id: 'exports', label: 'Export Center', icon: 'download', moduleKey: 'exports' },
    ],
  },
  {
    title: 'Account',
    items: [
      { id: 'notifications', label: 'Notifications', icon: 'bell', moduleKey: null },
      { id: 'settings', label: 'Settings', icon: 'settings', moduleKey: null },
    ],
  },
];

export function renderNavigation(
  container,
  { activeTab, unreadCount = 0, setActiveTab, onOpenSearch, onQuickNewActivity, onOpenPurpleUniverse }
) {
  let mobileMenuOpen = false;

  const render = () => {
    const user = store.user;
    const settings = store.settings;
    const isDark = !!settings?.dark_mode;
    const vis = settings?.visible_modules || {};
    const orgEnabled = !!settings?.org_mode_enabled;
    const userInitial = user?.name ? user.name[0].toUpperCase() : 'B';

    const visibleGroups = NAV_GROUPS.map((grp) => {
      const items = grp.items.filter((item) => !item.moduleKey || vis[item.moduleKey] !== false);
      if (grp.title === 'Account' && orgEnabled) {
        items.splice(1, 0, { id: 'organization', label: 'Organization', icon: 'building-2', moduleKey: null });
      }
      return { ...grp, items };
    }).filter((grp) => grp.items.length > 0);

    const renderGroupItems = (items, isMobile = false) =>
      items
        .map((item) => {
          const isActive = activeTab === item.id;
          const attr = isMobile ? `data-mobile-nav-item="${item.id}"` : `data-nav-item="${item.id}"`;
          const badge =
            item.id === 'notifications' && unreadCount > 0
              ? `<span class="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white tabular-nums">${unreadCount}</span>`
              : '';
          return `
            <button type="button" ${attr} class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
              isActive
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold border border-emerald-200/70 dark:border-emerald-800/60'
                : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
            }">
              <i data-lucide="${item.icon}" class="w-4 h-4 shrink-0 ${
                isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'
              }"></i>
              <span class="truncate">${escapeHtml(item.label)}</span>
              ${badge}
            </button>`;
        })
        .join('');

    const desktopGroupsHtml = visibleGroups
      .map(
        (grp) => `
        <div class="space-y-1 pt-2 first:pt-0">
          <div class="px-3 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">${escapeHtml(grp.title)}</div>
          ${renderGroupItems(grp.items, false)}
        </div>`
      )
      .join('');

    const mobileGroupsHtml = visibleGroups
      .map(
        (grp) => `
        <div class="space-y-1 pt-3 first:pt-0">
          <div class="px-3 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">${escapeHtml(grp.title)}</div>
          ${renderGroupItems(grp.items, true)}
        </div>`
      )
      .join('');

    const mobileQuickTabs = [
      { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
      { id: 'activities', label: 'Activities', icon: 'clock' },
      { id: 'tasks', label: 'Tasks', icon: 'check-square' },
      { id: 'planner', label: 'Planner', icon: 'calendar' },
      { id: 'reports', label: 'Reports', icon: 'bar-chart-2' },
    ];

    const bottomBarHtml = mobileQuickTabs
      .map((item) => {
        const isActive = activeTab === item.id;
        return `
          <button type="button" data-nav-item="${item.id}" class="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            isActive ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }">
            <i data-lucide="${item.icon}" class="w-5 h-5"></i>
            <span class="text-[10px] tracking-tight">${escapeHtml(item.label)}</span>
          </button>`;
      })
      .join('');

    container.innerHTML = `
      <header class="sticky top-0 z-40 bg-[#FAF7F2]/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <button type="button" data-toggle-mobile class="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer" aria-label="Toggle navigation menu">
              <i data-lucide="${mobileMenuOpen ? 'x' : 'menu'}" class="w-5 h-5"></i>
            </button>
            <a href="#dashboard" data-logo-click class="flex items-center gap-2.5 group cursor-pointer whitespace-nowrap shrink-0 select-none" title="BORAH — Productivity & Life Management Platform">
              <div class="w-9 h-9 rounded-xl borah-btn-sage flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
                <i data-lucide="layers" class="w-4 h-4"></i>
              </div>
              <div class="flex flex-col">
                <span class="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100 font-serif leading-none">BORAH</span>
                <span class="text-[10px] text-slate-500 dark:text-slate-400 tracking-tight hidden sm:inline">Activity, Productivity &amp; Life Workspace</span>
              </div>
            </a>
          </div>

          <div class="hidden md:flex items-center gap-2 flex-1 max-w-md mx-4">
            <button type="button" data-open-search class="w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-slate-400 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs transition-all cursor-pointer">
              <div class="flex items-center gap-2">
                <i data-lucide="search" class="w-3.5 h-3.5 text-emerald-600"></i>
                <span>Search activities, tasks, meetings, notes...</span>
              </div>
              <kbd class="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 font-mono">Ctrl+K</kbd>
            </button>
          </div>

          <div class="flex items-center gap-2 sm:gap-3 shrink-0">
            <button type="button" data-open-search class="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer" title="Search">
              <i data-lucide="search" class="w-4 h-4"></i>
            </button>
            <button type="button" data-nav-item="notifications" class="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer" title="Notifications">
              <i data-lucide="bell" class="w-4 h-4"></i>
              ${unreadCount > 0 ? `<span class="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500"></span>` : ''}
            </button>
            <button type="button" data-toggle-dark class="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer" title="Toggle Dark Mode">
              <i data-lucide="${isDark ? 'sun' : 'moon'}" class="w-4 h-4 ${isDark ? 'text-amber-400' : 'text-slate-600'}"></i>
            </button>
            <button type="button" data-quick-activity class="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold borah-btn-sage active:scale-95 rounded-xl transition-all shadow-sm cursor-pointer whitespace-nowrap">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>Log Activity</span>
            </button>
            <div class="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <button type="button" data-nav-item="settings" class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shadow-xs hover:ring-2 hover:ring-emerald-500 transition-all cursor-pointer" title="${escapeHtml(user?.name || 'My Profile')}">
                ${escapeHtml(userInitial)}
              </button>
            </div>
          </div>
        </div>
      </header>

      <aside class="hidden lg:flex fixed left-0 top-16 bottom-0 w-64 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-r border-slate-200/80 dark:border-slate-800 flex-col justify-between p-3.5 z-30 transition-colors overflow-y-auto">
        <div class="space-y-2 pb-4">
          ${desktopGroupsHtml}
        </div>
        <div class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 shrink-0">
          <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
            <div class="flex items-center gap-2 overflow-hidden">
              <div class="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 flex items-center justify-center font-bold text-xs shrink-0">
                ${escapeHtml(userInitial)}
              </div>
              <div class="truncate">
                <div class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">${escapeHtml(user?.name || '')}</div>
                <div class="text-[10px] text-slate-400 truncate">${escapeHtml(user?.job_title || user?.email || '')}</div>
              </div>
            </div>
            <button type="button" data-logout class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer" title="Sign Out">
              <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
            </button>
          </div>
          <div class="flex items-center justify-between text-[10px] text-slate-400 px-3">
            <span class="flex items-center gap-1"><i data-lucide="shield-check" class="w-3 h-3 text-emerald-600"></i> Private Workspace</span>
            <span class="tabular-nums">BORAH v2.0</span>
          </div>
        </div>
      </aside>

      ${mobileMenuOpen ? `
        <div class="lg:hidden fixed inset-0 z-45 bg-black/40 backdrop-blur-xs flex">
          <div class="w-72 bg-white dark:bg-slate-900 h-full p-4 shadow-2xl flex flex-col justify-between border-r border-slate-200 dark:border-slate-800 overflow-y-auto">
            <div>
              <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-xl borah-btn-sage flex items-center justify-center text-white">
                    <i data-lucide="layers" class="w-4 h-4"></i>
                  </div>
                  <span class="font-bold text-lg text-slate-800 dark:text-slate-100 font-serif">BORAH</span>
                </div>
                <button type="button" data-close-mobile class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                  <i data-lucide="x" class="w-5 h-5"></i>
                </button>
              </div>
              <div class="space-y-1 pb-4">${mobileGroupsHtml}</div>
            </div>
            <div class="pt-3 border-t border-slate-100 dark:border-slate-800">
              <button type="button" data-logout class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 cursor-pointer">
                <i data-lucide="log-out" class="w-4 h-4"></i> Sign Out
              </button>
            </div>
          </div>
          <div class="flex-1" data-close-mobile></div>
        </div>` : ''}

      <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 py-1.5 px-2 flex items-center justify-around shadow-lg">
        ${bottomBarHtml}
      </nav>
    `;

    renderIcons(container);

    container.querySelector('[data-toggle-mobile]')?.addEventListener('click', () => {
      mobileMenuOpen = !mobileMenuOpen;
      render();
    });
    container.querySelectorAll('[data-close-mobile]').forEach((el) => {
      el.addEventListener('click', () => {
        mobileMenuOpen = false;
        render();
      });
    });
    container.querySelector('[data-logo-click]')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (onOpenPurpleUniverse) EasterEggManager.handleLogoTap(onOpenPurpleUniverse);
      setActiveTab('dashboard');
    });
    container.querySelectorAll('[data-open-search]').forEach((btn) => {
      btn.addEventListener('click', onOpenSearch);
    });
    container.querySelector('[data-toggle-dark]')?.addEventListener('click', () => {
      if (!store.settings) return;
      updateSettings({ dark_mode: !store.settings.dark_mode });
    });
    container.querySelector('[data-quick-activity]')?.addEventListener('click', onQuickNewActivity);
    container.querySelectorAll('[data-nav-item]').forEach((btn) => {
      btn.addEventListener('click', () => setActiveTab(btn.getAttribute('data-nav-item')));
    });
    container.querySelectorAll('[data-mobile-nav-item]').forEach((btn) => {
      btn.addEventListener('click', () => {
        mobileMenuOpen = false;
        setActiveTab(btn.getAttribute('data-mobile-nav-item'));
      });
    });
    container.querySelectorAll('[data-logout]').forEach((btn) => {
      btn.addEventListener('click', () => {
        mobileMenuOpen = false;
        logout();
      });
    });
  };

  render();
}

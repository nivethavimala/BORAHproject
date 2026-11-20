import { store, updateSettings, logout } from '../state.js';
import { EasterEggManager } from '../utils/easterEggs.js';
import { escapeHtml, renderIcons } from '../utils/dom.js';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Home', icon: 'home' },
  { id: 'journal', label: 'Journal', icon: 'book-open' },
  { id: 'planner', label: 'Planner', icon: 'calendar' },
  { id: 'tasks', label: 'Tasks', icon: 'check-square' },
  { id: 'notes', label: 'Notes', icon: 'sticky-note' },
  { id: 'insights', label: 'Insights', icon: 'bar-chart-2' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export function renderNavigation(container, { activeTab, setActiveTab, onOpenSearch, onQuickNewEntry, onOpenPurpleUniverse }) {
  let mobileMenuOpen = false;

  const render = () => {
    const user = store.user;
    const settings = store.settings;
    const isDark = !!settings?.dark_mode;
    const userInitial = user?.name ? user.name[0].toUpperCase() : 'L';

    const desktopItemsHtml = NAV_ITEMS.map((item) => {
      const isActive = activeTab === item.id;
      return `
        <button type="button" data-nav-item="${item.id}" class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all text-left cursor-pointer ${
          isActive
            ? 'bg-amber-100/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-semibold shadow-xs'
            : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
        }">
          <i data-lucide="${item.icon}" class="w-4 h-4 shrink-0 transition-transform ${
            isActive ? 'text-amber-600 dark:text-amber-400 scale-110' : 'text-slate-400'
          }"></i>
          <span class="truncate">${escapeHtml(item.label)}</span>
        </button>`;
    }).join('');

    const mobileDrawerItemsHtml = NAV_ITEMS.map((item) => {
      const isActive = activeTab === item.id;
      return `
        <button type="button" data-mobile-nav-item="${item.id}" class="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-medium transition-colors text-left cursor-pointer ${
          isActive
            ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-semibold'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
        }">
          <i data-lucide="${item.icon}" class="w-4 h-4 ${isActive ? 'text-amber-600' : 'text-slate-400'}"></i>
          <span>${escapeHtml(item.label)}</span>
        </button>`;
    }).join('');

    const bottomBarHtml = NAV_ITEMS.slice(0, 5)
      .map((item) => {
        const isActive = activeTab === item.id;
        return `
          <button type="button" data-nav-item="${item.id}" class="flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            isActive ? 'text-amber-600 dark:text-amber-400 font-semibold scale-105' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }">
            <i data-lucide="${item.icon}" class="w-5 h-5"></i>
            <span class="text-[10px] tracking-tight">${escapeHtml(item.label)}</span>
          </button>`;
      })
      .join('');

    container.innerHTML = `
      <header class="sticky top-0 z-40 bg-[#FAF7F2]/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-amber-900/10 dark:border-slate-800 transition-colors">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          <div class="flex items-center gap-3">
            <button type="button" data-toggle-mobile class="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer" aria-label="Toggle navigation menu">
              <i data-lucide="${mobileMenuOpen ? 'x' : 'menu'}" class="w-5 h-5"></i>
            </button>
            <a href="#home" data-logo-click class="flex items-center gap-2 group cursor-pointer whitespace-nowrap shrink-0 select-none" title="BORAH — Your space, your story, your moments.">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-violet-500 to-amber-400 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105 active:scale-95">
                <i data-lucide="sparkles" class="w-4 h-4"></i>
              </div>
              <div class="flex flex-col">
                <span class="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-serif leading-none">BORAH</span>
                <span class="text-[10px] text-slate-400 dark:text-slate-500 tracking-tight hidden sm:inline">Your space, your story</span>
              </div>
            </a>
          </div>

          <div class="hidden md:flex items-center gap-2 flex-1 max-w-md mx-4">
            <button type="button" data-open-search class="w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-slate-400 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs transition-all cursor-pointer">
              <div class="flex items-center gap-2">
                <i data-lucide="search" class="w-3.5 h-3.5 text-amber-500"></i>
                <span>Search journals, memories, tasks...</span>
              </div>
              <kbd class="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 font-mono">⌘K</kbd>
            </button>
          </div>

          <div class="flex items-center gap-3 shrink-0">
            <button type="button" data-open-search class="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer" title="Search">
              <i data-lucide="search" class="w-4 h-4"></i>
            </button>
            <button type="button" data-toggle-dark class="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer" title="Toggle Day/Night">
              <i data-lucide="${isDark ? 'sun' : 'moon'}" class="w-4 h-4 ${isDark ? 'text-amber-400' : 'text-slate-600'}"></i>
            </button>
            <button type="button" data-quick-entry class="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-xl transition-all shadow-sm cursor-pointer whitespace-nowrap">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>Write Entry</span>
            </button>
            <div class="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <button type="button" data-nav-item="settings" class="w-8 h-8 rounded-full bg-amber-100 dark:bg-slate-800 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs shadow-xs hover:ring-2 hover:ring-amber-400 transition-all cursor-pointer" title="${escapeHtml(user?.name || 'My Profile')}">
                ${escapeHtml(userInitial)}
              </button>
            </div>
          </div>
        </div>
      </header>

      <aside class="hidden lg:flex fixed left-0 top-16 bottom-0 w-64 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-r border-amber-900/10 dark:border-slate-800 flex-col justify-between p-4 z-30 transition-colors">
        <div class="space-y-1">
          <div class="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase font-sans">Personal Sanctuary</div>
          ${desktopItemsHtml}
        </div>
        <div class="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50/50 dark:bg-slate-800/50 border border-amber-100/60 dark:border-slate-800">
            <div class="flex items-center gap-2 overflow-hidden">
              <div class="w-7 h-7 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 flex items-center justify-center font-bold text-xs shrink-0">
                ${escapeHtml(user?.name ? user.name[0].toUpperCase() : 'U')}
              </div>
              <div class="truncate">
                <div class="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">${escapeHtml(user?.name || '')}</div>
                <div class="text-[10px] text-slate-400 truncate">${escapeHtml(user?.email || '')}</div>
              </div>
            </div>
            <button type="button" data-logout class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer" title="Sign Out">
              <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
            </button>
          </div>
          <div class="flex items-center justify-between text-[11px] text-slate-400 px-3">
            <span class="flex items-center gap-1"><i data-lucide="shield" class="w-3 h-3 text-emerald-500"></i> Private Space</span>
            <span class="tabular-nums">v1.0</span>
          </div>
        </div>
      </aside>

      ${mobileMenuOpen ? `
        <div class="lg:hidden fixed inset-0 z-45 bg-black/40 backdrop-blur-xs flex">
          <div class="w-72 bg-white dark:bg-slate-900 h-full p-5 shadow-2xl flex flex-col justify-between border-r border-slate-200 dark:border-slate-800 animate-in slide-in-from-left duration-200">
            <div>
              <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-400 flex items-center justify-center text-white">
                    <i data-lucide="sparkles" class="w-4 h-4"></i>
                  </div>
                  <span class="font-bold text-lg text-slate-800 dark:text-slate-100 font-serif">BORAH</span>
                </div>
                <button type="button" data-close-mobile class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
                  <i data-lucide="x" class="w-5 h-5"></i>
                </button>
              </div>
              <div class="space-y-1">${mobileDrawerItemsHtml}</div>
            </div>
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <button type="button" data-logout class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 cursor-pointer">
                <i data-lucide="log-out" class="w-4 h-4"></i> Sign Out
              </button>
            </div>
          </div>
          <div class="flex-1" data-close-mobile></div>
        </div>` : ''}

      <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 py-2 px-3 flex items-center justify-around shadow-lg">
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
    container.querySelector('[data-quick-entry]')?.addEventListener('click', onQuickNewEntry);
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

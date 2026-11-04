import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  BookOpen,
  Calendar,
  CheckSquare,
  StickyNote,
  BarChart2,
  Settings,
  Search,
  Plus,
  Moon,
  Sun,
  Menu,
  X,
  Sparkles,
  LogOut,
  Shield,
} from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSearch: () => void;
  onQuickNewEntry: () => void;
  onOpenPurpleUniverse?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  onOpenSearch,
  onQuickNewEntry,
  onOpenPurpleUniverse,
}) => {
  const { user, settings, updateSettings, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenPurpleUniverse) {
      import('../utils/easterEggManager').then(({ EasterEggManager }) => {
        EasterEggManager.handleLogoTap(onOpenPurpleUniverse);
      });
    }
    setActiveTab('dashboard');
  };

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'journal', label: 'Journal', icon: BookOpen },
    { id: 'planner', label: 'Planner', icon: Calendar },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'notes', label: 'Notes', icon: StickyNote },
    { id: 'insights', label: 'Insights', icon: BarChart2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const toggleDarkMode = () => {
    if (!settings) return;
    const isDark = !settings.dark_mode;
    updateSettings({ dark_mode: isDark });
  };

  return (
    <>
      {/* Top Bar for Desktop and Mobile (adhering to Top Bar Contract) */}
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-amber-900/10 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <a
              href="#home"
              onClick={handleLogoClick}
              className="flex items-center gap-2 group cursor-pointer whitespace-nowrap shrink-0 select-none"
              title="BORAH — Your space, your story, your moments."
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-violet-500 to-amber-400 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105 active:scale-95">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-serif leading-none">
                  BORAH
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 tracking-tight hidden sm:inline">
                  Your space, your story
                </span>
              </div>
            </a>
          </div>

          {/* Zone 2: Navigation Links & Search (Quick Search Affordance) */}
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-4">
            <button
              type="button"
              onClick={onOpenSearch}
              className="w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-slate-400 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-amber-500" />
                <span>Search journals, memories, tasks...</span>
              </div>
              <kbd className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Zone 3: Primary Action & Profile Controls */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenSearch}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleDarkMode}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Toggle Day/Night"
            >
              {settings?.dark_mode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            <button
              type="button"
              onClick={onQuickNewEntry}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-xl transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Write Entry</span>
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="w-8 h-8 rounded-full bg-amber-100 dark:bg-slate-800 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs shadow-xs hover:ring-2 hover:ring-amber-400 transition-all cursor-pointer"
                title={user?.name || 'My Profile'}
              >
                {user?.name ? user.name[0].toUpperCase() : 'L'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar (Notebook spine aesthetic) */}
      <aside className="hidden lg:flex fixed left-0 top-16 bottom-0 w-64 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-r border-amber-900/10 dark:border-slate-800 flex-col justify-between p-4 z-30 transition-colors">
        <div className="space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase font-sans">
            Personal Sanctuary
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-amber-100/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    isActive ? 'text-amber-600 dark:text-amber-400 scale-110' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom User Card in Sidebar */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50/50 dark:bg-slate-800/50 border border-amber-100/60 dark:border-slate-800">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 flex items-center justify-center font-bold text-xs shrink-0">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="truncate">
                <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{user?.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-3">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-500" /> Private Space
            </span>
            <span className="tabular-nums">v1.0</span>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-45 bg-black/40 backdrop-blur-xs flex">
          <div className="w-72 bg-white dark:bg-slate-900 h-full p-5 shadow-2xl flex flex-col justify-between border-r border-slate-200 dark:border-slate-800 animate-in slide-in-from-left duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-400 flex items-center justify-center text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-lg text-slate-800 dark:text-slate-100 font-serif">BORAH</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-medium transition-colors text-left cursor-pointer ${
                        isActive
                          ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-semibold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <button
                type="button"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 py-2 px-3 flex items-center justify-around shadow-lg">
        {[
          { id: 'dashboard', label: 'Home', icon: Home },
          { id: 'journal', label: 'Journal', icon: BookOpen },
          { id: 'planner', label: 'Planner', icon: Calendar },
          { id: 'tasks', label: 'Tasks', icon: CheckSquare },
          { id: 'notes', label: 'Notes', icon: StickyNote },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-amber-600 dark:text-amber-400 font-semibold scale-105'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};

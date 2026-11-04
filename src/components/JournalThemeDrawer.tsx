import React, { useState } from 'react';
import { Check, X, Sparkles, Crown } from 'lucide-react';

export interface WallpaperTheme {
  id: string;
  name: string;
  category: 'Popular' | 'Dark' | 'Artsy' | 'Cute' | 'Light' | 'Customize';
  previewBg: string;
  cardStyle: string;
  canvasClass: string;
  isVip?: boolean;
}

export const WALLPAPER_THEMES: WallpaperTheme[] = [
  {
    id: 'original',
    name: 'Original',
    category: 'Popular',
    previewBg: 'bg-white border-2 border-dashed border-gray-300',
    cardStyle: 'bg-white text-gray-800',
    canvasClass: 'bg-white border border-gray-100 text-gray-800 shadow-sm',
  },
  {
    id: 'autumn-leaves',
    name: 'Autumn Foliage',
    category: 'Popular',
    previewBg: 'bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 border-2 border-amber-300',
    cardStyle: 'bg-amber-50/90 text-amber-950 border-amber-200',
    canvasClass: 'bg-[#FFFBEB] text-[#451A03] border-2 border-[#FDE68A] shadow-md relative overflow-hidden',
    isVip: true,
  },
  {
    id: 'cozy-tea',
    name: 'Afternoon Tea',
    category: 'Cute',
    previewBg: 'bg-gradient-to-b from-orange-50 to-amber-100 border border-orange-200',
    cardStyle: 'bg-orange-50/90 text-stone-800',
    canvasClass: 'bg-[#FFF7ED] text-[#431407] border-2 border-[#FED7AA] shadow-sm',
    isVip: true,
  },
  {
    id: 'rainy-window',
    name: 'Rainy Twilight',
    category: 'Dark',
    previewBg: 'bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 border border-slate-700',
    cardStyle: 'bg-slate-900 text-slate-100',
    canvasClass: 'bg-[#0F172A] text-[#F1F5F9] border border-[#334155] shadow-xl',
    isVip: true,
  },
  {
    id: 'golden-stars',
    name: 'Golden Stars',
    category: 'Artsy',
    previewBg: 'bg-gradient-to-b from-amber-100 via-yellow-50 to-white border-2 border-yellow-300',
    cardStyle: 'bg-yellow-50/90 text-yellow-950',
    canvasClass: 'bg-[#FEFCE8] text-[#713F12] border-2 border-[#FEF08A] shadow-md',
    isVip: true,
  },
  {
    id: 'cozy-sofa',
    name: 'Living Room',
    category: 'Cute',
    previewBg: 'bg-gradient-to-b from-cyan-50 via-sky-50 to-blue-100 border border-cyan-200',
    cardStyle: 'bg-sky-50 text-cyan-950',
    canvasClass: 'bg-[#F0F9FF] text-[#082F49] border-2 border-[#BAE6FD] shadow-sm',
    isVip: true,
  },
  {
    id: 'friends-chat',
    name: 'Cafe Afternoon',
    category: 'Cute',
    previewBg: 'bg-gradient-to-b from-rose-50 via-amber-50 to-orange-50 border border-rose-200',
    cardStyle: 'bg-rose-50 text-stone-800',
    canvasClass: 'bg-[#FFF1F2] text-[#4C0519] border-2 border-[#FECDD3] shadow-sm',
    isVip: true,
  },
  {
    id: 'winter-cabin',
    name: 'Snowy Cabin',
    category: 'Dark',
    previewBg: 'bg-gradient-to-b from-blue-950 via-slate-900 to-indigo-950 border border-blue-800',
    cardStyle: 'bg-blue-950 text-sky-100',
    canvasClass: 'bg-[#172554] text-[#EFF6FF] border border-[#1E40AF] shadow-xl',
    isVip: true,
  },
  {
    id: 'minimal-navy',
    name: 'Navy & Gold',
    category: 'Artsy',
    previewBg: 'bg-gradient-to-br from-blue-900 via-indigo-950 to-yellow-500 border border-blue-700',
    cardStyle: 'bg-blue-900 text-white',
    canvasClass: 'bg-[#1E3A8A] text-[#F8FAFC] border-2 border-[#F59E0B] shadow-lg',
  },
  {
    id: 'pastel-sky',
    name: 'Pastel Horizon',
    category: 'Light',
    previewBg: 'bg-gradient-to-b from-sky-200 via-indigo-100 to-purple-100 border border-indigo-200',
    cardStyle: 'bg-indigo-50 text-indigo-950',
    canvasClass: 'bg-gradient-to-b from-[#E0F2FE] via-[#EDE9FE] to-[#FCE7F3] text-[#312E81] border border-[#C7D2FE] shadow-md',
  },
  {
    id: 'starry-purple',
    name: 'Purple Cosmic',
    category: 'Dark',
    previewBg: 'bg-gradient-to-b from-purple-950 via-violet-900 to-fuchsia-950 border border-purple-700',
    cardStyle: 'bg-purple-950 text-purple-100',
    canvasClass: 'bg-[#3B0764] text-[#F3E8FF] border border-[#7E22CE] shadow-xl',
  },
  {
    id: 'bts-bora-glow',
    name: 'Borahae Galaxy 💜',
    category: 'Popular',
    previewBg: 'bg-gradient-to-br from-violet-600 via-purple-700 to-pink-500 border-2 border-purple-400',
    cardStyle: 'bg-purple-900 text-purple-50',
    canvasClass: 'bg-gradient-to-b from-[#4C1D95] via-[#581C87] to-[#701A75] text-[#FAF5FF] border-2 border-[#C084FC] shadow-2xl',
    isVip: true,
  },
];

interface JournalThemeDrawerProps {
  currentTheme: string;
  onSelectTheme: (themeId: string) => void;
  onClose: () => void;
}

export const JournalThemeDrawer: React.FC<JournalThemeDrawerProps> = ({
  currentTheme,
  onSelectTheme,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'Popular' | 'Dark' | 'Artsy' | 'Cute' | 'Light' | 'Customize'>('Popular');

  const tabs: Array<'Popular' | 'Dark' | 'Artsy' | 'Cute' | 'Light' | 'Customize'> = [
    'Popular',
    'Dark',
    'Artsy',
    'Cute',
    'Light',
    'Customize',
  ];

  const filteredThemes = activeTab === 'Customize'
    ? WALLPAPER_THEMES
    : WALLPAPER_THEMES.filter((t) => t.category === activeTab || t.id === 'original');

  return (
    <div className="bg-white rounded-t-3xl shadow-2xl border-t border-purple-100 p-4 sm:p-6 animate-in slide-in-from-bottom duration-300">
      {/* Top Header with Category Tabs & Confirm */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
        <div className="flex items-center gap-1 sm:gap-4 overflow-x-auto no-scrollbar py-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all relative ${
                activeTab === tab
                  ? 'text-sky-600 font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-sky-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors shrink-0 ml-2"
          title="Apply & Close"
        >
          <Check size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Grid of Wallpapers matching Image 1 */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4 max-h-64 overflow-y-auto pr-1">
        {filteredThemes.map((theme) => {
          const isSelected = currentTheme === theme.id;
          return (
            <div
              key={theme.id}
              onClick={() => onSelectTheme(theme.id)}
              className={`group relative flex flex-col items-center justify-between p-2 rounded-2xl cursor-pointer transition-all duration-200 h-32 sm:h-36 ${
                theme.previewBg
              } ${
                isSelected
                  ? 'ring-3 ring-sky-500 ring-offset-2 scale-102 shadow-md'
                  : 'hover:scale-102 shadow-sm hover:shadow'
              }`}
            >
              {/* VIP Crown Badge if special */}
              {theme.isVip && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center shadow-xs text-[10px]">
                  <Crown size={11} className="fill-amber-950" />
                </div>
              )}

              {/* Decorative mini graphic per theme */}
              <div className="flex-1 w-full flex items-center justify-center">
                {theme.id === 'original' && (
                  <span className="text-gray-400 font-medium text-xs">⊘ Plain</span>
                )}
                {theme.id === 'autumn-leaves' && (
                  <div className="text-xl">🍂 🍁</div>
                )}
                {theme.id === 'cozy-tea' && (
                  <div className="text-xl">🫖 🍪</div>
                )}
                {theme.id === 'rainy-window' && (
                  <div className="text-xl">🌧️ 🪟</div>
                )}
                {theme.id === 'golden-stars' && (
                  <div className="text-xl">✨ ⭐</div>
                )}
                {theme.id === 'cozy-sofa' && (
                  <div className="text-xl">🛋️ 🪴</div>
                )}
                {theme.id === 'friends-chat' && (
                  <div className="text-xl">☕ 👭</div>
                )}
                {theme.id === 'winter-cabin' && (
                  <div className="text-xl">❄️ 🏡</div>
                )}
                {theme.id === 'minimal-navy' && (
                  <div className="text-xl">📐 🌙</div>
                )}
                {theme.id === 'pastel-sky' && (
                  <div className="text-xl">☁️ 🌙</div>
                )}
                {theme.id === 'starry-purple' && (
                  <div className="text-xl">🪐 ✨</div>
                )}
                {theme.id === 'bts-bora-glow' && (
                  <div className="text-xl">💜 🐳</div>
                )}
              </div>

              {/* Theme Name Label */}
              <span
                className={`text-[11px] font-medium text-center line-clamp-1 px-1 py-0.5 rounded-md ${
                  theme.cardStyle.includes('text-white') || theme.cardStyle.includes('text-sky-100') || theme.cardStyle.includes('text-purple-100')
                    ? 'bg-black/40 text-white'
                    : 'bg-white/70 text-gray-800'
                }`}
              >
                {theme.name}
              </span>

              {/* Checkmark overlay if selected */}
              {isSelected && (
                <div className="absolute inset-0 bg-sky-500/20 rounded-2xl flex items-center justify-center backdrop-blur-[1px]">
                  <div className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center shadow">
                    <Check size={14} strokeWidth={3} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

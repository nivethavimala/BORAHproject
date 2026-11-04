import React, { useState } from 'react';
import { Check, Plus } from 'lucide-react';

interface StickerCategory {
  id: string;
  icon: string;
  stickers: string[];
}

const STICKER_CATEGORIES: StickerCategory[] = [
  {
    id: 'hearts',
    icon: '💛',
    stickers: [
      '💛💛💛',
      '💖',
      '💜',
      '🎈',
      '😍',
      '💌',
      '💔',
      '🥰',
      '💐',
      '🌸',
      '🦋',
      '✨',
      '💕',
      '❤️',
      '🕊️',
    ],
  },
  {
    id: 'weather',
    icon: '☀️',
    stickers: [
      '🌈',
      '☀️',
      '🌧️',
      '❄️',
      '💧',
      '🌪️',
      '☁️',
      '🌙',
      '🪐',
      '⭐',
      '⚡',
      '⛅',
      '🌊',
      '🍂',
    ],
  },
  {
    id: 'cute',
    icon: '🐱',
    stickers: [
      '🐱',
      '🐰',
      '🧸',
      '🐧',
      '🐶',
      '🐳',
      '🐹',
      '🐼',
      '🐥',
      '🦄',
      '💩',
      '🐸',
      '🦊',
      '🐨',
    ],
  },
  {
    id: 'art',
    icon: '🖌️',
    stickers: [
      '🎨',
      '🎀',
      '📷',
      '🪄',
      '🕯️',
      '🔮',
      '👑',
      '💎',
      '🎵',
      '🎪',
      '🎠',
      '🪞',
      '🩰',
    ],
  },
  {
    id: 'stationery',
    icon: '✏️',
    stickers: [
      '📚',
      '📝',
      '📎',
      '📌',
      '🔖',
      '📮',
      '🖋️',
      '📏',
      '📐',
      '✂️',
      '🎒',
      '💡',
    ],
  },
  {
    id: 'lifestyle',
    icon: '🧺',
    stickers: [
      '☕',
      '🫖',
      '🎂',
      '🍓',
      '🥐',
      '🧋',
      '🧁',
      '🍕',
      '🥞',
      '🪴',
      '🌷',
      '🌻',
      '🌿',
      '🍪',
    ],
  },
];

interface JournalStickerDrawerProps {
  onSelectSticker: (sticker: string) => void;
  onClose: () => void;
}

export const JournalStickerDrawer: React.FC<JournalStickerDrawerProps> = ({
  onSelectSticker,
  onClose,
}) => {
  const [activeCategoryId, setActiveCategoryId] = useState('hearts');
  const [customInput, setCustomInput] = useState('');
  const [showAddCustom, setShowAddCustom] = useState(false);

  const activeCategory =
    STICKER_CATEGORIES.find((c) => c.id === activeCategoryId) || STICKER_CATEGORIES[0];

  const handleAddCustomSticker = () => {
    if (customInput.trim()) {
      onSelectSticker(customInput.trim());
      setCustomInput('');
      setShowAddCustom(false);
    }
  };

  return (
    <div className="bg-white rounded-t-3xl shadow-2xl border-t border-purple-100 p-4 sm:p-6 animate-in slide-in-from-bottom duration-300">
      {/* Category Icons Header matching Screen 2 */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
        <div className="flex items-center gap-3 sm:gap-6 overflow-x-auto no-scrollbar py-1">
          {STICKER_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              className={`p-2 rounded-xl text-lg sm:text-xl transition-all relative ${
                activeCategoryId === cat.id
                  ? 'bg-sky-50 scale-110 shadow-xs'
                  : 'hover:bg-gray-50 opacity-70 hover:opacity-100'
              }`}
            >
              <span>{cat.icon}</span>
              {activeCategoryId === cat.id && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-sky-500 rounded-full" />
              )}
            </button>
          ))}

          {/* Plus with red dot for custom sticker */}
          <button
            onClick={() => setShowAddCustom(!showAddCustom)}
            className="relative p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
            title="Add Custom Sticker"
          >
            <Plus size={18} />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
          </button>
        </div>

        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors shrink-0 ml-2"
          title="Apply & Close"
        >
          <Check size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Custom Sticker Input Bar */}
      {showAddCustom && (
        <div className="flex items-center gap-2 mb-4 bg-purple-50 p-2.5 rounded-xl border border-purple-100 animate-in fade-in">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Type any emoji, symbol, or badge (e.g. 💜, 🌟, 🌺)..."
            className="flex-1 text-sm bg-white border border-purple-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400"
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomSticker()}
          />
          <button
            onClick={handleAddCustomSticker}
            className="bg-purple-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-purple-700"
          >
            Place
          </button>
        </div>
      )}

      {/* Sticker Grid matching Screen 2 */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 sm:gap-4 max-h-56 overflow-y-auto p-1">
        {activeCategory.stickers.map((sticker, idx) => (
          <button
            key={idx}
            onClick={() => onSelectSticker(sticker)}
            className="flex items-center justify-center h-14 sm:h-16 rounded-2xl bg-gray-50/80 hover:bg-purple-50 hover:scale-115 active:scale-95 transition-all text-2xl sm:text-3xl shadow-2xs hover:shadow-md cursor-pointer border border-transparent hover:border-purple-200"
          >
            <span>{sticker}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

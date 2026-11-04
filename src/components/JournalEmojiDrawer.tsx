import React, { useState } from 'react';
import { Check } from 'lucide-react';

interface EmojiCategory {
  id: string;
  icon: string;
  emojis: string[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    icon: '😄',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
      '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
      '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
      '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
      '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
      '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
      '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯',
      '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁',
      '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨',
      '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞',
      '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬',
      '😈', '👿', '💀', '💩', '🤡', '👻', '👽', '👾',
    ],
  },
  {
    id: 'nature',
    icon: '⛄',
    emojis: [
      '⛄', '❄️', '🌨️', '☁️', '⛅', '🌤️', '☀️', '🌈',
      '🌸', '🌺', '🌹', '🌷', '🌻', '🌼', '💐', '🌾',
      '🌿', '🍀', '🌱', '🍃', '🍂', '🍁', '🍄', '🌳',
      '🌲', '🌴', '🌵', '🌊', '🌙', '⭐', '🌟', '✨',
    ],
  },
  {
    id: 'love',
    icon: '💖',
    emojis: [
      '💖', '💜', '💙', '💚', '💛', '🧡', '❤️', '🖤',
      '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗',
      '💘', '💝', '💌', '💟', '🏩', '💒', '💐', '💋',
    ],
  },
  {
    id: 'animals',
    icon: '🐧',
    emojis: [
      '🐧', '🐰', '🐱', '🐶', '🦊', '🐻', '🐼', '🐨',
      '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐣', '🐥',
      '🦆', '🦅', '🦉', '🦇', '🦋', '🐝', '🐞', '🐳',
    ],
  },
  {
    id: 'study',
    icon: '📚',
    emojis: [
      '📚', '📖', '📝', '✏️', '🎨', '🎹', '🎸', '🎧',
      '🎤', '🎬', '📷', '💡', '⏰', '📅', '🎁', '🎈',
    ],
  },
  {
    id: 'food',
    icon: '🍔',
    emojis: [
      '🍔', '🍟', '🍕', '🍰', '🎂', '🧁', '🍦', '🍩',
      '🍪', '🍫', '🍬', '🍭', '🍓', '🍒', '🍎', '☕',
      '🧋', '🍵', '🧃', '🥤', '🥞', '🥐', '🍞', '🥨',
    ],
  },
  {
    id: 'expressions',
    icon: '😋',
    emojis: [
      '😋', '🤤', '🥺', '✨', '🔥', '💯', '👏', '🙌',
      '🤝', '🫶', '👐', '✌️', '🤞', '🤙', '🫰', '💜',
    ],
  },
];

interface JournalEmojiDrawerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

export const JournalEmojiDrawer: React.FC<JournalEmojiDrawerProps> = ({
  onSelectEmoji,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState('smileys');

  const currentCategory =
    EMOJI_CATEGORIES.find((c) => c.id === activeTab) || EMOJI_CATEGORIES[0];

  return (
    <div className="bg-white rounded-t-3xl shadow-2xl border-t border-purple-100 p-4 sm:p-6 animate-in slide-in-from-bottom duration-300">
      {/* Category Icons Header matching Screen 3 */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
        <div className="flex items-center gap-3 sm:gap-6 overflow-x-auto no-scrollbar py-1">
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`p-2 rounded-xl text-lg sm:text-xl transition-all relative ${
                activeTab === cat.id
                  ? 'bg-sky-50 scale-110 shadow-xs'
                  : 'hover:bg-gray-50 opacity-70 hover:opacity-100'
              }`}
            >
              <span>{cat.icon}</span>
              {activeTab === cat.id && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-sky-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors shrink-0 ml-2"
          title="Done"
        >
          <Check size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Emoji Grid matching Screen 3 */}
      <div className="grid grid-cols-7 sm:grid-cols-9 md:grid-cols-12 gap-2 sm:gap-3 max-h-56 overflow-y-auto p-1 text-center">
        {currentCategory.emojis.map((emoji, idx) => (
          <button
            key={idx}
            onClick={() => onSelectEmoji(emoji)}
            className="flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-xl hover:bg-purple-50 hover:scale-120 active:scale-90 transition-all text-2xl cursor-pointer"
          >
            <span>{emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

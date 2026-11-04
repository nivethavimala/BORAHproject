import React from 'react';
import { Check } from 'lucide-react';

export interface ListStyleItem {
  id: string;
  name: string;
  bullet: string;
}

export const LIST_STYLES: ListStyleItem[] = [
  { id: 'check', name: 'Task Check', bullet: '✓' },
  { id: 'flower', name: 'Cherry Blossom', bullet: '🌸' },
  { id: 'cloud', name: 'Fluffy Cloud', bullet: '☁️' },
  { id: 'heart', name: 'Sweet Heart', bullet: '❤️' },
  { id: 'sprout', name: 'Fresh Sprout', bullet: '🌱' },
  { id: 'rainbow', name: 'Rainbow', bullet: '🌈' },
  { id: 'snowflake', name: 'Snowflake', bullet: '❄️' },
  { id: 'diamond', name: 'Diamond Point', bullet: '◆' },
  { id: 'triangle', name: 'Triangle', bullet: '▲' },
  { id: 'flag', name: 'Minimal Flag', bullet: '⚑' },
  { id: 'tulip', name: 'Spring Tulip', bullet: '🌷' },
  { id: 'soccer', name: 'Sports Ball', bullet: '⚽' },
  { id: 'alarm', name: 'Routine Clock', bullet: '⏰' },
  { id: 'apple', name: 'Sweet Apple', bullet: '🍏' },
  { id: 'sun', name: 'Sunshine', bullet: '☀️' },
];

interface JournalListDrawerProps {
  currentBulletStyle: string;
  onSelectBulletStyle: (bulletId: string, bulletChar: string) => void;
  onClose: () => void;
}

export const JournalListDrawer: React.FC<JournalListDrawerProps> = ({
  currentBulletStyle,
  onSelectBulletStyle,
  onClose,
}) => {
  return (
    <div className="bg-white rounded-t-3xl shadow-2xl border-t border-purple-100 p-4 sm:p-6 animate-in slide-in-from-bottom duration-300">
      {/* Title with Checkmark matching Screen 6 */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
        <h3 className="text-base sm:text-lg font-bold text-gray-800 tracking-tight font-serif">List</h3>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors shrink-0"
          title="Apply & Close"
        >
          <Check size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Grid of List Style Cards matching Screen 6 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-56 overflow-y-auto pr-1">
        {LIST_STYLES.map((item) => {
          const isSelected = currentBulletStyle === item.id;
          return (
            <div
              key={item.id}
              onClick={() => onSelectBulletStyle(item.id, item.bullet)}
              className={`p-3 rounded-2xl cursor-pointer transition-all duration-200 border flex flex-col justify-between h-20 ${
                isSelected
                  ? 'border-2 border-sky-500 bg-sky-50/50 shadow-xs ring-2 ring-sky-200'
                  : 'border-gray-200 bg-gray-50/60 hover:bg-gray-100 hover:border-gray-300'
              }`}
            >
              {/* Bullet Lines Preview matching Screen 6 mock */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{item.bullet}</span>
                  <div className="h-1.5 bg-gray-300/80 rounded-full w-14" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{item.bullet}</span>
                  <div className="h-1.5 bg-gray-300/80 rounded-full w-10" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{item.bullet}</span>
                  <div className="h-1.5 bg-gray-300/80 rounded-full w-16" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

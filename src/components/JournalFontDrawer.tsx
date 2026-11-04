import React from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Indent,
  Outdent,
  Check,
  Crown,
} from 'lucide-react';

export interface FontOption {
  id: string;
  name: string;
  fontFamilyCss: string;
  sampleClass: string;
  isVip?: boolean;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'default',
    name: 'Default',
    fontFamilyCss: 'sans-serif',
    sampleClass: 'font-sans',
  },
  {
    id: 'bold',
    name: 'Bold',
    fontFamilyCss: 'sans-serif',
    sampleClass: 'font-black tracking-tight',
  },
  {
    id: 'merriweather',
    name: 'Merriweather',
    fontFamilyCss: 'serif',
    sampleClass: 'font-serif',
    isVip: true,
  },
  {
    id: 'light',
    name: 'Light',
    fontFamilyCss: 'sans-serif',
    sampleClass: 'font-light tracking-wide',
  },
  {
    id: 'poly-italic',
    name: 'Poly Italic',
    fontFamilyCss: 'serif',
    sampleClass: 'font-serif italic font-medium',
  },
  {
    id: 'floane',
    name: 'Floane',
    fontFamilyCss: 'serif',
    sampleClass: 'font-serif tracking-widest uppercase text-xs font-semibold',
  },
  {
    id: 'cursive',
    name: 'Cursive',
    fontFamilyCss: 'cursive',
    sampleClass: 'italic font-serif tracking-wider',
  },
  {
    id: 'aileron',
    name: 'Aileron',
    fontFamilyCss: 'sans-serif',
    sampleClass: 'font-mono text-xs tracking-tight',
  },
];

export const COLOR_SWATCHES = [
  { id: 'default', label: 'Default', hex: 'inherit', isClear: true },
  { id: 'black', label: 'Black', hex: '#0F172A' },
  { id: 'charcoal', label: 'Charcoal', hex: '#475569' },
  { id: 'maroon', label: 'Maroon', hex: '#831843' },
  { id: 'berry', label: 'Berry', hex: '#9D174D' },
  { id: 'hotpink', label: 'Hot Pink', hex: '#E11D48' },
  { id: 'softpink', label: 'Soft Pink', hex: '#F472B6' },
  { id: 'royalpurple', label: 'Royal Purple', hex: '#6B21A8' },
  { id: 'violet', label: 'Violet', hex: '#9333EA' },
  { id: 'emerald', label: 'Emerald', hex: '#059669' },
  { id: 'skyblue', label: 'Sky Blue', hex: '#0284C7' },
  { id: 'gold', label: 'Gold', hex: '#D97706' },
];

interface JournalFontDrawerProps {
  currentFont: string;
  currentColor: string;
  currentSizePreset: string;
  currentAlign: string;
  onSelectFont: (fontId: string) => void;
  onSelectColor: (colorHex: string) => void;
  onSelectSizePreset: (preset: 'h1' | 'h2' | 'h3' | 'h4' | 'body') => void;
  onSelectAlign: (align: 'left' | 'center' | 'right') => void;
  onIndent: (direction: 'in' | 'out') => void;
  onClose: () => void;
}

export const JournalFontDrawer: React.FC<JournalFontDrawerProps> = ({
  currentFont,
  currentColor,
  currentSizePreset,
  currentAlign,
  onSelectFont,
  onSelectColor,
  onSelectSizePreset,
  onSelectAlign,
  onIndent,
  onClose,
}) => {
  return (
    <div className="bg-white rounded-t-3xl shadow-2xl border-t border-purple-100 p-4 sm:p-6 animate-in slide-in-from-bottom duration-300">
      {/* Title with Checkmark matching Screen 4 */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
        <h3 className="text-base sm:text-lg font-bold text-gray-800 tracking-tight font-serif">Font</h3>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors shrink-0"
          title="Apply & Close"
        >
          <Check size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Row 1: Alignment, Indentation, Headings (H1, H2, H3, H4) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        {/* Alignment */}
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => onSelectAlign('left')}
            className={`p-1.5 rounded-lg transition-colors ${
              currentAlign === 'left' ? 'bg-white shadow-xs text-sky-600 font-bold' : 'text-gray-500 hover:text-gray-800'
            }`}
            title="Align Left"
          >
            <AlignLeft size={16} />
          </button>
          <button
            onClick={() => onSelectAlign('center')}
            className={`p-1.5 rounded-lg transition-colors ${
              currentAlign === 'center' ? 'bg-white shadow-xs text-sky-600 font-bold' : 'text-gray-500 hover:text-gray-800'
            }`}
            title="Align Center"
          >
            <AlignCenter size={16} />
          </button>
          <button
            onClick={() => onSelectAlign('right')}
            className={`p-1.5 rounded-lg transition-colors ${
              currentAlign === 'right' ? 'bg-white shadow-xs text-sky-600 font-bold' : 'text-gray-500 hover:text-gray-800'
            }`}
            title="Align Right"
          >
            <AlignRight size={16} />
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <button
            onClick={() => onIndent('out')}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-white transition-colors"
            title="Outdent"
          >
            <Outdent size={16} />
          </button>
          <button
            onClick={() => onIndent('in')}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-white transition-colors"
            title="Indent"
          >
            <Indent size={16} />
          </button>
        </div>

        {/* Headings H1, H2, H3, H4 matching Screen 4 */}
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
          {(['h1', 'h2', 'h3', 'h4'] as const).map((h) => (
            <button
              key={h}
              onClick={() => onSelectSizePreset(h)}
              className={`px-2.5 py-1 text-xs font-bold uppercase rounded-lg transition-all ${
                currentSizePreset === h
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white'
              }`}
            >
              {h.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: Color Swatches matching Screen 4 */}
      <div className="mb-5">
        <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar py-2 px-1">
          {COLOR_SWATCHES.map((color) => {
            const isSelected = currentColor === color.hex || (color.isClear && currentColor === 'inherit');
            return (
              <button
                key={color.id}
                onClick={() => onSelectColor(color.hex)}
                className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full shrink-0 flex items-center justify-center transition-all ${
                  isSelected ? 'ring-3 ring-sky-500 ring-offset-2 scale-110 shadow-sm' : 'hover:scale-105'
                }`}
                style={{
                  backgroundColor: color.isClear ? '#F8FAFC' : color.hex,
                  border: color.isClear ? '2px dashed #94A3B8' : 'none',
                }}
                title={color.label}
              >
                {color.isClear ? (
                  <span className="text-gray-400 text-xs font-bold">⊘</span>
                ) : isSelected ? (
                  <Check size={14} className="text-white drop-shadow-xs" strokeWidth={3} />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 3: Font Family Cards matching Screen 4 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 max-h-48 overflow-y-auto pr-1">
        {FONT_OPTIONS.map((f) => {
          const isSelected = currentFont === f.id;
          return (
            <div
              key={f.id}
              onClick={() => onSelectFont(f.id)}
              className={`relative flex items-center justify-center p-3 rounded-2xl cursor-pointer transition-all duration-200 border ${
                isSelected
                  ? 'border-2 border-sky-500 bg-sky-50/50 shadow-xs'
                  : 'border-gray-200 bg-gray-50/60 hover:bg-gray-100 hover:border-gray-300'
              }`}
            >
              {f.isVip && (
                <div className="absolute top-1.5 right-1.5 text-amber-500">
                  <Crown size={12} className="fill-amber-400" />
                </div>
              )}
              <span className={`text-sm text-gray-800 ${f.sampleClass}`}>
                {f.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

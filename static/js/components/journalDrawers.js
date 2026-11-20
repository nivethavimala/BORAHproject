import { escapeHtml, renderIcons, sanitizeUrl } from '../utils/dom.js';

export const WALLPAPER_THEMES = [
  {
    id: 'original',
    name: 'Original',
    category: 'Popular',
    previewBg: 'bg-white border-2 border-dashed border-gray-300',
    cardStyle: 'bg-white text-gray-800',
    canvasClass: 'bg-white border border-gray-100 text-gray-800 shadow-sm',
    glyph: '⊘ Plain',
  },
  {
    id: 'autumn-leaves',
    name: 'Autumn Foliage',
    category: 'Popular',
    previewBg: 'bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 border-2 border-amber-300',
    cardStyle: 'bg-amber-50/90 text-amber-950 border-amber-200',
    canvasClass: 'bg-[#FFFBEB] text-[#451A03] border-2 border-[#FDE68A] shadow-md relative overflow-hidden',
    isVip: true,
    glyph: '🍂 🍁',
  },
  {
    id: 'cozy-tea',
    name: 'Afternoon Tea',
    category: 'Cute',
    previewBg: 'bg-gradient-to-b from-orange-50 to-amber-100 border border-orange-200',
    cardStyle: 'bg-orange-50/90 text-stone-800',
    canvasClass: 'bg-[#FFF7ED] text-[#431407] border-2 border-[#FED7AA] shadow-sm',
    isVip: true,
    glyph: '🫖 🍪',
  },
  {
    id: 'rainy-window',
    name: 'Rainy Twilight',
    category: 'Dark',
    previewBg: 'bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 border border-slate-700',
    cardStyle: 'bg-slate-900 text-slate-100',
    canvasClass: 'bg-[#0F172A] text-[#F1F5F9] border border-[#334155] shadow-xl',
    isVip: true,
    glyph: '🌧️ 🪟',
  },
  {
    id: 'golden-stars',
    name: 'Golden Stars',
    category: 'Artsy',
    previewBg: 'bg-gradient-to-b from-amber-100 via-yellow-50 to-white border-2 border-yellow-300',
    cardStyle: 'bg-yellow-50/90 text-yellow-950',
    canvasClass: 'bg-[#FEFCE8] text-[#713F12] border-2 border-[#FEF08A] shadow-md',
    isVip: true,
    glyph: '✨ ⭐',
  },
  {
    id: 'cozy-sofa',
    name: 'Living Room',
    category: 'Cute',
    previewBg: 'bg-gradient-to-b from-cyan-50 via-sky-50 to-blue-100 border border-cyan-200',
    cardStyle: 'bg-sky-50 text-cyan-950',
    canvasClass: 'bg-[#F0F9FF] text-[#082F49] border-2 border-[#BAE6FD] shadow-sm',
    isVip: true,
    glyph: '🛋️ 🪴',
  },
  {
    id: 'friends-chat',
    name: 'Cafe Afternoon',
    category: 'Cute',
    previewBg: 'bg-gradient-to-b from-rose-50 via-amber-50 to-orange-50 border border-rose-200',
    cardStyle: 'bg-rose-50 text-stone-800',
    canvasClass: 'bg-[#FFF1F2] text-[#4C0519] border-2 border-[#FECDD3] shadow-sm',
    isVip: true,
    glyph: '☕ 👭',
  },
  {
    id: 'winter-cabin',
    name: 'Snowy Cabin',
    category: 'Dark',
    previewBg: 'bg-gradient-to-b from-blue-950 via-slate-900 to-indigo-950 border border-blue-800',
    cardStyle: 'bg-blue-950 text-sky-100',
    canvasClass: 'bg-[#172554] text-[#EFF6FF] border border-[#1E40AF] shadow-xl',
    isVip: true,
    glyph: '❄️ 🏡',
  },
  {
    id: 'minimal-navy',
    name: 'Navy & Gold',
    category: 'Artsy',
    previewBg: 'bg-gradient-to-br from-blue-900 via-indigo-950 to-yellow-500 border border-blue-700',
    cardStyle: 'bg-blue-900 text-white',
    canvasClass: 'bg-[#1E3A8A] text-[#F8FAFC] border-2 border-[#F59E0B] shadow-lg',
    glyph: '📐 🌙',
  },
  {
    id: 'pastel-sky',
    name: 'Pastel Horizon',
    category: 'Light',
    previewBg: 'bg-gradient-to-b from-sky-200 via-indigo-100 to-purple-100 border border-indigo-200',
    cardStyle: 'bg-indigo-50 text-indigo-950',
    canvasClass: 'bg-gradient-to-b from-[#E0F2FE] via-[#EDE9FE] to-[#FCE7F3] text-[#312E81] border border-[#C7D2FE] shadow-md',
    glyph: '☁️ 🌙',
  },
  {
    id: 'starry-purple',
    name: 'Purple Cosmic',
    category: 'Dark',
    previewBg: 'bg-gradient-to-b from-purple-950 via-violet-900 to-fuchsia-950 border border-purple-700',
    cardStyle: 'bg-purple-950 text-purple-100',
    canvasClass: 'bg-[#3B0764] text-[#F3E8FF] border border-[#7E22CE] shadow-xl',
    glyph: '🪐 ✨',
  },
  {
    id: 'bts-bora-glow',
    name: 'Borahae Galaxy 💜',
    category: 'Popular',
    previewBg: 'bg-gradient-to-br from-violet-600 via-purple-700 to-pink-500 border-2 border-purple-400',
    cardStyle: 'bg-purple-900 text-purple-50',
    canvasClass: 'bg-gradient-to-b from-[#4C1D95] via-[#581C87] to-[#701A75] text-[#FAF5FF] border-2 border-[#C084FC] shadow-2xl',
    isVip: true,
    glyph: '💜 🐳',
  },
];

export const FONT_OPTIONS = [
  { id: 'default', name: 'Default', fontFamilyCss: 'sans-serif', sampleClass: 'font-sans' },
  { id: 'bold', name: 'Bold', fontFamilyCss: 'sans-serif', sampleClass: 'font-black tracking-tight' },
  { id: 'merriweather', name: 'Merriweather', fontFamilyCss: 'serif', sampleClass: 'font-serif', isVip: true },
  { id: 'light', name: 'Light', fontFamilyCss: 'sans-serif', sampleClass: 'font-light tracking-wide' },
  { id: 'poly-italic', name: 'Poly Italic', fontFamilyCss: 'serif', sampleClass: 'font-serif italic font-medium' },
  { id: 'floane', name: 'Floane', fontFamilyCss: 'serif', sampleClass: 'font-serif tracking-widest uppercase text-xs font-semibold' },
  { id: 'cursive', name: 'Cursive', fontFamilyCss: 'cursive', sampleClass: 'italic font-serif tracking-wider' },
  { id: 'aileron', name: 'Aileron', fontFamilyCss: 'sans-serif', sampleClass: 'font-mono text-xs tracking-tight' },
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

export const STICKER_CATEGORIES = [
  {
    id: 'hearts',
    icon: '💛',
    stickers: ['💛💛💛', '💖', '💜', '🎈', '😍', '💌', '💔', '🥰', '💐', '🌸', '🦋', '✨', '💕', '❤️', '🕊️'],
  },
  {
    id: 'weather',
    icon: '☀️',
    stickers: ['🌈', '☀️', '🌧️', '❄️', '💧', '🌪️', '☁️', '🌙', '🪐', '⭐', '⚡', '⛅', '🌊', '🍂'],
  },
  {
    id: 'cute',
    icon: '🐱',
    stickers: ['🐱', '🐰', '🧸', '🐧', '🐶', '🐳', '🐹', '🐼', '🐥', '🦄', '💩', '🐸', '🦊', '🐨'],
  },
  {
    id: 'art',
    icon: '🖌️',
    stickers: ['🎨', '🎀', '📷', '🪄', '🕯️', '🔮', '👑', '💎', '🎵', '🎪', '🎠', '🪞', '🩰'],
  },
  {
    id: 'stationery',
    icon: '✏️',
    stickers: ['📚', '📝', '📎', '📌', '🔖', '📮', '🖋️', '📏', '📐', '✂️', '🎒', '💡'],
  },
  {
    id: 'lifestyle',
    icon: '🧺',
    stickers: ['☕', '🫖', '🎂', '🍓', '🥐', '🧋', '🧁', '🍕', '🥞', '🪴', '🌷', '🌻', '🌿', '🍪'],
  },
];

export const EMOJI_CATEGORIES = [
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

export const LIST_STYLES = [
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

export const JOURNAL_TEMPLATES = [
  {
    id: 'birthday',
    title: 'Birthday Celebration 🎂',
    description: 'Capture birthday memories, cakes, surprise gifts, and love from best friends.',
    icon: 'cake',
    defaultTitle: 'My Birthday Celebration ✨🎉',
    defaultContent: `Today is my birthday! 🎂✨\n\n🌸 What made today special:\n• Received warm wishes and sweet surprises from my favorite people!\n• Mama & best friend surprised me with my favorite cakes! 🍰\n• Feeling cherished, loved, and ready for this new chapter of my life.\n\n💜 Note to my future self:\nLive life with no regrets, love without limits, and keep blooming into the person I am meant to be. 🌟`,
    defaultMood: 'happy',
    defaultTheme: 'golden-stars',
    bulletStyle: 'flower',
  },
  {
    id: 'gratitude',
    title: 'Daily Gratitude & Sunshine ☀️',
    description: 'A comforting morning or evening check-in acknowledging three small blessings.',
    icon: 'sun',
    defaultTitle: 'Three Little Things I Am Grateful For 🌿',
    defaultContent: `Taking a gentle breath and pausing to appreciate today... ☀️\n\n🌱 Moments that warmed my heart:\n• The warm sunlight streaming through my window this morning\n• A cozy cup of tea and a moment of quiet stillness\n• A kind word that reminded me I am never alone\n\n✨ One thing I did well today:\n• I showed up, tried my best, and treated myself with gentle kindness.`,
    defaultMood: 'calm',
    defaultTheme: 'autumn-leaves',
    bulletStyle: 'sprout',
  },
  {
    id: 'bts-magic-shop',
    title: 'Borahae & Magic Shop 💜',
    description: 'A dedicated purple corner to reflect on self-love, music, and comforting lyrics.',
    icon: 'heart',
    defaultTitle: 'A Night in My Magic Shop 💜🔮',
    defaultContent: `Entering my private purple haven where all worries fade... 🐳✨\n\n💜 Favorite comfort lyric of today:\n"The morning will come again, because no darkness, no season can last forever." — Spring Day 🌸\n\n✨ My quiet reflection:\nIt is okay to pause and recharge. Just like stars shine brightest in the deepest dark, I am slowly finding my own light at my own pace. Borahae to my journey! 💜`,
    defaultMood: 'excited',
    defaultTheme: 'bts-bora-glow',
    bulletStyle: 'heart',
  },
  {
    id: 'cozy-tea',
    title: 'Cozy Afternoon & Tea Time 🫖',
    description: 'Slow living, soft music, warm beverage, and unwinding.',
    icon: 'coffee',
    defaultTitle: 'Afternoon Tea & Slow Moments ☕',
    defaultContent: `The world is bustling outside, but right here, time moves gently... 🫖🍪\n\n☁️ Current sensory check:\n• Sound: Soft lo-fi melodies playing in the background\n• Taste: Warm honey tea & cinnamon pastry\n• Feeling: Warm blanket, soft sighs, and quiet peace\n\n🌸 Gentle reminder:\nI don't need to rush through life. Peace is found in these tiny, quiet sips of time.`,
    defaultMood: 'calm',
    defaultTheme: 'cozy-tea',
    bulletStyle: 'cloud',
  },
  {
    id: 'night-thoughts',
    title: 'Midnight Musings 🌙',
    description: 'Release overthinking before sleeping, letting go of the day.',
    icon: 'moon',
    defaultTitle: 'Under the Quiet Stars 🌙',
    defaultContent: `The day is coming to a close, and it is time to set down whatever I carried... 🌌\n\n🌧️ What I am gently releasing tonight:\n• Any pressure to have figured everything out\n• Small worries that do not belong to tomorrow\n\n🌟 What I look forward to:\n• Resting deeply and waking up to a fresh clean morning.`,
    defaultMood: 'calm',
    defaultTheme: 'rainy-window',
    bulletStyle: 'snowflake',
  },
  {
    id: 'travel',
    title: 'Travel & Wandering Soul ✈️',
    description: 'Document adventures, sights, sounds, local flavors, and wanderlust.',
    icon: 'compass',
    defaultTitle: 'Wandering Through New Horizons ✈️🗺️',
    defaultContent: `A day filled with new colors, sights, and unexpected discoveries! 🎒\n\n📍 Today's highlights:\n• Exploring unfamiliar streets and discovering cozy hidden nooks\n• Tasting delicious local food that made my tastebuds dance\n• Meeting kind souls whose smiles crossed all language barriers\n\n📸 Memory snapshot:\nCaptured beautiful photos to cherish forever. Life is an adventure!`,
    defaultMood: 'excited',
    defaultTheme: 'pastel-sky',
    bulletStyle: 'rainbow',
  },
];

export function mountThemeDrawer(container, { currentTheme, onSelectTheme, onClose }) {
  let activeTab = 'Popular';
  const tabs = ['Popular', 'Dark', 'Artsy', 'Cute', 'Light', 'Customize'];

  const render = () => {
    const filteredThemes =
      activeTab === 'Customize'
        ? WALLPAPER_THEMES
        : WALLPAPER_THEMES.filter((t) => t.category === activeTab || t.id === 'original');

    const tabsHtml = tabs
      .map(
        (tab) => `
        <button type="button" data-td-tab="${tab}"
          class="px-3 py-1.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all relative cursor-pointer ${
            activeTab === tab ? 'text-sky-600 font-bold' : 'text-gray-500 hover:text-gray-800'
          }">
          ${tab}
          ${activeTab === tab ? '<span class="absolute bottom-0 left-2 right-2 h-0.5 bg-sky-500 rounded-full"></span>' : ''}
        </button>`
      )
      .join('');

    const gridHtml = filteredThemes
      .map((theme) => {
        const isSelected = currentTheme === theme.id;
        const isDarkLabel =
          theme.cardStyle.includes('text-white') ||
          theme.cardStyle.includes('text-sky-100') ||
          theme.cardStyle.includes('text-purple-100');
        return `
          <div data-td-theme="${theme.id}"
            class="group relative flex flex-col items-center justify-between p-2 rounded-2xl cursor-pointer transition-all duration-200 h-32 sm:h-36 ${theme.previewBg} ${
              isSelected ? 'ring-3 ring-sky-500 ring-offset-2 scale-102 shadow-md' : 'hover:scale-102 shadow-sm hover:shadow'
            }">
            ${
              theme.isVip
                ? '<div class="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center shadow-xs text-[10px]"><i data-lucide="crown" class="w-3 h-3 fill-amber-950"></i></div>'
                : ''
            }
            <div class="flex-1 w-full flex items-center justify-center">
              ${
                theme.id === 'original'
                  ? `<span class="text-gray-400 font-medium text-xs">${theme.glyph}</span>`
                  : `<div class="text-xl">${theme.glyph}</div>`
              }
            </div>
            <span class="text-[11px] font-medium text-center line-clamp-1 px-1 py-0.5 rounded-md ${
              isDarkLabel ? 'bg-black/40 text-white' : 'bg-white/70 text-gray-800'
            }">${escapeHtml(theme.name)}</span>
            ${
              isSelected
                ? '<div class="absolute inset-0 bg-sky-500/20 rounded-2xl flex items-center justify-center backdrop-blur-[1px]"><div class="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center shadow"><i data-lucide="check" class="w-3.5 h-3.5"></i></div></div>'
                : ''
            }
          </div>`;
      })
      .join('');

    container.innerHTML = `
      <div class="bg-white rounded-t-3xl shadow-2xl border-t border-purple-100 p-4 sm:p-6 animate-in slide-in-from-bottom duration-300">
        <div class="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <div class="flex items-center gap-1 sm:gap-4 overflow-x-auto no-scrollbar py-1">${tabsHtml}</div>
          <button type="button" data-td-close
            class="flex items-center justify-center w-8 h-8 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors shrink-0 ml-2 cursor-pointer"
            title="Apply & Close">
            <i data-lucide="check" class="w-4 h-4"></i>
          </button>
        </div>
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4 max-h-64 overflow-y-auto pr-1">
          ${gridHtml}
        </div>
      </div>
    `;

    renderIcons(container);

    container.querySelectorAll('[data-td-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-td-tab');
        render();
      });
    });
    container.querySelectorAll('[data-td-theme]').forEach((card) => {
      card.addEventListener('click', () => {
        currentTheme = card.getAttribute('data-td-theme');
        if (onSelectTheme) onSelectTheme(currentTheme);
        render();
      });
    });
    container.querySelector('[data-td-close]')?.addEventListener('click', () => {
      if (onClose) onClose();
    });
  };

  render();
}

export function mountStickerDrawer(container, { onSelectSticker, onClose }) {
  let activeCategoryId = 'hearts';
  let customInput = '';
  let showAddCustom = false;

  const render = () => {
    const activeCategory = STICKER_CATEGORIES.find((c) => c.id === activeCategoryId) || STICKER_CATEGORIES[0];

    const catsHtml = STICKER_CATEGORIES.map(
      (cat) => `
      <button type="button" data-sd-cat="${cat.id}"
        class="p-2 rounded-xl text-lg sm:text-xl transition-all relative cursor-pointer ${
          activeCategoryId === cat.id ? 'bg-sky-50 scale-110 shadow-xs' : 'hover:bg-gray-50 opacity-70 hover:opacity-100'
        }">
        <span>${cat.icon}</span>
        ${activeCategoryId === cat.id ? '<span class="absolute bottom-0 left-2 right-2 h-0.5 bg-sky-500 rounded-full"></span>' : ''}
      </button>`
    ).join('');

    const stickersHtml = activeCategory.stickers
      .map(
        (sticker, idx) => `
      <button type="button" data-sd-pick="${idx}"
        class="flex items-center justify-center h-14 sm:h-16 rounded-2xl bg-gray-50/80 hover:bg-purple-50 hover:scale-115 active:scale-95 transition-all text-2xl sm:text-3xl shadow-2xs hover:shadow-md cursor-pointer border border-transparent hover:border-purple-200">
        <span>${sticker}</span>
      </button>`
      )
      .join('');

    container.innerHTML = `
      <div class="bg-white rounded-t-3xl shadow-2xl border-t border-purple-100 p-4 sm:p-6 animate-in slide-in-from-bottom duration-300">
        <div class="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <div class="flex items-center gap-3 sm:gap-6 overflow-x-auto no-scrollbar py-1">
            ${catsHtml}
            <button type="button" data-sd-toggle-custom
              class="relative p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
              title="Add Custom Sticker">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span class="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500"></span>
            </button>
          </div>
          <button type="button" data-sd-close
            class="flex items-center justify-center w-8 h-8 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors shrink-0 ml-2 cursor-pointer"
            title="Apply & Close">
            <i data-lucide="check" class="w-4 h-4"></i>
          </button>
        </div>

        ${
          showAddCustom
            ? `<div class="flex items-center gap-2 mb-4 bg-purple-50 p-2.5 rounded-xl border border-purple-100 animate-in fade-in">
                <input type="text" data-sd-custom-input value="${escapeHtml(customInput)}"
                  placeholder="Type any emoji, symbol, or badge (e.g. 💜, 🌟, 🌺)..."
                  class="flex-1 text-sm bg-white border border-purple-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                <button type="button" data-sd-custom-place class="bg-purple-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-purple-700 cursor-pointer">
                  Place
                </button>
              </div>`
            : ''
        }

        <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 sm:gap-4 max-h-56 overflow-y-auto p-1">
          ${stickersHtml}
        </div>
      </div>
    `;

    renderIcons(container);

    container.querySelectorAll('[data-sd-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeCategoryId = btn.getAttribute('data-sd-cat');
        render();
      });
    });

    container.querySelector('[data-sd-toggle-custom]')?.addEventListener('click', () => {
      showAddCustom = !showAddCustom;
      render();
      if (showAddCustom) container.querySelector('[data-sd-custom-input]')?.focus();
    });

    const placeCustom = () => {
      if (customInput.trim()) {
        if (onSelectSticker) onSelectSticker(customInput.trim());
        customInput = '';
        showAddCustom = false;
        render();
      }
    };

    const customEl = container.querySelector('[data-sd-custom-input]');
    customEl?.addEventListener('input', (e) => {
      customInput = e.target.value;
    });
    customEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') placeCustom();
    });
    container.querySelector('[data-sd-custom-place]')?.addEventListener('click', placeCustom);

    container.querySelectorAll('[data-sd-pick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-sd-pick'));
        const sticker = activeCategory.stickers[idx];
        if (sticker && onSelectSticker) onSelectSticker(sticker);
      });
    });

    container.querySelector('[data-sd-close]')?.addEventListener('click', () => {
      if (onClose) onClose();
    });
  };

  render();
}

export function mountEmojiDrawer(container, { onSelectEmoji, onClose }) {
  let activeTab = 'smileys';

  const render = () => {
    const currentCategory = EMOJI_CATEGORIES.find((c) => c.id === activeTab) || EMOJI_CATEGORIES[0];

    const tabsHtml = EMOJI_CATEGORIES.map(
      (cat) => `
      <button type="button" data-ed-tab="${cat.id}"
        class="p-2 rounded-xl text-lg sm:text-xl transition-all relative cursor-pointer ${
          activeTab === cat.id ? 'bg-sky-50 scale-110 shadow-xs' : 'hover:bg-gray-50 opacity-70 hover:opacity-100'
        }">
        <span>${cat.icon}</span>
        ${activeTab === cat.id ? '<span class="absolute bottom-0 left-2 right-2 h-0.5 bg-sky-500 rounded-full"></span>' : ''}
      </button>`
    ).join('');

    const gridHtml = currentCategory.emojis
      .map(
        (emoji, idx) => `
      <button type="button" data-ed-pick="${idx}"
        class="flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-xl hover:bg-purple-50 hover:scale-120 active:scale-90 transition-all text-2xl cursor-pointer">
        <span>${emoji}</span>
      </button>`
      )
      .join('');

    container.innerHTML = `
      <div class="bg-white rounded-t-3xl shadow-2xl border-t border-purple-100 p-4 sm:p-6 animate-in slide-in-from-bottom duration-300">
        <div class="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <div class="flex items-center gap-3 sm:gap-6 overflow-x-auto no-scrollbar py-1">${tabsHtml}</div>
          <button type="button" data-ed-close
            class="flex items-center justify-center w-8 h-8 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors shrink-0 ml-2 cursor-pointer"
            title="Done">
            <i data-lucide="check" class="w-4 h-4"></i>
          </button>
        </div>
        <div class="grid grid-cols-7 sm:grid-cols-9 md:grid-cols-12 gap-2 sm:gap-3 max-h-56 overflow-y-auto p-1 text-center">
          ${gridHtml}
        </div>
      </div>
    `;

    renderIcons(container);

    container.querySelectorAll('[data-ed-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-ed-tab');
        render();
      });
    });

    container.querySelectorAll('[data-ed-pick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-ed-pick'));
        const emoji = currentCategory.emojis[idx];
        if (emoji && onSelectEmoji) onSelectEmoji(emoji);
      });
    });

    container.querySelector('[data-ed-close]')?.addEventListener('click', () => {
      if (onClose) onClose();
    });
  };

  render();
}

export function mountFontDrawer(
  container,
  {
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
  }
) {
  const render = () => {
    const sizesHtml = ['h1', 'h2', 'h3', 'h4']
      .map(
        (h) => `
      <button type="button" data-fd-size="${h}"
        class="px-2.5 py-1 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer ${
          currentSizePreset === h ? 'bg-sky-500 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-white'
        }">
        ${h.toUpperCase()}
      </button>`
      )
      .join('');

    const colorsHtml = COLOR_SWATCHES.map((color) => {
      const isSelected = currentColor === color.hex || (color.isClear && currentColor === 'inherit');
      return `
        <button type="button" data-fd-color="${color.hex}"
          class="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full shrink-0 flex items-center justify-center transition-all cursor-pointer ${
            isSelected ? 'ring-3 ring-sky-500 ring-offset-2 scale-110 shadow-sm' : 'hover:scale-105'
          }"
          style="background-color:${color.isClear ? '#F8FAFC' : color.hex}; border:${color.isClear ? '2px dashed #94A3B8' : 'none'}"
          title="${escapeHtml(color.label)}">
          ${
            color.isClear
              ? '<span class="text-gray-400 text-xs font-bold">⊘</span>'
              : isSelected
              ? '<i data-lucide="check" class="w-3.5 h-3.5 text-white drop-shadow-xs"></i>'
              : ''
          }
        </button>`;
    }).join('');

    const fontsHtml = FONT_OPTIONS.map((f) => {
      const isSelected = currentFont === f.id;
      return `
        <div data-fd-font="${f.id}"
          class="relative flex items-center justify-center p-3 rounded-2xl cursor-pointer transition-all duration-200 border ${
            isSelected ? 'border-2 border-sky-500 bg-sky-50/50 shadow-xs' : 'border-gray-200 bg-gray-50/60 hover:bg-gray-100 hover:border-gray-300'
          }">
          ${f.isVip ? '<div class="absolute top-1.5 right-1.5 text-amber-500"><i data-lucide="crown" class="w-3 h-3 fill-amber-400"></i></div>' : ''}
          <span class="text-sm text-gray-800 ${f.sampleClass}">${escapeHtml(f.name)}</span>
        </div>`;
    }).join('');

    container.innerHTML = `
      <div class="bg-white rounded-t-3xl shadow-2xl border-t border-purple-100 p-4 sm:p-6 animate-in slide-in-from-bottom duration-300">
        <div class="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <h3 class="text-base sm:text-lg font-bold text-gray-800 tracking-tight font-serif">Font</h3>
          <button type="button" data-fd-close
            class="flex items-center justify-center w-8 h-8 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors shrink-0 cursor-pointer"
            title="Apply & Close">
            <i data-lucide="check" class="w-4 h-4"></i>
          </button>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div class="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
            <button type="button" data-fd-align="left"
              class="p-1.5 rounded-lg transition-colors cursor-pointer ${currentAlign === 'left' ? 'bg-white shadow-xs text-sky-600 font-bold' : 'text-gray-500 hover:text-gray-800'}"
              title="Align Left">
              <i data-lucide="align-left" class="w-4 h-4"></i>
            </button>
            <button type="button" data-fd-align="center"
              class="p-1.5 rounded-lg transition-colors cursor-pointer ${currentAlign === 'center' ? 'bg-white shadow-xs text-sky-600 font-bold' : 'text-gray-500 hover:text-gray-800'}"
              title="Align Center">
              <i data-lucide="align-center" class="w-4 h-4"></i>
            </button>
            <button type="button" data-fd-align="right"
              class="p-1.5 rounded-lg transition-colors cursor-pointer ${currentAlign === 'right' ? 'bg-white shadow-xs text-sky-600 font-bold' : 'text-gray-500 hover:text-gray-800'}"
              title="Align Right">
              <i data-lucide="align-right" class="w-4 h-4"></i>
            </button>
            <div class="w-px h-4 bg-gray-300 mx-1"></div>
            <button type="button" data-fd-indent="out"
              class="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-white transition-colors cursor-pointer"
              title="Outdent">
              <i data-lucide="outdent" class="w-4 h-4"></i>
            </button>
            <button type="button" data-fd-indent="in"
              class="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-white transition-colors cursor-pointer"
              title="Indent">
              <i data-lucide="indent" class="w-4 h-4"></i>
            </button>
          </div>
          <div class="flex items-center bg-gray-100 rounded-xl p-1 gap-1">${sizesHtml}</div>
        </div>

        <div class="mb-5">
          <div class="flex items-center gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar py-2 px-1">${colorsHtml}</div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 max-h-48 overflow-y-auto pr-1">${fontsHtml}</div>
      </div>
    `;

    renderIcons(container);

    container.querySelectorAll('[data-fd-align]').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentAlign = btn.getAttribute('data-fd-align');
        if (onSelectAlign) onSelectAlign(currentAlign);
        render();
      });
    });

    container.querySelectorAll('[data-fd-indent]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (onIndent) onIndent(btn.getAttribute('data-fd-indent'));
      });
    });

    container.querySelectorAll('[data-fd-size]').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentSizePreset = btn.getAttribute('data-fd-size');
        if (onSelectSizePreset) onSelectSizePreset(currentSizePreset);
        render();
      });
    });

    container.querySelectorAll('[data-fd-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentColor = btn.getAttribute('data-fd-color');
        if (onSelectColor) onSelectColor(currentColor);
        render();
      });
    });

    container.querySelectorAll('[data-fd-font]').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentFont = btn.getAttribute('data-fd-font');
        if (onSelectFont) onSelectFont(currentFont);
        render();
      });
    });

    container.querySelector('[data-fd-close]')?.addEventListener('click', () => {
      if (onClose) onClose();
    });
  };

  render();
}

export function mountListDrawer(container, { currentBulletStyle, onSelectBulletStyle, onClose }) {
  const render = () => {
    const cardsHtml = LIST_STYLES.map((item) => {
      const isSelected = currentBulletStyle === item.id;
      return `
        <div data-ld-style="${item.id}"
          class="p-3 rounded-2xl cursor-pointer transition-all duration-200 border flex flex-col justify-between h-20 ${
            isSelected ? 'border-2 border-sky-500 bg-sky-50/50 shadow-xs ring-2 ring-sky-200' : 'border-gray-200 bg-gray-50/60 hover:bg-gray-100 hover:border-gray-300'
          }">
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center gap-2"><span class="text-sm font-semibold">${item.bullet}</span><div class="h-1.5 bg-gray-300/80 rounded-full w-14"></div></div>
            <div class="flex items-center gap-2"><span class="text-sm font-semibold">${item.bullet}</span><div class="h-1.5 bg-gray-300/80 rounded-full w-10"></div></div>
            <div class="flex items-center gap-2"><span class="text-sm font-semibold">${item.bullet}</span><div class="h-1.5 bg-gray-300/80 rounded-full w-16"></div></div>
          </div>
        </div>`;
    }).join('');

    container.innerHTML = `
      <div class="bg-white rounded-t-3xl shadow-2xl border-t border-purple-100 p-4 sm:p-6 animate-in slide-in-from-bottom duration-300">
        <div class="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <h3 class="text-base sm:text-lg font-bold text-gray-800 tracking-tight font-serif">List</h3>
          <button type="button" data-ld-close
            class="flex items-center justify-center w-8 h-8 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors shrink-0 cursor-pointer"
            title="Apply & Close">
            <i data-lucide="check" class="w-4 h-4"></i>
          </button>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-56 overflow-y-auto pr-1">${cardsHtml}</div>
      </div>
    `;

    renderIcons(container);

    container.querySelectorAll('[data-ld-style]').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-ld-style');
        const item = LIST_STYLES.find((l) => l.id === id);
        if (item) {
          currentBulletStyle = id;
          if (onSelectBulletStyle) onSelectBulletStyle(id, item.bullet);
          render();
        }
      });
    });

    container.querySelector('[data-ld-close]')?.addEventListener('click', () => {
      if (onClose) onClose();
    });
  };

  render();
}

export function openTemplatesModal(overlayContainer, { onApplyTemplate, onClose }) {
  const cardsHtml = JOURNAL_TEMPLATES.map(
    (tmpl) => `
    <div data-tm-pick="${tmpl.id}"
      class="p-3.5 rounded-2xl border border-purple-100/80 bg-purple-50/30 hover:bg-purple-100/50 hover:border-purple-300 transition-all cursor-pointer group flex flex-col justify-between">
      <div>
        <div class="flex items-center gap-2 mb-1.5">
          <div class="p-1.5 rounded-xl bg-white shadow-xs text-purple-600 group-hover:scale-110 transition-transform">
            <i data-lucide="${tmpl.icon}" class="w-4 h-4"></i>
          </div>
          <span class="font-bold text-xs sm:text-sm text-gray-900 line-clamp-1">${escapeHtml(tmpl.title)}</span>
        </div>
        <p class="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">${escapeHtml(tmpl.description)}</p>
      </div>
      <div class="mt-3 flex items-center justify-between text-[10px] text-purple-700 font-semibold pt-2 border-t border-purple-100/60">
        <span>Use Template</span>
        <span class="group-hover:translate-x-1 transition-transform">→</span>
      </div>
    </div>`
  ).join('');

  overlayContainer.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div class="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-purple-100 max-h-[85vh] flex flex-col">
        <div class="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
              <i data-lucide="sparkles" class="w-4 h-4"></i>
            </div>
            <div>
              <h3 class="font-bold text-gray-900 text-base">Aesthetic Journal Templates</h3>
              <p class="text-xs text-gray-500">Choose a crafted structure to inspire your writing</p>
            </div>
          </div>
          <button type="button" data-tm-close class="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1 flex-1">${cardsHtml}</div>
      </div>
    </div>
  `;

  renderIcons(overlayContainer);

  const closeModal = () => {
    overlayContainer.innerHTML = '';
    if (onClose) onClose();
  };

  overlayContainer.querySelector('[data-tm-close]')?.addEventListener('click', closeModal);
  overlayContainer.querySelectorAll('[data-tm-pick]').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-tm-pick');
      const tmpl = JOURNAL_TEMPLATES.find((t) => t.id === id);
      if (tmpl && onApplyTemplate) onApplyTemplate(tmpl);
      closeModal();
    });
  });
}

export function openPhotoLightboxModal(overlayContainer, { photos, initialIndex = 0, onDeletePhoto, onClose }) {
  if (!photos || photos.length === 0) return;

  let currentIndex = Math.min(Math.max(0, initialIndex), photos.length - 1);
  let scale = 1;
  let confirmDelete = false;
  let currentPhotos = [...photos];

  const closeModal = () => {
    overlayContainer.innerHTML = '';
    if (onClose) onClose();
  };

  const render = () => {
    if (currentPhotos.length === 0) {
      closeModal();
      return;
    }
    const rawPhoto = currentPhotos[currentIndex] || currentPhotos[0];
    const safePhoto = sanitizeUrl(rawPhoto);

    const deleteControlsHtml = onDeletePhoto
      ? confirmDelete
        ? `<div class="flex items-center gap-1.5 bg-rose-900/90 border border-rose-500/60 rounded-full px-2 py-1">
            <span class="text-[11px] text-rose-100 font-medium">Delete photo?</span>
            <button type="button" data-lb-confirm-del class="px-2 py-0.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition-colors cursor-pointer">Yes</button>
            <button type="button" data-lb-cancel-del class="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] transition-colors cursor-pointer">No</button>
          </div>`
        : `<button type="button" data-lb-ask-del class="p-2 rounded-full bg-rose-600/70 hover:bg-rose-600 text-white transition-colors cursor-pointer" title="Delete this Photo">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>`
      : '';

    overlayContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
        <div class="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-10">
          <span class="text-xs sm:text-sm font-medium bg-white/10 px-3 py-1 rounded-full">
            Memory Photo ${currentIndex + 1} of ${currentPhotos.length}
          </span>
          <div class="flex items-center gap-2">
            ${deleteControlsHtml}
            <button type="button" data-lb-zoom-out class="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer" title="Zoom Out">
              <i data-lucide="zoom-out" class="w-4 h-4"></i>
            </button>
            <button type="button" data-lb-zoom-in class="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer" title="Zoom In">
              <i data-lucide="zoom-in" class="w-4 h-4"></i>
            </button>
            <a href="${escapeHtml(safePhoto)}" download="borah_memory_${currentIndex + 1}.jpg"
              class="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors" title="Download Image">
              <i data-lucide="download" class="w-4 h-4"></i>
            </a>
            <button type="button" data-lb-close class="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer" title="Close">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>
        </div>

        ${
          currentPhotos.length > 1
            ? `<button type="button" data-lb-prev class="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors z-10 cursor-pointer">
                <i data-lucide="chevron-left" class="w-6 h-6"></i>
              </button>
              <button type="button" data-lb-next class="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors z-10 cursor-pointer">
                <i data-lucide="chevron-right" class="w-6 h-6"></i>
              </button>`
            : ''
        }

        <div class="max-w-4xl max-h-[85vh] p-4 flex items-center justify-center overflow-hidden">
          <img data-lb-img src="${escapeHtml(safePhoto)}" alt="Journal Memory"
            class="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl transition-transform duration-200 cursor-zoom-in"
            style="transform:scale(${scale})" />
        </div>
      </div>
    `;

    renderIcons(overlayContainer);

    overlayContainer.querySelector('[data-lb-close]')?.addEventListener('click', closeModal);
    overlayContainer.querySelector('[data-lb-prev]')?.addEventListener('click', () => {
      currentIndex = (currentIndex - 1 + currentPhotos.length) % currentPhotos.length;
      scale = 1;
      confirmDelete = false;
      render();
    });
    overlayContainer.querySelector('[data-lb-next]')?.addEventListener('click', () => {
      currentIndex = (currentIndex + 1) % currentPhotos.length;
      scale = 1;
      confirmDelete = false;
      render();
    });
    overlayContainer.querySelector('[data-lb-zoom-in]')?.addEventListener('click', () => {
      scale = Math.min(scale + 0.3, 3);
      const img = overlayContainer.querySelector('[data-lb-img]');
      if (img) img.style.transform = `scale(${scale})`;
    });
    overlayContainer.querySelector('[data-lb-zoom-out]')?.addEventListener('click', () => {
      scale = Math.max(scale - 0.3, 0.7);
      const img = overlayContainer.querySelector('[data-lb-img]');
      if (img) img.style.transform = `scale(${scale})`;
    });
    overlayContainer.querySelector('[data-lb-img]')?.addEventListener('click', () => {
      scale = Math.min(scale + 0.3, 3);
      const img = overlayContainer.querySelector('[data-lb-img]');
      if (img) img.style.transform = `scale(${scale})`;
    });
    overlayContainer.querySelector('[data-lb-ask-del]')?.addEventListener('click', () => {
      confirmDelete = true;
      render();
    });
    overlayContainer.querySelector('[data-lb-cancel-del]')?.addEventListener('click', () => {
      confirmDelete = false;
      render();
    });
    overlayContainer.querySelector('[data-lb-confirm-del]')?.addEventListener('click', () => {
      const deletedIdx = currentIndex;
      currentPhotos = currentPhotos.filter((_, idx) => idx !== deletedIdx);
      if (onDeletePhoto) onDeletePhoto(deletedIdx);
      confirmDelete = false;
      if (currentPhotos.length === 0) {
        closeModal();
      } else {
        if (currentIndex >= currentPhotos.length) currentIndex = currentPhotos.length - 1;
        render();
      }
    });
  };

  render();
}

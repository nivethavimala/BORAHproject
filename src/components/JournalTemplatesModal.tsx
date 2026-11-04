import React from 'react';
import { X, Sparkles, Cake, Sun, Heart, Moon, Compass, Coffee } from 'lucide-react';

export interface JournalTemplate {
  id: string;
  title: string;
  description: string;
  icon: any;
  defaultTitle: string;
  defaultContent: string;
  defaultMood: string;
  defaultTheme: string;
  bulletStyle: string;
}

export const JOURNAL_TEMPLATES: JournalTemplate[] = [
  {
    id: 'birthday',
    title: 'Birthday Celebration 🎂',
    description: 'Capture birthday memories, cakes, surprise gifts, and love from best friends.',
    icon: Cake,
    defaultTitle: 'My Birthday Celebration ✨🎉',
    defaultContent: `Today is my birthday! 🎂✨

🌸 What made today special:
• Received warm wishes and sweet surprises from my favorite people!
• Mama & best friend surprised me with my favorite cakes! 🍰
• Feeling cherished, loved, and ready for this new chapter of my life.

💜 Note to my future self:
Live life with no regrets, love without limits, and keep blooming into the person I am meant to be. 🌟`,
    defaultMood: 'happy',
    defaultTheme: 'golden-stars',
    bulletStyle: 'flower',
  },
  {
    id: 'gratitude',
    title: 'Daily Gratitude & Sunshine ☀️',
    description: 'A comforting morning or evening check-in acknowledging three small blessings.',
    icon: Sun,
    defaultTitle: 'Three Little Things I Am Grateful For 🌿',
    defaultContent: `Taking a gentle breath and pausing to appreciate today... ☀️

🌱 Moments that warmed my heart:
• The warm sunlight streaming through my window this morning
• A cozy cup of tea and a moment of quiet stillness
• A kind word that reminded me I am never alone

✨ One thing I did well today:
• I showed up, tried my best, and treated myself with gentle kindness.`,
    defaultMood: 'calm',
    defaultTheme: 'autumn-leaves',
    bulletStyle: 'sprout',
  },
  {
    id: 'bts-magic-shop',
    title: 'Borahae & Magic Shop 💜',
    description: 'A dedicated purple corner to reflect on self-love, music, and comforting lyrics.',
    icon: Heart,
    defaultTitle: 'A Night in My Magic Shop 💜🔮',
    defaultContent: `Entering my private purple haven where all worries fade... 🐳✨

💜 Favorite comfort lyric of today:
"The morning will come again, because no darkness, no season can last forever." — Spring Day 🌸

✨ My quiet reflection:
It is okay to pause and recharge. Just like stars shine brightest in the deepest dark, I am slowly finding my own light at my own pace. Borahae to my journey! 💜`,
    defaultMood: 'excited',
    defaultTheme: 'bts-bora-glow',
    bulletStyle: 'heart',
  },
  {
    id: 'cozy-tea',
    title: 'Cozy Afternoon & Tea Time 🫖',
    description: 'Slow living, soft music, warm beverage, and unwinding.',
    icon: Coffee,
    defaultTitle: 'Afternoon Tea & Slow Moments ☕',
    defaultContent: `The world is bustling outside, but right here, time moves gently... 🫖🍪

☁️ Current sensory check:
• Sound: Soft lo-fi melodies playing in the background
• Taste: Warm honey tea & cinnamon pastry
• Feeling: Warm blanket, soft sighs, and quiet peace

🌸 Gentle reminder:
I don't need to rush through life. Peace is found in these tiny, quiet sips of time.`,
    defaultMood: 'calm',
    defaultTheme: 'cozy-tea',
    bulletStyle: 'cloud',
  },
  {
    id: 'night-thoughts',
    title: 'Midnight Musings 🌙',
    description: 'Release overthinking before sleeping, letting go of the day.',
    icon: Moon,
    defaultTitle: 'Under the Quiet Stars 🌙',
    defaultContent: `The day is coming to a close, and it is time to set down whatever I carried... 🌌

🌧️ What I am gently releasing tonight:
• Any pressure to have figured everything out
• Small worries that do not belong to tomorrow

🌟 What I look forward to:
• Resting deeply and waking up to a fresh clean morning.`,
    defaultMood: 'calm',
    defaultTheme: 'rainy-window',
    bulletStyle: 'snowflake',
  },
  {
    id: 'travel',
    title: 'Travel & Wandering Soul ✈️',
    description: 'Document adventures, sights, sounds, local flavors, and wanderlust.',
    icon: Compass,
    defaultTitle: 'Wandering Through New Horizons ✈️🗺️',
    defaultContent: `A day filled with new colors, sights, and unexpected discoveries! 🎒

📍 Today's highlights:
• Exploring unfamiliar streets and discovering cozy hidden nooks
• Tasting delicious local food that made my tastebuds dance
• Meeting kind souls whose smiles crossed all language barriers

📸 Memory snapshot:
Captured beautiful photos to cherish forever. Life is an adventure!`,
    defaultMood: 'excited',
    defaultTheme: 'pastel-sky',
    bulletStyle: 'rainbow',
  },
];

interface JournalTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (template: JournalTemplate) => void;
}

export const JournalTemplatesModal: React.FC<JournalTemplatesModalProps> = ({
  isOpen,
  onClose,
  onApplyTemplate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-purple-100 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Aesthetic Journal Templates</h3>
              <p className="text-xs text-gray-500">Choose a crafted structure to inspire your writing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Template Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1 flex-1">
          {JOURNAL_TEMPLATES.map((tmpl) => {
            const Icon = tmpl.icon;
            return (
              <div
                key={tmpl.id}
                onClick={() => {
                  onApplyTemplate(tmpl);
                  onClose();
                }}
                className="p-3.5 rounded-2xl border border-purple-100/80 bg-purple-50/30 hover:bg-purple-100/50 hover:border-purple-300 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="p-1.5 rounded-xl bg-white shadow-xs text-purple-600 group-hover:scale-110 transition-transform">
                      <Icon size={16} />
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-gray-900 line-clamp-1">
                      {tmpl.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">
                    {tmpl.description}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between text-[10px] text-purple-700 font-semibold pt-2 border-t border-purple-100/60">
                  <span>Use Template</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

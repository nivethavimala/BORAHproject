import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Shuffle,
  Heart,
  Copy,
  Check,
  BookOpen,
  Quote,
  Share2,
  Bookmark,
  SunMedium,
  Feather,
} from 'lucide-react';

export interface AffirmationItem {
  id: string;
  quote: string;
  category: 'Calm' | 'Self-Worth' | 'Resilience' | 'Gratitude' | 'Growth' | 'Courage';
  author: string;
  reflectionPrompt: string;
}

const AFFIRMATION_LIBRARY: AffirmationItem[] = [
  {
    id: 'aff_1',
    quote: 'You are allowed to move at your own gentle pace. Growth is not a race, it is an unfolding.',
    category: 'Calm',
    author: 'BORAH Wisdom',
    reflectionPrompt: 'Where in your life can you give yourself permission to slow down and breathe today?',
  },
  {
    id: 'aff_2',
    quote: 'You do not need to prove your worth to exist peacefully in this world. You are already enough.',
    category: 'Self-Worth',
    author: 'Daily Grace',
    reflectionPrompt: 'What is one thing you appreciate about who you are, independent of what you achieve?',
  },
  {
    id: 'aff_3',
    quote: 'Storms pass, and the quiet earth remains. You have survived difficult days before, and you will thrive again.',
    category: 'Resilience',
    author: 'BORAH Sanctuary',
    reflectionPrompt: 'What strength inside you carried you through your last challenging moment?',
  },
  {
    id: 'aff_4',
    quote: 'Gratitude turns what we have into enough, and more. Notice the ordinary wonders of this day.',
    category: 'Gratitude',
    author: 'Mindful Heart',
    reflectionPrompt: 'Name three simple sensory comforts around you right now that make you feel grounded.',
  },
  {
    id: 'aff_5',
    quote: 'Small steps taken consistently create profound transformations. Honor your quiet efforts.',
    category: 'Growth',
    author: 'Gentle Progress',
    reflectionPrompt: 'What is one tiny victory or step forward you took recently that deserves recognition?',
  },
  {
    id: 'aff_6',
    quote: 'Speak to yourself today with the tenderness and patience you would offer your dearest friend.',
    category: 'Self-Worth',
    author: 'Self-Compassion',
    reflectionPrompt: 'What kind words does your heart need to hear from yourself right now?',
  },
  {
    id: 'aff_7',
    quote: 'You hold the courage to start fresh every single sunrise. Yesterday is already behind you.',
    category: 'Courage',
    author: 'Morning Dawn',
    reflectionPrompt: 'What is one fresh intention or hope you want to invite into your world today?',
  },
  {
    id: 'aff_8',
    quote: 'Let go of what you cannot control. Protect your peace like the precious treasure it is.',
    category: 'Calm',
    author: 'Inner Sanctuary',
    reflectionPrompt: 'What heavy expectation or worry can you gently put down for the rest of today?',
  },
  {
    id: 'aff_9',
    quote: 'Your sensitivity and depth are not weaknesses; they are your compass and superpower.',
    category: 'Self-Worth',
    author: 'BORAH Reflection',
    reflectionPrompt: 'How has your empathy or deep feeling helped someone or enriched your life?',
  },
  {
    id: 'aff_10',
    quote: 'Trust the timing of your life. Even when seeds are hidden in the dark soil, they are growing.',
    category: 'Patience' as any,
    author: 'Silent Bloom',
    reflectionPrompt: 'What dream or project is quietly brewing in your life right now?',
  },
  {
    id: 'aff_11',
    quote: 'There is profound beauty in simply being present, breathing in, and letting the moment be.',
    category: 'Calm',
    author: 'Zen Breeze',
    reflectionPrompt: 'Take three deep breaths. What does your body feel like when you let your shoulders drop?',
  },
  {
    id: 'aff_12',
    quote: 'You are worthy of unconditional rest. You do not need to earn the right to rest and recharge.',
    category: 'Calm',
    author: 'BORAH Care',
    reflectionPrompt: 'How will you give yourself restorative rest without feeling guilty today?',
  },
  {
    id: 'aff_13',
    quote: 'Every day is a canvas of quiet miracles waiting for your attention to awaken them.',
    category: 'Gratitude',
    author: 'Wonder & Light',
    reflectionPrompt: 'What was the prettiest or most heartwarming thing you saw in the last 24 hours?',
  },
  {
    id: 'aff_14',
    quote: 'Your voice matters, your feelings are valid, and your journey is sacred.',
    category: 'Self-Worth',
    author: 'Inner Anchor',
    reflectionPrompt: 'What truth is your inner self wanting to express openly today?',
  },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Calm: {
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200/60 dark:border-teal-800/40',
  },
  'Self-Worth': {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200/60 dark:border-purple-800/40',
  },
  Resilience: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200/60 dark:border-amber-800/40',
  },
  Gratitude: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200/60 dark:border-rose-800/40',
  },
  Growth: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200/60 dark:border-emerald-800/40',
  },
  Courage: {
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200/60 dark:border-sky-800/40',
  },
};

const FAVORITES_STORAGE_KEY = 'borah_favorite_affirmation_ids';

// Helper to get deterministic affirmation based on the current calendar date
function getDailyAffirmationIndex(date: Date, totalCount: number): number {
  const year = date.getFullYear();
  const start = new Date(year, 0, 0);
  const diff = date.getTime() - start.getTime() + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return (dayOfYear + year * 7) % totalCount;
}

interface DailyAffirmationWidgetProps {
  onReflectInJournal?: (prompt: string, initialTitle?: string) => void;
  className?: string;
}

export const DailyAffirmationWidget: React.FC<DailyAffirmationWidgetProps> = ({
  onReflectInJournal,
  className = '',
}) => {
  const today = useMemo(() => new Date(), []);
  const dailyIndex = useMemo(() => getDailyAffirmationIndex(today, AFFIRMATION_LIBRARY.length), [today]);

  const [currentIndex, setCurrentIndex] = useState<number>(dailyIndex);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [showPrompt, setShowPrompt] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const currentAffirmation = AFFIRMATION_LIBRARY[currentIndex] || AFFIRMATION_LIBRARY[0];
  const isDailyQuote = currentIndex === dailyIndex;
  const isFavorited = favoriteIds.includes(currentAffirmation.id);

  // Stop speech if unmounted
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Save favorites to localStorage
  const handleToggleFavorite = () => {
    const updated = isFavorited
      ? favoriteIds.filter((id) => id !== currentAffirmation.id)
      : [...favoriteIds, currentAffirmation.id];
    setFavoriteIds(updated);
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  // Next / Shuffle Affirmation
  const handleDrawNext = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setCurrentIndex((prev) => (prev + 1) % AFFIRMATION_LIBRARY.length);
    setShowPrompt(false);
  };

  // Reset to today's affirmation
  const handleResetToDaily = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setCurrentIndex(dailyIndex);
    setShowPrompt(false);
  };

  // Copy quote to clipboard
  const handleCopyQuote = () => {
    const textToCopy = `"${currentAffirmation.quote}" — ${currentAffirmation.author}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Read Aloud using Web SpeechSynthesis
  const handleToggleSpeak = () => {
    if (!('speechSynthesis' in window)) {
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(currentAffirmation.quote);
    utterance.rate = 0.85; // slightly slower, peaceful pacing
    utterance.pitch = 1.05;

    // Pick gentle voice if available
    const voices = window.speechSynthesis.getVoices();
    const gentleVoice = voices.find(
      (v) =>
        (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Karen')) &&
        v.lang.startsWith('en')
    );
    if (gentleVoice) {
      utterance.voice = gentleVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleReflectClick = () => {
    if (onReflectInJournal) {
      const promptText = `Daily Affirmation: "${currentAffirmation.quote}"\n\nReflection: ${currentAffirmation.reflectionPrompt}\n\n`;
      onReflectInJournal(promptText, `Reflection: ${currentAffirmation.category}`);
    }
  };

  const categoryStyle =
    CATEGORY_COLORS[currentAffirmation.category] || {
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800',
    };

  const dateFormatted = today.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50/70 via-rose-50/40 to-purple-50/50 dark:from-slate-900 dark:via-slate-900/90 dark:to-purple-950/30 border border-amber-200/80 dark:border-purple-900/40 p-6 sm:p-7 shadow-xs transition-all ${className}`}
    >
      {/* Soft decorative background circles */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-200/20 dark:bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-rose-200/20 dark:bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Badges & Actions */}
      <div className="relative z-10 flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-white/90 dark:bg-slate-800/90 text-amber-800 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/40 shadow-2xs">
            <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
            <span>{isDailyQuote ? `Daily Affirmation · ${dateFormatted}` : 'Inspirational Affirmation'}</span>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border}`}
          >
            {currentAffirmation.category}
          </span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleToggleSpeak}
            className={`p-2 rounded-xl text-xs transition-colors cursor-pointer ${
              isSpeaking
                ? 'bg-purple-600 text-white shadow-xs animate-pulse ring-2 ring-purple-300'
                : 'text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-white/80 dark:hover:bg-slate-800'
            }`}
            title={isSpeaking ? 'Stop speech' : 'Listen to affirmation'}
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleToggleFavorite}
            className={`p-2 rounded-xl text-xs transition-colors cursor-pointer ${
              isFavorited
                ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/50'
                : 'text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-white/80 dark:hover:bg-slate-800'
            }`}
            title={isFavorited ? 'Saved in favorites' : 'Save to favorites'}
          >
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleCopyQuote}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800 text-xs transition-colors cursor-pointer"
            title="Copy quote"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Quote Content */}
      <div className="relative z-10 my-3">
        <div className="flex items-start gap-3">
          <Quote className="w-7 h-7 text-amber-400/50 dark:text-purple-400/40 shrink-0 rotate-180 -mt-1 hidden sm:block" />
          <div className="flex-1">
            <blockquote className="text-base sm:text-lg font-serif italic font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
              &ldquo;{currentAffirmation.quote}&rdquo;
            </blockquote>
            <p className="text-xs font-sans font-medium text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
              <span>— {currentAffirmation.author}</span>
              {isDailyQuote && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-900/40 px-1.5 py-0.2 rounded font-semibold">
                  Today's Choice
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Reflection Prompt Expandable Accordion */}
      {showPrompt && (
        <div className="relative z-10 mt-3 p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-amber-200/60 dark:border-purple-800/40 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in duration-200">
          <div className="flex items-start gap-2">
            <Feather className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold text-slate-800 dark:text-slate-100">Mindful Reflection:</span>
              <p className="mt-0.5 italic text-slate-600 dark:text-slate-300 font-serif">
                {currentAffirmation.reflectionPrompt}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls Strip */}
      <div className="relative z-10 mt-5 pt-3.5 border-t border-amber-200/50 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDrawNext}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-white/90 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            title="Draw a fresh uplifting affirmation"
          >
            <Shuffle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Draw Another</span>
          </button>

          {!isDailyQuote && (
            <button
              type="button"
              onClick={handleResetToDaily}
              className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline cursor-pointer font-medium"
            >
              Back to Today's
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowPrompt(!showPrompt)}
            className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded-lg transition-colors cursor-pointer"
          >
            {showPrompt ? 'Hide Reflection' : 'Reflection Prompt'}
          </button>
        </div>

        {onReflectInJournal && (
          <button
            type="button"
            onClick={handleReflectClick}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Reflect in Journal</span>
          </button>
        )}
      </div>
    </div>
  );
};

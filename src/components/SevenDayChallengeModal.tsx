import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check, BookOpen, Star, Calendar } from 'lucide-react';

interface SevenDayChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDayJournal: (prompt: string, day: number) => void;
}

export const SevenDayChallengeModal: React.FC<SevenDayChallengeModalProps> = ({
  isOpen,
  onClose,
  onStartDayJournal,
}) => {
  const [completedDays, setCompletedDays] = useState<number[]>([]);

  const challengeDays = [
    { day: 1, prompt: 'Something that made you smile today.', tag: 'Joy & Gratitude' },
    { day: 2, prompt: 'Something you learned recently about yourself or the world.', tag: 'Growth & Insight' },
    { day: 3, prompt: 'Someone in your life you quietly appreciate.', tag: 'Togetherness' },
    { day: 4, prompt: 'A dream or quiet ambition you hold close to your heart.', tag: 'Hope & Dreams' },
    { day: 5, prompt: 'A cherished memory you want to preserve forever.', tag: 'Memory Keeping' },
    { day: 6, prompt: 'Something small you would like to gently improve tomorrow.', tag: 'Gentle Steps' },
    { day: 7, prompt: 'Write an honest, kind letter to your future self.', tag: 'Letter to the Future' },
  ];

  useEffect(() => {
    try {
      const saved = localStorage.getItem('borah_seven_day_progress');
      if (saved) setCompletedDays(JSON.parse(saved));
    } catch {}
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleComplete = (day: number) => {
    const updated = completedDays.includes(day)
      ? completedDays.filter((d) => d !== day)
      : [...completedDays, day];
    setCompletedDays(updated);
    try {
      localStorage.setItem('borah_seven_day_progress', JSON.stringify(updated));
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-purple-200 dark:border-purple-900/60 p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 mb-2">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-slate-800 dark:text-slate-100">
            7 Days of Me Reflection 🌸
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            A seven-day journey of gentle self-discovery, gratitude, and peaceful reflection.
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-6 p-4 rounded-2xl bg-purple-50/60 dark:bg-slate-800/60 border border-purple-100 dark:border-slate-700 flex items-center justify-between">
          <div className="text-xs font-semibold text-purple-900 dark:text-purple-200">
            Progress: {completedDays.length} / 7 days completed
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <div
                key={d}
                className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
                  completedDays.includes(d)
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}
              >
                {d}
              </div>
            ))}
          </div>
        </div>

        {/* Challenge Prompts List */}
        <div className="space-y-3">
          {challengeDays.map((item) => {
            const isDone = completedDays.includes(item.day);
            return (
              <div
                key={item.day}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDone
                    ? 'bg-purple-50/30 dark:bg-purple-950/20 border-purple-300 dark:border-purple-800/80'
                    : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleComplete(item.day)}
                    className={`w-6 h-6 rounded-lg border mt-0.5 flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                      isDone
                        ? 'bg-purple-600 border-purple-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 hover:border-purple-400'
                    }`}
                  >
                    {isDone && <Check className="w-4 h-4" />}
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold font-mono text-purple-600 dark:text-purple-400 uppercase">
                        Day {item.day}
                      </span>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-md">
                        {item.tag}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 font-serif text-slate-800 dark:text-slate-200 ${isDone ? 'line-through text-slate-400' : ''}`}>
                      "{item.prompt}"
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onStartDayJournal(item.prompt, item.day);
                    onClose();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 flex items-center gap-1 self-end sm:self-center cursor-pointer shrink-0"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Write Page</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

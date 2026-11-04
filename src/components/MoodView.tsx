import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { MoodEntry } from '../types';
import {
  Smile,
  Calendar,
  Sparkles,
  TrendingUp,
  Heart,
  BarChart2,
  Clock,
  Plus,
  Trash2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const MoodView: React.FC = () => {
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [selectedMood, setSelectedMood] = useState('calm');
  const [intensity, setIntensity] = useState<number>(7);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const moodChoices: Record<
    string,
    { emoji: string; label: string; poeticName: string; bg: string; color: string }
  > = {
    happy: { emoji: '😊', label: 'Happy', poeticName: 'Sunny & Warm', bg: 'bg-amber-50 dark:bg-amber-950/40', color: 'text-amber-600' },
    calm: { emoji: '😌', label: 'Calm', poeticName: 'Purple Calm', bg: 'bg-purple-50 dark:bg-purple-950/40', color: 'text-purple-600' },
    neutral: { emoji: '😐', label: 'Neutral', poeticName: 'Steady & Balanced', bg: 'bg-slate-50 dark:bg-slate-800', color: 'text-slate-600' },
    sad: { emoji: '😔', label: 'Gentle Sorrow', poeticName: 'Quiet Rain', bg: 'bg-blue-50 dark:bg-blue-950/40', color: 'text-blue-600' },
    anxious: { emoji: '😰', label: 'Restless', poeticName: 'Flurrying Thoughts', bg: 'bg-orange-50 dark:bg-orange-950/40', color: 'text-orange-600' },
    angry: { emoji: '😡', label: 'Frustrated', poeticName: 'Stormy', bg: 'bg-rose-50 dark:bg-rose-950/40', color: 'text-rose-600' },
    tired: { emoji: '😴', label: 'Tired', poeticName: 'Moon Mood', bg: 'bg-indigo-50 dark:bg-indigo-950/40', color: 'text-indigo-600' },
    excited: { emoji: '🤩', label: 'Excited', poeticName: 'Little Joy 💜', bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40', color: 'text-fuchsia-600' },
  };

  const loadMoods = async () => {
    try {
      const res = await api.getMoods();
      if (res.success) {
        setMoods(res.moods);
      }
    } catch (err) {
      console.error('Error loading moods:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMoods();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRecordMood = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.createMood({
        mood: selectedMood,
        emotion: moodChoices[selectedMood]?.poeticName || '',
        intensity,
        note: note.trim(),
        date: today,
      });

      if (res.success) {
        setMoods([res.mood, ...moods]);
        setNote('');
        confetti({
          particleCount: 35,
          spread: 50,
          origin: { y: 0.75 },
          colors: ['#A78BFA', '#F59E0B', '#10B981'],
        });
        showToast('Mood recorded gently to your timeline 🌿');
      }
    } catch (err: any) {
      showToast(err.message || 'Unable to record mood.');
    }
  };

  const handleDeleteMood = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this specific mood log?')) return;
    try {
      const res = await api.deleteMood(id);
      if (res.success) {
        setMoods((prev) => prev.filter((m) => m.id !== id));
        showToast('Mood log removed.');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete mood.');
    }
  };

  // Group moods by frequency
  const moodCounts: Record<string, number> = {};
  moods.forEach((m) => {
    moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl bg-slate-900 text-white text-xs font-medium shadow-xl border border-slate-700 animate-in fade-in duration-200">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-serif flex items-center gap-2">
            <span>Mood & Emotional Space</span>
            <span className="text-sm font-sans font-normal text-slate-400">({moods.length} entries)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            A safe, non-judgmental space to record how you truly feel each day.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Log Today's Mood (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <span>How are you feeling right now?</span>
          </div>

          <form onSubmit={handleRecordMood} className="space-y-6">
            {/* Mood selector icons */}
            <div className="grid grid-cols-4 gap-2.5">
              {Object.entries(moodChoices).map(([key, item]) => {
                const isSelected = selectedMood === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedMood(key)}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'border-purple-500 ring-2 ring-purple-400/30 bg-purple-50 dark:bg-purple-950/40 shadow-xs scale-105'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-200 truncate w-full">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Mood Detail */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{moodChoices[selectedMood]?.emoji}</span>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {moodChoices[selectedMood]?.poeticName}
                  </div>
                  <div className="text-[10px] text-slate-400">Emotional atmosphere</div>
                </div>
              </div>
            </div>

            {/* Intensity Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Emotional Intensity</span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                  {intensity} / 10
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Gentle / Soft (1)</span>
                <span>Moderate (5)</span>
                <span>Intense / Peak (10)</span>
              </div>
            </div>

            {/* Context Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reflection Note (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="What might be contributing to this feeling?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Heart className="w-3.5 h-3.5 fill-white" />
              <span>Record Mood 💜</span>
            </button>
          </form>
        </div>

        {/* Right Column: Mood History & Distribution (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Distribution card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-purple-600" />
              <span>Your Mood Spectrum</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(moodChoices).map(([k, item]) => {
                const count = moodCounts[k] || 0;
                return (
                  <div
                    key={k}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center"
                  >
                    <span className="text-xl block">{item.emoji}</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-slate-400 tabular-nums">
                      {count} {count === 1 ? 'time' : 'times'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* History log */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Recent Mood Log</span>
            </h3>

            {moods.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No moods logged yet. Check in above to begin your wellness log.
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {moods.slice(0, 10).map((m) => {
                  const conf = moodChoices[m.mood] || moodChoices.neutral;
                  return (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl mt-0.5">{conf.emoji}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {conf.poeticName}
                            </span>
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md font-mono">
                              Intensity {m.intensity}/10
                            </span>
                          </div>
                          {m.note && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-serif mt-1 italic">
                              "{m.note}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 whitespace-nowrap font-mono">
                          {m.date}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteMood(m.id, e)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Delete this specific mood entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

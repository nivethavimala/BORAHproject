import React, { useState, useEffect } from 'react';
import { X, Sparkles, Heart, Star, Moon, BookOpen, Camera } from 'lucide-react';
import { api } from '../api';
import { Memory, JournalEntry } from '../types';

interface PurpleUniverseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PurpleUniverseModal: React.FC<PurpleUniverseModalProps> = ({ isOpen, onClose }) => {
  const [favoriteMemories, setFavoriteMemories] = useState<Memory[]>([]);
  const [favoriteJournals, setFavoriteJournals] = useState<JournalEntry[]>([]);
  const [breathingText, setBreathingText] = useState('Inhale peace...');
  const [breathingCycle, setBreathingCycle] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    // Load user's favorite memories & journals
    Promise.all([
      api.getMemories().catch(() => ({ success: false, memories: [] })),
      api.getJournals().catch(() => ({ success: false, entries: [] })),
    ]).then(([mRes, jRes]) => {
      if (mRes.success) {
        setFavoriteMemories(mRes.memories.filter((m) => m.is_favorite || m.is_special).slice(0, 3));
      }
      if (jRes.success) {
        setFavoriteJournals(jRes.entries.filter((j) => j.is_favorite).slice(0, 3));
      }
    });

    // Gentle breathing loop
    const interval = setInterval(() => {
      setBreathingCycle((c) => {
        const next = (c + 1) % 4;
        if (next === 0) setBreathingText('Inhale gently...');
        else if (next === 1) setBreathingText('Hold peace inside...');
        else if (next === 2) setBreathingText('Exhale your worries...');
        else setBreathingText('Rest in the quiet...');
        return next;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-3xl bg-gradient-to-b from-[#1E1135] via-[#120B24] to-[#0A0515] rounded-3xl shadow-2xl border border-purple-500/30 p-6 sm:p-10 text-white overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Subtle celestial stars background */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute top-8 left-12 w-1.5 h-1.5 bg-purple-200 rounded-full animate-ping" />
          <div className="absolute top-20 right-24 w-1 h-1 bg-amber-200 rounded-full" />
          <div className="absolute bottom-16 left-28 w-1 h-1 bg-purple-300 rounded-full" />
          <div className="absolute top-48 left-1/3 w-1.5 h-1.5 bg-indigo-200 rounded-full animate-pulse" />
          <div className="absolute bottom-32 right-1/4 w-1 h-1 bg-purple-100 rounded-full" />
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Constellation of Seven Stars Header */}
        <div className="text-center space-y-3 relative z-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            {[...Array(7)].map((_, i) => (
              <Star
                key={i}
                className="w-4 h-4 text-purple-300 fill-purple-300/60 animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-purple-100 flex items-center justify-center gap-2">
            <span>The Purple Universe</span>
            <span className="text-lg">💜</span>
          </h2>

          <p className="text-xs sm:text-sm text-purple-200/80 max-w-md mx-auto italic font-serif leading-relaxed">
            "Somewhere between yesterday and tomorrow, there is this little space that belongs to you."
          </p>
        </div>

        {/* Gentle Breathing Bubble */}
        <div className="my-8 flex flex-col items-center justify-center text-center">
          <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-purple-600/40 via-violet-500/20 to-indigo-500/30 border border-purple-400/40 flex items-center justify-center shadow-lg shadow-purple-900/50 animate-pulse">
            <Moon className="w-8 h-8 text-purple-200" />
          </div>
          <span className="text-xs font-serif font-medium text-purple-300 mt-3 tracking-wide">
            {breathingText}
          </span>
        </div>

        {/* Star Memories Showcase */}
        <div className="space-y-4 pt-4 border-t border-purple-900/40 relative z-10">
          <div className="flex items-center justify-between text-xs text-purple-300 font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Your Cherished Milestones
            </span>
            <span className="text-[11px] text-purple-400">Stars in your orbit</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {favoriteMemories.length > 0 ? (
              favoriteMemories.map((mem) => (
                <div
                  key={mem.id}
                  className="p-3.5 rounded-2xl bg-white/5 border border-purple-500/20 backdrop-blur-xs flex gap-3 items-center"
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-purple-950">
                    <img src={mem.cover_image} alt={mem.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-purple-100 font-serif truncate">{mem.title}</h4>
                    <p className="text-[11px] text-purple-300/80 truncate mt-0.5">{mem.description || mem.location}</p>
                    <span className="text-[10px] text-purple-400 font-mono">{mem.memory_date}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-4 text-center text-xs text-purple-300/60">
                Star your favorite memories or journal pages to illuminate your private universe.
              </div>
            )}
          </div>
        </div>

        {/* Bottom Comforting Note */}
        <div className="mt-8 pt-4 border-t border-purple-900/40 text-center text-xs text-purple-300/70 font-serif">
          <span>Purple is always waiting for you. You did well today. 💜</span>
        </div>
      </div>
    </div>
  );
};

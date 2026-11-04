import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Check, Heart, BookOpen, Calendar, Camera, Smile, CheckSquare, Palette, Type } from 'lucide-react';
import { ThemeType, FontFamilyType } from '../types';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const { user, settings, updateSettings } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['journal', 'mood', 'tasks']);
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>(settings?.theme || 'warm-sunrise');
  const [selectedFont, setSelectedFont] = useState<FontFamilyType>(settings?.font_family || 'serif');

  if (!isOpen) return null;

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    await updateSettings({
      theme: selectedTheme,
      font_family: selectedFont,
      dark_mode: selectedTheme === 'midnight',
      onboarding_completed: true,
      primary_interests: selectedInterests,
    });
    onComplete();
  };

  const themeOptions: Array<{ id: ThemeType; name: string; desc: string; colors: string }> = [
    { id: 'warm-sunrise', name: 'Warm Sunrise', desc: 'Soft warm cream & terracotta peach', colors: 'from-amber-100 to-rose-100 border-amber-300' },
    { id: 'cozy-sage', name: 'Cozy Sage', desc: 'Earthy calming greens & warm beige', colors: 'from-emerald-50 to-teal-100 border-emerald-300' },
    { id: 'lavender-dream', name: 'Lavender Dream', desc: 'Gentle lilac, purple & misty rose', colors: 'from-purple-50 to-fuchsia-100 border-purple-300' },
    { id: 'ocean-calm', name: 'Ocean Calm', desc: 'Soothing sky blues & neutral sand', colors: 'from-sky-50 to-blue-100 border-blue-300' },
    { id: 'midnight', name: 'Midnight', desc: 'Calming dark canvas with soft highlights', colors: 'from-slate-800 to-slate-900 border-slate-700' },
  ];

  const fontOptions: Array<{ id: FontFamilyType; name: string; preview: string; className: string }> = [
    { id: 'serif', name: 'Warm Editorial Serif (Lora)', preview: 'Dear Diary, a quiet page for thoughtful reflections.', className: 'font-serif' },
    { id: 'sans', name: 'Clean Modern Sans (Plus Jakarta)', preview: 'Focus on today with clarity and clean structure.', className: 'font-sans' },
    { id: 'handwriting', name: 'Cozy Handwritten (Caveat)', preview: 'Personal notes that feel handwritten and warm ✨', className: 'font-handwriting text-lg' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-amber-100/60 dark:border-slate-800 p-8 overflow-hidden">
        {/* Progress steps */}
        <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center">
              {step}
            </span>
            <span className="text-xs font-medium text-slate-500">Step {step} of 3</span>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step ? 'w-8 bg-amber-500' : s < step ? 'w-3 bg-amber-300' : 'w-3 bg-slate-200 dark:bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif">
                Welcome, {user?.name || 'Friend'} 🌷
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                What would you like to use your personal sanctuary for?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {[
                { id: 'journal', label: 'Personal Journal & Diary', icon: BookOpen, desc: 'Write reflections & decorate' },
                { id: 'planner', label: 'Timetable & Schedule', icon: Calendar, desc: 'Daily and weekly plans' },
                { id: 'memories', label: 'Photo Memory Albums', icon: Camera, desc: 'Preserve cherished milestones' },
                { id: 'tasks', label: 'To-Do & Productivity', icon: CheckSquare, desc: 'Track small steps forward' },
                { id: 'mood', label: 'Mood Tracking & Insights', icon: Smile, desc: 'Understand personal patterns' },
              ].map((item) => {
                const isSelected = selectedInterests.includes(item.id);
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleInterest(item.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/30 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.label}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-2.5 px-6 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-all cursor-pointer shadow-sm"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif">
                Pick Your Atmosphere 🎨
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Choose the color palette that makes you feel most at ease.
              </p>
            </div>

            <div className="space-y-2.5 mt-4">
              {themeOptions.map((t) => {
                const isSelected = selectedTheme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTheme(t.id);
                      updateSettings({ theme: t.id, dark_mode: t.id === 'midnight' });
                    }}
                    className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-400/30 bg-amber-50/40 dark:bg-slate-800'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${t.colors} border shadow-inner`} />
                      <div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{t.name}</div>
                        <div className="text-[11px] text-slate-400">{t.desc}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="py-2.5 px-6 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-all cursor-pointer shadow-sm"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif">
                Select Your Journal Font ✍️
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Customize how your entries and thoughts will look.
              </p>
            </div>

            <div className="space-y-3 mt-4">
              {fontOptions.map((f) => {
                const isSelected = selectedFont === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setSelectedFont(f.id);
                      updateSettings({ font_family: f.id });
                    }}
                    className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-400/30 bg-amber-50/40 dark:bg-slate-800'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{f.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                    </div>
                    <p className={`text-sm text-slate-600 dark:text-slate-300 ${f.className}`}>
                      "{f.preview}"
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="py-2.5 px-6 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> Enter BORAH 💜
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

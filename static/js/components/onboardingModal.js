import { store, updateSettings } from '../state.js';
import { escapeHtml, renderIcons } from '../utils/dom.js';

const THEME_OPTIONS = [
  { id: 'warm-sunrise', name: 'Warm Sunrise', desc: 'Soft warm cream & terracotta peach', colors: 'from-amber-100 to-rose-100 border-amber-300' },
  { id: 'cozy-sage', name: 'Cozy Sage', desc: 'Earthy calming greens & warm beige', colors: 'from-emerald-50 to-teal-100 border-emerald-300' },
  { id: 'lavender-dream', name: 'Lavender Dream', desc: 'Gentle lilac, purple & misty rose', colors: 'from-purple-50 to-fuchsia-100 border-purple-300' },
  { id: 'ocean-calm', name: 'Ocean Calm', desc: 'Soothing sky blues & neutral sand', colors: 'from-sky-50 to-blue-100 border-blue-300' },
  { id: 'midnight', name: 'Midnight', desc: 'Calming dark canvas with soft highlights', colors: 'from-slate-800 to-slate-900 border-slate-700' },
];

const FONT_OPTIONS = [
  { id: 'serif', name: 'Warm Editorial Serif (Lora)', preview: 'Dear Diary, a quiet page for thoughtful reflections.', className: 'font-serif' },
  { id: 'sans', name: 'Clean Modern Sans (Plus Jakarta)', preview: 'Focus on today with clarity and clean structure.', className: 'font-sans' },
  { id: 'handwriting', name: 'Cozy Handwritten (Caveat)', preview: 'Personal notes that feel handwritten and warm ✨', className: 'font-handwriting text-lg' },
];

const INTEREST_OPTIONS = [
  { id: 'journal', label: 'Personal Journal & Diary', icon: 'book-open', desc: 'Write reflections & decorate' },
  { id: 'planner', label: 'Timetable & Schedule', icon: 'calendar', desc: 'Daily and weekly plans' },
  { id: 'memories', label: 'Photo Memory Albums', icon: 'camera', desc: 'Preserve cherished milestones' },
  { id: 'tasks', label: 'To-Do & Productivity', icon: 'check-square', desc: 'Track small steps forward' },
  { id: 'mood', label: 'Mood Tracking & Insights', icon: 'smile', desc: 'Understand personal patterns' },
];

export function renderOnboardingModal(container, isOpen, onComplete) {
  if (!isOpen) {
    container.innerHTML = '';
    return;
  }

  let step = 1;
  let selectedInterests = ['journal', 'mood', 'tasks'];
  let selectedTheme = store.settings?.theme || 'warm-sunrise';
  let selectedFont = store.settings?.font_family || 'serif';

  const render = () => {
    const progressHtml = [1, 2, 3]
      .map(
        (s) =>
          `<div class="h-1.5 rounded-full transition-all duration-300 ${
            s === step ? 'w-8 bg-amber-500' : s < step ? 'w-3 bg-amber-300' : 'w-3 bg-slate-200 dark:bg-slate-800'
          }"></div>`
      )
      .join('');

    let bodyHtml = '';
    if (step === 1) {
      const cards = INTEREST_OPTIONS.map((item) => {
        const isSel = selectedInterests.includes(item.id);
        return `
          <button type="button" data-interest="${item.id}" class="p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            isSel
              ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/30 shadow-sm'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800/40'
          }">
            <div class="flex items-center justify-between mb-2">
              <div class="p-2 rounded-xl ${isSel ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}">
                <i data-lucide="${item.icon}" class="w-4 h-4"></i>
              </div>
              ${isSel ? '<i data-lucide="check" class="w-4 h-4 text-amber-600 dark:text-amber-400"></i>' : ''}
            </div>
            <div>
              <h4 class="text-xs font-semibold text-slate-800 dark:text-slate-200">${escapeHtml(item.label)}</h4>
              <p class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(item.desc)}</p>
            </div>
          </button>`;
      }).join('');

      bodyHtml = `
        <div class="space-y-4">
          <div class="text-center">
            <h3 class="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif">Welcome, ${escapeHtml(store.user?.name || 'Friend')} 🌷</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">What would you like to use your personal sanctuary for?</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">${cards}</div>
          <div class="pt-4 flex justify-end">
            <button type="button" data-step="2" class="py-2.5 px-6 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-all cursor-pointer shadow-sm">Continue →</button>
          </div>
        </div>`;
    } else if (step === 2) {
      const cards = THEME_OPTIONS.map((t) => {
        const isSel = selectedTheme === t.id;
        return `
          <button type="button" data-theme-opt="${t.id}" class="w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
            isSel
              ? 'border-amber-500 ring-2 ring-amber-400/30 bg-amber-50/40 dark:bg-slate-800'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800/40'
          }">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-gradient-to-br ${t.colors} border shadow-inner"></div>
              <div>
                <div class="text-xs font-semibold text-slate-800 dark:text-slate-200">${escapeHtml(t.name)}</div>
                <div class="text-[11px] text-slate-400">${escapeHtml(t.desc)}</div>
              </div>
            </div>
            ${isSel ? '<i data-lucide="check" class="w-4 h-4 text-amber-600 dark:text-amber-400"></i>' : ''}
          </button>`;
      }).join('');

      bodyHtml = `
        <div class="space-y-4">
          <div class="text-center">
            <h3 class="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif">Pick Your Atmosphere 🎨</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Choose the color palette that makes you feel most at ease.</p>
          </div>
          <div class="space-y-2.5 mt-4">${cards}</div>
          <div class="pt-4 flex justify-between">
            <button type="button" data-step="1" class="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">← Back</button>
            <button type="button" data-step="3" class="py-2.5 px-6 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-all cursor-pointer shadow-sm">Continue →</button>
          </div>
        </div>`;
    } else {
      const cards = FONT_OPTIONS.map((f) => {
        const isSel = selectedFont === f.id;
        return `
          <button type="button" data-font-opt="${f.id}" class="w-full p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            isSel
              ? 'border-amber-500 ring-2 ring-amber-400/30 bg-amber-50/40 dark:bg-slate-800'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800/40'
          }">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">${escapeHtml(f.name)}</span>
              ${isSel ? '<i data-lucide="check" class="w-4 h-4 text-amber-600 dark:text-amber-400"></i>' : ''}
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-300 ${f.className}">"${escapeHtml(f.preview)}"</p>
          </button>`;
      }).join('');

      bodyHtml = `
        <div class="space-y-4">
          <div class="text-center">
            <h3 class="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif">Select Your Journal Font ✍️</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Customize how your entries and thoughts will look.</p>
          </div>
          <div class="space-y-3 mt-4">${cards}</div>
          <div class="pt-4 flex justify-between">
            <button type="button" data-step="2" class="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">← Back</button>
            <button type="button" data-finish class="py-2.5 px-6 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-all cursor-pointer shadow-sm flex items-center gap-1.5">
              <i data-lucide="sparkles" class="w-3.5 h-3.5"></i> Enter BORAH 💜
            </button>
          </div>
        </div>`;
    }

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-in fade-in duration-300">
        <div class="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-amber-100/60 dark:border-slate-800 p-8 overflow-hidden">
          <div class="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center">${step}</span>
              <span class="text-xs font-medium text-slate-500">Step ${step} of 3</span>
            </div>
            <div class="flex gap-1.5">${progressHtml}</div>
          </div>
          ${bodyHtml}
        </div>
      </div>
    `;

    renderIcons(container);

    container.querySelectorAll('[data-interest]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-interest');
        selectedInterests = selectedInterests.includes(id)
          ? selectedInterests.filter((x) => x !== id)
          : [...selectedInterests, id];
        render();
      });
    });

    container.querySelectorAll('[data-theme-opt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedTheme = btn.getAttribute('data-theme-opt');
        updateSettings({ theme: selectedTheme, dark_mode: selectedTheme === 'midnight' });
        render();
      });
    });

    container.querySelectorAll('[data-font-opt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedFont = btn.getAttribute('data-font-opt');
        updateSettings({ font_family: selectedFont });
        render();
      });
    });

    container.querySelectorAll('[data-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        step = Number(btn.getAttribute('data-step'));
        render();
      });
    });

    container.querySelector('[data-finish]')?.addEventListener('click', async () => {
      await updateSettings({
        theme: selectedTheme,
        font_family: selectedFont,
        dark_mode: selectedTheme === 'midnight',
        onboarding_completed: true,
        primary_interests: selectedInterests,
      });
      container.innerHTML = '';
      if (onComplete) onComplete();
    });
  };

  render();
}

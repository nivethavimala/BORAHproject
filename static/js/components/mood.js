import { api } from '../api.js';
import { escapeHtml, renderIcons, todayIso } from '../utils/dom.js';

const MOOD_CHOICES = {
  happy: { emoji: '😊', label: 'Happy', poeticName: 'Sunny & Warm' },
  calm: { emoji: '😌', label: 'Calm', poeticName: 'Purple Calm' },
  neutral: { emoji: '😐', label: 'Neutral', poeticName: 'Steady & Balanced' },
  sad: { emoji: '😔', label: 'Gentle Sorrow', poeticName: 'Quiet Rain' },
  anxious: { emoji: '😰', label: 'Restless', poeticName: 'Flurrying Thoughts' },
  angry: { emoji: '😡', label: 'Frustrated', poeticName: 'Stormy' },
  tired: { emoji: '😴', label: 'Tired', poeticName: 'Moon Mood' },
  excited: { emoji: '🤩', label: 'Excited', poeticName: 'Little Joy 💜' },
};

export function renderMoodView(container) {
  let moods = [];
  let selectedMood = 'calm';
  let intensity = 7;
  let note = '';
  let deleteConfirmMoodId = null;
  let toastMessage = null;
  let toastTimer = null;
  let disposed = false;

  const showToast = (msg) => {
    toastMessage = msg;
    render();
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastMessage = null;
      render();
    }, 3000);
  };

  const render = () => {
    if (disposed) return;

    const moodCounts = {};
    moods.forEach((m) => {
      moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
    });

    const selectedInfo = MOOD_CHOICES[selectedMood] || MOOD_CHOICES.calm;

    const historyHtml =
      moods.length === 0
        ? `<div class="py-12 text-center text-xs text-slate-400">No moods logged yet. Check in above to begin your wellness log.</div>`
        : `<div class="space-y-3 max-h-80 overflow-y-auto pr-1">
            ${moods
              .slice(0, 10)
              .map((m) => {
                const conf = MOOD_CHOICES[m.mood] || MOOD_CHOICES.neutral;
                return `
                  <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
                    <div class="flex items-start gap-3">
                      <span class="text-2xl mt-0.5">${conf.emoji}</span>
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-bold text-slate-800 dark:text-slate-200">${escapeHtml(conf.poeticName)}</span>
                          <span class="text-[10px] text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md font-mono">
                            Intensity ${Number(m.intensity)}/10
                          </span>
                        </div>
                        ${m.note ? `<p class="text-xs text-slate-600 dark:text-slate-300 font-serif mt-1 italic">"${escapeHtml(m.note)}"</p>` : ''}
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] text-slate-400 whitespace-nowrap font-mono">${escapeHtml(m.date)}</span>
                      <button type="button" data-mood-del="${escapeHtml(m.id)}" class="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer" title="Delete this specific mood entry">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </div>`;
              })
              .join('')}
          </div>`;

    const deleteModalHtml = deleteConfirmMoodId
      ? `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
            <i data-lucide="trash-2" class="w-6 h-6"></i>
          </div>
          <div class="text-center">
            <h3 class="text-base font-bold text-slate-800 dark:text-slate-100">Delete Mood Entry?</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Are you sure you want to delete this specific mood log?</p>
          </div>
          <div class="flex items-center gap-3 pt-2">
            <button type="button" data-mood-cancel-del class="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer">Cancel</button>
            <button type="button" data-mood-confirm-del class="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow cursor-pointer">Delete Entry</button>
          </div>
        </div>
      </div>`
      : '';

    container.innerHTML = `
      <div class="space-y-6">
        ${toastMessage ? `<div class="fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl bg-slate-900 text-white text-xs font-medium shadow-xl border border-slate-700 animate-in fade-in duration-200">${escapeHtml(toastMessage)}</div>` : ''}

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-serif flex items-center gap-2">
              <span>Mood &amp; Emotional Space</span>
              <span class="text-sm font-sans font-normal text-slate-400">(${moods.length} entries)</span>
            </h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              A safe, non-judgmental space to record how you truly feel each day.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div class="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div class="flex items-center gap-2 text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider mb-4">
              <i data-lucide="sparkles" class="w-3.5 h-3.5 text-purple-500"></i>
              <span>How are you feeling right now?</span>
            </div>

            <form data-mood-form class="space-y-6">
              <div class="grid grid-cols-4 gap-2.5">
                ${Object.entries(MOOD_CHOICES)
                  .map(([key, item]) => {
                    const isSelected = selectedMood === key;
                    return `
                      <button type="button" data-mood-pick="${key}" class="p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        isSelected
                          ? 'border-purple-500 ring-2 ring-purple-400/30 bg-purple-50 dark:bg-purple-950/40 shadow-xs scale-105'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800/40'
                      }">
                        <span class="text-2xl">${item.emoji}</span>
                        <span class="text-[10px] font-semibold text-slate-700 dark:text-slate-200 truncate w-full">${escapeHtml(item.label)}</span>
                      </button>`;
                  })
                  .join('')}
              </div>

              <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <span class="text-xl">${selectedInfo.emoji}</span>
                  <div>
                    <div class="text-xs font-bold text-slate-800 dark:text-slate-100">${escapeHtml(selectedInfo.poeticName)}</div>
                    <div class="text-[10px] text-slate-400">Emotional atmosphere</div>
                  </div>
                </div>
              </div>

              <div class="space-y-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-semibold text-slate-700 dark:text-slate-300">Emotional Intensity</span>
                  <span data-mood-intensity-label class="font-mono font-bold text-purple-600 dark:text-purple-400 tabular-nums">${intensity} / 10</span>
                </div>
                <input type="range" min="1" max="10" value="${intensity}" data-mood-intensity class="w-full accent-purple-600 cursor-pointer" />
                <div class="flex justify-between text-[10px] text-slate-400">
                  <span>Gentle / Soft (1)</span>
                  <span>Moderate (5)</span>
                  <span>Intense / Peak (10)</span>
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Reflection Note (Optional)</label>
                <textarea rows="3" data-mood-note placeholder="What might be contributing to this feeling?" class="w-full text-xs px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none resize-none">${escapeHtml(note)}</textarea>
              </div>

              <button type="submit" class="w-full py-3 rounded-2xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5">
                <i data-lucide="heart" class="w-3.5 h-3.5 fill-white"></i>
                <span>Record Mood 💜</span>
              </button>
            </form>
          </div>

          <div class="lg:col-span-7 space-y-6">
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <i data-lucide="bar-chart-2" class="w-4 h-4 text-purple-600"></i>
                <span>Your Mood Spectrum</span>
              </h3>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                ${Object.entries(MOOD_CHOICES)
                  .map(([k, item]) => {
                    const count = moodCounts[k] || 0;
                    return `
                      <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
                        <span class="text-xl block">${item.emoji}</span>
                        <span class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block">${escapeHtml(item.label)}</span>
                        <span class="text-[10px] text-slate-400 tabular-nums">${count} ${count === 1 ? 'time' : 'times'}</span>
                      </div>`;
                  })
                  .join('')}
              </div>
            </div>

            <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <i data-lucide="clock" class="w-4 h-4 text-amber-500"></i>
                <span>Recent Mood Log</span>
              </h3>
              ${historyHtml}
            </div>
          </div>
        </div>

        ${deleteModalHtml}
      </div>
    `;

    renderIcons(container);

    container.querySelectorAll('[data-mood-pick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        note = container.querySelector('[data-mood-note]')?.value || note;
        selectedMood = btn.getAttribute('data-mood-pick');
        render();
      });
    });

    container.querySelector('[data-mood-intensity]')?.addEventListener('input', (e) => {
      intensity = Number(e.target.value);
      const label = container.querySelector('[data-mood-intensity-label]');
      if (label) label.textContent = `${intensity} / 10`;
    });

    container.querySelector('[data-mood-note]')?.addEventListener('input', (e) => {
      note = e.target.value;
    });

    container.querySelector('[data-mood-form]')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const res = await api.createMood({
          mood: selectedMood,
          emotion: MOOD_CHOICES[selectedMood]?.poeticName || '',
          intensity,
          note: note.trim(),
          date: todayIso(),
        });
        if (res.success) {
          moods = [res.mood, ...moods];
          note = '';
          if (typeof window.confetti === 'function') {
            window.confetti({
              particleCount: 35,
              spread: 50,
              origin: { y: 0.75 },
              colors: ['#A78BFA', '#F59E0B', '#10B981'],
            });
          }
          showToast('Mood recorded gently to your timeline 🌿');
        }
      } catch (err) {
        showToast(err.message || 'Unable to record mood.');
      }
    });

    container.querySelectorAll('[data-mood-del]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteConfirmMoodId = btn.getAttribute('data-mood-del');
        render();
      });
    });

    container.querySelector('[data-mood-cancel-del]')?.addEventListener('click', () => {
      deleteConfirmMoodId = null;
      render();
    });

    container.querySelector('[data-mood-confirm-del]')?.addEventListener('click', async () => {
      if (!deleteConfirmMoodId) return;
      try {
        const res = await api.deleteMood(deleteConfirmMoodId);
        if (res.success) {
          moods = moods.filter((m) => m.id !== deleteConfirmMoodId);
          deleteConfirmMoodId = null;
          showToast('Mood log removed.');
        }
      } catch (err) {
        showToast(err.message || 'Failed to delete mood.');
      }
    });
  };

  render();

  api
    .getMoods()
    .then((res) => {
      if (!disposed && res.success) {
        moods = res.moods || [];
        render();
      }
    })
    .catch((err) => console.error('Error loading moods:', err));

  return () => {
    disposed = true;
    if (toastTimer) clearTimeout(toastTimer);
  };
}

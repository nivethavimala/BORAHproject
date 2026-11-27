import { api } from '../api.js';
import { escapeHtml, renderIcons, todayIso } from '../utils/dom.js';

const CURATED_AFFIRMATIONS = [
  {
    quote: 'Steady progress every day builds meaningful, lasting work.',
    prompt: 'What small step moved my work or personal goals forward today?',
    tag: 'Clarity & Progress',
  },
  {
    quote: 'My time and attention are valuable; I invest them with calm intention.',
    prompt: 'Where did my focused attention create the most value today?',
    tag: 'Intentional Focus',
  },
  {
    quote: 'Every lesson taught, task completed, and note captured shapes tomorrow.',
    prompt: 'What accomplishment or insight from today am I proud of?',
    tag: 'Meaningful Impact',
  },
  {
    quote: 'Rest and reflection are part of sustainable productivity, never a detour.',
    prompt: 'How did I protect space to recharge and stay balanced today?',
    tag: 'Sustainable Balance',
  },
  {
    quote: 'I approach challenges with patience, curiosity, and quiet confidence.',
    prompt: 'What challenge did I handle calmly today, and what did it teach me?',
    tag: 'Calm Resilience',
  },
  {
    quote: 'Organization gives my mind the freedom to think creatively and deeply.',
    prompt: 'What priority can I organize clearly for tomorrow so my mind stays light?',
    tag: 'Clear Mind',
  },
  {
    quote: 'Small consistent habits quietly transform weeks into milestones.',
    prompt: 'Which daily habit helped me stay grounded this week?',
    tag: 'Daily Rhythm',
  },
  {
    quote: 'I celebrate completed efforts without measuring my worth by endless checklists.',
    prompt: 'What effort deserves appreciation today, regardless of what remains on my list?',
    tag: 'Self-Respect',
  },
];

function getInitialIndex(total) {
  const iso = todayIso();
  let sum = 0;
  for (let i = 0; i < iso.length; i += 1) {
    sum += iso.charCodeAt(i);
  }
  return total > 0 ? sum % total : 0;
}

export function renderDailyAffirmation(container, { onReflect } = {}) {
  if (!container) return () => {};

  let customAffirmations = [];
  let index = getInitialIndex(CURATED_AFFIRMATIONS.length);
  let autoRotate = true;
  let showAddForm = false;
  let showManageList = false;
  let saving = false;
  let statusMsg = '';
  let disposed = false;

  const favKey = 'borah_fav_affirmations';
  let favorites = [];
  try {
    favorites = JSON.parse(localStorage.getItem(favKey) || '[]');
    if (!Array.isArray(favorites)) favorites = [];
  } catch {
    favorites = [];
  }

  const getAllQuotes = () => [...customAffirmations, ...CURATED_AFFIRMATIONS];

  let rotateTimer = null;
  const resetRotationTimer = () => {
    if (rotateTimer) {
      clearInterval(rotateTimer);
      rotateTimer = null;
    }
    if (autoRotate && !showAddForm && !disposed) {
      rotateTimer = setInterval(() => {
        if (disposed || !autoRotate || showAddForm) return;
        const pool = getAllQuotes();
        if (pool.length > 1) {
          index = (index + 1) % pool.length;
          render();
        }
      }, 12000);
    }
  };

  const setStatus = (msg) => {
    statusMsg = msg;
    render();
    setTimeout(() => {
      if (!disposed) {
        statusMsg = '';
        render();
      }
    }, 2800);
  };

  const loadCustom = async () => {
    try {
      const res = await api.getAffirmations();
      if (!disposed && res.success) {
        customAffirmations = res.affirmations || [];
        if (customAffirmations.length > 0 && index >= getAllQuotes().length) {
          index = 0;
        }
        render();
      }
    } catch {}
  };

  const render = () => {
    if (disposed) return;

    const pool = getAllQuotes();
    const safeIdx = pool.length ? index % pool.length : 0;
    const item = pool[safeIdx] || CURATED_AFFIRMATIONS[0];
    const isFav = favorites.includes(item.quote);

    const addFormHtml = showAddForm
      ? `
      <form data-aff-form class="mt-4 pt-4 border-t border-purple-100 dark:border-purple-800/60 space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-bold text-slate-800 dark:text-slate-100">Add Your Own Custom Affirmation</h4>
          <button type="button" data-aff-cancel-add class="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">Cancel</button>
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Affirmation / Inspirational Quote *</label>
          <textarea name="quote" required rows="2" placeholder="e.g. I bring patience, clarity, and genuine care to every class I teach."
            class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"></textarea>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Reflection Prompt (Optional)</label>
            <input type="text" name="prompt" placeholder="e.g. What gave me energy today?"
              class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Theme / Tag (Optional)</label>
            <input type="text" name="tag" value="Personal" placeholder="e.g. Focus, Teaching, Balance"
              class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button type="submit" ${saving ? 'disabled' : ''} class="px-4 py-1.5 rounded-xl text-xs font-semibold borah-btn-sage cursor-pointer disabled:opacity-50">
            ${saving ? 'Saving...' : 'Save Custom Affirmation'}
          </button>
        </div>
      </form>`
      : '';

    const manageHtml = showManageList
      ? `
      <div class="mt-4 pt-4 border-t border-purple-100 dark:border-purple-800/60 space-y-2.5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-700 dark:text-slate-200">Your Custom Affirmations (${customAffirmations.length})</span>
          <button type="button" data-aff-close-manage class="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer">Close</button>
        </div>
        ${
          customAffirmations.length === 0
            ? `<p class="text-xs text-slate-400">You haven't added any custom affirmations yet.</p>`
            : `<div class="space-y-2">
                ${customAffirmations
                  .map(
                    (c, idx) => `
                  <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                    <button type="button" data-aff-jump="${idx}" class="text-left flex-1 cursor-pointer hover:text-emerald-700">
                      <div class="font-serif italic text-slate-800 dark:text-slate-100">"${escapeHtml(c.quote)}"</div>
                      <div class="text-[10px] text-slate-400 mt-0.5">${escapeHtml(c.tag || 'Personal')}</div>
                    </button>
                    <button type="button" data-aff-del="${escapeHtml(c.id)}" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer" title="Delete custom affirmation">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                  </div>`
                  )
                  .join('')}
              </div>`
        }
      </div>`
      : '';

    container.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-purple-200/80 dark:border-purple-900/60 shadow-xs">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="space-y-1.5 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                <i data-lucide="sparkles" class="w-3 h-3"></i> Daily Affirmations
              </span>
              ${
                item.is_custom
                  ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Custom</span>`
                  : ''
              }
              <span class="text-[11px] font-medium text-slate-400">${escapeHtml(item.tag || 'Inspiration')}</span>
              <span class="text-[10px] font-mono text-slate-400">(${safeIdx + 1}/${pool.length})</span>
              ${statusMsg ? `<span class="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">${escapeHtml(statusMsg)}</span>` : ''}
            </div>
            <p class="text-sm sm:text-base font-serif italic text-slate-800 dark:text-slate-100 leading-relaxed">
              "${escapeHtml(item.quote)}"
            </p>
            ${
              item.prompt
                ? `<p class="text-[11px] text-slate-500 dark:text-slate-400">Reflection prompt: ${escapeHtml(item.prompt)}</p>`
                : ''
            }
          </div>

          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <button type="button" data-aff-prev class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 cursor-pointer" title="Previous affirmation">
              <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
            </button>
            <button type="button" data-aff-next class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 cursor-pointer" title="Next affirmation">
              <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
            </button>
            <button type="button" data-aff-toggle-auto class="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer ${
              autoRotate
                ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-500'
            }" title="Toggle automatic quote rotation">
              ${autoRotate ? 'Auto-Rotate On' : 'Paused'}
            </button>
            <button type="button" data-aff-fav class="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs cursor-pointer transition-colors ${
              isFav
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-200 dark:border-rose-800'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-rose-500'
            }" title="${isFav ? 'Saved to favorites' : 'Save affirmation'}">
              <i data-lucide="heart" class="w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}"></i>
            </button>
            <button type="button" data-aff-open-add class="px-3 py-2 rounded-xl text-xs font-semibold borah-btn-blue flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>Add Custom</span>
            </button>
            ${
              customAffirmations.length > 0
                ? `<button type="button" data-aff-manage class="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 cursor-pointer">
                    Custom (${customAffirmations.length})
                  </button>`
                : ''
            }
            <button type="button" data-aff-reflect class="px-3.5 py-2 rounded-xl text-xs font-semibold borah-btn-sage flex items-center gap-1.5 cursor-pointer shadow-xs">
              <i data-lucide="book-open" class="w-3.5 h-3.5"></i>
              <span>Reflect in Journal</span>
            </button>
          </div>
        </div>
        ${addFormHtml}
        ${manageHtml}
      </div>
    `;

    renderIcons(container);

    container.querySelector('[data-aff-prev]')?.addEventListener('click', () => {
      const len = getAllQuotes().length;
      index = (index - 1 + len) % len;
      resetRotationTimer();
      render();
    });

    container.querySelector('[data-aff-next]')?.addEventListener('click', () => {
      const len = getAllQuotes().length;
      index = (index + 1) % len;
      resetRotationTimer();
      render();
    });

    container.querySelector('[data-aff-toggle-auto]')?.addEventListener('click', () => {
      autoRotate = !autoRotate;
      resetRotationTimer();
      render();
    });

    container.querySelector('[data-aff-fav]')?.addEventListener('click', () => {
      if (favorites.includes(item.quote)) {
        favorites = favorites.filter((q) => q !== item.quote);
      } else {
        favorites = [...favorites, item.quote];
      }
      try {
        localStorage.setItem(favKey, JSON.stringify(favorites));
      } catch {}
      render();
    });

    container.querySelector('[data-aff-open-add]')?.addEventListener('click', () => {
      showAddForm = !showAddForm;
      if (showAddForm) showManageList = false;
      resetRotationTimer();
      render();
    });

    container.querySelector('[data-aff-cancel-add]')?.addEventListener('click', () => {
      showAddForm = false;
      resetRotationTimer();
      render();
    });

    container.querySelector('[data-aff-manage]')?.addEventListener('click', () => {
      showManageList = !showManageList;
      if (showManageList) showAddForm = false;
      render();
    });

    container.querySelector('[data-aff-close-manage]')?.addEventListener('click', () => {
      showManageList = false;
      render();
    });

    container.querySelectorAll('[data-aff-jump]').forEach((btn) => {
      btn.addEventListener('click', () => {
        index = Number(btn.getAttribute('data-aff-jump') || 0);
        showManageList = false;
        resetRotationTimer();
        render();
      });
    });

    container.querySelectorAll('[data-aff-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-aff-del');
        try {
          await api.deleteAffirmation(id);
          customAffirmations = customAffirmations.filter((c) => c.id !== id);
          index = 0;
          setStatus('Custom affirmation removed.');
        } catch {}
      });
    });

    container.querySelector('[data-aff-form]')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const quote = String(fd.get('quote') || '').trim();
      const prompt = String(fd.get('prompt') || '').trim();
      const tag = String(fd.get('tag') || 'Personal').trim() || 'Personal';
      if (!quote) return;

      saving = true;
      render();
      try {
        const res = await api.createAffirmation({ quote, prompt, tag });
        if (!disposed && res.success && res.affirmation) {
          customAffirmations = [res.affirmation, ...customAffirmations];
          index = 0;
          showAddForm = false;
          saving = false;
          resetRotationTimer();
          setStatus('Custom affirmation saved!');
        }
      } catch {
        if (!disposed) {
          saving = false;
          render();
        }
      }
    });

    container.querySelector('[data-aff-reflect]')?.addEventListener('click', () => {
      if (onReflect) {
        const body = item.prompt ? `${item.quote}\n\n${item.prompt}` : item.quote;
        onReflect(body, 'Daily Affirmation Reflection');
      }
    });
  };

  render();
  loadCustom();
  resetRotationTimer();

  return () => {
    disposed = true;
    if (rotateTimer) {
      clearInterval(rotateTimer);
      rotateTimer = null;
    }
  };
}

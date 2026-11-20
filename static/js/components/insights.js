import { api } from '../api.js';
import { escapeHtml, renderIcons } from '../utils/dom.js';

export function renderInsightsView(container, { onOpenSevenDayChallenge, onNavigateToJournal }) {
  let stats = {
    journalCount: 0,
    memoryCount: 0,
    tasksCount: 0,
    tasksCompleted: 0,
    moodsCount: 0,
    topMood: 'Calm',
  };
  let aiSummary = null;
  let aiPrompts = [];
  let aiLoading = false;
  let disposed = false;

  const generateSummary = async () => {
    aiLoading = true;
    render();
    try {
      const [sumRes, prmRes] = await Promise.all([api.getAiSummary(), api.getAiPrompts()]);
      if (disposed) return;
      if (sumRes.success) aiSummary = sumRes.summary;
      if (prmRes.success) aiPrompts = prmRes.prompts || [];
    } catch (err) {
      console.error('AI summary error:', err);
    } finally {
      if (!disposed) {
        aiLoading = false;
        render();
      }
    }
  };

  const render = () => {
    if (disposed) return;

    const completionRate = stats.tasksCount > 0 ? Math.round((stats.tasksCompleted / stats.tasksCount) * 100) : 0;

    const summaryBodyHtml = aiLoading
      ? `<div class="py-8 text-center text-xs text-purple-600">
          <span class="inline-block w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-2"></span>
          <p>Synthesizing your peaceful weekly reflection...</p>
        </div>`
      : aiSummary
      ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-purple-100 dark:border-purple-900/40 space-y-1">
            <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200">✨ Highlights &amp; Small Victories</h4>
            <p class="text-xs text-slate-600 dark:text-slate-300 font-serif leading-relaxed">${escapeHtml(aiSummary.highlights)}</p>
          </div>
          <div class="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-purple-100 dark:border-purple-900/40 space-y-1">
            <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200">🌸 Moments of Quiet Joy</h4>
            <p class="text-xs text-slate-600 dark:text-slate-300 font-serif leading-relaxed">${escapeHtml(aiSummary.positiveMoments)}</p>
          </div>
          <div class="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-purple-100 dark:border-purple-900/40 space-y-1">
            <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200">🌱 Gentle Growth for Next Week</h4>
            <p class="text-xs text-slate-600 dark:text-slate-300 font-serif leading-relaxed">${escapeHtml(aiSummary.growthAreas)}</p>
          </div>
          <div class="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-purple-100 dark:border-purple-900/40 space-y-1">
            <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200">💜 Pattern Observation</h4>
            <p class="text-xs text-slate-600 dark:text-slate-300 font-serif leading-relaxed italic">"${escapeHtml(aiSummary.patternObservation)}"</p>
          </div>
        </div>`
      : '';

    const promptsHtml = aiPrompts
      .slice(0, 3)
      .map(
        (prompt) => `
        <div data-ins-prompt class="p-3.5 rounded-2xl bg-amber-50/40 dark:bg-slate-800/60 border border-amber-100/60 dark:border-slate-700 hover:border-amber-300 cursor-pointer transition-colors group flex items-center justify-between">
          <p class="text-xs text-slate-700 dark:text-slate-300 font-serif italic">"${escapeHtml(prompt)}"</p>
          <i data-lucide="arrow-right" class="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors shrink-0 ml-2"></i>
        </div>`
      )
      .join('');

    container.innerHTML = `
      <div class="space-y-8 animate-in fade-in duration-300">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-serif flex items-center gap-2">
              <span>Personal Insights &amp; Reflection</span>
            </h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Discover your habits, emotional trends, and weekly self-growth.
            </p>
          </div>
          <button type="button" data-ins-refresh ${aiLoading ? 'disabled' : ''} class="px-4 py-2 rounded-2xl text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}"></i>
            <span>${aiLoading ? 'Synthesizing...' : 'Refresh Reflections'}</span>
          </button>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div class="flex items-center gap-2 text-slate-400 text-xs mb-2">
              <i data-lucide="book-open" class="w-4 h-4 text-amber-500"></i>
              <span>Journal Pages</span>
            </div>
            <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 font-mono tabular-nums">${stats.journalCount}</div>
            <div class="text-[11px] text-slate-400 mt-1">Reflections written</div>
          </div>
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div class="flex items-center gap-2 text-slate-400 text-xs mb-2">
              <i data-lucide="camera" class="w-4 h-4 text-rose-500"></i>
              <span>Memory Albums</span>
            </div>
            <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 font-mono tabular-nums">${stats.memoryCount}</div>
            <div class="text-[11px] text-slate-400 mt-1">Milestones preserved</div>
          </div>
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div class="flex items-center gap-2 text-slate-400 text-xs mb-2">
              <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-500"></i>
              <span>Task Completion</span>
            </div>
            <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 font-mono tabular-nums">${completionRate}%</div>
            <div class="text-[11px] text-slate-400 mt-1">${stats.tasksCompleted} of ${stats.tasksCount} done</div>
          </div>
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div class="flex items-center gap-2 text-slate-400 text-xs mb-2">
              <i data-lucide="smile" class="w-4 h-4 text-purple-500"></i>
              <span>Mood Check-ins</span>
            </div>
            <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 font-mono tabular-nums">${stats.moodsCount}</div>
            <div class="text-[11px] text-slate-400 mt-1 capitalize">Primary tone: ${escapeHtml(stats.topMood)}</div>
          </div>
        </div>

        <div class="bg-gradient-to-br from-purple-50/70 via-violet-50/40 to-indigo-50/30 dark:from-slate-900 dark:to-purple-950/20 rounded-3xl p-6 sm:p-8 border border-purple-200/80 dark:border-purple-900/60 shadow-xs space-y-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                <i data-lucide="sparkles" class="w-4 h-4"></i>
              </div>
              <div>
                <h2 class="text-base font-bold text-slate-800 dark:text-slate-100 font-serif">Weekly Reflection Summary</h2>
                <span class="text-[11px] text-purple-700 dark:text-purple-400">AI-assisted observations · Strictly non-clinical</span>
              </div>
            </div>
            <span class="text-xs text-purple-600 dark:text-purple-400 font-serif">Gemini 3.8 Flash</span>
          </div>
          ${summaryBodyHtml}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div class="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <i data-lucide="sparkles" class="w-3.5 h-3.5 text-amber-500"></i>
              <span>Gentle Questions to Consider</span>
            </div>
            <div class="space-y-2.5">${promptsHtml}</div>
          </div>

          <div class="bg-gradient-to-br from-purple-100/60 to-rose-100/50 dark:from-slate-900 dark:to-purple-950/40 rounded-3xl p-6 border border-purple-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div class="space-y-2">
              <div class="flex items-center gap-2 text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                <span>🌸 Guided Challenge</span>
              </div>
              <h3 class="text-lg font-bold font-serif text-slate-800 dark:text-slate-100">7 Days of Me Reflection</h3>
              <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-serif">
                A seven-day gentle journey touching upon smile, learning, appreciation, dreams, cherished memories, improvement, and your future letter.
              </p>
            </div>
            <button type="button" data-ins-7day class="mt-6 w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5">
              <span>Open 7-Day Guide</span>
              <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    renderIcons(container);

    container.querySelector('[data-ins-refresh]')?.addEventListener('click', generateSummary);
    container.querySelector('[data-ins-7day]')?.addEventListener('click', onOpenSevenDayChallenge);
    container.querySelectorAll('[data-ins-prompt]').forEach((el) => {
      el.addEventListener('click', onNavigateToJournal);
    });
  };

  render();

  Promise.all([
    api.getJournals().catch(() => ({ success: false, entries: [] })),
    api.getMemories().catch(() => ({ success: false, memories: [] })),
    api.getTasks().catch(() => ({ success: false, tasks: [] })),
    api.getMoods().catch(() => ({ success: false, moods: [] })),
  ]).then(([jRes, mRes, tRes, mdRes]) => {
    if (disposed) return;
    const tList = tRes.success ? tRes.tasks || [] : [];
    const mdList = mdRes.success ? mdRes.moods || [] : [];
    stats = {
      journalCount: jRes.success ? (jRes.entries || []).length : 0,
      memoryCount: mRes.success ? (mRes.memories || []).length : 0,
      tasksCount: tList.length,
      tasksCompleted: tList.filter((t) => t.completed).length,
      moodsCount: mdList.length,
      topMood: mdList[0]?.mood || 'Calm',
    };
    render();
  });

  generateSummary();

  return () => {
    disposed = true;
  };
}

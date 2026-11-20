import { api } from '../api.js';
import { store } from '../state.js';
import { escapeHtml, renderIcons, todayIso } from '../utils/dom.js';
import { createDailyAffirmationWidget } from './dailyAffirmation.js';

const COMFORTING_QUOTES = [
  { quote: 'Every page you write is a gift of self-understanding to your future self.', author: 'BORAH Companion' },
  { quote: 'Quiet progress is still real progress. Breathe and take the next gentle step.', author: 'Mindful Reminder' },
  { quote: 'Cherish the simple, peaceful moments; they form the true foundation of your memories.', author: 'Daily Thought' },
];

export function renderDashboard(container, { onNavigate, onOpenQuickJournal, onOpenJournalWithPrompt }) {
  let journals = [];
  let tasks = [];
  let schedules = [];
  let notes = [];
  let cleanupAffirmation = null;
  let disposed = false;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const render = () => {
    if (disposed) return;
    if (cleanupAffirmation) {
      cleanupAffirmation();
      cleanupAffirmation = null;
    }

    const user = store.user;
    const todayStr = todayIso();
    const todayTasks = tasks.filter((t) => !t.due_date || t.due_date === todayStr);
    const completedToday = todayTasks.filter((t) => t.completed).length;
    const progressPercent = todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 100;
    const recentJournal = journals[0];
    const pinnedNote = notes.find((n) => n.is_pinned) || notes[0];
    const currentDateFormatted = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const tasksHtml =
      todayTasks.length === 0
        ? `<p class="text-xs text-slate-400 text-center py-6">All quiet! No tasks scheduled for today.</p>`
        : todayTasks
            .slice(0, 4)
            .map(
              (t) => `
          <div data-dash-toggle-task="${escapeHtml(t.id)}" class="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors group">
            ${
              t.completed
                ? `<i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-500 shrink-0"></i>`
                : `<i data-lucide="circle" class="w-4 h-4 text-slate-300 group-hover:text-emerald-400 shrink-0"></i>`
            }
            <span class="text-xs text-slate-700 dark:text-slate-300 truncate flex-1 ${t.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''}">
              ${escapeHtml(t.title)}
            </span>
          </div>`
            )
            .join('');

    const recentJournalHtml = recentJournal
      ? `
        <div class="space-y-2">
          <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 font-serif truncate">${escapeHtml(recentJournal.title)}</h3>
          <p class="text-xs text-slate-600 dark:text-slate-300 font-serif leading-relaxed line-clamp-4">"${escapeHtml(recentJournal.content)}"</p>
          ${
            recentJournal.stickers && recentJournal.stickers.length > 0
              ? `<div class="flex gap-1 pt-1">${recentJournal.stickers
                  .slice(0, 3)
                  .map((st) => `<span class="text-base">${escapeHtml(st.sticker_type)}</span>`)
                  .join('')}</div>`
              : ''
          }
        </div>`
      : `<div class="py-8 text-center text-xs text-slate-400"><p>Your story starts here.</p><p class="mt-1">Write your very first page 🌷</p></div>`;

    const noticeboardHtml = pinnedNote
      ? `
        <div class="rounded-2xl p-4 shadow-xs border transition-all" style="background-color: ${escapeHtml(pinnedNote.color || '#FEF3C7')}; border-color: rgba(0,0,0,0.06);">
          <div class="flex items-center justify-between text-xs text-amber-900/80 mb-1">
            <span class="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
              <i data-lucide="pin" class="w-3 h-3"></i> Pinned Note
            </span>
            <span class="text-[10px] capitalize bg-white/60 px-1.5 py-0.5 rounded">${escapeHtml(pinnedNote.priority)}</span>
          </div>
          <h3 class="text-xs font-bold text-amber-950 line-clamp-1">${escapeHtml(pinnedNote.title)}</h3>
          <p class="text-[11px] text-amber-900/80 line-clamp-2 mt-1">${escapeHtml(pinnedNote.content)}</p>
        </div>`
      : `<div class="py-7 text-center rounded-2xl bg-amber-50/50 dark:bg-slate-800/40 border border-amber-200/40">
          <i data-lucide="sticky-note" class="w-7 h-7 mx-auto text-amber-400 mb-1"></i>
          <p class="text-xs text-slate-500 font-serif">No notes pinned yet.</p>
        </div>`;

    const schedulesHtml =
      schedules.length === 0
        ? `<p class="text-xs text-slate-400 text-center py-6">No scheduled events ahead.</p>`
        : schedules
            .slice(0, 3)
            .map(
              (s) => `
          <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
            <div class="text-center shrink-0 w-12 py-1 px-1.5 rounded-xl bg-white dark:bg-slate-700 shadow-xs">
              <div class="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 font-mono">${escapeHtml(s.start_time)}</div>
            </div>
            <div class="truncate flex-1">
              <div class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">${escapeHtml(s.title)}</div>
              <div class="text-[11px] text-slate-500 truncate">${escapeHtml(s.description || s.category)}</div>
            </div>
          </div>`
            )
            .join('');

    const pinnedPriorityHtml = pinnedNote
      ? `
        <div class="space-y-2">
          <h3 class="text-xs font-bold text-slate-800 dark:text-slate-200 font-serif">${escapeHtml(pinnedNote.title)}</h3>
          <p class="text-xs text-slate-600 dark:text-slate-300 font-serif whitespace-pre-line line-clamp-4 leading-relaxed">${escapeHtml(pinnedNote.content)}</p>
        </div>`
      : `<div class="py-8 text-center text-xs text-slate-400"><p>Pin important notes, ideas, or study checklists here.</p></div>`;

    container.innerHTML = `
      <div class="space-y-8 animate-in fade-in duration-300">
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-rose-50/50 to-orange-50/30 dark:from-slate-800/80 dark:to-slate-900 border border-amber-200/60 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div class="flex items-center gap-2 text-xs font-semibold text-amber-800/80 dark:text-amber-400/80 uppercase tracking-wider mb-1">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-amber-500"></i>
                <span>${escapeHtml(currentDateFormatted)}</span>
              </div>
              <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-serif">
                ${escapeHtml(getGreeting())}, ${escapeHtml(user?.name || 'Friend')} 🌷
              </h1>
              <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-xl italic">
                "${escapeHtml(COMFORTING_QUOTES[0].quote)}"
              </p>
            </div>

            <div class="flex items-center gap-3 shrink-0">
              <button type="button" data-dash-write class="px-4 py-2.5 rounded-2xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer">
                <i data-lucide="book-open" class="w-4 h-4"></i>
                <span>Write in Diary</span>
              </button>
              <button type="button" data-dash-nav="planner" class="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 transition-all shadow-xs flex items-center gap-2 cursor-pointer">
                <i data-lucide="calendar" class="w-4 h-4 text-amber-600"></i>
                <span>View Planner</span>
              </button>
            </div>
          </div>
        </div>

        <div data-daily-affirmation-slot></div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <i data-lucide="check-circle-2" class="w-4 h-4"></i>
                  </div>
                  <h2 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Today's Progress</h2>
                </div>
                <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">${progressPercent}%</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-4">
                <div class="bg-emerald-500 h-full rounded-full transition-all duration-500" style="width: ${progressPercent}%"></div>
              </div>
              <div class="space-y-2 max-h-48 overflow-y-auto">${tasksHtml}</div>
            </div>
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span class="tabular-nums">${completedToday} of ${todayTasks.length} tasks completed</span>
              <button type="button" data-dash-nav="tasks" class="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer">
                <span>View Tasks</span>
                <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between notebook-ruled-lines">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <i data-lucide="book-open" class="w-4 h-4"></i>
                  </div>
                  <h2 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Latest Diary Page</h2>
                </div>
                ${recentJournal ? `<span class="text-[11px] text-slate-400">${escapeHtml(new Date(recentJournal.entry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))}</span>` : ''}
              </div>
              ${recentJournalHtml}
            </div>
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span class="text-slate-400">${journals.length} ${journals.length === 1 ? 'entry' : 'entries'} in journal</span>
              <button type="button" data-dash-open-journal class="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer">
                <span>Open Journal</span>
                <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <i data-lucide="sticky-note" class="w-4 h-4"></i>
                  </div>
                  <h2 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Noticeboard &amp; Notes</h2>
                </div>
                <i data-lucide="sparkles" class="w-4 h-4 text-amber-400"></i>
              </div>
              <div class="space-y-3">${noticeboardHtml}</div>
            </div>
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span class="text-slate-400">${notes.length} ${notes.length === 1 ? 'note' : 'notes'} saved</span>
              <button type="button" data-dash-nav="notes" class="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer">
                <span>View Notes</span>
                <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <i data-lucide="calendar" class="w-4 h-4"></i>
                  </div>
                  <h2 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Upcoming Schedule</h2>
                </div>
              </div>
              <div class="space-y-2.5 max-h-48 overflow-y-auto">${schedulesHtml}</div>
            </div>
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span class="text-slate-400">${schedules.length} items planned</span>
              <button type="button" data-dash-nav="planner" class="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer">
                <span>Planner</span>
                <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>

          <div class="bg-[#FFFDF7] dark:bg-slate-900 rounded-3xl p-6 border border-amber-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 flex items-center justify-center">
                    <i data-lucide="pin" class="w-4 h-4 fill-amber-700"></i>
                  </div>
                  <h2 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Pinned Note</h2>
                </div>
                <span class="text-[10px] font-semibold uppercase text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">Priority</span>
              </div>
              ${pinnedPriorityHtml}
            </div>
            <div class="pt-4 border-t border-amber-900/10 dark:border-slate-800 flex items-center justify-between text-xs">
              <span class="text-slate-400">${notes.length} total notes</span>
              <button type="button" data-dash-nav="notes" class="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer">
                <span>Open Notes</span>
                <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>

          <div class="bg-gradient-to-br from-indigo-50/60 to-purple-50/40 dark:from-slate-900 dark:to-indigo-950/20 rounded-3xl p-6 border border-indigo-100 dark:border-indigo-900/40 shadow-xs flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                    <i data-lucide="sparkles" class="w-4 h-4"></i>
                  </div>
                  <h2 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Gentle Reflection</h2>
                </div>
                <span class="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Gemini AI</span>
              </div>
              <div class="space-y-2 text-xs text-slate-600 dark:text-slate-300 font-serif leading-relaxed">
                <p class="italic">"What is one small accomplishment you are genuinely proud of today?"</p>
                <p class="text-[11px] text-slate-500 font-sans mt-2">
                  BORAH can analyze your journal tone and generate weekly reflections with comforting clarity.
                </p>
              </div>
            </div>
            <div class="pt-4 border-t border-indigo-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span class="text-slate-400">Personal Insights</span>
              <button type="button" data-dash-nav="insights" class="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer">
                <span>View Insights</span>
                <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    renderIcons(container);

    const affSlot = container.querySelector('[data-daily-affirmation-slot]');
    if (affSlot) {
      cleanupAffirmation = createDailyAffirmationWidget(affSlot, {
        onReflectInJournal: (prompt, title) => {
          if (onOpenJournalWithPrompt) {
            onOpenJournalWithPrompt(prompt, title);
          } else {
            onNavigate('journal');
          }
        },
      });
    }

    container.querySelector('[data-dash-write]')?.addEventListener('click', onOpenQuickJournal);
    container.querySelector('[data-dash-open-journal]')?.addEventListener('click', () => {
      onNavigate('journal', recentJournal?.id);
    });
    container.querySelectorAll('[data-dash-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        onNavigate(btn.getAttribute('data-dash-nav'));
      });
    });

    container.querySelectorAll('[data-dash-toggle-task]').forEach((el) => {
      el.addEventListener('click', async () => {
        const id = el.getAttribute('data-dash-toggle-task');
        const task = tasks.find((t) => t.id === id);
        if (!task) return;
        const updatedStatus = !task.completed;
        try {
          await api.updateTask(task.id, { completed: updatedStatus });
          tasks = tasks.map((t) => (t.id === task.id ? { ...t, completed: updatedStatus } : t));
          const remaining = tasks.filter((t) => !t.completed);
          if (updatedStatus && remaining.length === 0 && typeof window.confetti === 'function') {
            window.confetti({
              particleCount: 60,
              spread: 70,
              origin: { y: 0.7 },
              colors: ['#F59E0B', '#10B981', '#EC4899', '#6366F1'],
            });
          }
          render();
        } catch (err) {
          console.error('Failed to toggle task:', err);
        }
      });
    });
  };

  render();

  Promise.all([
    api.getJournals().catch(() => ({ success: false, entries: [] })),
    api.getTasks().catch(() => ({ success: false, tasks: [] })),
    api.getSchedules().catch(() => ({ success: false, schedules: [] })),
    api.getNotes().catch(() => ({ success: false, notes: [] })),
  ]).then(([jRes, tRes, sRes, nRes]) => {
    if (disposed) return;
    if (jRes.success) journals = jRes.entries || [];
    if (tRes.success) tasks = tRes.tasks || [];
    if (sRes.success) schedules = sRes.schedules || [];
    if (nRes.success) notes = nRes.notes || [];
    render();
  });

  return () => {
    disposed = true;
    if (cleanupAffirmation) cleanupAffirmation();
  };
}

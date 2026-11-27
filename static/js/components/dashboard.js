import { api } from '../api.js';
import { store } from '../state.js';
import { escapeHtml, renderIcons, todayIso } from '../utils/dom.js';
import { renderDailyAffirmation } from './dailyAffirmation.js';

export function renderDashboard(container, { onNavigate, onOpenQuickActivity, onOpenJournalWithPrompt }) {
  let data = null;
  let loading = true;
  let toastMsg = '';
  let disposed = false;
  let affCleanup = null;

  const todayDisplay = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const showToast = (msg) => {
    toastMsg = msg;
    render();
    setTimeout(() => {
      if (!disposed) {
        toastMsg = '';
        render();
      }
    }, 3000);
  };

  const render = () => {
    if (disposed) return;

    const userName = store.user?.name || 'Friend';
    const vis = store.settings?.visible_modules || {};
    const ov = data?.overview || {
      activities_today: 0,
      activities_completed_today: 0,
      activities_pending_today: 0,
      recorded_duration_label: '0 min',
      recorded_week_label: '0 min',
      tasks_completed: 0,
      tasks_pending: 0,
      upcoming_events_count: 0,
      today_events_count: 0,
      active_projects_count: 0,
    };

    const todayActs = data?.today_activities || [];
    const recentActs = data?.recent_activities || [];
    const upcoming = data?.upcoming_schedules || [];
    const pendingTasks = data?.pending_task_highlights || [];
    const reminders = data?.reminders || [];
    const weeklySeries = data?.weekly_series || [];
    const catBreakdown = data?.category_breakdown || [];

    const maxWeekMins = Math.max(60, ...weeklySeries.map((d) => d.minutes || 0));
    const maxCatMins = Math.max(30, ...catBreakdown.map((c) => c.minutes || 0));

    container.innerHTML = `
      <div class="borah-container-wide space-y-6 animate-in fade-in duration-300">
        ${toastMsg ? `<div class="fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl bg-slate-900 text-white text-xs font-medium shadow-xl">${escapeHtml(toastMsg)}</div>` : ''}

        <!-- Header Banner -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
              <span>${escapeHtml(todayDisplay)}</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 font-serif mt-1">
              Welcome back, ${escapeHtml(userName)}
            </h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Your workspace to organize, track and reflect on your everyday activities.
              ${store.user?.job_title ? `<span class="ml-1 font-medium text-slate-600 dark:text-slate-300">• ${escapeHtml(store.user.job_title)}</span>` : ''}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2.5">
            <button type="button" data-dash-quick-act class="px-4 py-2 rounded-xl text-xs font-semibold borah-btn-sage shadow-xs flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>Record Activity</span>
            </button>
            <button type="button" data-dash-export-daily class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="file-down" class="w-3.5 h-3.5 text-emerald-600"></i>
              <span>Daily Report PDF</span>
            </button>
          </div>
        </div>

        <!-- Today's Overview Summary Cards -->
        <div class="borah-grid-5">
          <button type="button" data-go="activities" class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs text-left hover:border-emerald-300 transition-all cursor-pointer">
            <div class="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Activities Today</span>
              <i data-lucide="activity" class="w-4 h-4 text-emerald-600"></i>
            </div>
            <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">${ov.activities_today}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">${ov.activities_completed_today} completed • ${ov.activities_pending_today} planned</div>
          </button>

          <button type="button" data-go="activities" class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs text-left hover:border-emerald-300 transition-all cursor-pointer">
            <div class="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Recorded Time Today</span>
              <i data-lucide="clock" class="w-4 h-4 text-sky-600"></i>
            </div>
            <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">${escapeHtml(ov.recorded_duration_label)}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">Actual logged hours only</div>
          </button>

          <button type="button" data-go="tasks" class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs text-left hover:border-emerald-300 transition-all cursor-pointer">
            <div class="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Tasks Completed</span>
              <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-600"></i>
            </div>
            <div class="text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">${ov.tasks_completed}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">${ov.tasks_pending} pending tasks</div>
          </button>

          <button type="button" data-go="planner" class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs text-left hover:border-emerald-300 transition-all cursor-pointer">
            <div class="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Upcoming Schedule</span>
              <i data-lucide="calendar-clock" class="w-4 h-4 text-indigo-600"></i>
            </div>
            <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">${ov.upcoming_events_count}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">${ov.today_events_count} scheduled today</div>
          </button>

          <button type="button" data-go="reports" class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs text-left hover:border-emerald-300 transition-all cursor-pointer">
            <div class="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>This Week Logged</span>
              <i data-lucide="bar-chart-2" class="w-4 h-4 text-purple-600"></i>
            </div>
            <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">${escapeHtml(ov.recorded_week_label)}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">${ov.active_projects_count} active projects</div>
          </button>
        </div>

        <!-- Analytics Row: Weekly Logged Hours + Category Time Distribution -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100">Weekly Recorded Activity Hours</h2>
                <p class="text-[11px] text-slate-400">Calculated directly from start and end times logged each day</p>
              </div>
              <button type="button" data-go="reports" class="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer">Full Report →</button>
            </div>
            <div class="grid grid-cols-7 gap-2 pt-3 items-end h-40">
              ${
                weeklySeries.length === 0
                  ? `<div class="col-span-7 text-center text-xs text-slate-400 py-10">${loading ? 'Loading chart...' : 'No logged hours this week yet.'}</div>`
                  : weeklySeries
                      .map((d) => {
                        const pct = Math.max(6, Math.round(((d.minutes || 0) / maxWeekMins) * 100));
                        const isToday = d.date === todayIso();
                        return `
                          <div class="flex flex-col items-center gap-1.5 h-full justify-end">
                            <span class="text-[10px] font-mono text-slate-500 tabular-nums">${d.hours}h</span>
                            <div class="w-full max-w-[36px] bg-slate-100 dark:bg-slate-800 rounded-t-lg h-24 flex items-end overflow-hidden">
                              <div class="w-full rounded-t-lg transition-all ${isToday ? 'bg-emerald-600' : 'bg-sky-500/80'}" style="height: ${d.minutes > 0 ? pct : 4}%"></div>
                            </div>
                            <span class="text-[11px] font-semibold ${isToday ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}">${escapeHtml(d.label)}</span>
                          </div>`;
                      })
                      .join('')
              }
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100">Category Distribution</h2>
              <span class="text-[11px] text-slate-400">This week</span>
            </div>
            <div class="space-y-3">
              ${
                catBreakdown.length === 0
                  ? `<p class="text-xs text-slate-400 py-8 text-center">Record activities to see category distribution.</p>`
                  : catBreakdown
                      .slice(0, 5)
                      .map((c) => {
                        const w = Math.max(8, Math.round((c.minutes / maxCatMins) * 100));
                        return `
                          <div class="space-y-1">
                            <div class="flex items-center justify-between text-xs">
                              <span class="font-medium text-slate-700 dark:text-slate-200 truncate">${escapeHtml(c.category)}</span>
                              <span class="font-mono text-[11px] text-slate-500">${c.hours}h</span>
                            </div>
                            <div class="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div class="h-full rounded-full bg-emerald-600" style="width: ${w}%"></div>
                            </div>
                          </div>`;
                      })
                      .join('')
              }
            </div>
          </div>
        </div>

        <!-- Operational Details Grid: Today's Activity Log + Pending Tasks & Upcoming Schedule -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Today's Recorded Activities -->
          <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <i data-lucide="list-checks" class="w-4 h-4 text-emerald-600"></i>
                <span>Today's Activity Log</span>
              </h2>
              <button type="button" data-go="activities" class="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer">Open Activity Log →</button>
            </div>
            ${
              todayActs.length === 0
                ? `<div class="py-10 text-center space-y-2 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl">
                    <p class="text-xs text-slate-500">No activities recorded yet for today.</p>
                    <button type="button" data-dash-quick-act class="px-3.5 py-1.5 rounded-xl text-xs font-semibold borah-btn-sage cursor-pointer">Log First Activity</button>
                  </div>`
                : `<div class="space-y-2.5">
                    ${todayActs
                      .map(
                        (a) => `
                      <div class="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div class="space-y-0.5">
                          <div class="flex flex-wrap items-center gap-2">
                            <span class="text-xs font-bold text-slate-800 dark:text-slate-100">${escapeHtml(a.title)}</span>
                            <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">${escapeHtml(a.category)}</span>
                            <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold capitalize ${a.status === 'completed' ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-700'}">${escapeHtml(a.status)}</span>
                          </div>
                          ${a.description ? `<p class="text-[11px] text-slate-500 line-clamp-1">${escapeHtml(a.description)}</p>` : ''}
                        </div>
                        <div class="text-right shrink-0">
                          <div class="text-xs font-mono font-semibold text-slate-700 dark:text-slate-200">${escapeHtml(a.start_time)} – ${escapeHtml(a.end_time)}</div>
                          <div class="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">${Math.floor((a.duration_minutes || 0) / 60)}h ${(a.duration_minutes || 0) % 60}m</div>
                        </div>
                      </div>`
                      )
                      .join('')}
                  </div>`
            }

            ${
              recentActs.length > 0
                ? `<div class="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recent Activity Logs</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      ${recentActs
                        .slice(0, 4)
                        .map(
                          (r) => `
                        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs flex items-center justify-between gap-2">
                          <span class="truncate font-medium text-slate-700 dark:text-slate-200">${escapeHtml(r.title)}</span>
                          <span class="text-[10px] font-mono text-slate-400 shrink-0">${escapeHtml(r.activity_date)}</span>
                        </div>`
                        )
                        .join('')}
                    </div>
                  </div>`
                : ''
            }
          </div>

          <!-- Sidebar Column: Upcoming Events, Pending Tasks & Reminders -->
          <div class="space-y-5">
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div class="flex items-center justify-between">
                <h2 class="text-xs font-bold uppercase tracking-wider text-slate-500">Upcoming Schedule</h2>
                <button type="button" data-go="planner" class="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer">Planner →</button>
              </div>
              ${
                upcoming.length === 0
                  ? `<p class="text-xs text-slate-400 py-4 text-center">No upcoming events scheduled.</p>`
                  : upcoming
                      .slice(0, 4)
                      .map(
                        (s) => `
                      <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-0.5">
                        <div class="text-xs font-semibold text-slate-800 dark:text-slate-100">${escapeHtml(s.title)}</div>
                        <div class="text-[11px] text-slate-500 flex items-center justify-between">
                          <span>${escapeHtml(s.date)} • ${escapeHtml(s.start_time)}–${escapeHtml(s.end_time)}</span>
                          <span class="text-[10px] font-medium text-sky-700 dark:text-sky-400">${escapeHtml(s.category)}</span>
                        </div>
                      </div>`
                      )
                      .join('')
              }
            </div>

            <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div class="flex items-center justify-between">
                <h2 class="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Tasks</h2>
                <button type="button" data-go="tasks" class="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer">All Tasks →</button>
              </div>
              ${
                pendingTasks.length === 0
                  ? `<p class="text-xs text-slate-400 py-4 text-center">All caught up on pending tasks.</p>`
                  : pendingTasks
                      .slice(0, 4)
                      .map(
                        (t) => `
                      <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                        <span class="truncate font-medium text-slate-700 dark:text-slate-200">${escapeHtml(t.title)}</span>
                        <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 shrink-0">${escapeHtml(t.priority)}</span>
                      </div>`
                      )
                      .join('')
              }
            </div>

            ${
              reminders.length > 0
                ? `<div class="bg-amber-50/70 dark:bg-amber-950/20 rounded-3xl p-5 border border-amber-200/70 dark:border-amber-900/50 space-y-2">
                    <div class="flex items-center justify-between">
                      <h2 class="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <i data-lucide="bell" class="w-3.5 h-3.5"></i> Important Reminders
                      </h2>
                      <button type="button" data-go="notifications" class="text-[11px] font-semibold text-amber-700 hover:underline cursor-pointer">View All</button>
                    </div>
                    ${reminders
                      .slice(0, 3)
                      .map(
                        (n) => `<div class="text-xs text-slate-700 dark:text-slate-200 py-1 border-b last:border-0 border-amber-200/40">${escapeHtml(n.title)}</div>`
                      )
                      .join('')}
                  </div>`
                : ''
            }
          </div>
        </div>

        <!-- Daily Affirmation Card -->
        <div id="borah-daily-affirmation-slot"></div>

        <!-- Optional Personal Space Quick Links -->
        ${
          vis.journal !== false || vis.memories !== false || vis.notes !== false || vis.mood !== false
            ? `<div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500">Private Personal Space</h3>
                  <p class="text-[11px] text-slate-400">Always private to you and strictly separate from professional work reports.</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  ${vis.journal !== false ? `<button type="button" data-go="journal" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 cursor-pointer">Journal</button>` : ''}
                  ${vis.memories !== false ? `<button type="button" data-go="memories" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 cursor-pointer">Memories</button>` : ''}
                  ${vis.notes !== false ? `<button type="button" data-go="notes" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 cursor-pointer">Notes</button>` : ''}
                  ${vis.mood !== false ? `<button type="button" data-go="mood" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 cursor-pointer">Mood Tracker</button>` : ''}
                </div>
              </div>`
            : ''
        }
      </div>
    `;

    renderIcons(container);

    if (affCleanup) {
      try {
        affCleanup();
      } catch {}
      affCleanup = null;
    }

    const affSlot = container.querySelector('#borah-daily-affirmation-slot');
    if (affSlot) {
      affCleanup = renderDailyAffirmation(affSlot, {
        onReflect: (prompt, title) => {
          if (onOpenJournalWithPrompt) {
            onOpenJournalWithPrompt(prompt, title);
          } else {
            onNavigate('journal');
          }
        },
      });
    }

    container.querySelectorAll('[data-go]').forEach((btn) => {
      btn.addEventListener('click', () => onNavigate(btn.getAttribute('data-go')));
    });

    container.querySelectorAll('[data-dash-quick-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (onOpenQuickActivity) onOpenQuickActivity();
        else onNavigate('activities');
      });
    });

    container.querySelector('[data-dash-export-daily]')?.addEventListener('click', async () => {
      try {
        await api.downloadExport('daily-report', 'pdf', { date: todayIso() });
        showToast('Daily PDF report downloaded.');
      } catch (err) {
        showToast(err.message || 'Export failed.');
      }
    });
  };

  render();
  api
    .getDashboard(todayIso())
    .then((res) => {
      loading = false;
      if (!disposed && res.success) {
        data = res;
        render();
      }
    })
    .catch(() => {
      loading = false;
      render();
    });

  return () => {
    disposed = true;
    if (affCleanup) {
      try {
        affCleanup();
      } catch {}
      affCleanup = null;
    }
  };
}

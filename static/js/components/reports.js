import { api } from '../api.js';
import { escapeHtml, renderIcons, todayIso } from '../utils/dom.js';

export function renderReportsView(container) {
  let activePeriod = 'daily'; // 'daily' | 'weekly' | 'monthly'
  let dailyDate = todayIso();
  let weeklyStart = todayIso();
  let monthlyVal = todayIso().slice(0, 7);
  let reportData = null;
  let loading = true;
  let exportingKey = '';
  let toastMsg = '';
  let disposed = false;

  const showToast = (msg) => {
    toastMsg = msg;
    render();
    setTimeout(() => {
      if (!disposed) {
        toastMsg = '';
        render();
      }
    }, 3200);
  };

  const loadReport = async () => {
    loading = true;
    render();
    try {
      let res;
      if (activePeriod === 'daily') {
        res = await api.getDailyReport(dailyDate);
      } else if (activePeriod === 'weekly') {
        res = await api.getWeeklyReport(weeklyStart);
      } else {
        res = await api.getMonthlyReport(monthlyVal);
      }
      if (!disposed) {
        reportData = res.success ? res.report : null;
        loading = false;
        render();
      }
    } catch (err) {
      if (!disposed) {
        reportData = null;
        loading = false;
        showToast(err.message || 'Failed to load report.');
      }
    }
  };

  const handleExport = async (fmt) => {
    const mod =
      activePeriod === 'daily'
        ? 'daily-report'
        : activePeriod === 'weekly'
          ? 'weekly-report'
          : 'monthly-report';
    const params =
      activePeriod === 'daily'
        ? { date: dailyDate }
        : activePeriod === 'weekly'
          ? { start_date: weeklyStart }
          : { month: monthlyVal };

    exportingKey = fmt;
    render();
    try {
      const fname = await api.downloadExport(mod, fmt, params);
      showToast(`Downloaded ${fname}`);
    } catch (err) {
      showToast(err.message || 'Export failed.');
    } finally {
      if (!disposed) {
        exportingKey = '';
        render();
      }
    }
  };

  const renderCategoryBars = (items = []) => {
    if (!items.length) {
      return `<p class="text-xs text-slate-400 py-6 text-center">No recorded activities in this period.</p>`;
    }
    const maxMins = Math.max(30, ...items.map((c) => Number(c.minutes || 0)));
    return items
      .map((c) => {
        const w = Math.max(8, Math.round((Number(c.minutes || 0) / maxMins) * 100));
        return `
          <div class="space-y-1">
            <div class="flex items-center justify-between text-xs gap-2">
              <span class="font-semibold text-slate-700 dark:text-slate-200 truncate">${escapeHtml(c.category)}</span>
              <span class="font-mono text-[11px] text-slate-500 shrink-0">${c.count} logs · ${escapeHtml(c.duration_label || `${c.hours}h`)}</span>
            </div>
            <div class="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div class="h-full rounded-full bg-emerald-600 transition-all" style="width: ${w}%"></div>
            </div>
          </div>`;
      })
      .join('');
  };

  const renderActivitiesTable = (acts = []) => {
    if (!acts.length) {
      return `<div class="py-10 text-center text-xs text-slate-400 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl">No recorded activities found for this period.</div>`;
    }
    return `
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500">
              ${activePeriod !== 'daily' ? '<th class="py-2.5 px-3">Date</th>' : ''}
              <th class="py-2.5 px-3">Activity</th>
              <th class="py-2.5 px-3">Category</th>
              <th class="py-2.5 px-3">Time</th>
              <th class="py-2.5 px-3">Duration</th>
              <th class="py-2.5 px-3">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80">
            ${acts
              .map(
                (a) => `
              <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                ${activePeriod !== 'daily' ? `<td class="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">${escapeHtml(a.activity_date)}</td>` : ''}
                <td class="py-2.5 px-3">
                  <div class="font-semibold text-slate-800 dark:text-slate-100">${escapeHtml(a.title)}</div>
                  ${a.remarks ? `<div class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(a.remarks)}</div>` : ''}
                </td>
                <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">${escapeHtml(a.category)}</span></td>
                <td class="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">${escapeHtml(a.start_time)} – ${escapeHtml(a.end_time)}</td>
                <td class="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">${escapeHtml(a.duration_label || `${a.duration_minutes || 0} min`)}</td>
                <td class="py-2.5 px-3">
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold capitalize ${
                    a.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                  }">${escapeHtml(a.status)}</span>
                </td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>`;
  };

  const renderBody = () => {
    if (loading) {
      return `
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-16 border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
          <div class="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p class="text-xs text-slate-500">Generating activity report from recorded logs...</p>
        </div>`;
    }
    if (!reportData) {
      return `
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200/80 dark:border-slate-800 text-center text-xs text-slate-500">
          Unable to load report data. Please refresh and try again.
        </div>`;
    }

    const s = reportData.summary || {};

    if (activePeriod === 'daily') {
      const cats = reportData.category_distribution || [];
      const remarks = reportData.remarks || [];
      return `
        <div class="borah-grid-4">
          <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div class="text-xs text-slate-500">Total Activities</div>
            <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 tabular-nums">${s.total_activities || 0}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">Date: ${escapeHtml(reportData.date)}</div>
          </div>
          <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div class="text-xs text-slate-500">Completed</div>
            <div class="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">${s.completed_activities || 0}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">${s.pending_activities || 0} ongoing / planned</div>
          </div>
          <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div class="text-xs text-slate-500">Total Recorded Time</div>
            <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 tabular-nums">${escapeHtml(s.total_duration_label || '0 min')}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">Sum of actual logged sessions</div>
          </div>
          <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div class="text-xs text-slate-500">Categories Covered</div>
            <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 tabular-nums">${cats.length}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">${remarks.length} remark note(s)</div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100">Daily Activity Report — ${escapeHtml(reportData.date)}</h2>
            ${renderActivitiesTable(reportData.activities || [])}
          </div>
          <div class="space-y-5">
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100">Category Time Distribution</h2>
              <div class="space-y-3">${renderCategoryBars(cats)}</div>
            </div>
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100">Important Remarks</h2>
              ${
                remarks.length === 0
                  ? `<p class="text-xs text-slate-400">No remarks added for this date.</p>`
                  : remarks
                      .map(
                        (r) => `
                      <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs space-y-0.5">
                        <div class="font-semibold text-slate-700 dark:text-slate-200">${escapeHtml(r.title)} <span class="text-[10px] text-emerald-700">(${escapeHtml(r.category)})</span></div>
                        <p class="text-slate-500 dark:text-slate-400">${escapeHtml(r.remarks)}</p>
                      </div>`
                      )
                      .join('')
              }
            </div>
          </div>
        </div>`;
    }

    if (activePeriod === 'weekly') {
      const days = reportData.daily_comparison || [];
      const cats = reportData.category_breakdown || [];
      const maxDayMins = Math.max(60, ...days.map((d) => Number(d.minutes || 0)));

      return `
        <div class="borah-grid-4">
          <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div class="text-xs text-slate-500">Activities Recorded</div>
            <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 tabular-nums">${s.total_activities || 0}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(reportData.start_date)} to ${escapeHtml(reportData.end_date)}</div>
          </div>
          <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div class="text-xs text-slate-500">Completed vs Pending</div>
            <div class="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">${s.completed_activities || 0} / ${s.pending_activities || 0}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">Recorded activity statuses</div>
          </div>
          <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div class="text-xs text-slate-500">Total Recorded Hours</div>
            <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 tabular-nums">${s.total_recorded_hours || 0} hrs</div>
            <div class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(s.total_duration_label || '0 min')}</div>
          </div>
          <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div class="text-xs text-slate-500">Task Completion</div>
            <div class="text-2xl font-bold text-sky-700 dark:text-sky-400 mt-1 tabular-nums">${s.task_completion_percentage || 0}%</div>
            <div class="text-[11px] text-slate-400 mt-0.5">${s.tasks_completed || 0} of ${s.tasks_total || 0} tasks done</div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100">Daily Activity Comparison</h2>
              <p class="text-[11px] text-slate-400">Summary of logged hours across each day of the week</p>
            </div>
            <div class="grid grid-cols-7 gap-2 items-end h-44 pt-2">
              ${days
                .map((d) => {
                  const hPct = Math.max(6, Math.round((Number(d.minutes || 0) / maxDayMins) * 100));
                  return `
                    <div class="flex flex-col items-center justify-end h-full gap-1.5">
                      <span class="text-[10px] font-mono text-slate-500">${d.hours}h</span>
                      <div class="w-full max-w-[38px] h-24 bg-slate-100 dark:bg-slate-800 rounded-t-xl flex items-end overflow-hidden">
                        <div class="w-full bg-emerald-600 rounded-t-xl" style="height: ${d.minutes > 0 ? hPct : 4}%"></div>
                      </div>
                      <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">${escapeHtml(d.day)}</span>
                      <span class="text-[10px] text-slate-400">${d.count} logs</span>
                    </div>`;
                })
                .join('')}
            </div>
          </div>
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100">Category-Wise Breakdown</h2>
            <div class="space-y-3">${renderCategoryBars(cats)}</div>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100">Weekly Recorded Activity Entries</h2>
          ${renderActivitiesTable(reportData.activities || [])}
        </div>`;
    }

    // Monthly
    const cats = reportData.category_distribution || [];
    const activeDays = reportData.most_active_days || [];
    return `
      <div class="borah-grid-4">
        <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div class="text-xs text-slate-500">Monthly Activities</div>
          <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 tabular-nums">${s.total_activities || 0}</div>
          <div class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(reportData.month_label)}</div>
        </div>
        <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div class="text-xs text-slate-500">Total Working Hours</div>
          <div class="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">${s.total_recorded_hours || 0} hrs</div>
          <div class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(s.total_duration_label || '0 min')}</div>
        </div>
        <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div class="text-xs text-slate-500">Active Days</div>
          <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 tabular-nums">${s.active_days_count || 0}</div>
          <div class="text-[11px] text-slate-400 mt-0.5">Days with logged entries</div>
        </div>
        <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div class="text-xs text-slate-500">Task Completion Trend</div>
          <div class="text-2xl font-bold text-sky-700 dark:text-sky-400 mt-1 tabular-nums">${s.task_completion_percentage || 0}%</div>
          <div class="text-[11px] text-slate-400 mt-0.5">${s.tasks_completed || 0} / ${s.tasks_total || 0} scheduled tasks</div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100">Most Active Days</h2>
          ${
            activeDays.length === 0
              ? `<p class="text-xs text-slate-400 py-6 text-center">No active days recorded in ${escapeHtml(reportData.month_label)}.</p>`
              : `<div class="space-y-2.5">
                  ${activeDays
                    .map(
                      (d, idx) => `
                    <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                      <div class="flex items-center gap-2.5">
                        <span class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] flex items-center justify-center">${idx + 1}</span>
                        <span class="font-mono font-semibold text-slate-800 dark:text-slate-100">${escapeHtml(d.date)}</span>
                      </div>
                      <div class="text-right">
                        <span class="font-semibold text-emerald-700 dark:text-emerald-400">${escapeHtml(d.duration_label)}</span>
                        <span class="text-slate-400 ml-2">(${d.count} logs)</span>
                      </div>
                    </div>`
                    )
                    .join('')}
                </div>`
          }
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100">Category-Wise Distribution</h2>
          <div class="space-y-3">${renderCategoryBars(cats)}</div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100">Monthly Recorded Activities — ${escapeHtml(reportData.month_label)}</h2>
        ${renderActivitiesTable(reportData.activities || [])}
      </div>`;
  };

  const render = () => {
    if (disposed) return;

    const controlHtml =
      activePeriod === 'daily'
        ? `<input type="date" data-rep-daily-date value="${escapeHtml(dailyDate)}" class="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />`
        : activePeriod === 'weekly'
          ? `<div class="flex items-center gap-1.5 text-xs"><span class="text-slate-500">Week Starting:</span><input type="date" data-rep-weekly-start value="${escapeHtml(weeklyStart)}" class="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" /></div>`
          : `<input type="month" data-rep-month value="${escapeHtml(monthlyVal)}" class="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />`;

    container.innerHTML = `
      <div class="borah-container-wide space-y-6 animate-in fade-in duration-300">
        ${toastMsg ? `<div class="fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl bg-slate-900 text-white text-xs font-medium shadow-xl">${escapeHtml(toastMsg)}</div>` : ''}

        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100 font-serif">Activity Reports &amp; Summaries</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Automated daily, weekly, and monthly activity summaries built strictly from recorded start and end times.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" data-rep-exp="pdf" ${exportingKey ? 'disabled' : ''} class="px-3.5 py-2 rounded-xl text-xs font-semibold borah-btn-sage flex items-center gap-1.5 cursor-pointer disabled:opacity-60">
              <i data-lucide="file-text" class="w-3.5 h-3.5"></i> ${exportingKey === 'pdf' ? 'Building PDF...' : 'Download PDF'}
            </button>
            <button type="button" data-rep-exp="xlsx" ${exportingKey ? 'disabled' : ''} class="px-3.5 py-2 rounded-xl text-xs font-semibold borah-btn-blue flex items-center gap-1.5 cursor-pointer disabled:opacity-60">
              <i data-lucide="table" class="w-3.5 h-3.5"></i> ${exportingKey === 'xlsx' ? 'Building Excel...' : 'Excel (.xlsx)'}
            </button>
            <button type="button" data-rep-exp="csv" ${exportingKey ? 'disabled' : ''} class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer disabled:opacity-60">
              CSV
            </button>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-1.5">
            ${[
              { id: 'daily', label: 'Daily Work Report' },
              { id: 'weekly', label: 'Weekly Summary' },
              { id: 'monthly', label: 'Monthly Summary' },
            ]
              .map(
                (t) => `
              <button type="button" data-rep-tab="${t.id}" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                  activePeriod === t.id
                    ? 'borah-btn-sage'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }">${t.label}</button>`
              )
              .join('')}
          </div>
          <div class="flex items-center gap-2">
            ${controlHtml}
            <button type="button" data-rep-refresh class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200 cursor-pointer" title="Refresh report">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>

        ${renderBody()}

        <div class="text-[11px] text-slate-400 text-center pt-1">
          Activity summaries help organize your personal time and work logs; they are descriptive records rather than employee performance scores.
        </div>
      </div>
    `;

    renderIcons(container);

    container.querySelectorAll('[data-rep-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activePeriod = btn.getAttribute('data-rep-tab');
        loadReport();
      });
    });

    container.querySelector('[data-rep-daily-date]')?.addEventListener('change', (e) => {
      dailyDate = e.target.value || todayIso();
      loadReport();
    });
    container.querySelector('[data-rep-weekly-start]')?.addEventListener('change', (e) => {
      weeklyStart = e.target.value || todayIso();
      loadReport();
    });
    container.querySelector('[data-rep-month]')?.addEventListener('change', (e) => {
      monthlyVal = e.target.value || todayIso().slice(0, 7);
      loadReport();
    });
    container.querySelector('[data-rep-refresh]')?.addEventListener('click', loadReport);
    container.querySelectorAll('[data-rep-exp]').forEach((btn) => {
      btn.addEventListener('click', () => handleExport(btn.getAttribute('data-rep-exp')));
    });
  };

  loadReport();

  return () => {
    disposed = true;
  };
}

import { api } from '../api.js';
import { escapeHtml, renderIcons, todayIso } from '../utils/dom.js';

const EXPORT_MODULES = [
  {
    group: 'Activity Reports',
    items: [
      { id: 'daily-report', title: 'Daily Activity Report', desc: 'Daily table of recorded activities, durations, category distribution, and remarks.', mode: 'date' },
      { id: 'weekly-report', title: 'Weekly Activity Report', desc: '7-day logged hours, daily comparison, category breakdown, and task completion %.', mode: 'range' },
      { id: 'monthly-report', title: 'Monthly Activity Report', desc: 'Monthly hours, active days, category totals, and task completion trends.', mode: 'month' },
      { id: 'activities', title: 'All Activity Logs', desc: 'Complete activity log entries filtered cleanly by your selected date range.', mode: 'range' },
    ],
  },
  {
    group: 'Tasks & Planning',
    items: [
      { id: 'tasks', title: 'All Tasks', desc: 'Full task list with priority, status, completion %, and due dates.', mode: 'range' },
      { id: 'tasks-completed', title: 'Completed Tasks', desc: 'Filtered export of tasks you have completed.', mode: 'range' },
      { id: 'tasks-pending', title: 'Pending Tasks', desc: 'Remaining Not Started, In Progress, and On Hold tasks.', mode: 'range' },
      { id: 'planner-daily', title: 'Daily Planner', desc: 'Scheduled lectures, meetings, and deadlines for a single date.', mode: 'date' },
      { id: 'planner-weekly', title: 'Weekly Planner', desc: '7-day timetable and scheduled events.', mode: 'range' },
      { id: 'planner-monthly', title: 'Monthly Planner', desc: 'Full monthly calendar schedule and events.', mode: 'month' },
    ],
  },
  {
    group: 'Personal Space & Complete Archive',
    items: [
      { id: 'journal', title: 'Journal Entries', desc: 'Private personal journal reflections filtered by entry date.', mode: 'range' },
      { id: 'notes', title: 'Personal Notes', desc: 'Saved notes, reminders, and priorities.', mode: 'range' },
      { id: 'mood', title: 'Mood History', desc: 'Personal mood entries and reflection intensity log.', mode: 'range' },
      { id: 'complete-archive', title: 'Complete Personal Data', desc: 'Multi-sheet Excel / Multi-section PDF / Full CSV archive of all BORAH modules.', mode: 'range' },
    ],
  },
];

export function renderExportsCenterView(container) {
  let startDate = '';
  let endDate = '';
  let singleDate = todayIso();
  let monthVal = todayIso().slice(0, 7);
  let activeDownload = '';
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

  const triggerDownload = async (item, fmt) => {
    const key = `${item.id}:${fmt}`;
    activeDownload = key;
    render();
    try {
      const params = {};
      if (item.mode === 'date') {
        params.date = singleDate || todayIso();
      } else if (item.mode === 'month') {
        params.month = monthVal || todayIso().slice(0, 7);
      } else {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
      }
      const filename = await api.downloadExport(item.id, fmt, params);
      showToast(`Exported ${filename}`);
    } catch (err) {
      showToast(err.message || 'Export failed.');
    } finally {
      if (!disposed) {
        activeDownload = '';
        render();
      }
    }
  };

  const render = () => {
    if (disposed) return;

    const groupsHtml = EXPORT_MODULES.map(
      (grp) => `
      <div class="space-y-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">${escapeHtml(grp.group)}</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${grp.items
            .map((item) => {
              const scopeLabel =
                item.mode === 'date'
                  ? `Date: ${singleDate}`
                  : item.mode === 'month'
                    ? `Month: ${monthVal}`
                    : startDate || endDate
                      ? `${startDate || 'Start'} to ${endDate || 'Present'}`
                      : 'All Dates';
              return `
                <div class="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-4">
                  <div class="space-y-1">
                    <div class="flex items-center justify-between gap-2">
                      <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 font-serif">${escapeHtml(item.title)}</h3>
                      <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">${escapeHtml(scopeLabel)}</span>
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">${escapeHtml(item.desc)}</p>
                  </div>
                  <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button type="button" data-exp-mod="${item.id}" data-exp-fmt="pdf" ${activeDownload ? 'disabled' : ''} class="px-3 py-1.5 rounded-xl text-xs font-semibold borah-btn-sage flex items-center gap-1 cursor-pointer disabled:opacity-50">
                      <i data-lucide="file-text" class="w-3.5 h-3.5"></i> ${activeDownload === `${item.id}:pdf` ? 'Generating...' : 'PDF'}
                    </button>
                    <button type="button" data-exp-mod="${item.id}" data-exp-fmt="xlsx" ${activeDownload ? 'disabled' : ''} class="px-3 py-1.5 rounded-xl text-xs font-semibold borah-btn-blue flex items-center gap-1 cursor-pointer disabled:opacity-50">
                      <i data-lucide="table" class="w-3.5 h-3.5"></i> ${activeDownload === `${item.id}:xlsx` ? 'Generating...' : 'Excel (.xlsx)'}
                    </button>
                    <button type="button" data-exp-mod="${item.id}" data-exp-fmt="csv" ${activeDownload ? 'disabled' : ''} class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer disabled:opacity-50">
                      ${activeDownload === `${item.id}:csv` ? 'Generating...' : 'CSV'}
                    </button>
                  </div>
                </div>`;
            })
            .join('')}
        </div>
      </div>`
    ).join('');

    container.innerHTML = `
      <div class="borah-container-wide space-y-6 animate-in fade-in duration-300">
        ${toastMsg ? `<div class="fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl bg-slate-900 text-white text-xs font-medium shadow-xl">${escapeHtml(toastMsg)}</div>` : ''}

        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100 font-serif">Export &amp; Download Center</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Independently export any module in formatted PDF, editable Excel (.xlsx), or structured CSV directly from your own database records.
            </p>
          </div>
          <div class="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-xl border border-emerald-200/70 dark:border-emerald-900/50">
            <i data-lucide="shield-check" class="w-3.5 h-3.5"></i> Scoped strictly to your account
          </div>
        </div>

        <!-- Global Date Range & Period Filter Controls -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-500">Date &amp; Range Filters</h2>
            <button type="button" data-exp-reset class="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer">Reset Dates</button>
          </div>
          <div class="borah-grid-4">
            <div>
              <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Start Date (Range)</label>
              <input type="date" data-exp-start value="${escapeHtml(startDate)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">End Date (Range)</label>
              <input type="date" data-exp-end value="${escapeHtml(endDate)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Specific Date (Daily)</label>
              <input type="date" data-exp-single value="${escapeHtml(singleDate)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Month (Monthly)</label>
              <input type="month" data-exp-month value="${escapeHtml(monthVal)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
            </div>
          </div>
        </div>

        <div class="space-y-8">${groupsHtml}</div>
      </div>
    `;

    renderIcons(container);

    container.querySelector('[data-exp-start]')?.addEventListener('change', (e) => {
      startDate = e.target.value;
      render();
    });
    container.querySelector('[data-exp-end]')?.addEventListener('change', (e) => {
      endDate = e.target.value;
      render();
    });
    container.querySelector('[data-exp-single]')?.addEventListener('change', (e) => {
      singleDate = e.target.value || todayIso();
      render();
    });
    container.querySelector('[data-exp-month]')?.addEventListener('change', (e) => {
      monthVal = e.target.value || todayIso().slice(0, 7);
      render();
    });
    container.querySelector('[data-exp-reset]')?.addEventListener('click', () => {
      startDate = '';
      endDate = '';
      singleDate = todayIso();
      monthVal = todayIso().slice(0, 7);
      render();
    });

    const flatItems = EXPORT_MODULES.flatMap((g) => g.items);
    container.querySelectorAll('[data-exp-mod]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const modId = btn.getAttribute('data-exp-mod');
        const fmt = btn.getAttribute('data-exp-fmt');
        const item = flatItems.find((i) => i.id === modId);
        if (item) triggerDownload(item, fmt);
      });
    });
  };

  render();

  return () => {
    disposed = true;
  };
}

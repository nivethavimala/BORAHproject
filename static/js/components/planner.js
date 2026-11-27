import { api } from '../api.js';
import { escapeHtml, renderIcons, todayIso } from '../utils/dom.js';

const PLANNER_CATEGORIES = ['Teaching', 'Meetings', 'Project', 'Deadline', 'Work', 'Personal', 'Important'];
const EVENT_TYPES = ['Lecture', 'Meeting', 'Deadline', 'Focus Session', 'Schedule', 'Reminder', 'Personal'];

function categoryClasses(cat) {
  const c = (cat || '').toLowerCase();
  if (c === 'teaching' || c === 'study') return 'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-200';
  if (c === 'meetings' || c === 'work' || c === 'project') return 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200';
  if (c === 'deadline' || c === 'important') return 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200';
  return 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200';
}

function getWeekDates(anchorYmd) {
  const anchor = new Date(anchorYmd + 'T00:00:00');
  const day = anchor.getDay(); // 0=Sun..6=Sat
  const diffToMon = (day + 6) % 7;
  const mon = new Date(anchor);
  mon.setDate(anchor.getDate() - diffToMon);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function getMonthCalendarDays(anchorYmd) {
  const anchor = new Date(anchorYmd + 'T00:00:00');
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const startPad = (first.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) {
    const dt = new Date(anchor.getFullYear(), anchor.getMonth(), d);
    cells.push(dt.toISOString().split('T')[0]);
  }
  return { cells, monthLabel: first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), monthKey: anchorYmd.slice(0, 7) };
}

export function renderPlannerView(container) {
  let schedules = [];
  let viewMode = 'daily'; // 'daily' | 'weekly' | 'monthly'
  let selectedDate = todayIso();
  let showModal = false;
  let editingSchedule = null;
  let toastMsg = '';
  let disposed = false;

  let formState = {
    title: '',
    description: '',
    date: selectedDate,
    start_time: '09:00',
    end_time: '10:30',
    event_type: 'Lecture',
    category: 'Teaching',
    location: '',
    reminder_enabled: true,
    reminder_minutes: 15,
  };

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

  const renderEventChip = (ev) => `
    <div class="p-3 rounded-2xl border ${categoryClasses(ev.category)} flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div class="flex items-start gap-3">
        <div class="px-2.5 py-1 rounded-xl bg-white/80 dark:bg-slate-900/80 text-center shrink-0">
          <div class="text-xs font-mono font-bold">${escapeHtml(ev.start_time)}</div>
          <div class="text-[10px] font-mono opacity-70">${escapeHtml(ev.end_time)}</div>
        </div>
        <div class="space-y-0.5">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="text-xs font-bold font-serif">${escapeHtml(ev.title)}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/70 dark:bg-slate-800/80 font-semibold">${escapeHtml(ev.event_type || 'Schedule')}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/70 dark:bg-slate-800/80">${escapeHtml(ev.category)}</span>
          </div>
          ${ev.location ? `<div class="text-[11px] opacity-80">Location: ${escapeHtml(ev.location)}</div>` : ''}
          ${ev.description ? `<p class="text-[11px] opacity-85">${escapeHtml(ev.description)}</p>` : ''}
        </div>
      </div>
      <div class="flex items-center gap-1 self-end sm:self-center">
        <button type="button" data-plan-edit="${escapeHtml(ev.id)}" class="p-1.5 rounded-lg hover:bg-white/60 cursor-pointer" title="Edit"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i></button>
        <button type="button" data-plan-del="${escapeHtml(ev.id)}" class="p-1.5 rounded-lg hover:bg-rose-100 text-rose-600 cursor-pointer" title="Delete"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
      </div>
    </div>`;

  const render = () => {
    if (disposed) return;

    let bodyHtml = '';
    if (viewMode === 'daily') {
      const dayEvents = schedules
        .filter((s) => s.date === selectedDate)
        .sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));
      bodyHtml =
        dayEvents.length === 0
          ? `<div class="py-12 text-center text-xs text-slate-400">No events planned for ${escapeHtml(selectedDate)}. <button type="button" data-plan-add class="text-emerald-700 font-semibold hover:underline cursor-pointer">Schedule an event</button></div>`
          : `<div class="space-y-3">${dayEvents.map(renderEventChip).join('')}</div>`;
    } else if (viewMode === 'weekly') {
      const weekDays = getWeekDates(selectedDate);
      bodyHtml = `<div class="grid grid-cols-1 md:grid-cols-7 gap-3">
        ${weekDays
          .map((d) => {
            const evs = schedules.filter((s) => s.date === d).sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
            const dayName = new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const isToday = d === todayIso();
            return `
              <div class="p-3 rounded-2xl border ${isToday ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'} space-y-2 min-h-[160px]">
                <button type="button" data-pick-day="${d}" class="w-full text-left text-xs font-bold ${isToday ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'} hover:underline cursor-pointer">${escapeHtml(dayName)}</button>
                ${
                  evs.length === 0
                    ? `<p class="text-[10px] text-slate-400">Clear</p>`
                    : evs
                        .map(
                          (ev) => `
                        <button type="button" data-plan-edit="${escapeHtml(ev.id)}" class="w-full text-left p-2 rounded-xl border text-[11px] ${categoryClasses(ev.category)} cursor-pointer">
                          <div class="font-mono text-[10px]">${escapeHtml(ev.start_time)}–${escapeHtml(ev.end_time)}</div>
                          <div class="font-semibold truncate">${escapeHtml(ev.title)}</div>
                        </button>`
                        )
                        .join('')
                }
              </div>`;
          })
          .join('')}
      </div>`;
    } else {
      const { cells, monthLabel } = getMonthCalendarDays(selectedDate);
      bodyHtml = `
        <div class="space-y-3">
          <div class="text-sm font-bold text-slate-700 dark:text-slate-200">${escapeHtml(monthLabel)}</div>
          <div class="grid grid-cols-7 gap-2 text-center text-[11px] font-bold text-slate-400 uppercase">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
          <div class="grid grid-cols-7 gap-2">
            ${cells
              .map((d) => {
                if (!d) return `<div class="min-h-[84px] rounded-xl bg-slate-50/40 dark:bg-slate-900/30"></div>`;
                const evs = schedules.filter((s) => s.date === d);
                const dayNum = Number(d.slice(8, 10));
                const isSel = d === selectedDate;
                return `
                  <button type="button" data-pick-day="${d}" class="min-h-[84px] p-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isSel ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 bg-white dark:bg-slate-900'
                  }">
                    <span class="text-xs font-bold ${d === todayIso() ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}">${dayNum}</span>
                    <div class="space-y-1 w-full">
                      ${evs
                        .slice(0, 2)
                        .map((ev) => `<div class="text-[10px] px-1.5 py-0.5 rounded truncate ${categoryClasses(ev.category)}">${escapeHtml(ev.title)}</div>`)
                        .join('')}
                      ${evs.length > 2 ? `<div class="text-[10px] text-slate-400">+${evs.length - 2} more</div>` : ''}
                    </div>
                  </button>`;
              })
              .join('')}
          </div>
        </div>`;
    }

    const modalHtml = showModal
      ? `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
          <button type="button" data-plan-close class="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"><i data-lucide="x" class="w-4 h-4"></i></button>
          <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif mb-4">${editingSchedule ? 'Edit Schedule Event' : 'Schedule New Event'}</h2>
          <form data-plan-form class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div class="col-span-2">
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Event Title *</label>
                <input type="text" required name="title" value="${escapeHtml(formState.title)}" placeholder="e.g. MSc Lecture, Thesis Review, Faculty Meeting" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Date *</label>
                <input type="date" required name="date" value="${escapeHtml(formState.date)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Event Type</label>
                <select name="event_type" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">
                  ${EVENT_TYPES.map((t) => `<option value="${escapeHtml(t)}" ${formState.event_type === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Start Time *</label>
                <input type="time" required name="start_time" value="${escapeHtml(formState.start_time)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">End Time *</label>
                <input type="time" required name="end_time" value="${escapeHtml(formState.end_time)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Category</label>
                <select name="category" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">
                  ${PLANNER_CATEGORIES.map((c) => `<option value="${escapeHtml(c)}" ${formState.category.toLowerCase() === c.toLowerCase() ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Location</label>
                <input type="text" name="location" value="${escapeHtml(formState.location)}" placeholder="Hall / Link" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Notes</label>
                <textarea rows="2" name="description" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">${escapeHtml(formState.description)}</textarea>
              </div>
            </div>
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button type="button" data-plan-close class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2 text-xs font-semibold borah-btn-sage rounded-xl shadow-sm cursor-pointer">Save Event</button>
            </div>
          </form>
        </div>
      </div>`
      : '';

    container.innerHTML = `
      <div class="borah-container-wide space-y-6 animate-in fade-in duration-300">
        ${toastMsg ? `<div class="fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl bg-slate-900 text-white text-xs font-medium shadow-xl">${escapeHtml(toastMsg)}</div>` : ''}

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-serif">Planner &amp; Timetable</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Switch across Daily, Weekly, and Monthly schedules for lectures, meetings, and deadlines.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" data-plan-export="pdf" class="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">Export PDF</button>
            <button type="button" data-plan-export="xlsx" class="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">Export Excel</button>
            <button type="button" data-plan-add class="px-4 py-2 rounded-xl text-xs font-semibold borah-btn-sage shadow-sm flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="plus" class="w-4 h-4"></i><span>Add Event</span>
            </button>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            ${['daily', 'weekly', 'monthly']
              .map(
                (m) => `<button type="button" data-plan-view="${m}" class="px-3 py-1.5 text-xs font-semibold rounded-lg capitalize cursor-pointer ${
                  viewMode === m ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
                }">${m}</button>`
              )
              .join('')}
          </div>
          <div class="flex items-center gap-2">
            <button type="button" data-plan-prev class="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><i data-lucide="chevron-left" class="w-4 h-4"></i></button>
            <input type="date" data-plan-date value="${escapeHtml(selectedDate)}" class="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
            <button type="button" data-plan-next class="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><i data-lucide="chevron-right" class="w-4 h-4"></i></button>
            <button type="button" data-plan-today class="px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 cursor-pointer">Today</button>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          ${bodyHtml}
        </div>
        ${modalHtml}
      </div>
    `;

    renderIcons(container);

    container.querySelectorAll('[data-plan-view]').forEach((btn) =>
      btn.addEventListener('click', () => {
        viewMode = btn.getAttribute('data-plan-view');
        render();
      })
    );
    container.querySelectorAll('[data-pick-day]').forEach((btn) =>
      btn.addEventListener('click', () => {
        selectedDate = btn.getAttribute('data-pick-day');
        viewMode = 'daily';
        render();
      })
    );
    container.querySelector('[data-plan-date]')?.addEventListener('change', (e) => {
      if (e.target.value) {
        selectedDate = e.target.value;
        render();
      }
    });
    container.querySelector('[data-plan-today]')?.addEventListener('click', () => {
      selectedDate = todayIso();
      render();
    });
    container.querySelector('[data-plan-prev]')?.addEventListener('click', () => {
      const cur = new Date(selectedDate + 'T00:00:00');
      cur.setDate(cur.getDate() - (viewMode === 'monthly' ? 30 : viewMode === 'weekly' ? 7 : 1));
      selectedDate = cur.toISOString().split('T')[0];
      render();
    });
    container.querySelector('[data-plan-next]')?.addEventListener('click', () => {
      const cur = new Date(selectedDate + 'T00:00:00');
      cur.setDate(cur.getDate() + (viewMode === 'monthly' ? 30 : viewMode === 'weekly' ? 7 : 1));
      selectedDate = cur.toISOString().split('T')[0];
      render();
    });
    container.querySelectorAll('[data-plan-add]').forEach((btn) =>
      btn.addEventListener('click', () => {
        editingSchedule = null;
        formState = {
          title: '',
          description: '',
          date: selectedDate,
          start_time: '09:00',
          end_time: '10:30',
          event_type: 'Lecture',
          category: 'Teaching',
          location: '',
          reminder_enabled: true,
          reminder_minutes: 15,
        };
        showModal = true;
        render();
      })
    );
    container.querySelectorAll('[data-plan-close]').forEach((btn) =>
      btn.addEventListener('click', () => {
        showModal = false;
        editingSchedule = null;
        render();
      })
    );
    container.querySelectorAll('[data-plan-edit]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const s = schedules.find((x) => x.id === btn.getAttribute('data-plan-edit'));
        if (!s) return;
        editingSchedule = s;
        formState = {
          title: s.title || '',
          description: s.description || '',
          date: s.date || selectedDate,
          start_time: s.start_time || '09:00',
          end_time: s.end_time || '10:30',
          event_type: s.event_type || 'Schedule',
          category: s.category || 'Teaching',
          location: s.location || '',
          reminder_enabled: !!s.reminder_enabled,
          reminder_minutes: s.reminder_minutes || 15,
        };
        showModal = true;
        render();
      })
    );
    container.querySelectorAll('[data-plan-del]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-plan-del');
        await api.deleteSchedule(id);
        schedules = schedules.filter((s) => s.id !== id);
        showToast('Event removed.');
      })
    );
    container.querySelectorAll('[data-plan-export]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const fmt = btn.getAttribute('data-plan-export');
        const mod = viewMode === 'monthly' ? 'planner-monthly' : viewMode === 'weekly' ? 'planner-weekly' : 'planner-daily';
        const params = viewMode === 'monthly' ? { month: selectedDate.slice(0, 7) } : { date: selectedDate };
        try {
          await api.downloadExport(mod, fmt, params);
          showToast(`Exported ${viewMode} planner as ${fmt.toUpperCase()}.`);
        } catch (err) {
          showToast(err.message || 'Export failed.');
        }
      })
    );
    container.querySelector('[data-plan-form]')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = {
        title: String(fd.get('title') || '').trim(),
        description: String(fd.get('description') || '').trim(),
        date: String(fd.get('date') || selectedDate),
        start_time: String(fd.get('start_time') || '09:00'),
        end_time: String(fd.get('end_time') || '10:30'),
        event_type: String(fd.get('event_type') || 'Schedule'),
        category: String(fd.get('category') || 'Work'),
        location: String(fd.get('location') || '').trim(),
        reminder_enabled: true,
      };
      try {
        if (editingSchedule) {
          const res = await api.updateSchedule(editingSchedule.id, payload);
          if (res.success) {
            schedules = schedules.map((s) => (s.id === editingSchedule.id ? res.schedule : s));
            showModal = false;
            editingSchedule = null;
            showToast('Schedule updated.');
          }
        } else {
          const res = await api.createSchedule(payload);
          if (res.success) {
            schedules = [...schedules, res.schedule];
            showModal = false;
            showToast('Event scheduled.');
          }
        }
      } catch (err) {
        showToast(err.message || 'Failed to save event.');
      }
    });
  };

  render();
  api
    .getSchedules()
    .then((res) => {
      if (!disposed && res.success) {
        schedules = res.schedules || [];
        render();
      }
    })
    .catch(() => {});

  return () => {
    disposed = true;
  };
}

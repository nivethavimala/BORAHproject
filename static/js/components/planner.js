import { api } from '../api.js';
import { escapeHtml, renderIcons, todayIso } from '../utils/dom.js';

const CATEGORY_THEMES = {
  study: {
    label: 'Study',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
  work: {
    label: 'Work / Project',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  personal: {
    label: 'Personal & Rest',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  important: {
    label: 'Important',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
  },
};

export function renderPlannerView(container) {
  let schedules = [];
  let selectedDate = todayIso();
  let showAddModal = false;
  let editingSchedule = null;
  let deleteConfirmScheduleId = null;
  let toastMessage = null;
  let toastTimer = null;
  let disposed = false;

  let formState = {
    title: '',
    description: '',
    date: selectedDate,
    startTime: '09:00',
    endTime: '10:30',
    category: 'study',
    reminder: true,
  };

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

    const dayEvents = schedules
      .filter((s) => s.date === selectedDate)
      .slice()
      .sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));

    const formattedSelectedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    const eventsHtml =
      dayEvents.length === 0
        ? `
        <div class="py-16 text-center text-slate-400">
          <i data-lucide="clock" class="w-10 h-10 mx-auto text-amber-300 dark:text-slate-700 mb-2"></i>
          <p class="text-xs font-serif">No events scheduled for this day.</p>
          <button type="button" data-plan-add class="mt-3 text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline cursor-pointer">
            Add a lecture, meeting, or study block 🌷
          </button>
        </div>`
        : `<div class="space-y-3">
          ${dayEvents
            .map((item) => {
              const conf = CATEGORY_THEMES[item.category] || CATEGORY_THEMES.personal;
              return `
                <div class="p-4 rounded-2xl border ${conf.border} ${conf.bg} flex flex-col sm:flex-row sm:items-center justify-between gap-3 group transition-all">
                  <div class="flex items-start sm:items-center gap-3">
                    <div class="text-center w-16 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-2xs shrink-0">
                      <span class="text-xs font-bold font-mono text-slate-800 dark:text-slate-100">${escapeHtml(item.start_time)}</span>
                      <span class="block text-[10px] text-slate-400 font-mono">${escapeHtml(item.end_time)}</span>
                    </div>
                    <div class="space-y-0.5">
                      <div class="flex items-center gap-2">
                        <h3 class="text-xs font-bold text-slate-800 dark:text-slate-100 font-serif">${escapeHtml(item.title)}</h3>
                        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-md ${conf.text} bg-white/70 dark:bg-slate-800/80">${escapeHtml(conf.label)}</span>
                      </div>
                      ${item.description ? `<p class="text-xs text-slate-600 dark:text-slate-300">${escapeHtml(item.description)}</p>` : ''}
                    </div>
                  </div>
                  <div class="flex items-center gap-1 self-end sm:self-center">
                    ${item.reminder_enabled ? `<span class="p-1.5 rounded-lg text-slate-400" title="Reminder set"><i data-lucide="bell" class="w-3.5 h-3.5 text-amber-500"></i></span>` : ''}
                    <button type="button" data-plan-edit="${escapeHtml(item.id)}" class="opacity-70 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all cursor-pointer" title="Edit event">
                      <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                    </button>
                    <button type="button" data-plan-del="${escapeHtml(item.id)}" class="opacity-70 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer" title="Remove event">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                  </div>
                </div>`;
            })
            .join('')}
        </div>`;

    const addModalHtml = showAddModal
      ? `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
          <button type="button" data-plan-close-modal class="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
          <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif mb-1">
            ${editingSchedule ? 'Edit Timetable Event ✏️' : 'Add Timetable Event 📅'}
          </h2>
          <p class="text-xs text-slate-500 mb-6">
            ${editingSchedule ? 'Update timing, category, or commitments for this event.' : 'Schedule your study sessions, routines, and commitments.'}
          </p>
          <form data-plan-form class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Event Title</label>
              <input type="text" required name="title" placeholder="e.g. Machine Learning Seminar, Gym Workout" value="${escapeHtml(formState.title)}" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Date</label>
              <input type="date" required name="date" value="${escapeHtml(formState.date)}" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Start Time</label>
                <input type="time" required name="startTime" value="${escapeHtml(formState.startTime)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">End Time</label>
                <input type="time" required name="endTime" value="${escapeHtml(formState.endTime)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Category</label>
              <select name="category" class="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">
                <option value="study" ${formState.category === 'study' ? 'selected' : ''}>Study &amp; Academic</option>
                <option value="work" ${formState.category === 'work' ? 'selected' : ''}>Work &amp; Project</option>
                <option value="personal" ${formState.category === 'personal' ? 'selected' : ''}>Personal &amp; Rest</option>
                <option value="important" ${formState.category === 'important' ? 'selected' : ''}>Important Priority</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Description / Location / Notes</label>
              <textarea rows="2" name="description" placeholder="e.g. Room 304, bring slide deck" class="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none resize-none">${escapeHtml(formState.description)}</textarea>
            </div>
            <div class="flex items-center gap-2 pt-1">
              <input type="checkbox" id="reminder_cb" name="reminder" ${formState.reminder ? 'checked' : ''} class="rounded text-amber-600 focus:ring-amber-500" />
              <label for="reminder_cb" class="text-xs text-slate-600 dark:text-slate-300 cursor-pointer">Enable peaceful reminder notification</label>
            </div>
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button type="button" data-plan-close-modal class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm cursor-pointer">
                ${editingSchedule ? 'Update Event ✨' : 'Add to Schedule ✨'}
              </button>
            </div>
          </form>
        </div>
      </div>`
      : '';

    const deleteModalHtml = deleteConfirmScheduleId
      ? `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
            <i data-lucide="trash-2" class="w-6 h-6"></i>
          </div>
          <div class="text-center">
            <h3 class="text-base font-bold text-slate-800 dark:text-slate-100">Remove Event?</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Are you sure you want to remove this timetable event?</p>
          </div>
          <div class="flex items-center gap-3 pt-2">
            <button type="button" data-plan-cancel-del class="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer">Cancel</button>
            <button type="button" data-plan-confirm-del class="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow cursor-pointer">Delete Event</button>
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
              <span>Planner &amp; Timetable</span>
              <span class="text-sm font-sans font-normal text-slate-400">(${schedules.length} events)</span>
            </h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Organize lectures, focus sessions, personal habits, and daily priorities.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <button type="button" data-plan-add class="px-4 py-2 rounded-2xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>Add Event</span>
            </button>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <button type="button" data-plan-prev class="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
              <i data-lucide="chevron-left" class="w-4 h-4"></i>
            </button>
            <input type="date" data-plan-date value="${escapeHtml(selectedDate)}" class="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
            <button type="button" data-plan-next class="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
              <i data-lucide="chevron-right" class="w-4 h-4"></i>
            </button>
            <span class="text-xs font-serif font-bold text-slate-700 dark:text-slate-200 ml-2">${escapeHtml(formattedSelectedDate)}</span>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" data-plan-today class="px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-50 dark:bg-slate-800 text-amber-700 dark:text-amber-400 hover:bg-amber-100 transition-colors cursor-pointer">
              Today
            </button>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <h2 class="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-6 flex items-center justify-between">
            <span>Schedule for ${escapeHtml(selectedDate)}</span>
            <span class="text-xs font-normal text-slate-400">${dayEvents.length} ${dayEvents.length === 1 ? 'event' : 'events'} planned</span>
          </h2>
          ${eventsHtml}
        </div>

        ${addModalHtml}
        ${deleteModalHtml}
      </div>
    `;

    renderIcons(container);

    container.querySelectorAll('[data-plan-add]').forEach((btn) => {
      btn.addEventListener('click', () => {
        editingSchedule = null;
        formState = {
          title: '',
          description: '',
          date: selectedDate,
          startTime: '09:00',
          endTime: '10:30',
          category: 'study',
          reminder: true,
        };
        showAddModal = true;
        render();
      });
    });

    container.querySelector('[data-plan-prev]')?.addEventListener('click', () => {
      const cur = new Date(selectedDate + 'T00:00:00');
      cur.setDate(cur.getDate() - 1);
      selectedDate = cur.toISOString().split('T')[0];
      render();
    });

    container.querySelector('[data-plan-next]')?.addEventListener('click', () => {
      const cur = new Date(selectedDate + 'T00:00:00');
      cur.setDate(cur.getDate() + 1);
      selectedDate = cur.toISOString().split('T')[0];
      render();
    });

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

    container.querySelectorAll('[data-plan-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-plan-edit');
        const item = schedules.find((s) => s.id === id);
        if (!item) return;
        editingSchedule = item;
        formState = {
          title: item.title || '',
          description: item.description || '',
          date: item.date || selectedDate,
          startTime: item.start_time || '09:00',
          endTime: item.end_time || '10:30',
          category: item.category || 'study',
          reminder: !!item.reminder_enabled,
        };
        showAddModal = true;
        render();
      });
    });

    container.querySelectorAll('[data-plan-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        deleteConfirmScheduleId = btn.getAttribute('data-plan-del');
        render();
      });
    });

    container.querySelectorAll('[data-plan-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        showAddModal = false;
        editingSchedule = null;
        render();
      });
    });

    container.querySelector('[data-plan-cancel-del]')?.addEventListener('click', () => {
      deleteConfirmScheduleId = null;
      render();
    });

    container.querySelector('[data-plan-confirm-del]')?.addEventListener('click', async () => {
      if (!deleteConfirmScheduleId) return;
      try {
        const res = await api.deleteSchedule(deleteConfirmScheduleId);
        if (res.success) {
          schedules = schedules.filter((s) => s.id !== deleteConfirmScheduleId);
          deleteConfirmScheduleId = null;
          showToast('Event removed from schedule.');
        }
      } catch (err) {
        showToast(err.message || 'Failed to delete event.');
      }
    });

    container.querySelector('[data-plan-form]')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const title = String(fd.get('title') || '').trim();
      if (!title) {
        showToast('Please enter an event title.');
        return;
      }
      const payload = {
        title,
        description: String(fd.get('description') || '').trim(),
        date: String(fd.get('date') || selectedDate),
        start_time: String(fd.get('startTime') || '09:00'),
        end_time: String(fd.get('endTime') || '10:30'),
        category: String(fd.get('category') || 'study'),
        reminder_enabled: fd.get('reminder') === 'on',
      };
      try {
        if (editingSchedule) {
          const res = await api.updateSchedule(editingSchedule.id, payload);
          if (res.success) {
            schedules = schedules.map((s) => (s.id === editingSchedule.id ? res.schedule : s));
            showAddModal = false;
            editingSchedule = null;
            showToast('Event updated in timetable 📅');
          }
        } else {
          const res = await api.createSchedule(payload);
          if (res.success) {
            schedules = [...schedules, res.schedule];
            showAddModal = false;
            showToast('Event scheduled to your timetable 📅');
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
    .catch((err) => console.error('Error loading schedules:', err));

  return () => {
    disposed = true;
    if (toastTimer) clearTimeout(toastTimer);
  };
}

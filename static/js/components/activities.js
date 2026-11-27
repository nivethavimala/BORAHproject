import { api } from '../api.js';
import { escapeHtml, renderIcons, todayIso } from '../utils/dom.js';
import { renderAttachmentsSection } from './attachmentsWidget.js';

const ACTIVITY_CATEGORIES = [
  'Teaching',
  'Meetings',
  'Research',
  'Project Development',
  'Administrative Work',
  'Student Guidance',
  'Documentation',
  'Training',
  'Personal Work',
  'Other',
];

function computePreviewDuration(start, end) {
  if (!start || !end) return 'Enter times';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some(Number.isNaN)) return 'Invalid time';
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) return 'End time must be after start time';
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h === 0 ? `${m} min` : m === 0 ? `${h} hr${h === 1 ? '' : 's'}` : `${h}h ${m}m`;
}

export function renderActivitiesView(container, { openNewModal = false } = {}) {
  let activities = [];
  let projects = [];
  let tasks = [];
  let loading = true;
  let viewMode = 'daily'; // 'daily' | 'history'
  let filterDate = todayIso();
  let filterCategory = 'all';
  let filterStatus = 'all';
  let searchQ = '';
  let showModal = openNewModal;
  let editingActivity = null;
  let activeAttachmentActId = null;
  let toastMsg = '';
  let disposed = false;

  let formState = {
    title: '',
    description: '',
    activity_date: todayIso(),
    start_time: '09:00',
    end_time: '10:30',
    category: 'Teaching',
    priority: 'medium',
    status: 'completed',
    remarks: '',
    project_id: '',
    linked_task_ids: [],
    is_shared_with_org: false,
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

  const fetchAll = async () => {
    try {
      const [actRes, projRes, taskRes] = await Promise.all([
        api.getActivities(),
        api.getProjects(),
        api.getTasks(),
      ]);
      if (!disposed) {
        activities = actRes.activities || [];
        projects = projRes.projects || [];
        tasks = taskRes.tasks || [];
        loading = false;
        render();
      }
    } catch {
      if (!disposed) {
        loading = false;
        render();
      }
    }
  };

  const render = () => {
    if (disposed) return;

    const filtered = activities.filter((a) => {
      if (viewMode === 'daily' && filterDate && a.activity_date !== filterDate) return false;
      if (filterCategory !== 'all' && a.category !== filterCategory) return false;
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      if (searchQ.trim()) {
        const q = searchQ.trim().toLowerCase();
        const hay = `${a.title} ${a.description} ${a.remarks} ${a.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const totalMinutes = filtered.reduce((acc, a) => acc + Number(a.duration_minutes || 0), 0);
    const totalLabel = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;

    const statusBadge = (st) => {
      if (st === 'completed') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';
      if (st === 'ongoing') return 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300';
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
    };

    const timelineHtml =
      filtered.length === 0
        ? `<div class="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <i data-lucide="clock" class="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700"></i>
            <p class="text-xs text-slate-500">${loading ? 'Loading activity logs...' : 'No activities found for this filter.'}</p>
            <button type="button" data-act-new class="px-4 py-2 rounded-xl text-xs font-semibold borah-btn-sage cursor-pointer">Log an Activity</button>
          </div>`
        : `<div class="borah-timeline-line space-y-4 pl-2">
            ${filtered
              .map((a) => {
                const linkedCount = (a.linked_task_ids || []).length;
                return `
                  <div class="relative pl-8">
                    <div class="absolute left-1.5 top-5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-950 ${a.status === 'completed' ? 'bg-emerald-600' : a.status === 'ongoing' ? 'bg-sky-600' : 'bg-amber-500'} shadow-xs"></div>
                    <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-emerald-300 transition-all space-y-2">
                      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div class="space-y-1">
                          <div class="flex flex-wrap items-center gap-2">
                            <span class="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                              ${escapeHtml(a.activity_date)} • ${escapeHtml(a.start_time)}–${escapeHtml(a.end_time)} (${escapeHtml(a.duration_label || `${a.duration_minutes}m`)})
                            </span>
                            <span class="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">${escapeHtml(a.category)}</span>
                            <span class="text-[11px] font-semibold px-2 py-0.5 rounded-md capitalize ${statusBadge(a.status)}">${escapeHtml(a.status)}</span>
                            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-500 capitalize">${escapeHtml(a.priority)} priority</span>
                          </div>
                          <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 font-serif">${escapeHtml(a.title)}</h3>
                          ${a.description ? `<p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">${escapeHtml(a.description)}</p>` : ''}
                          ${a.remarks ? `<p class="text-[11px] text-slate-500 italic">Remarks: ${escapeHtml(a.remarks)}</p>` : ''}
                          ${
                            linkedCount > 0 || a.attachment_count > 0
                              ? `<div class="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                                  ${linkedCount > 0 ? `<span class="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">${linkedCount} linked task${linkedCount > 1 ? 's' : ''}</span>` : ''}
                                  ${a.attachment_count > 0 ? `<span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600">${a.attachment_count} attachment${a.attachment_count > 1 ? 's' : ''}</span>` : ''}
                                </div>`
                              : ''
                          }
                        </div>

                        <div class="flex items-center gap-1 shrink-0">
                          <button type="button" data-act-att="${escapeHtml(a.id)}" class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer" title="Manage Attachments">
                            <i data-lucide="paperclip" class="w-4 h-4"></i>
                          </button>
                          <button type="button" data-act-dup="${escapeHtml(a.id)}" class="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30 cursor-pointer" title="Duplicate to Today">
                            <i data-lucide="copy" class="w-4 h-4"></i>
                          </button>
                          <button type="button" data-act-edit="${escapeHtml(a.id)}" class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer" title="Edit Activity">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                          </button>
                          <button type="button" data-act-del="${escapeHtml(a.id)}" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer" title="Delete Activity">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                          </button>
                        </div>
                      </div>
                      ${activeAttachmentActId === a.id ? `<div data-act-att-slot="${escapeHtml(a.id)}" class="pt-2"></div>` : ''}
                    </div>
                  </div>`;
              })
              .join('')}
          </div>`;

    const modalHtml = showModal
      ? `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
        <div class="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 my-8">
          <button type="button" data-act-close class="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
          <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif mb-1">
            ${editingActivity ? 'Edit Activity Record' : 'Record Daily Activity'}
          </h2>
          <p class="text-xs text-slate-500 mb-5">Duration is automatically calculated from your start and end time.</p>

          <form data-act-form class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Activity Title *</label>
                <input type="text" required name="title" value="${escapeHtml(formState.title)}" placeholder="e.g. MSc AI & Data Analytics Lecture" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Activity Date *</label>
                <input type="date" required name="activity_date" value="${escapeHtml(formState.activity_date)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Category</label>
                <select name="category" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">
                  ${ACTIVITY_CATEGORIES.map((c) => `<option value="${escapeHtml(c)}" ${formState.category === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Start Time *</label>
                <input type="time" required name="start_time" value="${escapeHtml(formState.start_time)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">End Time * <span data-duration-preview class="ml-1 text-emerald-700 dark:text-emerald-400 font-mono">(${computePreviewDuration(formState.start_time, formState.end_time)})</span></label>
                <input type="time" required name="end_time" value="${escapeHtml(formState.end_time)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Status</label>
                <select name="status" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">
                  <option value="completed" ${formState.status === 'completed' ? 'selected' : ''}>Completed</option>
                  <option value="ongoing" ${formState.status === 'ongoing' ? 'selected' : ''}>Ongoing</option>
                  <option value="planned" ${formState.status === 'planned' ? 'selected' : ''}>Planned</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Priority</label>
                <select name="priority" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">
                  <option value="high" ${formState.priority === 'high' ? 'selected' : ''}>High</option>
                  <option value="medium" ${formState.priority === 'medium' ? 'selected' : ''}>Medium</option>
                  <option value="low" ${formState.priority === 'low' ? 'selected' : ''}>Low</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Link to Project (Optional)</label>
                <select name="project_id" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">
                  <option value="">None</option>
                  ${projects.map((p) => `<option value="${escapeHtml(p.id)}" ${formState.project_id === p.id ? 'selected' : ''}>${escapeHtml(p.title)}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Link Tasks (Does not auto-complete)</label>
                <select name="linked_task_ids" multiple class="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none h-20">
                  ${tasks.map((t) => `<option value="${escapeHtml(t.id)}" ${formState.linked_task_ids.includes(t.id) ? 'selected' : ''}>${escapeHtml(t.title)}</option>`).join('')}
                </select>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Detailed Description</label>
                <textarea rows="2" name="description" placeholder="Summarize what was worked on or covered..." class="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">${escapeHtml(formState.description)}</textarea>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Optional Remarks</label>
                <input type="text" name="remarks" value="${escapeHtml(formState.remarks)}" placeholder="Follow-up notes, room/class notes, or outcomes" class="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
            </div>

            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button type="button" data-act-close class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2 text-xs font-semibold borah-btn-sage rounded-xl shadow-sm cursor-pointer">
                ${editingActivity ? 'Save Changes' : 'Save Activity'}
              </button>
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
            <h1 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-serif">Daily Activity Log</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Record work sessions, lectures, meetings, and personal tasks with exact time duration tracking.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" data-act-export="pdf" class="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer">Export PDF</button>
            <button type="button" data-act-export="xlsx" class="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer">Export Excel</button>
            <button type="button" data-act-new class="px-4 py-2 rounded-xl text-xs font-semibold borah-btn-sage shadow-sm flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>Add Activity</span>
            </button>
          </div>
        </div>

        <!-- Filters & Summary Bar -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button type="button" data-act-mode="daily" class="px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${viewMode === 'daily' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}">Daily Timeline</button>
              <button type="button" data-act-mode="history" class="px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${viewMode === 'history' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}">Full History</button>
            </div>

            <div class="flex flex-wrap items-center gap-2 text-xs">
              <span class="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold">${filtered.length} activities</span>
              <span class="px-3 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 font-semibold">Recorded: ${totalLabel}</span>
            </div>
          </div>

          <div class="borah-grid-4">
            <input type="text" data-act-search value="${escapeHtml(searchQ)}" placeholder="Search title, remarks, description..." class="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
            <input type="date" data-act-date value="${escapeHtml(filterDate)}" ${viewMode === 'history' ? 'disabled' : ''} class="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none ${viewMode === 'history' ? 'opacity-50' : ''}" />
            <select data-act-cat class="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">
              <option value="all" ${filterCategory === 'all' ? 'selected' : ''}>All Categories</option>
              ${ACTIVITY_CATEGORIES.map((c) => `<option value="${escapeHtml(c)}" ${filterCategory === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
            </select>
            <select data-act-status class="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">
              <option value="all" ${filterStatus === 'all' ? 'selected' : ''}>All Statuses</option>
              <option value="completed" ${filterStatus === 'completed' ? 'selected' : ''}>Completed</option>
              <option value="ongoing" ${filterStatus === 'ongoing' ? 'selected' : ''}>Ongoing</option>
              <option value="planned" ${filterStatus === 'planned' ? 'selected' : ''}>Planned</option>
            </select>
          </div>
        </div>

        ${timelineHtml}
        ${modalHtml}
      </div>
    `;

    renderIcons(container);

    if (activeAttachmentActId) {
      const slot = container.querySelector(`[data-act-att-slot="${activeAttachmentActId}"]`);
      if (slot) {
        renderAttachmentsSection(slot, {
          entityType: 'activity',
          entityId: activeAttachmentActId,
          onChanged: () => fetchAll(),
        });
      }
    }

    container.querySelectorAll('[data-act-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        viewMode = btn.getAttribute('data-act-mode');
        render();
      });
    });
    container.querySelector('[data-act-search]')?.addEventListener('input', (e) => {
      searchQ = e.target.value;
      render();
    });
    container.querySelector('[data-act-date]')?.addEventListener('change', (e) => {
      filterDate = e.target.value;
      render();
    });
    container.querySelector('[data-act-cat]')?.addEventListener('change', (e) => {
      filterCategory = e.target.value;
      render();
    });
    container.querySelector('[data-act-status]')?.addEventListener('change', (e) => {
      filterStatus = e.target.value;
      render();
    });

    container.querySelectorAll('[data-act-new]').forEach((btn) => {
      btn.addEventListener('click', () => {
        editingActivity = null;
        formState = {
          title: '',
          description: '',
          activity_date: viewMode === 'daily' && filterDate ? filterDate : todayIso(),
          start_time: '09:00',
          end_time: '10:30',
          category: 'Teaching',
          priority: 'medium',
          status: 'completed',
          remarks: '',
          project_id: '',
          linked_task_ids: [],
          is_shared_with_org: false,
        };
        showModal = true;
        render();
      });
    });

    container.querySelectorAll('[data-act-close]').forEach((btn) => {
      btn.addEventListener('click', () => {
        showModal = false;
        editingActivity = null;
        render();
      });
    });

    container.querySelectorAll('[data-act-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const a = activities.find((x) => x.id === btn.getAttribute('data-act-edit'));
        if (!a) return;
        editingActivity = a;
        formState = {
          title: a.title || '',
          description: a.description || '',
          activity_date: a.activity_date || todayIso(),
          start_time: a.start_time || '09:00',
          end_time: a.end_time || '10:00',
          category: a.category || 'Teaching',
          priority: a.priority || 'medium',
          status: a.status || 'completed',
          remarks: a.remarks || '',
          project_id: a.project_id || '',
          linked_task_ids: a.linked_task_ids || [],
          is_shared_with_org: !!a.is_shared_with_org,
        };
        showModal = true;
        render();
      });
    });

    container.querySelectorAll('[data-act-dup]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-act-dup');
        try {
          const res = await api.duplicateActivity(id, { activity_date: todayIso(), status: 'planned' });
          if (res.success) {
            activities = [res.activity, ...activities];
            showToast('Activity duplicated to today.');
          }
        } catch (err) {
          showToast(err.message || 'Could not duplicate activity.');
        }
      });
    });

    container.querySelectorAll('[data-act-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-act-del');
        try {
          await api.deleteActivity(id);
          activities = activities.filter((a) => a.id !== id);
          showToast('Activity deleted.');
        } catch (err) {
          showToast(err.message || 'Delete failed.');
        }
      });
    });

    container.querySelectorAll('[data-act-att]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-act-att');
        activeAttachmentActId = activeAttachmentActId === id ? null : id;
        render();
      });
    });

    container.querySelectorAll('[data-act-export]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const fmt = btn.getAttribute('data-act-export');
        const params = viewMode === 'daily' && filterDate ? { start_date: filterDate, end_date: filterDate } : {};
        try {
          await api.downloadExport('activities', fmt, params);
          showToast(`Exported activities as ${fmt.toUpperCase()}.`);
        } catch (err) {
          showToast(err.message || 'Export failed.');
        }
      });
    });

    const form = container.querySelector('[data-act-form]');
    if (form) {
      const updatePreview = () => {
        const st = form.querySelector('[name="start_time"]')?.value;
        const et = form.querySelector('[name="end_time"]')?.value;
        const previewEl = form.querySelector('[data-duration-preview]');
        if (previewEl) previewEl.textContent = `(${computePreviewDuration(st, et)})`;
      };
      form.querySelector('[name="start_time"]')?.addEventListener('input', updatePreview);
      form.querySelector('[name="end_time"]')?.addEventListener('input', updatePreview);

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const taskSelect = form.querySelector('[name="linked_task_ids"]');
        const selectedTasks = taskSelect ? Array.from(taskSelect.selectedOptions).map((o) => o.value) : [];
        const payload = {
          title: String(fd.get('title') || '').trim(),
          description: String(fd.get('description') || '').trim(),
          activity_date: String(fd.get('activity_date') || todayIso()),
          start_time: String(fd.get('start_time') || ''),
          end_time: String(fd.get('end_time') || ''),
          category: String(fd.get('category') || 'Other'),
          priority: String(fd.get('priority') || 'medium'),
          status: String(fd.get('status') || 'completed'),
          remarks: String(fd.get('remarks') || '').trim(),
          project_id: String(fd.get('project_id') || '') || null,
          linked_task_ids: selectedTasks,
        };
        try {
          if (editingActivity) {
            const res = await api.updateActivity(editingActivity.id, payload);
            if (res.success) {
              activities = activities.map((x) => (x.id === editingActivity.id ? res.activity : x));
              showModal = false;
              editingActivity = null;
              showToast('Activity updated.');
            }
          } else {
            const res = await api.createActivity(payload);
            if (res.success) {
              activities = [res.activity, ...activities];
              showModal = false;
              showToast('Activity logged.');
            }
          }
        } catch (err) {
          showToast(err.message || 'Unable to save activity.');
        }
      });
    }
  };

  render();
  fetchAll();

  return () => {
    disposed = true;
  };
}

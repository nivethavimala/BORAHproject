import { api } from '../api.js';
import { escapeHtml, renderIcons, todayIso } from '../utils/dom.js';
import { taskNotificationManager } from '../utils/taskNotifications.js';
import { renderAttachmentsSection } from './attachmentsWidget.js';

const CATEGORIES = ['Teaching', 'Research', 'Academic', 'Administrative', 'Project', 'Personal', 'Other'];

const STATUS_OPTS = [
  { id: 'not_started', label: 'Not Started', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { id: 'in_progress', label: 'In Progress', cls: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300' },
  { id: 'completed', label: 'Completed', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
  { id: 'on_hold', label: 'On Hold', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
];

const PRIORITY_COLORS = {
  high: { label: 'High', cls: 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40' },
  medium: { label: 'Medium', cls: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40' },
  low: { label: 'Low', cls: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' },
};

export function renderTasksView(container) {
  let tasks = [];
  let projects = [];
  let filterTab = 'all';
  let categoryFilter = 'all';
  let showAddModal = false;
  let editingTask = null;
  let deleteConfirmTaskId = null;
  let activeAttTaskId = null;
  let toastMessage = null;
  let toastTimer = null;
  let disposed = false;

  let formState = {
    title: '',
    description: '',
    priority: 'medium',
    category: 'Teaching',
    status: 'not_started',
    progress_percent: 0,
    project_id: '',
    due_date: todayIso(),
    due_time: '',
  };

  const showToast = (msg) => {
    toastMessage = msg;
    render();
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastMessage = null;
      render();
    }, 3200);
  };

  const loadData = async () => {
    try {
      const [tRes, pRes] = await Promise.all([api.getTasks(), api.getProjects()]);
      if (!disposed) {
        tasks = tRes.tasks || [];
        projects = pRes.projects || [];
        if (tasks.length > 0) taskNotificationManager.checkTasks(tasks);
        render();
      }
    } catch {
      if (!disposed) render();
    }
  };

  const handleToggleTask = async (task) => {
    const completed = !(task.completed || task.status === 'completed');
    const payload = {
      completed,
      status: completed ? 'completed' : 'in_progress',
      progress_percent: completed ? 100 : Math.min(90, task.progress_percent || 25),
    };
    try {
      const res = await api.updateTask(task.id, payload);
      if (res.success) {
        tasks = tasks.map((t) => (t.id === task.id ? res.task : t));
        showToast(completed ? 'Task marked completed.' : 'Task reopened.');
      }
    } catch (err) {
      showToast(err.message || 'Could not update task.');
    }
  };

  const render = () => {
    if (disposed) return;

    const todayStr = todayIso();
    const filteredTasks = tasks.filter((t) => {
      const isDone = !!(t.completed || t.status === 'completed');
      if (filterTab === 'today' && t.due_date !== todayStr) return false;
      if (filterTab === 'pending' && isDone) return false;
      if (filterTab === 'completed' && !isDone) return false;
      if (categoryFilter !== 'all' && (t.category || '').toLowerCase() !== categoryFilter.toLowerCase()) return false;
      return true;
    });

    const totalCount = tasks.length;
    const completedCount = tasks.filter((t) => t.completed || t.status === 'completed').length;
    const pendingCount = totalCount - completedCount;
    const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const listHtml =
      filteredTasks.length === 0
        ? `<div class="py-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <i data-lucide="check-square" class="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700"></i>
            <p class="text-xs">No tasks match this filter.</p>
            <button type="button" data-task-add class="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline cursor-pointer">Create a Task</button>
          </div>`
        : filteredTasks
            .map((t) => {
              const isDone = !!(t.completed || t.status === 'completed');
              const prio = PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.medium;
              const stObj = STATUS_OPTS.find((s) => s.id === (t.status || (isDone ? 'completed' : 'not_started'))) || STATUS_OPTS[0];
              const linkedCount = (t.linked_activity_ids || []).length;

              return `
                <div class="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2 ${isDone ? 'opacity-75' : ''}">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex items-start gap-3">
                      <button type="button" data-task-toggle="${escapeHtml(t.id)}" class="p-1 text-slate-400 hover:text-emerald-600 cursor-pointer mt-0.5">
                        ${
                          isDone
                            ? `<i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-600"></i>`
                            : `<i data-lucide="circle" class="w-5 h-5 text-slate-300 hover:text-emerald-500"></i>`
                        }
                      </button>
                      <div class="space-y-1">
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="text-xs font-bold text-slate-800 dark:text-slate-100 ${isDone ? 'line-through text-slate-400' : ''}">${escapeHtml(t.title)}</span>
                          <span class="text-[10px] font-semibold px-2 py-0.5 rounded-md ${stObj.cls}">${escapeHtml(stObj.label)}</span>
                          <span class="text-[10px] font-semibold px-2 py-0.5 rounded-md ${prio.cls}">${escapeHtml(prio.label)}</span>
                          <span class="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">${escapeHtml(t.category || 'Personal')}</span>
                        </div>
                        ${t.description ? `<p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(t.description)}</p>` : ''}
                        <div class="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                          ${t.due_date ? `<span class="flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> ${escapeHtml(t.due_date === todayStr ? 'Today' : t.due_date)}</span>` : ''}
                          ${t.due_time ? `<span class="flex items-center gap-1 font-mono"><i data-lucide="clock" class="w-3 h-3"></i> ${escapeHtml(t.due_time)}</span>` : ''}
                          <span class="font-mono text-emerald-700 dark:text-emerald-400">${t.progress_percent ?? (isDone ? 100 : 0)}% progress</span>
                          ${linkedCount > 0 ? `<span class="text-indigo-600 dark:text-indigo-400">${linkedCount} linked activity log${linkedCount > 1 ? 's' : ''}</span>` : ''}
                          ${t.attachment_count > 0 ? `<span>${t.attachment_count} attachment${t.attachment_count > 1 ? 's' : ''}</span>` : ''}
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0 self-end sm:self-center">
                      <button type="button" data-task-att="${escapeHtml(t.id)}" class="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl cursor-pointer" title="Attachments">
                        <i data-lucide="paperclip" class="w-4 h-4"></i>
                      </button>
                      <button type="button" data-task-remind="${escapeHtml(t.id)}" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl cursor-pointer" title="Send Task Reminder">
                        <i data-lucide="bell" class="w-4 h-4"></i>
                      </button>
                      <button type="button" data-task-edit="${escapeHtml(t.id)}" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl cursor-pointer" title="Edit Task">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                      </button>
                      <button type="button" data-task-del="${escapeHtml(t.id)}" class="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl cursor-pointer" title="Delete Task">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                      </button>
                    </div>
                  </div>
                  ${activeAttTaskId === t.id ? `<div data-task-att-slot="${escapeHtml(t.id)}" class="pt-2"></div>` : ''}
                </div>`;
            })
            .join('');

    const modalHtml = showAddModal
      ? `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
          <button type="button" data-task-close-modal class="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
          <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif mb-1">${editingTask ? 'Edit Task' : 'Create Task'}</h2>
          <p class="text-xs text-slate-500 mb-5">Track status, category, priority, due date, and completion progress.</p>
          <form data-task-form class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Task Title *</label>
              <input type="text" required name="title" value="${escapeHtml(formState.title)}" placeholder="e.g. Finalize Machine Learning lecture notes" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Description</label>
              <textarea rows="2" name="description" class="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">${escapeHtml(formState.description)}</textarea>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Category</label>
                <select name="category" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">
                  ${CATEGORIES.map((c) => `<option value="${escapeHtml(c)}" ${formState.category.toLowerCase() === c.toLowerCase() ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
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
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Status</label>
                <select name="status" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">
                  ${STATUS_OPTS.map((s) => `<option value="${s.id}" ${formState.status === s.id ? 'selected' : ''}>${escapeHtml(s.label)}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Progress (%)</label>
                <input type="number" min="0" max="100" name="progress_percent" value="${Number(formState.progress_percent || 0)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Due Date</label>
                <input type="date" name="due_date" value="${escapeHtml(formState.due_date)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Due Time</label>
                <input type="time" name="due_time" value="${escapeHtml(formState.due_time)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Project (Optional)</label>
                <select name="project_id" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">
                  <option value="">None</option>
                  ${projects.map((p) => `<option value="${escapeHtml(p.id)}" ${formState.project_id === p.id ? 'selected' : ''}>${escapeHtml(p.title)}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button type="button" data-task-close-modal class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2 text-xs font-semibold borah-btn-sage rounded-xl shadow-sm cursor-pointer">Save Task</button>
            </div>
          </form>
        </div>
      </div>`
      : '';

    const deleteModalHtml = deleteConfirmTaskId
      ? `<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 class="text-base font-bold text-slate-800 dark:text-slate-100">Delete Task?</h3>
            <p class="text-xs text-slate-500">This removes the task from your workspace permanently.</p>
            <div class="flex gap-3">
              <button type="button" data-task-cancel-del class="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold cursor-pointer">Cancel</button>
              <button type="button" data-task-confirm-del class="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold cursor-pointer">Delete</button>
            </div>
          </div>
        </div>`
      : '';

    container.innerHTML = `
      <div class="borah-container-wide space-y-6 animate-in fade-in duration-300">
        ${toastMessage ? `<div class="fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl bg-slate-900 text-white text-xs font-medium shadow-xl">${escapeHtml(toastMessage)}</div>` : ''}

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-serif">Task Management</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Track deliverables, priorities, due times, and progress cleanly.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" data-task-export="tasks:pdf" class="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">All PDF</button>
            <button type="button" data-task-export="tasks-pending:xlsx" class="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">Pending Excel</button>
            <button type="button" data-task-export="tasks-completed:csv" class="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">Completed CSV</button>
            <button type="button" data-task-add class="px-4 py-2 rounded-xl text-xs font-semibold borah-btn-sage shadow-sm flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="plus" class="w-4 h-4"></i><span>Add Task</span>
            </button>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Completion Summary</div>
            <h3 class="text-lg font-bold font-serif text-slate-800 dark:text-slate-100 mt-0.5">${completedCount} completed • ${pendingCount} pending (${totalCount} total)</h3>
          </div>
          <div class="flex items-center gap-4 min-w-[220px]">
            <div class="flex-1 bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
              <div class="bg-emerald-600 h-full rounded-full transition-all" style="width: ${completionPct}%"></div>
            </div>
            <span class="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">${completionPct}%</span>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div class="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            ${['all', 'today', 'pending', 'completed']
              .map(
                (tab) => `<button type="button" data-task-tab="${tab}" class="px-3 py-1.5 text-xs font-semibold rounded-lg capitalize cursor-pointer ${
                  filterTab === tab ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
                }">${tab}</button>`
              )
              .join('')}
          </div>
          <select data-task-cat-filter class="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">
            <option value="all" ${categoryFilter === 'all' ? 'selected' : ''}>All Categories</option>
            ${CATEGORIES.map((c) => `<option value="${escapeHtml(c)}" ${categoryFilter === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>
        </div>

        <div class="space-y-2.5">${listHtml}</div>
        ${modalHtml}
        ${deleteModalHtml}
      </div>
    `;

    renderIcons(container);

    if (activeAttTaskId) {
      const slot = container.querySelector(`[data-task-att-slot="${activeAttTaskId}"]`);
      if (slot) {
        renderAttachmentsSection(slot, {
          entityType: 'task',
          entityId: activeAttTaskId,
          onChanged: () => loadData(),
        });
      }
    }

    container.querySelectorAll('[data-task-tab]').forEach((btn) =>
      btn.addEventListener('click', () => {
        filterTab = btn.getAttribute('data-task-tab');
        render();
      })
    );
    container.querySelector('[data-task-cat-filter]')?.addEventListener('change', (e) => {
      categoryFilter = e.target.value;
      render();
    });
    container.querySelectorAll('[data-task-add]').forEach((btn) =>
      btn.addEventListener('click', () => {
        editingTask = null;
        formState = {
          title: '',
          description: '',
          priority: 'medium',
          category: 'Teaching',
          status: 'not_started',
          progress_percent: 0,
          project_id: '',
          due_date: todayIso(),
          due_time: '',
        };
        showAddModal = true;
        render();
      })
    );
    container.querySelectorAll('[data-task-toggle]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const t = tasks.find((x) => x.id === btn.getAttribute('data-task-toggle'));
        if (t) handleToggleTask(t);
      })
    );
    container.querySelectorAll('[data-task-remind]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const t = tasks.find((x) => x.id === btn.getAttribute('data-task-remind'));
        if (t) {
          taskNotificationManager.triggerTaskReminder(t, 'Task reminder');
          showToast(`Reminder triggered for "${t.title}".`);
        }
      })
    );
    container.querySelectorAll('[data-task-att]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-task-att');
        activeAttTaskId = activeAttTaskId === id ? null : id;
        render();
      })
    );
    container.querySelectorAll('[data-task-edit]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const t = tasks.find((x) => x.id === btn.getAttribute('data-task-edit'));
        if (!t) return;
        editingTask = t;
        formState = {
          title: t.title || '',
          description: t.description || '',
          priority: t.priority || 'medium',
          category: t.category || 'Teaching',
          status: t.status || (t.completed ? 'completed' : 'not_started'),
          progress_percent: t.progress_percent ?? (t.completed ? 100 : 0),
          project_id: t.project_id || '',
          due_date: t.due_date || todayIso(),
          due_time: t.due_time || '',
        };
        showAddModal = true;
        render();
      })
    );
    container.querySelectorAll('[data-task-del]').forEach((btn) =>
      btn.addEventListener('click', () => {
        deleteConfirmTaskId = btn.getAttribute('data-task-del');
        render();
      })
    );
    container.querySelectorAll('[data-task-close-modal]').forEach((btn) =>
      btn.addEventListener('click', () => {
        showAddModal = false;
        editingTask = null;
        render();
      })
    );
    container.querySelector('[data-task-cancel-del]')?.addEventListener('click', () => {
      deleteConfirmTaskId = null;
      render();
    });
    container.querySelector('[data-task-confirm-del]')?.addEventListener('click', async () => {
      if (!deleteConfirmTaskId) return;
      await api.deleteTask(deleteConfirmTaskId);
      tasks = tasks.filter((t) => t.id !== deleteConfirmTaskId);
      deleteConfirmTaskId = null;
      showToast('Task deleted.');
    });
    container.querySelectorAll('[data-task-export]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const [mod, fmt] = btn.getAttribute('data-task-export').split(':');
        try {
          await api.downloadExport(mod, fmt);
          showToast('Task export downloaded.');
        } catch (err) {
          showToast(err.message || 'Export failed.');
        }
      })
    );
    container.querySelector('[data-task-form]')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const status = String(fd.get('status') || 'not_started');
      const payload = {
        title: String(fd.get('title') || '').trim(),
        description: String(fd.get('description') || '').trim(),
        category: String(fd.get('category') || 'Teaching'),
        priority: String(fd.get('priority') || 'medium'),
        status,
        completed: status === 'completed',
        progress_percent: Number(fd.get('progress_percent') || 0),
        due_date: String(fd.get('due_date') || todayIso()),
        due_time: String(fd.get('due_time') || ''),
        project_id: String(fd.get('project_id') || '') || null,
      };
      try {
        if (editingTask) {
          const res = await api.updateTask(editingTask.id, payload);
          if (res.success) {
            tasks = tasks.map((t) => (t.id === editingTask.id ? res.task : t));
            showAddModal = false;
            editingTask = null;
            showToast('Task updated.');
          }
        } else {
          const res = await api.createTask(payload);
          if (res.success) {
            tasks = [res.task, ...tasks];
            showAddModal = false;
            showToast('Task created.');
          }
        }
      } catch (err) {
        showToast(err.message || 'Could not save task.');
      }
    });
  };

  render();
  loadData();

  return () => {
    disposed = true;
    if (toastTimer) clearTimeout(toastTimer);
  };
}

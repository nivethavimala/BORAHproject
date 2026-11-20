import { api } from '../api.js';
import { escapeHtml, renderIcons, todayIso } from '../utils/dom.js';
import { taskNotificationManager } from '../utils/taskNotifications.js';

const CATEGORIES = [
  { id: 'study', label: 'Study & Academics' },
  { id: 'personal', label: 'Personal & Rest' },
  { id: 'work', label: 'Work & Projects' },
  { id: 'health', label: 'Health & Wellness' },
  { id: 'project', label: 'MSc Thesis / Research' },
  { id: 'other', label: 'Other Tasks' },
];

const PRIORITY_COLORS = {
  high: { label: 'High', text: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40' },
  medium: { label: 'Medium', text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  low: { label: 'Low', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
};

export function renderTasksView(container) {
  let tasks = [];
  let filterTab = 'all';
  let categoryFilter = 'all';
  let showAddModal = false;
  let editingTask = null;
  let deleteConfirmTaskId = null;
  let notificationPermission = taskNotificationManager.getPermission();
  let activeReminderTask = null;
  let toastMessage = null;
  let toastTimer = null;
  let disposed = false;

  let formState = {
    title: '',
    description: '',
    priority: 'medium',
    category: 'personal',
    dueDate: todayIso(),
    dueTime: '',
  };

  const showToast = (msg) => {
    toastMessage = msg;
    render();
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastMessage = null;
      render();
    }, 3500);
  };

  const unsubscribeReminder = taskNotificationManager.subscribe((remindedTask) => {
    activeReminderTask = remindedTask;
    render();
  });

  const handleToggleTask = async (task) => {
    const updatedStatus = !task.completed;
    try {
      await api.updateTask(task.id, { completed: updatedStatus });
      tasks = tasks.map((t) => (t.id === task.id ? { ...t, completed: updatedStatus } : t));
      const todayStr = todayIso();
      const todayTasks = tasks.filter((t) => !t.due_date || t.due_date === todayStr);
      const remainingToday = todayTasks.filter((t) => !t.completed);
      if (updatedStatus && remainingToday.length === 0 && todayTasks.length > 0) {
        if (typeof window.confetti === 'function') {
          window.confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#A78BFA', '#8B5CF6', '#10B981', '#F59E0B'],
          });
        }
        showToast("You did it! Everything on today's list is complete 🎉");
      } else if (updatedStatus) {
        showToast('Step completed 💜');
      } else {
        render();
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const render = () => {
    if (disposed) return;

    const todayStr = todayIso();
    const filteredTasks = tasks.filter((t) => {
      if (filterTab === 'today' && t.due_date !== todayStr) return false;
      if (filterTab === 'pending' && t.completed) return false;
      if (filterTab === 'completed' && !t.completed) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      return true;
    });

    const totalToday = tasks.filter((t) => !t.due_date || t.due_date === todayStr);
    const completedToday = totalToday.filter((t) => t.completed).length;
    const progressPercent = totalToday.length > 0 ? Math.round((completedToday / totalToday.length) * 100) : 100;

    const reminderBannerHtml = activeReminderTask
      ? `
      <div class="p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-amber-500/10 border-2 border-amber-400 dark:border-amber-600/60 shadow-md animate-in fade-in slide-in-from-top-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start sm:items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm animate-bounce">
            <i data-lucide="bell-ring" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Task Due Reminder</span>
              ${activeReminderTask.due_time ? `<span class="text-[11px] font-mono text-slate-500">at ${escapeHtml(activeReminderTask.due_time)}</span>` : ''}
            </div>
            <h4 class="text-sm font-bold text-slate-800 dark:text-slate-100 font-serif">${escapeHtml(activeReminderTask.title)}</h4>
            ${activeReminderTask.description ? `<p class="text-xs text-slate-500 line-clamp-1">${escapeHtml(activeReminderTask.description)}</p>` : ''}
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button type="button" data-task-reminder-complete class="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs flex items-center gap-1">
            <i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i>
            <span>Mark Complete</span>
          </button>
          <button type="button" data-task-reminder-dismiss class="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer">
            Dismiss
          </button>
        </div>
      </div>`
      : '';

    const listHtml =
      filteredTasks.length === 0
        ? `
        <div class="py-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
          <i data-lucide="check-square" class="w-10 h-10 mx-auto text-amber-300 dark:text-slate-700 mb-2"></i>
          <p class="text-xs font-serif">No tasks in this view.</p>
          <button type="button" data-task-add class="mt-3 text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline cursor-pointer">
            Create your next task 🌷
          </button>
        </div>`
        : filteredTasks
            .map((t) => {
              const prio = PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.medium;
              return `
                <div class="p-4 rounded-2xl border transition-all flex items-start sm:items-center justify-between gap-3 group ${
                  t.completed
                    ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-60'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300'
                }">
                  <div class="flex items-start sm:items-center gap-3">
                    <button type="button" data-task-toggle="${escapeHtml(t.id)}" class="p-1 text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer mt-0.5 sm:mt-0">
                      ${
                        t.completed
                          ? `<i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-500"></i>`
                          : `<i data-lucide="circle" class="w-5 h-5 text-slate-300 hover:text-emerald-400"></i>`
                      }
                    </button>
                    <div class="space-y-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-xs font-semibold text-slate-800 dark:text-slate-200 ${t.completed ? 'line-through text-slate-400' : ''}">
                          ${escapeHtml(t.title)}
                        </span>
                        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-md ${prio.bg} ${prio.text}">${escapeHtml(prio.label)}</span>
                        <span class="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md capitalize">${escapeHtml(t.category)}</span>
                      </div>
                      ${t.description ? `<p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(t.description)}</p>` : ''}
                      ${
                        t.due_date
                          ? `<div class="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                              <span class="flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> ${escapeHtml(t.due_date === todayStr ? 'Today' : t.due_date)}</span>
                              ${t.due_time ? `<span class="flex items-center gap-1 font-mono"><i data-lucide="clock" class="w-3 h-3"></i> ${escapeHtml(t.due_time)}</span>` : ''}
                            </div>`
                          : ''
                      }
                    </div>
                  </div>
                  <div class="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-all">
                    <button type="button" data-task-remind="${escapeHtml(t.id)}" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl transition-all cursor-pointer" title="Remind me of this task with chime and notification">
                      <i data-lucide="bell" class="w-4 h-4"></i>
                    </button>
                    <button type="button" data-task-edit="${escapeHtml(t.id)}" class="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-xl transition-all cursor-pointer" title="Edit task">
                      <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                    <button type="button" data-task-del="${escapeHtml(t.id)}" class="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer" title="Delete task">
                      <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                  </div>
                </div>`;
            })
            .join('');

    const addModalHtml = showAddModal
      ? `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
          <button type="button" data-task-close-modal class="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
          <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif mb-1">
            ${editingTask ? 'Edit Task ✏️' : 'Add New Task ✅'}
          </h2>
          <p class="text-xs text-slate-500 mb-6">
            ${editingTask ? 'Update your task title, deadline, priority, or notes.' : 'Break down your daily goals into manageable steps.'}
          </p>
          <form data-task-form class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Task Title</label>
              <input type="text" required name="title" placeholder="e.g. Complete literature review draft" value="${escapeHtml(formState.title)}" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Description / Sub-tasks</label>
              <textarea rows="2" name="description" placeholder="Add context or notes..." class="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none resize-none">${escapeHtml(formState.description)}</textarea>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Priority</label>
                <select name="priority" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">
                  <option value="high" ${formState.priority === 'high' ? 'selected' : ''}>🔴 High Priority</option>
                  <option value="medium" ${formState.priority === 'medium' ? 'selected' : ''}>🟡 Medium Priority</option>
                  <option value="low" ${formState.priority === 'low' ? 'selected' : ''}>🟢 Low Priority</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Category</label>
                <select name="category" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">
                  ${CATEGORIES.map((c) => `<option value="${c.id}" ${formState.category === c.id ? 'selected' : ''}>${escapeHtml(c.label)}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Due Date</label>
                <input type="date" name="dueDate" value="${escapeHtml(formState.dueDate)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Due Time (Optional)</label>
                <input type="time" name="dueTime" value="${escapeHtml(formState.dueTime)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
            </div>
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button type="button" data-task-close-modal class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm cursor-pointer">
                ${editingTask ? 'Update Task ✨' : 'Save Task ✨'}
              </button>
            </div>
          </form>
        </div>
      </div>`
      : '';

    const deleteModalHtml = deleteConfirmTaskId
      ? `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
            <i data-lucide="trash-2" class="w-6 h-6"></i>
          </div>
          <div class="text-center">
            <h3 class="text-base font-bold text-slate-800 dark:text-slate-100">Delete Task?</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Are you sure you want to remove this task from your list?</p>
          </div>
          <div class="flex items-center gap-3 pt-2">
            <button type="button" data-task-cancel-del class="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer">Cancel</button>
            <button type="button" data-task-confirm-del class="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow cursor-pointer">Delete Task</button>
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
              <span>To-Do &amp; Productivity</span>
              <span class="text-sm font-sans font-normal text-slate-400">(${tasks.length} total)</span>
            </h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Organize small steady steps without feeling overwhelmed.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            ${
              notificationPermission !== 'granted'
                ? `<button type="button" data-task-enable-notif class="px-3 py-2 rounded-2xl text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs" title="Enable desktop notifications and gentle sound reminders">
                    <i data-lucide="bell-ring" class="w-3.5 h-3.5 text-purple-600"></i>
                    <span>Enable Reminders</span>
                  </button>`
                : ''
            }
            <button type="button" data-task-test-chime class="px-3 py-2 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs" title="Test the gentle double-tone reminder chime">
              <i data-lucide="volume-2" class="w-3.5 h-3.5 text-amber-500"></i>
              <span>Test Chime</span>
            </button>
            <button type="button" data-task-add class="px-4 py-2 rounded-2xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>Add Task</span>
            </button>
          </div>
        </div>

        ${reminderBannerHtml}

        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="space-y-1">
            <div class="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              <i data-lucide="sparkles" class="w-3.5 h-3.5 text-amber-500"></i> Today's Focus
            </div>
            <h3 class="text-lg font-bold font-serif text-slate-800 dark:text-slate-100">
              ${completedToday} of ${totalToday.length} tasks completed today
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              ${progressPercent === 100 ? 'Everything scheduled for today is complete! Take a relaxing break 🌸' : 'Small consistent steps lead to great accomplishments.'}
            </p>
          </div>
          <div class="flex items-center gap-4 min-w-[200px]">
            <div class="flex-1 bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
              <div class="bg-emerald-500 h-full rounded-full transition-all duration-500" style="width: ${progressPercent}%"></div>
            </div>
            <span class="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">${progressPercent}%</span>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div class="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            ${['all', 'today', 'pending', 'completed']
              .map(
                (tab) => `
              <button type="button" data-task-tab="${tab}" class="px-3 py-1.5 text-xs font-medium rounded-xl transition-colors capitalize cursor-pointer ${
                filterTab === tab
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }">${tab}</button>`
              )
              .join('')}
          </div>
          <div class="flex items-center gap-2">
            <i data-lucide="tag" class="w-3.5 h-3.5 text-slate-400"></i>
            <select data-task-cat-filter class="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">
              <option value="all" ${categoryFilter === 'all' ? 'selected' : ''}>All Categories</option>
              ${CATEGORIES.map((c) => `<option value="${c.id}" ${categoryFilter === c.id ? 'selected' : ''}>${escapeHtml(c.label)}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="space-y-2.5">${listHtml}</div>

        ${addModalHtml}
        ${deleteModalHtml}
      </div>
    `;

    renderIcons(container);

    container.querySelector('[data-task-enable-notif]')?.addEventListener('click', async () => {
      const granted = await taskNotificationManager.requestPermission();
      notificationPermission = taskNotificationManager.getPermission();
      taskNotificationManager.playTaskChime();
      showToast(granted ? 'Notifications enabled! Soft reminder chime played 🔔' : 'Notification permission not granted, but in-app chimes remain active ✨');
    });

    container.querySelector('[data-task-test-chime]')?.addEventListener('click', () => {
      taskNotificationManager.playTaskChime();
      showToast('Playing soothing task reminder chime 🎶');
    });

    container.querySelector('[data-task-reminder-complete]')?.addEventListener('click', () => {
      if (activeReminderTask) {
        const target = activeReminderTask;
        activeReminderTask = null;
        handleToggleTask(target);
      }
    });

    container.querySelector('[data-task-reminder-dismiss]')?.addEventListener('click', () => {
      activeReminderTask = null;
      render();
    });

    container.querySelectorAll('[data-task-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        filterTab = btn.getAttribute('data-task-tab');
        render();
      });
    });

    container.querySelector('[data-task-cat-filter]')?.addEventListener('change', (e) => {
      categoryFilter = e.target.value;
      render();
    });

    container.querySelectorAll('[data-task-add]').forEach((btn) => {
      btn.addEventListener('click', () => {
        editingTask = null;
        formState = {
          title: '',
          description: '',
          priority: 'medium',
          category: 'personal',
          dueDate: todayIso(),
          dueTime: '',
        };
        showAddModal = true;
        render();
      });
    });

    container.querySelectorAll('[data-task-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const task = tasks.find((t) => t.id === btn.getAttribute('data-task-toggle'));
        if (task) handleToggleTask(task);
      });
    });

    container.querySelectorAll('[data-task-remind]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const task = tasks.find((t) => t.id === btn.getAttribute('data-task-remind'));
        if (task) {
          taskNotificationManager.triggerTaskReminder(task, 'Task reminder');
          showToast(`🔔 Reminder chime & notification sent for "${task.title}"`);
        }
      });
    });

    container.querySelectorAll('[data-task-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const task = tasks.find((t) => t.id === btn.getAttribute('data-task-edit'));
        if (!task) return;
        editingTask = task;
        formState = {
          title: task.title || '',
          description: task.description || '',
          priority: task.priority || 'medium',
          category: task.category || 'personal',
          dueDate: task.due_date || todayIso(),
          dueTime: task.due_time || '',
        };
        showAddModal = true;
        render();
      });
    });

    container.querySelectorAll('[data-task-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        deleteConfirmTaskId = btn.getAttribute('data-task-del');
        render();
      });
    });

    container.querySelectorAll('[data-task-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        showAddModal = false;
        editingTask = null;
        render();
      });
    });

    container.querySelector('[data-task-cancel-del]')?.addEventListener('click', () => {
      deleteConfirmTaskId = null;
      render();
    });

    container.querySelector('[data-task-confirm-del]')?.addEventListener('click', async () => {
      if (!deleteConfirmTaskId) return;
      try {
        const res = await api.deleteTask(deleteConfirmTaskId);
        if (res.success) {
          tasks = tasks.filter((t) => t.id !== deleteConfirmTaskId);
          deleteConfirmTaskId = null;
          showToast('Task removed.');
        }
      } catch (err) {
        showToast(err.message || 'Failed to delete task.');
      }
    });

    container.querySelector('[data-task-form]')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const title = String(fd.get('title') || '').trim();
      if (!title) {
        showToast('Please provide a task title.');
        return;
      }
      const payload = {
        title,
        description: String(fd.get('description') || '').trim(),
        priority: String(fd.get('priority') || 'medium'),
        category: String(fd.get('category') || 'personal'),
        due_date: String(fd.get('dueDate') || todayIso()),
        due_time: String(fd.get('dueTime') || ''),
      };
      try {
        if (editingTask) {
          const res = await api.updateTask(editingTask.id, payload);
          if (res.success) {
            tasks = tasks.map((t) => (t.id === editingTask.id ? res.task : t));
            showAddModal = false;
            editingTask = null;
            showToast('Task updated ✨');
          }
        } else {
          const res = await api.createTask(payload);
          if (res.success) {
            tasks = [res.task, ...tasks];
            showAddModal = false;
            showToast('Task added to your list ✨');
          }
        }
      } catch (err) {
        showToast(err.message || 'Unable to save task.');
      }
    });
  };

  render();

  api
    .getTasks()
    .then((res) => {
      if (!disposed && res.success) {
        tasks = res.tasks || [];
        if (tasks.length > 0) {
          taskNotificationManager.checkTasks(tasks);
        }
        render();
      }
    })
    .catch((err) => console.error('Error loading tasks:', err));

  return () => {
    disposed = true;
    unsubscribeReminder();
    if (toastTimer) clearTimeout(toastTimer);
  };
}

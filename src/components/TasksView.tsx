import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Task } from '../types';
import { taskNotificationManager } from '../utils/taskNotificationManager';
import {
  CheckSquare,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Edit3,
  Calendar,
  Clock,
  Filter,
  Sparkles,
  X,
  AlertCircle,
  Tag,
  Bell,
  BellRing,
  Volume2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const TasksView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'today' | 'pending' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteConfirmTaskId, setDeleteConfirmTaskId] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [activeReminderTask, setActiveReminderTask] = useState<Task | null>(null);

  // Task form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [category, setCategory] = useState<'study' | 'personal' | 'work' | 'health' | 'project' | 'other'>('personal');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueTime, setDueTime] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);


  const categories = [
    { id: 'study', label: 'Study & Academics' },
    { id: 'personal', label: 'Personal & Rest' },
    { id: 'work', label: 'Work & Projects' },
    { id: 'health', label: 'Health & Wellness' },
    { id: 'project', label: 'MSc Thesis / Research' },
    { id: 'other', label: 'Other Tasks' },
  ];

  const priorityColors = {
    high: { label: 'High', dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40' },
    medium: { label: 'Medium', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
    low: { label: 'Low', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  };

  const loadTasks = async () => {
    try {
      const res = await api.getTasks();
      if (res.success) {
        setTasks(res.tasks);
      }
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setNotificationPermission(taskNotificationManager.getPermission());
    loadTasks();

    const unsubscribe = taskNotificationManager.subscribe((remindedTask) => {
      setActiveReminderTask(remindedTask);
    });

    return () => {
      unsubscribe();
      taskNotificationManager.stopReminderLoop();
    };
  }, []);

  useEffect(() => {
    if (tasks.length > 0) {
      taskNotificationManager.checkTasks(tasks);
      taskNotificationManager.startReminderLoop(() => tasks);
    }
  }, [tasks]);

  const handleRequestNotificationPermission = async () => {
    const granted = await taskNotificationManager.requestPermission();
    setNotificationPermission(taskNotificationManager.getPermission());
    taskNotificationManager.playTaskChime();
    if (granted) {
      showToast('Notifications enabled! Soft reminder chime played 🔔');
    } else {
      showToast('Notification permission not granted, but in-app chimes remain active ✨');
    }
  };

  const handleTestChime = () => {
    taskNotificationManager.playTaskChime();
    showToast('Playing soothing task reminder chime 🎶');
  };

  const handleTriggerSingleReminder = (t: Task) => {
    taskNotificationManager.triggerTaskReminder(t, 'Task reminder');
    showToast(`🔔 Reminder chime & notification sent for "${t.title}"`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };


  const handleToggleTask = async (task: Task) => {
    const updatedStatus = !task.completed;
    try {
      await api.updateTask(task.id, { completed: updatedStatus });
      const nextTasks = tasks.map((t) => (t.id === task.id ? { ...t, completed: updatedStatus } : t));
      setTasks(nextTasks);

      // Check if all today's tasks completed
      const todayStr = new Date().toISOString().split('T')[0];
      const todayTasks = nextTasks.filter((t) => !t.due_date || t.due_date === todayStr);
      const remainingToday = todayTasks.filter((t) => !t.completed);

      if (updatedStatus && remainingToday.length === 0 && todayTasks.length > 0) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#A78BFA', '#8B5CF6', '#10B981', '#F59E0B'],
        });
        showToast('You did it! Everything on today\'s list is complete 🎉');
      } else if (updatedStatus) {
        showToast('Step completed 💜');
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleOpenAddTask = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setPriority('medium');
    setCategory('personal');
    setDueDate(new Date().toISOString().split('T')[0]);
    setDueTime('');
    setShowAddModal(true);
  };

  const handleOpenEditTask = (t: Task) => {
    setEditingTask(t);
    setTitle(t.title);
    setDescription(t.description || '');
    setPriority((t.priority as any) || 'medium');
    setCategory((t.category as any) || 'personal');
    setDueDate(t.due_date || new Date().toISOString().split('T')[0]);
    setDueTime(t.due_time || '');
    setShowAddModal(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Please provide a task title.');
      return;
    }

    try {
      if (editingTask) {
        const res = await api.updateTask(editingTask.id, {
          title: title.trim(),
          description: description.trim(),
          priority,
          category,
          due_date: dueDate,
          due_time: dueTime,
        });

        if (res.success) {
          setTasks(tasks.map((t) => (t.id === editingTask.id ? res.task : t)));
          setShowAddModal(false);
          setEditingTask(null);
          showToast('Task updated ✨');
        }
      } else {
        const res = await api.createTask({
          title: title.trim(),
          description: description.trim(),
          priority,
          category,
          due_date: dueDate,
          due_time: dueTime,
        });

        if (res.success) {
          setTasks([res.task, ...tasks]);
          setShowAddModal(false);
          setTitle('');
          setDescription('');
          showToast('Task added to your list ✨');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Unable to save task.');
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const res = await api.deleteTask(id);
      if (res.success) {
        setTasks(tasks.filter((t) => t.id !== id));
        setDeleteConfirmTaskId(null);
        showToast('Task removed.');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete task.');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
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

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl bg-slate-900 text-white text-xs font-medium shadow-xl border border-slate-700 animate-in fade-in duration-200">
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-serif flex items-center gap-2">
            <span>To-Do & Productivity</span>
            <span className="text-sm font-sans font-normal text-slate-400">({tasks.length} total)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organize small steady steps without feeling overwhelmed.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {notificationPermission !== 'granted' && (
            <button
              type="button"
              onClick={handleRequestNotificationPermission}
              className="px-3 py-2 rounded-2xl text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Enable desktop notifications and gentle sound reminders"
            >
              <BellRing className="w-3.5 h-3.5 text-purple-600" />
              <span>Enable Reminders</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleTestChime}
            className="px-3 py-2 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Test the gentle double-tone reminder chime"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-500" />
            <span>Test Chime</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddTask}
            className="px-4 py-2 rounded-2xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Active Task Reminder Banner */}
      {activeReminderTask && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-amber-500/10 border-2 border-amber-400 dark:border-amber-600/60 shadow-md animate-in fade-in slide-in-from-top-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm animate-bounce">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Task Due Reminder
                </span>
                {activeReminderTask.due_time && (
                  <span className="text-[11px] font-mono text-slate-500">
                    at {activeReminderTask.due_time}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-serif">
                {activeReminderTask.title}
              </h4>
              {activeReminderTask.description && (
                <p className="text-xs text-slate-500 line-clamp-1">{activeReminderTask.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                handleToggleTask(activeReminderTask);
                setActiveReminderTask(null);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark Complete</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveReminderTask(null)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}


      {/* Progress & Overview Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Today's Focus
          </div>
          <h3 className="text-lg font-bold font-serif text-slate-800 dark:text-slate-100">
            {completedToday} of {totalToday.length} tasks completed today
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {progressPercent === 100
              ? 'Everything scheduled for today is complete! Take a relaxing break 🌸'
              : 'Small consistent steps lead to great accomplishments.'}
          </p>
        </div>

        <div className="flex items-center gap-4 min-w-[200px]">
          <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Filter Tabs & Category Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
          {(['all', 'today', 'pending', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors capitalize cursor-pointer ${
                filterTab === tab
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="py-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
            <CheckSquare className="w-10 h-10 mx-auto text-amber-300 dark:text-slate-700 mb-2" />
            <p className="text-xs font-serif">No tasks in this view.</p>
            <button
              type="button"
              onClick={handleOpenAddTask}
              className="mt-3 text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline cursor-pointer"
            >
              Create your next task 🌷
            </button>
          </div>
        ) : (
          filteredTasks.map((t) => {
            const prio = priorityColors[t.priority] || priorityColors.medium;
            return (
              <div
                key={t.id}
                className={`p-4 rounded-2xl border transition-all flex items-start sm:items-center justify-between gap-3 group ${
                  t.completed
                    ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-60'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleTask(t)}
                    className="p-1 text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer mt-0.5 sm:mt-0"
                  >
                    {t.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 hover:text-emerald-400" />
                    )}
                  </button>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs font-semibold text-slate-800 dark:text-slate-200 ${
                          t.completed ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {t.title}
                      </span>

                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${prio.bg} ${prio.text}`}>
                        {prio.label}
                      </span>

                      <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md capitalize">
                        {t.category}
                      </span>
                    </div>

                    {t.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t.description}
                      </p>
                    )}

                    {t.due_date && (
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {t.due_date === todayStr ? 'Today' : t.due_date}
                        </span>
                        {t.due_time && (
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {t.due_time}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-all">
                  <button
                    type="button"
                    onClick={() => handleTriggerSingleReminder(t)}
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl transition-all cursor-pointer"
                    title="Remind me of this task with chime and notification"
                  >
                    <Bell className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditTask(t)}
                    className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-xl transition-all cursor-pointer"
                    title="Edit task"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmTaskId(t.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setEditingTask(null);
              }}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif mb-1">
              {editingTask ? 'Edit Task ✏️' : 'Add New Task ✅'}
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              {editingTask
                ? 'Update your task title, deadline, priority, or notes.'
                : 'Break down your daily goals into manageable steps.'}
            </p>

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete literature review draft"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Description / Sub-tasks
                </label>
                <textarea
                  rows={2}
                  placeholder="Add context or notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="high">🔴 High Priority</option>
                    <option value="medium">🟡 Medium Priority</option>
                    <option value="low">🟢 Low Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Due Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingTask(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm cursor-pointer"
                >
                  {editingTask ? 'Update Task ✨' : 'Save Task ✨'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Task Confirmation Modal */}
      {deleteConfirmTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Delete Task?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to remove this task from your list?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTaskId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTask(deleteConfirmTaskId)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow cursor-pointer"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Schedule } from '../types';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Trash2,
  Edit3,
  Check,
  ChevronLeft,
  ChevronRight,
  Bell,
  BookOpen,
  Briefcase,
  User,
  AlertCircle,
  X,
} from 'lucide-react';

export const PlannerView: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deleteConfirmScheduleId, setDeleteConfirmScheduleId] = useState<string | null>(null);

  // Event Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(selectedDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [category, setCategory] = useState<'study' | 'work' | 'personal' | 'important'>('study');
  const [reminder, setReminder] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const categoryThemes: Record<
    string,
    { label: string; bg: string; text: string; border: string; icon: any }
  > = {
    study: { label: 'Study', bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800', icon: BookOpen },
    work: { label: 'Work / Project', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', icon: Briefcase },
    personal: { label: 'Personal & Rest', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', icon: User },
    important: { label: 'Important', bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800', icon: AlertCircle },
  };

  const loadSchedules = async () => {
    try {
      const res = await api.getSchedules();
      if (res.success) {
        setSchedules(res.schedules);
      }
    } catch (err) {
      console.error('Error loading schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenAddModal = () => {
    setEditingSchedule(null);
    setTitle('');
    setDescription('');
    setDate(selectedDate);
    setStartTime('09:00');
    setEndTime('10:30');
    setCategory('study');
    setReminder(true);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (item: Schedule) => {
    setEditingSchedule(item);
    setTitle(item.title);
    setDescription(item.description || '');
    setDate(item.date);
    setStartTime(item.start_time);
    setEndTime(item.end_time);
    setCategory((item.category as any) || 'study');
    setReminder(item.reminder_enabled);
    setShowAddModal(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Please enter an event title.');
      return;
    }

    try {
      if (editingSchedule) {
        const res = await api.updateSchedule(editingSchedule.id, {
          title: title.trim(),
          description: description.trim(),
          date,
          start_time: startTime,
          end_time: endTime,
          category,
          reminder_enabled: reminder,
        });

        if (res.success) {
          setSchedules(schedules.map((s) => (s.id === editingSchedule.id ? res.schedule : s)));
          setShowAddModal(false);
          setEditingSchedule(null);
          showToast('Event updated in timetable 📅');
        }
      } else {
        const res = await api.createSchedule({
          title: title.trim(),
          description: description.trim(),
          date,
          start_time: startTime,
          end_time: endTime,
          category,
          reminder_enabled: reminder,
        });

        if (res.success) {
          setSchedules([...schedules, res.schedule]);
          setShowAddModal(false);
          setTitle('');
          setDescription('');
          showToast('Event scheduled to your timetable 📅');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save event.');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const res = await api.deleteSchedule(id);
      if (res.success) {
        setSchedules(schedules.filter((s) => s.id !== id));
        setDeleteConfirmScheduleId(null);
        showToast('Event removed from schedule.');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete event.');
    }
  };

  // Day filter
  const dayEvents = schedules.filter((s) => s.date === selectedDate);

  const handlePrevDay = () => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() - 1);
    setSelectedDate(cur.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + 1);
    setSelectedDate(cur.toISOString().split('T')[0]);
  };

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
            <span>Planner & Timetable</span>
            <span className="text-sm font-sans font-normal text-slate-400">({schedules.length} events)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organize lectures, focus sessions, personal habits, and daily priorities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-2xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Date Navigation & View Mode Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevDay}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
          />

          <button
            type="button"
            onClick={handleNextDay}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-xs font-serif font-bold text-slate-700 dark:text-slate-200 ml-2">
            {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-50 dark:bg-slate-800 text-amber-700 dark:text-amber-400 hover:bg-amber-100 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Schedule Timetable Display */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-6 flex items-center justify-between">
          <span>Schedule for {selectedDate}</span>
          <span className="text-xs font-normal text-slate-400">
            {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'} planned
          </span>
        </h2>

        {dayEvents.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Clock className="w-10 h-10 mx-auto text-amber-300 dark:text-slate-700 mb-2" />
            <p className="text-xs font-serif">No events scheduled for this day.</p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="mt-3 text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline cursor-pointer"
            >
              Add a lecture, meeting, or study block 🌷
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {dayEvents
              .sort((a, b) => a.start_time.localeCompare(b.start_time))
              .map((item) => {
                const conf = categoryThemes[item.category] || categoryThemes.personal;
                const Icon = conf.icon;
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border ${conf.border} ${conf.bg} flex flex-col sm:flex-row sm:items-center justify-between gap-3 group transition-all`}
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="text-center w-16 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-2xs shrink-0">
                        <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-100">
                          {item.start_time}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-mono">
                          {item.end_time}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 font-serif">
                            {item.title}
                          </h3>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${conf.text} bg-white/70 dark:bg-slate-800/80`}>
                            {conf.label}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 self-end sm:self-center">
                      {item.reminder_enabled && (
                        <span className="p-1.5 rounded-lg text-slate-400" title="Reminder set">
                          <Bell className="w-3.5 h-3.5 text-amber-500" />
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(item)}
                        className="opacity-70 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all cursor-pointer"
                        title="Edit event"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmScheduleId(item.id)}
                        className="opacity-70 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                        title="Remove event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Add / Edit Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setEditingSchedule(null);
              }}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif mb-1">
              {editingSchedule ? 'Edit Timetable Event ✏️' : 'Add Timetable Event 📅'}
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              {editingSchedule
                ? 'Update timing, category, or commitments for this event.'
                : 'Schedule your study sessions, routines, and commitments.'}
            </p>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Machine Learning Seminar, Gym Workout"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                >
                  <option value="study">Study & Academic</option>
                  <option value="work">Work & Project</option>
                  <option value="personal">Personal & Rest</option>
                  <option value="important">Important Priority</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Description / Location / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Room 304, bring slide deck"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="reminder_cb"
                  checked={reminder}
                  onChange={(e) => setReminder(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="reminder_cb" className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                  Enable peaceful reminder notification
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSchedule(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm cursor-pointer"
                >
                  {editingSchedule ? 'Update Event ✨' : 'Add to Schedule ✨'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmScheduleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Remove Event?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to remove this timetable event?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmScheduleId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSchedule(deleteConfirmScheduleId)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow cursor-pointer"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

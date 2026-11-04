import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { JournalEntry, Task, Schedule, ImportantNote } from '../types';
import {
  Sparkles,
  BookOpen,
  Calendar,
  CheckCircle2,
  Circle,
  Plus,
  ArrowRight,
  Flame,
  Pin,
  Clock,
  Heart,
  StickyNote,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DailyAffirmationWidget } from './DailyAffirmationWidget';

interface DashboardProps {
  onNavigate: (tab: string, itemId?: string) => void;
  onOpenQuickJournal: () => void;
  onOpenJournalWithPrompt?: (prompt: string, title?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onOpenQuickJournal,
  onOpenJournalWithPrompt,
}) => {
  const { user } = useAuth();
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [notes, setNotes] = useState<ImportantNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyQuoteIndex, setDailyQuoteIndex] = useState(0);

  const comfortingQuotes = [
    { quote: "Every page you write is a gift of self-understanding to your future self.", author: "BORAH Companion" },
    { quote: "Quiet progress is still real progress. Breathe and take the next gentle step.", author: "Mindful Reminder" },
    { quote: "Cherish the simple, peaceful moments; they form the true foundation of your memories.", author: "Daily Thought" },
  ];

  const loadDashboardData = async () => {
    try {
      const [jRes, tRes, sRes, nRes] = await Promise.all([
        api.getJournals().catch(() => ({ success: false, entries: [] })),
        api.getTasks().catch(() => ({ success: false, tasks: [] })),
        api.getSchedules().catch(() => ({ success: false, schedules: [] })),
        api.getNotes().catch(() => ({ success: false, notes: [] })),
      ]);

      if (jRes.success) setJournals(jRes.entries);
      if (tRes.success) setTasks(tRes.tasks);
      if (sRes.success) setSchedules(sRes.schedules);
      if (nRes.success) setNotes(nRes.notes);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleToggleTask = async (task: Task) => {
    const updatedStatus = !task.completed;
    try {
      await api.updateTask(task.id, { completed: updatedStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: updatedStatus } : t))
      );

      // Check if all tasks are completed for celebratory confetti
      const remaining = tasks.filter((t) => (t.id === task.id ? !updatedStatus : !t.completed));
      if (updatedStatus && remaining.length === 0) {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.7 },
          colors: ['#F59E0B', '#10B981', '#EC4899', '#6366F1'],
        });
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter((t) => !t.due_date || t.due_date === todayStr);
  const completedToday = todayTasks.filter((t) => t.completed).length;
  const progressPercent = todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 100;
  const recentJournal = journals[0];
  const pinnedNote = notes.find((n) => n.is_pinned) || notes[0];

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Greeting & Atmosphere Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-rose-50/50 to-orange-50/30 dark:from-slate-800/80 dark:to-slate-900 border border-amber-200/60 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800/80 dark:text-amber-400/80 uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{currentDateFormatted}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-serif">
              {getGreeting()}, {user?.name || 'Friend'} 🌷
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-xl italic">
              "{comfortingQuotes[dailyQuoteIndex].quote}"
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenQuickJournal}
              className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Write in Diary</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('planner')}
              className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>View Planner</span>
            </button>
          </div>
        </div>

      </div>

      {/* Daily Affirmation Widget */}
      <DailyAffirmationWidget
        onReflectInJournal={(prompt, title) => {
          if (onOpenJournalWithPrompt) {
            onOpenJournalWithPrompt(prompt, title);
          } else {
            onNavigate('journal');
          }
        }}
      />

      {/* Grid of Companion Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Today's Tasks & Progress */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Today's Progress</h2>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {progressPercent}%
              </span>
            </div>

            {/* Circular Progress Bar Line */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-4">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Today's Tasks List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {todayTasks.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  All quiet! No tasks scheduled for today.
                </p>
              ) : (
                todayTasks.slice(0, 4).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleToggleTask(t)}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors group"
                  >
                    {t.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 group-hover:text-emerald-400 shrink-0" />
                    )}
                    <span
                      className={`text-xs text-slate-700 dark:text-slate-300 truncate flex-1 ${
                        t.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                      }`}
                    >
                      {t.title}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span className="tabular-nums">
              {completedToday} of {todayTasks.length} tasks completed
            </span>
            <button
              type="button"
              onClick={() => onNavigate('tasks')}
              className="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Tasks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 2: Recent Journal Page */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between notebook-ruled-lines">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Latest Diary Page</h2>
              </div>
              {recentJournal && (
                <span className="text-[11px] text-slate-400">
                  {new Date(recentJournal.entry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>

            {recentJournal ? (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-serif truncate">
                  {recentJournal.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-serif leading-relaxed line-clamp-4">
                  "{recentJournal.content}"
                </p>
                {recentJournal.stickers && recentJournal.stickers.length > 0 && (
                  <div className="flex gap-1 pt-1">
                    {recentJournal.stickers.slice(0, 3).map((st) => (
                      <span key={st.id} className="text-base">
                        {st.sticker_type}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                <p>Your story starts here.</p>
                <p className="mt-1">Write your very first page 🌷</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {journals.length} {journals.length === 1 ? 'entry' : 'entries'} in journal
            </span>
            <button
              type="button"
              onClick={() => onNavigate('journal', recentJournal?.id)}
              className="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Open Journal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 3: Noticeboard & Pinned Notes */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <StickyNote className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Noticeboard & Notes</h2>
              </div>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>

            <div className="space-y-3">
              {pinnedNote ? (
                <div
                  className="rounded-2xl p-4 shadow-xs border transition-all"
                  style={{
                    backgroundColor: pinnedNote.color || '#FEF3C7',
                    borderColor: 'rgba(0,0,0,0.06)',
                  }}
                >
                  <div className="flex items-center justify-between text-xs text-amber-900/80 mb-1">
                    <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <Pin className="w-3 h-3" /> Pinned Note
                    </span>
                    <span className="text-[10px] capitalize bg-white/60 px-1.5 py-0.5 rounded">
                      {pinnedNote.priority}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-amber-950 line-clamp-1">
                    {pinnedNote.title}
                  </h3>
                  <p className="text-[11px] text-amber-900/80 line-clamp-2 mt-1">
                    {pinnedNote.content}
                  </p>
                </div>
              ) : (
                <div className="py-7 text-center rounded-2xl bg-amber-50/50 dark:bg-slate-800/40 border border-amber-200/40">
                  <StickyNote className="w-7 h-7 mx-auto text-amber-400 mb-1" />
                  <p className="text-xs text-slate-500 font-serif">No notes pinned yet.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {notes.length} {notes.length === 1 ? 'note' : 'notes'} saved
            </span>
            <button
              type="button"
              onClick={() => onNavigate('notes')}
              className="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Notes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 4: Upcoming Events / Timetable */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Upcoming Schedule</h2>
              </div>
            </div>

            <div className="space-y-2.5 max-h-48 overflow-y-auto">
              {schedules.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No scheduled events ahead.</p>
              ) : (
                schedules.slice(0, 3).map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start gap-3"
                  >
                    <div className="text-center shrink-0 w-12 py-1 px-1.5 rounded-xl bg-white dark:bg-slate-700 shadow-xs">
                      <div className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {s.start_time}
                      </div>
                    </div>
                    <div className="truncate flex-1">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {s.title}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{s.description || s.category}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">{schedules.length} items planned</span>
            <button
              type="button"
              onClick={() => onNavigate('planner')}
              className="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Planner</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 5: Pinned Important Note */}
        <div className="bg-[#FFFDF7] dark:bg-slate-900 rounded-3xl p-6 border border-amber-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 flex items-center justify-center">
                  <Pin className="w-4 h-4 fill-amber-700" />
                </div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Pinned Note</h2>
              </div>
              <span className="text-[10px] font-semibold uppercase text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
                Priority
              </span>
            </div>

            {pinnedNote ? (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 font-serif">
                  {pinnedNote.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-serif whitespace-pre-line line-clamp-4 leading-relaxed">
                  {pinnedNote.content}
                </p>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                <p>Pin important notes, ideas, or study checklists here.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-amber-900/10 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">{notes.length} total notes</span>
            <button
              type="button"
              onClick={() => onNavigate('notes')}
              className="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Open Notes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 6: AI Companion Insight & Reflection */}
        <div className="bg-gradient-to-br from-indigo-50/60 to-purple-50/40 dark:from-slate-900 dark:to-indigo-950/20 rounded-3xl p-6 border border-indigo-100 dark:border-indigo-900/40 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Gentle Reflection</h2>
              </div>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Gemini AI</span>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 font-serif leading-relaxed">
              <p className="italic">
                "What is one small accomplishment you are genuinely proud of today?"
              </p>
              <p className="text-[11px] text-slate-500 font-sans mt-2">
                BORAH can analyze your journal tone and generate weekly reflections with comforting clarity.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-indigo-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Personal Insights</span>
            <button
              type="button"
              onClick={() => onNavigate('insights')}
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Insights</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

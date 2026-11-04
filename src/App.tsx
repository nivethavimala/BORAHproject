import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './api';
import { taskNotificationManager } from './utils/taskNotificationManager';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { JournalView } from './components/JournalView';
import { MemoriesView } from './components/MemoriesView';
import { PlannerView } from './components/PlannerView';
import { TasksView } from './components/TasksView';
import { MoodView } from './components/MoodView';
import { NotesView } from './components/NotesView';
import { InsightsView } from './components/InsightsView';
import { SettingsView } from './components/SettingsView';
import { AuthModal } from './components/AuthModal';
import { OnboardingModal } from './components/OnboardingModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { PurpleUniverseModal } from './components/PurpleUniverseModal';
import { SevenDayChallengeModal } from './components/SevenDayChallengeModal';
import { PurpleSparkle } from './components/PurpleSparkle';
import { CuteAiCompanion } from './components/CuteAiCompanion';
import { BellRing } from 'lucide-react';

function MainAppShell() {
  const { user, settings, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedJournalId, setSelectedJournalId] = useState<string | null>(null);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [journalPrompt, setJournalPrompt] = useState<string | null>(null);
  const [journalTitle, setJournalTitle] = useState<string | null>(null);
  const [globalReminder, setGlobalReminder] = useState<any>(null);


  // Modals state
  const [searchOpen, setSearchOpen] = useState(false);
  const [purpleUniverseOpen, setPurpleUniverseOpen] = useState(false);
  const [sevenDayChallengeOpen, setSevenDayChallengeOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Open onboarding if user is logged in but hasn't completed it
  useEffect(() => {
    if (user && settings && settings.onboarding_completed === false) {
      setOnboardingOpen(true);
    }
  }, [user, settings]);

  // Global keyboard shortcuts (Ctrl+K / Cmd+K for search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen to custom Easter egg events
  useEffect(() => {
    const handleSevenTaps = () => {
      setPurpleUniverseOpen(true);
    };
    const handleSecretCode = () => {
      setPurpleUniverseOpen(true);
    };

    window.addEventListener('borah:seven-taps', handleSevenTaps);
    window.addEventListener('borah:secret-code', handleSecretCode);
    return () => {
      window.removeEventListener('borah:seven-taps', handleSevenTaps);
      window.removeEventListener('borah:secret-code', handleSecretCode);
    };
  }, []);

  // Global background task reminder loop
  useEffect(() => {
    if (user) {
      const fetchTasks = async () => {
        try {
          const res = await api.getTasks();
          if (res.success && res.tasks) {
            taskNotificationManager.checkTasks(res.tasks);
            return res.tasks;
          }
        } catch {
          // Ignore
        }
        return [];
      };

      fetchTasks();
      taskNotificationManager.startReminderLoop(fetchTasks);

      const unsubscribe = taskNotificationManager.subscribe((task) => {
        setGlobalReminder(task);
      });

      return () => {
        unsubscribe();
        taskNotificationManager.stopReminderLoop();
      };
    }
  }, [user]);


  const handleNavigate = (tab: string, itemId?: string) => {
    setActiveTab(tab);
    if (tab === 'journal' && itemId) {
      setSelectedJournalId(itemId);
    } else if (tab === 'memories' && itemId) {
      setSelectedMemoryId(itemId);
    }
  };

  const handleQuickNewEntry = () => {
    setJournalPrompt(null);
    setJournalTitle(null);
    setActiveTab('journal');
    setSelectedJournalId(null);
  };

  const handleOpenJournalWithPrompt = (prompt: string, title?: string) => {
    setJournalPrompt(prompt);
    setJournalTitle(title || 'Daily Affirmation Reflection');
    setSelectedJournalId(null);
    setActiveTab('journal');
  };

  const handleStartDayJournal = (prompt: string, day: number) => {
    handleOpenJournalWithPrompt(prompt, `7 Days of Me: Day ${day}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-serif text-slate-500">Opening your private sanctuary... 🌸</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors flex flex-col font-sans">
      {/* Auth Modal if unauthenticated */}
      <AuthModal isOpen={!user} />

      {/* Onboarding Modal if needed */}
      {user && (
        <OnboardingModal
          isOpen={onboardingOpen}
          onComplete={() => setOnboardingOpen(false)}
        />
      )}

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* Purple Universe Secret Modal (ARMY_EASTER_EGG_LAYER) */}
      <PurpleUniverseModal
        isOpen={purpleUniverseOpen}
        onClose={() => setPurpleUniverseOpen(false)}
      />

      {/* 7 Days of Me Challenge Modal */}
      <SevenDayChallengeModal
        isOpen={sevenDayChallengeOpen}
        onClose={() => setSevenDayChallengeOpen(false)}
        onStartDayJournal={handleStartDayJournal}
      />

      {/* Global PurpleSparkle Celebration Overlay (Triggered by EasterEggManager) */}
      <PurpleSparkle />

      {/* Global Floating Task Reminder Alert */}
      {globalReminder && (
        <div className="fixed top-5 right-5 z-50 p-4 max-w-sm rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-500 shadow-2xl animate-in slide-in-from-top-3 flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500 text-white animate-bounce shrink-0 shadow-sm">
            <BellRing className="w-4 h-4" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Task Reminder
              </span>
              <button
                type="button"
                onClick={() => setGlobalReminder(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 font-serif line-clamp-1">
              {globalReminder.title}
            </h4>
            <p className="text-[11px] text-slate-500 line-clamp-2">
              Scheduled for today. Take a gentle moment to accomplish it!
            </p>
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('tasks');
                  setGlobalReminder(null);
                }}
                className="px-2.5 py-1 text-[11px] font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg cursor-pointer"
              >
                View Tasks
              </button>
              <button
                type="button"
                onClick={() => setGlobalReminder(null)}
                className="px-2.5 py-1 text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header & Desktop Sidebar Navigation */}
      <Navigation

        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSearch={() => setSearchOpen(true)}
        onQuickNewEntry={handleQuickNewEntry}
        onOpenPurpleUniverse={() => setPurpleUniverseOpen(true)}
      />

      {/* Main Content Area with Desktop Sidebar margin */}
      <main className="flex-1 lg:pl-64 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-12">
        {activeTab === 'dashboard' && (
          <Dashboard
            onNavigate={handleNavigate}
            onOpenQuickJournal={handleQuickNewEntry}
            onOpenJournalWithPrompt={handleOpenJournalWithPrompt}
          />
        )}

        {activeTab === 'journal' && (
          <JournalView
            initialEntryId={selectedJournalId}
            onClearInitialEntryId={() => setSelectedJournalId(null)}
            initialPrompt={journalPrompt}
            initialTitle={journalTitle}
            onClearPrompt={() => {
              setJournalPrompt(null);
              setJournalTitle(null);
            }}
          />
        )}

        {activeTab === 'memories' && (
          <MemoriesView initialMemoryId={selectedMemoryId} />
        )}

        {activeTab === 'planner' && <PlannerView />}

        {activeTab === 'tasks' && <TasksView />}

        {activeTab === 'mood' && <MoodView />}

        {activeTab === 'notes' && <NotesView />}

        {activeTab === 'insights' && (
          <InsightsView
            onOpenSevenDayChallenge={() => setSevenDayChallengeOpen(true)}
            onNavigateToJournal={() => setActiveTab('journal')}
          />
        )}

        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Global AI Companion Bora following user across the entire app */}
      <CuteAiCompanion activeTab={activeTab} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppShell />
    </AuthProvider>
  );
}

import { api } from './api.js';
import { store, subscribeAuth, refreshUser } from './state.js';
import { escapeHtml, renderIcons } from './utils/dom.js';
import { taskNotificationManager } from './utils/taskNotifications.js';
import { initGlobalPurpleSparkle } from './components/purpleSparkle.js';
import { createPurpleUniverseModal } from './components/purpleUniverseModal.js';
import { createSevenDayModal } from './components/sevenDayModal.js';
import { renderAuthModal } from './components/authModal.js';
import { renderOnboardingModal } from './components/onboardingModal.js';
import { createSearchModal } from './components/searchModal.js';
import { renderNavigation } from './components/navigation.js';
import { createAiCompanion } from './components/aiCompanion.js';
import { renderDashboard } from './components/dashboard.js';
import { renderActivitiesView } from './components/activities.js';
import { renderProjectsView } from './components/projects.js';
import { renderMeetingsView } from './components/meetings.js';
import { renderReportsView } from './components/reports.js';
import { renderExportsCenterView } from './components/exportsCenter.js';
import { renderNotificationsView } from './components/notifications.js';
import { renderOrganizationView } from './components/organization.js';
import { renderJournalView } from './components/journal.js';
import { renderMemoriesView } from './components/memories.js';
import { renderPlannerView } from './components/planner.js';
import { renderTasksView } from './components/tasks.js';
import { renderMoodView } from './components/mood.js';
import { renderNotesView } from './components/notes.js';
import { renderInsightsView } from './components/insights.js';
import { renderSettingsView } from './components/settings.js';

function bootBorahApp() {
  const root = document.getElementById('root');
  if (!root) return;

  root.innerHTML = `
    <div id="borah-loading" class="min-h-screen bg-[#FAF7F2] dark:bg-slate-900 flex items-center justify-center">
      <div class="text-center space-y-3">
        <div class="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-xs font-serif text-slate-500">Opening your private sanctuary... 🌸</p>
      </div>
    </div>
    <div id="borah-shell" class="hidden min-h-screen bg-[#FAF7F2] dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors flex flex-col font-sans">
      <div id="borah-auth-slot"></div>
      <div id="borah-onboarding-slot"></div>
      <div id="borah-search-slot"></div>
      <div id="borah-purple-universe-slot"></div>
      <div id="borah-seven-day-slot"></div>
      <div id="borah-sparkle-slot"></div>
      <div id="borah-reminder-slot"></div>
      <div id="borah-nav-slot"></div>
      <main id="borah-main-slot" class="flex-1 lg:pl-64 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-12"></main>
      <div id="borah-ai-slot"></div>
    </div>
  `;

  const loadingEl = document.getElementById('borah-loading');
  const shellEl = document.getElementById('borah-shell');
  const authSlot = document.getElementById('borah-auth-slot');
  const onboardingSlot = document.getElementById('borah-onboarding-slot');
  const searchSlot = document.getElementById('borah-search-slot');
  const purpleUniverseSlot = document.getElementById('borah-purple-universe-slot');
  const sevenDaySlot = document.getElementById('borah-seven-day-slot');
  const sparkleSlot = document.getElementById('borah-sparkle-slot');
  const reminderSlot = document.getElementById('borah-reminder-slot');
  const navSlot = document.getElementById('borah-nav-slot');
  const mainSlot = document.getElementById('borah-main-slot');
  const aiSlot = document.getElementById('borah-ai-slot');

  let activeTab = 'dashboard';
  let selectedJournalId = null;
  let selectedMemoryId = null;
  let openActivityModalNext = false;
  let unreadCount = 0;
  let journalPrompt = null;
  let journalTitle = null;
  let globalReminder = null;
  let onboardingDismissed = false;
  let currentUserId = null;
  let activeViewCleanup = null;
  let unsubscribeTaskReminder = null;

  initGlobalPurpleSparkle(sparkleSlot);

  const aiCompanion = createAiCompanion(aiSlot);

  const syncCompanionVisibility = () => {
    const show = store.settings?.show_companion !== false;
    aiSlot.classList.toggle('hidden', !show);
  };

  const refreshUnreadNotifications = async () => {
    if (!store.user) return;
    try {
      const res = await api.getNotifications();
      if (res.success) {
        unreadCount = Number(res.unread_count || 0);
        renderNav();
      }
    } catch {}
  };

  const navigateTo = (tab, itemId = null) => {
    activeTab = tab;
    openActivityModalNext = false;
    if (tab === 'journal' && itemId) {
      selectedJournalId = itemId;
    } else if (tab === 'memories' && itemId) {
      selectedMemoryId = itemId;
    }
    aiCompanion.setTab(activeTab);
    renderNav();
    renderActiveView();
  };

  const openQuickNewActivity = () => {
    openActivityModalNext = true;
    activeTab = 'activities';
    aiCompanion.setTab(activeTab);
    renderNav();
    renderActiveView();
  };

  const openQuickNewEntry = () => {
    journalPrompt = null;
    journalTitle = null;
    selectedJournalId = null;
    activeTab = 'journal';
    aiCompanion.setTab(activeTab);
    renderNav();
    renderActiveView();
  };

  const openJournalWithPrompt = (prompt, title) => {
    journalPrompt = prompt;
    journalTitle = title || 'Daily Affirmation Reflection';
    selectedJournalId = null;
    activeTab = 'journal';
    aiCompanion.setTab(activeTab);
    renderNav();
    renderActiveView();
  };

  const searchModal = createSearchModal(searchSlot, {
    onNavigate: navigateTo,
  });

  const purpleUniverseModal = createPurpleUniverseModal(purpleUniverseSlot, {
    onClose: () => {},
  });

  const sevenDayModal = createSevenDayModal(sevenDaySlot, {
    onClose: () => {},
    onStartDayJournal: (prompt, day) => {
      openJournalWithPrompt(prompt, `7 Days of Me: Day ${day}`);
    },
  });

  const renderReminderBanner = () => {
    if (!globalReminder) {
      reminderSlot.innerHTML = '';
      return;
    }
    reminderSlot.innerHTML = `
      <div class="fixed top-5 right-5 z-50 p-4 max-w-sm rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-500 shadow-2xl animate-in slide-in-from-top-3 flex items-start gap-3">
        <div class="p-2.5 rounded-2xl bg-amber-500 text-white animate-bounce shrink-0 shadow-sm">
          <i data-lucide="bell-ring" class="w-4 h-4"></i>
        </div>
        <div class="flex-1 space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Task Reminder</span>
            <button type="button" data-rem-dismiss class="text-slate-400 hover:text-slate-600 p-0.5 text-xs cursor-pointer">✕</button>
          </div>
          <h4 class="text-xs font-bold text-slate-800 dark:text-slate-100 font-serif line-clamp-1">${escapeHtml(globalReminder.title)}</h4>
          <p class="text-[11px] text-slate-500 line-clamp-2">Scheduled for today. Take a gentle moment to accomplish it!</p>
          <div class="pt-2 flex items-center gap-2">
            <button type="button" data-rem-tasks class="px-2.5 py-1 text-[11px] font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg cursor-pointer">View Tasks</button>
            <button type="button" data-rem-dismiss class="px-2.5 py-1 text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer">Dismiss</button>
          </div>
        </div>
      </div>
    `;
    renderIcons(reminderSlot);
    reminderSlot.querySelectorAll('[data-rem-dismiss]').forEach((btn) => {
      btn.addEventListener('click', () => {
        globalReminder = null;
        renderReminderBanner();
      });
    });
    reminderSlot.querySelector('[data-rem-tasks]')?.addEventListener('click', () => {
      globalReminder = null;
      renderReminderBanner();
      navigateTo('tasks');
    });
  };

  const renderNav = () => {
    renderNavigation(navSlot, {
      activeTab,
      unreadCount,
      setActiveTab: (tab) => navigateTo(tab),
      onOpenSearch: () => searchModal.open(),
      onQuickNewActivity: openQuickNewActivity,
      onOpenPurpleUniverse: () => purpleUniverseModal.open(),
    });
  };

  const renderActiveView = () => {
    if (activeViewCleanup) {
      try {
        activeViewCleanup();
      } catch {
        // Ignore cleanup errors
      }
      activeViewCleanup = null;
    }
    mainSlot.innerHTML = '';

    if (!store.user) return;

    let maybeCleanup = null;
    switch (activeTab) {
      case 'dashboard':
        maybeCleanup = renderDashboard(mainSlot, {
          onNavigate: navigateTo,
          onOpenQuickActivity: openQuickNewActivity,
          onOpenJournalWithPrompt: openJournalWithPrompt,
        });
        break;
      case 'activities': {
        const shouldOpen = openActivityModalNext;
        openActivityModalNext = false;
        maybeCleanup = renderActivitiesView(mainSlot, { openNewModal: shouldOpen });
        break;
      }
      case 'tasks':
        maybeCleanup = renderTasksView(mainSlot);
        break;
      case 'planner':
        maybeCleanup = renderPlannerView(mainSlot);
        break;
      case 'projects':
        maybeCleanup = renderProjectsView(mainSlot);
        break;
      case 'meetings':
        maybeCleanup = renderMeetingsView(mainSlot);
        break;
      case 'reports':
        maybeCleanup = renderReportsView(mainSlot);
        break;
      case 'exports':
        maybeCleanup = renderExportsCenterView(mainSlot);
        break;
      case 'notifications':
        maybeCleanup = renderNotificationsView(mainSlot, {
          onNavigate: navigateTo,
          onUnreadChange: (cnt) => {
            unreadCount = Number(cnt || 0);
            renderNav();
          },
        });
        break;
      case 'organization':
        maybeCleanup = renderOrganizationView(mainSlot);
        break;
      case 'journal':
        maybeCleanup = renderJournalView(mainSlot, {
          initialEntryId: selectedJournalId,
          onClearInitialEntryId: () => {
            selectedJournalId = null;
          },
          initialPrompt: journalPrompt,
          initialTitle: journalTitle,
          onClearPrompt: () => {
            journalPrompt = null;
            journalTitle = null;
          },
        });
        break;
      case 'memories':
        maybeCleanup = renderMemoriesView(mainSlot, {
          initialMemoryId: selectedMemoryId,
        });
        break;
      case 'mood':
        maybeCleanup = renderMoodView(mainSlot);
        break;
      case 'notes':
        maybeCleanup = renderNotesView(mainSlot);
        break;
      case 'insights':
        maybeCleanup = renderInsightsView(mainSlot, {
          onOpenSevenDayChallenge: () => sevenDayModal.open(),
          onNavigateToJournal: () => navigateTo('journal'),
        });
        break;
      case 'settings':
        maybeCleanup = renderSettingsView(mainSlot);
        break;
      default:
        maybeCleanup = renderDashboard(mainSlot, {
          onNavigate: navigateTo,
          onOpenQuickActivity: openQuickNewActivity,
          onOpenJournalWithPrompt: openJournalWithPrompt,
        });
    }
    if (typeof maybeCleanup === 'function') {
      activeViewCleanup = maybeCleanup;
    }
  };

  const startReminderLoopForUser = () => {
    if (unsubscribeTaskReminder) return;
    const fetchTasks = async () => {
      try {
        const res = await api.getTasks();
        if (res.success && res.tasks) {
          taskNotificationManager.checkTasks(res.tasks);
          return res.tasks;
        }
      } catch {
        // Ignore polling errors
      }
      return [];
    };
    fetchTasks();
    taskNotificationManager.startReminderLoop(fetchTasks);
    unsubscribeTaskReminder = taskNotificationManager.subscribe((task) => {
      globalReminder = task;
      renderReminderBanner();
    });
  };

  const stopReminderLoopForUser = () => {
    if (unsubscribeTaskReminder) {
      unsubscribeTaskReminder();
      unsubscribeTaskReminder = null;
    }
    taskNotificationManager.stopReminderLoop();
  };

  // Global keyboard shortcuts (Ctrl+K / Cmd+K for search)
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchModal.toggle();
    }
  });

  // Easter egg secret events
  window.addEventListener('borah:seven-taps', () => purpleUniverseModal.open());
  window.addEventListener('borah:secret-code', () => purpleUniverseModal.open());

  subscribeAuth((state) => {
    if (state.isLoading) {
      loadingEl.classList.remove('hidden');
      shellEl.classList.add('hidden');
      return;
    }

    loadingEl.classList.add('hidden');
    shellEl.classList.remove('hidden');

    renderAuthModal(authSlot, !state.user);

    if (state.user) {
      const userChanged = currentUserId !== state.user.id;
      currentUserId = state.user.id;
      syncCompanionVisibility();
      if (userChanged) {
        onboardingDismissed = false;
        startReminderLoopForUser();
        refreshUnreadNotifications();
        renderNav();
        renderActiveView();
      } else {
        renderNav();
      }

      const needsOnboarding =
        !onboardingDismissed && state.settings && state.settings.onboarding_completed === false;
      renderOnboardingModal(onboardingSlot, needsOnboarding, () => {
        onboardingDismissed = true;
      });
    } else {
      currentUserId = null;
      unreadCount = 0;
      stopReminderLoopForUser();
      if (activeViewCleanup) {
        try {
          activeViewCleanup();
        } catch {}
        activeViewCleanup = null;
      }
      mainSlot.innerHTML = '';
      renderOnboardingModal(onboardingSlot, false);
      renderNav();
    }
  });

  refreshUser();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootBorahApp);
} else {
  bootBorahApp();
}

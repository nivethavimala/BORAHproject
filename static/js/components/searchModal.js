import { api } from '../api.js';
import { EasterEggManager } from '../utils/easterEggs.js';
import { renderContainedSparkleHtml } from './purpleSparkle.js';
import { escapeHtml, renderIcons } from '../utils/dom.js';

export function createSearchModal(container, { onNavigate }) {
  let isOpen = false;
  let query = '';
  let debounceTimer = null;

  const close = () => {
    isOpen = false;
    query = '';
    if (debounceTimer) clearTimeout(debounceTimer);
    container.innerHTML = '';
  };

  const renderResults = (results, searchEgg, loading) => {
    const body = container.querySelector('[data-search-body]');
    if (!body) return;

    const totalResults = results
      ? (results.activities?.length || 0) +
        (results.tasks?.length || 0) +
        (results.schedules?.length || 0) +
        (results.projects?.length || 0) +
        (results.meetings?.length || 0) +
        (results.journals?.length || 0) +
        (results.memories?.length || 0) +
        (results.notes?.length || 0)
      : 0;

    let html = '';
    if (searchEgg && searchEgg.isEgg) {
      html += `
        <div class="relative overflow-hidden p-4 rounded-2xl bg-purple-50/80 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/80 text-xs animate-in fade-in">
          ${renderContainedSparkleHtml()}
          <div class="relative z-10">
            <div class="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-bold mb-1">
              <span>💜</span><span>${escapeHtml(searchEgg.title)}</span>
            </div>
            <p class="text-purple-900/90 dark:text-purple-200 leading-relaxed font-serif">"${escapeHtml(searchEgg.message)}"</p>
            ${searchEgg.quote ? `<p class="text-[11px] text-purple-600 dark:text-purple-400 italic mt-1 font-serif">"${escapeHtml(searchEgg.quote)}"</p>` : ''}
          </div>
        </div>
      `;
    }

    const renderGroup = (title, icon, tab, items, subFn) => {
      if (!items?.length) return '';
      return `<div>
        <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
          <i data-lucide="${icon}" class="w-3.5 h-3.5"></i> ${escapeHtml(title)} (${items.length})
        </div>
        <div class="space-y-1">${items
          .map(
            (item) => `
          <button type="button" data-nav-tab="${tab}" data-nav-id="${escapeHtml(item.id)}" class="w-full p-2.5 rounded-xl hover:bg-emerald-50/60 dark:hover:bg-slate-800/80 text-left transition-colors flex items-center justify-between group cursor-pointer">
            <div>
              <div class="text-xs font-semibold text-slate-800 dark:text-slate-200 ${item.completed ? 'line-through opacity-60' : ''}">${escapeHtml(item.title)}</div>
              <div class="text-[11px] text-slate-500 truncate max-w-md">${escapeHtml(subFn(item))}</div>
            </div>
            <i data-lucide="arrow-right" class="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0"></i>
          </button>`
          )
          .join('')}</div></div>`;
    };

    if (loading) {
      html += `
        <div class="py-12 text-center text-xs text-slate-400">
          <span class="inline-block w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2"></span>
          <p>Searching your BORAH workspace...</p>
        </div>`;
    } else if (query.trim() && totalResults === 0 && !(searchEgg && searchEgg.isEgg)) {
      html += `
        <div class="py-12 text-center text-slate-400 text-xs">
          <p class="text-sm text-slate-500 dark:text-slate-400">No results found for "${escapeHtml(query)}"</p>
          <p class="mt-1">Try another activity title, category, task, or keyword.</p>
        </div>`;
    } else if (!query.trim()) {
      html += `
        <div class="py-10 text-center text-xs text-slate-400">
          <p>Search across your professional activities, tasks, schedules, projects, meetings, and personal space.</p>
          <div class="flex flex-wrap justify-center gap-3 mt-3 text-[11px] text-slate-400">
            <span>Activities</span><span>•</span><span>Tasks</span><span>•</span><span>Planner</span><span>•</span><span>Projects</span><span>•</span><span>Meetings</span><span>•</span><span>Journals &amp; Notes</span>
          </div>
        </div>`;
    } else if (results && totalResults > 0) {
      html += renderGroup('Daily Activities', 'clock', 'activities', results.activities, (a) => `${a.activity_date || ''} · ${a.start_time || ''}-${a.end_time || ''} · ${a.category || ''}`);
      html += renderGroup('Tasks', 'check-square', 'tasks', results.tasks, (t) => `${t.category || ''} · Priority: ${t.priority || ''} · Status: ${t.status || ''}`);
      html += renderGroup('Planner & Timetable', 'calendar', 'planner', results.schedules, (s) => `${s.date || ''} · ${s.start_time || ''}-${s.end_time || ''} · ${s.event_type || ''}`);
      html += renderGroup('Projects', 'folder-kanban', 'projects', results.projects, (p) => `${p.code ? p.code + ' · ' : ''}${p.category || ''} · ${p.status || ''}`);
      html += renderGroup('Meetings', 'users', 'meetings', results.meetings, (m) => `${m.meeting_date || ''} · ${m.participants || m.agenda || ''}`);
      html += renderGroup('Journal Entries', 'book-open', 'journal', results.journals, (j) => (j.content || '').slice(0, 90));
      html += renderGroup('Memories', 'camera', 'memories', results.memories, (m) => m.description || m.location || '');
      html += renderGroup('Personal Notes', 'sticky-note', 'notes', results.notes, (n) => (n.content || '').slice(0, 80));
    }

    body.innerHTML = html;
    renderIcons(body);
    body.querySelectorAll('[data-nav-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-nav-tab');
        const id = btn.getAttribute('data-nav-id');
        close();
        if (onNavigate) onNavigate(tab, id);
      });
    });
  };

  const open = () => {
    isOpen = true;
    query = '';
    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <div class="flex items-center px-5 py-4 border-b border-slate-100 dark:border-slate-800 gap-3">
            <i data-lucide="search" class="w-5 h-5 text-emerald-600 shrink-0"></i>
            <input type="text" data-search-input placeholder="Search activities, tasks, schedules, projects, meetings, notes..."
              class="w-full text-base bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none" />
            <button type="button" data-search-clear class="hidden p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
            <button type="button" data-search-close class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer">
              ESC
            </button>
          </div>
          <div data-search-body class="max-h-[60vh] overflow-y-auto p-4 space-y-4"></div>
        </div>
      </div>
    `;
    renderIcons(container);
    renderResults(null, null, false);

    const inputEl = container.querySelector('[data-search-input]');
    const clearBtn = container.querySelector('[data-search-clear]');
    inputEl?.focus();

    const triggerSearch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (!query.trim()) {
        clearBtn?.classList.add('hidden');
        renderResults(null, null, false);
        return;
      }
      clearBtn?.classList.remove('hidden');
      const egg = EasterEggManager.checkSearchQuery(query);
      renderResults(null, egg, true);
      debounceTimer = setTimeout(async () => {
        try {
          const res = await api.search(query);
          renderResults(res.success ? res.results : null, egg, false);
        } catch {
          renderResults(null, egg, false);
        }
      }, 200);
    };

    inputEl?.addEventListener('input', (e) => {
      query = e.target.value;
      triggerSearch();
    });
    clearBtn?.addEventListener('click', () => {
      query = '';
      if (inputEl) inputEl.value = '';
      inputEl?.focus();
      triggerSearch();
    });
    container.querySelector('[data-search-close]')?.addEventListener('click', close);
  };

  return {
    open,
    close,
    toggle: () => (isOpen ? close() : open()),
    isOpen: () => isOpen,
  };
}

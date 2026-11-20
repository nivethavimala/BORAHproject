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
      ? (results.journals?.length || 0) +
        (results.memories?.length || 0) +
        (results.tasks?.length || 0) +
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

    if (loading) {
      html += `
        <div class="py-12 text-center text-xs text-slate-400">
          <span class="inline-block w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-2"></span>
          <p>Searching your private sanctuary...</p>
        </div>`;
    } else if (query.trim() && totalResults === 0 && !(searchEgg && searchEgg.isEgg)) {
      html += `
        <div class="py-12 text-center text-slate-400 text-xs">
          <p class="text-sm text-slate-500 dark:text-slate-400">No results found for "${escapeHtml(query)}"</p>
          <p class="mt-1">Try another keyword or search term.</p>
        </div>`;
    } else if (!query.trim()) {
      html += `
        <div class="py-10 text-center text-xs text-slate-400">
          <p>Type to search across all your thoughts, plans, and memories.</p>
          <div class="flex justify-center gap-4 mt-3 text-[11px] text-slate-400">
            <span>📖 Journals</span><span>📸 Memories</span><span>✅ Tasks</span><span>📝 Notes</span>
          </div>
        </div>`;
    } else if (results && totalResults > 0) {
      if (results.journals?.length) {
        html += `<div>
          <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
            <i data-lucide="book-open" class="w-3.5 h-3.5"></i> Journal Entries (${results.journals.length})
          </div>
          <div class="space-y-1">${results.journals
            .map(
              (j) => `
            <button type="button" data-nav-tab="journal" data-nav-id="${escapeHtml(j.id)}" class="w-full p-2.5 rounded-xl hover:bg-amber-50/60 dark:hover:bg-slate-800/80 text-left transition-colors flex items-center justify-between group cursor-pointer">
              <div>
                <div class="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-700">${escapeHtml(j.title)}</div>
                <div class="text-[11px] text-slate-500 truncate max-w-md">${escapeHtml((j.content || '').slice(0, 90))}...</div>
              </div>
              <i data-lucide="arrow-right" class="w-4 h-4 text-slate-400 group-hover:text-amber-600 shrink-0"></i>
            </button>`
            )
            .join('')}</div></div>`;
      }
      if (results.memories?.length) {
        html += `<div>
          <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
            <i data-lucide="camera" class="w-3.5 h-3.5"></i> Memories (${results.memories.length})
          </div>
          <div class="space-y-1">${results.memories
            .map(
              (m) => `
            <button type="button" data-nav-tab="memories" data-nav-id="${escapeHtml(m.id)}" class="w-full p-2.5 rounded-xl hover:bg-amber-50/60 dark:hover:bg-slate-800/80 text-left transition-colors flex items-center justify-between group cursor-pointer">
              <div>
                <div class="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-700">${escapeHtml(m.title)}</div>
                <div class="text-[11px] text-slate-500 truncate max-w-md">${escapeHtml(m.description || m.location || '')}</div>
              </div>
              <i data-lucide="arrow-right" class="w-4 h-4 text-slate-400 group-hover:text-amber-600 shrink-0"></i>
            </button>`
            )
            .join('')}</div></div>`;
      }
      if (results.tasks?.length) {
        html += `<div>
          <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
            <i data-lucide="check-square" class="w-3.5 h-3.5"></i> Tasks (${results.tasks.length})
          </div>
          <div class="space-y-1">${results.tasks
            .map(
              (t) => `
            <button type="button" data-nav-tab="tasks" data-nav-id="${escapeHtml(t.id)}" class="w-full p-2.5 rounded-xl hover:bg-amber-50/60 dark:hover:bg-slate-800/80 text-left transition-colors flex items-center justify-between group cursor-pointer">
              <div>
                <div class="text-xs font-semibold text-slate-800 dark:text-slate-200 ${t.completed ? 'line-through opacity-60' : ''}">${escapeHtml(t.title)}</div>
                <div class="text-[11px] text-slate-500">${escapeHtml(t.category)} · Priority: ${escapeHtml(t.priority)}</div>
              </div>
              <i data-lucide="arrow-right" class="w-4 h-4 text-slate-400 group-hover:text-amber-600 shrink-0"></i>
            </button>`
            )
            .join('')}</div></div>`;
      }
      if (results.notes?.length) {
        html += `<div>
          <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
            <i data-lucide="sticky-note" class="w-3.5 h-3.5"></i> Notes (${results.notes.length})
          </div>
          <div class="space-y-1">${results.notes
            .map(
              (n) => `
            <button type="button" data-nav-tab="notes" data-nav-id="${escapeHtml(n.id)}" class="w-full p-2.5 rounded-xl hover:bg-amber-50/60 dark:hover:bg-slate-800/80 text-left transition-colors flex items-center justify-between group cursor-pointer">
              <div>
                <div class="text-xs font-semibold text-slate-800 dark:text-slate-200">${escapeHtml(n.title)}</div>
                <div class="text-[11px] text-slate-500 truncate max-w-md">${escapeHtml((n.content || '').slice(0, 80))}</div>
              </div>
              <i data-lucide="arrow-right" class="w-4 h-4 text-slate-400 group-hover:text-amber-600 shrink-0"></i>
            </button>`
            )
            .join('')}</div></div>`;
      }
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
            <i data-lucide="search" class="w-5 h-5 text-amber-500 shrink-0"></i>
            <input type="text" data-search-input placeholder="Search journal entries, memories, tasks, notes..."
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

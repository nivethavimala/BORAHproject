import { api } from '../api.js';
import { escapeHtml, renderIcons } from '../utils/dom.js';

const COLOR_PALETTES = [
  { label: 'Warm Cream', hex: '#FEF3C7' },
  { label: 'Soft Rose', hex: '#FFE4E6' },
  { label: 'Lavender Dream', hex: '#EDE9FE' },
  { label: 'Mint Sage', hex: '#D1FAE5' },
  { label: 'Sky Breeze', hex: '#E0F2FE' },
];

export function renderNotesView(container) {
  let notes = [];
  let searchQuery = '';
  let showAddModal = false;
  let editingNote = null;
  let deleteConfirmNoteId = null;
  let toastMessage = null;
  let toastTimer = null;
  let disposed = false;

  let formState = {
    title: '',
    content: '',
    priority: 'medium',
    isPinned: false,
    color: '#FEF3C7',
  };

  const showToast = (msg) => {
    toastMessage = msg;
    render();
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastMessage = null;
      render();
    }, 3000);
  };

  const openEditModal = (noteItem) => {
    editingNote = noteItem;
    formState = {
      title: noteItem.title || '',
      content: noteItem.content || '',
      priority: noteItem.priority || 'medium',
      isPinned: !!noteItem.is_pinned,
      color: noteItem.color || '#FEF3C7',
    };
    showAddModal = true;
    render();
  };

  const renderGridOnly = () => {
    const gridEl = container.querySelector('[data-notes-grid]');
    if (!gridEl) return;

    const filteredNotes = notes.filter((n) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q);
      }
      return true;
    });

    if (filteredNotes.length === 0) {
      gridEl.innerHTML = `
        <div class="col-span-full py-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
          <i data-lucide="sticky-note" class="w-10 h-10 mx-auto text-amber-300 dark:text-slate-700 mb-2"></i>
          <p class="text-xs font-serif">No notes saved yet.</p>
          <button type="button" data-notes-empty-add class="mt-3 text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline cursor-pointer">
            Pin your first note 🌷
          </button>
        </div>`;
    } else {
      gridEl.innerHTML = filteredNotes
        .map(
          (n) => `
        <div data-note-card="${escapeHtml(n.id)}" class="group relative rounded-3xl p-5 border border-black/5 dark:border-white/10 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between min-h-[180px]" style="background-color: ${escapeHtml(n.color || '#FEF3C7')}">
          <div>
            <div class="flex items-center justify-between mb-3">
              <button type="button" data-note-pin="${escapeHtml(n.id)}" class="p-1.5 rounded-full transition-colors cursor-pointer ${
                n.is_pinned ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-700'
              }" title="${n.is_pinned ? 'Unpin note' : 'Pin to top'}">
                <i data-lucide="pin" class="w-3.5 h-3.5 ${n.is_pinned ? 'fill-white' : ''}"></i>
              </button>
              <div class="flex items-center gap-1">
                <span class="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-black/10 text-slate-700">${escapeHtml(n.priority)}</span>
                <button type="button" data-note-edit="${escapeHtml(n.id)}" class="opacity-70 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-purple-700 hover:bg-black/5 rounded-full transition-opacity cursor-pointer" title="Edit note">
                  <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                </button>
                <button type="button" data-note-del="${escapeHtml(n.id)}" class="opacity-70 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-rose-600 hover:bg-black/5 rounded-full transition-opacity cursor-pointer" title="Delete note">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
            <h3 class="text-sm font-bold text-slate-900 font-serif mb-2 line-clamp-1">${escapeHtml(n.title)}</h3>
            <p class="text-xs text-slate-800 font-serif leading-relaxed line-clamp-5 whitespace-pre-line">${escapeHtml(n.content)}</p>
          </div>
          <div class="pt-3 border-t border-black/10 flex justify-between text-[10px] text-slate-500 font-mono mt-3">
            <span>${escapeHtml(new Date(n.created_at).toLocaleDateString())}</span>
            <span>Click to edit</span>
          </div>
        </div>`
        )
        .join('');
    }

    renderIcons(gridEl);

    gridEl.querySelector('[data-notes-empty-add]')?.addEventListener('click', () => {
      editingNote = null;
      formState = { title: '', content: '', priority: 'medium', isPinned: false, color: '#FEF3C7' };
      showAddModal = true;
      render();
    });

    gridEl.querySelectorAll('[data-note-card]').forEach((card) => {
      card.addEventListener('click', () => {
        const note = notes.find((n) => n.id === card.getAttribute('data-note-card'));
        if (note) openEditModal(note);
      });
    });

    gridEl.querySelectorAll('[data-note-pin]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const noteItem = notes.find((n) => n.id === btn.getAttribute('data-note-pin'));
        if (!noteItem) return;
        try {
          const res = await api.updateNote(noteItem.id, { is_pinned: !noteItem.is_pinned });
          if (res.success) {
            notes = notes.map((n) => (n.id === noteItem.id ? res.note : n));
            renderGridOnly();
          }
        } catch (err) {
          console.error('Failed to toggle pin:', err);
        }
      });
    });

    gridEl.querySelectorAll('[data-note-edit]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const note = notes.find((n) => n.id === btn.getAttribute('data-note-edit'));
        if (note) openEditModal(note);
      });
    });

    gridEl.querySelectorAll('[data-note-del]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteConfirmNoteId = btn.getAttribute('data-note-del');
        render();
      });
    });
  };

  const render = () => {
    if (disposed) return;

    const addModalHtml = showAddModal
      ? `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
          <button type="button" data-note-close-modal class="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
          <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif mb-1">
            ${editingNote ? 'Edit Note 📝' : 'Create Note 📝'}
          </h2>
          <p class="text-xs text-slate-500 mb-6">Write down whatever is on your mind.</p>
          <form data-note-form class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Note Title</label>
              <input type="text" name="title" placeholder="e.g. Dissertation outline ideas" value="${escapeHtml(formState.title)}" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Content</label>
              <textarea rows="4" required name="content" placeholder="Note details, thoughts, quotes..." class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none resize-none">${escapeHtml(formState.content)}</textarea>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Card Color</label>
              <div class="flex gap-2">
                ${COLOR_PALETTES.map(
                  (c) => `
                  <button type="button" data-note-color="${c.hex}" class="w-7 h-7 rounded-full border transition-transform cursor-pointer ${
                    formState.color === c.hex ? 'scale-125 ring-2 ring-amber-400' : 'hover:scale-110'
                  }" style="background-color: ${c.hex}" title="${escapeHtml(c.label)}"></button>`
                ).join('')}
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Priority</label>
                <select name="priority" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">
                  <option value="high" ${formState.priority === 'high' ? 'selected' : ''}>High</option>
                  <option value="medium" ${formState.priority === 'medium' ? 'selected' : ''}>Medium</option>
                  <option value="low" ${formState.priority === 'low' ? 'selected' : ''}>Low</option>
                </select>
              </div>
              <div class="flex items-center pt-5 gap-2">
                <input type="checkbox" id="pin_cb" name="isPinned" ${formState.isPinned ? 'checked' : ''} class="rounded text-amber-600 focus:ring-amber-500" />
                <label for="pin_cb" class="text-xs text-slate-600 dark:text-slate-300 cursor-pointer">Pin to top of board</label>
              </div>
            </div>
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button type="button" data-note-close-modal class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm cursor-pointer">Save Note ✨</button>
            </div>
          </form>
        </div>
      </div>`
      : '';

    const deleteModalHtml = deleteConfirmNoteId
      ? `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
            <i data-lucide="trash-2" class="w-6 h-6"></i>
          </div>
          <div class="text-center">
            <h3 class="text-base font-bold text-slate-800 dark:text-slate-100">Delete Sticky Note?</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Are you sure you want to permanently delete this note?</p>
          </div>
          <div class="flex items-center gap-3 pt-2">
            <button type="button" data-note-cancel-del class="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer">Cancel</button>
            <button type="button" data-note-confirm-del class="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow cursor-pointer">Delete Note</button>
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
              <span>Important Notes</span>
              <span class="text-sm font-sans font-normal text-slate-400">(${notes.length} notes)</span>
            </h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Quick thoughts, research ideas, book quotes, and reminders.</p>
          </div>
          <div class="flex items-center gap-3">
            <button type="button" data-note-new class="px-4 py-2 rounded-2xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>New Note</span>
            </button>
          </div>
        </div>

        <div class="relative max-w-md">
          <i data-lucide="search" class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
          <input type="text" data-notes-search placeholder="Search your notes..." value="${escapeHtml(searchQuery)}" class="w-full pl-10 pr-4 py-2 text-xs rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400" />
        </div>

        <div data-notes-grid class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"></div>

        ${addModalHtml}
        ${deleteModalHtml}
      </div>
    `;

    renderIcons(container);
    renderGridOnly();

    container.querySelector('[data-notes-search]')?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderGridOnly();
    });

    container.querySelector('[data-note-new]')?.addEventListener('click', () => {
      editingNote = null;
      formState = { title: '', content: '', priority: 'medium', isPinned: false, color: '#FEF3C7' };
      showAddModal = true;
      render();
    });

    container.querySelectorAll('[data-note-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        showAddModal = false;
        editingNote = null;
        render();
      });
    });

    container.querySelectorAll('[data-note-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const form = container.querySelector('[data-note-form]');
        if (form) {
          formState.title = form.querySelector('[name="title"]')?.value || '';
          formState.content = form.querySelector('[name="content"]')?.value || '';
          formState.priority = form.querySelector('[name="priority"]')?.value || 'medium';
          formState.isPinned = !!form.querySelector('[name="isPinned"]')?.checked;
        }
        formState.color = btn.getAttribute('data-note-color');
        render();
      });
    });

    container.querySelector('[data-note-cancel-del]')?.addEventListener('click', () => {
      deleteConfirmNoteId = null;
      render();
    });

    container.querySelector('[data-note-confirm-del]')?.addEventListener('click', async () => {
      if (!deleteConfirmNoteId) return;
      try {
        const res = await api.deleteNote(deleteConfirmNoteId);
        if (res.success) {
          notes = notes.filter((n) => n.id !== deleteConfirmNoteId);
          deleteConfirmNoteId = null;
          showToast('Note removed 🗑️');
        }
      } catch (err) {
        showToast(err.message || 'Failed to delete note.');
      }
    });

    container.querySelector('[data-note-form]')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const title = String(fd.get('title') || '').trim();
      const content = String(fd.get('content') || '').trim();
      if (!title && !content) {
        showToast('Please provide a title or content for your note.');
        return;
      }
      const payload = {
        title: title || 'Untitled Note',
        content,
        priority: String(fd.get('priority') || 'medium'),
        is_pinned: fd.get('isPinned') === 'on',
        color: formState.color,
      };
      try {
        if (editingNote) {
          const res = await api.updateNote(editingNote.id, payload);
          if (res.success) {
            notes = notes.map((n) => (n.id === editingNote.id ? res.note : n));
            showToast('Note updated ✨');
          }
        } else {
          const res = await api.createNote(payload);
          if (res.success) {
            notes = [res.note, ...notes];
            showToast('Note pinned to your board ✨');
          }
        }
        showAddModal = false;
        editingNote = null;
        render();
      } catch (err) {
        showToast(err.message || 'Failed to save note.');
      }
    });
  };

  render();

  api
    .getNotes()
    .then((res) => {
      if (!disposed && res.success) {
        notes = res.notes || [];
        render();
      }
    })
    .catch((err) => console.error('Error loading notes:', err));

  return () => {
    disposed = true;
    if (toastTimer) clearTimeout(toastTimer);
  };
}

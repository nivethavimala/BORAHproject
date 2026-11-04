import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { ImportantNote } from '../types';
import {
  StickyNote,
  Plus,
  Pin,
  Trash2,
  Edit3,
  Search,
  Check,
  X,
  Palette,
} from 'lucide-react';

export const NotesView: React.FC = () => {
  const [notes, setNotes] = useState<ImportantNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Note form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [isPinned, setIsPinned] = useState(false);
  const [color, setColor] = useState('#FEF3C7');
  const [editingNote, setEditingNote] = useState<ImportantNote | null>(null);
  const [deleteConfirmNoteId, setDeleteConfirmNoteId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const colorPalettes = [
    { label: 'Warm Cream', hex: '#FEF3C7', darkHex: '#451A03' },
    { label: 'Soft Rose', hex: '#FFE4E6', darkHex: '#4C0519' },
    { label: 'Lavender Dream', hex: '#EDE9FE', darkHex: '#2E1065' },
    { label: 'Mint Sage', hex: '#D1FAE5', darkHex: '#022C22' },
    { label: 'Sky Breeze', hex: '#E0F2FE', darkHex: '#082F49' },
  ];

  const loadNotes = async () => {
    try {
      const res = await api.getNotes();
      if (res.success) {
        setNotes(res.notes);
      }
    } catch (err) {
      console.error('Error loading notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) {
      showToast('Please provide a title or content for your note.');
      return;
    }

    try {
      if (editingNote) {
        const res = await api.updateNote(editingNote.id, {
          title: title.trim(),
          content: content.trim(),
          priority,
          is_pinned: isPinned,
          color,
        });
        if (res.success) {
          setNotes(notes.map((n) => (n.id === editingNote.id ? res.note : n)));
          showToast('Note updated ✨');
        }
      } else {
        const res = await api.createNote({
          title: title.trim() || 'Untitled Note',
          content: content.trim(),
          priority,
          is_pinned: isPinned,
          color,
        });
        if (res.success) {
          setNotes([res.note, ...notes]);
          showToast('Note pinned to your board ✨');
        }
      }

      setShowAddModal(false);
      setEditingNote(null);
      setTitle('');
      setContent('');
      setIsPinned(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to save note.');
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const res = await api.deleteNote(id);
      if (res.success) {
        setNotes(notes.filter((n) => n.id !== id));
        setDeleteConfirmNoteId(null);
        showToast('Note removed 🗑️');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete note.');
    }
  };

  const handleTogglePin = async (noteItem: ImportantNote, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = !noteItem.is_pinned;
      const res = await api.updateNote(noteItem.id, { is_pinned: updated });
      if (res.success) {
        setNotes(notes.map((n) => (n.id === noteItem.id ? res.note : n)));
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  const openEditModal = (noteItem: ImportantNote) => {
    setEditingNote(noteItem);
    setTitle(noteItem.title);
    setContent(noteItem.content);
    setPriority(noteItem.priority);
    setIsPinned(noteItem.is_pinned);
    setColor(noteItem.color || '#FEF3C7');
    setShowAddModal(true);
  };

  const filteredNotes = notes.filter((n) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl bg-slate-900 text-white text-xs font-medium shadow-xl border border-slate-700 animate-in fade-in duration-200">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-serif flex items-center gap-2">
            <span>Important Notes</span>
            <span className="text-sm font-sans font-normal text-slate-400">({notes.length} notes)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Quick thoughts, research ideas, book quotes, and reminders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setEditingNote(null);
              setTitle('');
              setContent('');
              setIsPinned(false);
              setColor('#FEF3C7');
              setShowAddModal(true);
            }}
            className="px-4 py-2 rounded-2xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search your notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
        />
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNotes.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
            <StickyNote className="w-10 h-10 mx-auto text-amber-300 dark:text-slate-700 mb-2" />
            <p className="text-xs font-serif">No notes saved yet.</p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="mt-3 text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline"
            >
              Pin your first note 🌷
            </button>
          </div>
        ) : (
          filteredNotes.map((n) => {
            return (
              <div
                key={n.id}
                onClick={() => openEditModal(n)}
                className="group relative rounded-3xl p-5 border border-black/5 dark:border-white/10 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between min-h-[180px]"
                style={{ backgroundColor: n.color || '#FEF3C7' }}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <button
                      type="button"
                      onClick={(e) => handleTogglePin(n, e)}
                      className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                        n.is_pinned
                          ? 'bg-amber-600 text-white'
                          : 'text-slate-400 hover:text-slate-700'
                      }`}
                      title={n.is_pinned ? 'Unpin note' : 'Pin to top'}
                    >
                      <Pin className={`w-3.5 h-3.5 ${n.is_pinned ? 'fill-white' : ''}`} />
                    </button>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-black/10 text-slate-700">
                        {n.priority}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(n);
                        }}
                        className="opacity-70 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-purple-700 hover:bg-black/5 rounded-full transition-opacity cursor-pointer"
                        title="Edit note"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmNoteId(n.id);
                        }}
                        className="opacity-70 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-rose-600 hover:bg-black/5 rounded-full transition-opacity cursor-pointer"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 font-serif mb-2 line-clamp-1">
                    {n.title}
                  </h3>

                  <p className="text-xs text-slate-800 font-serif leading-relaxed line-clamp-5 whitespace-pre-line">
                    {n.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-black/10 flex justify-between text-[10px] text-slate-500 font-mono mt-3">
                  <span>{new Date(n.created_at).toLocaleDateString()}</span>
                  <span>Click to edit</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Note Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif mb-1">
              {editingNote ? 'Edit Note 📝' : 'Create Note 📝'}
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Write down whatever is on your mind.
            </p>

            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Note Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dissertation outline ideas"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Content
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Note details, thoughts, quotes..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none resize-none"
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Card Color
                </label>
                <div className="flex gap-2">
                  {colorPalettes.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setColor(c.hex)}
                      className={`w-7 h-7 rounded-full border transition-transform ${
                        color === c.hex ? 'scale-125 ring-2 ring-amber-400' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                </div>
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
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div className="flex items-center pt-5 gap-2">
                  <input
                    type="checkbox"
                    id="pin_cb"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <label htmlFor="pin_cb" className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                    Pin to top of board
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm cursor-pointer"
                >
                  Save Note ✨
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmNoteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Delete Sticky Note?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to permanently delete this note?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmNoteId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteNote(deleteConfirmNoteId)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow cursor-pointer"
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

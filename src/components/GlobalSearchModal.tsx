import React, { useState, useEffect } from 'react';
import { Search, X, BookOpen, Camera, CheckSquare, StickyNote, ArrowRight } from 'lucide-react';
import { api } from '../api';
import { SearchResults } from '../types';

import { EasterEggManager, SearchEggResult } from '../utils/easterEggManager';
import { PurpleSparkle } from './PurpleSparkle';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string, itemId?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searchEgg, setSearchEgg] = useState<SearchEggResult>({ isEgg: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults(null);
      setSearchEgg({ isEgg: false });
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setSearchEgg({ isEgg: false });
      return;
    }

    // Check for Easter egg codes in query
    const egg = EasterEggManager.checkSearchQuery(query);
    setSearchEgg(egg);

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.search(query);
        if (res.success) {
          setResults(res.results);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResults = results
    ? results.journals.length + results.memories.length + results.tasks.length + results.notes.length
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center px-5 py-4 border-b border-slate-100 dark:border-slate-800 gap-3">
          <Search className="w-5 h-5 text-amber-500 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search journal entries, memories, tasks, notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-base bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {/* Secret Easter Egg Card if triggered */}
          {searchEgg.isEgg && (
            <div className="relative overflow-hidden p-4 rounded-2xl bg-purple-50/80 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/80 text-xs animate-in fade-in">
              <PurpleSparkle mode="contained" active={true} count={7} showSevenStars={true} />
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-bold mb-1">
                <span>💜</span>
                <span>{searchEgg.title}</span>
              </div>
              <p className="text-purple-900/90 dark:text-purple-200 leading-relaxed font-serif">
                "{searchEgg.message}"
              </p>
              {searchEgg.quote && (
                <p className="text-[11px] text-purple-600 dark:text-purple-400 italic mt-1 font-serif">
                  "{searchEgg.quote}"
                </p>
              )}
            </div>
          )}

          {loading && (
            <div className="py-12 text-center text-xs text-slate-400">
              <span className="inline-block w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-2" />
              <p>Searching your private sanctuary...</p>
            </div>
          )}

          {!loading && query && totalResults === 0 && !searchEgg.isEgg && (
            <div className="py-12 text-center text-slate-400 text-xs">
              <p className="text-sm text-slate-500 dark:text-slate-400">No results found for "{query}"</p>
              <p className="mt-1">Try another keyword or search term.</p>
            </div>
          )}

          {!loading && !query && (
            <div className="py-10 text-center text-xs text-slate-400">
              <p>Type to search across all your thoughts, plans, and memories.</p>
              <div className="flex justify-center gap-4 mt-3 text-[11px] text-slate-400">
                <span>📖 Journals</span>
                <span>📸 Memories</span>
                <span>✅ Tasks</span>
                <span>📝 Notes</span>
              </div>
            </div>
          )}

          {results && totalResults > 0 && (
            <>
              {/* Journals */}
              {results.journals.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
                    <BookOpen className="w-3.5 h-3.5" /> Journal Entries ({results.journals.length})
                  </div>
                  <div className="space-y-1">
                    {results.journals.map((j) => (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => {
                          onNavigate('journal', j.id);
                          onClose();
                        }}
                        className="w-full p-2.5 rounded-xl hover:bg-amber-50/60 dark:hover:bg-slate-800/80 text-left transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-700 dark:group-hover:text-amber-400">
                            {j.title}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-md">
                            {j.content.slice(0, 90)}...
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Memories */}
              {results.memories.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
                    <Camera className="w-3.5 h-3.5" /> Memories ({results.memories.length})
                  </div>
                  <div className="space-y-1">
                    {results.memories.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          onNavigate('memories', m.id);
                          onClose();
                        }}
                        className="w-full p-2.5 rounded-xl hover:bg-amber-50/60 dark:hover:bg-slate-800/80 text-left transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-700 dark:group-hover:text-amber-400">
                            {m.title}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-md">
                            {m.description || m.location}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {results.tasks.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
                    <CheckSquare className="w-3.5 h-3.5" /> Tasks ({results.tasks.length})
                  </div>
                  <div className="space-y-1">
                    {results.tasks.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          onNavigate('tasks', t.id);
                          onClose();
                        }}
                        className="w-full p-2.5 rounded-xl hover:bg-amber-50/60 dark:hover:bg-slate-800/80 text-left transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <div className={`text-xs font-semibold text-slate-800 dark:text-slate-200 ${t.completed ? 'line-through opacity-60' : ''}`}>
                            {t.title}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {t.category} · Priority: {t.priority}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {results.notes.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
                    <StickyNote className="w-3.5 h-3.5" /> Notes ({results.notes.length})
                  </div>
                  <div className="space-y-1">
                    {results.notes.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          onNavigate('notes', n.id);
                          onClose();
                        }}
                        className="w-full p-2.5 rounded-xl hover:bg-amber-50/60 dark:hover:bg-slate-800/80 text-left transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {n.title}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-md">
                            {n.content.slice(0, 80)}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

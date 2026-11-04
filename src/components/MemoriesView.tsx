import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Memory, MemoryPhoto } from '../types';
import { exportMemoryToPDF } from '../utils/pdfExport';
import {
  Camera,
  Plus,
  Heart,
  MapPin,
  Calendar,
  Trash2,
  Image as ImageIcon,
  Clock,
  Sparkles,
  X,
  Check,
  ChevronRight,
  Filter,
  Download,
} from 'lucide-react';


interface MemoriesViewProps {
  initialMemoryId?: string | null;
}

export const MemoriesView: React.FC<MemoriesViewProps> = ({ initialMemoryId }) => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Memory Form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newLocation, setNewLocation] = useState('');
  const [newCoverImage, setNewCoverImage] = useState('');
  const [newPhotos, setNewPhotos] = useState<Array<{ image_path: string; caption?: string }>>([]);
  const [extraPhotoUrl, setExtraPhotoUrl] = useState('');
  const [extraPhotoCaption, setExtraPhotoCaption] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const samplePresets = [
    { title: 'College Courtyard & Coffee', location: 'University Library', url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80' },
    { title: 'Weekend Botanical Stroll', location: 'City Greenhouse', url: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=800&q=80' },
    { title: 'Sunset by the Coast', location: 'Harbor Pier', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80' },
  ];

  const loadMemories = async () => {
    try {
      const res = await api.getMemories();
      if (res.success) {
        setMemories(res.memories);
        if (initialMemoryId) {
          const match = res.memories.find((m) => m.id === initialMemoryId);
          if (match) setSelectedMemory(match);
        }
      }
    } catch (err) {
      console.error('Error loading memories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, [initialMemoryId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast('Please enter a memory title.');
      return;
    }

    try {
      const res = await api.createMemory({
        title: newTitle.trim(),
        description: newDesc.trim(),
        memory_date: newDate,
        location: newLocation.trim(),
        cover_image: newCoverImage.trim() || samplePresets[0].url,
        photos: newPhotos as any,
      });

      if (res.success) {
        setMemories([res.memory, ...memories]);
        setShowAddModal(false);
        // Reset form
        setNewTitle('');
        setNewDesc('');
        setNewLocation('');
        setNewCoverImage('');
        setNewPhotos([]);
        showToast('Memory preserved forever 📸');
      }
    } catch (err: any) {
      showToast(err.message || 'Unable to save memory.');
    }
  };

  const handleToggleFavorite = async (mem: Memory, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = !mem.is_favorite;
      await api.updateMemory(mem.id, { is_favorite: updated });
      setMemories((prev) => prev.map((m) => (m.id === mem.id ? { ...m, is_favorite: updated } : m)));
      if (selectedMemory?.id === mem.id) {
        setSelectedMemory({ ...selectedMemory, is_favorite: updated });
      }
    } catch (err) {
      console.error('Error updating favorite:', err);
    }
  };

  const handleDeleteMemory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this memory?')) return;
    try {
      const res = await api.deleteMemory(id);
      if (res.success) {
        setMemories(memories.filter((m) => m.id !== id));
        if (selectedMemory?.id === id) setSelectedMemory(null);
        showToast('Memory removed.');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete memory.');
    }
  };

  const handleAddExtraPhoto = () => {
    if (!extraPhotoUrl.trim()) return;
    setNewPhotos([...newPhotos, { image_path: extraPhotoUrl.trim(), caption: extraPhotoCaption.trim() }]);
    setExtraPhotoUrl('');
    setExtraPhotoCaption('');
  };

  const handleDeleteSpecificPhoto = async (photoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this specific photo from the memory?')) return;
    try {
      const res = await api.deletePhoto(photoId);
      if (res.success) {
        if (selectedMemory) {
          const nextPhotos = (selectedMemory.photos || []).filter((p) => p.id !== photoId);
          const updated = { ...selectedMemory, photos: nextPhotos };
          setSelectedMemory(updated);
          setMemories((prev) => prev.map((m) => (m.id === selectedMemory.id ? updated : m)));
        }
        showToast('Specific photo deleted from memory 📸');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete photo.');
    }
  };

  const handleDeleteSpecificPart = async (part: 'location' | 'description' | 'cover_image') => {
    if (!selectedMemory) return;
    const labels = {
      location: 'location tag',
      description: 'story description',
      cover_image: 'cover photo',
    };
    if (!confirm(`Are you sure you want to delete the ${labels[part]} part from this memory?`)) return;

    try {
      const updates: any = {};
      if (part === 'location') updates.location = '';
      if (part === 'description') updates.description = '';
      if (part === 'cover_image') updates.cover_image = 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80';

      const res = await api.updateMemory(selectedMemory.id, updates);
      if (res.success) {
        const updated = { ...selectedMemory, ...updates };
        setSelectedMemory(updated);
        setMemories((prev) => prev.map((m) => (m.id === selectedMemory.id ? updated : m)));
        showToast(`Specific part (${labels[part]}) deleted.`);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete specific part.');
    }
  };

  const handleAddPhotoToExisting = async () => {
    if (!selectedMemory || !extraPhotoUrl.trim()) return;
    try {
      const res = await api.addMemoryPhoto(selectedMemory.id, {
        image_path: extraPhotoUrl.trim(),
        caption: extraPhotoCaption.trim(),
      });
      if (res.success) {
        const nextPhotos = [...(selectedMemory.photos || []), res.photo];
        const updated = { ...selectedMemory, photos: nextPhotos };
        setSelectedMemory(updated);
        setMemories((prev) => prev.map((m) => (m.id === selectedMemory.id ? updated : m)));
        setExtraPhotoUrl('');
        setExtraPhotoCaption('');
        showToast('Photo added to album ✨');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to add photo.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl bg-slate-900 text-white text-xs font-medium shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-serif flex items-center gap-2">
            <span>Memory Album</span>
            <span className="text-sm font-sans font-normal text-slate-400">({memories.length} preserved)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Photographs, college moments, milestones, and life chapters in one place.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Segmented View Mode Filter */}
          <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-amber-100 dark:bg-slate-700 text-amber-900 dark:text-amber-200 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Polaroid Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-amber-100 dark:bg-slate-700 text-amber-900 dark:text-amber-200 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Life Timeline
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-2xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Preserve Memory</span>
          </button>
        </div>
      </div>

      {/* Grid or Timeline View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {memories.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
              <Camera className="w-12 h-12 mx-auto text-amber-300 dark:text-slate-700 mb-3" />
              <p className="text-sm font-serif">Some beautiful memories are waiting to be saved here 📸</p>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="mt-4 px-4 py-2 rounded-2xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 cursor-pointer shadow-xs"
              >
                Create your first memory album
              </button>
            </div>
          ) : (
            memories.map((mem, index) => (
              <div
                key={mem.id}
                onClick={() => setSelectedMemory(mem)}
                className="group relative bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer transform hover:-translate-y-1 duration-200"
              >
                {/* Polaroid Photo Frame */}
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-4">
                  <img
                    src={mem.cover_image || 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80'}
                    alt={mem.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Top-right Favorite Heart */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(mem, e)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs text-slate-400 hover:text-rose-500 shadow-xs transition-colors"
                  >
                    <Heart className={`w-3.5 h-3.5 ${mem.is_favorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>

                  {/* Location badge if present */}
                  {mem.location && (
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-300" />
                      <span>{mem.location}</span>
                    </div>
                  )}
                </div>

                {/* Memory Info & Caption */}
                <div className="space-y-1 px-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(mem.memory_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    {mem.photos && mem.photos.length > 0 && (
                      <span className="tabular-nums">+{mem.photos.length} photos</span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-serif truncate group-hover:text-amber-700 dark:group-hover:text-amber-400">
                    {mem.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {mem.description}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Chronological Timeline View */
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-8">
          <div className="border-l-2 border-amber-200 dark:border-slate-700 pl-6 space-y-8 ml-3">
            {memories.map((mem) => (
              <div
                key={mem.id}
                onClick={() => setSelectedMemory(mem)}
                className="relative group cursor-pointer"
              >
                {/* Timeline node marker */}
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-amber-500 ring-4 ring-amber-100 dark:ring-slate-800 group-hover:scale-125 transition-transform" />

                <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 font-mono mb-1">
                  {new Date(mem.memory_date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>

                <div className="bg-amber-50/40 dark:bg-slate-800/60 p-4 rounded-2xl border border-amber-100/60 dark:border-slate-700/60 flex flex-col sm:flex-row gap-4 items-start">
                  <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800">
                    <img src={mem.cover_image} alt={mem.title} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-serif">
                      {mem.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                      {mem.description}
                    </p>
                    {mem.location && (
                      <span className="inline-block mt-2 text-[10px] text-slate-400">
                        📍 {mem.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Memory Detail Modal */}
      {selectedMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedMemory(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-6 shadow-sm">
              <img
                src={selectedMemory.cover_image}
                alt={selectedMemory.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(selectedMemory.memory_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                {selectedMemory.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                    {selectedMemory.location}
                  </span>
                )}
              </div>

              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif">
                {selectedMemory.title}
              </h2>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-serif whitespace-pre-line">
                {selectedMemory.description}
              </p>

              {/* Gallery Photos Album */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Photo Album ({selectedMemory.photos?.length || 0})
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Click trash on any photo to delete that specific photo
                  </span>
                </div>

                {selectedMemory.photos && selectedMemory.photos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedMemory.photos.map((p) => (
                      <div key={p.id} className="relative group space-y-1">
                        <div className="relative aspect-square rounded-2xl overflow-hidden shadow-xs border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                          <img src={p.image_path} alt={p.caption || 'Memory Photo'} className="w-full h-full object-cover" />
                          {/* Specific Photo Delete Option */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSpecificPhoto(p.id, e)}
                            className="absolute top-2 right-2 px-2 py-1 rounded-xl bg-rose-600/90 hover:bg-rose-700 text-white shadow-md transition-all flex items-center gap-1 text-[10px] font-semibold cursor-pointer"
                            title="Delete this specific photo"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete photo</span>
                          </button>
                        </div>
                        {p.caption && (
                          <p className="text-[10px] text-slate-500 truncate px-1">{p.caption}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No extra photos in this album yet.</p>
                )}

                {/* Add Photo to Existing Memory */}
                <div className="pt-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">
                    Add another photo to this album:
                  </span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      placeholder="Photo URL (https://...)"
                      value={extraPhotoUrl}
                      onChange={(e) => setExtraPhotoUrl(e.target.value)}
                      className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                    />
                    <input
                      type="text"
                      placeholder="Caption (optional)"
                      value={extraPhotoCaption}
                      onChange={(e) => setExtraPhotoCaption(e.target.value)}
                      className="sm:w-36 text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={handleAddPhotoToExisting}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs"
                    >
                      Attach
                    </button>
                  </div>
                </div>
              </div>

              {/* Delete Specific Part Control Strip */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Delete Specific Parts:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedMemory.location && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSpecificPart('location')}
                      className="px-2.5 py-1 text-[11px] rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Delete location tag from this memory"
                    >
                      <Trash2 className="w-3 h-3 text-rose-500" />
                      <span>Delete Location Tag</span>
                    </button>
                  )}
                  {selectedMemory.description && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSpecificPart('description')}
                      className="px-2.5 py-1 text-[11px] rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Delete story description from this memory"
                    >
                      <Trash2 className="w-3 h-3 text-rose-500" />
                      <span>Delete Story Part</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteSpecificPart('cover_image')}
                    className="px-2.5 py-1 text-[11px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Reset cover photo to default"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Reset Cover Photo</span>
                  </button>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={(e) => handleDeleteMemory(selectedMemory.id, e)}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1.5 cursor-pointer p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Entire Memory</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      exportMemoryToPDF(selectedMemory);
                      showToast('Memory exported as formatted PDF 📄');
                    }}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Export this memory as formatted PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Memory as PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMemory(null)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Memory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif mb-1">
              Preserve a New Memory 📸
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Create an album to revisit this cherished moment anytime.
            </p>

            <form onSubmit={handleCreateMemory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Memory Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. College Trip 2026, Birthday Picnic"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. City Garden"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Description / Story
                </label>
                <textarea
                  rows={3}
                  placeholder="What made this moment so special?"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Cover Photo Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newCoverImage}
                  onChange={(e) => setNewCoverImage(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
                {/* Presets */}
                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] text-slate-400 self-center">Or sample:</span>
                  {samplePresets.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setNewCoverImage(p.url);
                        if (!newTitle) setNewTitle(p.title);
                        if (!newLocation) setNewLocation(p.location);
                      }}
                      className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      {p.title.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Extra Photos in Album */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Add Additional Photos to Album (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Photo URL..."
                    value={extraPhotoUrl}
                    onChange={(e) => setExtraPhotoUrl(e.target.value)}
                    className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    placeholder="Caption..."
                    value={extraPhotoCaption}
                    onChange={(e) => setExtraPhotoCaption(e.target.value)}
                    className="w-32 text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleAddExtraPhoto}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                  >
                    Add
                  </button>
                </div>
                {newPhotos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pt-1">
                    {newPhotos.map((p, i) => (
                      <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border">
                        <img src={p.image_path} alt="Extra" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewPhotos(newPhotos.filter((_, idx) => idx !== i))}
                          className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm cursor-pointer"
                >
                  Save to Album ✨
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

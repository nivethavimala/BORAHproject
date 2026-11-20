import { api } from '../api.js';
import { escapeHtml, renderIcons, sanitizeUrl, todayIso } from '../utils/dom.js';
import { exportMemoryToPDF } from '../utils/pdfExport.js';

const SAMPLE_PRESETS = [
  {
    title: 'College Courtyard & Coffee',
    location: 'University Library',
    url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Weekend Botanical Stroll',
    location: 'City Greenhouse',
    url: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Sunset by the Coast',
    location: 'Harbor Pier',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  },
];

export function renderMemoriesView(container, { initialMemoryId = null } = {}) {
  let memories = [];
  let viewMode = 'grid';
  let selectedMemory = null;
  let showAddModal = false;
  let pendingConfirm = null; // { title, message, confirmLabel, onConfirm }
  let toastMessage = null;
  let toastTimer = null;
  let disposed = false;

  let formState = {
    title: '',
    description: '',
    date: todayIso(),
    location: '',
    coverImage: '',
    photos: [],
    extraPhotoUrl: '',
    extraPhotoCaption: '',
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

  const render = () => {
    if (disposed) return;

    const mainContentHtml =
      viewMode === 'grid'
        ? `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          ${
            memories.length === 0
              ? `<div class="col-span-full py-20 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
                  <i data-lucide="camera" class="w-12 h-12 mx-auto text-amber-300 dark:text-slate-700 mb-3"></i>
                  <p class="text-sm font-serif">Some beautiful memories are waiting to be saved here 📸</p>
                  <button type="button" data-mem-open-add class="mt-4 px-4 py-2 rounded-2xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 cursor-pointer shadow-xs">
                    Create your first memory album
                  </button>
                </div>`
              : memories
                  .map(
                    (mem) => `
                  <div data-mem-card="${escapeHtml(mem.id)}" class="group relative bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer transform hover:-translate-y-1 duration-200">
                    <div class="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-4">
                      <img src="${escapeHtml(sanitizeUrl(mem.cover_image) || SAMPLE_PRESETS[0].url)}" alt="${escapeHtml(mem.title)}" referrerpolicy="no-referrer" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <button type="button" data-mem-fav="${escapeHtml(mem.id)}" class="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs text-slate-400 hover:text-rose-500 shadow-xs transition-colors cursor-pointer">
                        <i data-lucide="heart" class="w-3.5 h-3.5 ${mem.is_favorite ? 'fill-rose-500 text-rose-500' : ''}"></i>
                      </button>
                      ${
                        mem.location
                          ? `<div class="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1">
                              <i data-lucide="map-pin" class="w-3 h-3 text-amber-300"></i>
                              <span>${escapeHtml(mem.location)}</span>
                            </div>`
                          : ''
                      }
                    </div>
                    <div class="space-y-1 px-1">
                      <div class="flex items-center justify-between text-[11px] text-slate-400">
                        <span class="flex items-center gap-1">
                          <i data-lucide="calendar" class="w-3 h-3"></i>
                          ${escapeHtml(new Date(mem.memory_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))}
                        </span>
                        ${mem.photos && mem.photos.length > 0 ? `<span class="tabular-nums">+${mem.photos.length} photos</span>` : ''}
                      </div>
                      <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 font-serif truncate group-hover:text-amber-700 dark:group-hover:text-amber-400">${escapeHtml(mem.title)}</h3>
                      <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">${escapeHtml(mem.description)}</p>
                    </div>
                  </div>`
                  )
                  .join('')
          }
        </div>`
        : `
        <div class="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-8">
          <div class="border-l-2 border-amber-200 dark:border-slate-700 pl-6 space-y-8 ml-3">
            ${memories
              .map(
                (mem) => `
              <div data-mem-card="${escapeHtml(mem.id)}" class="relative group cursor-pointer">
                <div class="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-amber-500 ring-4 ring-amber-100 dark:ring-slate-800 group-hover:scale-125 transition-transform"></div>
                <div class="text-xs font-semibold text-amber-700 dark:text-amber-400 font-mono mb-1">
                  ${escapeHtml(new Date(mem.memory_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))}
                </div>
                <div class="bg-amber-50/40 dark:bg-slate-800/60 p-4 rounded-2xl border border-amber-100/60 dark:border-slate-700/60 flex flex-col sm:flex-row gap-4 items-start">
                  <div class="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800">
                    <img src="${escapeHtml(sanitizeUrl(mem.cover_image) || SAMPLE_PRESETS[0].url)}" alt="${escapeHtml(mem.title)}" class="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 font-serif">${escapeHtml(mem.title)}</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3 leading-relaxed">${escapeHtml(mem.description)}</p>
                    ${mem.location ? `<span class="inline-block mt-2 text-[10px] text-slate-400">📍 ${escapeHtml(mem.location)}</span>` : ''}
                  </div>
                </div>
              </div>`
              )
              .join('')}
          </div>
        </div>`;

    const detailModalHtml = selectedMemory
      ? `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
          <button type="button" data-mem-close-detail class="absolute top-5 right-5 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
          <div class="aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-6 shadow-sm">
            <img src="${escapeHtml(sanitizeUrl(selectedMemory.cover_image) || SAMPLE_PRESETS[0].url)}" alt="${escapeHtml(selectedMemory.title)}" class="w-full h-full object-cover" />
          </div>
          <div class="space-y-3">
            <div class="flex items-center justify-between text-xs text-slate-400">
              <span class="flex items-center gap-1">
                <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                ${escapeHtml(new Date(selectedMemory.memory_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))}
              </span>
              ${
                selectedMemory.location
                  ? `<span class="flex items-center gap-1"><i data-lucide="map-pin" class="w-3.5 h-3.5 text-amber-500"></i> ${escapeHtml(selectedMemory.location)}</span>`
                  : ''
              }
            </div>
            <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif">${escapeHtml(selectedMemory.title)}</h2>
            <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-serif whitespace-pre-line">${escapeHtml(selectedMemory.description)}</p>

            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Photo Album (${selectedMemory.photos?.length || 0})</h4>
                <span class="text-[11px] text-slate-400">Click trash on any photo to delete that specific photo</span>
              </div>
              ${
                selectedMemory.photos && selectedMemory.photos.length > 0
                  ? `<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      ${selectedMemory.photos
                        .map(
                          (p) => `
                        <div class="relative group space-y-1">
                          <div class="relative aspect-square rounded-2xl overflow-hidden shadow-xs border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                            <img src="${escapeHtml(sanitizeUrl(p.image_path))}" alt="${escapeHtml(p.caption || 'Memory Photo')}" class="w-full h-full object-cover" />
                            <button type="button" data-mem-del-photo="${escapeHtml(p.id)}" class="absolute top-2 right-2 px-2 py-1 rounded-xl bg-rose-600/90 hover:bg-rose-700 text-white shadow-md transition-all flex items-center gap-1 text-[10px] font-semibold cursor-pointer" title="Delete this specific photo">
                              <i data-lucide="trash-2" class="w-3 h-3"></i>
                              <span>Delete photo</span>
                            </button>
                          </div>
                          ${p.caption ? `<p class="text-[10px] text-slate-500 truncate px-1">${escapeHtml(p.caption)}</p>` : ''}
                        </div>`
                        )
                        .join('')}
                    </div>`
                  : `<p class="text-xs text-slate-400 italic">No extra photos in this album yet.</p>`
              }
              <div class="pt-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">Add another photo to this album:</span>
                <div class="flex flex-col sm:flex-row gap-2">
                  <input type="url" data-mem-existing-photo-url placeholder="Photo URL (https://...)" value="${escapeHtml(formState.extraPhotoUrl)}" class="flex-1 text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" />
                  <input type="text" data-mem-existing-photo-caption placeholder="Caption (optional)" value="${escapeHtml(formState.extraPhotoCaption)}" class="sm:w-36 text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" />
                  <button type="button" data-mem-attach-photo class="px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs">Attach</button>
                </div>
              </div>
            </div>

            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Delete Specific Parts:</span>
              <div class="flex flex-wrap items-center gap-2">
                ${
                  selectedMemory.location
                    ? `<button type="button" data-mem-del-part="location" class="px-2.5 py-1 text-[11px] rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer">
                        <i data-lucide="trash-2" class="w-3 h-3 text-rose-500"></i>
                        <span>Delete Location Tag</span>
                      </button>`
                    : ''
                }
                ${
                  selectedMemory.description
                    ? `<button type="button" data-mem-del-part="description" class="px-2.5 py-1 text-[11px] rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer">
                        <i data-lucide="trash-2" class="w-3 h-3 text-rose-500"></i>
                        <span>Delete Story Part</span>
                      </button>`
                    : ''
                }
                <button type="button" data-mem-del-part="cover_image" class="px-2.5 py-1 text-[11px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer">
                  <i data-lucide="trash-2" class="w-3 h-3"></i>
                  <span>Reset Cover Photo</span>
                </button>
              </div>
            </div>

            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button type="button" data-mem-del-entire class="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1.5 cursor-pointer p-1">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                <span>Delete Entire Memory</span>
              </button>
              <div class="flex items-center gap-2">
                <button type="button" data-mem-export-pdf class="px-3.5 py-2 text-xs font-semibold rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 flex items-center gap-1.5 cursor-pointer shadow-xs">
                  <i data-lucide="download" class="w-3.5 h-3.5"></i>
                  <span>Export Memory as PDF</span>
                </button>
                <button type="button" data-mem-close-detail class="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer">Close</button>
              </div>
            </div>
          </div>
        </div>
      </div>`
      : '';

    const addModalHtml = showAddModal
      ? `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
          <button type="button" data-mem-close-add class="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
          <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif mb-1">Preserve a New Memory 📸</h2>
          <p class="text-xs text-slate-500 mb-6">Create an album to revisit this cherished moment anytime.</p>
          <form data-mem-form class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Memory Title</label>
              <input type="text" required name="title" placeholder="e.g. College Trip 2026, Birthday Picnic" value="${escapeHtml(formState.title)}" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Date</label>
                <input type="date" required name="date" value="${escapeHtml(formState.date)}" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Location</label>
                <input type="text" name="location" placeholder="e.g. City Garden" value="${escapeHtml(formState.location)}" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Description / Story</label>
              <textarea rows="3" name="description" placeholder="What made this moment so special?" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none resize-none">${escapeHtml(formState.description)}</textarea>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Cover Photo Image URL</label>
              <input type="url" name="coverImage" placeholder="https://..." value="${escapeHtml(formState.coverImage)}" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              <div class="flex gap-2 mt-2">
                <span class="text-[10px] text-slate-400 self-center">Or sample:</span>
                ${SAMPLE_PRESETS.map((p, i) => `<button type="button" data-mem-preset="${i}" class="text-[10px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">${escapeHtml(p.title.split(' ')[0])}</button>`).join('')}
              </div>
            </div>
            <div class="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300">Add Additional Photos to Album (Optional)</label>
              <div class="flex gap-2">
                <input type="url" data-mem-new-extra-url placeholder="Photo URL..." value="${escapeHtml(formState.extraPhotoUrl)}" class="flex-1 text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                <input type="text" data-mem-new-extra-caption placeholder="Caption..." value="${escapeHtml(formState.extraPhotoCaption)}" class="w-32 text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                <button type="button" data-mem-add-extra class="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer">Add</button>
              </div>
              ${
                formState.photos.length > 0
                  ? `<div class="flex gap-2 overflow-x-auto pt-1">
                      ${formState.photos
                        .map(
                          (p, i) => `
                        <div class="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border">
                          <img src="${escapeHtml(sanitizeUrl(p.image_path))}" alt="Extra" class="w-full h-full object-cover" />
                          <button type="button" data-mem-remove-extra="${i}" class="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center cursor-pointer">×</button>
                        </div>`
                        )
                        .join('')}
                    </div>`
                  : ''
              }
            </div>
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button type="button" data-mem-close-add class="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm cursor-pointer">Save to Album ✨</button>
            </div>
          </form>
        </div>
      </div>`
      : '';

    const confirmModalHtml = pendingConfirm
      ? `
      <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
            <i data-lucide="trash-2" class="w-6 h-6"></i>
          </div>
          <div class="text-center">
            <h3 class="text-base font-bold text-slate-800 dark:text-slate-100">${escapeHtml(pendingConfirm.title)}</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${escapeHtml(pendingConfirm.message)}</p>
          </div>
          <div class="flex items-center gap-3 pt-2">
            <button type="button" data-mem-confirm-cancel class="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer">Cancel</button>
            <button type="button" data-mem-confirm-ok class="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow cursor-pointer">${escapeHtml(pendingConfirm.confirmLabel || 'Delete')}</button>
          </div>
        </div>
      </div>`
      : '';

    container.innerHTML = `
      <div class="space-y-6">
        ${toastMessage ? `<div class="fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl bg-slate-900 text-white text-xs font-medium shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200">${escapeHtml(toastMessage)}</div>` : ''}

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-serif flex items-center gap-2">
              <span>Memory Album</span>
              <span class="text-sm font-sans font-normal text-slate-400">(${memories.length} preserved)</span>
            </h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Photographs, college moments, milestones, and life chapters in one place.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <button type="button" data-mem-mode="grid" class="px-3 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-amber-100 dark:bg-slate-700 text-amber-900 dark:text-amber-200 font-semibold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}">Polaroid Grid</button>
              <button type="button" data-mem-mode="timeline" class="px-3 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer ${viewMode === 'timeline' ? 'bg-amber-100 dark:bg-slate-700 text-amber-900 dark:text-amber-200 font-semibold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}">Life Timeline</button>
            </div>
            <button type="button" data-mem-open-add class="px-4 py-2 rounded-2xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>Preserve Memory</span>
            </button>
          </div>
        </div>

        ${mainContentHtml}
        ${detailModalHtml}
        ${addModalHtml}
        ${confirmModalHtml}
      </div>
    `;

    renderIcons(container);

    container.querySelectorAll('[data-mem-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        viewMode = btn.getAttribute('data-mem-mode');
        render();
      });
    });

    container.querySelectorAll('[data-mem-open-add]').forEach((btn) => {
      btn.addEventListener('click', () => {
        formState = {
          title: '',
          description: '',
          date: todayIso(),
          location: '',
          coverImage: '',
          photos: [],
          extraPhotoUrl: '',
          extraPhotoCaption: '',
        };
        showAddModal = true;
        render();
      });
    });

    container.querySelectorAll('[data-mem-card]').forEach((card) => {
      card.addEventListener('click', () => {
        const mem = memories.find((m) => m.id === card.getAttribute('data-mem-card'));
        if (mem) {
          selectedMemory = mem;
          formState.extraPhotoUrl = '';
          formState.extraPhotoCaption = '';
          render();
        }
      });
    });

    container.querySelectorAll('[data-mem-fav]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const mem = memories.find((m) => m.id === btn.getAttribute('data-mem-fav'));
        if (!mem) return;
        const updated = !mem.is_favorite;
        try {
          await api.updateMemory(mem.id, { is_favorite: updated });
          memories = memories.map((m) => (m.id === mem.id ? { ...m, is_favorite: updated } : m));
          if (selectedMemory?.id === mem.id) selectedMemory = { ...selectedMemory, is_favorite: updated };
          render();
        } catch (err) {
          console.error('Error updating favorite:', err);
        }
      });
    });

    container.querySelectorAll('[data-mem-close-detail]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedMemory = null;
        render();
      });
    });

    container.querySelector('[data-mem-export-pdf]')?.addEventListener('click', () => {
      if (selectedMemory) {
        exportMemoryToPDF(selectedMemory);
        showToast('Memory exported as formatted PDF 📄');
      }
    });

    container.querySelector('[data-mem-attach-photo]')?.addEventListener('click', async () => {
      if (!selectedMemory) return;
      const urlInput = container.querySelector('[data-mem-existing-photo-url]');
      const capInput = container.querySelector('[data-mem-existing-photo-caption]');
      const url = (urlInput?.value || '').trim();
      const caption = (capInput?.value || '').trim();
      if (!url) return;
      try {
        const res = await api.addMemoryPhoto(selectedMemory.id, { image_path: url, caption });
        if (res.success) {
          const nextPhotos = [...(selectedMemory.photos || []), res.photo];
          const updated = { ...selectedMemory, photos: nextPhotos };
          selectedMemory = updated;
          memories = memories.map((m) => (m.id === selectedMemory.id ? updated : m));
          formState.extraPhotoUrl = '';
          formState.extraPhotoCaption = '';
          showToast('Photo added to album ✨');
        }
      } catch (err) {
        showToast(err.message || 'Failed to add photo.');
      }
    });

    container.querySelectorAll('[data-mem-del-photo]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const photoId = btn.getAttribute('data-mem-del-photo');
        pendingConfirm = {
          title: 'Delete Photo?',
          message: 'Are you sure you want to delete this specific photo from the memory?',
          confirmLabel: 'Delete Photo',
          onConfirm: async () => {
            try {
              const res = await api.deletePhoto(photoId);
              if (res.success && selectedMemory) {
                const nextPhotos = (selectedMemory.photos || []).filter((p) => p.id !== photoId);
                const updated = { ...selectedMemory, photos: nextPhotos };
                selectedMemory = updated;
                memories = memories.map((m) => (m.id === selectedMemory.id ? updated : m));
                showToast('Specific photo deleted from memory 📸');
              }
            } catch (err) {
              showToast(err.message || 'Failed to delete photo.');
            }
          },
        };
        render();
      });
    });

    container.querySelectorAll('[data-mem-del-part]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!selectedMemory) return;
        const part = btn.getAttribute('data-mem-del-part');
        const labels = {
          location: 'location tag',
          description: 'story description',
          cover_image: 'cover photo',
        };
        pendingConfirm = {
          title: 'Delete Memory Part?',
          message: `Are you sure you want to delete the ${labels[part]} from this memory?`,
          confirmLabel: 'Remove',
          onConfirm: async () => {
            try {
              const updates = {};
              if (part === 'location') updates.location = '';
              if (part === 'description') updates.description = '';
              if (part === 'cover_image') updates.cover_image = SAMPLE_PRESETS[0].url;
              const res = await api.updateMemory(selectedMemory.id, updates);
              if (res.success) {
                const updated = { ...selectedMemory, ...updates };
                selectedMemory = updated;
                memories = memories.map((m) => (m.id === selectedMemory.id ? updated : m));
                showToast(`Specific part (${labels[part]}) deleted.`);
              }
            } catch (err) {
              showToast(err.message || 'Failed to delete specific part.');
            }
          },
        };
        render();
      });
    });

    container.querySelector('[data-mem-del-entire]')?.addEventListener('click', () => {
      if (!selectedMemory) return;
      const targetId = selectedMemory.id;
      pendingConfirm = {
        title: 'Delete Entire Memory?',
        message: 'Are you sure you want to permanently remove this memory album?',
        confirmLabel: 'Delete Memory',
        onConfirm: async () => {
          try {
            const res = await api.deleteMemory(targetId);
            if (res.success) {
              memories = memories.filter((m) => m.id !== targetId);
              selectedMemory = null;
              showToast('Memory removed.');
            }
          } catch (err) {
            showToast(err.message || 'Failed to delete memory.');
          }
        },
      };
      render();
    });

    container.querySelectorAll('[data-mem-close-add]').forEach((btn) => {
      btn.addEventListener('click', () => {
        showAddModal = false;
        render();
      });
    });

    const syncAddFormInputs = () => {
      const form = container.querySelector('[data-mem-form]');
      if (!form) return;
      formState.title = form.querySelector('[name="title"]')?.value || '';
      formState.date = form.querySelector('[name="date"]')?.value || todayIso();
      formState.location = form.querySelector('[name="location"]')?.value || '';
      formState.description = form.querySelector('[name="description"]')?.value || '';
      formState.coverImage = form.querySelector('[name="coverImage"]')?.value || '';
      formState.extraPhotoUrl = form.querySelector('[data-mem-new-extra-url]')?.value || '';
      formState.extraPhotoCaption = form.querySelector('[data-mem-new-extra-caption]')?.value || '';
    };

    container.querySelectorAll('[data-mem-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        syncAddFormInputs();
        const preset = SAMPLE_PRESETS[Number(btn.getAttribute('data-mem-preset'))];
        if (!preset) return;
        formState.coverImage = preset.url;
        if (!formState.title) formState.title = preset.title;
        if (!formState.location) formState.location = preset.location;
        render();
      });
    });

    container.querySelector('[data-mem-add-extra]')?.addEventListener('click', () => {
      syncAddFormInputs();
      if (!formState.extraPhotoUrl.trim()) return;
      formState.photos = [
        ...formState.photos,
        { image_path: formState.extraPhotoUrl.trim(), caption: formState.extraPhotoCaption.trim() },
      ];
      formState.extraPhotoUrl = '';
      formState.extraPhotoCaption = '';
      render();
    });

    container.querySelectorAll('[data-mem-remove-extra]').forEach((btn) => {
      btn.addEventListener('click', () => {
        syncAddFormInputs();
        const idx = Number(btn.getAttribute('data-mem-remove-extra'));
        formState.photos = formState.photos.filter((_, i) => i !== idx);
        render();
      });
    });

    container.querySelector('[data-mem-form]')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      syncAddFormInputs();
      if (!formState.title.trim()) {
        showToast('Please enter a memory title.');
        return;
      }
      try {
        const res = await api.createMemory({
          title: formState.title.trim(),
          description: formState.description.trim(),
          memory_date: formState.date,
          location: formState.location.trim(),
          cover_image: formState.coverImage.trim() || SAMPLE_PRESETS[0].url,
          photos: formState.photos,
        });
        if (res.success) {
          memories = [res.memory, ...memories];
          showAddModal = false;
          showToast('Memory preserved forever 📸');
        }
      } catch (err) {
        showToast(err.message || 'Unable to save memory.');
      }
    });

    container.querySelector('[data-mem-confirm-cancel]')?.addEventListener('click', () => {
      pendingConfirm = null;
      render();
    });

    container.querySelector('[data-mem-confirm-ok]')?.addEventListener('click', async () => {
      const action = pendingConfirm?.onConfirm;
      pendingConfirm = null;
      if (action) await action();
      render();
    });
  };

  render();

  api
    .getMemories()
    .then((res) => {
      if (!disposed && res.success) {
        memories = res.memories || [];
        if (initialMemoryId) {
          const match = memories.find((m) => m.id === initialMemoryId);
          if (match) selectedMemory = match;
        }
        render();
      }
    })
    .catch((err) => console.error('Error loading memories:', err));

  return () => {
    disposed = true;
    if (toastTimer) clearTimeout(toastTimer);
  };
}

import { api } from '../api.js';
import { escapeHtml, renderIcons, sanitizeUrl, todayIso } from '../utils/dom.js';
import { exportJournalEntriesToPDF } from '../utils/pdfExport.js';
import { mountInlineVoiceRecorder, mountInlineVoiceMemoCard } from './journalVoice.js';
import {
  WALLPAPER_THEMES,
  mountThemeDrawer,
  mountStickerDrawer,
  mountEmojiDrawer,
  mountFontDrawer,
  mountListDrawer,
  openTemplatesModal,
  openPhotoLightboxModal,
} from './journalDrawers.js';

const INSPIRATIONAL_PROMPTS = [
  'What is one gentle thing that made your heart feel lighter today?',
  'Describe a sound, taste, or scent that instantly brought comfort to you.',
  'If you could whisper three encouraging words to yourself right now, what would they be?',
  'Write about a friend or loved one who made you smile recently.',
  'What is a small victory or effort you made this week that deserves celebration?',
  'What did you learn about your boundaries, desires, or dreams lately?',
  'Look around your room: choose one object and write the memories attached to it.',
  'Write a secret wish or intention you hold gently in your heart for the coming days.',
];

const MOOD_EMOJIS = {
  happy: { emoji: '😊', label: 'Happy' },
  calm: { emoji: '😌', label: 'Calm' },
  neutral: { emoji: '😐', label: 'Neutral' },
  sad: { emoji: '😔', label: 'Sad' },
  anxious: { emoji: '😰', label: 'Anxious' },
  angry: { emoji: '😡', label: 'Angry' },
  tired: { emoji: '😴', label: 'Tired' },
  excited: { emoji: '🤩', label: 'Excited' },
  loved: { emoji: '🥰', label: 'Loved' },
  magical: { emoji: '✨', label: 'Magical' },
};

function getFontFamilyClass(id) {
  switch (id) {
    case 'merriweather':
      return 'font-merriweather';
    case 'bold':
      return 'font-black tracking-tight';
    case 'light':
      return 'font-light';
    case 'poly-italic':
      return 'font-poly italic';
    case 'floane':
      return 'font-floane tracking-wide';
    case 'cursive':
      return 'font-cursive text-lg';
    case 'aileron':
      return 'font-aileron';
    default:
      return 'font-sans';
  }
}

export function renderJournalView(
  container,
  { initialEntryId = null, onClearInitialEntryId, initialPrompt = null, initialTitle = null, onClearPrompt } = {}
) {
  let entries = [];
  let selectedEntry = null;
  let isEditing = false;
  let searchQuery = '';
  let filterMood = 'all';
  let filterFavorites = false;
  let filterVoiceOnly = false;
  let loading = true;

  // Entry editor state
  let title = '';
  let content = '';
  let entryDate = todayIso();
  let mood = 'calm';
  let isFavorite = false;
  let isPrivate = true;
  let fontFamily = 'merriweather';
  let textColor = 'inherit';
  let fontSizePreset = 'body';
  let textAlignment = 'left';
  let wallpaperTheme = 'original';
  let bulletStyle = 'check';
  let tags = ['Daily', 'Reflection'];
  let stickers = [];
  let photos = [];
  let currentAudioUrl = null;
  let currentAudioDuration = null;
  let audioClips = [];

  let cursorPosition = 0;
  let isRecordingInlineVoice = false;
  let inlineRecordPosition = null;
  let isMenuOpen = false;
  let isPromptActive = false;
  let isEyesProtectionActive = false;
  let isPreviewMode = false;
  let currentPromptIndex = 0;
  let activeDrawer = 'none';
  let showMoodPicker = false;
  let showDeleteConfirmModal = false;
  let showPaperModal = false;
  let paperModalTab = 'info';
  let copiedUrl = false;
  let isDownloading = null;
  let toastMessage = null;
  let toastTimer = null;

  let cleanupRecorder = null;
  let voiceCardCleanups = [];
  let disposed = false;

  const cleanupVoiceWidgets = () => {
    if (cleanupRecorder) {
      cleanupRecorder();
      cleanupRecorder = null;
    }
    voiceCardCleanups.forEach((fn) => fn());
    voiceCardCleanups = [];
  };

  const showToast = (msg) => {
    toastMessage = msg;
    renderToastDom();
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastMessage = null;
      renderToastDom();
    }, 3000);
  };

  const renderToastDom = () => {
    const slot = container.querySelector('[data-j-toast-slot]');
    if (!slot) return;
    slot.innerHTML = toastMessage
      ? `<div class="fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl bg-slate-900/95 text-white text-xs font-medium shadow-2xl border border-purple-500/30 animate-in fade-in slide-in-from-bottom-2 duration-200">${escapeHtml(toastMessage)}</div>`
      : '';
  };

  const syncCountsDom = () => {
    const charCount = (title + content).length;
    const wordCount = (title + ' ' + content)
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    const charEl = container.querySelector('[data-j-char-count]');
    const wordEl = container.querySelector('[data-j-word-count]');
    if (charEl) charEl.textContent = String(charCount);
    if (wordEl) wordEl.textContent = String(wordCount);
  };

  const getFilteredEntries = () => {
    return entries.filter((e) => {
      if (filterVoiceOnly && !e.audio_url && !e.has_audio && !(e.audio_clips && e.audio_clips.length)) return false;
      if (filterMood !== 'all' && e.mood !== filterMood) return false;
      if (filterFavorites && !e.is_favorite) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (e.title || '').toLowerCase().includes(q) || (e.content || '').toLowerCase().includes(q);
      }
      return true;
    });
  };

  const applyEntryToEditor = (entry) => {
    selectedEntry = entry;
    title = entry.title || '';
    content = entry.content || '';
    entryDate = entry.entry_date || todayIso();
    mood = entry.mood || 'calm';
    isFavorite = !!entry.is_favorite;
    isPrivate = entry.is_private !== false;
    fontFamily = entry.font_family || 'merriweather';
    textColor = entry.text_color || 'inherit';
    fontSizePreset = entry.font_size_preset || 'body';
    textAlignment = entry.text_align || 'left';
    wallpaperTheme = entry.wallpaper_theme || 'original';
    bulletStyle = entry.bullet_style || 'check';
    tags = entry.tags && entry.tags.length > 0 ? [...entry.tags] : ['Reflection'];
    isEyesProtectionActive = !!entry.eyes_protection;
    isPromptActive = !!entry.prompt_active;
    stickers = entry.stickers ? [...entry.stickers] : [];
    photos = entry.photos ? [...entry.photos] : [];
    currentAudioUrl = entry.audio_url || null;
    currentAudioDuration = entry.audio_duration || null;
    audioClips = entry.audio_clips ? [...entry.audio_clips] : [];
    cursorPosition = content.length;
    isPreviewMode = false;
    activeDrawer = 'none';
    isEditing = false;
    isRecordingInlineVoice = false;
    inlineRecordPosition = null;
  };

  const startNewEntry = (overridePrompt = null, overrideTitle = null) => {
    selectedEntry = null;
    title = overrideTitle || '';
    content = overridePrompt || '';
    entryDate = todayIso();
    mood = 'calm';
    isFavorite = false;
    isPrivate = true;
    fontFamily = 'merriweather';
    textColor = 'inherit';
    fontSizePreset = 'body';
    textAlignment = 'left';
    wallpaperTheme = 'original';
    bulletStyle = 'check';
    tags = ['Daily', 'Memories'];
    stickers = [];
    photos = [];
    currentAudioUrl = null;
    currentAudioDuration = null;
    audioClips = [];
    cursorPosition = content.length;
    isPreviewMode = false;
    isEyesProtectionActive = false;
    isPromptActive = false;
    activeDrawer = 'none';
    isEditing = true;
    isRecordingInlineVoice = false;
    inlineRecordPosition = null;
  };

  const insertAtCursor = (textToInsert) => {
    const ta = container.querySelector('[data-j-content]');
    const pos = ta ? ta.selectionStart : cursorPosition || content.length;
    const before = content.slice(0, pos);
    const after = content.slice(pos);
    content = before + textToInsert + after;
    cursorPosition = pos + textToInsert.length;
    if (ta) {
      ta.value = content;
      ta.selectionStart = cursorPosition;
      ta.selectionEnd = cursorPosition;
      ta.focus();
      syncCountsDom();
    } else {
      render();
    }
    showToast(`Inserted "${textToInsert.trim()}" into entry ✨`);
  };

  const handleStartInlineVoiceRecord = () => {
    if (!isEditing) {
      isEditing = true;
    }
    const ta = container.querySelector('[data-j-content]');
    inlineRecordPosition = ta ? ta.selectionStart : cursorPosition !== undefined ? cursorPosition : content.length;
    isRecordingInlineVoice = true;
    render();
  };

  const handleCompleteInlineVoice = (clip) => {
    audioClips = [...audioClips, clip];
    if (!currentAudioUrl) {
      currentAudioUrl = clip.url;
      currentAudioDuration = clip.duration || null;
    }

    const pos = inlineRecordPosition !== null ? inlineRecordPosition : cursorPosition || content.length;
    const before = content.slice(0, pos);
    const after = content.slice(pos);
    const prefix = before.length > 0 && !before.endsWith('\n') ? '\n\n' : '';
    const suffix = after.length > 0 && !after.startsWith('\n') ? '\n\n' : '';
    const tag = `[[voice_memo:${clip.id}]]`;
    content = before + prefix + tag + suffix + after;
    cursorPosition = (before + prefix + tag + suffix).length;
    isRecordingInlineVoice = false;
    inlineRecordPosition = null;
    render();
    showToast('Voice journal recorded & embedded at your cursor! 🎙️✨');
  };

  const handleDeleteInlineVoiceMemo = (clipId) => {
    audioClips = audioClips.filter((c) => c.id !== clipId);
    const regex = new RegExp(`\\n*\\s*\\[\\[voice_memo:${clipId}\\]\\]\\s*\\n*`, 'g');
    content = content.replace(regex, '\n\n').trim();
    render();
    showToast('Voice memo removed from journal 🗑️');
  };

  const handleDeleteSpecificPhoto = async (indexToDelete) => {
    const updatedPhotos = photos.filter((_, i) => i !== indexToDelete);
    photos = updatedPhotos;
    if (selectedEntry) {
      try {
        await api.updateJournal(selectedEntry.id, { photos: updatedPhotos });
        entries = entries.map((e) => (e.id === selectedEntry.id ? { ...e, photos: updatedPhotos } : e));
        selectedEntry = { ...selectedEntry, photos: updatedPhotos };
        render();
        showToast('Photo removed from journal 📷🗑️');
      } catch {
        showToast('Failed to update photos in database');
      }
    } else {
      render();
      showToast('Photo removed from draft 📷🗑️');
    }
  };

  const handleSaveEntry = async () => {
    if (!title.trim() && !content.trim() && !currentAudioUrl && audioClips.length === 0) {
      showToast('Please enter a title, thoughts, or voice recording first.');
      return;
    }

    try {
      const payload = {
        title: title.trim() || (currentAudioUrl || audioClips.length > 0 ? 'Voice Reflection' : 'Untitled Diary Page'),
        content,
        entry_date: entryDate,
        mood,
        is_favorite: isFavorite,
        is_private: isPrivate,
        font_family: fontFamily,
        text_color: textColor,
        font_size_preset: fontSizePreset,
        text_align: textAlignment,
        wallpaper_theme: wallpaperTheme,
        bullet_style: bulletStyle,
        tags,
        eyes_protection: isEyesProtectionActive,
        prompt_active: isPromptActive,
        stickers,
        photos,
        audio_url: currentAudioUrl || undefined,
        audio_duration: currentAudioDuration || undefined,
        audio_clips: audioClips.length > 0 ? audioClips : undefined,
        has_audio: !!currentAudioUrl || audioClips.length > 0,
      };

      if (selectedEntry && selectedEntry.id) {
        const res = await api.updateJournal(selectedEntry.id, payload);
        if (res.success) {
          entries = entries.map((e) => (e.id === selectedEntry.id ? res.entry : e));
          applyEntryToEditor(res.entry);
          render();
          showToast(res.message || 'Saved to your little corner of the world ✨');
        }
      } else {
        const res = await api.createJournal(payload);
        if (res.success) {
          entries = [res.entry, ...entries];
          applyEntryToEditor(res.entry);
          render();
          showToast(res.message || 'Saved to your little corner of the world ✨');
        }
      }
    } catch (err) {
      showToast(err.message || 'Unable to save journal entry.');
    }
  };

  const handleDeleteEntry = async () => {
    if (!selectedEntry) return;
    try {
      const res = await api.deleteJournal(selectedEntry.id);
      if (res.success) {
        const remaining = entries.filter((e) => e.id !== selectedEntry.id);
        entries = remaining;
        showDeleteConfirmModal = false;
        if (remaining.length > 0) {
          applyEntryToEditor(remaining[0]);
        } else {
          selectedEntry = null;
          title = '';
          content = '';
          photos = [];
          audioClips = [];
          isEditing = false;
        }
        render();
        showToast('Journal page removed 🗑️');
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete entry.');
    }
  };

  const handleDownloadPaper = async (url, filename) => {
    isDownloading = filename;
    showToast(`Downloading ${filename}... 📄`);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 4000);
      showToast(`✓ ${filename} downloaded successfully! 🎉`);
    } catch (err) {
      console.warn('Blob download fallback triggered:', err);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      isDownloading = null;
    }
  };

  const renderSidebarListOnly = () => {
    const listContainer = container.querySelector('[data-journal-sidebar-list]');
    if (!listContainer) return;

    const filteredEntries = getFilteredEntries();
    if (filteredEntries.length === 0) {
      listContainer.innerHTML = `
        <div class="p-8 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
          <p>${loading ? 'Opening your journal pages...' : 'No journal entries found.'}</p>
          ${
            !loading
              ? '<button type="button" data-j-empty-write class="mt-3 text-sky-600 font-semibold hover:underline cursor-pointer">Write your first entry 🌷</button>'
              : ''
          }
        </div>`;
      listContainer.querySelector('[data-j-empty-write]')?.addEventListener('click', () => {
        startNewEntry();
        render();
      });
      return;
    }

    listContainer.innerHTML = filteredEntries
      .map((entry) => {
        const isSelected = selectedEntry?.id === entry.id && !isEditing;
        const moodObj = MOOD_EMOJIS[entry.mood || 'neutral'] || { emoji: '📖', label: 'Journal' };
        const hasAudio = !!(entry.audio_url || entry.has_audio || (entry.audio_clips && entry.audio_clips.length));
        const photoCount = entry.photos ? entry.photos.length : 0;
        const cleanPreview = (entry.content || '').replace(/\[\[voice_memo:[^\]]+\]\]/g, '[Voice Reflection]');
        const shortDate = entry.entry_date
          ? new Date(entry.entry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : '';

        return `
          <div data-j-select-entry="${escapeHtml(entry.id)}"
            class="p-4 rounded-3xl border transition-all text-left cursor-pointer group relative ${
              isSelected ? 'bg-sky-50/80 border-sky-300 shadow-sm' : 'bg-white border-slate-200/80 hover:border-slate-300'
            }">
            <div class="flex items-center justify-between mb-1.5">
              <div class="flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
                <span>${moodObj.emoji}</span>
                <span>${escapeHtml(shortDate)}</span>
                ${
                  hasAudio
                    ? '<span class="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-purple-100 text-purple-700 flex items-center gap-0.5"><i data-lucide="mic" class="w-2.5 h-2.5"></i><span>Voice</span></span>'
                    : ''
                }
                ${
                  photoCount > 0
                    ? `<span class="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-100 text-amber-800 flex items-center gap-0.5"><i data-lucide="image" class="w-2.5 h-2.5"></i><span>${photoCount}</span></span>`
                    : ''
                }
              </div>
              <div class="flex items-center gap-1">
                <button type="button" data-j-edit-entry="${escapeHtml(entry.id)}"
                  class="opacity-70 group-hover:opacity-100 text-slate-400 hover:text-purple-600 transition-opacity p-1 cursor-pointer" title="Edit page">
                  <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                </button>
                <button type="button" data-j-del-entry="${escapeHtml(entry.id)}"
                  class="opacity-70 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity p-1 cursor-pointer" title="Delete page">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
                <button type="button" data-j-fav-entry="${escapeHtml(entry.id)}"
                  class="text-slate-300 hover:text-rose-500 transition-colors p-1 cursor-pointer" title="Favorite">
                  <i data-lucide="heart" class="w-3.5 h-3.5 ${entry.is_favorite ? 'fill-rose-500 text-rose-500' : ''}"></i>
                </button>
              </div>
            </div>
            <h3 class="text-xs font-bold text-slate-800 font-serif truncate">${escapeHtml(entry.title)}</h3>
            <p class="text-[11px] text-slate-500 line-clamp-2 mt-1 font-serif">${escapeHtml(cleanPreview)}</p>
            ${
              entry.stickers && entry.stickers.length > 0
                ? `<div class="flex gap-1 mt-2">${entry.stickers
                    .slice(0, 4)
                    .map((st) => `<span class="text-xs">${escapeHtml(st.sticker_type)}</span>`)
                    .join('')}</div>`
                : ''
            }
          </div>`;
      })
      .join('');

    renderIcons(listContainer);

    listContainer.querySelectorAll('[data-j-select-entry]').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-j-select-entry');
        const entry = entries.find((e) => e.id === id);
        if (entry) {
          applyEntryToEditor(entry);
          render();
        }
      });
    });

    listContainer.querySelectorAll('[data-j-edit-entry]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-j-edit-entry');
        const entry = entries.find((item) => item.id === id);
        if (entry) {
          applyEntryToEditor(entry);
          isEditing = true;
          render();
        }
      });
    });

    listContainer.querySelectorAll('[data-j-del-entry]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-j-del-entry');
        const entry = entries.find((item) => item.id === id);
        if (entry) {
          selectedEntry = entry;
          showDeleteConfirmModal = true;
          render();
        }
      });
    });

    listContainer.querySelectorAll('[data-j-fav-entry]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-j-fav-entry');
        const entry = entries.find((item) => item.id === id);
        if (!entry) return;
        const updated = !entry.is_favorite;
        try {
          await api.updateJournal(entry.id, { is_favorite: updated });
          entries = entries.map((item) => (item.id === entry.id ? { ...item, is_favorite: updated } : item));
          if (selectedEntry?.id === entry.id) {
            selectedEntry = { ...selectedEntry, is_favorite: updated };
            isFavorite = updated;
          }
          renderSidebarListOnly();
        } catch (err) {
          console.error('Error toggling favorite:', err);
        }
      });
    });
  };

  const renderPaperModalHtml = () => {
    if (!showPaperModal) return '';
    const pdfDirectUrl = `${window.location.origin}/BORAH_Research_Paper.pdf`;

    const pptDirectUrl = `${window.location.origin}/BORAH_Project_Presentation.pdf`;

    const tabContent =
      paperModalTab === 'viewer'
        ? `
        <div class="space-y-3">
          <div class="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Viewing 13-Page Strictly Monochrome Two-Column IEEE LaTeX Manuscript (Clickable Links):</span>
            <button type="button" data-j-dl-pdf
              class="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer">
              <i data-lucide="download" class="w-3 h-3"></i>
              <span>Save Copy to Disk</span>
            </button>
          </div>
          <iframe src="/BORAH_Research_Paper.pdf#toolbar=1"
            class="w-full h-[62vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white shadow-inner"
            title="BORAH IEEE Research Paper PDF Viewer"></iframe>
        </div>`
        : paperModalTab === 'slides'
          ? `
        <div class="space-y-3">
          <div class="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Viewing 9-Slide Prompt Engineering Project Presentation (Presented by Nivetha M):</span>
            <button type="button" data-j-dl-ppt
              class="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer">
              <i data-lucide="download" class="w-3 h-3"></i>
              <span>Download Presentation PDF</span>
            </button>
          </div>
          <iframe src="/BORAH_Project_Presentation.pdf#toolbar=1"
            class="w-full h-[62vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white shadow-inner"
            title="BORAH Project Presentation PDF Viewer"></iframe>
        </div>`
          : `
        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
          <h4 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
            BORAH: A Multi-Modal Affective Computing Architecture for Privacy-Preserving Voice-Integrated Cognitive Journaling and Longitudinal Emotional Diagnostics
          </h4>
          <div class="text-xs text-slate-600 dark:text-slate-300 space-y-1 pt-1">
            <p><strong class="text-slate-800 dark:text-slate-200">Author 1:</strong> Mrs. Nivetha M (Department of Computer Science &amp; Engineering)</p>
            <p><strong class="text-slate-800 dark:text-slate-200">Author 2:</strong> Mr. Prabu (Department of Artificial Intelligence &amp; Data Science)</p>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              13 Pages • Strict Monochrome (Black &amp; White) • Standard IEEE Two-Column Layout • 28 Verified Hyperlinked Citations • Originality Certified &lt; 3.8%
            </p>
          </div>
        </div>

        <div class="space-y-2.5">
          <button type="button" data-j-dl-ppt
            class="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white flex items-center justify-between shadow-lg shadow-purple-900/20 active:scale-98 transition-all cursor-pointer group">
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-xl bg-white/20 text-white shadow-xs">
                <i data-lucide="presentation" class="w-5 h-5"></i>
              </div>
              <div class="text-left">
                <div class="text-sm font-bold flex items-center gap-2">
                  <span>${isDownloading === 'BORAH_Project_Presentation.pdf' ? 'Downloading Slides...' : 'Download Project Presentation (PDF - 9 Slides)'}</span>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-white/25 text-white uppercase font-bold tracking-wider">PPT Slides PDF</span>
                </div>
                <div class="text-xs text-purple-100">Presented by Nivetha M • Why &amp; How Built, Prompt Engineering, Languages &amp; Live Output Images</div>
              </div>
            </div>
            <i data-lucide="download" class="w-4 h-4 text-white mr-2"></i>
          </button>

          <button type="button" data-j-dl-pdf
            class="w-full p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:from-black hover:via-slate-900 hover:to-black text-white flex items-center justify-between shadow-lg shadow-slate-900/20 active:scale-98 transition-all cursor-pointer group">
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-xl bg-white/20 text-white shadow-xs">
                <i data-lucide="download" class="w-5 h-5"></i>
              </div>
              <div class="text-left">
                <div class="text-sm font-bold flex items-center gap-2">
                  <span>${isDownloading === 'BORAH_Research_Paper.pdf' ? 'Downloading PDF...' : 'Download Research Paper (PDF - 13 Pages)'}</span>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-white/25 text-white uppercase font-bold tracking-wider">Direct Download</span>
                </div>
                <div class="text-xs text-slate-300">IEEE Two-Column Format • Strictly Black &amp; White • 28 Active Clickable Reference Links</div>
              </div>
            </div>
            <i data-lucide="download" class="w-4 h-4 text-white mr-2"></i>
          </button>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button type="button" data-j-dl-docx
              class="p-3.5 rounded-2xl bg-sky-50 hover:bg-sky-100 dark:bg-slate-800 border border-sky-200 dark:border-slate-700 text-sky-950 dark:text-sky-200 flex items-center justify-between shadow-xs active:scale-98 transition-all cursor-pointer group">
              <div class="flex items-center gap-3">
                <div class="p-2 rounded-xl bg-sky-600 text-white"><i data-lucide="file-text" class="w-4 h-4"></i></div>
                <div class="text-left">
                  <div class="text-xs font-bold leading-tight">Word Document (.docx)</div>
                  <div class="text-[10px] text-sky-600 dark:text-sky-400">Editable Academic Draft</div>
                </div>
              </div>
              <i data-lucide="download" class="w-4 h-4 text-sky-600 dark:text-sky-400"></i>
            </button>

            <button type="button" data-j-dl-tex
              class="p-3.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 text-indigo-950 dark:text-indigo-200 flex items-center justify-between shadow-xs active:scale-98 transition-all cursor-pointer group">
              <div class="flex items-center gap-3">
                <div class="p-2 rounded-xl bg-indigo-600 text-white"><i data-lucide="download" class="w-4 h-4"></i></div>
                <div class="text-left">
                  <div class="text-xs font-bold leading-tight">LaTeX Source (.tex)</div>
                  <div class="text-[10px] text-indigo-600 dark:text-indigo-400">IEEEtran Journal Template</div>
                </div>
              </div>
              <i data-lucide="download" class="w-4 h-4 text-indigo-600 dark:text-indigo-400"></i>
            </button>
          </div>
        </div>

        <div class="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <i data-lucide="external-link" class="w-3.5 h-3.5 text-purple-600"></i>
              <span>Direct Browser PDF Link (If Iframe Blocks Downloads):</span>
            </span>
            <button type="button" data-j-copy-pdf class="text-[11px] font-semibold text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1 cursor-pointer">
              <i data-lucide="${copiedUrl ? 'check-check' : 'copy'}" class="w-3 h-3 ${copiedUrl ? 'text-emerald-500' : ''}"></i>
              <span>${copiedUrl ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
          <div class="flex items-center gap-2">
            <input type="text" readonly value="${escapeHtml(pdfDirectUrl)}"
              class="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 select-all font-mono" />
            <a href="/BORAH_Research_Paper.pdf" target="_blank" rel="noopener noreferrer"
              class="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1 shrink-0 shadow-xs">
              <span>Paper Tab</span>
              <i data-lucide="external-link" class="w-3 h-3"></i>
            </a>
          </div>
          <div class="flex items-center gap-2">
            <input type="text" readonly value="${escapeHtml(pptDirectUrl)}"
              class="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 select-all font-mono" />
            <a href="/BORAH_Project_Presentation.pdf" target="_blank" rel="noopener noreferrer"
              class="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1 shrink-0 shadow-xs">
              <span>Slides Tab</span>
              <i data-lucide="external-link" class="w-3 h-3"></i>
            </a>
          </div>
        </div>

        <div class="space-y-2 pt-1">
          <div class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Manuscript Sections &amp; Quality Metrics</div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div class="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"><div class="text-sm font-bold text-sky-600">I – X</div><div class="text-[10px] text-slate-500">IEEE Sections</div></div>
            <div class="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"><div class="text-sm font-bold text-emerald-600">&lt; 3.8%</div><div class="text-[10px] text-slate-500">Plagiarism Index</div></div>
            <div class="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"><div class="text-sm font-bold text-purple-600">28 Papers</div><div class="text-[10px] text-slate-500">Clickable DOIs</div></div>
            <div class="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"><div class="text-sm font-bold text-pink-600">F1 = 0.914</div><div class="text-[10px] text-slate-500">Affective F1</div></div>
          </div>
        </div>

        <div class="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Seminal References (Click to Open Paper in Browser):</span>
            <span class="text-[10px] text-sky-600 dark:text-sky-400 font-medium">28 Active DOIs</span>
          </div>
          <div class="max-h-40 overflow-y-auto space-y-2 pr-1 text-xs text-slate-600 dark:text-slate-300">
            <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span class="font-semibold text-sky-700 dark:text-sky-400">[1]</span> J. W. Pennebaker, "Writing about emotional experiences as a therapeutic process," <em>Psychological Science</em>, 1997.
              <a href="https://doi.org/10.1111/j.1467-9280.1997.tb00403.x" target="_blank" rel="noreferrer noopener" class="text-sky-600 hover:underline break-all block text-[11px] mt-0.5">https://doi.org/10.1111/j.1467-9280.1997.tb00403.x ↗</a>
            </div>
            <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span class="font-semibold text-sky-700 dark:text-sky-400">[5]</span> C. Busso et al., "IEMOCAP: Interactive emotional dyadic motion capture database," <em>Language Resources and Evaluation</em>, 2008.
              <a href="https://doi.org/10.1007/s10579-008-9076-6" target="_blank" rel="noreferrer noopener" class="text-sky-600 hover:underline break-all block text-[11px] mt-0.5">https://doi.org/10.1007/s10579-008-9076-6 ↗</a>
            </div>
            <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span class="font-semibold text-sky-700 dark:text-sky-400">[7]</span> F. Eyben et al., "openSMILE: The Munich versatile and fast open-source audio feature extractor," <em>ACM MM</em>, 2010.
              <a href="https://doi.org/10.1145/1873951.1874246" target="_blank" rel="noreferrer noopener" class="text-sky-600 hover:underline break-all block text-[11px] mt-0.5">https://doi.org/10.1145/1873951.1874246 ↗</a>
            </div>
            <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span class="font-semibold text-sky-700 dark:text-sky-400">[14]</span> A. Radford et al., "Robust speech recognition via large-scale weak supervision," <em>ICML</em>, 2023.
              <a href="https://arxiv.org/abs/2212.04356" target="_blank" rel="noreferrer noopener" class="text-sky-600 hover:underline break-all block text-[11px] mt-0.5">https://arxiv.org/abs/2212.04356 ↗</a>
            </div>
            <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span class="font-semibold text-sky-700 dark:text-sky-400">[15]</span> A. Baevski et al., "wav2vec 2.0: A framework for self-supervised learning of speech representations," <em>NeurIPS</em>, 2020.
              <a href="https://arxiv.org/abs/2006.11477" target="_blank" rel="noreferrer noopener" class="text-sky-600 hover:underline break-all block text-[11px] mt-0.5">https://arxiv.org/abs/2006.11477 ↗</a>
            </div>
          </div>
        </div>`;

    return `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-6 max-h-[92vh] overflow-y-auto">
          <div class="flex items-start justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs">
                <i data-lucide="file-text" class="w-5 h-5"></i>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300">IEEE TRANSACTIONS FORMAT</span>
                  <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">ORIGINALITY VERIFIED &lt; 4%</span>
                </div>
                <h3 class="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">Academic Research Paper</h3>
              </div>
            </div>
            <button type="button" data-j-close-paper class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <div class="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
            <button type="button" data-j-paper-tab="info"
              class="flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                paperModalTab === 'info' ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }">
              <i data-lucide="download" class="w-3.5 h-3.5"></i>
              <span>Downloads &amp; Citations</span>
            </button>
            <button type="button" data-j-paper-tab="slides"
              class="flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                paperModalTab === 'slides' ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }">
              <i data-lucide="presentation" class="w-3.5 h-3.5"></i>
              <span>Project Slides (9 Pages)</span>
            </button>
            <button type="button" data-j-paper-tab="viewer"
              class="flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                paperModalTab === 'viewer' ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }">
              <i data-lucide="eye" class="w-3.5 h-3.5"></i>
              <span>Research Paper PDF</span>
            </button>
          </div>

          ${tabContent}

          <div class="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
            <span class="text-[11px] text-slate-500 dark:text-slate-400">Authors: Mrs. Nivetha M &amp; Mr. Prabu</span>
            <button type="button" data-j-close-paper class="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer">
              Close Window
            </button>
          </div>
        </div>
      </div>
    `;
  };

  const render = () => {
    if (disposed) return;
    cleanupVoiceWidgets();

    const currentWallpaperConfig = WALLPAPER_THEMES.find((w) => w.id === wallpaperTheme) || WALLPAPER_THEMES[0];
    const entryDateObj = new Date(entryDate || new Date());
    const dayNumber = isNaN(entryDateObj.getTime()) ? new Date().getDate() : entryDateObj.getDate();
    const monthAbbr = isNaN(entryDateObj.getTime())
      ? new Date().toLocaleDateString('en-US', { month: 'short' })
      : entryDateObj.toLocaleDateString('en-US', { month: 'short' });
    const dayOfWeek = isNaN(entryDateObj.getTime())
      ? new Date().toLocaleDateString('en-US', { weekday: 'long' })
      : entryDateObj.toLocaleDateString('en-US', { weekday: 'long' });

    const charCount = (title + content).length;
    const wordCount = (title + ' ' + content)
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;

    const moodFilterButtons = Object.entries(MOOD_EMOJIS)
      .map(
        ([k, v]) => `
        <button type="button" data-j-filter-mood="${k}"
          class="px-1.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${filterMood === k ? 'bg-sky-100' : 'hover:bg-slate-100'}"
          title="${escapeHtml(v.label)}">${v.emoji}</button>`
      )
      .join('');

    const moodPickerHtml = showMoodPicker
      ? `<div class="absolute right-0 top-12 bg-white rounded-2xl shadow-xl border border-gray-100 p-2.5 grid grid-cols-5 gap-2 z-30 animate-in fade-in">
          ${Object.entries(MOOD_EMOJIS)
            .map(
              ([k, v]) => `
            <button type="button" data-j-pick-mood="${k}"
              class="w-9 h-9 rounded-xl flex items-center justify-center text-xl hover:bg-purple-50 hover:scale-115 transition-all cursor-pointer ${
                mood === k ? 'ring-2 ring-sky-500 bg-sky-50' : ''
              }" title="${escapeHtml(v.label)}">${v.emoji}</button>`
            )
            .join('')}
        </div>`
      : '';

    const photosGalleryHtml =
      photos.length > 0
        ? `
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs text-gray-500">
            <span class="font-bold uppercase tracking-wider font-serif">Memory Gallery (${photos.length})</span>
            <span class="text-[11px] text-gray-500 font-medium">Click to zoom • Trash icon to delete photo</span>
          </div>
          <div class="grid gap-3 ${photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}">
            ${photos
              .map(
                (p, idx) => `
              <div class="group relative h-44 sm:h-52 rounded-2xl overflow-hidden shadow-md border border-white/60 bg-black/5">
                <img src="${escapeHtml(sanitizeUrl(p))}" alt="Memory snapshot" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <button type="button" data-j-zoom-photo="${idx}"
                  class="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center shadow-md transition-all cursor-pointer"
                  title="Inspect Photo">
                  <i data-lucide="search" class="w-3.5 h-3.5"></i>
                </button>
                <button type="button" data-j-del-photo="${idx}"
                  class="absolute bottom-2 right-2 p-1.5 rounded-full bg-rose-600/95 text-white opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-700 shadow-md cursor-pointer"
                  title="Delete this photo">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>`
              )
              .join('')}
          </div>
        </div>`
        : '';

    const menuDropdownHtml = isMenuOpen
      ? `
      <div class="absolute right-0 top-11 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 p-4 z-40 animate-in fade-in slide-in-from-top-2 text-gray-800">
        <div class="flex items-center justify-between py-2 border-b border-gray-100">
          <span class="text-sm font-semibold font-serif">Prompt</span>
          <button type="button" data-j-toggle-prompt
            class="w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${isPromptActive ? 'bg-sky-500 justify-end' : 'bg-gray-300 justify-start'}">
            <div class="bg-white w-4 h-4 rounded-full shadow-md"></div>
          </button>
        </div>

        <button type="button" data-j-open-templates
          class="w-full text-left py-2.5 text-sm font-semibold hover:text-sky-600 transition-colors flex items-center justify-between border-b border-gray-100 cursor-pointer">
          <span class="font-serif">Templates</span>
          <i data-lucide="chevron-right" class="w-4 h-4 text-gray-400"></i>
        </button>

        <button type="button" data-j-toggle-preview
          class="w-full text-left py-2.5 text-sm font-semibold hover:text-sky-600 transition-colors flex items-center justify-between border-b border-gray-100 cursor-pointer">
          <span class="font-serif">${isPreviewMode ? 'Edit Mode' : 'Preview'}</span>
          <i data-lucide="eye" class="w-4 h-4 text-gray-400"></i>
        </button>

        <div class="flex items-center justify-between py-2 border-b border-gray-100">
          <div>
            <span class="text-sm font-semibold font-serif block">Eyes protection</span>
            <span class="text-[10px] text-gray-400">Warm reading filter</span>
          </div>
          <button type="button" data-j-toggle-eyes
            class="w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${isEyesProtectionActive ? 'bg-amber-500 justify-end' : 'bg-gray-300 justify-start'}">
            <div class="bg-white w-4 h-4 rounded-full shadow-md"></div>
          </button>
        </div>

        <div class="pt-3 text-xs text-gray-600 space-y-1">
          <div class="flex justify-between"><span class="font-serif">Character:</span><span data-j-char-count class="font-bold text-gray-900">${charCount}</span></div>
          <div class="flex justify-between"><span class="font-serif">Word:</span><span data-j-word-count class="font-bold text-gray-900">${wordCount}</span></div>
        </div>
      </div>`
      : '';

    const promptBannerHtml = isPromptActive
      ? `
      <div class="mx-4 sm:mx-8 mt-3 p-3.5 rounded-2xl bg-amber-100/90 border border-amber-300 text-amber-950 text-xs flex items-center justify-between gap-3 shadow-sm animate-in slide-in-from-top-1">
        <div class="flex items-center gap-2">
          <i data-lucide="lightbulb" class="w-4 h-4 text-amber-600 shrink-0"></i>
          <p class="font-medium font-serif italic">"${escapeHtml(INSPIRATIONAL_PROMPTS[currentPromptIndex])}"</p>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button type="button" data-j-next-prompt class="p-1 rounded-lg hover:bg-amber-200/80 text-amber-900 transition-colors cursor-pointer" title="Next Prompt">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
          </button>
          <button type="button" data-j-insert-prompt class="px-2.5 py-1 bg-amber-700 text-white rounded-lg text-[11px] font-bold hover:bg-amber-800 cursor-pointer">
            Insert
          </button>
        </div>
      </div>`
      : '';

    const fontClass = getFontFamilyClass(fontFamily);
    const customColorStyle = textColor !== 'inherit' ? `color:${escapeHtml(textColor)};` : '';
    const alignStyle = `text-align:${escapeHtml(textAlignment)};`;

    const titleSectionHtml =
      isEditing && !isPreviewMode
        ? `<input type="text" data-j-title placeholder="My Birthday, A Quiet Thought, Today's Story..." value="${escapeHtml(title)}"
            style="${customColorStyle}"
            class="w-full text-xl sm:text-2xl font-bold bg-transparent border-none focus:outline-none placeholder-gray-400 ${fontClass}" />`
        : `<h2 style="${customColorStyle}" class="text-2xl sm:text-3xl font-bold tracking-tight ${fontClass}">
            ${escapeHtml(title || 'Untitled Journal Page')}
          </h2>`;

    const voiceToolbarHtml =
      isEditing && !isPreviewMode
        ? `
        <div class="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 shadow-2xs">
          <div class="flex items-center gap-2 text-xs text-purple-900 dark:text-purple-300 font-medium">
            <i data-lucide="mic" class="w-4 h-4 text-purple-600 animate-pulse"></i>
            <span class="font-semibold">Voice Journal:</span>
            <span class="hidden sm:inline text-[11px] text-purple-700/80 dark:text-purple-400">
              Tap below to record and insert your voice note at cursor position!
            </span>
          </div>
          <button type="button" data-j-record-inline
            class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
            title="Record voice note directly at your current cursor position">
            <i data-lucide="mic" class="w-3.5 h-3.5"></i>
            <span>Record Voice Note Here 🎙️</span>
          </button>
        </div>`
        : '';

    const editorContentHtml =
      isEditing && !isPreviewMode
        ? `
        <div class="space-y-4">
          <textarea data-j-content rows="12"
            placeholder="Write your story here... Tap 'Record Voice Note Here' above to record and place your voice reflections into your writing!"
            style="${customColorStyle}${alignStyle}"
            class="w-full bg-transparent border-none focus:outline-none resize-none leading-relaxed text-sm sm:text-base placeholder-gray-400 ${fontClass}">${escapeHtml(content)}</textarea>
          ${
            audioClips.length > 0
              ? `<div class="pt-3 border-t border-purple-100 dark:border-purple-900/40">
                  <div class="text-[11px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 flex items-center gap-1.5 mb-2">
                    <i data-lucide="mic" class="w-3.5 h-3.5 text-purple-600"></i>
                    <span>Voice Notes (${audioClips.length})</span>
                  </div>
                  <div data-j-edit-clips class="space-y-2"></div>
                </div>`
              : ''
          }
        </div>`
        : `<div data-j-read-body style="${customColorStyle}${alignStyle}" class="leading-relaxed text-sm sm:text-base whitespace-pre-wrap font-serif ${fontClass}"></div>`;

    const stickersHtml = stickers
      .map(
        (stk) =>
          `<div class="inline-block text-2xl m-1 select-none hover:scale-125 transition-transform"><span>${escapeHtml(stk.sticker_type)}</span></div>`
      )
      .join('');

    const tagsHtml =
      tags && tags.length > 0
        ? `<div class="flex flex-wrap gap-1.5 pt-2">${tags
            .map(
              (t) =>
                `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-black/5 dark:bg-white/10 opacity-80">#${escapeHtml(t)}</span>`
            )
            .join('')}</div>`
        : '';

    const deleteModalHtml = showDeleteConfirmModal
      ? `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
            <i data-lucide="trash-2" class="w-6 h-6"></i>
          </div>
          <div class="text-center">
            <h3 class="text-base font-bold text-slate-800 dark:text-slate-100">Delete Journal Page?</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Are you sure you want to permanently delete "${escapeHtml(selectedEntry?.title || 'this page')}"? This action cannot be undone.
            </p>
          </div>
          <div class="flex items-center gap-3 pt-2">
            <button type="button" data-j-cancel-del class="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer">Cancel</button>
            <button type="button" data-j-confirm-del class="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow cursor-pointer">Delete Page</button>
          </div>
        </div>
      </div>`
      : '';

    container.innerHTML = `
      <div class="space-y-6 pb-20 relative">
        <div data-j-toast-slot></div>
        <div data-j-overlay-slot></div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            ${
              isEditing
                ? `<button type="button" data-j-back-view class="p-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer" title="Return to Journal View">
                    <i data-lucide="arrow-left" class="w-4 h-4"></i>
                  </button>`
                : ''
            }
            <div>
              <h1 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-serif flex items-center gap-2">
                <span>${isEditing ? 'Journal Studio' : 'My Digital Journal'}</span>
                <span class="text-sm font-sans font-normal text-slate-400">(${entries.length} pages)</span>
              </h1>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Personalized digital journaling, photo memories, stickers, and voice reflections.
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2.5">
            <button type="button" data-j-open-ppt
              class="px-3.5 py-2 rounded-2xl text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/80 hover:bg-purple-100 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="View or Download 9-Slide Project Presentation PDF by Nivetha M">
              <i data-lucide="presentation" class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400"></i>
              <span>Presentation PDF</span>
            </button>

            <button type="button" data-j-open-paper
              class="px-3.5 py-2 rounded-2xl text-xs font-semibold text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/80 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Download IEEE Format Research Paper (.pdf, .docx & .tex) by Mrs. Nivetha M & Mr. Prabu">
              <i data-lucide="file-text" class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400"></i>
              <span>Research Paper 📄</span>
            </button>

            ${
              entries.length > 0
                ? `<button type="button" data-j-export-all
                    class="px-3.5 py-2 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer">
                    <i data-lucide="download" class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400"></i>
                    <span>Export PDF</span>
                  </button>`
                : ''
            }

            <button type="button" data-j-voice-top
              class="px-3.5 py-2 rounded-2xl text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/80 hover:bg-purple-100 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Record a voice journal and embed it directly into your writing">
              <i data-lucide="mic" class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400"></i>
              <span>Voice Journal 🎙️</span>
            </button>

            <button type="button" data-j-new-page
              class="px-4 py-2 rounded-2xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>Write New Page</span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div class="lg:col-span-4 space-y-4">
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div class="relative">
                <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                <input type="text" data-journal-search placeholder="Search entries or memories..." value="${escapeHtml(searchQuery)}"
                  class="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-400" />
              </div>

              <div class="flex items-center justify-between text-xs pt-1">
                <div class="flex items-center gap-1 overflow-x-auto pb-1 max-w-[220px]">
                  <button type="button" data-j-filter-all
                    class="px-2 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                      filterMood === 'all' && !filterVoiceOnly ? 'bg-sky-500 text-white' : 'text-slate-500 hover:bg-slate-100'
                    }">All</button>
                  <button type="button" data-j-filter-voice
                    class="px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                      filterVoiceOnly ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-700 hover:bg-purple-50'
                    }">
                    <i data-lucide="mic" class="w-2.5 h-2.5"></i>
                    <span>Voice</span>
                  </button>
                  ${moodFilterButtons}
                </div>

                <button type="button" data-j-filter-fav
                  class="p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                    filterFavorites ? 'bg-rose-100 text-rose-600 font-semibold' : 'text-slate-400 hover:text-rose-500'
                  }" title="Filter Favorites">
                  <i data-lucide="heart" class="w-3.5 h-3.5 ${filterFavorites ? 'fill-rose-500 text-rose-500' : ''}"></i>
                  <span class="text-[10px]">Starred</span>
                </button>
              </div>
            </div>

            <div data-journal-sidebar-list class="space-y-2 max-h-[600px] overflow-y-auto pr-1"></div>
          </div>

          <div class="lg:col-span-8">
            <div class="relative rounded-3xl shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between min-h-[660px] ${currentWallpaperConfig.canvasClass} ${
              isEyesProtectionActive ? 'eyes-protection-filter' : ''
            }">
              <div class="p-3 sm:p-4 border-b border-black/10 flex items-center justify-between gap-3 bg-white/60 backdrop-blur-md z-20">
                <div class="flex items-center gap-2">
                  <button type="button" data-j-toggle-edit class="p-1.5 rounded-xl hover:bg-black/5 text-gray-700 transition-colors cursor-pointer" title="Toggle Edit / View">
                    <i data-lucide="arrow-left" class="w-4 h-4"></i>
                  </button>
                  <span class="text-xs font-bold uppercase tracking-wider text-gray-600">
                    ${isEditing ? 'Editing Page' : 'Reading Mode'}
                  </span>
                </div>

                <div class="flex items-center gap-2 relative">
                  <div class="relative">
                    <button type="button" data-j-toggle-menu class="p-2 rounded-xl hover:bg-black/5 text-gray-700 transition-colors cursor-pointer" title="Menu Options">
                      <i data-lucide="more-horizontal" class="w-5 h-5"></i>
                    </button>
                    ${menuDropdownHtml}
                  </div>

                  ${
                    selectedEntry
                      ? `<button type="button" data-j-delete-current
                          class="p-1.5 px-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          title="Delete this journal page">
                          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                          <span class="hidden sm:inline">Delete</span>
                        </button>`
                      : ''
                  }

                  ${
                    !isEditing && selectedEntry
                      ? `<button type="button" data-j-edit-current
                          class="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer border border-purple-200 dark:border-purple-800"
                          title="Edit journal page">
                          <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                          <span>Edit</span>
                        </button>`
                      : ''
                  }

                  <button type="button" data-j-save
                    class="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95">
                    SAVE
                  </button>
                </div>
              </div>

              ${promptBannerHtml}

              <div class="p-5 sm:p-8 flex-1 overflow-y-auto space-y-4">
                <div class="flex items-start justify-between border-b border-black/10 pb-3">
                  <div class="flex items-baseline gap-2">
                    <span class="text-3xl sm:text-4xl font-black tracking-tight font-serif text-gray-900">${dayNumber}</span>
                    <span class="text-lg sm:text-xl font-bold font-serif text-gray-700">${escapeHtml(monthAbbr)}</span>
                    <span class="text-xs text-gray-500 font-medium ml-1">${escapeHtml(dayOfWeek)}</span>
                  </div>

                  <div class="relative">
                    <button type="button" data-j-toggle-mood
                      class="w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-transform border border-amber-200 cursor-pointer"
                      title="Mood: ${escapeHtml(MOOD_EMOJIS[mood]?.label || mood)}">
                      <span>${MOOD_EMOJIS[mood]?.emoji || '😊'}</span>
                    </button>
                    ${moodPickerHtml}
                  </div>
                </div>

                ${photosGalleryHtml}
                ${titleSectionHtml}
                ${voiceToolbarHtml}
                <div data-j-recorder-slot></div>
                ${editorContentHtml}
                ${stickersHtml}
                ${tagsHtml}
              </div>

              <div data-j-drawer-slot></div>

              <div class="bg-white/95 backdrop-blur-md border-t border-black/10 px-3 py-2.5 flex items-center justify-around z-20 shadow-lg">
                <button type="button" data-j-drawer="theme"
                  class="p-2 rounded-xl transition-all cursor-pointer ${activeDrawer === 'theme' ? 'bg-sky-50 text-sky-600 scale-110 shadow-xs' : 'text-gray-600 hover:text-gray-900'}"
                  title="Customize Wallpaper & Theme">
                  <div class="w-5 h-5 border-2 border-current rounded-md flex flex-col justify-around p-0.5">
                    <div class="h-0.5 bg-current w-full"></div>
                    <div class="h-0.5 bg-current w-full"></div>
                    <div class="h-0.5 bg-current w-full"></div>
                  </div>
                </button>

                <div class="relative">
                  <label class="p-2 rounded-xl text-gray-600 hover:text-gray-900 cursor-pointer block" title="Add Photo">
                    <i data-lucide="image" class="w-5 h-5"></i>
                    <input type="file" data-j-photo-upload accept="image/*" class="hidden" />
                  </label>
                </div>

                <button type="button" data-j-drawer="stickers"
                  class="p-2 rounded-xl transition-all cursor-pointer ${activeDrawer === 'stickers' ? 'bg-sky-50 text-sky-600 scale-110 shadow-xs' : 'text-gray-600 hover:text-gray-900'}"
                  title="Sticker Library">
                  <i data-lucide="sparkles" class="w-5 h-5"></i>
                </button>

                <button type="button" data-j-drawer="emojis"
                  class="p-2 rounded-xl transition-all cursor-pointer ${activeDrawer === 'emojis' ? 'bg-sky-50 text-sky-600 scale-110 shadow-xs' : 'text-gray-600 hover:text-gray-900'}"
                  title="Emoji Picker">
                  <i data-lucide="smile" class="w-5 h-5"></i>
                </button>

                <button type="button" data-j-drawer="font"
                  class="p-2 rounded-xl transition-all cursor-pointer ${activeDrawer === 'font' ? 'bg-sky-50 text-sky-600 scale-110 shadow-xs' : 'text-gray-600 hover:text-gray-900'}"
                  title="Font & Typography">
                  <i data-lucide="type" class="w-5 h-5"></i>
                </button>

                <button type="button" data-j-drawer="list"
                  class="p-2 rounded-xl transition-all cursor-pointer ${activeDrawer === 'list' ? 'bg-sky-50 text-sky-600 scale-110 shadow-xs' : 'text-gray-600 hover:text-gray-900'}"
                  title="List Bullets">
                  <i data-lucide="list" class="w-5 h-5"></i>
                </button>

                <button type="button" data-j-add-tag class="p-2 rounded-xl text-gray-600 hover:text-gray-900 cursor-pointer" title="Add Tag">
                  <i data-lucide="tag" class="w-5 h-5"></i>
                </button>

                <button type="button" data-j-voice-bottom class="p-2 rounded-xl text-purple-600 hover:text-purple-800 transition-all cursor-pointer" title="Record Voice Journal at cursor">
                  <i data-lucide="mic" class="w-5 h-5"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        ${deleteModalHtml}
        ${renderPaperModalHtml()}
      </div>
    `;

    renderIcons(container);
    renderToastDom();
    renderSidebarListOnly();

    // Mount inline voice recorder if active
    const recorderSlot = container.querySelector('[data-j-recorder-slot]');
    if (isRecordingInlineVoice && recorderSlot) {
      cleanupRecorder = mountInlineVoiceRecorder(recorderSlot, {
        onComplete: handleCompleteInlineVoice,
        onCancel: () => {
          isRecordingInlineVoice = false;
          inlineRecordPosition = null;
          render();
        },
      });
    }

    // Mount audio clip cards when editing
    const editClipsSlot = container.querySelector('[data-j-edit-clips]');
    if (editClipsSlot && audioClips.length > 0) {
      audioClips.forEach((clip) => {
        const cardHost = document.createElement('div');
        editClipsSlot.appendChild(cardHost);
        const disposeCard = mountInlineVoiceMemoCard(cardHost, clip, {
          isEditing: true,
          onDelete: handleDeleteInlineVoiceMemo,
        });
        voiceCardCleanups.push(disposeCard);
      });
    }

    // Mount read mode inline content + embedded [[voice_memo:ID]] players
    const readBody = container.querySelector('[data-j-read-body]');
    if (readBody) {
      if (!content && audioClips.length === 0) {
        readBody.innerHTML = '<span class="text-gray-400 italic">No writing on this page yet.</span>';
      } else {
        const parts = (content || '').split(/(\[\[voice_memo:[^\]]+\]\])/g);
        const wrapper = document.createElement('div');
        wrapper.className = 'space-y-3';
        parts.forEach((part) => {
          const match = part.match(/\[\[voice_memo:([^\]]+)\]\]/);
          if (match) {
            const clipId = match[1];
            const clip = audioClips.find((c) => c.id === clipId);
            if (clip) {
              const cardHost = document.createElement('div');
              wrapper.appendChild(cardHost);
              const disposeCard = mountInlineVoiceMemoCard(cardHost, clip, {
                isEditing: false,
                onDelete: handleDeleteInlineVoiceMemo,
              });
              voiceCardCleanups.push(disposeCard);
            }
            return;
          }
          if (!part.trim()) return;
          const textDiv = document.createElement('div');
          textDiv.className = `leading-relaxed text-sm sm:text-base whitespace-pre-wrap font-serif ${fontClass}`;
          if (textColor !== 'inherit') textDiv.style.color = textColor;
          textDiv.style.textAlign = textAlignment;
          textDiv.textContent = part;
          wrapper.appendChild(textDiv);
        });

        audioClips
          .filter((c) => !(content || '').includes(`[[voice_memo:${c.id}]]`))
          .forEach((clip) => {
            const cardHost = document.createElement('div');
            wrapper.appendChild(cardHost);
            const disposeCard = mountInlineVoiceMemoCard(cardHost, clip, {
              isEditing: false,
              onDelete: handleDeleteInlineVoiceMemo,
            });
            voiceCardCleanups.push(disposeCard);
          });

        readBody.appendChild(wrapper);
      }
    }

    // Mount active bottom drawer
    const drawerSlot = container.querySelector('[data-j-drawer-slot]');
    if (drawerSlot && activeDrawer !== 'none') {
      if (activeDrawer === 'theme') {
        mountThemeDrawer(drawerSlot, {
          currentTheme: wallpaperTheme,
          onSelectTheme: (themeId) => {
            wallpaperTheme = themeId;
            render();
          },
          onClose: () => {
            activeDrawer = 'none';
            render();
          },
        });
      } else if (activeDrawer === 'stickers') {
        mountStickerDrawer(drawerSlot, {
          onSelectSticker: (sticker) => insertAtCursor(` ${sticker} `),
          onClose: () => {
            activeDrawer = 'none';
            render();
          },
        });
      } else if (activeDrawer === 'emojis') {
        mountEmojiDrawer(drawerSlot, {
          onSelectEmoji: (emoji) => insertAtCursor(emoji),
          onClose: () => {
            activeDrawer = 'none';
            render();
          },
        });
      } else if (activeDrawer === 'font') {
        mountFontDrawer(drawerSlot, {
          currentFont: fontFamily,
          currentColor: textColor,
          currentSizePreset: fontSizePreset,
          currentAlign: textAlignment,
          onSelectFont: (f) => {
            fontFamily = f;
            render();
          },
          onSelectColor: (c) => {
            textColor = c;
            render();
          },
          onSelectSizePreset: (p) => {
            fontSizePreset = p;
            render();
          },
          onSelectAlign: (a) => {
            textAlignment = a;
            render();
          },
          onIndent: (dir) => {
            if (dir === 'in') {
              insertAtCursor('    ');
            } else {
              content = content.replace(/^    /gm, '');
              render();
            }
          },
          onClose: () => {
            activeDrawer = 'none';
            render();
          },
        });
      } else if (activeDrawer === 'list') {
        mountListDrawer(drawerSlot, {
          currentBulletStyle: bulletStyle,
          onSelectBulletStyle: (bId, bChar) => {
            bulletStyle = bId;
            insertAtCursor(`\n${bChar} `);
          },
          onClose: () => {
            activeDrawer = 'none';
            render();
          },
        });
      }
    }

    // Event bindings
    container.querySelector('[data-journal-search]')?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderSidebarListOnly();
    });

    container.querySelector('[data-j-filter-all]')?.addEventListener('click', () => {
      filterMood = 'all';
      filterVoiceOnly = false;
      render();
    });
    container.querySelector('[data-j-filter-voice]')?.addEventListener('click', () => {
      filterVoiceOnly = !filterVoiceOnly;
      render();
    });
    container.querySelector('[data-j-filter-fav]')?.addEventListener('click', () => {
      filterFavorites = !filterFavorites;
      render();
    });
    container.querySelectorAll('[data-j-filter-mood]').forEach((btn) => {
      btn.addEventListener('click', () => {
        filterMood = btn.getAttribute('data-j-filter-mood');
        render();
      });
    });

    container.querySelector('[data-j-back-view]')?.addEventListener('click', () => {
      isEditing = false;
      render();
    });
    container.querySelector('[data-j-new-page]')?.addEventListener('click', () => {
      startNewEntry();
      render();
    });
    container.querySelector('[data-j-voice-top]')?.addEventListener('click', handleStartInlineVoiceRecord);
    container.querySelector('[data-j-voice-bottom]')?.addEventListener('click', handleStartInlineVoiceRecord);
    container.querySelector('[data-j-record-inline]')?.addEventListener('click', handleStartInlineVoiceRecord);

    container.querySelector('[data-j-export-all]')?.addEventListener('click', () => {
      exportJournalEntriesToPDF(entries);
      showToast('Exporting your full journal archive as PDF 📖');
    });

    container.querySelector('[data-j-open-ppt]')?.addEventListener('click', () => {
      paperModalTab = 'slides';
      showPaperModal = true;
      render();
    });

    container.querySelector('[data-j-open-paper]')?.addEventListener('click', () => {
      paperModalTab = 'info';
      showPaperModal = true;
      render();
    });

    container.querySelector('[data-j-toggle-edit]')?.addEventListener('click', () => {
      isEditing = !isEditing;
      render();
    });
    container.querySelector('[data-j-edit-current]')?.addEventListener('click', () => {
      isEditing = true;
      render();
    });
    container.querySelector('[data-j-delete-current]')?.addEventListener('click', () => {
      showDeleteConfirmModal = true;
      render();
    });
    container.querySelector('[data-j-save]')?.addEventListener('click', handleSaveEntry);

    container.querySelector('[data-j-toggle-menu]')?.addEventListener('click', () => {
      isMenuOpen = !isMenuOpen;
      render();
    });
    container.querySelector('[data-j-toggle-prompt]')?.addEventListener('click', () => {
      isPromptActive = !isPromptActive;
      render();
    });
    container.querySelector('[data-j-toggle-eyes]')?.addEventListener('click', () => {
      isEyesProtectionActive = !isEyesProtectionActive;
      render();
      showToast(isEyesProtectionActive ? 'Eyes protection filter on 🌙' : 'Filter off');
    });
    container.querySelector('[data-j-toggle-preview]')?.addEventListener('click', () => {
      isPreviewMode = !isPreviewMode;
      isMenuOpen = false;
      render();
      showToast(isPreviewMode ? 'Entered clean aesthetic preview 📖' : 'Exited preview');
    });
    container.querySelector('[data-j-open-templates]')?.addEventListener('click', () => {
      isMenuOpen = false;
      render();
      const overlay = container.querySelector('[data-j-overlay-slot]');
      if (overlay) {
        openTemplatesModal(overlay, {
          onApplyTemplate: (tmpl) => {
            title = tmpl.defaultTitle;
            content = tmpl.defaultContent;
            mood = tmpl.defaultMood;
            wallpaperTheme = tmpl.defaultTheme;
            bulletStyle = tmpl.bulletStyle;
            isEditing = true;
            render();
            showToast(`Applied "${tmpl.title}" template! 🌸`);
          },
          onClose: () => {},
        });
      }
    });

    container.querySelector('[data-j-next-prompt]')?.addEventListener('click', () => {
      currentPromptIndex = (currentPromptIndex + 1) % INSPIRATIONAL_PROMPTS.length;
      render();
    });
    container.querySelector('[data-j-insert-prompt]')?.addEventListener('click', () => {
      if (!isEditing) isEditing = true;
      insertAtCursor(`\n\n💭 ${INSPIRATIONAL_PROMPTS[currentPromptIndex]}\n`);
    });

    container.querySelector('[data-j-toggle-mood]')?.addEventListener('click', () => {
      showMoodPicker = !showMoodPicker;
      render();
    });
    container.querySelectorAll('[data-j-pick-mood]').forEach((btn) => {
      btn.addEventListener('click', () => {
        mood = btn.getAttribute('data-j-pick-mood');
        showMoodPicker = false;
        render();
        showToast(`Mood set to ${MOOD_EMOJIS[mood]?.label || mood} ${MOOD_EMOJIS[mood]?.emoji || ''}`);
      });
    });

    container.querySelectorAll('[data-j-zoom-photo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-j-zoom-photo'));
        const overlay = container.querySelector('[data-j-overlay-slot]');
        const lbPhotos = photos.length > 0 ? photos : selectedEntry?.photos || [];
        if (overlay && lbPhotos.length > 0) {
          openPhotoLightboxModal(overlay, {
            photos: lbPhotos,
            initialIndex: idx,
            onDeletePhoto: handleDeleteSpecificPhoto,
            onClose: () => {},
          });
        }
      });
    });

    container.querySelectorAll('[data-j-del-photo]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute('data-j-del-photo'));
        handleDeleteSpecificPhoto(idx);
      });
    });

    const titleEl = container.querySelector('[data-j-title]');
    titleEl?.addEventListener('input', (e) => {
      title = e.target.value;
      syncCountsDom();
    });

    const contentEl = container.querySelector('[data-j-content]');
    if (contentEl) {
      contentEl.addEventListener('input', (e) => {
        content = e.target.value;
        cursorPosition = e.target.selectionStart;
        syncCountsDom();
      });
      contentEl.addEventListener('click', (e) => {
        cursorPosition = e.target.selectionStart;
      });
      contentEl.addEventListener('keyup', (e) => {
        cursorPosition = e.target.selectionStart;
      });
      contentEl.addEventListener('select', (e) => {
        cursorPosition = e.target.selectionStart;
      });
    }

    container.querySelectorAll('[data-j-drawer]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-j-drawer');
        activeDrawer = activeDrawer === name ? 'none' : name;
        render();
      });
    });

    container.querySelector('[data-j-photo-upload]')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            photos = [...photos, String(ev.target.result)];
            render();
            showToast('Photo added from device! 📷');
          }
        };
        reader.readAsDataURL(file);
      }
    });

    container.querySelector('[data-j-add-tag]')?.addEventListener('click', () => {
      const tagCandidates = ['Reflection', 'Gratitude', 'Memories', 'Study', 'Healing', 'Dreams', 'Daily'];
      const unused = tagCandidates.find((t) => !tags.includes(t)) || `Tag${tags.length + 1}`;
      tags = Array.from(new Set([...tags, unused]));
      render();
      showToast(`Tag #${unused} added!`);
    });

    // Delete modal actions
    container.querySelector('[data-j-cancel-del]')?.addEventListener('click', () => {
      showDeleteConfirmModal = false;
      render();
    });
    container.querySelector('[data-j-confirm-del]')?.addEventListener('click', handleDeleteEntry);

    // Research paper modal actions
    container.querySelectorAll('[data-j-close-paper]').forEach((btn) => {
      btn.addEventListener('click', () => {
        showPaperModal = false;
        render();
      });
    });
    container.querySelectorAll('[data-j-paper-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        paperModalTab = btn.getAttribute('data-j-paper-tab');
        render();
      });
    });
    container.querySelectorAll('[data-j-dl-ppt]').forEach((btn) => {
      btn.addEventListener('click', () => handleDownloadPaper('/api/download/presentation-pdf', 'BORAH_Project_Presentation.pdf'));
    });
    container.querySelectorAll('[data-j-dl-pdf]').forEach((btn) => {
      btn.addEventListener('click', () => handleDownloadPaper('/api/download/paper-pdf', 'BORAH_Research_Paper.pdf'));
    });
    container.querySelector('[data-j-dl-docx]')?.addEventListener('click', () => {
      handleDownloadPaper('/api/download/paper-docx', 'BORAH_Research_Paper.docx');
    });
    container.querySelector('[data-j-dl-tex]')?.addEventListener('click', () => {
      handleDownloadPaper('/api/download/paper-tex', 'BORAH_Research_Paper.tex');
    });
    container.querySelector('[data-j-copy-pdf]')?.addEventListener('click', () => {
      const url = `${window.location.origin}/BORAH_Research_Paper.pdf`;
      navigator.clipboard?.writeText(url);
      copiedUrl = true;
      render();
      showToast('PDF link copied to clipboard! 📋');
      setTimeout(() => {
        if (!disposed) {
          copiedUrl = false;
          render();
        }
      }, 2500);
    });
  };

  if (initialPrompt) {
    startNewEntry(initialPrompt, initialTitle);
    if (onClearPrompt) onClearPrompt();
  }

  render();

  api
    .getJournals()
    .then((res) => {
      if (disposed) return;
      loading = false;
      if (res.success) {
        entries = res.entries || [];
        if (initialEntryId) {
          const match = entries.find((e) => e.id === initialEntryId);
          if (match) {
            applyEntryToEditor(match);
            if (onClearInitialEntryId) onClearInitialEntryId();
          }
        } else if (!initialPrompt && entries.length > 0 && !selectedEntry && !isEditing) {
          applyEntryToEditor(entries[0]);
        }
      }
      render();
    })
    .catch((err) => {
      console.error('Error loading journal entries:', err);
      if (!disposed) {
        loading = false;
        render();
      }
    });

  return () => {
    disposed = true;
    if (toastTimer) clearTimeout(toastTimer);
    cleanupVoiceWidgets();
  };
}

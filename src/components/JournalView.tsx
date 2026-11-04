import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { JournalEntry } from '../types';
import { exportJournalEntryToPDF, exportJournalEntriesToPDF } from '../utils/pdfExport';
import {
  BookOpen,
  Plus,
  Search,
  Heart,
  Edit3,
  Lock,
  Unlock,
  Trash2,
  Sparkles,
  Smile,
  Calendar,
  Image as ImageIcon,
  Palette,
  Bold,
  Italic,
  Underline,
  List,
  Check,
  X,
  Share2,
  Mic,
  MicOff,
  Download,
  FileText,
  Volume2,
  Play,
  Pause,
  Radio,
  MoreVertical,
  MoreHorizontal,
  Eye,
  Sliders,
  Type,
  Tag,
  ZoomIn,
  RefreshCw,
  Lightbulb,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { InlineVoiceRecorder } from './InlineVoiceRecorder';
import { InlineVoiceMemoCard, VoiceMemoClip } from './InlineVoiceMemoCard';
import { JournalThemeDrawer, WALLPAPER_THEMES } from './JournalThemeDrawer';
import { JournalStickerDrawer } from './JournalStickerDrawer';
import { JournalEmojiDrawer } from './JournalEmojiDrawer';
import { JournalFontDrawer, FONT_OPTIONS } from './JournalFontDrawer';
import { JournalListDrawer, LIST_STYLES } from './JournalListDrawer';
import { JournalTemplatesModal, JournalTemplate } from './JournalTemplatesModal';
import { JournalPhotoLightbox } from './JournalPhotoLightbox';

interface JournalViewProps {
  initialEntryId?: string | null;
  onClearInitialEntryId?: () => void;
  initialPrompt?: string | null;
  initialTitle?: string | null;
  onClearPrompt?: () => void;
}

const INSPIRATIONAL_PROMPTS = [
  "What is one gentle thing that made your heart feel lighter today?",
  "Describe a sound, taste, or scent that instantly brought comfort to you.",
  "If you could whisper three encouraging words to yourself right now, what would they be?",
  "Write about a friend or loved one who made you smile recently.",
  "What is a small victory or effort you made this week that deserves celebration?",
  "What did you learn about your boundaries, desires, or dreams lately?",
  "Look around your room: choose one object and write the memories attached to it.",
  "Write a secret wish or intention you hold gently in your heart for the coming days.",
];

export const JournalView: React.FC<JournalViewProps> = ({
  initialEntryId,
  onClearInitialEntryId,
  initialPrompt,
  initialTitle,
  onClearPrompt,
}) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMood, setFilterMood] = useState<string>('all');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterVoiceOnly, setFilterVoiceOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDetection, setAiDetection] = useState<any>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [mood, setMood] = useState('calm');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPrivate, setIsPrivate] = useState(true);
  const [fontFamily, setFontFamily] = useState<string>('merriweather');
  const [textColor, setTextColor] = useState<string>('inherit');
  const [fontSizePreset, setFontSizePreset] = useState<'h1' | 'h2' | 'h3' | 'h4' | 'body'>('body');
  const [textAlignment, setTextAlignment] = useState<'left' | 'center' | 'right'>('left');
  const [wallpaperTheme, setWallpaperTheme] = useState<string>('original');
  const [bulletStyle, setBulletStyle] = useState<string>('check');
  const [tags, setTags] = useState<string[]>(['Daily', 'Reflection']);
  const [stickers, setStickers] = useState<Array<{ id: string; sticker_type: string; x: number; y: number }>>([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [currentAudioDuration, setCurrentAudioDuration] = useState<number | null>(null);
  const [audioClips, setAudioClips] = useState<Array<{ id: string; url: string; duration?: number; label?: string; created_at?: string }>>([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const cursorPositionRef = useRef<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [isRecordingInlineVoice, setIsRecordingInlineVoice] = useState(false);
  const [inlineRecordPosition, setInlineRecordPosition] = useState<number | null>(null);

  // Advanced Screen Features (Screens 1 to 7)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPromptActive, setIsPromptActive] = useState(false);
  const [isEyesProtectionActive, setIsEyesProtectionActive] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [lightboxState, setLightboxState] = useState<{ isOpen: boolean; initialIndex: number }>({
    isOpen: false,
    initialIndex: 0,
  });
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'theme' | 'stickers' | 'emojis' | 'font' | 'list' | 'photos' | 'tags'>('none');
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Character & Word counts
  const characterCount = (title + content).length;
  const wordCount = (title + ' ' + content)
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  const moodEmojis: Record<string, { emoji: string; label: string; bg: string }> = {
    happy: { emoji: '😊', label: 'Happy', bg: 'bg-amber-100 text-amber-900 border-amber-300' },
    calm: { emoji: '😌', label: 'Calm', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    neutral: { emoji: '😐', label: 'Neutral', bg: 'bg-slate-100 text-slate-900 border-slate-300' },
    sad: { emoji: '😔', label: 'Sad', bg: 'bg-blue-100 text-blue-900 border-blue-300' },
    anxious: { emoji: '😰', label: 'Anxious', bg: 'bg-purple-100 text-purple-900 border-purple-300' },
    angry: { emoji: '😡', label: 'Angry', bg: 'bg-rose-100 text-rose-900 border-rose-300' },
    tired: { emoji: '😴', label: 'Tired', bg: 'bg-stone-100 text-stone-900 border-stone-300' },
    excited: { emoji: '🤩', label: 'Excited', bg: 'bg-yellow-100 text-yellow-900 border-yellow-300' },
    loved: { emoji: '🥰', label: 'Loved', bg: 'bg-pink-100 text-pink-900 border-pink-300' },
    magical: { emoji: '✨', label: 'Magical', bg: 'bg-violet-100 text-violet-900 border-violet-300' },
  };

  const handleStartInlineVoiceRecord = () => {
    if (!isEditing) {
      setIsEditing(true);
    }
    const pos = textareaRef.current
      ? textareaRef.current.selectionStart
      : (cursorPositionRef.current !== undefined ? cursorPositionRef.current : content.length);
    setInlineRecordPosition(pos);
    setIsRecordingInlineVoice(true);
  };

  const handleCompleteInlineVoice = (clip: VoiceMemoClip) => {
    setAudioClips((prev) => [...prev, clip]);
    if (!currentAudioUrl) {
      setCurrentAudioUrl(clip.url);
      setCurrentAudioDuration(clip.duration || null);
    }

    const pos = inlineRecordPosition !== null
      ? inlineRecordPosition
      : (textareaRef.current ? textareaRef.current.selectionStart : cursorPositionRef.current || content.length);

    const before = content.slice(0, pos);
    const after = content.slice(pos);

    const prefix = before.length > 0 && !before.endsWith('\n') ? '\n\n' : '';
    const suffix = after.length > 0 && !after.startsWith('\n') ? '\n\n' : '';

    const tag = `[[voice_memo:${clip.id}]]`;
    const updated = before + prefix + tag + suffix + after;

    setContent(updated);
    setIsRecordingInlineVoice(false);
    setInlineRecordPosition(null);
    showToast('Voice journal recorded & embedded right in between your text! 🎙️✨');
  };

  const handleDeleteInlineVoiceMemo = (clipId: string) => {
    setAudioClips((prev) => prev.filter((c) => c.id !== clipId));
    const regex = new RegExp(`\\n*\\s*\\[\\[voice_memo:${clipId}\\]\\]\\s*\\n*`, 'g');
    setContent((prev) => prev.replace(regex, '\n\n').trim());
    showToast('Voice memo removed from journal 🗑️');
  };

  const renderContentWithInlineVoiceMemos = (rawText: string, isEditMode: boolean) => {
    if (!rawText && audioClips.length === 0) {
      return <span className="text-gray-400 italic">No writing on this page yet.</span>;
    }

    // Split text by [[voice_memo:ID]]
    const parts = (rawText || '').split(/(\[\[voice_memo:[^\]]+\]\])/g);

    return (
      <div className="space-y-3">
        {parts.map((part, index) => {
          const match = part.match(/\[\[voice_memo:([^\]]+)\]\]/);
          if (match) {
            const clipId = match[1];
            const clip = audioClips.find((c) => c.id === clipId);
            if (clip) {
              return (
                <InlineVoiceMemoCard
                  key={clipId + '-' + index}
                  clip={clip}
                  isEditing={isEditMode}
                  onDelete={handleDeleteInlineVoiceMemo}
                />
              );
            }
            return null;
          }

          if (!part.trim()) return null;

          return (
            <div
              key={index}
              style={{
                color: textColor !== 'inherit' ? textColor : undefined,
                textAlign: textAlignment as any,
              }}
              className={`leading-relaxed text-sm sm:text-base whitespace-pre-wrap font-serif ${getFontFamilyClass(fontFamily)}`}
            >
              {part}
            </div>
          );
        })}

        {/* Any audio clips not embedded via tag */}
        {audioClips
          .filter((c) => !(rawText || '').includes(`[[voice_memo:${c.id}]]`))
          .map((clip) => (
            <InlineVoiceMemoCard
              key={clip.id}
              clip={clip}
              isEditing={isEditMode}
              onDelete={handleDeleteInlineVoiceMemo}
            />
          ))}
      </div>
    );
  };

  const handleTogglePlayEntryAudio = (audioSrc: string) => {
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio(audioSrc);
      audioPlayerRef.current.onended = () => setIsPlayingAudio(false);
      audioPlayerRef.current.onpause = () => setIsPlayingAudio(false);
    }

    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.src = audioSrc;
      audioPlayerRef.current
        .play()
        .then(() => setIsPlayingAudio(true))
        .catch((e) => console.warn('Audio playback error:', e));
    }
  };

  // Stop mic on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const handleToggleDictation = () => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      showToast('Starting Voice in Between recorder 🎙️');
      handleStartInlineVoiceRecord();
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      showToast('Dictation paused 🎙️');
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      const initialPos = textareaRef.current
        ? textareaRef.current.selectionStart
        : cursorPositionRef.current || content.length;
      let textBefore = content.slice(0, initialPos);
      let textAfter = content.slice(initialPos);

      recognition.onstart = () => {
        setIsListening(true);
        showToast('🎙️ Dictate is listening: Speak your thoughts directly into the editor...');
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const added = finalTranscript || interimTranscript;
        if (added) {
          const spacerBefore =
            textBefore.length > 0 && !textBefore.endsWith(' ') && !textBefore.endsWith('\n')
              ? ' '
              : '';
          const spacerAfter =
            textAfter.length > 0 && !textAfter.startsWith(' ') && !textAfter.startsWith('\n')
              ? ' '
              : '';

          setContent(textBefore + spacerBefore + added + spacerAfter + textAfter);

          if (finalTranscript) {
            textBefore = textBefore + spacerBefore + finalTranscript;
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition event error:', event.error);
        if (event.error === 'not-allowed') {
          showToast('Microphone access blocked. Click "Voice in Between" to record.');
        } else if (event.error !== 'no-speech') {
          showToast(`Microphone: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Speech recognition notice:', err?.message || err);
      showToast('Starting Voice in Between recorder 🎙️');
      handleStartInlineVoiceRecord();
      setIsListening(false);
    }
  };

  const loadEntries = async () => {
    try {
      const res = await api.getJournals();
      if (res.success) {
        setEntries(res.entries);
        if (initialEntryId) {
          const match = res.entries.find((e) => e.id === initialEntryId);
          if (match) {
            handleSelectEntry(match);
            return;
          }
        }
        if (res.entries.length > 0 && !selectedEntry) {
          handleSelectEntry(res.entries[0]);
        }
      }
    } catch (err) {
      console.error('Error loading journal entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [initialEntryId]);

  useEffect(() => {
    if (initialPrompt) {
      handleStartNewEntry();
      setContent(initialPrompt);
      if (initialTitle) setTitle(initialTitle);
      if (onClearPrompt) onClearPrompt();
    }
  }, [initialPrompt]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleStartNewEntry = () => {
    setSelectedEntry(null);
    setTitle('');
    setContent('');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setMood('calm');
    setIsFavorite(false);
    setIsPrivate(true);
    setFontFamily('merriweather');
    setTextColor('inherit');
    setFontSizePreset('body');
    setTextAlignment('left');
    setWallpaperTheme('original');
    setBulletStyle('check');
    setTags(['Daily', 'Memories']);
    setStickers([]);
    setPhotos([]);
    setPhotoUrl('');
    setCurrentAudioUrl(null);
    setCurrentAudioDuration(null);
    setAudioClips([]);
    setIsPlayingAudio(false);
    if (audioPlayerRef.current) audioPlayerRef.current.pause();
    setAiDetection(null);
    setIsPreviewMode(false);
    setIsEyesProtectionActive(false);
    setIsPromptActive(false);
    setActiveDrawer('none');
    setIsEditing(true);
  };

  const handleSelectEntry = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setTitle(entry.title);
    setContent(entry.content);
    setEntryDate(entry.entry_date);
    setMood(entry.mood || 'calm');
    setIsFavorite(entry.is_favorite);
    setIsPrivate(entry.is_private);
    setFontFamily(entry.font_family || 'merriweather');
    setTextColor(entry.text_color || 'inherit');
    setFontSizePreset((entry.font_size_preset as any) || 'body');
    setTextAlignment((entry.text_align as any) || 'left');
    setWallpaperTheme(entry.wallpaper_theme || 'original');
    setBulletStyle(entry.bullet_style || 'check');
    setTags(entry.tags && entry.tags.length > 0 ? entry.tags : ['Reflection']);
    setIsEyesProtectionActive(!!entry.eyes_protection);
    setIsPromptActive(!!entry.prompt_active);
    setStickers(entry.stickers || []);
    setPhotos(entry.photos || []);
    setCurrentAudioUrl(entry.audio_url || null);
    setCurrentAudioDuration(entry.audio_duration || null);
    setAudioClips(entry.audio_clips || []);
    setIsPlayingAudio(false);
    if (audioPlayerRef.current) audioPlayerRef.current.pause();
    setAiDetection(null);
    setIsPreviewMode(false);
    setActiveDrawer('none');
    setIsEditing(false);
  };

  const handleSaveEntry = async () => {
    if (!title.trim() && !content.trim() && !currentAudioUrl && audioClips.length === 0) {
      showToast('Please enter a title, thoughts, or voice recording first.');
      return;
    }

    try {
      const payload: Partial<JournalEntry> = {
        title: title.trim() || (currentAudioUrl ? 'Voice Reflection' : 'Untitled Diary Page'),
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
          setEntries((prev) => prev.map((e) => (e.id === selectedEntry.id ? res.entry : e)));
          setSelectedEntry(res.entry);
          setIsEditing(false);
          setActiveDrawer('none');
          showToast(res.message || 'Saved to your little corner of the world ✨');
        }
      } else {
        const res = await api.createJournal(payload);
        if (res.success) {
          setEntries((prev) => [res.entry, ...prev]);
          setSelectedEntry(res.entry);
          setIsEditing(false);
          setActiveDrawer('none');
          showToast(res.message || 'Saved to your little corner of the world ✨');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Unable to save journal entry.');
    }
  };

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  const handleDeleteSpecificPhoto = async (indexToDelete: number) => {
    const updatedPhotos = photos.filter((_, i) => i !== indexToDelete);
    setPhotos(updatedPhotos);

    if (selectedEntry) {
      try {
        await api.updateJournal(selectedEntry.id, { photos: updatedPhotos });
        setEntries(entries.map((e) => (e.id === selectedEntry.id ? { ...e, photos: updatedPhotos } : e)));
        setSelectedEntry({ ...selectedEntry, photos: updatedPhotos });
        showToast('Photo removed from journal 📷🗑️');
      } catch {
        showToast('Failed to update photos in database');
      }
    } else {
      showToast('Photo removed from draft 📷🗑️');
    }
  };

  const handleDeleteEntry = async () => {
    if (!selectedEntry) return;
    try {
      const res = await api.deleteJournal(selectedEntry.id);
      if (res.success) {
        const remaining = entries.filter((e) => e.id !== selectedEntry.id);
        setEntries(remaining);
        setSelectedEntry(remaining.length > 0 ? remaining[0] : null);
        setIsEditing(false);
        setShowDeleteConfirmModal(false);
        showToast('Journal page removed 🗑️');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete entry.');
    }
  };

  const handleToggleFavorite = async (entry: JournalEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = !entry.is_favorite;
      await api.updateJournal(entry.id, { is_favorite: updated });
      setEntries((prev) => prev.map((item) => (item.id === entry.id ? { ...item, is_favorite: updated } : item)));
      if (selectedEntry?.id === entry.id) {
        setSelectedEntry({ ...selectedEntry, is_favorite: updated });
        setIsFavorite(updated);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleInsertAtCursor = (textToInsert: string) => {
    const pos = textareaRef.current ? textareaRef.current.selectionStart : cursorPositionRef.current || content.length;
    const before = content.slice(0, pos);
    const after = content.slice(pos);
    setContent(before + textToInsert + after);
    cursorPositionRef.current = pos + textToInsert.length;
    showToast(`Inserted "${textToInsert}" into entry ✨`);
  };

  const handleSelectBullet = (bulletId: string, bulletChar: string) => {
    setBulletStyle(bulletId);
    handleInsertAtCursor(`\n${bulletChar} `);
  };

  const handleApplyTemplate = (template: JournalTemplate) => {
    setTitle(template.defaultTitle);
    setContent(template.defaultContent);
    setMood(template.defaultMood);
    setWallpaperTheme(template.defaultTheme);
    setBulletStyle(template.bulletStyle);
    showToast(`Applied "${template.title}" template! 🌸`);
  };

  const handleAddPhotoUrl = () => {
    if (!photoUrl.trim()) return;
    setPhotos((prev) => [...prev, photoUrl.trim()]);
    setPhotoUrl('');
    showToast('Photo attached to memory grid 📷');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos((prev) => [...prev, event.target!.result as string]);
          showToast('Photo added from device! 📷');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleIndent = (direction: 'in' | 'out') => {
    if (direction === 'in') {
      handleInsertAtCursor('    ');
    } else {
      // Outdent
      setContent((prev) => prev.replace(/^    /gm, ''));
    }
  };

  // Find active wallpaper config
  const currentWallpaperConfig =
    WALLPAPER_THEMES.find((w) => w.id === wallpaperTheme) || WALLPAPER_THEMES[0];

  // Font class
  const getFontFamilyClass = (id: string) => {
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
  };

  // Date formatted components for Screen 7
  const entryDateObj = new Date(entryDate || new Date());
  const dayNumber = entryDateObj.getDate();
  const monthAbbr = entryDateObj.toLocaleDateString('en-US', { month: 'short' });
  const dayOfWeek = entryDateObj.toLocaleDateString('en-US', { weekday: 'long' });

  const filteredEntries = entries.filter((e) => {
    if (filterVoiceOnly && !e.audio_url && !e.has_audio) return false;
    if (filterMood !== 'all' && e.mood !== filterMood) return false;
    if (filterFavorites && !e.is_favorite) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-20 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl bg-slate-900/95 text-white text-xs font-medium shadow-2xl border border-purple-500/30 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Templates Modal */}
      <JournalTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onApplyTemplate={handleApplyTemplate}
      />

      {/* Photo Lightbox Viewer with delete individual photo capability */}
      <JournalPhotoLightbox
        photos={photos.length > 0 ? photos : selectedEntry?.photos || []}
        initialIndex={lightboxState.initialIndex}
        isOpen={lightboxState.isOpen}
        onClose={() => setLightboxState({ isOpen: false, initialIndex: 0 })}
        onDeletePhoto={handleDeleteSpecificPhoto}
      />

      {/* Top Header / Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isEditing && (
            <button
              onClick={() => {
                if (selectedEntry) setIsEditing(false);
                else setIsEditing(false);
              }}
              className="p-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
              title="Return to Journal View"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-serif flex items-center gap-2">
              <span>{isEditing ? 'Journal Studio' : 'My Digital Journal'}</span>
              <span className="text-sm font-sans font-normal text-slate-400">({entries.length} pages)</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Personalized digital journaling, photo memories, stickers, and voice reflections.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {entries.length > 0 && (
            <button
              type="button"
              onClick={() => {
                exportJournalEntriesToPDF(entries);
                showToast('Exporting your full journal archive as PDF 📖');
              }}
              className="px-3.5 py-2 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Export PDF</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleStartInlineVoiceRecord}
            className="px-3.5 py-2 rounded-2xl text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/80 hover:bg-purple-100 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Record a voice journal and embed it right in between your text where you want"
          >
            <Mic className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Voice in Between 🎙️</span>
          </button>

          <button
            type="button"
            onClick={handleStartNewEntry}
            className="px-4 py-2 rounded-2xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Write New Page</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Notebook View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Entries List & Search (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Search & Filters */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search entries or memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-[220px]">
                <button
                  type="button"
                  onClick={() => {
                    setFilterMood('all');
                    setFilterVoiceOnly(false);
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                    filterMood === 'all' && !filterVoiceOnly
                      ? 'bg-sky-500 text-white'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFilterVoiceOnly(!filterVoiceOnly)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                    filterVoiceOnly
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-purple-700 hover:bg-purple-50'
                  }`}
                >
                  <Mic className="w-2.5 h-2.5" />
                  <span>Voice</span>
                </button>
                {Object.entries(moodEmojis).map(([k, v]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setFilterMood(k)}
                    className={`px-1.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                      filterMood === k ? 'bg-sky-100' : 'hover:bg-slate-100'
                    }`}
                    title={v.label}
                  >
                    {v.emoji}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setFilterFavorites(!filterFavorites)}
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                  filterFavorites
                    ? 'bg-rose-100 text-rose-600 font-semibold'
                    : 'text-slate-400 hover:text-rose-500'
                }`}
                title="Filter Favorites"
              >
                <Heart className={`w-3.5 h-3.5 ${filterFavorites ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span className="text-[10px]">Starred</span>
              </button>
            </div>
          </div>

          {/* Entries Sidebar List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredEntries.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
                <p>No journal entries found.</p>
                <button
                  type="button"
                  onClick={handleStartNewEntry}
                  className="mt-3 text-sky-600 font-semibold hover:underline cursor-pointer"
                >
                  Write your first entry 🌷
                </button>
              </div>
            ) : (
              filteredEntries.map((entry) => {
                const isSelected = selectedEntry?.id === entry.id && !isEditing;
                const moodObj = moodEmojis[entry.mood || 'neutral'] || { emoji: '📖', label: 'Journal' };
                return (
                  <div
                    key={entry.id}
                    onClick={() => handleSelectEntry(entry)}
                    className={`p-4 rounded-3xl border transition-all text-left cursor-pointer group relative ${
                      isSelected
                        ? 'bg-sky-50/80 border-sky-300 shadow-sm'
                        : 'bg-white border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
                        <span>{moodObj.emoji}</span>
                        <span>{new Date(entry.entry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        {(entry.audio_url || entry.has_audio) && (
                          <span className="px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-purple-100 text-purple-700 flex items-center gap-0.5">
                            <Mic className="w-2.5 h-2.5" />
                            <span>Voice</span>
                          </span>
                        )}
                        {entry.photos && entry.photos.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-amber-100 text-amber-800 flex items-center gap-0.5">
                            <ImageIcon className="w-2.5 h-2.5" />
                            <span>{entry.photos.length}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectEntry(entry);
                            setIsEditing(true);
                          }}
                          className="opacity-70 group-hover:opacity-100 text-slate-400 hover:text-purple-600 transition-opacity p-1 cursor-pointer"
                          title="Edit page"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEntry(entry);
                            setShowDeleteConfirmModal(true);
                          }}
                          className="opacity-70 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity p-1 cursor-pointer"
                          title="Delete page"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(entry, e)}
                          className="text-slate-300 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                          title="Favorite"
                        >
                          <Heart className={`w-3.5 h-3.5 ${entry.is_favorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-xs font-bold text-slate-800 font-serif truncate">
                      {entry.title}
                    </h3>

                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 font-serif">
                      {entry.content}
                    </p>

                    {entry.stickers && entry.stickers.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {entry.stickers.slice(0, 4).map((st) => (
                          <span key={st.id} className="text-xs">
                            {st.sticker_type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Journal Canvas & Mobile-Inspired Studio (8 Cols) */}
        <div className="lg:col-span-8">
          <div
            className={`relative rounded-3xl shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between min-h-[660px] ${
              currentWallpaperConfig.canvasClass
            } ${isEyesProtectionActive ? 'eyes-protection-filter' : ''}`}
          >
            {/* Top Bar matching Screen 1, 4, 7 */}
            <div className="p-3 sm:p-4 border-b border-black/10 flex items-center justify-between gap-3 bg-white/60 backdrop-blur-md z-20">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="p-1.5 rounded-xl hover:bg-black/5 text-gray-700 transition-colors"
                  title="Toggle Edit / View"
                >
                  <ArrowLeft size={18} />
                </button>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                  {isEditing ? 'Editing Page' : 'Reading Mode'}
                </span>
              </div>

              <div className="flex items-center gap-2 relative">
                {/* Three Dots Menu Button matching Screen 7 */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 rounded-xl hover:bg-black/5 text-gray-700 transition-colors cursor-pointer"
                    title="Menu Options"
                  >
                    <MoreHorizontal size={20} />
                  </button>

                  {/* Three-Dots Menu Modal Dropdown matching Screen 7 */}
                  {isMenuOpen && (
                    <div className="absolute right-0 top-11 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 p-4 z-40 animate-in fade-in slide-in-from-top-2 text-gray-800">
                      {/* 1. Prompt Toggle */}
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-semibold font-serif">Prompt</span>
                        <button
                          type="button"
                          onClick={() => setIsPromptActive(!isPromptActive)}
                          className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                            isPromptActive ? 'bg-sky-500 justify-end' : 'bg-gray-300 justify-start'
                          }`}
                        >
                          <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                        </button>
                      </div>

                      {/* 2. Templates */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsTemplatesModalOpen(true);
                        }}
                        className="w-full text-left py-2.5 text-sm font-semibold hover:text-sky-600 transition-colors flex items-center justify-between border-b border-gray-100"
                      >
                        <span className="font-serif">Templates</span>
                        <ChevronRight size={16} className="text-gray-400" />
                      </button>

                      {/* 3. Preview */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsPreviewMode(!isPreviewMode);
                          setIsMenuOpen(false);
                          showToast(isPreviewMode ? 'Exited preview' : 'Entered clean aesthetic preview 📖');
                        }}
                        className="w-full text-left py-2.5 text-sm font-semibold hover:text-sky-600 transition-colors flex items-center justify-between border-b border-gray-100"
                      >
                        <span className="font-serif">{isPreviewMode ? 'Edit Mode' : 'Preview'}</span>
                        <Eye size={16} className="text-gray-400" />
                      </button>

                      {/* 4. Eyes Protection Toggle matching Screen 7 */}
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div>
                          <span className="text-sm font-semibold font-serif block">Eyes protection</span>
                          <span className="text-[10px] text-gray-400">Warm reading filter</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEyesProtectionActive(!isEyesProtectionActive);
                            showToast(!isEyesProtectionActive ? 'Eyes protection filter on 🌙' : 'Filter off');
                          }}
                          className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                            isEyesProtectionActive ? 'bg-amber-500 justify-end' : 'bg-gray-300 justify-start'
                          }`}
                        >
                          <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                        </button>
                      </div>

                      {/* 5. Character & Word count matching Screen 7 */}
                      <div className="pt-3 text-xs text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span className="font-serif">Character:</span>
                          <span className="font-bold text-gray-900">{characterCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-serif">Word:</span>
                          <span className="font-bold text-gray-900">{wordCount}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons: Edit, Delete, Save */}
                {selectedEntry && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirmModal(true)}
                    className="p-1.5 px-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="Delete this journal page"
                  >
                    <Trash2 size={14} />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                )}

                {!isEditing && selectedEntry && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer border border-purple-200 dark:border-purple-800"
                    title="Edit journal page"
                  >
                    <Edit3 size={13} />
                    <span>Edit</span>
                  </button>
                )}

                {/* Blue SAVE Button matching Screen 1, 4, 7 */}
                <button
                  type="button"
                  onClick={handleSaveEntry}
                  className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
                >
                  SAVE
                </button>
              </div>
            </div>

            {/* Prompt Banner (Screen 7 toggle) */}
            {isPromptActive && (
              <div className="mx-4 sm:mx-8 mt-3 p-3.5 rounded-2xl bg-amber-100/90 border border-amber-300 text-amber-950 text-xs flex items-center justify-between gap-3 shadow-sm animate-in slide-in-from-top-1">
                <div className="flex items-center gap-2">
                  <Lightbulb size={18} className="text-amber-600 shrink-0" />
                  <p className="font-medium font-serif italic">
                    "{INSPIRATIONAL_PROMPTS[currentPromptIndex]}"
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPromptIndex((prev) => (prev + 1) % INSPIRATIONAL_PROMPTS.length)
                    }
                    className="p-1 rounded-lg hover:bg-amber-200/80 text-amber-900 transition-colors"
                    title="Next Prompt"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleInsertAtCursor(`\n\n💭 ${INSPIRATIONAL_PROMPTS[currentPromptIndex]}\n`);
                    }}
                    className="px-2.5 py-1 bg-amber-700 text-white rounded-lg text-[11px] font-bold hover:bg-amber-800"
                  >
                    Insert
                  </button>
                </div>
              </div>
            )}

            {/* Main Canvas Scroll Area */}
            <div className="p-5 sm:p-8 flex-1 overflow-y-auto space-y-4">
              {/* Date Header & Mood Badge matching Screen 7 */}
              <div className="flex items-start justify-between border-b border-black/10 pb-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black tracking-tight font-serif text-gray-900">
                    {dayNumber}
                  </span>
                  <span className="text-lg sm:text-xl font-bold font-serif text-gray-700">
                    {monthAbbr}
                  </span>
                  <span className="text-xs text-gray-500 font-medium ml-1">
                    {dayOfWeek}
                  </span>
                </div>

                {/* Mood Badge / Selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowMoodPicker(!showMoodPicker)}
                    className="w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-transform border border-amber-200 cursor-pointer"
                    title={`Mood: ${moodEmojis[mood]?.label || mood}`}
                  >
                    <span>{moodEmojis[mood]?.emoji || '😊'}</span>
                  </button>

                  {/* Mood Selector Popover */}
                  {showMoodPicker && (
                    <div className="absolute right-0 top-12 bg-white rounded-2xl shadow-xl border border-gray-100 p-2.5 grid grid-cols-5 gap-2 z-30 animate-in fade-in">
                      {Object.entries(moodEmojis).map(([k, v]) => (
                        <button
                          key={k}
                          onClick={() => {
                            setMood(k);
                            setShowMoodPicker(false);
                            showToast(`Mood set to ${v.label} ${v.emoji}`);
                          }}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl hover:bg-purple-50 hover:scale-115 transition-all ${
                            mood === k ? 'ring-2 ring-sky-500 bg-sky-50' : ''
                          }`}
                          title={v.label}
                        >
                          {v.emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Photo & Memory Cards Grid matching Images 1, 3, 7 */}
              {photos.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-bold uppercase tracking-wider font-serif">Memory Gallery ({photos.length})</span>
                    <span className="text-[11px] text-gray-500 font-medium">Click to zoom • Trash icon to delete photo</span>
                  </div>
                  <div className={`grid gap-3 ${photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
                    {photos.map((p, idx) => (
                      <div
                        key={idx}
                        className="group relative h-44 sm:h-52 rounded-2xl overflow-hidden shadow-md border border-white/60 bg-black/5"
                      >
                        <img
                          src={p}
                          alt="Memory snapshot"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {/* Zoom magnifier button matching Screen 1, 3, 7 */}
                        <button
                          type="button"
                          onClick={() => setLightboxState({ isOpen: true, initialIndex: idx })}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center shadow-md transition-all cursor-pointer"
                          title="Inspect Photo"
                        >
                          <Search size={14} />
                        </button>
                        {/* Delete this particular photo button - works in both view and edit modes */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSpecificPhoto(idx);
                          }}
                          className="absolute bottom-2 right-2 p-1.5 rounded-full bg-rose-600/95 text-white opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-700 shadow-md cursor-pointer"
                          title="Delete this photo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}



              {/* Title Field */}
              {isEditing && !isPreviewMode ? (
                <input
                  type="text"
                  placeholder="My Birthday, A Quiet Thought, Today's Story..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ color: textColor !== 'inherit' ? textColor : undefined }}
                  className={`w-full text-xl sm:text-2xl font-bold bg-transparent border-none focus:outline-none placeholder-gray-400 ${getFontFamilyClass(
                    fontFamily
                  )}`}
                />
              ) : (
                <h2
                  style={{ color: textColor !== 'inherit' ? textColor : undefined }}
                  className={`text-2xl sm:text-3xl font-bold tracking-tight ${getFontFamilyClass(
                    fontFamily
                  )}`}
                >
                  {title || 'Untitled Journal Page'}
                </h2>
              )}

              {/* Voice Journal in Between Tool Bar */}
              {isEditing && !isPreviewMode && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs text-purple-900 dark:text-purple-300 font-medium">
                    <Mic size={15} className="text-purple-600 animate-pulse" />
                    <span className="font-semibold">Voice Journal in Between:</span>
                    <span className="hidden sm:inline text-[11px] text-purple-700/80 dark:text-purple-400">
                      Tap below to record and insert your voice note at cursor position!
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleStartInlineVoiceRecord}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
                    title="Record voice note directly at your current cursor position in between your writing"
                  >
                    <Mic size={13} />
                    <span>Record Voice Note Here 🎙️</span>
                  </button>
                </div>
              )}

              {/* Inline Voice Recorder active directly in between the journal */}
              {isRecordingInlineVoice && (
                <InlineVoiceRecorder
                  onComplete={handleCompleteInlineVoice}
                  onCancel={() => {
                    setIsRecordingInlineVoice(false);
                    setInlineRecordPosition(null);
                  }}
                />
              )}

              {/* Main Content Area */}
              {isEditing && !isPreviewMode ? (
                <div className="space-y-4">
                  <textarea
                    ref={textareaRef}
                    rows={12}
                    placeholder="Write your story here... Tap 'Record Voice Note Here' above to record and place your voice reflections in between your writing!"
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      cursorPositionRef.current = e.target.selectionStart;
                    }}
                    onClick={(e) => {
                      cursorPositionRef.current = (e.target as HTMLTextAreaElement).selectionStart;
                    }}
                    onKeyUp={(e) => {
                      cursorPositionRef.current = (e.target as HTMLTextAreaElement).selectionStart;
                    }}
                    onSelect={(e) => {
                      cursorPositionRef.current = (e.target as HTMLTextAreaElement).selectionStart;
                    }}
                    style={{
                      color: textColor !== 'inherit' ? textColor : undefined,
                      textAlign: textAlignment,
                    }}
                    className={`w-full bg-transparent border-none focus:outline-none resize-none leading-relaxed text-sm sm:text-base placeholder-gray-400 ${getFontFamilyClass(
                      fontFamily
                    )}`}
                  />

                  {/* Audio Clips In Between List (Interactive preview while editing) */}
                  {audioClips.length > 0 && (
                    <div className="pt-3 border-t border-purple-100 dark:border-purple-900/40">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 flex items-center gap-1.5 mb-2">
                        <Mic size={13} className="text-purple-600" />
                        <span>Voice Notes In Between ({audioClips.length})</span>
                      </div>
                      <div className="space-y-2">
                        {audioClips.map((clip) => (
                          <InlineVoiceMemoCard
                            key={clip.id}
                            clip={clip}
                            isEditing={true}
                            onDelete={handleDeleteInlineVoiceMemo}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    color: textColor !== 'inherit' ? textColor : undefined,
                    textAlign: textAlignment,
                  }}
                  className={`leading-relaxed text-sm sm:text-base whitespace-pre-wrap font-serif ${getFontFamilyClass(
                    fontFamily
                  )}`}
                >
                  {renderContentWithInlineVoiceMemos(content, false)}
                </div>
              )}

              {/* Placed Stickers overlay */}
              {stickers.map((stk) => (
                <div
                  key={stk.id}
                  className="inline-block text-2xl m-1 select-none hover:scale-125 transition-transform"
                >
                  <span>{stk.sticker_type}</span>
                </div>
              ))}
            </div>

            {/* Active Drawer Component Sheet */}
            {activeDrawer === 'theme' && (
              <JournalThemeDrawer
                currentTheme={wallpaperTheme}
                onSelectTheme={(themeId) => setWallpaperTheme(themeId)}
                onClose={() => setActiveDrawer('none')}
              />
            )}

            {activeDrawer === 'stickers' && (
              <JournalStickerDrawer
                onSelectSticker={(sticker) => handleInsertAtCursor(` ${sticker} `)}
                onClose={() => setActiveDrawer('none')}
              />
            )}

            {activeDrawer === 'emojis' && (
              <JournalEmojiDrawer
                onSelectEmoji={(emoji) => handleInsertAtCursor(emoji)}
                onClose={() => setActiveDrawer('none')}
              />
            )}

            {activeDrawer === 'font' && (
              <JournalFontDrawer
                currentFont={fontFamily}
                currentColor={textColor}
                currentSizePreset={fontSizePreset}
                currentAlign={textAlignment}
                onSelectFont={(f) => setFontFamily(f)}
                onSelectColor={(c) => setTextColor(c)}
                onSelectSizePreset={(p) => setFontSizePreset(p)}
                onSelectAlign={(a) => setTextAlignment(a)}
                onIndent={handleIndent}
                onClose={() => setActiveDrawer('none')}
              />
            )}

            {activeDrawer === 'list' && (
              <JournalListDrawer
                currentBulletStyle={bulletStyle}
                onSelectBulletStyle={handleSelectBullet}
                onClose={() => setActiveDrawer('none')}
              />
            )}

            {/* Bottom Icon Bar matching Screen 5 */}
            <div className="bg-white/95 backdrop-blur-md border-t border-black/10 px-3 py-2.5 flex items-center justify-around z-20 shadow-lg">
              {/* 1. Theme Wallpaper icon (Striped square) */}
              <button
                type="button"
                onClick={() => setActiveDrawer(activeDrawer === 'theme' ? 'none' : 'theme')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  activeDrawer === 'theme' ? 'bg-sky-50 text-sky-600 scale-110 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Customize Wallpaper & Theme"
              >
                <div className="w-5 h-5 border-2 border-current rounded-md flex flex-col justify-around p-0.5">
                  <div className="h-0.5 bg-current w-full" />
                  <div className="h-0.5 bg-current w-full" />
                  <div className="h-0.5 bg-current w-full" />
                </div>
              </button>

              {/* 2. Photo / Gallery icon */}
              <div className="relative">
                <label className="p-2 rounded-xl text-gray-600 hover:text-gray-900 cursor-pointer block">
                  <ImageIcon size={20} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* 3. Star / Sticker icon */}
              <button
                type="button"
                onClick={() => setActiveDrawer(activeDrawer === 'stickers' ? 'none' : 'stickers')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  activeDrawer === 'stickers' ? 'bg-sky-50 text-sky-600 scale-110 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Sticker Library"
              >
                <Sparkles size={20} />
              </button>

              {/* 4. Smiley / Emoji icon */}
              <button
                type="button"
                onClick={() => setActiveDrawer(activeDrawer === 'emojis' ? 'none' : 'emojis')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  activeDrawer === 'emojis' ? 'bg-sky-50 text-sky-600 scale-110 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Emoji Picker"
              >
                <Smile size={20} />
              </button>

              {/* 5. Tt Font icon */}
              <button
                type="button"
                onClick={() => setActiveDrawer(activeDrawer === 'font' ? 'none' : 'font')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  activeDrawer === 'font' ? 'bg-sky-50 text-sky-600 scale-110 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Font & Typography"
              >
                <Type size={20} />
              </button>

              {/* 6. List bullet styles icon */}
              <button
                type="button"
                onClick={() => setActiveDrawer(activeDrawer === 'list' ? 'none' : 'list')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  activeDrawer === 'list' ? 'bg-sky-50 text-sky-600 scale-110 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
                title="List Bullets"
              >
                <List size={20} />
              </button>

              {/* 7. Tags icon */}
              <button
                type="button"
                onClick={() => {
                  const tagCandidates = ['Reflection', 'Gratitude', 'Memories', 'Study', 'Healing', 'Dreams', 'Daily'];
                  const unused = tagCandidates.find((t) => !tags.includes(t)) || `Tag${tags.length + 1}`;
                  setTags((prev) => Array.from(new Set([...prev, unused])));
                  showToast(`Tag #${unused} added!`);
                }}
                className="p-2 rounded-xl text-gray-600 hover:text-gray-900 cursor-pointer"
                title="Add Tag"
              >
                <Tag size={20} />
              </button>

              {/* 8. Microphone / Voice in Between icon */}
              <button
                type="button"
                onClick={handleStartInlineVoiceRecord}
                className="p-2 rounded-xl text-purple-600 hover:text-purple-800 transition-all cursor-pointer"
                title="Record Voice Journal in between text"
              >
                <Mic size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Journal Entry Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Delete Journal Page?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to permanently delete "{selectedEntry?.title || 'this page'}"? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEntry}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow cursor-pointer"
              >
                Delete Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

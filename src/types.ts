export type ThemeType =
  | 'lavender'
  | 'midnight'
  | 'forest'
  | 'warm-sunrise'
  | 'ocean-calm'
  | 'rose-gold'
  | 'purple-universe'
  | 'lavender-dream'
  | 'cozy-sage';
export type FontFamilyType = 'sans' | 'serif' | 'handwriting';


export interface User {
  id: string;
  name: string;
  email: string;
  profile_photo?: string;
  created_at: string;
  updated_at: string;
  is_verified: boolean;
  is_active: boolean;
}

export interface UserSettings {
  id: string;
  user_id: string;
  theme: ThemeType;
  font_family: FontFamilyType;
  font_size: 'small' | 'medium' | 'large';
  accent_color: string;
  dark_mode: boolean;
  onboarding_completed: boolean;
  primary_interests: string[];
}

export interface JournalEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  mood?: string;
  emotion?: string;
  entry_date: string;
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  is_private: boolean;
  font_family?: string;
  text_color?: string;
  stickers?: Array<{ id: string; sticker_type: string; x: number; y: number }>;
  photos?: string[];
  audio_url?: string;
  audio_duration?: number;
  has_audio?: boolean;
  audio_clips?: Array<{ id: string; url: string; duration?: number; label?: string; created_at?: string }>;
  wallpaper_theme?: string;
  bullet_style?: string;
  font_size_preset?: string;
  text_align?: string;
  tags?: string[];
  eyes_protection?: boolean;
  prompt_active?: boolean;
  current_prompt?: string;
}

export interface MemoryPhoto {
  id: string;
  memory_id: string;
  user_id: string;
  image_path: string;
  caption?: string;
  uploaded_at: string;
}

export interface Memory {
  id: string;
  user_id: string;
  title: string;
  description: string;
  memory_date: string;
  location?: string;
  cover_image?: string;
  is_favorite: boolean;
  is_special?: boolean;
  created_at: string;
  photos?: MemoryPhoto[];
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  due_date?: string;
  due_time?: string;
  category: 'study' | 'personal' | 'work' | 'health' | 'project' | 'other';
  completed: boolean;
  created_at: string;
}

export interface Schedule {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  date: string;
  category: 'study' | 'work' | 'personal' | 'important';
  reminder_enabled: boolean;
}

export interface MoodEntry {
  id: string;
  user_id: string;
  mood: string;
  emotion?: string;
  intensity: number; // 1-10
  note?: string;
  date: string;
  created_at: string;
}

export interface ImportantNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  is_pinned: boolean;
  color: string;
  reminder_date?: string;
  created_at: string;
}

export interface SearchResults {
  journals: JournalEntry[];
  memories: Memory[];
  tasks: Task[];
  notes: ImportantNote[];
}

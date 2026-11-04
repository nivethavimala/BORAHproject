import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Trash2, Volume2, Mic, Clock } from 'lucide-react';

export interface VoiceMemoClip {
  id: string;
  url: string;
  duration?: number;
  label?: string;
  created_at?: string;
}

interface InlineVoiceMemoCardProps {
  clip: VoiceMemoClip;
  isEditing?: boolean;
  onDelete?: (id: string) => void;
}

export const InlineVoiceMemoCard: React.FC<InlineVoiceMemoCardProps> = ({
  clip,
  isEditing = false,
  onDelete,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(clip.duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(clip.url);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    audio.ontimeupdate = () => {
      setCurrentTime(Math.round(audio.currentTime));
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.onpause = () => {
      setIsPlaying(false);
    };

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [clip.url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => {
          console.warn('Playback error:', e);
          setIsPlaying(false);
        });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0;

  return (
    <div className="my-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-pink-50/50 to-amber-50/60 dark:from-purple-950/40 dark:via-slate-900/60 dark:to-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 shadow-xs hover:shadow-sm transition-all group not-prose">
      <div className="flex items-center justify-between gap-3">
        {/* Play/Pause Button & Metadata */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={togglePlay}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-all cursor-pointer ${
              isPlaying
                ? 'bg-gradient-to-tr from-purple-600 to-pink-600 text-white scale-105'
                : 'bg-purple-600 hover:bg-purple-700 text-white hover:scale-105 active:scale-95'
            }`}
            title={isPlaying ? 'Pause voice reflection' : 'Play voice reflection'}
          >
            {isPlaying ? (
              <Pause size={18} className="fill-white" />
            ) : (
              <Play size={18} className="fill-white ml-0.5" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1">
                <Mic size={11} className="text-purple-500" />
                <span>Voice Journal Note</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {formatSeconds(currentTime)} / {formatSeconds(totalDuration)}
              </span>
            </div>

            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 font-serif truncate mt-0.5">
              {clip.label || 'Spoken Memory Reflection'}
            </h4>

            {/* Custom interactive progress bar */}
            <div className="relative mt-2 flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={totalDuration || 1}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-purple-200/60 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
            </div>
          </div>
        </div>

        {/* Waveform Animation while playing */}
        <div className="hidden sm:flex items-center gap-0.5 h-6 px-2 shrink-0">
          {[40, 75, 50, 90, 60, 85, 45, 95, 65, 35].map((h, i) => (
            <span
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${
                isPlaying
                  ? 'bg-purple-600 dark:bg-purple-400 animate-pulse'
                  : 'bg-purple-200 dark:bg-slate-700'
              }`}
              style={{
                height: isPlaying ? `${Math.max(20, (h * (i % 2 === 0 ? 1 : 0.7)))}%` : '25%',
                animationDelay: `${i * 90}ms`,
              }}
            />
          ))}
        </div>

        {/* Delete button (when in Edit Mode or if onDelete is provided) */}
        {isEditing && onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(clip.id);
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-70 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
            title="Delete this voice memo"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
};

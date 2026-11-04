import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Pause, Play, Check, X, AlertCircle } from 'lucide-react';

interface InlineVoiceRecorderProps {
  onComplete: (clip: {
    id: string;
    url: string;
    duration: number;
    label: string;
    created_at: string;
  }) => void;
  onCancel: () => void;
}

export const InlineVoiceRecorder: React.FC<InlineVoiceRecorderProps> = ({
  onComplete,
  onCancel,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 25, 40, 20, 50, 30, 60, 25, 45, 20, 35, 15]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    startRecording();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Setup audio analysis for live soundwaves
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLevels = () => {
            if (analyserRef.current && !isPaused) {
              analyserRef.current.getByteFrequencyData(dataArray);
              const bars: number[] = [];
              const step = Math.floor(dataArray.length / 12) || 1;
              for (let i = 0; i < 12; i++) {
                const val = dataArray[i * step] || 10;
                // Normalize 10-80% height
                bars.push(Math.max(12, Math.min(85, Math.round((val / 255) * 85))));
              }
              setAudioLevels(bars);
            }
            animationFrameRef.current = requestAnimationFrame(updateLevels);
          };
          updateLevels();
        }
      } catch (err) {
        console.warn('Audio visualization unavailable, fallback to subtle animation:', err);
      }

      // Determine supported mimeType
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      const options = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250); // Slice every 250ms
      setIsRecording(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();

      timerIntervalRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to access microphone:', err);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Microphone access was denied. Please allow microphone permissions in your browser bar.'
          : 'Could not access your microphone. Please check your audio input settings.'
      );
    }
  };

  const handleTogglePause = () => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      try {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        timerIntervalRef.current = window.setInterval(() => {
          setDuration((prev) => prev + 1);
        }, 1000);
      } catch (e) {
        console.warn('Error resuming recorder:', e);
      }
    } else {
      try {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      } catch (e) {
        console.warn('Error pausing recorder:', e);
      }
    }
  };

  const handleStopAndSave = () => {
    if (!mediaRecorderRef.current) return;

    const recorder = mediaRecorderRef.current;
    if (recorder.state !== 'inactive') {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const finalDuration = Math.max(1, duration);

        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const clipId = 'memo_' + Date.now();
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const label = `Voice Reflection • ${timeStr}`;

          cleanup();
          onComplete({
            id: clipId,
            url: dataUrl,
            duration: finalDuration,
            label,
            created_at: new Date().toISOString(),
          });
        };
        reader.readAsDataURL(blob);
      };

      recorder.stop();
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="my-3 p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-amber-500/10 border-2 border-purple-300 dark:border-purple-600 shadow-md backdrop-blur-xs transition-all animate-in fade-in zoom-in-95">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Indicator & Status */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span
              className={`w-4 h-4 rounded-full ${
                isPaused ? 'bg-amber-500' : 'bg-rose-500 animate-ping'
              } opacity-75`}
            />
            <span
              className={`absolute w-3 h-3 rounded-full ${
                isPaused ? 'bg-amber-500' : 'bg-rose-500'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
                {isPaused ? 'Voice Memo Paused' : 'Recording Voice '}
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-2xs">
                {formatTime(duration)}
              </span>
            </div>
            <p className="text-[11px] text-purple-800/80 dark:text-purple-300/80 mt-0.5">
              Speak your thoughts naturally.
            </p>
          </div>
        </div>

        {/* Center: Live Waveform Visualizer */}
        <div className="flex items-center gap-1 h-8 px-3 bg-white/70 dark:bg-slate-900/60 rounded-xl border border-purple-200/60 dark:border-purple-800/60 self-center">
          {audioLevels.map((lvl, idx) => (
            <div
              key={idx}
              className={`w-1 rounded-full transition-all duration-75 ${
                isPaused
                  ? 'bg-slate-300 dark:bg-slate-700'
                  : 'bg-gradient-to-t from-purple-600 to-pink-500'
              }`}
              style={{ height: `${lvl}%` }}
            />
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handleTogglePause}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-all shadow-2xs cursor-pointer flex items-center gap-1"
            title={isPaused ? 'Resume recording' : 'Pause recording'}
          >
            {isPaused ? <Play size={14} className="fill-current" /> : <Pause size={14} className="fill-current" />}
            <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            type="button"
            onClick={handleStopAndSave}
            disabled={duration < 1}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            title="Done & Insert Voice Memo Here"
          >
            <Check size={14} />
            <span>Insert Voice Memo ✨</span>
          </button>

          <button
            type="button"
            onClick={() => {
              cleanup();
              onCancel();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            title="Cancel and discard"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

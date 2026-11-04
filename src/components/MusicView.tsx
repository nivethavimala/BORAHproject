import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import {
  Music,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Download,
  BookOpen,
  Disc,
  Heart,
  Moon,
  Coffee,
  Sun,
  CloudRain,
  Radio,
  Sliders,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MusicViewProps {
  onNavigateToJournal?: (note?: string) => void;
}

export const MusicView: React.FC<MusicViewProps> = ({ onNavigateToJournal }) => {
  const [selectedStyle, setSelectedStyle] = useState<'lofi' | 'ambient' | 'chimes' | 'rain' | 'purple'>('purple');
  const [tempo, setTempo] = useState<number>(65); // BPM
  const [reverb, setReverb] = useState<number>(75);
  const [isPlaying, setIsPlaying] = useState(false);
  const [generatedWavUrl, setGeneratedWavUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentNoteName, setCurrentNoteName] = useState<string>('Ready');

  const audioCtxRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const presets = [
    {
      id: 'purple' as const,
      title: 'Purple Starlight Harmony 💜',
      desc: 'Gentle celestial chimes, delicate bell frequencies, and peaceful resonance',
      icon: Heart,
      color: 'from-purple-100 to-fuchsia-100 text-purple-800 dark:from-purple-950/60 dark:to-fuchsia-950/60 dark:text-purple-300',
      frequencies: [261.63, 329.63, 392.0, 440.0, 523.25, 659.25, 783.99], // C, E, G, A, C, E, G
      notes: ['C4', 'E4', 'G4', 'A4', 'C5', 'E5', 'G5'],
      waveform: 'sine' as OscillatorType,
    },
    {
      id: 'lofi' as const,
      title: 'Cozy Study & Lo-Fi Piano',
      desc: 'Warm electric piano triads, gentle chord progressions, and mellow mood',
      icon: Coffee,
      color: 'from-amber-100 to-rose-100 text-amber-800 dark:from-amber-950/60 dark:to-rose-950/60 dark:text-amber-300',
      frequencies: [220.0, 261.63, 329.63, 392.0, 440.0, 523.25], // Am7 / Cmaj7
      notes: ['A3', 'C4', 'E4', 'G4', 'A4', 'C5'],
      waveform: 'triangle' as OscillatorType,
    },
    {
      id: 'chimes' as const,
      title: 'Zen Garden & Singing Bells',
      desc: 'Crystal Tibetan bell harmonics, slow decay, and focused meditation',
      icon: Sun,
      color: 'from-emerald-100 to-teal-100 text-emerald-800 dark:from-emerald-950/60 dark:to-teal-950/60 dark:text-emerald-300',
      frequencies: [293.66, 369.99, 440.0, 554.37, 659.25], // D F# A C# E
      notes: ['D4', 'F#4', 'A4', 'C#5', 'E5'],
      waveform: 'sine' as OscillatorType,
    },
    {
      id: 'ambient' as const,
      title: 'Midnight Starlight (Deep Ambient)',
      desc: 'Warm low drones, soothing etheric waves, and comforting night rest',
      icon: Moon,
      color: 'from-indigo-100 to-slate-100 text-indigo-800 dark:from-indigo-950/60 dark:to-slate-800 dark:text-indigo-300',
      frequencies: [130.81, 164.81, 196.0, 246.94, 261.63], // C3, E3, G3, B3, C4
      notes: ['C3', 'E3', 'G3', 'B3', 'C4'],
      waveform: 'sine' as OscillatorType,
    },
    {
      id: 'rain' as const,
      title: 'Quiet Window Rain & Soft Chords',
      desc: 'Gentle raindrops frequency modulation with warm harmonic backing',
      icon: CloudRain,
      color: 'from-sky-100 to-blue-100 text-sky-800 dark:from-sky-950/60 dark:to-blue-950/60 dark:text-sky-300',
      frequencies: [174.61, 220.0, 261.63, 349.23, 440.0], // Fmaj7
      notes: ['F3', 'A3', 'C4', 'F4', 'A4'],
      waveform: 'triangle' as OscillatorType,
    },
  ];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getActivePreset = () => presets.find((p) => p.id === selectedStyle) || presets[0];

  // Helper to play a single soothing tone
  const playTone = (freq: number, duration: number, type: OscillatorType) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // Soft attack and smooth decay
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  // Continuous generative audio loop
  const scheduleNextNote = () => {
    if (!isPlayingRef.current || !audioCtxRef.current) return;

    const preset = getActivePreset();
    const noteIdx = Math.floor(Math.random() * preset.frequencies.length);
    const freq = preset.frequencies[noteIdx];
    const noteName = preset.notes[noteIdx];

    setCurrentNoteName(noteName);
    const noteDuration = 1.2 + (reverb / 100) * 1.5;
    playTone(freq, noteDuration, preset.waveform);

    // Calculate delay from tempo
    const intervalMs = (60 / tempo) * 1000 * (0.8 + Math.random() * 0.4);
    loopTimeoutRef.current = setTimeout(scheduleNextNote, intervalMs);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setCurrentNoteName('Resting');
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    } else {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      isPlayingRef.current = true;
      setIsPlaying(true);
      scheduleNextNote();
      confetti({
        particleCount: 25,
        spread: 40,
        origin: { y: 0.7 },
        colors: ['#A78BFA', '#8B5CF6', '#DDD6FE'],
      });
      showToast('Playing soothing sanctuary soundscape ✨');
    }
  };

  // Stop playback when component unmounts
  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, []);

  // Export 20-second rendered WAV file using OfflineAudioContext
  const exportWavTrack = async () => {
    showToast('Rendering peaceful audio track...');
    try {
      const sampleRate = 44100;
      const durationSeconds = 20;
      const offlineCtx = new OfflineAudioContext(2, sampleRate * durationSeconds, sampleRate);

      const preset = getActivePreset();
      let currentTime = 0.5;

      while (currentTime < durationSeconds - 2) {
        const noteIdx = Math.floor(Math.random() * preset.frequencies.length);
        const freq = preset.frequencies[noteIdx];

        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();

        osc.type = preset.waveform;
        osc.frequency.setValueAtTime(freq, currentTime);

        gain.gain.setValueAtTime(0, currentTime);
        gain.gain.linearRampToValueAtTime(0.18, currentTime + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.0001, currentTime + 2.0);

        osc.connect(gain);
        gain.connect(offlineCtx.destination);

        osc.start(currentTime);
        osc.stop(currentTime + 2.2);

        currentTime += 60 / tempo + Math.random() * 0.4;
      }

      const renderedBuffer = await offlineCtx.startRendering();

      // Encode audio buffer into standard WAV file
      const wavBlob = audioBufferToWavBlob(renderedBuffer);
      const url = URL.createObjectURL(wavBlob);
      setGeneratedWavUrl(url);

      const a = document.createElement('a');
      a.href = url;
      a.download = `borah_${selectedStyle}_melody.wav`;
      a.click();

      showToast('Sanctuary melody downloaded (.wav) 📥');
    } catch (err) {
      console.error('Export WAV error:', err);
      showToast('Unable to export WAV file.');
    }
  };

  // WAV header encoder helper
  const audioBufferToWavBlob = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const out = new DataView(new ArrayBuffer(length));
    const channels: Float32Array[] = [];
    let sample = 0;
    let offset = 0;
    let pos = 0;

    const setUint16 = (data: number) => {
      out.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data: number) => {
      out.setUint32(pos, data, true);
      pos += 4;
    };

    // RIFF chunk descriptor
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    // FMT sub-chunk
    setUint32(0x20746d66); // "fmt "
    setUint32(16); // subchunk1size (16 for PCM)
    setUint16(1); // audio format (1 = PCM)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
    setUint16(numOfChan * 2); // block align
    setUint16(16); // bits per sample

    // data sub-chunk
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4);

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        out.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([out.buffer], { type: 'audio/wav' });
  };

  const activePreset = getActivePreset();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
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
            <span>Sanctuary Melodies 🎵</span>
            <span className="text-xs font-sans font-semibold text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-950/60 px-2.5 py-1 rounded-xl">
              Web Audio Synthesizer
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Calming, generative ambient melodies to accompany your journaling, reading, and quiet moments.
          </p>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Preset Mood Selection & Acoustic Settings (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              Choose Sanctuary Melody Atmosphere
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {presets.map((p) => {
                const Icon = p.icon;
                const isSelected = selectedStyle === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedStyle(p.id);
                      if (isPlaying) {
                        showToast(`Switched atmosphere to ${p.title} ✨`);
                      }
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-purple-500 ring-2 ring-purple-400/30 bg-purple-50/50 dark:bg-slate-800 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-xl bg-gradient-to-br ${p.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{p.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{p.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sound Controls */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Acoustic Tuning
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Tempo (BPM)</span>
                  <span className="font-mono font-bold">{tempo}</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  value={tempo}
                  onChange={(e) => setTempo(Number(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Resonance / Sustain</span>
                  <span className="font-mono font-bold">{reverb}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={reverb}
                  onChange={(e) => setReverb(Number(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={togglePlayback}
              className={`flex-1 py-3.5 px-6 rounded-2xl text-xs font-semibold text-white transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 ${
                isPlaying ? 'bg-amber-600 hover:bg-amber-700' : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause Soundscape</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Play Sanctuary Harmony ✨</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={exportWavTrack}
              className="py-3.5 px-5 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
              title="Render and Download WAV File"
            >
              <Download className="w-4 h-4 text-purple-600" />
              <span>Export WAV</span>
            </button>
          </div>
        </div>

        {/* Right Column: Audio Canvas Visualizer (5 Cols) */}
        <div className="lg:col-span-5 bg-gradient-to-b from-[#1E1135] via-[#120B24] to-[#0A0515] text-white rounded-3xl p-6 sm:p-8 border border-purple-500/30 shadow-2xl space-y-6">
          <div className="flex items-center justify-between text-xs text-purple-300">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <Radio className={`w-4 h-4 text-purple-400 ${isPlaying ? 'animate-pulse' : ''}`} /> Generative Engine
            </span>
            <span className="font-mono text-[11px] text-purple-400">
              {isPlaying ? 'Streaming Harmonic Waves' : 'Dormant'}
            </span>
          </div>

          {/* Spinning Vinyl Record Visualizer */}
          <div className="relative aspect-square max-w-[200px] mx-auto rounded-full bg-gradient-to-tr from-purple-800 via-violet-600 to-indigo-700 p-2 shadow-2xl flex items-center justify-center">
            <div
              className={`w-full h-full rounded-full bg-slate-950 border-4 border-purple-500/30 flex items-center justify-center relative overflow-hidden ${
                isPlaying ? 'animate-spin' : ''
              }`}
              style={{ animationDuration: '6s' }}
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 via-pink-400 to-amber-400 flex items-center justify-center text-white shadow-inner">
                <Music className="w-6 h-6" />
              </div>
            </div>
            <div className="absolute w-3.5 h-3.5 rounded-full bg-slate-900 border border-white/50" />
          </div>

          {/* Live Frequency & Atmosphere Display */}
          <div className="p-4 rounded-2xl bg-white/5 border border-purple-500/20 text-center space-y-1">
            <span className="text-[10px] text-purple-300 uppercase tracking-widest font-mono">Current Harmony</span>
            <div className="text-lg font-bold font-serif text-purple-100 flex items-center justify-center gap-2">
              <span>{activePreset.title}</span>
            </div>
            <div className="text-xs text-purple-400 font-mono">
              Tone: {currentNoteName} · {activePreset.waveform} wave
            </div>
          </div>

          {/* Quick Journal Attachment */}
          {onNavigateToJournal && (
            <div className="pt-2 border-t border-purple-900/40">
              <button
                type="button"
                onClick={() => {
                  onNavigateToJournal(`🎵 Composed during ${activePreset.title} session`);
                  showToast('Opened journal with melody note ✨');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Write Diary to this Melody</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

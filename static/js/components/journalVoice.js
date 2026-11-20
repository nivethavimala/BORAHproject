import { escapeHtml, renderIcons, sanitizeUrl } from '../utils/dom.js';

function formatTimer(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatShortTime(secs) {
  const m = Math.floor((secs || 0) / 60);
  const s = Math.floor((secs || 0) % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function mountInlineVoiceRecorder(container, { onComplete, onCancel }) {
  let isPaused = false;
  let duration = 0;
  let errorMessage = null;
  let audioLevels = [15, 25, 40, 20, 50, 30, 60, 25, 45, 20, 35, 15];

  let mediaRecorder = null;
  let audioChunks = [];
  let timerInterval = null;
  let audioContext = null;
  let analyser = null;
  let animationFrame = null;
  let stream = null;
  let disposed = false;

  const cleanup = () => {
    disposed = true;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    if (audioContext && audioContext.state !== 'closed') {
      try {
        audioContext.close();
      } catch {
        // Ignore close error
      }
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
  };

  const updateTimerAndSaveButton = () => {
    const timerEl = container.querySelector('[data-vr-timer]');
    if (timerEl) timerEl.textContent = formatTimer(duration);
    const saveBtn = container.querySelector('[data-vr-save]');
    if (saveBtn) saveBtn.disabled = duration < 1;
  };

  const updateWaveformDom = () => {
    const bars = container.querySelectorAll('[data-vr-bar]');
    bars.forEach((bar, idx) => {
      const lvl = audioLevels[idx] ?? 20;
      bar.style.height = `${lvl}%`;
    });
  };

  const render = () => {
    if (disposed) return;

    const barsHtml = audioLevels
      .map(
        (lvl, idx) => `
      <div data-vr-bar="${idx}" class="w-1 rounded-full transition-all duration-75 ${
          isPaused ? 'bg-slate-300 dark:bg-slate-700' : 'bg-gradient-to-t from-purple-600 to-pink-500'
        }" style="height:${lvl}%"></div>`
      )
      .join('');

    container.innerHTML = `
      <div class="my-3 p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-amber-500/10 border-2 border-purple-300 dark:border-purple-600 shadow-md backdrop-blur-xs transition-all animate-in fade-in zoom-in-95">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="relative flex items-center justify-center">
              <span class="w-4 h-4 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-rose-500 animate-ping'} opacity-75"></span>
              <span class="absolute w-3 h-3 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-rose-500'}"></span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
                  ${isPaused ? 'Voice Memo Paused' : 'Recording Voice'}
                </span>
                <span data-vr-timer class="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-2xs">
                  ${formatTimer(duration)}
                </span>
              </div>
              <p class="text-[11px] text-purple-800/80 dark:text-purple-300/80 mt-0.5">
                Speak your thoughts naturally.
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1 h-8 px-3 bg-white/70 dark:bg-slate-900/60 rounded-xl border border-purple-200/60 dark:border-purple-800/60 self-center">
            ${barsHtml}
          </div>

          <div class="flex items-center gap-2 self-end sm:self-center">
            <button type="button" data-vr-pause
              class="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-all shadow-2xs cursor-pointer flex items-center gap-1"
              title="${isPaused ? 'Resume recording' : 'Pause recording'}">
              <i data-lucide="${isPaused ? 'play' : 'pause'}" class="w-3.5 h-3.5 fill-current"></i>
              <span class="hidden sm:inline">${isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button type="button" data-vr-save ${duration < 1 ? 'disabled' : ''}
              class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              title="Done & Insert Voice Memo Here">
              <i data-lucide="check" class="w-3.5 h-3.5"></i>
              <span>Insert Voice Memo ✨</span>
            </button>

            <button type="button" data-vr-cancel
              class="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Cancel and discard">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        ${
          errorMessage
            ? `<div class="mt-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <i data-lucide="alert-circle" class="w-4 h-4 shrink-0"></i>
                <span>${escapeHtml(errorMessage)}</span>
              </div>`
            : ''
        }
      </div>
    `;

    renderIcons(container);

    container.querySelector('[data-vr-pause]')?.addEventListener('click', () => {
      if (!mediaRecorder) return;
      if (isPaused) {
        try {
          mediaRecorder.resume();
          isPaused = false;
          timerInterval = window.setInterval(() => {
            duration += 1;
            updateTimerAndSaveButton();
          }, 1000);
          render();
        } catch (err) {
          console.warn('Error resuming recorder:', err);
        }
      } else {
        try {
          mediaRecorder.pause();
          isPaused = true;
          if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
          }
          render();
        } catch (err) {
          console.warn('Error pausing recorder:', err);
        }
      }
    });

    container.querySelector('[data-vr-save]')?.addEventListener('click', () => {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunks, { type: mimeType });
        const finalDuration = Math.max(1, duration);

        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = String(reader.result || '');
          const clipId = `memo_${Date.now()}`;
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const label = `Voice Reflection • ${timeStr}`;
          cleanup();
          if (onComplete) {
            onComplete({
              id: clipId,
              url: dataUrl,
              duration: finalDuration,
              label,
              created_at: new Date().toISOString(),
            });
          }
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorder.stop();
    });

    container.querySelector('[data-vr-cancel]')?.addEventListener('click', () => {
      cleanup();
      if (onCancel) onCancel();
    });
  };

  const startRecording = async () => {
    try {
      errorMessage = null;
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (disposed) {
        cleanup();
        return;
      }

      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioContext = new AudioContextClass();
          const source = audioContext.createMediaStreamSource(stream);
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLevels = () => {
            if (disposed) return;
            if (analyser && !isPaused) {
              analyser.getByteFrequencyData(dataArray);
              const bars = [];
              const step = Math.floor(dataArray.length / 12) || 1;
              for (let i = 0; i < 12; i++) {
                const val = dataArray[i * step] || 10;
                bars.push(Math.max(12, Math.min(85, Math.round((val / 255) * 85))));
              }
              audioLevels = bars;
              updateWaveformDom();
            }
            animationFrame = requestAnimationFrame(updateLevels);
          };
          updateLevels();
        }
      } catch (err) {
        console.warn('Audio visualization unavailable:', err);
      }

      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      const options = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
      mediaRecorder = new MediaRecorder(stream, options);
      audioChunks = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.start(250);
      isPaused = false;
      timerInterval = window.setInterval(() => {
        duration += 1;
        updateTimerAndSaveButton();
      }, 1000);
    } catch (err) {
      console.error('Failed to access microphone:', err);
      errorMessage =
        err && err.name === 'NotAllowedError'
          ? 'Microphone access was denied. Please allow microphone permissions in your browser bar.'
          : 'Could not access your microphone. Please check your audio input settings.';
      render();
    }
  };

  render();
  startRecording();

  return cleanup;
}

export function mountInlineVoiceMemoCard(container, clip, { isEditing = false, onDelete } = {}) {
  let isPlaying = false;
  let currentTime = 0;
  let totalDuration = clip.duration || 0;
  let disposed = false;

  const safeUrl = sanitizeUrl(clip.url) || '';
  const audio = new Audio(safeUrl);

  const syncPlayStateUi = () => {
    if (disposed) return;
    const playBtn = container.querySelector('[data-vm-toggle]');
    const timeEl = container.querySelector('[data-vm-time]');
    const rangeEl = container.querySelector('[data-vm-range]');
    const bars = container.querySelectorAll('[data-vm-wave]');

    if (playBtn) {
      playBtn.className = `w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-all cursor-pointer ${
        isPlaying
          ? 'bg-gradient-to-tr from-purple-600 to-pink-600 text-white scale-105'
          : 'bg-purple-600 hover:bg-purple-700 text-white hover:scale-105 active:scale-95'
      }`;
      playBtn.title = isPlaying ? 'Pause voice reflection' : 'Play voice reflection';
      playBtn.innerHTML = isPlaying
        ? '<i data-lucide="pause" class="w-4 h-4 fill-white"></i>'
        : '<i data-lucide="play" class="w-4 h-4 fill-white ml-0.5"></i>';
      renderIcons(playBtn);
    }

    if (timeEl) {
      timeEl.textContent = `${formatShortTime(currentTime)} / ${formatShortTime(totalDuration)}`;
    }

    if (rangeEl) {
      rangeEl.max = String(totalDuration || 1);
      rangeEl.value = String(currentTime);
    }

    const heights = [40, 75, 50, 90, 60, 85, 45, 95, 65, 35];
    bars.forEach((bar, i) => {
      const h = heights[i] || 50;
      bar.className = `w-1 rounded-full transition-all duration-150 ${
        isPlaying ? 'bg-purple-600 dark:bg-purple-400 animate-pulse' : 'bg-purple-200 dark:bg-slate-700'
      }`;
      bar.style.height = isPlaying ? `${Math.max(20, h * (i % 2 === 0 ? 1 : 0.7))}%` : '25%';
    });
  };

  audio.onloadedmetadata = () => {
    if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
      totalDuration = Math.round(audio.duration);
      syncPlayStateUi();
    }
  };

  audio.ontimeupdate = () => {
    currentTime = Math.round(audio.currentTime);
    syncPlayStateUi();
  };

  audio.onended = () => {
    isPlaying = false;
    currentTime = 0;
    syncPlayStateUi();
  };

  audio.onpause = () => {
    isPlaying = false;
    syncPlayStateUi();
  };

  const heights = [40, 75, 50, 90, 60, 85, 45, 95, 65, 35];
  const waveBarsHtml = heights
    .map(
      (h, i) => `
      <span data-vm-wave="${i}" class="w-1 rounded-full transition-all duration-150 bg-purple-200 dark:bg-slate-700" style="height:25%; animation-delay:${i * 90}ms"></span>`
    )
    .join('');

  container.innerHTML = `
    <div class="my-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-pink-50/50 to-amber-50/60 dark:from-purple-950/40 dark:via-slate-900/60 dark:to-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 shadow-xs hover:shadow-sm transition-all group not-prose">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <button type="button" data-vm-toggle
            class="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-all cursor-pointer bg-purple-600 hover:bg-purple-700 text-white hover:scale-105 active:scale-95"
            title="Play voice reflection">
            <i data-lucide="play" class="w-4 h-4 fill-white ml-0.5"></i>
          </button>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1">
                <i data-lucide="mic" class="w-3 h-3 text-purple-500"></i>
                <span>Voice Journal Note</span>
              </span>
              <span data-vm-time class="text-[10px] text-slate-400 font-mono">
                ${formatShortTime(currentTime)} / ${formatShortTime(totalDuration)}
              </span>
            </div>
            <h4 class="text-xs font-bold text-slate-800 dark:text-slate-100 font-serif truncate mt-0.5">
              ${escapeHtml(clip.label || 'Spoken Memory Reflection')}
            </h4>
            <div class="relative mt-2 flex items-center gap-2">
              <input type="range" data-vm-range min="0" max="${totalDuration || 1}" value="${currentTime}"
                class="w-full h-1.5 bg-purple-200/60 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600" />
            </div>
          </div>
        </div>

        <div class="hidden sm:flex items-center gap-0.5 h-6 px-2 shrink-0">
          ${waveBarsHtml}
        </div>

        ${
          isEditing && onDelete
            ? `<button type="button" data-vm-delete
                class="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-70 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                title="Delete this voice memo">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>`
            : ''
        }
      </div>
    </div>
  `;

  renderIcons(container);

  container.querySelector('[data-vm-toggle]')?.addEventListener('click', () => {
    if (isPlaying) {
      audio.pause();
      isPlaying = false;
      syncPlayStateUi();
    } else {
      audio
        .play()
        .then(() => {
          isPlaying = true;
          syncPlayStateUi();
        })
        .catch((err) => {
          console.warn('Playback error:', err);
          isPlaying = false;
          syncPlayStateUi();
        });
    }
  });

  container.querySelector('[data-vm-range]')?.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    currentTime = val;
    audio.currentTime = val;
    syncPlayStateUi();
  });

  container.querySelector('[data-vm-delete]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(clip.id);
  });

  return () => {
    disposed = true;
    audio.pause();
    audio.src = '';
  };
}

import { escapeHtml, renderIcons } from '../utils/dom.js';

const AFFIRMATIONS = [
  'You are doing so well just by being here today. Take a gentle breath. 💜',
  'Your thoughts and feelings matter. Let every word flow freely without judgment. ✨',
  "It's okay to feel whatever you're feeling right now. I'm right here with you! 🌸",
  'Every page you write is a love letter to your future self. 💌',
  'You are stronger than you know, and softer than you give yourself credit for. 🌷',
  'Small steps still move you forward. Be proud of taking time for yourself today. ☁️',
  'Remember: No darkness, no season can last forever. Morning always comes. 🌅',
  "You don't have to be perfect; you just have to be authentically you. 💜",
];

const BTS_MAGIC_QUOTES = [
  '"The morning will come again. No darkness, no season can last forever." — Spring Day 🌸',
  '"You gave me the best of me, so you\'ll give you the best of you." — Magic Shop 🔮',
  '"May your trials end in full bloom." — So Far Away 🌷',
  '"I have come to love myself for who I am, for who I was, and for who I hope to become." — RM 💜',
  '"If you want to aim high, aim high. Don\'t let all that fear stop you." — Suga 🌟',
  '"Live your life. It\'s yours anyway. Don\'t try too hard, it\'s okay to lose." — Fire 🔥',
  '"Stars shine brightest in the deepest dark." — Mikrokosmos ✨',
];

const CHEERS = [
  "Woohoo! You are simply brilliant! I'm cheering so loud for you! 🎉💜",
  'Sending you 1,000 sparkles of joy and boundless positivity! ✨🥰',
  "You're doing wonderfully! Look at you showing up for yourself! 🌸👏",
  'Bora is giving you a high five and a huge warm purple hug! 🐾💜',
];

const TAB_MESSAGES = {
  dashboard: { text: 'Welcome home to BORAH! Take a peaceful moment for yourself today. 💜', mood: 'happy' },
  journal: { text: 'Your journal is a sacred space for your real thoughts. Write freely without fear! 📖🌸', mood: 'blush' },
  planner: { text: "Your timetable is here! Let's organize your day gently, one small step at a time. 📅✨", mood: 'sparkle' },
  tasks: { text: 'Check off your tasks at your own pace. Every small checkmark is a victory! ✅💜', mood: 'happy' },
  notes: { text: 'Sticky notes ready for quick thoughts, bright ideas, and gentle reminders! 📌💭', mood: 'sparkle' },
  insights: { text: 'Look at how your journaling journey is growing! Be proud of your consistency! 🌱📊', mood: 'sparkle' },
  settings: { text: 'Customizing your personal haven? Make BORAH feel completely like home! ⚙️🎨', mood: 'happy' },
};

export function createAiCompanion(container) {
  let isOpen = false;
  let isMinimized = false;
  let activeTab = 'dashboard';
  let currentMood = 'calm';
  let characterMood = 'happy';
  let message = "Hi! I'm Bora, your lovely companion! I follow you everywhere! 💜";
  let isPetting = false;
  let breathingPhase = 'idle';
  let breathingTimer = 4;
  let breathInterval = null;

  const fireConfetti = (opts) => {
    try {
      if (typeof window.confetti === 'function') window.confetti(opts);
    } catch {}
  };

  const stopBreathing = () => {
    if (breathInterval) {
      clearInterval(breathInterval);
      breathInterval = null;
    }
    breathingPhase = 'idle';
  };

  const startBreathing = () => {
    stopBreathing();
    characterMood = 'breathing';
    breathingPhase = 'inhale';
    breathingTimer = 4;
    message = 'Breathe in deeply with me... filling your chest with calm. 🌿';
    isOpen = true;
    render();

    breathInterval = setInterval(() => {
      if (breathingTimer > 1) {
        breathingTimer -= 1;
        render();
        return;
      }
      if (breathingPhase === 'inhale') {
        breathingPhase = 'hold';
        message = 'Hold gently... keep the calm inside you. 🌸';
        breathingTimer = 4;
      } else if (breathingPhase === 'hold') {
        breathingPhase = 'exhale';
        message = 'Exhale slowly... release all tension. 🍃';
        breathingTimer = 4;
      } else {
        stopBreathing();
        characterMood = 'happy';
        message = 'Wonderful job. You are grounded, safe, and at peace. 💜';
      }
      render();
    }, 1000);
  };

  const buildSvg = () => {
    let eyesSvg = '';
    if (characterMood === 'blush' || isPetting) {
      eyesSvg = `
        <path d="M33 56 C36 51 42 51 45 56" stroke="#4C1D95" stroke-width="3" stroke-linecap="round" fill="none" />
        <path d="M55 56 C58 51 64 51 67 56" stroke="#4C1D95" stroke-width="3" stroke-linecap="round" fill="none" />`;
    } else if (characterMood === 'sparkle') {
      eyesSvg = `
        <circle cx="39" cy="54" r="5" fill="#4C1D95" />
        <circle cx="61" cy="54" r="5" fill="#4C1D95" />
        <circle cx="37" cy="52" r="2" fill="#FFFFFF" />
        <circle cx="59" cy="52" r="2" fill="#FFFFFF" />
        <circle cx="41.5" cy="55.5" r="1.1" fill="#FFFFFF" />
        <circle cx="63.5" cy="55.5" r="1.1" fill="#FFFFFF" />`;
    } else if (characterMood === 'breathing') {
      eyesSvg = `
        <path d="M33 57 C36 59 42 59 45 57" stroke="#4C1D95" stroke-width="2.5" stroke-linecap="round" fill="none" />
        <path d="M55 57 C58 59 64 59 67 57" stroke="#4C1D95" stroke-width="2.5" stroke-linecap="round" fill="none" />`;
    } else {
      eyesSvg = `
        <circle cx="39" cy="55" r="4.6" fill="#3B0764" />
        <circle cx="61" cy="55" r="4.6" fill="#3B0764" />
        <circle cx="37.2" cy="53.2" r="1.8" fill="#FFFFFF" />
        <circle cx="59.2" cy="53.2" r="1.8" fill="#FFFFFF" />`;
    }

    return `
      <svg width="96" height="96" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="boraBodyGrad" x1="20" y1="20" x2="80" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#F3E8FF" />
            <stop offset="45%" stop-color="#C084FC" />
            <stop offset="100%" stop-color="#9333EA" />
          </linearGradient>
          <radialGradient id="boraCheekGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#F472B6" stop-opacity="0.85" />
            <stop offset="100%" stop-color="#F472B6" stop-opacity="0" />
          </radialGradient>
        </defs>
        <path d="M32 38 C26 10 40 6 44 26 C46 32 42 38 38 40 Z" fill="url(#boraBodyGrad)" style="animation: bora-ear-left 4s ease-in-out infinite; transform-origin: 36px 36px;" />
        <path d="M34 32 C30 16 38 12 41 24 C42 28 40 32 37 34 Z" fill="#FBCFE8" opacity="0.9" />
        <path d="M68 38 C74 10 60 6 56 26 C54 32 58 38 62 40 Z" fill="url(#boraBodyGrad)" style="animation: bora-ear-right 4s ease-in-out infinite 0.5s; transform-origin: 64px 36px;" />
        <path d="M66 32 C70 16 62 12 59 24 C58 28 60 32 63 34 Z" fill="#FBCFE8" opacity="0.9" />
        <circle cx="68" cy="28" r="7.5" fill="#FDE047" />
        <polygon points="68,23 70,27 74,28 71,31 72,35 68,32 64,35 65,31 62,28 66,27" fill="#F59E0B" />
        <circle cx="50" cy="58" r="33" fill="url(#boraBodyGrad)" />
        <ellipse cx="50" cy="51" rx="27" ry="23" fill="#FFFFFF" opacity="0.25" />
        <circle cx="32" cy="64" r="7.5" fill="url(#boraCheekGrad)" />
        <circle cx="68" cy="64" r="7.5" fill="url(#boraCheekGrad)" />
        ${eyesSvg}
        <ellipse cx="50" cy="59" rx="2" ry="1.4" fill="#BE185D" />
        <path d="M45 63 Q50 67 55 63" stroke="#4C1D95" stroke-width="2.5" stroke-linecap="round" fill="none" />
        <path d="M37 75 C42 71 48 71 50 74" stroke="#9333EA" stroke-width="3.2" stroke-linecap="round" fill="none" />
        <path d="M63 75 C58 71 52 71 50 74" stroke="#9333EA" stroke-width="3.2" stroke-linecap="round" fill="none" />
        <path d="M50 72 C49 70 45 68 43 71 C41 74 42 77 50 82 C58 77 59 74 57 71 C55 68 51 70 50 72 Z" fill="#E879F9" />
      </svg>`;
  };

  const render = () => {
    if (isMinimized) {
      container.innerHTML = `
        <button type="button" data-bora-restore class="fixed bottom-6 right-5 z-50 flex items-center gap-2 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-500 text-white px-3.5 py-2.5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all text-xs font-semibold cursor-pointer border border-purple-300/60" title="Summon Bora, your AI companion">
          <span class="text-xl animate-bounce">🐰</span>
          <span class="tracking-wide">Bora AI</span>
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        </button>`;
      container.querySelector('[data-bora-restore]')?.addEventListener('click', () => {
        isMinimized = false;
        isOpen = true;
        render();
      });
      return;
    }

    const breathingHtml =
      breathingPhase !== 'idle'
        ? `
      <div class="my-2 p-3 rounded-2xl bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-950/60 dark:to-pink-950/40 text-center flex flex-col items-center justify-center">
        <div class="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-pink-400 flex items-center justify-center text-white font-bold text-sm shadow-md transition-all duration-1000 ${
          breathingPhase === 'inhale' ? 'scale-125' : breathingPhase === 'hold' ? 'scale-125 ring-4 ring-purple-300' : 'scale-90'
        }">${breathingTimer}s</div>
        <span class="mt-2 text-[11px] font-bold text-purple-900 dark:text-purple-200 uppercase tracking-widest">
          ${breathingPhase === 'inhale' ? 'Inhale Slowly...' : breathingPhase === 'hold' ? 'Hold Gently...' : 'Exhale Completely...'}
        </span>
      </div>`
        : '';

    const bubbleHtml = isOpen
      ? `
      <div class="pointer-events-auto mb-3 max-w-xs w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-purple-200/90 dark:border-purple-800/80 animate-in fade-in slide-in-from-bottom-3 duration-300">
        <div class="flex items-center justify-between border-b border-purple-100 dark:border-purple-800/60 pb-2.5 mb-2.5">
          <div class="flex items-center gap-2">
            <span class="relative flex h-2.5 w-2.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-600"></span>
            </span>
            <span class="text-xs font-bold text-purple-950 dark:text-purple-100 tracking-wide">Bora • AI Companion</span>
            <span class="text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-semibold capitalize">
              ${breathingPhase !== 'idle' ? `Breathing (${breathingTimer}s)` : escapeHtml(currentMood)}
            </span>
          </div>
          <button type="button" data-bora-close class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors cursor-pointer" title="Close dialogue">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>
        ${breathingHtml}
        <p class="text-xs text-gray-700 dark:text-gray-200 leading-relaxed font-medium mb-3">${escapeHtml(message)}</p>
        <div class="flex flex-wrap gap-1.5 pt-2 border-t border-purple-50 dark:border-purple-800/40">
          <button type="button" data-bora-aff class="flex items-center gap-1.5 text-[11px] bg-purple-50 dark:bg-purple-950/70 hover:bg-purple-100 text-purple-700 dark:text-purple-300 px-2.5 py-1.5 rounded-full font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs">
            <i data-lucide="heart" class="w-3 h-3 text-purple-500 fill-purple-400"></i>
            <span>Affirmation</span>
          </button>
          <button type="button" data-bora-magic class="flex items-center gap-1.5 text-[11px] bg-violet-50 dark:bg-violet-950/70 hover:bg-violet-100 text-violet-700 dark:text-violet-300 px-2.5 py-1.5 rounded-full font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs">
            <i data-lucide="sparkles" class="w-3 h-3 text-violet-500"></i>
            <span>Purple Magic</span>
          </button>
          <button type="button" data-bora-breath class="flex items-center gap-1.5 text-[11px] bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 px-2.5 py-1.5 rounded-full font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs">
            <i data-lucide="wind" class="w-3 h-3 text-emerald-500"></i>
            <span>Gentle Breath</span>
          </button>
          <button type="button" data-bora-cheer class="flex items-center gap-1.5 text-[11px] bg-pink-50 dark:bg-pink-950/70 hover:bg-pink-100 text-pink-700 dark:text-pink-300 px-2.5 py-1.5 rounded-full font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs">
            <i data-lucide="party-popper" class="w-3 h-3 text-pink-500"></i>
            <span>Cheer Me Up</span>
          </button>
        </div>
      </div>`
      : '';

    container.innerHTML = `
      <div class="fixed bottom-6 right-4 sm:right-7 z-50 flex flex-col items-end pointer-events-none select-none">
        ${bubbleHtml}
        <div class="pointer-events-auto relative group flex items-center gap-2">
          <div class="opacity-0 group-hover:opacity-100 transition-opacity absolute -left-36 top-8 bg-purple-950/90 text-white text-[11px] px-3 py-1.5 rounded-xl shadow-lg whitespace-nowrap pointer-events-none font-medium">
            Click Bora to talk! 💜
          </div>
          <button type="button" data-bora-minimize class="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-800 hover:bg-white text-gray-500 p-1.5 rounded-full shadow text-[10px] cursor-pointer" title="Minimize Bora">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
          </button>
          <div data-bora-pet class="cursor-pointer transition-all duration-300 filter drop-shadow-xl ${isPetting ? 'scale-110' : 'hover:scale-105'}"
            style="animation:${breathingPhase !== 'idle' ? 'bora-breathe 4s ease-in-out infinite' : 'bora-float 3.5s ease-in-out infinite'}">
            <div class="absolute inset-0 -z-10 rounded-full bg-gradient-to-tr from-purple-400/30 to-pink-400/30 blur-md scale-95 animate-pulse"></div>
            ${buildSvg()}
          </div>
        </div>
      </div>
    `;

    renderIcons(container);
    container.querySelector('[data-bora-close]')?.addEventListener('click', () => {
      isOpen = false;
      render();
    });
    container.querySelector('[data-bora-minimize]')?.addEventListener('click', () => {
      isMinimized = true;
      render();
    });
    container.querySelector('[data-bora-pet]')?.addEventListener('click', () => {
      isOpen = true;
      isPetting = true;
      characterMood = 'blush';
      const petPhrases = [
        "*purrs softly* You're the kindest human! 💜",
        'Hehe, that tickles! Thank you for spending time with me! ✨',
        'Sending you a warm, soft lavender hug right now! 🌸',
        "I believe in you so much today! You've got this! 🌷",
      ];
      message = petPhrases[Math.floor(Math.random() * petPhrases.length)];
      render();
      setTimeout(() => {
        isPetting = false;
        render();
      }, 900);
    });
    container.querySelector('[data-bora-aff]')?.addEventListener('click', () => {
      message = AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];
      characterMood = 'sparkle';
      isOpen = true;
      render();
    });
    container.querySelector('[data-bora-magic]')?.addEventListener('click', () => {
      message = BTS_MAGIC_QUOTES[Math.floor(Math.random() * BTS_MAGIC_QUOTES.length)];
      characterMood = 'blush';
      isOpen = true;
      fireConfetti({ particleCount: 25, spread: 50, origin: { y: 0.85, x: 0.85 }, colors: ['#9333EA', '#C084FC', '#F472B6', '#FAF5FF'] });
      render();
    });
    container.querySelector('[data-bora-breath]')?.addEventListener('click', startBreathing);
    container.querySelector('[data-bora-cheer]')?.addEventListener('click', () => {
      message = CHEERS[Math.floor(Math.random() * CHEERS.length)];
      characterMood = 'sparkle';
      isOpen = true;
      fireConfetti({ particleCount: 45, spread: 65, origin: { y: 0.85, x: 0.85 }, colors: ['#A855F7', '#EC4899', '#F59E0B', '#38BDF8', '#10B981'] });
      render();
    });
  };

  render();

  return {
    setTab(tab) {
      if (activeTab === tab) return;
      activeTab = tab;
      const meta = TAB_MESSAGES[tab];
      if (meta) {
        message = meta.text;
        characterMood = meta.mood;
        render();
      }
    },
  };
}

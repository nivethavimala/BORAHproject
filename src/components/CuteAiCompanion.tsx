import React, { useState, useEffect } from 'react';
import { Sparkles, Heart, X, Smile, Wind, PartyPopper } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CuteAiCompanionProps {
  activeTab?: string;
  currentMood?: string;
  wordCount?: number;
  characterCount?: number;
  isDictating?: boolean;
  entryTitle?: string;
}

const AFFIRMATIONS = [
  "You are doing so well just by being here today. Take a gentle breath. 💜",
  "Your thoughts and feelings matter. Let every word flow freely without judgment. ✨",
  "It's okay to feel whatever you're feeling right now. I'm right here with you! 🌸",
  "Every page you write is a love letter to your future self. 💌",
  "You are stronger than you know, and softer than you give yourself credit for. 🌷",
  "Small steps still move you forward. Be proud of taking time for yourself today. ☁️",
  "Remember: No darkness, no season can last forever. Morning always comes. 🌅",
  "You don't have to be perfect; you just have to be authentically you. 💜",
];

const BTS_MAGIC_QUOTES = [
  "\"The morning will come again. No darkness, no season can last forever.\" — Spring Day 🌸",
  "\"You gave me the best of me, so you'll give you the best of you.\" — Magic Shop 🔮",
  "\"May your trials end in full bloom.\" — So Far Away 🌷",
  "\"I have come to love myself for who I am, for who I was, and for who I hope to become.\" — RM 💜",
  "\"If you want to aim high, aim high. Don't let all that fear stop you.\" — Suga 🌟",
  "\"Live your life. It's yours anyway. Don't try too hard, it's okay to lose.\" — Fire 🔥",
  "\"Stars shine brightest in the deepest dark.\" — Mikrokosmos ✨",
];

const CHEERS = [
  "Woohoo! You are simply brilliant! I'm cheering so loud for you! 🎉💜",
  "Sending you 1,000 sparkles of joy and boundless positivity! ✨🥰",
  "You're doing wonderfully! Look at you showing up for yourself! 🌸👏",
  "Bora is giving you a high five and a huge warm purple hug! 🐾💜",
];

export const CuteAiCompanion: React.FC<CuteAiCompanionProps> = ({
  activeTab = 'dashboard',
  currentMood = 'calm',
  wordCount = 0,
  isDictating = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string>("Hi! I'm Bora, your lovely companion! I follow you everywhere! 💜");
  const [characterMood, setCharacterMood] = useState<'happy' | 'blush' | 'listening' | 'sparkle' | 'breathing'>('happy');
  const [isPetting, setIsPetting] = useState(false);
  const [lastCheeredMilestone, setLastCheeredMilestone] = useState<number>(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<'idle' | 'inhale' | 'hold' | 'exhale'>('idle');
  const [breathingTimer, setBreathingTimer] = useState<number>(4);

  // Tab switch reaction: Bora speaks contextually wherever the user goes
  useEffect(() => {
    switch (activeTab) {
      case 'dashboard':
        setMessage("Welcome home to BORAH! Take a peaceful moment for yourself today. 💜");
        setCharacterMood('happy');
        break;
      case 'journal':
        setMessage("Your journal is a sacred space for your real thoughts. Write freely without fear! 📖🌸");
        setCharacterMood('blush');
        break;
      case 'planner':
        setMessage("Your timetable is here! Let's organize your day gently, one small step at a time. 📅✨");
        setCharacterMood('sparkle');
        break;
      case 'tasks':
        setMessage("Check off your tasks at your own pace. Every small checkmark is a victory! ✅💜");
        setCharacterMood('happy');
        break;
      case 'notes':
        setMessage("Sticky notes ready for quick thoughts, bright ideas, and gentle reminders! 📌💭");
        setCharacterMood('sparkle');
        break;
      case 'insights':
        setMessage("Look at how your journaling journey is growing! Be proud of your consistency! 🌱📊");
        setCharacterMood('sparkle');
        break;
      case 'settings':
        setMessage("Customizing your personal haven? Make BORAH feel completely like home! ⚙️🎨");
        setCharacterMood('happy');
        break;
      default:
        break;
    }
  }, [activeTab]);

  // React to word count milestones in journal
  useEffect(() => {
    if (wordCount >= 200 && lastCheeredMilestone < 200) {
      setLastCheeredMilestone(200);
      celebrateMilestone("Incredible! 200 words! You're pouring your heart out so beautifully! 🌟💜");
    } else if (wordCount >= 100 && lastCheeredMilestone < 100) {
      setLastCheeredMilestone(100);
      celebrateMilestone("100 words written! You're doing amazing! Keep writing your story! ✨🎉");
    } else if (wordCount >= 50 && lastCheeredMilestone < 50) {
      setLastCheeredMilestone(50);
      celebrateMilestone("50 words! You're in the flow now! Let it all out~ 🌷");
    }
  }, [wordCount, lastCheeredMilestone]);

  // React when dictating starts
  useEffect(() => {
    if (isDictating) {
      setCharacterMood('listening');
      setMessage("I'm listening closely to your voice... Speak from your heart! 🎙️💜");
      setIsOpen(true);
    } else if (characterMood === 'listening') {
      setCharacterMood('happy');
    }
  }, [isDictating]);

  // React to mood changes
  useEffect(() => {
    if (currentMood === 'sad' || currentMood === 'anxious') {
      setCharacterMood('blush');
      setMessage("I sense you're carrying something heavy. You are safe and loved here. 💜");
    } else if (currentMood === 'happy' || currentMood === 'excited') {
      setCharacterMood('sparkle');
      setMessage("Your joy is radiating today! I love seeing you this happy! ✨🥰");
    }
  }, [currentMood]);

  // Breathing exercise loop
  useEffect(() => {
    if (breathingPhase === 'idle') return;

    const interval = setInterval(() => {
      setBreathingTimer((prev) => {
        if (prev > 1) return prev - 1;

        if (breathingPhase === 'inhale') {
          setBreathingPhase('hold');
          setMessage("Hold gently... keep the calm inside you. 🌸");
          return 4;
        } else if (breathingPhase === 'hold') {
          setBreathingPhase('exhale');
          setMessage("Exhale slowly... release all tension. 🍃");
          return 4;
        } else if (breathingPhase === 'exhale') {
          setBreathingPhase('idle');
          setCharacterMood('happy');
          setMessage("Wonderful job. You are grounded, safe, and at peace. 💜");
          return 4;
        }
        return 4;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [breathingPhase]);

  const celebrateMilestone = (cheerText: string) => {
    setMessage(cheerText);
    setCharacterMood('sparkle');
    setIsOpen(true);
    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.8, x: 0.85 },
        colors: ['#A855F7', '#EC4899', '#F472B6', '#E9D5FF', '#FDE047'],
      });
    } catch {
      // ignore
    }
  };

  const handlePet = () => {
    setIsPetting(true);
    setCharacterMood('blush');
    const petPhrases = [
      "*purrs softly* You're the kindest human! 💜",
      "Hehe, that tickles! Thank you for spending time with me! ✨",
      "Sending you a warm, soft lavender hug right now! 🌸",
      "I believe in you so much today! You've got this! 🌷",
    ];
    setMessage(petPhrases[Math.floor(Math.random() * petPhrases.length)]);
    setIsOpen(true);
    setTimeout(() => setIsPetting(false), 900);
  };

  const handleAffirmation = () => {
    const random = AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];
    setMessage(random);
    setCharacterMood('sparkle');
    setIsOpen(true);
  };

  const handlePurpleMagic = () => {
    const random = BTS_MAGIC_QUOTES[Math.floor(Math.random() * BTS_MAGIC_QUOTES.length)];
    setMessage(random);
    setCharacterMood('blush');
    setIsOpen(true);
    try {
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.85, x: 0.85 },
        colors: ['#9333EA', '#C084FC', '#F472B6', '#FAF5FF'],
      });
    } catch {
      // ignore
    }
  };

  const handleStartBreathing = () => {
    setCharacterMood('breathing');
    setBreathingPhase('inhale');
    setBreathingTimer(4);
    setMessage("Breathe in deeply with me... filling your chest with calm. 🌿");
    setIsOpen(true);
  };

  const handleCheerMeUp = () => {
    const random = CHEERS[Math.floor(Math.random() * CHEERS.length)];
    setMessage(random);
    setCharacterMood('sparkle');
    setIsOpen(true);
    try {
      confetti({
        particleCount: 45,
        spread: 65,
        origin: { y: 0.85, x: 0.85 },
        colors: ['#A855F7', '#EC4899', '#F59E0B', '#38BDF8', '#10B981'],
      });
    } catch {
      // ignore
    }
  };

  if (isMinimized) {
    return (
      <button
        onClick={() => {
          setIsMinimized(false);
          setIsOpen(true);
        }}
        className="fixed bottom-6 right-5 z-50 flex items-center gap-2 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-500 text-white px-3.5 py-2.5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all text-xs font-semibold cursor-pointer border border-purple-300/60"
        title="Summon Bora, your AI companion"
      >
        <span className="text-xl animate-bounce">🐰</span>
        <span className="tracking-wide">Bora AI</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-4 sm:right-7 z-50 flex flex-col items-end pointer-events-none select-none">
      {/* Speech Bubble / Dialogue Box */}
      {isOpen && (
        <div className="pointer-events-auto mb-3 max-w-xs w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-purple-200/90 dark:border-purple-800/80 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="flex items-center justify-between border-b border-purple-100 dark:border-purple-800/60 pb-2.5 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-600"></span>
              </span>
              <span className="text-xs font-bold text-purple-950 dark:text-purple-100 tracking-wide flex items-center gap-1">
                Bora • AI Companion
              </span>
              <span className="text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-semibold capitalize">
                {breathingPhase !== 'idle' ? `Breathing (${breathingTimer}s)` : currentMood}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors cursor-pointer"
              title="Close dialogue"
            >
              <X size={15} />
            </button>
          </div>

          {/* Interactive Breathing Visualizer if active */}
          {breathingPhase !== 'idle' && (
            <div className="my-2 p-3 rounded-2xl bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-950/60 dark:to-pink-950/40 text-center flex flex-col items-center justify-center">
              <div
                className={`w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-pink-400 flex items-center justify-center text-white font-bold text-sm shadow-md transition-all duration-1000 ${
                  breathingPhase === 'inhale'
                    ? 'scale-125'
                    : breathingPhase === 'hold'
                    ? 'scale-125 ring-4 ring-purple-300'
                    : 'scale-90'
                }`}
              >
                {breathingTimer}s
              </div>
              <span className="mt-2 text-[11px] font-bold text-purple-900 dark:text-purple-200 uppercase tracking-widest">
                {breathingPhase === 'inhale'
                  ? 'Inhale Slowly...'
                  : breathingPhase === 'hold'
                  ? 'Hold Gently...'
                  : 'Exhale Completely...'}
              </span>
            </div>
          )}

          <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed font-medium mb-3">
            {message}
          </p>

          {/* Quick Action Chips (NOTE: "Prompt Idea" and "Insert to Page" removed per user specification) */}
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-purple-50 dark:border-purple-800/40">
            <button
              type="button"
              onClick={handleAffirmation}
              className="flex items-center gap-1.5 text-[11px] bg-purple-50 dark:bg-purple-950/70 hover:bg-purple-100 dark:hover:bg-purple-900/80 text-purple-700 dark:text-purple-300 px-2.5 py-1.5 rounded-full font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
            >
              <Heart size={12} className="text-purple-500 fill-purple-400" />
              <span>Affirmation</span>
            </button>

            <button
              type="button"
              onClick={handlePurpleMagic}
              className="flex items-center gap-1.5 text-[11px] bg-violet-50 dark:bg-violet-950/70 hover:bg-violet-100 dark:hover:bg-violet-900/80 text-violet-700 dark:text-violet-300 px-2.5 py-1.5 rounded-full font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
            >
              <Sparkles size={12} className="text-violet-500" />
              <span>Purple Magic</span>
            </button>

            <button
              type="button"
              onClick={handleStartBreathing}
              className="flex items-center gap-1.5 text-[11px] bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 px-2.5 py-1.5 rounded-full font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
              title="Box breathing calming exercise"
            >
              <Wind size={12} className="text-emerald-500" />
              <span>Gentle Breath</span>
            </button>

            <button
              type="button"
              onClick={handleCheerMeUp}
              className="flex items-center gap-1.5 text-[11px] bg-pink-50 dark:bg-pink-950/70 hover:bg-pink-100 dark:hover:bg-pink-900/80 text-pink-700 dark:text-pink-300 px-2.5 py-1.5 rounded-full font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
              title="Instant happy cheer"
            >
              <PartyPopper size={12} className="text-pink-500" />
              <span>Cheer Me Up</span>
            </button>
          </div>
        </div>
      )}

      {/* The Animated Character Sprite - Made Noticeably Bigger (96px scale) */}
      <div className="pointer-events-auto relative group flex items-center gap-2">
        {/* Hover Hint */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -left-36 top-8 bg-purple-950/90 text-white text-[11px] px-3 py-1.5 rounded-xl shadow-lg whitespace-nowrap pointer-events-none font-medium">
          Click Bora to talk! 💜
        </div>

        {/* Minimize button */}
        <button
          onClick={() => setIsMinimized(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-800 hover:bg-white text-gray-500 p-1.5 rounded-full shadow text-[10px] cursor-pointer"
          title="Minimize Bora"
        >
          <X size={13} />
        </button>

        {/* Main Character SVG (96x96 px - enlarged from original) */}
        <div
          onClick={() => {
            if (!isOpen) {
              setIsOpen(true);
            }
            handlePet();
          }}
          className={`cursor-pointer transition-all duration-300 filter drop-shadow-xl ${
            isPetting ? 'scale-110' : 'hover:scale-105'
          }`}
          style={{
            animation:
              breathingPhase !== 'idle'
                ? 'bora-breathe 4s ease-in-out infinite'
                : isDictating
                ? 'bora-bounce 0.8s infinite'
                : 'bora-float 3.5s ease-in-out infinite',
          }}
        >
          {/* Subtle glowing aura */}
          <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-tr from-purple-400/30 to-pink-400/30 blur-md scale-95 animate-pulse" />

          <svg width="96" height="96" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="boraBodyGrad" x1="20" y1="20" x2="80" y2="90" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#F3E8FF" />
                <stop offset="45%" stopColor="#C084FC" />
                <stop offset="100%" stopColor="#9333EA" />
              </linearGradient>
              <linearGradient id="boraEarGrad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#F472B6" />
                <stop offset="100%" stopColor="#C084FC" />
              </linearGradient>
              <radialGradient id="boraCheekGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F472B6" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#F472B6" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Left Ear */}
            <path
              d="M32 38 C26 10 40 6 44 26 C46 32 42 38 38 40 Z"
              fill="url(#boraBodyGrad)"
              className="origin-bottom"
              style={{
                animation: 'bora-ear-left 4s ease-in-out infinite',
                transformOrigin: '36px 36px',
              }}
            />
            <path
              d="M34 32 C30 16 38 12 41 24 C42 28 40 32 37 34 Z"
              fill="#FBCFE8"
              opacity="0.9"
            />

            {/* Right Ear */}
            <path
              d="M68 38 C74 10 60 6 56 26 C54 32 58 38 62 40 Z"
              fill="url(#boraBodyGrad)"
              className="origin-bottom"
              style={{
                animation: 'bora-ear-right 4s ease-in-out infinite 0.5s',
                transformOrigin: '64px 36px',
              }}
            />
            <path
              d="M66 32 C70 16 62 12 59 24 C58 28 60 32 63 34 Z"
              fill="#FBCFE8"
              opacity="0.9"
            />

            {/* Cute Crown / Star Accessory */}
            <circle cx="68" cy="28" r="7.5" fill="#FDE047" />
            <polygon
              points="68,23 70,27 74,28 71,31 72,35 68,32 64,35 65,31 62,28 66,27"
              fill="#F59E0B"
            />

            {/* Main Round Body / Face */}
            <circle cx="50" cy="58" r="33" fill="url(#boraBodyGrad)" />
            {/* Soft inner glow */}
            <ellipse cx="50" cy="51" rx="27" ry="23" fill="#FFFFFF" opacity="0.25" />

            {/* Headphone band if dictating */}
            {isDictating && (
              <>
                <path
                  d="M18 54 C18 28 82 28 82 54"
                  stroke="#38BDF8"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="18" cy="54" r="6.5" fill="#0284C7" />
                <circle cx="82" cy="54" r="6.5" fill="#0284C7" />
                {/* Audio waves */}
                <path
                  d="M8 50 C6 54 6 58 8 62"
                  stroke="#38BDF8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="animate-pulse"
                />
                <path
                  d="M92 50 C94 54 94 58 92 62"
                  stroke="#38BDF8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="animate-pulse"
                />
              </>
            )}

            {/* Blushing Cheeks */}
            <circle cx="32" cy="64" r="7.5" fill="url(#boraCheekGrad)" />
            <circle cx="68" cy="64" r="7.5" fill="url(#boraCheekGrad)" />

            {/* Eyes */}
            {characterMood === 'blush' || isPetting ? (
              // Happy squint / closed eyes ^^
              <>
                <path d="M33 56 C36 51 42 51 45 56" stroke="#4C1D95" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M55 56 C58 51 64 51 67 56" stroke="#4C1D95" strokeWidth="3" strokeLinecap="round" fill="none" />
              </>
            ) : characterMood === 'sparkle' ? (
              // Starry sparkle eyes ✨
              <>
                <circle cx="39" cy="54" r="5" fill="#4C1D95" />
                <circle cx="61" cy="54" r="5" fill="#4C1D95" />
                <circle cx="37" cy="52" r="2" fill="#FFFFFF" />
                <circle cx="59" cy="52" r="2" fill="#FFFFFF" />
                <circle cx="41.5" cy="55.5" r="1.1" fill="#FFFFFF" />
                <circle cx="63.5" cy="55.5" r="1.1" fill="#FFFFFF" />
              </>
            ) : characterMood === 'breathing' ? (
              // Calm peaceful closed eyes
              <>
                <path d="M33 57 C36 59 42 59 45 57" stroke="#4C1D95" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M55 57 C58 59 64 59 67 57" stroke="#4C1D95" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </>
            ) : (
              // Sweet big anime eyes with blinking animation
              <g className="bora-eyes">
                <circle cx="39" cy="55" r="4.6" fill="#3B0764" />
                <circle cx="61" cy="55" r="4.6" fill="#3B0764" />
                <circle cx="37.2" cy="53.2" r="1.8" fill="#FFFFFF" />
                <circle cx="59.2" cy="53.2" r="1.8" fill="#FFFFFF" />
              </g>
            )}

            {/* Cute Little Nose */}
            <ellipse cx="50" cy="59" rx="2" ry="1.4" fill="#BE185D" />

            {/* Sweet Smile Mouth */}
            <path
              d="M45 63 Q50 67 55 63"
              stroke="#4C1D95"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />

            {/* Little Hands / Paws holding a glowing purple heart */}
            <path d="M37 75 C42 71 48 71 50 74" stroke="#9333EA" strokeWidth="3.2" strokeLinecap="round" fill="none" />
            <path d="M63 75 C58 71 52 71 50 74" stroke="#9333EA" strokeWidth="3.2" strokeLinecap="round" fill="none" />
            <path
              d="M50 72 C49 70 45 68 43 71 C41 74 42 77 50 82 C58 77 59 74 57 71 C55 68 51 70 50 72 Z"
              fill="#E879F9"
            />
          </svg>
        </div>
      </div>

      {/* Keyframe Styles for Bora Character */}
      <style>{`
        @keyframes bora-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-9px) rotate(2deg); }
        }
        @keyframes bora-bounce {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-12px) scale(1.06); }
        }
        @keyframes bora-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
        @keyframes bora-ear-left {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-7deg); }
        }
        @keyframes bora-ear-right {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(7deg); }
        }
      `}</style>
    </div>
  );
};

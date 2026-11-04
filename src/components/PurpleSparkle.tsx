import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sparkles, Heart, Star, X } from 'lucide-react';
import { EasterEggManager, PurpleSparkleOptions } from '../utils/easterEggManager';

export interface PurpleSparkleProps {
  /**
   * If provided, manually controls whether sparkles are active/animating.
   * If omitted, PurpleSparkle listens to EasterEggManager globally.
   */
  active?: boolean;
  /** Number of sparkle particles to emit (defaults to 14, or 21 on major triggers) */
  count?: number;
  /** Whether to render the iconic BTS/ARMY Seven Stars constellation */
  showSevenStars?: boolean;
  /** Whether to include subtle floating purple hearts 💜 */
  showHearts?: boolean;
  /** Origin point of the sparkle burst in percentage { x: 0-100, y: 0-100 } */
  origin?: { x: number; y: number };
  /** Duration of sparkle animation in milliseconds (defaults to 3000ms) */
  duration?: number;
  /** Optional comforting microcopy toast to display alongside the sparkle */
  message?: string;
  /** Optional subtitle or quote */
  subtitle?: string;
  /** Display mode: 'fullscreen' for global overlay, 'contained' for parent card, 'inline' for buttons */
  mode?: 'fullscreen' | 'contained' | 'inline';
  /** If true, automatically listens to EasterEggManager events (defaults to true) */
  listenToEasterEggManager?: boolean;
  /** Callback when the sparkle animation cycle completes */
  onComplete?: () => void;
  /** Custom wrapper CSS classes */
  className?: string;
  /** Children to wrap when used in contained or inline mode */
  children?: React.ReactNode;
}

interface Particle {
  id: string;
  x: number; // percentage from origin
  y: number; // percentage from origin
  driftX: number; // px horizontal drift
  size: number; // size in px
  delay: number; // seconds
  duration: number; // seconds
  colorClass: string;
  type: 'sparkle' | 'star' | 'heart' | 'dot';
  rotation: number;
}

// Subtle BTS/ARMY Seven Stars positions (arranged as an arch / gentle galaxy arc)
const SEVEN_STARS_OFFSETS = [
  { x: -75, y: 15, scale: 0.9, delay: 0.05 },
  { x: -50, y: -15, scale: 1.1, delay: 0.1 },
  { x: -25, y: -35, scale: 1.25, delay: 0.15 },
  { x: 0, y: -45, scale: 1.4, delay: 0.2 }, // Central brightest star
  { x: 25, y: -35, scale: 1.25, delay: 0.25 },
  { x: 50, y: -15, scale: 1.1, delay: 0.3 },
  { x: 75, y: 15, scale: 0.9, delay: 0.35 },
];

/**
 * Hook to detect user's prefers-reduced-motion accessibility setting
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);

    try {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } catch {
      // Fallback for older Safari
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return prefersReducedMotion;
}

/**
 * Reusable PurpleSparkle animation component
 *
 * Designed with Tailwind CSS and full WCAG accessibility compliance:
 * - Emits gentle purple sparkles, floating hearts, and the signature 7 stars
 * - When `prefers-reduced-motion` is detected, cancels all motion and translates into
 *   a calm, accessible, non-pulsing status badge and message
 * - Can be triggered directly by EasterEggManager or controlled via props
 */
export const PurpleSparkle: React.FC<PurpleSparkleProps> = ({
  active: controlledActive,
  count = 14,
  showSevenStars = true,
  showHearts = true,
  origin: initialOrigin = { x: 50, y: 40 },
  duration = 3000,
  message: initialMessage,
  subtitle: initialSubtitle,
  mode = 'fullscreen',
  listenToEasterEggManager = true,
  onComplete,
  className = '',
  children,
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  // Internal trigger state when listening to EasterEggManager
  const [eventTriggered, setEventTriggered] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState(initialOrigin);
  const [currentMessage, setCurrentMessage] = useState<string | undefined>(initialMessage);
  const [currentSubtitle, setCurrentSubtitle] = useState<string | undefined>(initialSubtitle);
  const [currentShowSevenStars, setCurrentShowSevenStars] = useState(showSevenStars);
  const [currentShowHearts, setCurrentShowHearts] = useState(showHearts);
  const [currentParticleCount, setCurrentParticleCount] = useState(count);

  const isSparkleActive = controlledActive !== undefined ? controlledActive : eventTriggered;

  // Listen to EasterEggManager events
  useEffect(() => {
    if (!listenToEasterEggManager) return;

    const handleSparkleEvent = (options: PurpleSparkleOptions) => {
      setCurrentOrigin(options.origin || { x: 50, y: 35 });
      setCurrentMessage(options.message || 'Found a little purple secret. 💜');
      setCurrentSubtitle(options.subtitle || 'Purple is always waiting for you.');
      setCurrentShowSevenStars(options.showSevenStars ?? true);
      setCurrentShowHearts(options.showHearts ?? true);
      setCurrentParticleCount(options.count ?? 14);
      setEventTriggered(true);
    };

    // 1. Subscribe to in-memory EasterEggManager
    const unsubscribe = EasterEggManager.onSparkle(handleSparkleEvent);

    // 2. Also listen for custom DOM event for decoupled modules
    const handleDomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<PurpleSparkleOptions>;
      if (customEvent.detail) {
        handleSparkleEvent(customEvent.detail);
      }
    };
    window.addEventListener('borah:purple-sparkle', handleDomEvent);

    return () => {
      unsubscribe();
      window.removeEventListener('borah:purple-sparkle', handleDomEvent);
    };
  }, [listenToEasterEggManager]);

  // Auto-dismiss after duration
  useEffect(() => {
    if (!isSparkleActive) return;

    const timer = setTimeout(() => {
      if (controlledActive === undefined) {
        setEventTriggered(false);
      }
      if (onComplete) {
        onComplete();
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [isSparkleActive, duration, controlledActive, onComplete]);

  // Handle ESC key to dismiss toast
  useEffect(() => {
    if (!isSparkleActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEventTriggered(false);
        if (onComplete) onComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSparkleActive, onComplete]);

  // Generate randomized particle positions
  const particles = useMemo<Particle[]>(() => {
    if (!isSparkleActive || prefersReducedMotion) return [];

    const colorVariants = [
      'text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]',
      'text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]',
      'text-fuchsia-400 drop-shadow-[0_0_8px_rgba(232,121,249,0.8)]',
      'text-purple-300 drop-shadow-[0_0_6px_rgba(216,180,254,0.7)]',
      'text-amber-300 drop-shadow-[0_0_6px_rgba(253,224,71,0.7)]', // Golden starlight
    ];

    const types: Particle['type'][] = ['sparkle', 'star', 'dot'];
    if (currentShowHearts) types.push('heart');

    return Array.from({ length: currentParticleCount }).map((_, index) => {
      // Distribute in a soft circular spray around origin
      const angle = (Math.PI * 2 * index) / currentParticleCount + (Math.random() - 0.5) * 0.5;
      const distance = 25 + Math.random() * 85; // px distance
      const offsetX = Math.cos(angle) * distance;
      const offsetY = Math.sin(angle) * distance;
      const driftX = (Math.random() - 0.5) * 80;

      return {
        id: `p-${index}-${Date.now()}`,
        x: offsetX,
        y: offsetY,
        driftX,
        size: 10 + Math.random() * 14,
        delay: Math.random() * 0.35,
        duration: 1.8 + Math.random() * 0.8,
        colorClass: colorVariants[index % colorVariants.length],
        type: types[index % types.length],
        rotation: Math.random() * 360,
      };
    });
  }, [isSparkleActive, prefersReducedMotion, currentParticleCount, currentShowHearts]);

  const handleDismiss = useCallback(() => {
    setEventTriggered(false);
    if (onComplete) onComplete();
  }, [onComplete]);

  // Contained/Inline wrapper support
  if (mode === 'contained' || mode === 'inline') {
    return (
      <div className={`relative ${mode === 'inline' ? 'inline-flex' : 'block'} ${className}`}>
        {children}
        {isSparkleActive && (
          <div
            className={`pointer-events-none absolute inset-0 overflow-hidden ${
              prefersReducedMotion ? 'opacity-90' : 'animate-in fade-in duration-300'
            }`}
            aria-hidden="true"
          >
            {/* Subtle purple aura glow */}
            <div className="absolute inset-0 bg-radial from-purple-500/20 via-violet-500/5 to-transparent rounded-inherit" />

            {/* Seven mini stars around perimeter */}
            {currentShowSevenStars && (
              <div className="absolute inset-0 flex items-center justify-center">
                {SEVEN_STARS_OFFSETS.map((star, i) => (
                  <Star
                    key={i}
                    className={`absolute w-3 h-3 text-purple-400 fill-purple-300/60 ${
                      prefersReducedMotion ? '' : 'animate-purple-twinkle'
                    }`}
                    style={{
                      transform: `translate(${star.x * 0.4}px, ${star.y * 0.4}px) scale(${star.scale * 0.7})`,
                      animationDelay: `${star.delay}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Fullscreen Overlay Mode
  if (!isSparkleActive) return null;

  return (
    <div
      className={`fixed inset-0 z-50 pointer-events-none overflow-hidden select-none ${className}`}
      aria-live="polite"
      role="status"
    >
      {/* ========================================================
          ACCESSIBLE REDUCED-MOTION MODE (WCAG Compliance)
          Zero rapid physics or particle bursts; peaceful static notification
          ======================================================== */}
      {prefersReducedMotion ? (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-auto max-w-md w-[92%] animate-purple-fade-in">
          <div className="p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-2 border-purple-400/80 dark:border-purple-600/80 shadow-xl text-slate-800 dark:text-slate-100 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              {/* Seven subtle stars glyphs */}
              {currentShowSevenStars && (
                <div
                  className="flex items-center gap-1.5 text-purple-500 dark:text-purple-400 text-xs mb-1"
                  aria-label="Seven Stars"
                >
                  <span className="tracking-widest">✦ ✦ ✦ ✦ ✦ ✦ ✦</span>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono font-bold">7</span>
                </div>
              )}
              <h4 className="text-sm font-bold text-purple-900 dark:text-purple-200 font-serif leading-tight">
                {currentMessage || 'Found a little purple secret. 💜'}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-serif leading-relaxed">
                {currentSubtitle || 'Purple is always waiting for you.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Dismiss secret notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* ========================================================
           FULL ANIMATION MODE (Default)
           Gentle purple particles, seven-star constellation, soft hearts
           ======================================================== */
        <>
          {/* Subtle Ambient Radial Glow at origin */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full w-96 h-96 bg-purple-500/15 dark:bg-purple-600/20 blur-3xl pointer-events-none transition-all duration-700 animate-purple-twinkle"
            style={{
              left: `${currentOrigin.x}%`,
              top: `${currentOrigin.y}%`,
            }}
          />

          {/* BTS / ARMY Iconic Seven Stars Constellation */}
          {currentShowSevenStars && (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${currentOrigin.x}%`,
                top: `${currentOrigin.y}%`,
              }}
            >
              {SEVEN_STARS_OFFSETS.map((star, i) => (
                <div
                  key={`seven-star-${i}`}
                  className="absolute animate-purple-star-glow"
                  style={{
                    transform: `translate(${star.x}px, ${star.y}px) scale(${star.scale})`,
                    animationDelay: `${star.delay}s`,
                  }}
                >
                  <Star className="w-5 h-5 text-purple-300 dark:text-purple-200 fill-purple-300/80 drop-shadow-[0_0_10px_rgba(216,180,254,0.9)]" />
                  <span className="sr-only">Star {i + 1} of seven</span>
                </div>
              ))}
            </div>
          )}

          {/* Floating Purple Particles & Sparkles */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${currentOrigin.x}%`,
              top: `${currentOrigin.y}%`,
            }}
          >
            {particles.map((p) => (
              <div
                key={p.id}
                className="absolute animate-purple-float-up"
                style={
                  {
                    left: `${p.x}px`,
                    top: `${p.y}px`,
                    animationDelay: `${p.delay}s`,
                    animationDuration: `${p.duration}s`,
                    '--tw-drift-x': `${p.driftX}px`,
                  } as React.CSSProperties
                }
              >
                {p.type === 'sparkle' && (
                  <Sparkles
                    className={`w-4 h-4 ${p.colorClass}`}
                    style={{ transform: `rotate(${p.rotation}deg)` }}
                  />
                )}
                {p.type === 'star' && (
                  <Star
                    className={`w-3.5 h-3.5 ${p.colorClass} fill-current`}
                    style={{ transform: `rotate(${p.rotation}deg)` }}
                  />
                )}
                {p.type === 'heart' && (
                  <Heart
                    className="w-4 h-4 text-purple-500 fill-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                    style={{ transform: `rotate(${p.rotation * 0.1}deg)` }}
                  />
                )}
                {p.type === 'dot' && (
                  <div
                    className="w-2 h-2 rounded-full bg-purple-300 drop-shadow-[0_0_6px_rgba(192,132,252,0.9)]"
                    style={{ transform: `scale(${p.size / 10})` }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Gentle Comforting Toast Banner (Discreet & Non-Intrusive) */}
          {currentMessage && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-auto max-w-sm w-[90%] transition-all duration-300 animate-in fade-in slide-in-from-top-4">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-[#150D24]/95 backdrop-blur-md border border-purple-400/50 dark:border-purple-500/40 shadow-2xl text-slate-800 dark:text-purple-100 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-violet-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  {currentShowSevenStars && (
                    <div className="flex items-center gap-1 text-[11px] text-purple-500 dark:text-purple-300 mb-0.5 tracking-wider font-semibold">
                      <span>✦ ✦ ✦ ✦ ✦ ✦ ✦</span>
                    </div>
                  )}
                  <h4 className="text-xs font-bold font-serif leading-tight text-purple-950 dark:text-purple-100">
                    {currentMessage}
                  </h4>
                  {currentSubtitle && (
                    <p className="text-[11px] text-purple-800/80 dark:text-purple-300/80 italic font-serif mt-0.5">
                      "{currentSubtitle}"
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 rounded-lg transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/**
 * BORAH — ARMY_EASTER_EGG_LAYER
 * Reusable EasterEggManager Module
 *
 * Responsibilities:
 * - Detects user interaction sequences (e.g. logo 7-tap, secret codes)
 * - Anti-spam cooldown & timeout management
 * - Respects prefers-reduced-motion for accessibility
 * - Manages discovery states in localStorage without server leakage
 * - Event-driven dispatch to keep UI decoupled from core app flow
 */

import confetti from 'canvas-confetti';

export interface EasterEggDiscovery {
  id: string;
  name: string;
  hint: string;
  message: string;
  discoveredAt?: string;
}

export interface SearchEggResult {
  isEgg: boolean;
  code?: string;
  title?: string;
  message?: string;
  quote?: string;
}

export interface PurpleSparkleOptions {
  id?: string;
  origin?: { x: number; y: number };
  count?: number;
  message?: string;
  subtitle?: string;
  showSevenStars?: boolean;
  showHearts?: boolean;
  duration?: number;
  code?: string;
}

const STORAGE_KEYS = {
  DISCOVERED: 'borah_secret_discovered',
  DISCOVERIES_LIST: 'borah_discoveries_list',
  LAST_TRIGGER: 'borah_last_egg_trigger',
};

class EasterEggManagerService {
  private logoTapCount: number = 0;
  private logoTapTimer: NodeJS.Timeout | null = null;
  private keySequenceBuffer: string = '';
  private keySequenceTimer: NodeJS.Timeout | null = null;
  private isCooldownActive: boolean = false;
  private sparkleListeners: Set<(options: PurpleSparkleOptions) => void> = new Set();

  private readonly TAP_THRESHOLD: number = 7;
  private readonly TAP_WINDOW_MS: number = 1800; // resets counter if idle > 1.8s
  private readonly COOLDOWN_MS: number = 3000; // prevents animation spam

  // Secret codes mapped to subtle comforting observations
  private readonly SECRET_CODES: Record<string, { title: string; message: string; quote: string }> = {
    '0613': {
      title: 'A Beginning to Remember',
      message: 'Some moments mark the humble start of a sevenfold galaxy.',
      quote: 'Where there is hope, there is always a journey unfolding.',
    },
    '613': {
      title: 'A Familiar Date',
      message: 'You unlocked a gentle nod to a special beginning.',
      quote: 'Keep the little moments close to your heart.',
    },
    'borahae': {
      title: 'You Found a Purple Secret 💜',
      message: 'Purple means trusting and loving each other for a long, long time.',
      quote: 'Somewhere between yesterday and tomorrow, this space belongs to you.',
    },
    '134340': {
      title: 'A Lone Star in Orbit',
      message: 'Even in quiet solitude, your orbit is uniquely yours.',
      quote: 'You are never forgotten; you simply have your own rhythm.',
    },
    '00:00': {
      title: 'Reset at Midnight',
      message: 'When the clock resets, you are allowed to begin again.',
      quote: 'You made it through today. Breathe, and start afresh.',
    },
    '7': {
      title: 'The Constellation of Seven',
      message: 'Seven dreams walking side-by-side in harmony.',
      quote: 'Individually unique, together whole.',
    },
  };

  constructor() {
    this.initKeyboardListener();
  }

  /**
   * Checks if the user prefers reduced motion (WCAG accessibility)
   */
  public prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Register a tap/click on the application logo
   * When 7 taps occur within the window, fires onUnlocked
   */
  public handleLogoTap(onUnlocked?: () => void): { currentCount: number; isTriggered: boolean } {
    if (this.isCooldownActive) {
      return { currentCount: this.logoTapCount, isTriggered: false };
    }

    if (this.logoTapTimer) {
      clearTimeout(this.logoTapTimer);
    }

    this.logoTapCount += 1;

    // Check threshold
    if (this.logoTapCount >= this.TAP_THRESHOLD) {
      this.logoTapCount = 0;
      this.triggerCooldown();
      this.markDiscovered('logo_seven_taps', 'The Seventh Tap', 'Tapped the BORAH logo 7 times');

      // Dispatch event for any decoupled listeners
      this.dispatchEvent('borah:seven-taps', { source: 'logo' });

      // Run PurpleSparkle celebration (with 7 stars and purple hearts)
      this.triggerPurpleSparkle({
        origin: { x: 50, y: 15 },
        count: 21,
        message: 'Found a little purple secret. 💜',
        subtitle: 'Purple is always waiting for you.',
        showSevenStars: true,
        showHearts: true,
      });

      if (onUnlocked) {
        onUnlocked();
      }

      return { currentCount: 7, isTriggered: true };
    }

    // Set expiration timer for consecutive taps
    this.logoTapTimer = setTimeout(() => {
      this.logoTapCount = 0;
    }, this.TAP_WINDOW_MS);

    return { currentCount: this.logoTapCount, isTriggered: false };
  }

  /**
   * Check search queries for hidden Easter egg codes without interrupting normal search
   */
  public checkSearchQuery(query: string): SearchEggResult {
    const sanitized = query.trim().toLowerCase();
    const egg = this.SECRET_CODES[sanitized];

    if (egg) {
      this.markDiscovered(`code_${sanitized}`, egg.title, `Searched for secret code ${sanitized}`);
      this.triggerPurpleSparkle({
        origin: { x: 50, y: 35 },
        count: 14,
        message: egg.title,
        subtitle: egg.quote || egg.message,
        showSevenStars: true,
        showHearts: true,
        code: sanitized,
      });
      return {
        isEgg: true,
        code: sanitized,
        title: egg.title,
        message: egg.message,
        quote: egg.quote,
      };
    }

    return { isEgg: false };
  }

  /**
   * Register a subscriber callback for purple sparkle trigger events
   */
  public onSparkle(listener: (options: PurpleSparkleOptions) => void): () => void {
    this.sparkleListeners.add(listener);
    return () => {
      this.sparkleListeners.delete(listener);
    };
  }

  /**
   * Main trigger for the reusable PurpleSparkle animation
   * Dispatches both browser event and listener notifications
   * Respects prefers-reduced-motion accessibility standards
   */
  public triggerPurpleSparkle(options: PurpleSparkleOptions = {}) {
    if (this.isCooldownActive && !options.message) {
      return;
    }

    const payload: PurpleSparkleOptions = {
      id: options.id || `sparkle_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      origin: options.origin || { x: 50, y: 50 },
      count: options.count ?? 14,
      message: options.message || 'Found a little purple secret. 💜',
      subtitle: options.subtitle || 'Purple is always waiting for you.',
      showSevenStars: options.showSevenStars ?? true,
      showHearts: options.showHearts ?? true,
      duration: options.duration ?? 2800,
      code: options.code,
    };

    // 1. Dispatch custom DOM event for decoupled components (e.g. root PurpleSparkle overlay)
    this.dispatchEvent('borah:purple-sparkle', payload);

    // 2. Notify registered listeners
    this.sparkleListeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.error('Sparkle listener error:', err);
      }
    });

    // 3. Trigger optional soft confetti burst if user allows motion
    if (!this.prefersReducedMotion()) {
      const originY = (payload.origin?.y ?? 50) / 100;
      this.triggerPurpleCelebration(originY);
    }
  }

  /**
   * Shorthand trigger for arbitrary component use
   */
  public sparkle(options?: PurpleSparkleOptions) {
    this.triggerPurpleSparkle(options);
  }

  /**
   * Soft, non-flashing purple particle celebration
   * Skips physics/motion if user has reduced-motion preference
   */
  public triggerPurpleCelebration(originY: number = 0.6) {
    if (this.prefersReducedMotion()) {
      // Quiet accessible notification rather than particle storm
      return;
    }

    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: originY },
        colors: ['#A78BFA', '#8B5CF6', '#C084FC', '#DDD6FE', '#FDE047'],
        disableForReducedMotion: true,
      });
    } catch (e) {
      // Graceful fallback if canvas is restricted
    }
  }

  /**
   * Anti-spam cooldown timer
   */
  private triggerCooldown() {
    this.isCooldownActive = true;
    setTimeout(() => {
      this.isCooldownActive = false;
    }, this.COOLDOWN_MS);
  }

  /**
   * Global keyboard input listener for sequence recognition (e.g. typing "0613" or "borahae")
   */
  private initKeyboardListener() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Do not intercept if user is typing inside an active input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Buffer single alphanumeric characters
      if (e.key && e.key.length === 1) {
        this.keySequenceBuffer += e.key.toLowerCase();
        if (this.keySequenceBuffer.length > 20) {
          this.keySequenceBuffer = this.keySequenceBuffer.slice(-20);
        }

        // Check buffer for secret triggers
        for (const [code, meta] of Object.entries(this.SECRET_CODES)) {
          if (this.keySequenceBuffer.endsWith(code.toLowerCase())) {
            this.keySequenceBuffer = '';
            this.dispatchEvent('borah:secret-code', { code, meta });
            this.triggerPurpleSparkle({
              origin: { x: 50, y: 40 },
              count: 21,
              message: meta.title,
              subtitle: meta.quote,
              showSevenStars: true,
              showHearts: true,
              code,
            });
            this.markDiscovered(`secret_${code}`, meta.title, `Typed secret sequence "${code}"`);
            break;
          }
        }

        if (this.keySequenceTimer) clearTimeout(this.keySequenceTimer);
        this.keySequenceTimer = setTimeout(() => {
          this.keySequenceBuffer = '';
        }, 3000);
      }
    });
  }

  /**
   * Persists discovery state in localStorage
   */
  public markDiscovered(id: string, name: string, hint: string) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.DISCOVERED, 'true');
      const listStr = localStorage.getItem(STORAGE_KEYS.DISCOVERIES_LIST);
      const list: EasterEggDiscovery[] = listStr ? JSON.parse(listStr) : [];

      if (!list.some((d) => d.id === id)) {
        list.push({
          id,
          name,
          hint,
          message: 'Found a little purple secret. 💜',
          discoveredAt: new Date().toISOString(),
        });
        localStorage.setItem(STORAGE_KEYS.DISCOVERIES_LIST, JSON.stringify(list));
      }
    } catch (e) {
      console.error('Failed to save easter egg state:', e);
    }
  }

  /**
   * Check if user has discovered any Easter eggs
   */
  public hasDiscoveredAny(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.DISCOVERED) === 'true';
  }

  /**
   * Retrieve list of all discovered Easter eggs
   */
  public getDiscoveredList(): EasterEggDiscovery[] {
    if (typeof window === 'undefined') return [];
    try {
      const listStr = localStorage.getItem(STORAGE_KEYS.DISCOVERIES_LIST);
      return listStr ? JSON.parse(listStr) : [];
    } catch {
      return [];
    }
  }

  /**
   * Dispatch custom browser events for decoupled communication
   */
  private dispatchEvent(eventName: string, detail: any) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }
}

export const EasterEggManager = new EasterEggManagerService();

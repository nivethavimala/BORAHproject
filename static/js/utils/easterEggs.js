const STORAGE_KEYS = {
  DISCOVERED: 'borah_secret_discovered',
  DISCOVERIES_LIST: 'borah_discoveries_list',
};

const SECRET_CODES = {
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
    quote: 'Somewhere from yesterday to tomorrow, this space belongs to you.',
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

class EasterEggManagerService {
  constructor() {
    this.logoTapCount = 0;
    this.logoTapTimer = null;
    this.keySequenceBuffer = '';
    this.keySequenceTimer = null;
    this.isCooldownActive = false;
    this.sparkleListeners = new Set();
    this.TAP_THRESHOLD = 7;
    this.TAP_WINDOW_MS = 1800;
    this.COOLDOWN_MS = 3000;
    this.initKeyboardListener();
  }

  prefersReducedMotion() {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  handleLogoTap(onUnlocked) {
    if (this.isCooldownActive) {
      return { currentCount: this.logoTapCount, isTriggered: false };
    }
    if (this.logoTapTimer) clearTimeout(this.logoTapTimer);
    this.logoTapCount += 1;

    if (this.logoTapCount >= this.TAP_THRESHOLD) {
      this.logoTapCount = 0;
      this.triggerCooldown();
      this.markDiscovered('logo_seven_taps', 'The Seventh Tap', 'Tapped the BORAH logo 7 times');
      this.dispatchEvent('borah:seven-taps', { source: 'logo' });
      this.triggerPurpleSparkle({
        origin: { x: 50, y: 15 },
        count: 21,
        message: 'Found a little purple secret. 💜',
        subtitle: 'Purple is always waiting for you.',
        showSevenStars: true,
        showHearts: true,
      });
      if (typeof onUnlocked === 'function') onUnlocked();
      return { currentCount: 7, isTriggered: true };
    }

    this.logoTapTimer = setTimeout(() => {
      this.logoTapCount = 0;
    }, this.TAP_WINDOW_MS);
    return { currentCount: this.logoTapCount, isTriggered: false };
  }

  checkSearchQuery(query) {
    const sanitized = String(query || '').trim().toLowerCase();
    const egg = SECRET_CODES[sanitized];
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
      return { isEgg: true, code: sanitized, ...egg };
    }
    return { isEgg: false };
  }

  onSparkle(listener) {
    this.sparkleListeners.add(listener);
    return () => this.sparkleListeners.delete(listener);
  }

  triggerPurpleSparkle(options = {}) {
    if (this.isCooldownActive && !options.message) return;
    const payload = {
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

    this.dispatchEvent('borah:purple-sparkle', payload);
    this.sparkleListeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.error('Sparkle listener error:', err);
      }
    });

    if (!this.prefersReducedMotion()) {
      const originY = (payload.origin?.y ?? 50) / 100;
      this.triggerPurpleCelebration(originY);
    }
  }

  sparkle(options) {
    this.triggerPurpleSparkle(options);
  }

  triggerPurpleCelebration(originY = 0.6) {
    if (this.prefersReducedMotion()) return;
    try {
      if (typeof window.confetti === 'function') {
        window.confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: originY },
          colors: ['#A78BFA', '#8B5CF6', '#C084FC', '#DDD6FE', '#FDE047'],
          disableForReducedMotion: true,
        });
      }
    } catch {
      // Ignore confetti fallback errors
    }
  }

  triggerCooldown() {
    this.isCooldownActive = true;
    setTimeout(() => {
      this.isCooldownActive = false;
    }, this.COOLDOWN_MS);
  }

  initKeyboardListener() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (e) => {
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key && e.key.length === 1) {
        this.keySequenceBuffer += e.key.toLowerCase();
        if (this.keySequenceBuffer.length > 20) {
          this.keySequenceBuffer = this.keySequenceBuffer.slice(-20);
        }
        for (const [code, meta] of Object.entries(SECRET_CODES)) {
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

  markDiscovered(id, name, hint) {
    try {
      localStorage.setItem(STORAGE_KEYS.DISCOVERED, 'true');
      const listStr = localStorage.getItem(STORAGE_KEYS.DISCOVERIES_LIST);
      const list = listStr ? JSON.parse(listStr) : [];
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

  hasDiscoveredAny() {
    return localStorage.getItem(STORAGE_KEYS.DISCOVERED) === 'true';
  }

  getDiscoveredList() {
    try {
      const listStr = localStorage.getItem(STORAGE_KEYS.DISCOVERIES_LIST);
      return listStr ? JSON.parse(listStr) : [];
    } catch {
      return [];
    }
  }

  dispatchEvent(eventName, detail) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(eventName, { detail }));
    }
  }
}

export const EasterEggManager = new EasterEggManagerService();

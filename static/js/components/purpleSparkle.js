import { EasterEggManager } from '../utils/easterEggs.js';
import { escapeHtml, renderIcons } from '../utils/dom.js';

const SEVEN_STARS_OFFSETS = [
  { x: -75, y: 15, scale: 0.9, delay: 0.05 },
  { x: -50, y: -15, scale: 1.1, delay: 0.1 },
  { x: -25, y: -35, scale: 1.25, delay: 0.15 },
  { x: 0, y: -45, scale: 1.4, delay: 0.2 },
  { x: 25, y: -35, scale: 1.25, delay: 0.25 },
  { x: 50, y: -15, scale: 1.1, delay: 0.3 },
  { x: 75, y: 15, scale: 0.9, delay: 0.35 },
];

export function renderContainedSparkleHtml() {
  const starsHtml = SEVEN_STARS_OFFSETS.map(
    (s) =>
      `<i data-lucide="star" class="absolute w-3 h-3 text-purple-400 fill-purple-300/60 animate-purple-twinkle" style="transform: translate(${s.x * 0.4}px, ${s.y * 0.4}px) scale(${s.scale * 0.7}); animation-delay: ${s.delay}s;"></i>`
  ).join('');

  return `
    <div class="pointer-events-none absolute inset-0 overflow-hidden animate-in fade-in duration-300" aria-hidden="true">
      <div class="absolute inset-0 bg-purple-500/10 rounded-inherit"></div>
      <div class="absolute inset-0 flex items-center justify-center">${starsHtml}</div>
    </div>
  `;
}

export function initGlobalPurpleSparkle(container) {
  let dismissTimer = null;

  const dismiss = () => {
    if (dismissTimer) clearTimeout(dismissTimer);
    container.innerHTML = '';
  };

  const show = (options = {}) => {
    dismiss();
    const prefersReducedMotion = EasterEggManager.prefersReducedMotion();
    const origin = options.origin || { x: 50, y: 35 };
    const message = options.message || 'Found a little purple secret. 💜';
    const subtitle = options.subtitle || 'Purple is always waiting for you.';
    const showSevenStars = options.showSevenStars ?? true;
    const showHearts = options.showHearts ?? true;
    const count = options.count ?? 14;
    const duration = options.duration ?? 3000;

    if (prefersReducedMotion) {
      container.innerHTML = `
        <div class="fixed inset-0 z-50 pointer-events-none overflow-hidden select-none" aria-live="polite" role="status">
          <div class="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-auto max-w-md w-[92%] animate-purple-fade-in">
            <div class="p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-2 border-purple-400/80 dark:border-purple-600/80 shadow-xl text-slate-800 dark:text-slate-100 flex items-start gap-3.5">
              <div class="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
                <i data-lucide="sparkles" class="w-5 h-5"></i>
              </div>
              <div class="flex-1 min-w-0 pr-1">
                ${showSevenStars ? '<div class="flex items-center gap-1.5 text-purple-500 dark:text-purple-400 text-xs mb-1"><span class="tracking-widest">✦ ✦ ✦ ✦ ✦ ✦ ✦</span><span class="text-[10px] font-mono font-bold">7</span></div>' : ''}
                <h4 class="text-sm font-bold text-purple-900 dark:text-purple-200 font-serif leading-tight">${escapeHtml(message)}</h4>
                <p class="text-xs text-slate-600 dark:text-slate-300 mt-1 font-serif leading-relaxed">${escapeHtml(subtitle)}</p>
              </div>
              <button type="button" data-dismiss-sparkle class="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer" aria-label="Dismiss secret notification">
                <i data-lucide="x" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      const colorVariants = [
        'text-purple-400',
        'text-violet-400',
        'text-fuchsia-400',
        'text-purple-300',
        'text-amber-300',
      ];
      const types = showHearts ? ['sparkle', 'star', 'dot', 'heart'] : ['sparkle', 'star', 'dot'];
      const particlesHtml = Array.from({ length: count })
        .map((_, idx) => {
          const angle = (Math.PI * 2 * idx) / count + (Math.random() - 0.5) * 0.5;
          const dist = 25 + Math.random() * 85;
          const px = Math.cos(angle) * dist;
          const py = Math.sin(angle) * dist;
          const driftX = (Math.random() - 0.5) * 80;
          const delay = Math.random() * 0.35;
          const dur = 1.8 + Math.random() * 0.8;
          const rot = Math.random() * 360;
          const col = colorVariants[idx % colorVariants.length];
          const type = types[idx % types.length];
          let inner = '';
          if (type === 'sparkle') inner = `<i data-lucide="sparkles" class="w-4 h-4 ${col}" style="transform: rotate(${rot}deg)"></i>`;
          else if (type === 'star') inner = `<i data-lucide="star" class="w-3.5 h-3.5 ${col} fill-current" style="transform: rotate(${rot}deg)"></i>`;
          else if (type === 'heart') inner = `<i data-lucide="heart" class="w-4 h-4 text-purple-500 fill-purple-400"></i>`;
          else inner = `<div class="w-2 h-2 rounded-full bg-purple-300"></div>`;
          return `<div class="absolute animate-purple-float-up" style="left:${px}px;top:${py}px;animation-delay:${delay}s;animation-duration:${dur}s;--tw-drift-x:${driftX}px">${inner}</div>`;
        })
        .join('');

      const starsHtml = showSevenStars
        ? SEVEN_STARS_OFFSETS.map(
            (s) =>
              `<div class="absolute animate-purple-star-glow" style="transform: translate(${s.x}px, ${s.y}px) scale(${s.scale}); animation-delay:${s.delay}s"><i data-lucide="star" class="w-5 h-5 text-purple-300 fill-purple-300/80"></i></div>`
          ).join('')
        : '';

      container.innerHTML = `
        <div class="fixed inset-0 z-50 pointer-events-none overflow-hidden select-none" aria-live="polite" role="status">
          <div class="absolute -translate-x-1/2 -translate-y-1/2 rounded-full w-96 h-96 bg-purple-500/15 blur-3xl animate-purple-twinkle" style="left:${origin.x}%;top:${origin.y}%"></div>
          ${showSevenStars ? `<div class="absolute -translate-x-1/2 -translate-y-1/2" style="left:${origin.x}%;top:${origin.y}%">${starsHtml}</div>` : ''}
          <div class="absolute" style="left:${origin.x}%;top:${origin.y}%">${particlesHtml}</div>
          <div class="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-auto max-w-sm w-[90%] animate-in fade-in slide-in-from-top-4">
            <div class="p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-[#150D24]/95 backdrop-blur-md border border-purple-400/50 shadow-2xl text-slate-800 dark:text-purple-100 flex items-start gap-3">
              <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-violet-500 text-white flex items-center justify-center shrink-0">
                <i data-lucide="sparkles" class="w-4 h-4"></i>
              </div>
              <div class="flex-1 min-w-0">
                ${showSevenStars ? '<div class="flex items-center gap-1 text-[11px] text-purple-500 dark:text-purple-300 mb-0.5 tracking-wider font-semibold"><span>✦ ✦ ✦ ✦ ✦ ✦ ✦</span></div>' : ''}
                <h4 class="text-xs font-bold font-serif leading-tight text-purple-950 dark:text-purple-100">${escapeHtml(message)}</h4>
                ${subtitle ? `<p class="text-[11px] text-purple-800/80 dark:text-purple-300/80 italic font-serif mt-0.5">"${escapeHtml(subtitle)}"</p>` : ''}
              </div>
              <button type="button" data-dismiss-sparkle class="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 rounded-lg cursor-pointer" aria-label="Close">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    renderIcons(container);
    container.querySelector('[data-dismiss-sparkle]')?.addEventListener('click', dismiss);
    dismissTimer = setTimeout(dismiss, duration);
  };

  EasterEggManager.onSparkle(show);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') dismiss();
  });
}

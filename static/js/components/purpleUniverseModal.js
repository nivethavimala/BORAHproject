import { api } from '../api.js';
import { escapeHtml, renderIcons, sanitizeUrl } from '../utils/dom.js';

export function createPurpleUniverseModal(container, { onClose }) {
  let breathInterval = null;

  const stop = () => {
    if (breathInterval) {
      clearInterval(breathInterval);
      breathInterval = null;
    }
    container.innerHTML = '';
  };

  const open = async () => {
    stop();
    let favoriteMemories = [];
    try {
      const mRes = await api.getMemories();
      if (mRes.success) {
        favoriteMemories = (mRes.memories || []).filter((m) => m.is_favorite || m.is_special).slice(0, 3);
      }
    } catch {
      // Ignore
    }

    const starsHtml = Array.from({ length: 7 })
      .map(
        (_, i) =>
          `<i data-lucide="star" class="w-4 h-4 text-purple-300 fill-purple-300/60 animate-pulse" style="animation-delay:${i * 200}ms"></i>`
      )
      .join('');

    const memoriesHtml =
      favoriteMemories.length > 0
        ? favoriteMemories
            .map(
              (mem) => `
          <div class="p-3.5 rounded-2xl bg-white/5 border border-purple-500/20 backdrop-blur-xs flex gap-3 items-center">
            <div class="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-purple-950">
              <img src="${escapeHtml(sanitizeUrl(mem.cover_image))}" alt="${escapeHtml(mem.title)}" class="w-full h-full object-cover" />
            </div>
            <div class="truncate">
              <h4 class="text-xs font-bold text-purple-100 font-serif truncate">${escapeHtml(mem.title)}</h4>
              <p class="text-[11px] text-purple-300/80 truncate mt-0.5">${escapeHtml(mem.description || mem.location)}</p>
              <span class="text-[10px] text-purple-400 font-mono">${escapeHtml(mem.memory_date)}</span>
            </div>
          </div>`
            )
            .join('')
        : `<div class="col-span-full py-4 text-center text-xs text-purple-300/60">
             Star your favorite memories or journal pages to illuminate your private universe.
           </div>`;

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
        <div class="relative w-full max-w-3xl bg-gradient-to-b from-[#1E1135] via-[#120B24] to-[#0A0515] rounded-3xl shadow-2xl border border-purple-500/30 p-6 sm:p-10 text-white overflow-hidden max-h-[90vh] overflow-y-auto">
          <div class="absolute inset-0 pointer-events-none opacity-40">
            <div class="absolute top-8 left-12 w-1.5 h-1.5 bg-purple-200 rounded-full animate-ping"></div>
            <div class="absolute top-20 right-24 w-1 h-1 bg-amber-200 rounded-full"></div>
            <div class="absolute bottom-16 left-28 w-1 h-1 bg-purple-300 rounded-full"></div>
            <div class="absolute top-48 left-1/3 w-1.5 h-1.5 bg-indigo-200 rounded-full animate-pulse"></div>
            <div class="absolute bottom-32 right-1/4 w-1 h-1 bg-purple-100 rounded-full"></div>
          </div>

          <button type="button" data-close-pu class="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white transition-colors cursor-pointer">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>

          <div class="text-center space-y-3 relative z-10">
            <div class="flex items-center justify-center gap-2 mb-2">${starsHtml}</div>
            <h2 class="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-purple-100 flex items-center justify-center gap-2">
              <span>The Purple Universe</span>
              <span class="text-lg">💜</span>
            </h2>
            <p class="text-xs sm:text-sm text-purple-200/80 max-w-md mx-auto italic font-serif leading-relaxed">
              "Somewhere from yesterday to tomorrow, there is this little space that belongs to you."
            </p>
          </div>

          <div class="my-8 flex flex-col items-center justify-center text-center">
            <div class="w-28 h-28 rounded-full bg-gradient-to-tr from-purple-600/40 via-violet-500/20 to-indigo-500/30 border border-purple-400/40 flex items-center justify-center shadow-lg shadow-purple-900/50 animate-pulse">
              <i data-lucide="moon" class="w-8 h-8 text-purple-200"></i>
            </div>
            <span data-pu-breath class="text-xs font-serif font-medium text-purple-300 mt-3 tracking-wide">
              Inhale peace...
            </span>
          </div>

          <div class="space-y-4 pt-4 border-t border-purple-900/40 relative z-10">
            <div class="flex items-center justify-between text-xs text-purple-300 font-semibold uppercase tracking-wider">
              <span class="flex items-center gap-1.5">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-amber-300"></i> Your Cherished Milestones
              </span>
              <span class="text-[11px] text-purple-400">Stars in your orbit</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">${memoriesHtml}</div>
          </div>

          <div class="mt-8 pt-4 border-t border-purple-900/40 text-center text-xs text-purple-300/70 font-serif">
            <span>Purple is always waiting for you. You did well today. 💜</span>
          </div>
        </div>
      </div>
    `;
    renderIcons(container);

    container.querySelector('[data-close-pu]')?.addEventListener('click', () => {
      stop();
      if (onClose) onClose();
    });

    const breathEl = container.querySelector('[data-pu-breath]');
    const phrases = ['Inhale gently...', 'Hold peace inside...', 'Exhale your worries...', 'Rest in the quiet...'];
    let cycle = 0;
    breathInterval = setInterval(() => {
      cycle = (cycle + 1) % 4;
      if (breathEl) breathEl.textContent = phrases[cycle];
    }, 3500);
  };

  return { open, close: stop };
}

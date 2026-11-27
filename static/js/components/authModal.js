import { login, register } from '../state.js';
import { escapeHtml, renderIcons } from '../utils/dom.js';

export function renderAuthModal(container, isOpen) {
  if (!isOpen) {
    container.innerHTML = '';
    return;
  }

  let isRegister = false;
  let showPassword = false;
  let error = '';
  let loading = false;
  let nameVal = '';
  let emailVal = '';
  let passVal = '';
  let confirmVal = '';

  const render = () => {
    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all animate-in fade-in duration-200">
        <div class="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-8 overflow-hidden">
          <div class="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-600 via-sky-600 to-purple-500"></div>
          <div class="text-center mb-6">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 mb-3 shadow-inner">
              <i data-lucide="layers" class="w-6 h-6"></i>
            </div>
            <h2 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-serif">
              ${isRegister ? 'Create Your BORAH Account' : 'Welcome to BORAH'}
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Your workspace to organize, track and reflect on your everyday activities.
            </p>
          </div>

          ${error ? `<div class="mb-4 p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl">${escapeHtml(error)}</div>` : ''}

          <form data-auth-form class="space-y-4">
            ${isRegister ? `
              <div>
                <label class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Your Name</label>
                <div class="relative">
                  <i data-lucide="user" class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                  <input type="text" required name="name" placeholder="e.g. Dr. Maya Patel" value="${escapeHtml(nameVal)}"
                    class="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all" />
                </div>
              </div>` : ''}

            <div>
              <label class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Email Address</label>
              <div class="relative">
                <i data-lucide="mail" class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                <input type="email" required name="email" placeholder="name@example.com" value="${escapeHtml(emailVal)}"
                  class="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Password</label>
              <div class="relative">
                <i data-lucide="lock" class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                <input type="${showPassword ? 'text' : 'password'}" required name="password" placeholder="At least 6 characters" value="${escapeHtml(passVal)}"
                  class="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all" />
                <button type="button" data-toggle-pass class="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                  <i data-lucide="${showPassword ? 'eye-off' : 'eye'}" class="w-4 h-4"></i>
                </button>
              </div>
            </div>

            ${isRegister ? `
              <div>
                <label class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Confirm Password</label>
                <div class="relative">
                  <i data-lucide="lock" class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                  <input type="${showPassword ? 'text' : 'password'}" required name="confirmPassword" placeholder="Repeat your password" value="${escapeHtml(confirmVal)}"
                    class="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all" />
                </div>
              </div>` : ''}

            <button type="submit" ${loading ? 'disabled' : ''}
              class="w-full py-3 px-4 rounded-xl font-medium text-sm borah-btn-sage active:scale-[0.99] transition-all shadow-md hover:shadow-lg disabled:opacity-50 mt-2 flex items-center justify-center gap-2 cursor-pointer">
              ${loading ? '<span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>' : isRegister ? 'Create Private Account' : 'Sign In to Workspace'}
            </button>
          </form>

          <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <button type="button" data-demo-login ${loading ? 'disabled' : ''}
              class="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer mb-3">
              <i data-lucide="sparkles" class="w-3.5 h-3.5 text-emerald-600"></i> Explore with Demo Workspace (Instant Access)
            </button>

            <p class="text-xs text-slate-500 dark:text-slate-400">
              ${isRegister ? 'Already have a BORAH account?' : "Don't have an account yet?"}
              <button type="button" data-switch-mode class="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer">
                ${isRegister ? 'Sign in' : 'Create an account'}
              </button>
            </p>

            <div class="flex items-center justify-center gap-1.5 mt-3 text-[11px] text-slate-400 dark:text-slate-500">
              <i data-lucide="shield-check" class="w-3.5 h-3.5 text-emerald-600"></i>
              <span>Built for individuals, faculty, staff &amp; students · Strict per-account data isolation</span>
            </div>
          </div>
        </div>
      </div>
    `;

    renderIcons(container);

    const form = container.querySelector('[data-auth-form]');
    form?.querySelectorAll('input').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const n = e.target.name;
        if (n === 'name') nameVal = e.target.value;
        if (n === 'email') emailVal = e.target.value;
        if (n === 'password') passVal = e.target.value;
        if (n === 'confirmPassword') confirmVal = e.target.value;
      });
    });

    container.querySelector('[data-toggle-pass]')?.addEventListener('click', () => {
      showPassword = !showPassword;
      render();
    });

    container.querySelector('[data-switch-mode]')?.addEventListener('click', () => {
      isRegister = !isRegister;
      error = '';
      render();
    });

    container.querySelector('[data-demo-login]')?.addEventListener('click', async () => {
      loading = true;
      error = '';
      render();
      const demoEmail = 'guest@borah.app';
      const demoPass = 'borah2026';
      const res = await login(demoEmail, demoPass);
      if (!res.success) {
        await register('Sophia Laurent', demoEmail, demoPass, demoPass);
      }
      loading = false;
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      error = '';
      if (isRegister) {
        if (!nameVal.trim()) {
          error = 'Please enter your name.';
          render();
          return;
        }
        if (passVal !== confirmVal) {
          error = 'Passwords do not match.';
          render();
          return;
        }
      }
      loading = true;
      render();
      const res = isRegister
        ? await register(nameVal, emailVal, passVal, confirmVal)
        : await login(emailVal, passVal);
      if (!res.success) {
        error = res.message || 'Authentication failed.';
        loading = false;
        render();
      }
    });
  };

  render();
}

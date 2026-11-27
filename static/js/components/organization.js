import { api } from '../api.js';
import { refreshUser } from '../state.js';
import { escapeHtml, renderIcons } from '../utils/dom.js';

export function renderOrganizationView(container) {
  let statusData = null;
  let loading = true;
  let toastMsg = '';
  let disposed = false;

  const showToast = (msg) => {
    toastMsg = msg;
    render();
    setTimeout(() => {
      if (!disposed) {
        toastMsg = '';
        render();
      }
    }, 3200);
  };

  const load = async () => {
    try {
      const res = await api.getOrgStatus();
      if (!disposed) {
        statusData = res.success ? res : null;
        loading = false;
        render();
      }
    } catch {
      if (!disposed) {
        loading = false;
        render();
      }
    }
  };

  const render = () => {
    if (disposed) return;

    const org = statusData?.organization || null;
    const role = statusData?.role || 'individual';
    const members = statusData?.members || [];
    const sharedActs = statusData?.shared_activities || [];

    let contentHtml = '';
    if (loading) {
      contentHtml = `<div class="py-14 text-center text-xs text-slate-400">Loading organization workspace status...</div>`;
    } else if (!org) {
      contentHtml = `
        <div class="p-5 rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
          <i data-lucide="shield-check" class="w-5 h-5 text-emerald-600 shrink-0 mt-0.5"></i>
          <div>
            <div class="font-bold">Individual Mode Active</div>
            <p class="mt-0.5 leading-relaxed opacity-90">
              BORAH is built first for individual professionals, faculty, researchers, and students. Organizational Mode is completely optional—create or join a workspace only if your institution or team wants to view explicitly shared work logs.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <form data-org-create class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100 font-serif">Create Organization Workspace</h2>
            <p class="text-xs text-slate-500">Create a department or institution space and receive a join code for colleagues.</p>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Organization / Department Name</label>
              <input type="text" required name="name" placeholder="e.g. Department of Computer Science" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
            </div>
            <button type="submit" class="px-4 py-2 rounded-xl text-xs font-semibold borah-btn-sage cursor-pointer">Create Workspace</button>
          </form>

          <form data-org-join class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100 font-serif">Join Existing Organization</h2>
            <p class="text-xs text-slate-500">Enter the 6-character join code provided by your coordinator or administrator.</p>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Join Code</label>
              <input type="text" required name="join_code" placeholder="e.g. A1B2C3" class="w-full text-xs font-mono uppercase px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
            </div>
            <button type="submit" class="px-4 py-2 rounded-xl text-xs font-semibold borah-btn-blue cursor-pointer">Join Workspace</button>
          </form>
        </div>`;
    } else {
      contentHtml = `
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100 font-serif">${escapeHtml(org.name)}</h2>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">${escapeHtml(role)}</span>
            </div>
            <p class="text-xs text-slate-500">
              Join Code: <code class="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">${escapeHtml(org.join_code)}</code>
              · ${members.length} member(s)
            </p>
          </div>
          <button type="button" data-org-leave class="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 cursor-pointer">
            Leave Organization
          </button>
        </div>

        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2.5">
          <i data-lucide="lock" class="w-4 h-4 text-emerald-600 shrink-0"></i>
          <span>Private journals, memories, personal notes, and mood history are strictly private and never accessible inside Organizational Mode. Only activities explicitly marked "Share with Organization" appear below.</span>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">Workspace Members</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            ${members
              .map(
                (m) => `
              <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div class="truncate">
                  <div class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">${escapeHtml(m.name)}</div>
                  <div class="text-[11px] text-slate-400 truncate">${escapeHtml(m.department || m.email)}</div>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">${escapeHtml(m.role)}</span>
              </div>`
              )
              .join('')}
          </div>
        </div>

        ${
          role === 'admin' || role === 'supervisor'
            ? `<div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">Shared Work Activity Logs</h3>
                  <span class="text-[11px] text-slate-400">${sharedActs.length} shared entry(ies)</span>
                </div>
                ${
                  sharedActs.length === 0
                    ? `<p class="text-xs text-slate-400 py-6 text-center">No members have shared work logs with the organization yet.</p>`
                    : `<div class="space-y-2.5">
                        ${sharedActs
                          .map(
                            (a) => `
                          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div>
                              <div class="font-bold text-slate-800 dark:text-slate-100">${escapeHtml(a.title)}</div>
                              <div class="text-[11px] text-slate-500">By ${escapeHtml(a.member_name)} · ${escapeHtml(a.category)} · ${escapeHtml(a.activity_date)}</div>
                            </div>
                            <div class="text-right font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                              ${escapeHtml(a.start_time)}–${escapeHtml(a.end_time)} (${escapeHtml(a.duration_label)})
                            </div>
                          </div>`
                          )
                          .join('')}
                      </div>`
                }
              </div>`
            : ''
        }`;
    }

    container.innerHTML = `
      <div class="borah-container-wide space-y-6 animate-in fade-in duration-300">
        ${toastMsg ? `<div class="fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl bg-slate-900 text-white text-xs font-medium shadow-xl">${escapeHtml(toastMsg)}</div>` : ''}
        <div>
          <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100 font-serif">Optional Organizational Mode</h1>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Collaborate optionally on shared work activity logs while keeping your personal workspace private.
          </p>
        </div>
        ${contentHtml}
      </div>
    `;

    renderIcons(container);

    container.querySelector('[data-org-create]')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = String(new FormData(e.target).get('name') || '').trim();
      if (!name) return;
      try {
        const res = await api.createOrg(name);
        if (res.success) {
          await refreshUser();
          showToast('Organization workspace created.');
          load();
        }
      } catch (err) {
        showToast(err.message || 'Unable to create organization.');
      }
    });

    container.querySelector('[data-org-join]')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = String(new FormData(e.target).get('join_code') || '').trim().toUpperCase();
      if (!code) return;
      try {
        const res = await api.joinOrg(code);
        if (res.success) {
          await refreshUser();
          showToast(res.message || 'Joined organization.');
          load();
        }
      } catch (err) {
        showToast(err.message || 'Invalid join code.');
      }
    });

    container.querySelector('[data-org-leave]')?.addEventListener('click', async () => {
      try {
        const res = await api.leaveOrg();
        if (res.success) {
          await refreshUser();
          showToast('Returned to individual mode.');
          load();
        }
      } catch (err) {
        showToast(err.message || 'Unable to leave organization.');
      }
    });
  };

  load();

  return () => {
    disposed = true;
  };
}

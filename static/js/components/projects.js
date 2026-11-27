import { api } from '../api.js';
import { escapeHtml, renderIcons, todayIso } from '../utils/dom.js';
import { renderAttachmentsSection } from './attachmentsWidget.js';

export function renderProjectsView(container) {
  let projects = [];
  let showModal = false;
  let editing = null;
  let activeAttProjId = null;
  let toastMsg = '';
  let disposed = false;

  let formState = {
    title: '',
    code: '',
    category: 'Research',
    status: 'active',
    start_date: todayIso(),
    target_date: '',
    progress_percent: 0,
    description: '',
  };

  const showToast = (msg) => {
    toastMsg = msg;
    render();
    setTimeout(() => {
      if (!disposed) {
        toastMsg = '';
        render();
      }
    }, 3000);
  };

  const load = async () => {
    try {
      const res = await api.getProjects();
      if (!disposed && res.success) {
        projects = res.projects || [];
        render();
      }
    } catch {}
  };

  const render = () => {
    if (disposed) return;

    const cardsHtml =
      projects.length === 0
        ? `<div class="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <i data-lucide="folder-kanban" class="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700"></i>
            <p class="text-xs text-slate-500">No projects created yet.</p>
            <button type="button" data-proj-add class="px-4 py-2 rounded-xl text-xs font-semibold borah-btn-sage cursor-pointer">Create First Project</button>
          </div>`
        : `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${projects
              .map(
                (p) => `
              <div class="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      ${p.code ? `<span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">${escapeHtml(p.code)}</span>` : ''}
                      <span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">${escapeHtml(p.category)}</span>
                      <span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 capitalize">${escapeHtml(p.status)}</span>
                    </div>
                    <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 font-serif mt-1.5">${escapeHtml(p.title)}</h3>
                  </div>
                  <div class="flex items-center gap-1">
                    <button type="button" data-proj-att="${escapeHtml(p.id)}" class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 cursor-pointer" title="Attachments"><i data-lucide="paperclip" class="w-4 h-4"></i></button>
                    <button type="button" data-proj-edit="${escapeHtml(p.id)}" class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 cursor-pointer" title="Edit"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                    <button type="button" data-proj-del="${escapeHtml(p.id)}" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer" title="Delete"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                  </div>
                </div>
                ${p.description ? `<p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(p.description)}</p>` : ''}
                <div class="space-y-1">
                  <div class="flex justify-between text-[11px] text-slate-500">
                    <span>Progress</span>
                    <span class="font-mono font-semibold">${p.progress_percent}%</span>
                  </div>
                  <div class="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div class="h-full rounded-full bg-emerald-600" style="width: ${p.progress_percent}%"></div>
                  </div>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span>Logged: <strong>${escapeHtml(p.logged_duration_label || '0 min')}</strong> (${p.activity_count || 0} logs)</span>
                  <span>Tasks: <strong>${p.completed_task_count || 0}/${p.task_count || 0}</strong></span>
                  ${p.target_date ? `<span>Target: ${escapeHtml(p.target_date)}</span>` : ''}
                </div>
                ${activeAttProjId === p.id ? `<div data-proj-att-slot="${escapeHtml(p.id)}"></div>` : ''}
              </div>`
              )
              .join('')}
          </div>`;

    const modalHtml = showModal
      ? `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
          <button type="button" data-proj-close class="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"><i data-lucide="x" class="w-4 h-4"></i></button>
          <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif mb-4">${editing ? 'Edit Project' : 'New Project'}</h2>
          <form data-proj-form class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div class="col-span-2">
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Project Title *</label>
                <input type="text" required name="title" value="${escapeHtml(formState.title)}" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Code (Optional)</label>
                <input type="text" name="code" value="${escapeHtml(formState.code)}" placeholder="e.g. MSC-2026" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Category</label>
                <select name="category" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">
                  ${['Research', 'Teaching', 'Project Development', 'Administrative', 'Personal'].map((c) => `<option value="${c}" ${formState.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Status</label>
                <select name="status" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">
                  <option value="active" ${formState.status === 'active' ? 'selected' : ''}>Active</option>
                  <option value="on_hold" ${formState.status === 'on_hold' ? 'selected' : ''}>On Hold</option>
                  <option value="completed" ${formState.status === 'completed' ? 'selected' : ''}>Completed</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Progress (%)</label>
                <input type="number" min="0" max="100" name="progress_percent" value="${Number(formState.progress_percent || 0)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Start Date</label>
                <input type="date" name="start_date" value="${escapeHtml(formState.start_date)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Target Date</label>
                <input type="date" name="target_date" value="${escapeHtml(formState.target_date)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Description</label>
                <textarea rows="2" name="description" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">${escapeHtml(formState.description)}</textarea>
              </div>
            </div>
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button type="button" data-proj-close class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2 text-xs font-semibold borah-btn-sage rounded-xl shadow-sm cursor-pointer">Save Project</button>
            </div>
          </form>
        </div>
      </div>`
      : '';

    container.innerHTML = `
      <div class="borah-container-wide space-y-6 animate-in fade-in duration-300">
        ${toastMsg ? `<div class="fixed bottom-6 right-6 z-50 py-3 px-5 rounded-2xl bg-slate-900 text-white text-xs font-medium shadow-xl">${escapeHtml(toastMsg)}</div>` : ''}
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-serif">Project Tracker</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Group activities, tasks, and logged work hours under structured projects.</p>
          </div>
          <button type="button" data-proj-add class="px-4 py-2 rounded-xl text-xs font-semibold borah-btn-sage shadow-sm flex items-center gap-1.5 cursor-pointer self-start">
            <i data-lucide="plus" class="w-4 h-4"></i><span>New Project</span>
          </button>
        </div>
        ${cardsHtml}
        ${modalHtml}
      </div>
    `;

    renderIcons(container);

    if (activeAttProjId) {
      const slot = container.querySelector(`[data-proj-att-slot="${activeAttProjId}"]`);
      if (slot) renderAttachmentsSection(slot, { entityType: 'project', entityId: activeAttProjId, onChanged: load });
    }

    container.querySelectorAll('[data-proj-add]').forEach((btn) =>
      btn.addEventListener('click', () => {
        editing = null;
        formState = { title: '', code: '', category: 'Research', status: 'active', start_date: todayIso(), target_date: '', progress_percent: 0, description: '' };
        showModal = true;
        render();
      })
    );
    container.querySelectorAll('[data-proj-close]').forEach((btn) =>
      btn.addEventListener('click', () => {
        showModal = false;
        editing = null;
        render();
      })
    );
    container.querySelectorAll('[data-proj-att]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-proj-att');
        activeAttProjId = activeAttProjId === id ? null : id;
        render();
      })
    );
    container.querySelectorAll('[data-proj-edit]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const p = projects.find((x) => x.id === btn.getAttribute('data-proj-edit'));
        if (!p) return;
        editing = p;
        formState = { ...p };
        showModal = true;
        render();
      })
    );
    container.querySelectorAll('[data-proj-del]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-proj-del');
        await api.deleteProject(id);
        projects = projects.filter((p) => p.id !== id);
        showToast('Project deleted.');
      })
    );
    container.querySelector('[data-proj-form]')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = Object.fromEntries(fd.entries());
      payload.progress_percent = Number(payload.progress_percent || 0);
      try {
        if (editing) {
          const res = await api.updateProject(editing.id, payload);
          if (res.success) {
            showModal = false;
            editing = null;
            await load();
            showToast('Project updated.');
          }
        } else {
          const res = await api.createProject(payload);
          if (res.success) {
            showModal = false;
            await load();
            showToast('Project created.');
          }
        }
      } catch (err) {
        showToast(err.message || 'Save failed.');
      }
    });
  };

  render();
  load();
  return () => {
    disposed = true;
  };
}

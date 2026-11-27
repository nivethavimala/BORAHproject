import { api } from '../api.js';
import { escapeHtml, renderIcons, todayIso } from '../utils/dom.js';
import { renderAttachmentsSection } from './attachmentsWidget.js';

export function renderMeetingsView(container) {
  let meetings = [];
  let projects = [];
  let showModal = false;
  let editing = null;
  let activeAttId = null;
  let toastMsg = '';
  let disposed = false;

  let formState = {
    title: '',
    meeting_date: todayIso(),
    start_time: '11:00',
    end_time: '12:00',
    location: '',
    participants: '',
    agenda: '',
    decisions: '',
    action_items: '',
    project_id: '',
    log_as_activity: true,
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
      const [mRes, pRes] = await Promise.all([api.getMeetings(), api.getProjects()]);
      if (!disposed) {
        meetings = mRes.meetings || [];
        projects = pRes.projects || [];
        render();
      }
    } catch {}
  };

  const render = () => {
    if (disposed) return;

    const listHtml =
      meetings.length === 0
        ? `<div class="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <i data-lucide="users" class="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700"></i>
            <p class="text-xs text-slate-500">No meetings recorded yet.</p>
            <button type="button" data-mtg-add class="px-4 py-2 rounded-xl text-xs font-semibold borah-btn-sage cursor-pointer">Record Meeting</button>
          </div>`
        : `<div class="space-y-4">
            ${meetings
              .map(
                (m) => `
              <div class="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <div class="flex flex-wrap items-center gap-2 text-[11px]">
                      <span class="font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">${escapeHtml(m.meeting_date)} • ${escapeHtml(m.start_time)}–${escapeHtml(m.end_time)} (${escapeHtml(m.duration_label || '')})</span>
                      ${m.location ? `<span class="text-slate-500">${escapeHtml(m.location)}</span>` : ''}
                    </div>
                    <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 font-serif mt-1.5">${escapeHtml(m.title)}</h3>
                    ${m.participants ? `<p class="text-xs text-slate-500 mt-0.5"><strong>Participants:</strong> ${escapeHtml(m.participants)}</p>` : ''}
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <button type="button" data-mtg-att="${escapeHtml(m.id)}" class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 cursor-pointer" title="Attachments"><i data-lucide="paperclip" class="w-4 h-4"></i></button>
                    <button type="button" data-mtg-edit="${escapeHtml(m.id)}" class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 cursor-pointer" title="Edit"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                    <button type="button" data-mtg-del="${escapeHtml(m.id)}" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer" title="Delete"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                  </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <div class="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Agenda</div>
                    <div class="text-slate-700 dark:text-slate-200">${escapeHtml(m.agenda || '—')}</div>
                  </div>
                  <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <div class="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Decisions</div>
                    <div class="text-slate-700 dark:text-slate-200">${escapeHtml(m.decisions || '—')}</div>
                  </div>
                  <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <div class="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Action Items</div>
                    <div class="text-slate-700 dark:text-slate-200">${escapeHtml(m.action_items || '—')}</div>
                  </div>
                </div>
                ${activeAttId === m.id ? `<div data-mtg-att-slot="${escapeHtml(m.id)}"></div>` : ''}
              </div>`
              )
              .join('')}
          </div>`;

    const modalHtml = showModal
      ? `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
        <div class="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 my-8">
          <button type="button" data-mtg-close class="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"><i data-lucide="x" class="w-4 h-4"></i></button>
          <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif mb-4">${editing ? 'Edit Meeting Record' : 'Record Meeting'}</h2>
          <form data-mtg-form class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Meeting Title *</label>
                <input type="text" required name="title" value="${escapeHtml(formState.title)}" class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Date *</label>
                <input type="date" required name="meeting_date" value="${escapeHtml(formState.meeting_date)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Location / Link</label>
                <input type="text" name="location" value="${escapeHtml(formState.location)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Start Time *</label>
                <input type="time" required name="start_time" value="${escapeHtml(formState.start_time)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">End Time *</label>
                <input type="time" required name="end_time" value="${escapeHtml(formState.end_time)}" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Participants</label>
                <input type="text" name="participants" value="${escapeHtml(formState.participants)}" placeholder="Comma-separated names" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" />
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Agenda</label>
                <textarea rows="2" name="agenda" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">${escapeHtml(formState.agenda)}</textarea>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Decisions</label>
                <textarea rows="2" name="decisions" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">${escapeHtml(formState.decisions)}</textarea>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Action Items</label>
                <textarea rows="2" name="action_items" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">${escapeHtml(formState.action_items)}</textarea>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Project (Optional)</label>
                <select name="project_id" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none">
                  <option value="">None</option>
                  ${projects.map((p) => `<option value="${escapeHtml(p.id)}" ${formState.project_id === p.id ? 'selected' : ''}>${escapeHtml(p.title)}</option>`).join('')}
                </select>
              </div>
              ${
                !editing
                  ? `<div class="flex items-center gap-2 pt-5">
                      <input type="checkbox" id="log_act_cb" name="log_as_activity" checked />
                      <label for="log_act_cb" class="text-xs text-slate-600 dark:text-slate-300 cursor-pointer">Also record in Daily Activity Log</label>
                    </div>`
                  : ''
              }
            </div>
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button type="button" data-mtg-close class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2 text-xs font-semibold borah-btn-sage rounded-xl shadow-sm cursor-pointer">Save Meeting</button>
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
            <h1 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-serif">Meeting Records</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Document participants, agendas, decisions, and action items.</p>
          </div>
          <button type="button" data-mtg-add class="px-4 py-2 rounded-xl text-xs font-semibold borah-btn-sage shadow-sm flex items-center gap-1.5 cursor-pointer self-start">
            <i data-lucide="plus" class="w-4 h-4"></i><span>Record Meeting</span>
          </button>
        </div>
        ${listHtml}
        ${modalHtml}
      </div>
    `;

    renderIcons(container);

    if (activeAttId) {
      const slot = container.querySelector(`[data-mtg-att-slot="${activeAttId}"]`);
      if (slot) renderAttachmentsSection(slot, { entityType: 'meeting', entityId: activeAttId, onChanged: load });
    }

    container.querySelectorAll('[data-mtg-add]').forEach((btn) =>
      btn.addEventListener('click', () => {
        editing = null;
        formState = { title: '', meeting_date: todayIso(), start_time: '11:00', end_time: '12:00', location: '', participants: '', agenda: '', decisions: '', action_items: '', project_id: '', log_as_activity: true };
        showModal = true;
        render();
      })
    );
    container.querySelectorAll('[data-mtg-close]').forEach((btn) =>
      btn.addEventListener('click', () => {
        showModal = false;
        editing = null;
        render();
      })
    );
    container.querySelectorAll('[data-mtg-att]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-mtg-att');
        activeAttId = activeAttId === id ? null : id;
        render();
      })
    );
    container.querySelectorAll('[data-mtg-edit]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const m = meetings.find((x) => x.id === btn.getAttribute('data-mtg-edit'));
        if (!m) return;
        editing = m;
        formState = { ...m, log_as_activity: false };
        showModal = true;
        render();
      })
    );
    container.querySelectorAll('[data-mtg-del]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-mtg-del');
        await api.deleteMeeting(id);
        meetings = meetings.filter((m) => m.id !== id);
        showToast('Meeting deleted.');
      })
    );
    container.querySelector('[data-mtg-form]')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = Object.fromEntries(fd.entries());
      payload.project_id = payload.project_id || null;
      payload.log_as_activity = fd.get('log_as_activity') === 'on';
      try {
        if (editing) {
          const res = await api.updateMeeting(editing.id, payload);
          if (res.success) {
            showModal = false;
            editing = null;
            await load();
            showToast('Meeting updated.');
          }
        } else {
          const res = await api.createMeeting(payload);
          if (res.success) {
            showModal = false;
            await load();
            showToast('Meeting recorded.');
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

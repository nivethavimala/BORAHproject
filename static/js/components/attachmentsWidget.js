import { api } from '../api.js';
import { escapeHtml, renderIcons } from '../utils/dom.js';

export function renderAttachmentsSection(container, { entityType, entityId, onChanged }) {
  let attachments = [];
  let loading = true;
  let uploading = false;
  let error = '';

  const formatBytes = (bytes) => {
    const b = Number(bytes || 0);
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  const render = () => {
    container.innerHTML = `
      <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <i data-lucide="paperclip" class="w-3.5 h-3.5 text-emerald-600"></i>
            <span>Attachments (${attachments.length})</span>
          </span>
          <label class="px-2.5 py-1 text-[11px] font-semibold rounded-xl borah-btn-sage cursor-pointer inline-flex items-center gap-1 ${uploading ? 'opacity-50 pointer-events-none' : ''}">
            <i data-lucide="upload" class="w-3 h-3"></i>
            <span>${uploading ? 'Uploading...' : 'Attach File'}</span>
            <input type="file" data-att-file class="hidden" accept=".pdf,.docx,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp" />
          </label>
        </div>
        ${error ? `<p class="text-[11px] text-rose-600">${escapeHtml(error)}</p>` : ''}
        ${
          loading
            ? `<p class="text-[11px] text-slate-400">Loading attachments...</p>`
            : attachments.length === 0
              ? `<p class="text-[11px] text-slate-400">Optional: attach PDF, DOCX, XLSX, CSV, TXT, or image files (max 10 MB).</p>`
              : `<div class="space-y-1.5">
                  ${attachments
                    .map(
                      (a) => `
                    <div class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-xs">
                      <button type="button" data-att-dl="${escapeHtml(a.id)}" data-att-name="${escapeHtml(a.original_filename)}" class="flex items-center gap-2 text-left text-slate-700 dark:text-slate-200 hover:text-emerald-700 truncate cursor-pointer">
                        <i data-lucide="file-text" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
                        <span class="truncate font-medium">${escapeHtml(a.original_filename)}</span>
                        <span class="text-[10px] text-slate-400 shrink-0">${formatBytes(a.size_bytes)}</span>
                      </button>
                      <button type="button" data-att-del="${escapeHtml(a.id)}" class="p-1 text-slate-400 hover:text-rose-500 cursor-pointer shrink-0" title="Remove attachment">
                        <i data-lucide="x" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>`
                    )
                    .join('')}
                </div>`
        }
      </div>
    `;
    renderIcons(container);

    container.querySelector('[data-att-file]')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      uploading = true;
      error = '';
      render();
      try {
        const res = await api.uploadAttachment(entityType, entityId, file);
        if (res.success) {
          attachments = [res.attachment, ...attachments];
          if (onChanged) onChanged(attachments.length);
        }
      } catch (err) {
        error = err.message || 'Upload failed.';
      } finally {
        uploading = false;
        render();
      }
    });

    container.querySelectorAll('[data-att-dl]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-att-dl');
        const name = btn.getAttribute('data-att-name') || 'attachment';
        api.downloadAttachment(id, name).catch((err) => {
          error = err.message || 'Download failed.';
          render();
        });
      });
    });

    container.querySelectorAll('[data-att-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-att-del');
        try {
          await api.deleteAttachment(id);
          attachments = attachments.filter((a) => a.id !== id);
          if (onChanged) onChanged(attachments.length);
          render();
        } catch (err) {
          error = err.message || 'Could not remove attachment.';
          render();
        }
      });
    });
  };

  render();
  api
    .getAttachments(entityType, entityId)
    .then((res) => {
      loading = false;
      if (res.success) attachments = res.attachments || [];
      render();
    })
    .catch(() => {
      loading = false;
      render();
    });
}

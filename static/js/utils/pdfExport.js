function getJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) {
    return window.jspdf.jsPDF;
  }
  throw new Error('PDF generator library not loaded');
}

function renderFooter(doc, pageWidth, pageHeight, margin) {
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text('BORAH  *  Preserving moments that matter softly and forever.', margin, pageHeight - 10);
  const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
  doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
}

function downloadTextFile(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportJournalEntryToPDF(entry) {
  const jsPDF = getJsPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 25;

  doc.setFillColor(243, 232, 255);
  doc.rect(0, 0, pageWidth, 16, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(109, 40, 217);
  doc.text('BORAH JOURNAL  *  PRIVATE ARCHIVE', margin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), pageWidth - margin, 11, { align: 'right' });

  cursorY += 10;
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59);
  const titleLines = doc.splitTextToSize(entry.title || 'Untitled Journal Entry', contentWidth);
  doc.text(titleLines, margin, cursorY);
  cursorY += titleLines.length * 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const dateFormatted = new Date(entry.entry_date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const moodLabel = entry.mood ? `Mood: ${entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1)}` : 'Reflective';
  const privacyLabel = entry.is_private ? 'Encrypted Private Page' : 'Personal Entry';
  doc.text(`${dateFormatted}   |   ${moodLabel}   |   ${privacyLabel}`, margin, cursorY);

  cursorY += 4;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 10;

  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85);
  const bodyLines = doc.splitTextToSize(entry.content || '(No written content)', contentWidth);
  const lineHeight = 7;

  for (let i = 0; i < bodyLines.length; i++) {
    if (cursorY + lineHeight > pageHeight - 25) {
      renderFooter(doc, pageWidth, pageHeight, margin);
      doc.addPage();
      cursorY = 25;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text(`${entry.title || 'Entry'} (Continued)`, margin, cursorY);
      cursorY += 8;
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(51, 65, 85);
    }
    doc.text(bodyLines[i], margin, cursorY);
    cursorY += lineHeight;
  }

  renderFooter(doc, pageWidth, pageHeight, margin);
  const safeTitle = (entry.title || 'journal-entry').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  doc.save(`borah-journal-${safeTitle}-${entry.entry_date}.pdf`);
}

export function exportJournalEntriesToPDF(entries) {
  if (!entries || entries.length === 0) return;
  const jsPDF = getJsPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  doc.setFillColor(243, 232, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  doc.setFont('times', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(88, 28, 135);
  doc.text('BORAH', pageWidth / 2, 90, { align: 'center' });
  doc.setFont('times', 'italic');
  doc.setFontSize(16);
  doc.setTextColor(126, 34, 206);
  doc.text('My Digital Sanctuary & Journal Archive', pageWidth / 2, 105, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(107, 114, 128);
  doc.text(`${entries.length} Personal Entries`, pageWidth / 2, 125, { align: 'center' });

  entries.forEach((entry) => {
    doc.addPage();
    let cursorY = 25;
    doc.setFillColor(245, 243, 255);
    doc.rect(0, 0, pageWidth, 14, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(109, 40, 217);
    doc.text('BORAH JOURNAL', margin, 9.5);

    cursorY += 8;
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    const titleLines = doc.splitTextToSize(entry.title || 'Untitled Page', contentWidth);
    doc.text(titleLines, margin, cursorY);
    cursorY += titleLines.length * 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${new Date(entry.entry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}  *  Mood: ${entry.mood || 'Calm'}`,
      margin,
      cursorY
    );
    cursorY += 4;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 8;

    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    const bodyLines = doc.splitTextToSize(entry.content || '', contentWidth);
    for (let i = 0; i < bodyLines.length; i++) {
      if (cursorY + 6.5 > pageHeight - 20) {
        renderFooter(doc, pageWidth, pageHeight, margin);
        doc.addPage();
        cursorY = 25;
      }
      doc.text(bodyLines[i], margin, cursorY);
      cursorY += 6.5;
    }
    renderFooter(doc, pageWidth, pageHeight, margin);
  });

  doc.save(`borah-journal-full-archive-${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportMemoryToPDF(memory) {
  const jsPDF = getJsPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 35;

  doc.setFillColor(254, 243, 199);
  doc.rect(0, 0, pageWidth, 16, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(180, 83, 9);
  doc.text('BORAH MEMORY ALBUM', margin, 11);

  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59);
  const titleLines = doc.splitTextToSize(memory.title || 'Untitled Memory', contentWidth);
  doc.text(titleLines, margin, cursorY);
  cursorY += titleLines.length * 9;

  doc.setFont('times', 'normal');
  doc.setFontSize(11.5);
  doc.setTextColor(71, 85, 105);
  const storyLines = doc.splitTextToSize(memory.description || '(No description)', contentWidth);
  storyLines.forEach((line) => {
    if (cursorY + 7 > pageHeight - 25) {
      renderFooter(doc, pageWidth, pageHeight, margin);
      doc.addPage();
      cursorY = 25;
    }
    doc.text(line, margin, cursorY);
    cursorY += 7;
  });

  renderFooter(doc, pageWidth, pageHeight, margin);
  const safeTitle = (memory.title || 'memory').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  doc.save(`borah-memory-${safeTitle}.pdf`);
}

export function exportJournalEntryToText(entry) {
  const dateFormatted = new Date(entry.entry_date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const tagsStr = entry.tags && entry.tags.length > 0 ? entry.tags.map((t) => `#${t}`).join(', ') : 'None';
  const text = [
    '================================================================================',
    'BORAH DIGITAL JOURNAL — PERSONAL ARCHIVE & SAFEKEEPING',
    '================================================================================',
    `Title: ${entry.title || 'Untitled Journal Entry'}`,
    `Date:  ${dateFormatted}`,
    `Mood:  ${entry.mood ? entry.mood.toUpperCase() : 'CALM'}`,
    `Tags:  ${tagsStr}`,
    '================================================================================',
    '',
    entry.content || '(No written content)',
    '',
    '================================================================================',
    'Preserved with BORAH — Softly, safely, forever.',
  ].join('\n');
  const safeTitle = (entry.title || 'journal-entry').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  downloadTextFile(text, `borah-journal-${safeTitle}-${entry.entry_date}.txt`);
}

export function exportJournalEntriesToText(entries) {
  if (!entries || entries.length === 0) return;
  const body = entries
    .map((e, i) => `PAGE ${i + 1}: ${e.title || 'Untitled'} (${e.entry_date})\n${e.content || ''}\n---`)
    .join('\n\n');
  downloadTextFile(body, `borah-journal-complete-archive-${new Date().toISOString().split('T')[0]}.txt`);
}

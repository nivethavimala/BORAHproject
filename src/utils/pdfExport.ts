import { jsPDF } from 'jspdf';
import { JournalEntry, Memory } from '../types';

/**
 * Format and export a single journal entry as a beautiful PDF document.
 */
export function exportJournalEntryToPDF(entry: JournalEntry): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 25;

  // Header background accent bar
  doc.setFillColor(243, 232, 255); // Soft lavender fill
  doc.rect(0, 0, pageWidth, 16, 'F');

  // Header brand title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(109, 40, 217); // Purple-700
  doc.text('BORAH JOURNAL  *  PRIVATE ARCHIVE', margin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), pageWidth - margin, 11, { align: 'right' });

  // Main Entry Title
  cursorY += 10;
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59); // Slate-800
  const titleLines = doc.splitTextToSize(entry.title || 'Untitled Journal Entry', contentWidth);
  doc.text(titleLines, margin, cursorY);
  cursorY += titleLines.length * 9;

  // Metadata strip (Date, Mood, Privacy)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate-500
  const dateFormatted = new Date(entry.entry_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const moodLabel = entry.mood ? `Mood: ${entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1)}` : 'Reflective';
  const privacyLabel = entry.is_private ? 'Encrypted Private Page' : 'Personal Entry';
  doc.text(`${dateFormatted}   |   ${moodLabel}   |   ${privacyLabel}`, margin, cursorY);

  cursorY += 4;
  // Decorative horizontal divider line
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.5);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 10;

  // Body Content
  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85); // Slate-700

  const bodyLines = doc.splitTextToSize(entry.content || '(No written content)', contentWidth);
  const lineHeight = 7;

  for (let i = 0; i < bodyLines.length; i++) {
    if (cursorY + lineHeight > pageHeight - 25) {
      // Add page footer before new page
      renderFooter(doc, pageWidth, pageHeight, margin);
      doc.addPage();
      cursorY = 25;
      // Header on continuation page
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text(`${entry.title} (Continued)`, margin, cursorY);
      cursorY += 8;
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(51, 65, 85);
    }
    doc.text(bodyLines[i], margin, cursorY);
    cursorY += lineHeight;
  }

  // Scrapbook stickers summary if any
  if (entry.stickers && entry.stickers.length > 0) {
    cursorY += 6;
    if (cursorY + 15 > pageHeight - 25) {
      renderFooter(doc, pageWidth, pageHeight, margin);
      doc.addPage();
      cursorY = 25;
    }
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    const stickerList = entry.stickers.map((s) => s.sticker_type).join('  ');
    doc.text(`Scrapbook Stickers: ${stickerList}`, margin, cursorY);
  }

  // Attached photos note if any
  if (entry.photos && entry.photos.length > 0) {
    cursorY += 6;
    if (cursorY + 15 > pageHeight - 25) {
      renderFooter(doc, pageWidth, pageHeight, margin);
      doc.addPage();
      cursorY = 25;
    }
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Attached Photos: ${entry.photos.length} photograph(s) linked to this entry`, margin, cursorY);
  }

  // Final footer
  renderFooter(doc, pageWidth, pageHeight, margin);

  // Trigger download
  const safeTitle = (entry.title || 'journal-entry').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  doc.save(`borah-journal-${safeTitle}-${entry.entry_date}.pdf`);
}

/**
 * Format and export multiple journal entries as a comprehensive PDF booklet.
 */
export function exportJournalEntriesToPDF(entries: JournalEntry[]): void {
  if (entries.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Cover Page
  doc.setFillColor(243, 232, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  doc.setFont('times', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(88, 28, 135); // Purple-900
  doc.text('BORAH', pageWidth / 2, 90, { align: 'center' });

  doc.setFont('times', 'italic');
  doc.setFontSize(16);
  doc.setTextColor(126, 34, 206); // Purple-700
  doc.text('My Digital Sanctuary & Journal Archive', pageWidth / 2, 105, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(107, 114, 128); // Gray-500
  doc.text(`${entries.length} Personal Entries`, pageWidth / 2, 125, { align: 'center' });
  doc.text(`Exported on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, 133, { align: 'center' });

  // Each Entry on successive pages
  entries.forEach((entry) => {
    doc.addPage();
    let cursorY = 25;

    // Header bar
    doc.setFillColor(245, 243, 255);
    doc.rect(0, 0, pageWidth, 14, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(109, 40, 217);
    doc.text('BORAH JOURNAL', margin, 9.5);

    // Entry Date & Title
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

    // Content
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    const bodyLines = doc.splitTextToSize(entry.content || '', contentWidth);
    const lineHeight = 6.5;

    for (let i = 0; i < bodyLines.length; i++) {
      if (cursorY + lineHeight > pageHeight - 20) {
        renderFooter(doc, pageWidth, pageHeight, margin);
        doc.addPage();
        cursorY = 25;
      }
      doc.text(bodyLines[i], margin, cursorY);
      cursorY += lineHeight;
    }

    renderFooter(doc, pageWidth, pageHeight, margin);
  });

  doc.save(`borah-journal-full-archive-${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Format and export a specific memory with details, story, and photo metadata as PDF.
 */
export function exportMemoryToPDF(memory: Memory): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 25;

  // Header band
  doc.setFillColor(254, 243, 199); // Amber-100 warm tone
  doc.rect(0, 0, pageWidth, 16, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(180, 83, 9); // Amber-700
  doc.text('BORAH MEMORY ALBUM', margin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text('Cherished Moment Archive', pageWidth - margin, 11, { align: 'right' });

  // Memory Title
  cursorY += 10;
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59);
  const titleLines = doc.splitTextToSize(memory.title || 'Untitled Memory', contentWidth);
  doc.text(titleLines, margin, cursorY);
  cursorY += titleLines.length * 9;

  // Date and Location badge
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const dateFormatted = new Date(memory.memory_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const locationText = memory.location ? `  *  Location: ${memory.location}` : '';
  doc.text(`${dateFormatted}${locationText}`, margin, cursorY);

  cursorY += 5;
  doc.setDrawColor(245, 158, 11); // Amber-500
  doc.setLineWidth(0.6);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 10;

  // Story / Description
  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(55, 65, 81);
  doc.text('The Story & Memory:', margin, cursorY);
  cursorY += 7;

  doc.setFont('times', 'normal');
  doc.setFontSize(11.5);
  doc.setTextColor(71, 85, 105);

  const storyLines = doc.splitTextToSize(memory.description || '(No description recorded for this memory)', contentWidth);
  const lineHeight = 6.8;

  for (let i = 0; i < storyLines.length; i++) {
    if (cursorY + lineHeight > pageHeight - 25) {
      renderFooter(doc, pageWidth, pageHeight, margin);
      doc.addPage();
      cursorY = 25;
    }
    doc.text(storyLines[i], margin, cursorY);
    cursorY += lineHeight;
  }

  // Cover Image & Gallery Information
  cursorY += 8;
  if (cursorY + 30 > pageHeight - 25) {
    renderFooter(doc, pageWidth, pageHeight, margin);
    doc.addPage();
    cursorY = 25;
  }

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, cursorY, contentWidth, 38, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, cursorY, contentWidth, 38, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text('Album Photographic Records:', margin + 6, cursorY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Cover Photo: ${memory.cover_image ? 'Preserved in high fidelity' : 'Default cover'}`, margin + 6, cursorY + 16);

  const photosCount = memory.photos?.length || 0;
  doc.text(`Additional Gallery Photographs: ${photosCount} image(s)`, margin + 6, cursorY + 23);

  if (photosCount > 0 && memory.photos) {
    const captions = memory.photos
      .filter((p) => p.caption)
      .map((p) => p.caption)
      .slice(0, 3)
      .join(', ');
    if (captions) {
      doc.text(`Photo Captions: "${captions}"`, margin + 6, cursorY + 30);
    }
  }

  renderFooter(doc, pageWidth, pageHeight, margin);

  const safeTitle = (memory.title || 'memory').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  doc.save(`borah-memory-${safeTitle}.pdf`);
}

function renderFooter(doc: jsPDF, pageWidth: number, pageHeight: number, margin: number): void {
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text('BORAH  *  Preserving moments that matter softly and forever.', margin, pageHeight - 10);
  const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
  doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
}

/**
 * Trigger text file download in browser
 */
function downloadTextFile(content: string, filename: string): void {
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

/**
 * Format and export a single journal entry as a structured text file (.txt) for personal safekeeping.
 */
export function exportJournalEntryToText(entry: JournalEntry): void {
  const dateFormatted = new Date(entry.entry_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const tagsStr = entry.tags && entry.tags.length > 0 ? entry.tags.map((t) => `#${t}`).join(', ') : 'None';
  const stickersStr = entry.stickers && entry.stickers.length > 0 ? entry.stickers.map((s) => s.sticker_type).join(' ') : 'None';
  const photosCount = entry.photos?.length || 0;

  const text = [
    '================================================================================',
    'BORAH DIGITAL JOURNAL — PERSONAL ARCHIVE & SAFEKEEPING',
    '================================================================================',
    `Title:          ${entry.title || 'Untitled Journal Entry'}`,
    `Date:           ${dateFormatted}`,
    `Mood:           ${entry.mood ? entry.mood.toUpperCase() : 'CALM'}`,
    `Tags:           ${tagsStr}`,
    `Privacy:        ${entry.is_private ? 'Encrypted Private Entry' : 'Personal Entry'}`,
    `Created At:     ${new Date(entry.created_at).toLocaleString()}`,
    `Last Modified:  ${new Date(entry.updated_at).toLocaleString()}`,
    '================================================================================',
    '',
    '[JOURNAL ENTRY CONTENT]',
    '--------------------------------------------------------------------------------',
    entry.content || '(No written content)',
    '--------------------------------------------------------------------------------',
    '',
    '[ATTACHMENTS & METADATA]',
    `Scrapbook Stickers: ${stickersStr}`,
    `Photo Memories:     ${photosCount} photograph(s) attached`,
    entry.audio_duration ? `Voice Memo:         Recorded (${Math.round(entry.audio_duration)}s duration)` : '',
    '',
    '================================================================================',
    'Preserved with BORAH — Softly, safely, forever.',
    '================================================================================',
  ]
    .filter(Boolean)
    .join('\n');

  const safeTitle = (entry.title || 'journal-entry').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  downloadTextFile(text, `borah-journal-${safeTitle}-${entry.entry_date}.txt`);
}

/**
 * Format and export multiple journal entries as a comprehensive archive text file (.txt).
 */
export function exportJournalEntriesToText(entries: JournalEntry[]): void {
  if (entries.length === 0) return;

  const dateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const header = [
    '================================================================================',
    'BORAH DIGITAL JOURNAL — COMPLETE ARCHIVE FOR PERSONAL SAFEKEEPING',
    '================================================================================',
    `Archive Export Date: ${dateFormatted}`,
    `Total Entries:        ${entries.length} pages`,
    '================================================================================',
    '',
    'TABLE OF CONTENTS:',
    ...entries.map(
      (e, idx) => `  ${String(idx + 1).padStart(2, ' ')}. [${e.entry_date}] ${e.title || 'Untitled'} (Mood: ${e.mood || 'Calm'})`
    ),
    '',
    '================================================================================',
    '',
  ].join('\n');

  const entriesBody = entries
    .map((entry, index) => {
      const entryDate = new Date(entry.entry_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const tagsStr = entry.tags && entry.tags.length > 0 ? entry.tags.map((t) => `#${t}`).join(', ') : 'None';
      const photosCount = entry.photos?.length || 0;

      return [
        `================================================================================`,
        `PAGE ${index + 1} OF ${entries.length}`,
        `================================================================================`,
        `Title: ${entry.title || 'Untitled Entry'}`,
        `Date:  ${entryDate}`,
        `Mood:  ${entry.mood || 'Calm'}`,
        `Tags:  ${tagsStr}`,
        `--------------------------------------------------------------------------------`,
        entry.content || '(No content)',
        '',
        photosCount > 0 ? `[Photographs attached: ${photosCount}]` : '',
        entry.stickers && entry.stickers.length > 0
          ? `[Stickers: ${entry.stickers.map((s) => s.sticker_type).join(' ')}]`
          : '',
        `--------------------------------------------------------------------------------`,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');

  const footer = [
    '',
    '================================================================================',
    'END OF BORAH JOURNAL ARCHIVE',
    'All entries preserved for personal safekeeping and reflection.',
    '================================================================================',
  ].join('\n');

  const fullText = `${header}\n${entriesBody}\n${footer}`;
  const dateStr = new Date().toISOString().split('T')[0];
  downloadTextFile(fullText, `borah-journal-complete-archive-${dateStr}.txt`);
}

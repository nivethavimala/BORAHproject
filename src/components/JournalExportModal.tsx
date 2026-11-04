import React, { useState } from 'react';
import {
  FileText,
  FileDown,
  Download,
  X,
  CheckCircle2,
  ShieldCheck,
  BookOpen,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react';
import { JournalEntry } from '../types';
import {
  exportJournalEntryToPDF,
  exportJournalEntriesToPDF,
  exportJournalEntryToText,
  exportJournalEntriesToText,
} from '../utils/pdfExport';

interface JournalExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEntry: JournalEntry | null;
  entries: JournalEntry[];
  onShowToast: (msg: string) => void;
}

export const JournalExportModal: React.FC<JournalExportModalProps> = ({
  isOpen,
  onClose,
  currentEntry,
  entries,
  onShowToast,
}) => {
  const [exportScope, setExportScope] = useState<'current' | 'all'>(
    currentEntry ? 'current' : 'all'
  );
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'txt'>('pdf');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExecuteExport = () => {
    setIsExporting(true);
    try {
      if (exportScope === 'current' && currentEntry) {
        if (selectedFormat === 'pdf') {
          exportJournalEntryToPDF(currentEntry);
          onShowToast(`Exported "${currentEntry.title || 'Entry'}" as PDF 📄`);
        } else {
          exportJournalEntryToText(currentEntry);
          onShowToast(`Exported "${currentEntry.title || 'Entry'}" as Text file (.txt) 📝`);
        }
      } else {
        if (selectedFormat === 'pdf') {
          exportJournalEntriesToPDF(entries);
          onShowToast(`Exported ${entries.length} entries as PDF Booklet 📖`);
        } else {
          exportJournalEntriesToText(entries);
          onShowToast(`Exported ${entries.length} entries as Text archive (.txt) 📝`);
        }
      }
      onClose();
    } catch (err: any) {
      console.error('Export failed:', err);
      onShowToast('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold font-serif text-slate-800 dark:text-slate-100">
              Personal Safekeeping & Export
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Export your private diary pages as offline documents for your personal backup, offline reading, or printing.
          </p>
        </div>

        {/* Scope Selector: Single Entry vs Full Archive */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            1. Select Scope
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={!currentEntry}
              onClick={() => setExportScope('current')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                !currentEntry
                  ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800'
                  : exportScope === 'current'
                  ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 ring-2 ring-purple-300 dark:ring-purple-700'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold font-serif">Current Entry</span>
                {exportScope === 'current' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                {currentEntry ? currentEntry.title || 'Selected Page' : 'No entry selected'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setExportScope('all')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                exportScope === 'all'
                  ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 ring-2 ring-purple-300 dark:ring-purple-700'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold font-serif">Complete Archive</span>
                {exportScope === 'all' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                All {entries.length} entries preserved
              </p>
            </button>
          </div>
        </div>

        {/* Format Selector: PDF vs TXT */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            2. Choose File Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* PDF Card */}
            <div
              onClick={() => setSelectedFormat('pdf')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                selectedFormat === 'pdf'
                  ? 'border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 text-slate-900 dark:text-slate-100 ring-2 ring-purple-400/50 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-bold text-xs">
                  PDF
                </div>
                {selectedFormat === 'pdf' && (
                  <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                )}
              </div>
              <h4 className="text-xs font-bold font-serif">PDF Document (.pdf)</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                Formatted booklet with elegant typography, cover page, and page numbers.
              </p>
            </div>

            {/* Plain Text Card */}
            <div
              onClick={() => setSelectedFormat('txt')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                selectedFormat === 'txt'
                  ? 'border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 text-slate-900 dark:text-slate-100 ring-2 ring-purple-400/50 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold text-xs">
                  TXT
                </div>
                {selectedFormat === 'txt' && (
                  <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                )}
              </div>
              <h4 className="text-xs font-bold font-serif">Plain Text (.txt)</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                Universal, raw text format with metadata and timestamps. Readable anywhere forever.
              </p>
            </div>
          </div>
        </div>

        {/* Safekeeping Highlights Box */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Offline Personal Safekeeping
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Your files are compiled in-browser and saved directly to your local device. Your private entries remain completely yours.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isExporting || (exportScope === 'all' && entries.length === 0)}
            onClick={handleExecuteExport}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            <span>
              {selectedFormat === 'pdf' ? 'Download PDF Document' : 'Download Text File (.txt)'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

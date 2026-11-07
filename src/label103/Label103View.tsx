import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { InputPanel } from './components/InputPanel';
import { MarkdownOutput } from './components/MarkdownOutput';
import { PhysicalSheetPreview } from './components/PhysicalSheetPreview';
import { WordGuideModal } from './components/WordGuideModal';
import { PhotoUploadModal } from './components/PhotoUploadModal';
import { WordFilterModal } from './components/WordFilterModal';
import { Toast } from './components/Toast';
import { FormatSettings } from './types';
import {
  DEFAULT_SETTINGS,
  SAMPLE_GUEST_NAMES,
  parseRawNames,
  createSheets,
  generateMarkdownOutput,
  generateWordHtml,
  downloadWordDocument,
  downloadMarkdownFile,
} from './utils/labelFormatter';
import { FileText, Printer, HelpCircle } from 'lucide-react';

interface Label103ViewProps {
  onExportComplete?: (fileName: string) => void;
}

export const Label103View: React.FC<Label103ViewProps> = ({ onExportComplete }) => {
  const [rawInput, setRawInput] = useState<string>(SAMPLE_GUEST_NAMES);
  const [settings, setSettings] = useState<FormatSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'markdown' | 'preview'>('markdown');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isWordFilterOpen, setIsWordFilterOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Handler for names imported from Photo or Word
  const handleApplyImportedNames = (newNames: string[], mode: 'replace' | 'append') => {
    const joined = newNames.join(', ');
    if (mode === 'replace' || !rawInput.trim()) {
      setRawInput(joined);
    } else {
      setRawInput(`${rawInput.trim()}, ${joined}`);
    }
    showToast(`Berhasil menambahkan ${newNames.length} nama ke daftar label 103!`);
  };

  // Parse names and group into sheets
  const { names, totalDuplicates, duplicateNames } = useMemo(() => {
    return parseRawNames(rawInput, settings);
  }, [rawInput, settings]);

  const sheets = useMemo(() => {
    return createSheets(names, settings);
  }, [names, settings]);

  const totalGuests = names.length;
  const totalSheets = sheets.length;

  const emptySlotsLastSheet = useMemo(() => {
    if (sheets.length === 0) return 0;
    const lastSheet = sheets[sheets.length - 1];
    return lastSheet.emptyItemCount;
  }, [sheets]);

  const markdownText = useMemo(() => {
    return generateMarkdownOutput(sheets);
  }, [sheets]);

  // Copy Markdown Handler
  const handleCopyMarkdown = () => {
    showToast('Tabel Markdown berhasil disalin ke papan klip!');
    if (onExportComplete) {
      onExportComplete('Label_Undangan_103_Markdown.md');
    }
  };

  // Copy Rich HTML for Microsoft Word
  const handleCopyWordTable = async () => {
    if (sheets.length === 0) return;
    const html = generateWordHtml(sheets, settings);
    const plainText = markdownText;

    try {
      if (typeof window !== 'undefined' && 'ClipboardItem' in window) {
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        const htmlBlob = new Blob([html], { type: 'text/html' });
        const item = new ClipboardItem({
          'text/plain': textBlob,
          'text/html': htmlBlob,
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
      showToast('Format Tabel Word tersalin! Siap di-paste (Ctrl+V) ke Microsoft Word.');
      if (onExportComplete) {
        onExportComplete('Label_Undangan_103_Tabel_Word.doc');
      }
    } catch {
      // Fallback
      await navigator.clipboard.writeText(plainText);
      showToast('Teks tersalin ke papan klip.');
      if (onExportComplete) {
        onExportComplete('Label_Undangan_103_Tabel_Word.doc');
      }
    }
  };

  // Download Word .doc
  const handleDownloadWordDoc = () => {
    if (sheets.length === 0) return;
    downloadWordDocument(sheets, settings);
    showToast('File dokumen Word (.doc) berhasil diunduh!');
    if (onExportComplete) {
      onExportComplete(`Label_Undangan_103_${new Date().toISOString().slice(0, 10)}.doc`);
    }
  };

  // Download Markdown .md
  const handleDownloadMdFile = () => {
    if (!markdownText) return;
    downloadMarkdownFile(markdownText);
    showToast('File Markdown (.md) berhasil diunduh!');
    if (onExportComplete) {
      onExportComplete(`Label_Undangan_103_${new Date().toISOString().slice(0, 10)}.md`);
    }
  };

  // Direct Print
  const handlePrint = () => {
    window.print();
    if (onExportComplete) {
      onExportComplete('Label_Undangan_103_Cetak.pdf');
    }
  };

  return (
    <div className="label103-workspace min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Bar Header */}
      <Header
        onOpenGuide={() => setIsGuideOpen(true)}
        onPrint={handlePrint}
        onCopyWord={handleCopyWordTable}
        onDownloadWord={handleDownloadWordDoc}
        totalGuests={totalGuests}
        totalSheets={totalSheets}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner Section / Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 no-print">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider font-mono">
                Stiker Undangan Standar 103
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500">Kolom 6,4 cm × 3,3 cm (Kertas 20 × 14 cm)</span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500">12 Kolom / Lembar (3 Kesamping × 4 Kebawah)</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Asisten Pemformat Label Undangan 103
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Konversi daftar nama tamu terpisah koma menjadi susunan label 3 baris (Nama Tamu, Di, Tempat),
              lengkap dengan format tabel Markdown 3 kolom, acuan margin Word, penanda lembar baru, dan pratinjau cetak.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
              <span>Panduan Margin Word</span>
            </button>
            <button
              type="button"
              onClick={handleCopyWordTable}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Salin Tabel Word</span>
            </button>
          </div>
        </div>

        {/* Input Panel */}
        <InputPanel
          rawInput={rawInput}
          onInputChange={setRawInput}
          settings={settings}
          onSettingsChange={setSettings}
          totalGuests={totalGuests}
          totalSheets={totalSheets}
          totalDuplicates={totalDuplicates}
          duplicateNames={duplicateNames}
          emptySlotsLastSheet={emptySlotsLastSheet}
          onOpenPhotoModal={() => setIsPhotoModalOpen(true)}
          onOpenWordFilterModal={() => setIsWordFilterOpen(true)}
          onPhotoNamesDetected={handleApplyImportedNames}
        />

        {/* Primary View Switcher Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pt-2 no-print">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('markdown')}
              className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'markdown'
                  ? 'border-amber-600 text-amber-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Tabel Markdown &amp; Ekspor Word</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'border-amber-600 text-amber-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Pratinjau Cetak Lembar Stiker Fisik</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 hidden sm:block">
            {totalGuests} Nama · {totalSheets} Lembar Label
          </div>
        </div>

        {/* Active Tab View */}
        {activeTab === 'markdown' ? (
          <MarkdownOutput
            markdownText={markdownText}
            sheets={sheets}
            onCopySuccess={handleCopyMarkdown}
            onDownloadMd={handleDownloadMdFile}
          />
        ) : (
          <PhysicalSheetPreview
            sheets={sheets}
            settings={settings}
            onSettingsChange={setSettings}
            onPrint={handlePrint}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">Label Undangan 103</span>
            <span aria-hidden="true">·</span>
            <span>Kertas 20 × 14 cm · Kolom 6,4 cm × 3,3 cm</span>
            <span aria-hidden="true">·</span>
            <span>12 Kolom (3 Kesamping × 4 Kebawah)</span>
          </div>
          <div>
            Format siap cetak langsung atau dipindahkan ke Microsoft Word &amp; Markdown.
          </div>
        </div>
      </footer>

      {/* Word Margins Guide Modal */}
      <WordGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onCopyWordTable={handleCopyWordTable}
        onDownloadDoc={handleDownloadWordDoc}
      />

      {/* Photo OCR Modal (Pen Handwritten Notebook) */}
      <PhotoUploadModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        onApplyNames={handleApplyImportedNames}
      />

      {/* Word Document / Raw Text Filter Modal */}
      <WordFilterModal
        isOpen={isWordFilterOpen}
        onClose={() => setIsWordFilterOpen(false)}
        onApplyNames={handleApplyImportedNames}
      />

      {/* Toast Feedback */}
      <Toast message={toastMessage} />
    </div>
  );
}

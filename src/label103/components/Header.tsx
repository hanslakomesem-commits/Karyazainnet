import React from 'react';
import { Printer, HelpCircle, FileDown, Copy } from 'lucide-react';

interface HeaderProps {
  onOpenGuide: () => void;
  onPrint: () => void;
  onCopyWord: () => void;
  onDownloadWord: () => void;
  totalGuests: number;
  totalSheets: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenGuide,
  onPrint,
  onCopyWord,
  onDownloadWord,
  totalGuests,
  totalSheets,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-xs sticky top-0 z-40 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <div className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              103
            </span>
            <span>Label Undangan 103</span>
          </div>
          <span className="hidden md:inline text-xs text-slate-400">·</span>
          <span className="hidden md:inline text-xs text-slate-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium">
            Ukuran Kertas Undangan: 20 × 14 cm (Kolom 6,4 × 3,3 cm)
          </span>
        </div>

        {/* Zone 2: Navigation / Info */}
        <nav className="hidden lg:flex items-center gap-6 text-xs text-slate-600 font-medium">
          <span className="text-slate-500">
            Tamu: <strong className="text-slate-900 font-mono tabular-nums">{totalGuests}</strong>
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="text-slate-500">
            Lembar: <strong className="text-slate-900 font-mono tabular-nums">{totalSheets}</strong>
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <button
            onClick={onOpenGuide}
            className="hover:text-amber-700 transition-colors flex items-center gap-1.5 cursor-pointer text-slate-700"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Ukuran & Margin Word</span>
          </button>
        </nav>

        {/* Zone 3: Primary actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onCopyWord}
            disabled={totalGuests === 0}
            title="Salin tabel format Word untuk langsung dipaste ke Microsoft Word"
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Salin Tabel</span> Word
          </button>

          <button
            onClick={onDownloadWord}
            disabled={totalGuests === 0}
            title="Unduh file .doc yang sudah terformat tabel 3x4"
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Unduh</span> .DOC
          </button>

          <button
            onClick={onPrint}
            disabled={totalGuests === 0}
            title="Cetak lembar label langsung atau simpan sebagai PDF"
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-md shadow-xs transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Langsung</span>
          </button>
        </div>
      </div>
    </header>
  );
};

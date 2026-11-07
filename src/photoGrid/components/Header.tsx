import React from 'react';
import { FileText, CodeXml, Sparkles } from 'lucide-react';

interface HeaderProps {
  onOpenXmlModal: () => void;
  onLoadSamples: () => void;
  hasPhotos: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenXmlModal,
  onLoadSamples,
  hasPhotos,
}) => {
  return (
    <header className="w-full bg-white border-b border-neutral-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 leading-tight">
              Docx Photo Grid
            </h1>
            <p className="text-xs text-neutral-500 hidden sm:block">
              OpenXML Client-Side Resizer &amp; Word Generator
            </p>
          </div>
        </div>

        {/* Zone 2: Navigation / Info */}
        <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-medium text-neutral-600">
          <span className="flex items-center gap-1.5 text-neutral-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            100% Client-Side Processing
          </span>
          <span className="text-neutral-300">·</span>
          <span>1 cm = 360,000 EMU</span>
          <span className="text-neutral-300">·</span>
          <span>1 cm ≈ 567 Twips</span>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2">
          {!hasPhotos && (
            <button
              onClick={onLoadSamples}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors whitespace-nowrap cursor-pointer"
              title="Muat 4 contoh pas foto langsung untuk pengujian instan"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Contoh Pas Foto</span>
            </button>
          )}

          <button
            onClick={onOpenXmlModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors whitespace-nowrap cursor-pointer"
            title="Lihat kode Office OpenXML & unduh document.xml"
          >
            <CodeXml className="w-3.5 h-3.5" />
            <span>Lihat OpenXML</span>
          </button>
        </div>
      </div>
    </header>
  );
};

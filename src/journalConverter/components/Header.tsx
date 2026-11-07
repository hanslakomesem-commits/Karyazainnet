import { downloadBackendFile } from '../../utils/downloadBackendFile';
import React from 'react';
import { FileText, Sparkles, Download, BookOpen, Layers, Archive } from 'lucide-react';

interface HeaderProps {
  activeTab: 'upload' | 'preview' | 'footnotes';
  setActiveTab: (tab: 'upload' | 'preview' | 'footnotes') => void;
  hasArticle: boolean;
  onDownloadDocx: () => void;
  onDownloadBundle?: () => void;
  onDownloadCoverCd?: () => void;
  isDownloading?: boolean;
  selectedModel?: string;
  onSelectModel?: (modelId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  hasArticle,
  onDownloadDocx,
  onDownloadBundle,
  onDownloadCoverCd,
  isDownloading = false,
}) => {
  return (
    <header className="bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        
        {/* Logo & Brand Info */}
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  ZAIN.NET <span className="text-blue-400">BUAT ARTIKEL</span>
                </h1>
                <span className="inline-flex items-center text-[11px] bg-blue-500/15 text-blue-300 border border-blue-500/20 px-2.5 py-0.5 rounded-full font-medium">
                  Standar Tepat 18 Halaman + Cover CD
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block mt-0.5">
                Konversi otomatis skripsi ke artikel ilmiah (.docx Word) & Cover CD Word siap cetak
              </p>
            </div>
          </div>
        </div>

        {/* Right: Navigation Menu Tabs */}
        <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-3 w-full sm:w-auto overflow-x-visible pb-1 sm:pb-0">
          
          {/* Navigation Tabs: Sembunyikan tab Unggah jika artikel sudah berhasil dibuat agar tidak disalahgunakan untuk konversi ulang gratis */}
          {!hasArticle && (
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 flex items-center space-x-1.5 sm:space-x-2 whitespace-nowrap ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-500'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-300" />
              <span>1. Unggah Skripsi</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            disabled={!hasArticle}
            className={`px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 flex items-center space-x-1.5 sm:space-x-2 whitespace-nowrap ${
              !hasArticle
                ? 'text-slate-600 cursor-not-allowed opacity-60'
                : activeTab === 'preview'
                ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-500'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-300" />
            <span>2. Pratinjau Naskah</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('footnotes')}
            disabled={!hasArticle}
            className={`px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 flex items-center space-x-1.5 sm:space-x-2 whitespace-nowrap ${
              !hasArticle
                ? 'text-slate-600 cursor-not-allowed opacity-60'
                : activeTab === 'footnotes'
                ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-500'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-300" />
            <span>3. Catatan Kaki</span>
          </button>

          {/* Download Source Code (.zip) */}
          <a
            href="/api/journal7/download-source-code"
              onClick={async (event) => {
                event.preventDefault();
                try { await downloadBackendFile('/api/journal7/download-source-code', 'source-code-skripsi-to-journal.zip'); }
                catch (e: any) { alert(e?.message || 'Gagal mengunduh source code.'); }
              }}
            download="source-code-skripsi-to-journal.zip"
            className="text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 px-2.5 py-1.5 sm:py-2 rounded-lg border border-slate-700/80 flex items-center space-x-1.5 transition-all whitespace-nowrap"
            title="Download source code skripsi-to-journal (.zip)"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Source Code (.zip)</span>
            <span className="md:hidden">Source</span>
          </a>

          {/* Download DOCX Button */}
          {hasArticle && (
            <div className="flex items-center space-x-1.5 ml-1 sm:ml-2">
              <button
                type="button"
                onClick={onDownloadDocx}
                disabled={isDownloading}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold px-3 py-1.5 sm:py-2 rounded-lg shadow-sm transition-all duration-200 flex items-center space-x-1.5 border border-blue-500/30 whitespace-nowrap"
                title="Unduh file Word (.docx)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isDownloading ? 'Memproses...' : 'Artikel (.docx)'}</span>
              </button>

              {onDownloadBundle && (
                <button
                  type="button"
                  onClick={onDownloadBundle}
                  disabled={isDownloading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center space-x-1.5 border border-emerald-500/30 whitespace-nowrap transform hover:-translate-y-0.5"
                  title="Unduh Paket Lengkap: Artikel + Cover CD (.zip)"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Paket + Cover CD (.zip)</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

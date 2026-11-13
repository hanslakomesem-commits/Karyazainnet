import React from 'react';
import {
  ShieldCheck,
  FileCheck2,
  Sparkles,
  Zap,
} from 'lucide-react';

interface HeaderProps {
  onLoadDemo: () => void;
  isLoadingDemo: boolean;
  hasLoadedFiles: boolean;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadDemo,
  isLoadingDemo,
  hasLoadedFiles,
  onReset,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/50 shrink-0">
              <FileCheck2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Parafrase Skripsi & Anti-Plagiasi DOCX
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  In-Place XML Guard
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Mengganti hanya kata yang terkena plagiasi langsung di file Word asli • format dan catatan kaki diupayakan tetap terjaga
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
{hasLoadedFiles ? (
              <button
                type="button"
                onClick={onReset}
                className="px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
              >
                Ganti File
              </button>
            ) : null}

            <button
              type="button"
              onClick={onLoadDemo}
              disabled={isLoadingDemo}
              className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-xs transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              {isLoadingDemo ? 'Memuat Demo...' : 'Coba Demo Skripsi (30 Footnote)'}
            </button>
          </div>
        </div>

        {/* Feature Highlights Bar */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>100% Word Asli Dipertahankan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span>Penomoran Footnote Aman</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Bahasa Indonesia Ilmiah Baku EYD V</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>Sistem Restrukturisasi Presisi Tinggi Aktif</span>
          </div>
        </div>
      </div>
    </header>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FileText, ShieldCheck, Sparkles, CheckCircle2, Download } from 'lucide-react';

interface HeaderProps {
  currentStep: number;
  onSelectStep: (step: number) => void;
  onLoadSample: () => void;
  isLoadingSample: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentStep,
  onSelectStep,
  onLoadSample,
  isLoadingSample,
}) => {
  const steps = [
    { num: 1, title: 'Upload Skripsi' },
    { num: 2, title: 'Upload Scan' },
    { num: 3, title: 'Pemeriksaan' },
    { num: 4, title: 'Pemetaan' },
    { num: 5, title: 'Preview Posisi' },
    { num: 6, title: 'Proses' },
    { num: 7, title: 'Download' },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-white">
                  ZAIN<span className="text-blue-400">.NET</span>
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 font-medium">
                  OOXML Precision Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Otomatis Menempelkan Foto/Scan Dokumen Lampiran Skripsi ke File Word (.docx)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 text-emerald-300 border border-emerald-800/80 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Pemrosesan Lokal di Browser (Aman & Terenkripsi)</span>
            </div>

            <a
              href="/source_code.zip"
              download="source_code.zip"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shadow-xs transition cursor-pointer"
              title="Download seluruh source code aplikasi web (.zip)"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              Download Source Code (.zip)
            </a>

            <button
              onClick={onLoadSample}
              disabled={isLoadingSample}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isLoadingSample ? 'Memuat Sampel...' : 'Coba Sampel (SEBELUM.docx)'}
            </button>
          </div>
        </div>

        {/* Steps Navigation Bar */}
        <nav className="mt-5 pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between overflow-x-auto pb-2 scrollbar-thin">
            {steps.map((s, idx) => {
              const isActive = currentStep === s.num;
              const isPassed = currentStep > s.num;

              return (
                <button
                  key={s.num}
                  onClick={() => onSelectStep(s.num)}
                  className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : isPassed
                      ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                      : 'text-slate-500 hover:text-slate-400'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive
                        ? 'bg-white text-blue-600'
                        : isPassed
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isPassed ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : s.num}
                  </span>
                  <span>{s.title}</span>
                  {idx < steps.length - 1 && (
                    <span className="text-slate-700 ml-1">/</span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
};

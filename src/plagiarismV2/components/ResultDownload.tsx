// ZAINNET_MENU5_NATURAL_EDITOR_V1
import React from 'react';
import {
  Download,
  ShieldCheck,
  CheckCircle2,
  FileCheck2,
  Sparkles,
  ArrowLeft,
  Eye,
  FileText,
  ListOrdered,
  Layers,
} from 'lucide-react';
import type { ReplacementResult, DocxFileInfo } from '../types';

interface ResultDownloadProps {
  result: ReplacementResult;
  docxInfo: DocxFileInfo;
  onExportComplete?: (fileName: string) => void;
  onBackToReview: () => void;
  onOpenPreview: () => void;
}

export const ResultDownload: React.FC<ResultDownloadProps> = ({
  result,
  docxInfo,
  onExportComplete,
  onBackToReview,
  onOpenPreview,
}) => {
  const handleDownload = () => {

    const url = URL.createObjectURL(result.revisedDocxBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.downloadFileName;
    document.body.appendChild(a);
    a.click();
    onExportComplete?.(result.downloadFileName);
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Success Celebration Header */}
      <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-500/30">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Revisi Word Selesai • Periksa Isi Sebelum Digunakan
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Dokumen Skripsi Siap Diunduh
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Bagian naskah terpilih telah diperbarui dengan hasil revisi akademik.
              <strong> File Word asli Anda tetap utuh, rapi, dan penomoran footnote 1 sampai {result.footnotesAfterCount} telah diperiksa oleh sistem; mohon verifikasi kembali setelah mengunduh</strong>.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 w-full md:w-auto shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Download className="w-5 h-5 text-slate-950" />
              <span>Download File Word Hasil Revisi (.docx)</span>
            </button>

            <button
              type="button"
              onClick={onOpenPreview}
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Eye className="w-4 h-4 text-slate-300" />
              <span>Pratinjau Isi Dokumen & Footnote</span>
            </button>
          </div>
        </div>

        {/* Highlight Stats Bento */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <div className="text-slate-400 text-[11px] font-medium">Status Footnote Asli</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {result.footnotesBeforeCount} ➔ {result.footnotesAfterCount} (100% Utuh)
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Nomor & rujukan tidak berubah</div>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <div className="text-slate-400 text-[11px] font-medium">Total Teks Diparafrase</div>
            <div className="text-base font-bold text-white mt-0.5 flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-amber-400" />
              {result.totalReplaced} Bagian
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Perlu diperiksa kembali menggunakan layanan similarity terpisah</div>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <div className="text-slate-400 text-[11px] font-medium">Struktur & Tata Letak</div>
            <div className="text-base font-bold text-white mt-0.5 flex items-center gap-1">
              <Layers className="w-4 h-4 text-blue-400" />
              Word Asli Utuh
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Margin, font, & spasi sama</div>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <div className="text-slate-400 text-[11px] font-medium">Nama File Unduhan</div>
            <div className="text-xs font-bold text-slate-200 mt-0.5 truncate font-mono">
              {result.downloadFileName}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Siap langsung diserahkan</div>
          </div>
        </div>
      </div>

      {/* Log of Changes & Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Laporan Rincian Penggantian Teks
            </h3>
          </div>

          <button
            type="button"
            onClick={onBackToReview}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Tinjauan Parafrase
          </button>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 max-h-60 overflow-y-auto font-mono text-xs text-slate-700 space-y-1.5 custom-scrollbar">
          {result.logs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-slate-400 select-none">{idx + 1}.</span>
              <span>{log}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

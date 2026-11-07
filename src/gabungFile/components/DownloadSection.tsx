/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Download, CheckCircle2, AlertTriangle, ShieldCheck, FileCheck, Eye, RefreshCw } from 'lucide-react';
import { ValidationResult } from '../types/skripsi';
import { renderAsync } from 'docx-preview';

interface DownloadSectionProps {
  finalDocxBlob: Blob | null;
  validationResult: ValidationResult | null;
  onReset: () => void;
  onExportComplete?: (fileName: string) => void;
}

export const DownloadSection: React.FC<DownloadSectionProps> = ({
  finalDocxBlob,
  validationResult,
  onReset,
  onExportComplete,
}) => {
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [isRenderingPreview, setIsRenderingPreview] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    if (!finalDocxBlob || isDownloaded) return;
    setIsDownloaded(true);
    const fileName = 'SKRIPSI_SELESAI_TEMPEL_LAMPIRAN.docx';
    const url = URL.createObjectURL(finalDocxBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onExportComplete?.(fileName);
  };

  useEffect(() => {
    if (isPreviewActive && finalDocxBlob && docxContainerRef.current) {
      setIsRenderingPreview(true);
      docxContainerRef.current.innerHTML = '';
      renderAsync(finalDocxBlob, docxContainerRef.current, undefined, {
        className: 'docx-preview-root',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
      })
        .then(() => {
          setIsRenderingPreview(false);
        })
        .catch((err: any) => {
          console.warn('Docx preview render error:', err);
          setIsRenderingPreview(false);
        });
    }
  }, [isPreviewActive, finalDocxBlob]);

  if (!finalDocxBlob || !validationResult) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
              7
            </span>
            Hasil Akhir & Validasi Dokumen DOCX
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dokumen siap diunduh dan dibuka langsung di Microsoft Word, LibreOffice, atau Google Docs.
          </p>
        </div>

        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium cursor-pointer transition self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Proses Dokumen Lain
        </button>
      </div>

      {/* Validation Checklist Card */}
      <div className={`p-4 rounded-xl border ${
        validationResult.isValid ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50 border-rose-200'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          {validationResult.isValid ? (
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          )}
          <h3 className={`text-sm font-bold ${
            validationResult.isValid ? 'text-emerald-950' : 'text-rose-950'
          }`}>
            {validationResult.isValid
              ? 'Laporan Uji Validasi OOXML: Lolos 100%'
              : 'Struktur DOCX Gagal Divalidasi'}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {validationResult.checks.map((c, i) => (
            <div key={i} className="flex items-start gap-2 bg-white/80 p-2.5 rounded-lg border border-emerald-100/80">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">{c.name}</span>
                <span className="text-[11px] text-slate-600">{c.details}</span>
              </div>
            </div>
          ))}
        </div>

        {!validationResult.isValid && validationResult.errorMessage && (
          <div className="mt-3 p-3 bg-rose-100/80 rounded-lg text-rose-800 text-xs font-semibold">
            {validationResult.errorMessage}
          </div>
        )}
      </div>

      {/* Download Action Box */}
      {validationResult.isValid && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
              <FileCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                File Siap Diunduh
              </span>
              <h3 className="text-lg font-black tracking-tight text-white">
                SKRIPSI_SELESAI_TEMPEL_LAMPIRAN.docx
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Ukuran file: {(finalDocxBlob.size / (1024 * 1024)).toFixed(2)} MB • Format Microsoft Word Resmi
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsPreviewActive(!isPreviewActive)}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              {isPreviewActive ? 'Tutup Preview Word' : 'Lihat Preview Word Langsung'}
            </button>

            <button
              onClick={handleDownload}
              disabled={isDownloaded}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black shadow-lg transition cursor-pointer ${
                isDownloaded
                  ? 'bg-emerald-700/80 text-white cursor-not-allowed opacity-90'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
              }`}
            >
              {isDownloaded ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Selesai! Mengalihkan ke Beranda...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 stroke-[2.5]" />
                  <span>Unduh File Word (.docx)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Embedded Document Previewer */}
      {isPreviewActive && (
        <div className="border border-slate-300 rounded-2xl overflow-hidden shadow-inner bg-slate-100">
          <div className="p-3 bg-slate-200 border-b border-slate-300 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Pratinjau Hasil Dokumen DOCX (docx-preview rendering engine)</span>
            {isRenderingPreview && <span className="text-blue-600 animate-pulse">Sedang me-render halaman...</span>}
          </div>
          <div
            ref={docxContainerRef}
            className="p-6 max-h-[700px] overflow-y-auto flex flex-col items-center justify-start bg-slate-100"
          />
        </div>
      )}
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Search,
  Upload,
  FileText,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  BookOpen,
  FileSpreadsheet,
  Image as ImageIcon,
  Clock,
  Layers,
} from 'lucide-react';
import { ParsedDocument } from '../types/document';
import { readDocxFile } from '../services/docxReader';
import { SAMPLE_ARTICLES, createRealDocxFromSample } from '../services/sampleDocuments';
import { NavPage } from '../components/Layout/Sidebar';

interface DocumentAnalyzerViewProps {
  onNavigateToFormat: (doc: ParsedDocument) => void;
}

export function DocumentAnalyzerView({ onNavigateToFormat }: DocumentAnalyzerViewProps) {
  const [doc, setDoc] = useState<ParsedDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true);
      const parsed = await readDocxFile(file);
      setDoc(parsed);
    } catch (err: any) {
      alert('Gagal menganalisis dokumen: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSample = async () => {
    try {
      setIsLoading(true);
      const sample = SAMPLE_ARTICLES[0];
      const blob = await createRealDocxFromSample(sample);
      const file = new File([blob], 'artikel_penelitian_udang_vaname.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const parsed = await readDocxFile(file);
      setDoc(parsed);
    } catch (err: any) {
      alert('Gagal memuat contoh: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Analisis Struktur Dokumen Ilmiah
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Inspeksi menyeluruh elemen naskah Word sebelum diproses: heading, hierarki bab, abstrak, tabel, gambar, dan sitasi.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleLoadSample}
            disabled={isLoading}
            className="py-2 px-3 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-emerald-200 dark:border-emerald-800"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Muat Contoh Artikel
          </button>

          <label
            htmlFor="analyzer-upload-input"
            className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Unggah Berkas .DOCX
          </label>
          <input
            id="analyzer-upload-input"
            type="file"
            accept=".docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            className="hidden"
          />
        </div>
      </div>

      {/* No document state */}
      {!doc ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center space-y-4">
          <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 w-16 h-16 mx-auto flex items-center justify-center">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
            Belum ada dokumen yang dianalisis
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Unggah berkas Word (.DOCX) artikel ilmiah Anda atau muat contoh artikel untuk melihat pemetaan hierarki struktur akademik secara mendalam.
          </p>
          <button
            type="button"
            onClick={handleLoadSample}
            className="mt-2 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-xs"
          >
            <Sparkles className="w-4 h-4" />
            Coba dengan Naskah Contoh
          </button>
        </div>
      ) : (
        /* Document Analysis Report */
        <div className="space-y-6">
          {/* Top Bar with Action to Format */}
          <div className="p-5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold mb-0.5">
                Dokumen Teranalisis:
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {doc.fileName}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToFormat(doc)}
              className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <span>Lanjut Format Artikel Ini</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] text-slate-500 font-medium">Jumlah Kata</span>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {doc.stats.wordCount.toLocaleString('id-ID')}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{doc.stats.characterCount.toLocaleString('id-ID')} karakter</p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] text-slate-500 font-medium">Paragraf & Bab</span>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {doc.stats.paragraphCount} Pgrf
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{doc.structure.sections.length} Section terdeteksi</p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] text-slate-500 font-medium">Tabel & Gambar</span>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {doc.stats.tableCount} Tab • {doc.stats.imageCount} Gbr
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Semua entitas data utuh</p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] text-slate-500 font-medium">Daftar Pustaka</span>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {doc.stats.referenceCount} Sitasi
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Format referensi akademik</p>
            </div>
          </div>

          {/* Heading Structure Tree */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Pohon Hierarki Struktur Naskah
            </h3>

            <div className="space-y-2">
              {doc.structure.sections.map((sec, idx) => (
                <div
                  key={sec.id || idx}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      H{sec.level}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{sec.heading}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-3">
                    <span>{sec.paragraphs.length} paragraf</span>
                    {sec.tables.length > 0 && <span>{sec.tables.length} tabel</span>}
                    {sec.images.length > 0 && <span>{sec.images.length} gambar</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reference List Preview */}
          {doc.structure.references.length > 0 && (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Daftar Pustaka / Sitasi Terdeteksi ({doc.structure.references.length})
              </h3>
              <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-100 dark:divide-slate-800">
                {doc.structure.references.map((ref, idx) => (
                  <div key={idx} className="pt-2 flex items-start gap-2">
                    <span className="font-mono text-slate-400 shrink-0">[{idx + 1}]</span>
                    <p className="leading-relaxed">{ref}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

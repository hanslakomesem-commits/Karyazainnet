/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TargetDocument, DocxAnalysis } from '../types/skripsi';
import { CheckCircle2, AlertCircle, Clock, MapPin, Tag } from 'lucide-react';

interface StructureInspectorProps {
  analysis: DocxAnalysis | null;
  targets: TargetDocument[];
  anchorKeyword: string;
  onAnchorKeywordChange: (keyword: string) => void;
  onRecheckAnchor: () => void;
  onOpenManualPick?: (target: TargetDocument) => void;
}

export const StructureInspector: React.FC<StructureInspectorProps> = ({
  analysis,
  targets,
  anchorKeyword,
  onAnchorKeywordChange,
  onRecheckAnchor,
  onOpenManualPick,
}) => {
  if (!analysis) return null;

  const signedPages = targets.filter((t) => t.category === 'signed_page');
  const fiveAttachments = targets.filter((t) => t.category === 'attachment_5');

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
              3
            </span>
            Pemeriksaan Struktur Dokumen & Titik Penempatan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Membedakan 3 halaman resmi bertanda tangan dari 5 lampiran yang ditempatkan berurutan di titik kata kunci.
          </p>
        </div>
      </div>

      {/* Anchor Keyword Box */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 rounded-xl border border-blue-200/80 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Tag className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wide">
            Kata Kunci Titik Penempatan 5 Lampiran
          </h3>
        </div>
        <p className="text-[11px] text-blue-900 mb-3">
          Sesuai instruksi Anda, sistem akan mencari kalimat kata kunci ini di file Word, lalu menaruh <strong>5 lampiran secara berurutan</strong> tepat di posisi tersebut lengkap dengan keterangan judul di atas tiap foto:
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={anchorKeyword}
              onChange={(e) => onAnchorKeywordChange(e.target.value)}
              placeholder="Contoh: karyazainnet"
              className="w-full text-xs font-bold text-slate-900 bg-white border border-blue-300 rounded-lg px-3.5 py-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 shadow-2xs font-mono"
            />
          </div>
          <button
            onClick={onRecheckAnchor}
            className="px-3.5 py-2 text-xs font-bold text-blue-700 bg-white hover:bg-blue-100/60 border border-blue-300 rounded-lg transition cursor-pointer shrink-0"
          >
            Cari Kata Kunci
          </button>
        </div>

        {/* Anchor Status Indicator */}
        <div className="mt-3 pt-2.5 border-t border-blue-200/60 flex items-center justify-between text-xs">
          {analysis.anchorKeywordMatch ? (
            <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-[11px]">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Kata kunci ditemukan di <strong>Halaman ~{analysis.anchorKeywordMatch.page}</strong> (Paragraf #{analysis.anchorKeywordMatch.index}):
                <em className="text-slate-600 font-normal ml-1">"{analysis.anchorKeywordMatch.text}"</em>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-800 text-[11px]">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Kalimat kata kunci belum ditemukan di file Word ini. Jika belum ada, sistem dapat menggunakan posisi judul Lampiran di Word atau posisi halaman yang Anda pilih di menu preview.
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: 3 Special Signed Pages (Independen) */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  3 Halaman Resmi Bertanda Tangan (Terpisah)
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                Pengganti Teks
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Masing-masing dicari secara independen dari kata kuncinya (tidak digabungkan ke 5 lampiran). Teks kosong digantikan foto bertanda tangan.
            </p>

            <div className="space-y-2.5">
              {signedPages.map((target) => {
                const isFound = target.elementIndex !== undefined;
                return (
                  <div
                    key={target.id}
                    className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2">
                      {target.hasExistingDrawing ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : isFound ? (
                        <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-semibold text-slate-900 block">{target.title}</span>
                        <span className="text-[11px] text-slate-500">
                          {isFound
                            ? `Ditemukan di Halaman ~${target.estimatedPage}`
                            : 'Belum ditemukan di dokumen'}
                        </span>
                      </div>
                    </div>

                    <div>
                      {target.hasExistingDrawing ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          SUDAH TERPASANG
                        </span>
                      ) : isFound ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            TEKS SIAP DIGANTI
                          </span>
                          {onOpenManualPick && (
                            <button
                              type="button"
                              onClick={() => onOpenManualPick(target)}
                              className="text-[10px] text-slate-500 hover:text-indigo-600 underline cursor-pointer"
                              title="Pilih halaman atau heading lain secara manual jika penempatan kurang tepat"
                            >
                              Ubah
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenManualPick && onOpenManualPick(target)}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 cursor-pointer shadow-xs transition"
                          title="Klik untuk memilih heading atau halaman secara manual"
                        >
                          PILIH MANUAL
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 2: 5 Lampiran Utama */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  5 Lampiran Utama Berurutan
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                Dengan Keterangan Judul
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Diletakkan berurutan di bawah kata kunci anchor. Di atas tiap foto akan diberikan keterangan judul dokumen.
            </p>

            <div className="space-y-2">
              {fiveAttachments.map((target, idx) => {
                const isFound = target.elementIndex !== undefined;
                return (
                  <div
                    key={target.id}
                    className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0 border border-indigo-200">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800 truncate" title={target.title}>
                        {target.title}
                      </span>
                    </div>

                    <span className="text-[10px] font-medium text-slate-500 shrink-0">
                      Keterangan: <strong className="text-slate-700">"{target.captionTitle}"</strong>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

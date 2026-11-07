/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Eye,
  Settings2,
  MapPin,
  Tag,
} from 'lucide-react';
import { ScanFile, TargetDocument, ProcessingOptions, DocxAnalysis } from '../types/skripsi';

interface MappingTableProps {
  targets: TargetDocument[];
  scans: ScanFile[];
  analysis: DocxAnalysis | null;
  options: ProcessingOptions;
  onOptionsChange: (options: ProcessingOptions) => void;
  onAssignTarget: (scanId: string, targetId: string | undefined) => void;
  onOpenPagePreview: (targetId: string) => void;
  onOpenKartuModal: () => void;
  onAutoMapAgain: () => void;
  onStartProcess: () => void;
  isProcessing: boolean;
  onOpenManualPick?: (target: TargetDocument) => void;
}

export const MappingTable: React.FC<MappingTableProps> = ({
  targets,
  scans,
  analysis,
  options,
  onOptionsChange,
  onAssignTarget,
  onOpenPagePreview,
  onOpenKartuModal,
  onAutoMapAgain,
  onStartProcess,
  isProcessing,
  onOpenManualPick,
}) => {
  const scanMap = new Map<string, ScanFile>();
  scans.forEach((s) => scanMap.set(s.id, s));

  const signedPages = targets.filter((t) => t.category === 'signed_page');
  const fiveAttachments = targets.filter((t) => t.category === 'attachment_5');

  const readyCount = targets.filter((t) => t.assignedScanId || t.hasExistingDrawing).length;

  const renderTargetRow = (target: TargetDocument, indexDisplay: string) => {
    const assignedScan = target.assignedScanId ? scanMap.get(target.assignedScanId) : null;
    const isSignedPage = target.category === 'signed_page';
    const isFound = target.elementIndex !== undefined;

    let statusText = 'Belum Ada Scan';
    let statusClass = 'bg-slate-100 text-slate-600 border-slate-200';

    if (target.hasExistingDrawing) {
      statusText = 'Sudah Terpasang (Asli)';
      statusClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (assignedScan) {
      statusText = isSignedPage ? 'Siap (Ganti Teks Asli)' : 'Siap (Tempel Lampiran)';
      statusClass = 'bg-blue-50 text-blue-700 border-blue-200';
    }

    return (
      <tr
        key={target.id}
        className={`hover:bg-slate-50/80 transition ${
          assignedScan ? 'bg-white' : 'bg-slate-50/40'
        }`}
      >
        {/* No */}
        <td className="py-3 px-4 text-center font-bold text-slate-500 text-[11px]">
          {indexDisplay}
        </td>

        {/* Target Title & Caption */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">{target.title}</span>
            {isSignedPage ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold" title="Posisi gambar mengambang di atas teks penuh tanpa mengubah margin asli skripsi">
                In Front of Text
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold" title="Posisi gambar sejajar teks dengan keterangan di atas foto">
                In Line with Text
              </span>
            )}
          </div>
          {!isSignedPage && (
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Keterangan di atas foto: <strong className="text-slate-700 font-medium">"{target.captionTitle}"</strong>
            </span>
          )}
        </td>

        {/* Position in Word */}
        <td className="py-3 px-4">
          {isSignedPage ? (
            isFound ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-800">
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="font-semibold">Halaman ~{target.estimatedPage} (Teks Dicari)</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1 items-start">
                <span className="text-amber-600 text-xs flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Kata Kunci Belum Terdeteksi
                </span>
                {onOpenManualPick && (
                  <button
                    type="button"
                    onClick={() => onOpenManualPick(target)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition cursor-pointer shadow-2xs"
                  >
                    Pilih Posisi Manual
                  </button>
                )}
              </div>
            )
          ) : analysis?.anchorKeywordMatch ? (
            <div className="flex items-center gap-1.5 text-xs text-indigo-800">
              <Tag className="w-3.5 h-3.5 text-indigo-600" />
              <span className="font-semibold">
                Urutan Anchor (Hal ~{analysis.anchorKeywordMatch.page})
              </span>
            </div>
          ) : isFound ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-800">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-semibold">Halaman ~{target.estimatedPage} (Heading Asli)</span>
            </div>
          ) : target.customTargetElementIndex !== undefined ? (
            <div className="flex items-center gap-1.5 text-xs text-indigo-700">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              <span className="font-semibold">Posisi Dipilih Manual</span>
            </div>
          ) : (
            <span className="text-slate-500 text-xs flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Otomatis di Titik Anchor
            </span>
          )}
        </td>

        {/* Scan Selector */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            {assignedScan && (
              <div className="w-8 h-8 rounded-md bg-slate-900 shrink-0 overflow-hidden border border-slate-300">
                <img
                  src={assignedScan.dataUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <select
              value={target.assignedScanId || ''}
              onChange={(e) => {
                const scanId = e.target.value;
                if (scanId) {
                  onAssignTarget(scanId, target.id);
                } else if (assignedScan) {
                  onAssignTarget(assignedScan.id, undefined);
                }
              }}
              className={`w-full text-xs font-semibold rounded-lg px-2.5 py-1.5 border transition cursor-pointer ${
                assignedScan
                  ? 'bg-blue-50/60 border-blue-300 text-blue-900'
                  : 'bg-white border-slate-300 text-slate-600'
              }`}
            >
              <option value="">-- Pilih File Scan --</option>
              {scans.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.width}×{s.height})
                </option>
              ))}
            </select>
          </div>
        </td>

        {/* Status Badge */}
        <td className="py-3 px-4 text-center">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border ${statusClass}`}
          >
            {target.hasExistingDrawing ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            ) : assignedScan ? (
              <CheckCircle2 className="w-3 h-3 text-blue-600" />
            ) : (
              <AlertCircle className="w-3 h-3 text-slate-400" />
            )}
            {statusText}
          </span>
        </td>

        {/* Action: Custom Position Picker */}
        <td className="py-3 px-4 text-center">
          <button
            onClick={() => onOpenPagePreview(target.id)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 cursor-pointer transition"
          >
            <Eye className="w-3 h-3" />
            Preview Halaman
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
              4
            </span>
            Tabel Pemeriksaan & Pemetaan Lampiran
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pemisahan tegas: 3 Halaman Dokumen Resmi Bertanda Tangan & 5 Dokumen Lampiran Berurutan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenKartuModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer transition"
          >
            <Settings2 className="w-3.5 h-3.5 text-blue-600" />
            Format Kartu Bimbingan:
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 font-semibold">
              {options.kartuBimbinganLayout === 'single_page' ? '1 Halaman' : '2 Halaman'}
            </span>
          </button>

          <button
            onClick={onAutoMapAgain}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            Koreksi Pemetaan Otomatis
          </button>
        </div>
      </div>

      {/* Group 1: 3 Special Signed Pages */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Bagian A: 3 Halaman Resmi Bertanda Tangan (Pengganti Teks Kosong)
          </h3>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100/80 text-slate-700 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="py-2.5 px-4 w-12 text-center">No</th>
                <th className="py-2.5 px-4">Target Dokumen</th>
                <th className="py-2.5 px-4">Posisi di Dokumen Word</th>
                <th className="py-2.5 px-4 min-w-[220px]">File Scan Bertanda Tangan</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {signedPages.map((target, idx) => renderTargetRow(target, `A${idx + 1}`))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Group 2: 5 Lampiran Utama */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Bagian B: 5 Dokumen Lampiran Utama (Diletakkan Berurutan di Titik Anchor)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Keterangan judul dicetak otomatis di atas foto
          </span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100/80 text-slate-700 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="py-2.5 px-4 w-12 text-center">Urutan</th>
                <th className="py-2.5 px-4">Target Dokumen & Judul di Atas Foto</th>
                <th className="py-2.5 px-4">Posisi Penempatan</th>
                <th className="py-2.5 px-4 min-w-[220px]">File Foto/Scan</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {fiveAttachments.map((target, idx) => renderTargetRow(target, `B${idx + 1}`))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Execution Footer Bar */}
      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-xs text-slate-600">
          <span>Siap digabungkan: </span>
          <strong className="text-slate-900 font-bold">{readyCount} dari {targets.length}</strong> target dokumen.
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onStartProcess}
            disabled={isProcessing || readyCount === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            {isProcessing ? 'Sedang Memproses DOCX...' : 'Proses Otomatis Penggabungan DOCX'}
          </button>
        </div>
      </div>
    </div>
  );
};

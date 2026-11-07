/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ProcessingOptions, ScanFile, TargetDocument } from '../types/skripsi';
import { X, CheckCircle2, RotateCw, Sparkles, ArrowUpDown, UserCheck, FileSpreadsheet } from 'lucide-react';

interface KartuBimbinganConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: ProcessingOptions;
  onOptionsChange: (options: ProcessingOptions) => void;
  targets: TargetDocument[];
  scans: ScanFile[];
  onSwapKartuScans: () => void;
  onAutoRotateKartu: () => void;
  onRotateSingleScan: (scanId: string) => void;
}

export const KartuBimbinganConfigModal: React.FC<KartuBimbinganConfigModalProps> = ({
  isOpen,
  onClose,
  options,
  onOptionsChange,
  targets,
  scans,
  onSwapKartuScans,
  onAutoRotateKartu,
  onRotateSingleScan,
}) => {
  if (!isOpen) return null;

  const targetDepan = targets.find((t) => t.id === 'kartu_bimbingan_depan');
  const targetBelakang = targets.find((t) => t.id === 'kartu_bimbingan_belakang');

  const scanDepan = scans.find((s) => s.id === targetDepan?.assignedScanId);
  const scanBelakang = scans.find((s) => s.id === targetBelakang?.assignedScanId);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full flex flex-col overflow-hidden shadow-2xl border border-slate-200">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Pengaturan Kartu Bimbingan: Auto-Rotate & Posisi Atas/Bawah
            </h3>
            <p className="text-xs text-slate-500">
              Memastikan posisi halaman depan (identitas mahasiswa) berada di atas dan gambar terputar tegak lurus
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-xs text-slate-700 overflow-y-auto max-h-[75vh]">
          {/* Rule banner */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
            <h4 className="font-bold text-blue-900 mb-1 flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              Aturan Penempatan Kartu Bimbingan
            </h4>
            <div className="space-y-1 text-blue-800 text-[11px] leading-relaxed">
              <p>
                • <strong>Bagian Atas (Halaman Depan)</strong>: Wajib diletakkan di atas, memuat identitas (Nama, NIM, Fakultas, Prodi/Jurusan).
              </p>
              <p>
                • <strong>Bagian Bawah (Halaman Belakang)</strong>: Berada di bawahnya, memuat tabel catatan konsultasi dan paraf pembimbing.
              </p>
            </div>
          </div>

          {/* Quick Auto-Rotate Action */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200">
            <div>
              <span className="font-bold text-indigo-950 block text-xs">
                Auto-Rotate Otomatis Kartu Bimbingan
              </span>
              <span className="text-[11px] text-indigo-800">
                Otomatis memutar foto yang miring/tegak menjadi format horizontal (landscape) agar pas di halaman A4 Word.
              </span>
            </div>
            <button
              onClick={onAutoRotateKartu}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto-Rotate Kartu Sekarang
            </button>
          </div>

          {/* Current Attached Images Preview with Top/Bottom and manual rotate */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Urutan Penempatan Kartu Bimbingan:
              </span>
              {scanDepan && scanBelakang && (
                <button
                  onClick={onSwapKartuScans}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs cursor-pointer shadow-2xs transition"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                  Tukar Posisi (Atas ⇄ Bawah)
                </button>
              )}
            </div>

            {/* Atas (Depan) */}
            <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-16 h-12 bg-slate-900 rounded-lg overflow-hidden border border-slate-300 flex items-center justify-center shrink-0">
                  {scanDepan ? (
                    <img
                      src={scanDepan.dataUrl}
                      alt=""
                      style={{ transform: `rotate(${scanDepan.rotation || 0}deg)` }}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <UserCheck className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                      1. BAGIAN ATAS
                    </span>
                    <span className="font-bold text-slate-900 text-xs">
                      Halaman Depan (Identitas: Nama, NIM, Fakultas, Prodi)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    File: <strong className="text-slate-700">{scanDepan?.name || '(Belum dipilih)'}</strong>
                    {scanDepan && ` (${scanDepan.width}×${scanDepan.height}px)`}
                  </span>
                </div>
              </div>

              {scanDepan && (
                <button
                  onClick={() => onRotateSingleScan(scanDepan.id)}
                  title="Putar gambar 90 derajat"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer self-end sm:self-auto shrink-0"
                >
                  <RotateCw className="w-3.5 h-3.5 text-indigo-600" />
                  Putar 90°
                </button>
              )}
            </div>

            {/* Bawah (Belakang) */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-16 h-12 bg-slate-900 rounded-lg overflow-hidden border border-slate-300 flex items-center justify-center shrink-0">
                  {scanBelakang ? (
                    <img
                      src={scanBelakang.dataUrl}
                      alt=""
                      style={{ transform: `rotate(${scanBelakang.rotation || 0}deg)` }}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <FileSpreadsheet className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                      2. BAGIAN BAWAH
                    </span>
                    <span className="font-bold text-slate-900 text-xs">
                      Halaman Belakang (Tabel Catatan Konsultasi & Paraf)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    File: <strong className="text-slate-700">{scanBelakang?.name || '(Belum dipilih)'}</strong>
                    {scanBelakang && ` (${scanBelakang.width}×${scanBelakang.height}px)`}
                  </span>
                </div>
              </div>

              {scanBelakang && (
                <button
                  onClick={() => onRotateSingleScan(scanBelakang.id)}
                  title="Putar gambar 90 derajat"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer self-end sm:self-auto shrink-0"
                >
                  <RotateCw className="w-3.5 h-3.5 text-indigo-600" />
                  Putar 90°
                </button>
              )}
            </div>
          </div>

          {/* Layout Choice */}
          <div>
            <label className="font-bold text-slate-800 block mb-2">
              Format Tata Letak di Word:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  onOptionsChange({
                    ...options,
                    kartuBimbinganLayout: 'single_page',
                  })
                }
                className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                  options.kartuBimbinganLayout === 'single_page'
                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 text-xs">Satu Halaman (1 Hal)</span>
                  {options.kartuBimbinganLayout === 'single_page' && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Bagian depan di atas & bagian belakang di bawah, disusun vertikal pas pada 1 halaman A4 (seperti contoh SESUDAH.docx).
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  onOptionsChange({
                    ...options,
                    kartuBimbinganLayout: 'separate_pages',
                  })
                }
                className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                  options.kartuBimbinganLayout === 'separate_pages'
                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 text-xs">Dua Halaman Terpisah (2 Hal)</span>
                  {options.kartuBimbinganLayout === 'separate_pages' && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Bagian depan pada 1 halaman penuh, diikuti Page Break, lalu bagian belakang pada halaman berikutnya.
                </p>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
          >
            Terapkan & Selesai
          </button>
        </div>
      </div>
    </div>
  );
};

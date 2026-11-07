/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Database,
  Moon,
  Sun,
  RefreshCw,
  Lock,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { storageService } from '../services/storage';

interface SettingsProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onResetTemplatesToDefault: () => void;
}

export function Settings({
  isDarkMode,
  onToggleDarkMode,
  onResetTemplatesToDefault,
}: SettingsProps) {
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleResetData = async () => {
    if (confirm('Pulihkan seluruh master template jurnal ke konfigurasi awal bawaan sistem?')) {
      onResetTemplatesToDefault();
      setResetMessage('✓ Seluruh template master bawaan telah berhasil dipulihkan.');
      setTimeout(() => setResetMessage(null), 4000);
    }
  };

  const handleClearAllStorage = async () => {
    if (
      confirm(
        'PERINGATAN: Tindakan ini akan menghapus seluruh template kustom dan riwayat pemformatan dari browser Anda. Lanjutkan?'
      )
    ) {
      await storageService.clearHistory();
      onResetTemplatesToDefault();
      setResetMessage('✓ Penyimpanan lokal berhasil dibersihkan.');
      setTimeout(() => setResetMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Pengaturan Sistem & Kebijakan Integritas
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Kelola preferensi antarmuka, keamanan data dokumen, dan penyimpanan lokal aplikasi.
        </p>
      </div>

      {resetMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{resetMessage}</span>
        </div>
      )}

      {/* 1. Academic Integrity Guarantee Statement */}
      <div className="p-6 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-4">
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3>Sertifikat Jaminan: CONTENT LOCKED — FORMAT ONLY</h3>
        </div>
        <p className="text-xs text-emerald-900/90 dark:text-emerald-200 leading-relaxed">
          Aplikasi <strong>TemplateJurnal Manager & Formatter</strong> dibangun dengan komitmen teguh terhadap etika penelitian akademik:
        </p>
        <ul className="text-xs text-emerald-900/80 dark:text-emerald-300/80 space-y-1.5 list-disc pl-5">
          <li><strong>Nol Modifikasi Kata:</strong> Sistem dilarang keras menulis ulang, memparafrasekan, atau meringkas teks Anda.</li>
          <li><strong>Preservasi Data & Angka:</strong> Data empiris, rumus matematika, dan hasil analisis statistik dipertahankan 100% tanpa kompromi.</li>
          <li><strong>Keutuhan Sitasi & Pustaka:</strong> Nama penulis, afiliasi, dan daftar referensi dipindahkan secara presisi sesuai urutan aslinya.</li>
          <li><strong>Audit Kriptografis (SHA-256):</strong> Setiap proses memverifikasi hash teks sumber untuk memastikan selisih kata sama dengan nol (0 diff).</li>
        </ul>
      </div>

      {/* 2. Appearance & Theme */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          {isDarkMode ? <Moon className="w-4 h-4 text-indigo-500" /> : <Sun className="w-4 h-4 text-amber-500" />}
          Tema Tampilan Antarmuka
        </h3>
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
              Mode Gelap (Dark Mode)
            </span>
            <span className="text-slate-500">
              Sesuaikan kontras tampilan untuk kenyamanan membaca di malam hari.
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="py-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isDarkMode ? 'Nonaktifkan (Mode Terang)' : 'Aktifkan (Mode Gelap)'}
          </button>
        </div>
      </div>

      {/* 3. Storage & Master Templates */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-500" />
          Penyimpanan Data Lokal (IndexedDB)
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Seluruh file template, dokumen, dan riwayat disimpan secara lokal di dalam browser Anda (IndexedDB) menggunakan arsitektur privat. Dokumen Anda tidak pernah dikirim ke server eksternal mana pun.
        </p>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleResetData}
            className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Pulihkan Master Template Bawaan
          </button>

          <button
            type="button"
            onClick={handleClearAllStorage}
            className="py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Hapus Seluruh Data Cache Lokal
          </button>
        </div>
      </div>

      {/* 4. Privacy & Disclaimer */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-indigo-500" />
          Batasan Tanggung Jawab & Pedoman Penulis:
        </div>
        <p className="leading-relaxed">
          Sistem hanya melakukan penyesuaian format dan tata letak Microsoft Word (.DOCX). Pengguna tetap bertanggung jawab penuh memastikan kesesuaian naskah akhir dengan <em>Author Guidelines</em> dan gaya selingkung spesifik dari jurnal tujuan yang bersangkutan sebelum melakukan submit di portal OJS.
        </p>
      </div>
    </div>
  );
}

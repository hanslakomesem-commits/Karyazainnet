/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';

interface IntegrityBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtext?: boolean;
}

export function IntegrityBadge({ size = 'md', showSubtext = false }: IntegrityBadgeProps) {
  if (size === 'sm') {
    return (
      <div
        id="badge-integrity-sm"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60"
        title="Jaminan 100% Isi Terkunci: Sistem hanya mengubah format/layout dan tidak pernah menyentuh substansi teks."
      >
        <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        <span>Content Locked • Format Only</span>
      </div>
    );
  }

  if (size === 'lg') {
    return (
      <div
        id="badge-integrity-lg"
        className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800/50 dark:text-emerald-200"
      >
        <div className="p-2.5 rounded-lg bg-emerald-600 text-white shrink-0 shadow-xs">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm tracking-tight text-emerald-950 dark:text-emerald-100">
              Prinsip Integritas Akademik: CONTENT LOCKED — FORMAT ONLY
            </h4>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-800 dark:bg-emerald-800/50 dark:text-emerald-200">
              <CheckCircle2 className="w-3 h-3" /> Terverifikasi
            </span>
          </div>
          <p className="mt-1 text-xs text-emerald-800/90 dark:text-emerald-300/80 leading-relaxed">
            Sistem dilarang keras mengubah kata, kalimat, angka data, nama penulis, afiliasi, abstrak, hasil pembahasan, kesimpulan, tabel, gambar, rumus matematika, maupun daftar pustaka. Seluruh pemrosesan dilakukan 100% lokal pada aspek presentasi dan tata letak Microsoft Word.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      id="badge-integrity-md"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
    >
      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <div>
        <span className="font-semibold">Content Locked</span> — <span className="opacity-90">Format Only</span>
        {showSubtext && (
          <span className="block text-[10px] text-emerald-600 dark:text-emerald-400">
            0% Modifikasi Teks • 100% Preservasi Elemen
          </span>
        )}
      </div>
    </div>
  );
}

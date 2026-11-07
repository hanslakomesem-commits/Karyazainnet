/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Library,
  FileCheck2,
  Clock,
  CheckCircle,
  PlusCircle,
  FileEdit,
  History,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { JournalTemplateConfig } from '../types/template';
import { FormattingHistoryItem } from '../types/history';
import { storageService } from '../services/storage';
import { NavPage } from '../components/Layout/Sidebar';
import { TemplateCard } from '../components/TemplateCard/TemplateCard';
import { IntegrityBadge } from '../components/ValidationPanel/IntegrityBadge';

interface DashboardProps {
  onNavigate: (page: NavPage, data?: any) => void;
  onOpenAddTemplateModal: () => void;
  onSelectTemplateForFormat: (template: JournalTemplateConfig) => void;
}

export function Dashboard({
  onNavigate,
  onOpenAddTemplateModal,
  onSelectTemplateForFormat,
}: DashboardProps) {
  const [templates, setTemplates] = useState<JournalTemplateConfig[]>([]);
  const [history, setHistory] = useState<FormattingHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [tpls, hist] = await Promise.all([
          storageService.getTemplates(),
          storageService.getHistory(),
        ]);
        setTemplates(tpls);
        setHistory(hist);
      } catch (err) {
        console.error('Failed loading dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const totalTemplates = templates.length;
  const totalProcessed = history.length;
  const successfulCount = history.filter((h) => h.status === 'BERHASIL').length;
  const lastTemplateUsed = history.length > 0 ? history[0].templateName : 'Belum Ada';
  const lastProcessedTime = history.length > 0 ? new Date(history[0].processedAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) : '-';

  return (
    <div className="space-y-6">
      {/* Onboarding / Academic Guarantee Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 lg:p-8 shadow-lg">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-200 border border-white/10 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Platform Formatting Akademik Bebas Risiko Perubahan Isi</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight leading-snug mb-3">
            Kelola Template Jurnal & Format Artikel Word Tanpa Mengubah Isi Dokumen
          </h2>
          <p className="text-sm text-indigo-100/90 leading-relaxed mb-6">
            Didesain khusus untuk dosen, mahasiswa, peneliti, dan pengelola jurnal ilmiah. Sistem mengunci 100% teks asli, data angka, formula, tabel, dan sitasi, serta hanya memindahkan tata letak ke format template jurnal tujuan Anda.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-dashboard-start-format"
              type="button"
              onClick={() => onNavigate('format')}
              className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-md shadow-indigo-950/40"
            >
              <FileEdit className="w-4 h-4" />
              Mulai Format Artikel Baru
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              id="btn-dashboard-add-template"
              type="button"
              onClick={onOpenAddTemplateModal}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors flex items-center gap-2 border border-white/20 backdrop-blur-sm"
            >
              <PlusCircle className="w-4 h-4" />
              + Tambah Master Template
            </button>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Primary Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Template */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Template</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Library className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalTemplates}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Master template siap pakai</p>
        </div>

        {/* Total Artikel Diproses */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Artikel Diproses</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalProcessed}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Naskah selesai diformat</p>
        </div>

        {/* Formatting Berhasil */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Integritas 100%</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{successfulCount}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">0 selisih teks terverifikasi</p>
        </div>

        {/* Pemformatan Terakhir */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Aktivitas Terakhir</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{lastTemplateUsed}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{lastProcessedTime}</p>
        </div>
      </div>

      {/* Main Row: Recent Templates + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates Showcase (2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Pilihan Template Jurnal Populer
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih salah satu template di bawah untuk langsung memformat artikel Anda.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('templates')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-1"
            >
              Lihat Semua ({totalTemplates})
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {templates.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-2">
              <Library className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Belum ada template tersimpan</p>
              <p className="text-[11px] text-slate-500">Silakan unggah master template jurnal (.docx) Anda untuk memulai.</p>
              <button
                type="button"
                onClick={onOpenAddTemplateModal}
                className="mt-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" /> + Unggah Master Template
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.slice(0, 2).map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  onSelect={(selected) => onSelectTemplateForFormat(selected)}
                  onEdit={() => onNavigate('templates')}
                />
              ))}
            </div>
          )}

          {/* Academic Integrity Box */}
          <div className="mt-4">
            <IntegrityBadge size="lg" />
          </div>
        </div>

        {/* Recent Activity Sidebar (1 Column) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Aktivitas Terbaru
            </h3>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('history')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Lihat Riwayat
              </button>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            {history.length === 0 ? (
              <div className="text-center py-8 px-4 text-xs text-slate-500 dark:text-slate-400 space-y-2">
                <History className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">Belum ada riwayat formatting</p>
                <p>Mulai dengan mengunggah naskah artikel Anda untuk memformat ke template jurnal.</p>
                <button
                  type="button"
                  onClick={() => onNavigate('format')}
                  className="mt-2 py-1.5 px-3 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 text-xs font-semibold"
                >
                  Format Artikel Sekarang
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                        {item.articleName}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                        {item.status}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] mb-1">
                      Template: {item.templateName}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{new Date(item.processedAt).toLocaleDateString('id-ID')}</span>
                      <span>{item.integrityReport?.metrics?.originalWords || 0} kata (0 selisih)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Notice Box */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800/40 dark:text-amber-200 text-xs">
            <h4 className="font-bold mb-1">Catatan Penting Penulis</h4>
            <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
              Sistem hanya melakukan penyesuaian format dan tata letak dokumen Word. Pengguna tetap bertanggung jawab memastikan hasil akhir sesuai dengan <em>author guidelines</em> jurnal tujuan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

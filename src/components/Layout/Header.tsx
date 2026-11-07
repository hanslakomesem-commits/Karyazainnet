/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Menu, Moon, Sun, PlusCircle, ShieldCheck } from 'lucide-react';
import { NavPage } from './Sidebar';
import { IntegrityBadge } from '../ValidationPanel/IntegrityBadge';

interface HeaderProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  onOpenMobileSidebar: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export function Header({
  currentPage,
  onNavigate,
  onOpenMobileSidebar,
  isDarkMode,
  onToggleDarkMode,
}: HeaderProps) {
  const pageTitles: Record<NavPage, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Dashboard Utama',
      subtitle: 'Ringkasan aktivitas pemformatan dan status repository template jurnal.',
    },
    templates: {
      title: 'Repository Template Jurnal',
      subtitle: 'Kelola master template Word jurnal terakreditasi dan konfigurasi aturan layout.',
    },
    format: {
      title: 'Format Artikel Ilmiah',
      subtitle: 'Sesuaikan naskah Word (.docx) ke layout template jurnal tanpa mengubah isi dokumen.',
    },
    analyze: {
      title: 'Analisis Struktur Dokumen',
      subtitle: 'Periksa kelengkapan elemen artikel: judul, penulis, abstrak, heading, tabel, gambar, dan sitasi.',
    },
    preview: {
      title: 'Preview Dokumen & Komparasi',
      subtitle: 'Periksa hasil tata letak Word berdampingan dengan dokumen sumber asli.',
    },
    history: {
      title: 'Riwayat Pemformatan',
      subtitle: 'Daftar artikel yang telah diproses beserta berkas hasil dan laporan integritasnya.',
    },
    settings: {
      title: 'Pengaturan Sistem',
      subtitle: 'Preferensi tema, sertifikasi kebijakan integritas, dan pengelolaan penyimpanan lokal.',
    },
  };

  const currentInfo = pageTitles[currentPage];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 flex items-center justify-between">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          title="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-sm lg:text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
            {currentInfo.title}
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Integrity Guarantee Badge & Actions */}
      <div className="flex items-center gap-3">
        {/* Academic Content Lock Guarantee Badge */}
        <div className="hidden md:block">
          <IntegrityBadge size="sm" />
        </div>

        {/* Quick Format Action Button */}
        {currentPage !== 'format' && (
          <button
            type="button"
            onClick={() => onNavigate('format')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Format Artikel Baru</span>
            <span className="sm:hidden">Format</span>
          </button>
        )}

        {/* Dark Mode Toggle */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>
    </header>
  );
}

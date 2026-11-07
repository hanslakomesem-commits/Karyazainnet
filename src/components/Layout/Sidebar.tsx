/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  Library,
  FileEdit,
  Search,
  Eye,
  History,
  Settings,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';

export type NavPage = 'dashboard' | 'templates' | 'format' | 'analyze' | 'preview' | 'history' | 'settings';

interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ currentPage, onNavigate, isOpenMobile, onCloseMobile }: SidebarProps) {
  const navItems: Array<{ id: NavPage; label: string; icon: any; badge?: string; url?: string }> = [
    { id: 'dashboard' as NavPage, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'templates' as NavPage, label: 'Repository Template', icon: Library },
    { id: 'format' as NavPage, label: 'Format Artikel', icon: FileEdit, badge: 'Utama' },
    { id: 'analyze' as NavPage, label: 'Analisis Dokumen', icon: Search },
    { id: 'preview' as NavPage, label: 'Preview Dokumen', icon: Eye },
    { id: 'history' as NavPage, label: 'Riwayat Formatting', icon: History },
    { id: 'settings' as NavPage, label: 'Pengaturan', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        id="main-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Logo & Name */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                TemplateJurnal
              </h1>
              <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                Manager & Formatter
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              if (item.url) {
                return (
                  <a
                    key={item.id}
                    id={`nav-link-${item.id}`}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <span>{item.label}</span>
                    </div>
                  </a>
                );
              }

              return (
                <button
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  type="button"
                  onClick={() => {
                    onNavigate(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs dark:bg-indigo-600'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Lock Trust Guarantee Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs">
            <div className="flex items-center gap-2 mb-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>CONTENT LOCKED</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Sistem hanya mengubah format & layout Word. Isi tulisan, angka, dan sitasi 100% terkunci tanpa modifikasi.
            </p>
          </div>
          <div className="mt-3 text-center text-[10px] text-slate-400 dark:text-slate-500">
            Versi 2.4 • Pemrosesan Lokal Browser
          </div>
        </div>
      </aside>
    </>
  );
}

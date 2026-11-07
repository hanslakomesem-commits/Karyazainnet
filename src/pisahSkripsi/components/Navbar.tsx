import React from 'react';
import { FileText, Moon, Sun, Layers, ShieldCheck, Lock, ArrowLeft } from 'lucide-react';

interface NavbarProps {
  activeTab: 'splitter' | 'admin';
  setActiveTab: (tab: 'splitter' | 'admin') => void;
  darkMode: boolean;
  setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  hasFile: boolean;
  isAdminLoggedIn: boolean;
  onOpenAdminLogin: () => void;
  onBackToHome?: () => void;
  isStandalone?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  hasFile,
  isAdminLoggedIn,
  onOpenAdminLogin,
  onBackToHome,
  isStandalone,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-colors duration-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('splitter')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight flex items-center gap-2 tracking-tight">
                ZAIN.NET PISAH PISAH FILE SKRIPSI
                <span className="text-[9px] font-extrabold tracking-wider uppercase bg-blue-600 text-white px-2 py-0.5 rounded-md shadow-xs">
                  15 BAGIAN RESMI
                </span>
              </h1>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Sistem Otomasi Pemisah Naskah & Struktur Skripsi Mahasiswa
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              id="tab-splitter-btn"
              onClick={() => setActiveTab('splitter')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                activeTab === 'splitter'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Pemisah File Skripsi</span>
              {hasFile && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>

            {isAdminLoggedIn ? (
              <button
                id="tab-admin-btn"
                onClick={() => setActiveTab(activeTab === 'admin' ? 'splitter' : 'admin')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Panel Admin</span>
              </button>
            ) : (
              <button
                onClick={onOpenAdminLogin}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Login Admin</span>
              </button>
            )}

            {isStandalone && onBackToHome && (
              <button
                onClick={onBackToHome}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-blue-200 dark:border-blue-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Beranda</span>
              </button>
            )}

            <button
              id="dark-mode-toggle-btn"
              onClick={() => setDarkMode(prev => !prev)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={darkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};


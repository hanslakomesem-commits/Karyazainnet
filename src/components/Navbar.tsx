import React, { useState } from 'react';
import { 
  Search, 
  Star, 
  LogOut, 
  LogIn, 
  User as UserIcon, 
  Sparkles, 
  SlidersHorizontal, 
  X, 
  Crown, 
  Settings, 
  ShieldCheck, 
  MessageCircle,
  Users,
  BarChart3,
  Tag,
  FolderArchive,
  Wallet,
  Menu,
  KeyRound,
  BookOpen,
  UploadCloud,
  Layers,
  Flame,
  Zap,
  FileCheck,
  Receipt,
  GraduationCap
} from 'lucide-react';
import { UserRole, DailyTrafficStat } from '../types';

interface NavbarProps {
  user: { uid: string; email: string | null; displayName?: string | null; photoURL?: string | null } | null;
  isGuest: boolean;
  userRole?: UserRole;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterFavorites: boolean;
  onToggleFilterFavorites: () => void;
  favoritesCount: number;
  documentsCount?: number;
  totalQuota: number;
  totalToolsCount: number;
  pendingVerificationCount?: number;
  walletBalance?: number;
  todayTraffic?: DailyTrafficStat | null;
  currentView?: 'tools' | 'blog' | 'agc_blog' | 'template_jurnal';
  onNavigateView?: (view: 'tools' | 'blog' | 'agc_blog' | 'template_jurnal') => void;
  onOpenBatchUpload?: () => void;
  makalahCount?: number;
  agcPostsCount?: number;
  onOpenAgcAutoPost?: () => void;
  onOpenTopUp?: () => void;
  onSignOut: () => void;
  onOpenLogin: () => void;
  onOpenPinLogin?: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenVerification?: () => void;
  onOpenRoleManagement?: () => void;
  onOpenAnalytics?: () => void;
  onOpenPriceManagement?: () => void;
  onOpenDocumentArchive?: () => void;
  onOpenTrafficStats?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  isGuest,
  userRole = 'public',
  searchQuery,
  onSearchChange,
  filterFavorites,
  onToggleFilterFavorites,
  favoritesCount,
  documentsCount = 0,
  totalQuota,
  totalToolsCount,
  pendingVerificationCount = 0,
  walletBalance = 0,
  todayTraffic,
  currentView = 'tools',
  onNavigateView,
  onOpenBatchUpload,
  makalahCount = 0,
  agcPostsCount = 0,
  onOpenAgcAutoPost,
  onOpenTopUp,
  onSignOut,
  onOpenLogin,
  onOpenPinLogin,
  onOpenProfile,
  onOpenSettings,
  onOpenVerification,
  onOpenRoleManagement,
  onOpenAnalytics,
  onOpenPriceManagement,
  onOpenDocumentArchive,
  onOpenTrafficStats
}) => {
  const isAdmin = userRole === 'admin';
  const isReseller = userRole === 'reseller';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
    <div className="charitize-topbar">
      <strong>ZAIN.NET</strong>
      <span>Layanan akademik & percetakan</span>
      <a href="https://wa.me/6285231176597" target="_blank" rel="noopener noreferrer">Bantuan WhatsApp: 0852 3117 6597</a>
    </div>
    <header className="charitize-navbar sticky top-0 z-40 px-4 lg:px-8 py-3 flex items-center justify-between">
      
      {/* Left: Brand Logo & Title */}
      <div 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="flex items-center space-x-3 cursor-pointer shrink-0"
      >
        <div className="bg-indigo-600 text-white font-black text-xl w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/40 shrink-0">
          Z
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-base tracking-wider leading-tight text-white">
              ZAIN.NET
            </h1>
            {isAdmin && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Crown className="w-2.5 h-2.5 text-amber-400" />
                <span>ADMIN</span>
              </span>
            )}
            {isReseller && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                <span>RESELLER</span>
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-400 font-medium">
            Modul Academic Premium
          </p>
        </div>
      </div>

      {/* Center: Navigation Menu Links (Desktop) */}
      <nav className="hidden md:flex items-center space-x-3 text-xs text-gray-300 font-medium">
        
        {/* Main View Switcher: Modul Tools & Template Jurnal */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-2xl border border-gray-800 mr-1 shadow-inner">
          <button 
            onClick={() => onNavigateView?.('tools')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              currentView === 'tools'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Modul Skripsi</span>
          </button>

          {/* Template Artikel (TemplateJurnal Manager & Formatter) */}
          <button
            onClick={() => onNavigateView?.('template_jurnal')}
            title="TemplateJurnal Manager & Formatter - Pengelolaan Master Template & Format Naskah Otomatis"
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              currentView === 'template_jurnal'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Template Artikel</span>
          </button>
        </div>

        {/* Nota Jilid - Pembuat Nota Cetak & Kasir Otomatis */}
        <a
          href="/notajilid"
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState(null, '', '/notajilid');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          title="Pembuat Nota Jilid & Hardcover Otomatis (Akses Publik /notajilid)"
          className="transition-all cursor-pointer flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 shadow-sm"
        >
          <Receipt className="w-3.5 h-3.5 text-emerald-400" />
          <span>Nota Jilid</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-200 text-[10px]">
            V8
          </span>
        </a>

        {/* Sewa Toga - Reservasi & Booking Toga Wisuda Online */}
        <a
          href="/sewatoga"
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState(null, '', '/sewatoga');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          title="Penyewaan Toga Wisuda ZAIN.NET (Akses Publik /sewatoga)"
          className="transition-all cursor-pointer flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold hover:text-purple-300 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/40 text-purple-300 shadow-sm"
        >
          <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
          <span>Sewa Toga</span>
          <span className="px-1.5 py-0.2 rounded-full bg-purple-500/30 text-purple-200 text-[10px]">
            Wisuda
          </span>
        </a>

        {/* Blog & Portal Artikel Hub (Direct sleek link to Blog Makalah / AGC) */}
        <button
          onClick={() => onNavigateView?.('blog')}
          title="Buka Portal Blog Makalah & Publikasi"
          className={`hover:text-blue-300 transition-colors cursor-pointer flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl ${
            currentView === 'blog' || currentView === 'agc_blog'
              ? 'text-blue-300 bg-blue-950/40 border border-blue-500/30'
              : 'text-gray-300'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
          <span>Blog & Artikel</span>
          {makalahCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-blue-500/30 text-blue-200 text-[10px]">
              {makalahCount}
            </span>
          )}
        </button>

        <button 
          onClick={() => {
            if (currentView !== 'tools') onNavigateView?.('tools');
            setTimeout(() => {
              const el = document.getElementById('panduan-pembayaran');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
          className="hover:text-indigo-400 transition-colors cursor-pointer"
        >
          Cara Beli
        </button>
        <button 
          onClick={onOpenProfile}
          className="hover:text-indigo-400 transition-colors cursor-pointer"
        >
          Status & Kuota
        </button>
        {onOpenDocumentArchive && (
          <button 
            onClick={onOpenDocumentArchive}
            className="hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>Riwayat</span>
            {documentsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/30 text-indigo-300 text-[10px]">
                {documentsCount}
              </span>
            )}
          </button>
        )}
        {isAdmin && onOpenTrafficStats && (
          <button
            onClick={onOpenTrafficStats}
            title="Lihat Statistik Kunjungan Web & Trafik Harian"
            className="hover:text-blue-300 transition-all cursor-pointer flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-blue-950/40 hover:bg-blue-900/50 border border-blue-500/30 text-xs font-semibold text-blue-200"
          >
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
            <span>Statistik Web</span>
            {todayTraffic && (
              <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {todayTraffic.pageViews} PV • {todayTraffic.uniqueUsersCount} User
              </span>
            )}
          </button>
        )}
        {isAdmin && onOpenRoleManagement && (
          <button
            onClick={onOpenRoleManagement}
            title="Kelola & Buat Akun Reseller (Diskon 50% Otomatis)"
            className="hover:text-purple-300 transition-all cursor-pointer flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/40 text-xs font-semibold text-purple-200"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Akun Reseller 50%</span>
          </button>
        )}
        <a 
          href="https://wa.me/6285231176597"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1 text-gray-300"
        >
          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Bantuan</span>
        </a>
      </nav>

      {/* Right: Search, Notifications & User Account */}
      <div className="flex items-center space-x-3">
        
        {/* Search Input Box */}
        <div className="relative w-32 sm:w-44 hidden sm:block">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari modul..."
            className="w-full pl-8 pr-7 py-1.5 bg-[#090e1a] border border-gray-800 focus:border-indigo-500 rounded-xl text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-800 text-gray-400"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Admin Verification Badge */}
        {isAdmin && onOpenVerification && (
          <button
            onClick={onOpenVerification}
            title="Verifikasi Pembayaran"
            className="p-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 relative hover:bg-amber-500/30 transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            {pendingVerificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] flex items-center justify-center animate-bounce">
                {pendingVerificationCount}
              </span>
            )}
          </button>
        )}

        {/* User Profile Avatar / Login Button */}
        {user ? (
          <div className="flex items-center gap-2">
            <div 
              onClick={onOpenProfile}
              title={user.displayName || user.email || 'Akun Pengguna'}
              className="flex items-center gap-2 cursor-pointer p-1 rounded-xl hover:bg-slate-800/60 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center p-0.5 shadow-md">
                <div className="w-full h-full bg-[#070b14] rounded-full flex items-center justify-center overflow-hidden">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="User Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-3.5 h-3.5 text-indigo-300" />
                  )}
                </div>
              </div>
              {totalQuota > 0 && (
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black">
                  {totalQuota}x
                </span>
              )}
            </div>

            {/* Tombol Keluar Akun */}
            <button
              onClick={onSignOut}
              title={`Keluar dari Akun (${user.email || ''})`}
              className="px-2.5 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 hover:text-white border border-red-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {onOpenPinLogin && (
              <button
                onClick={onOpenPinLogin}
                title="Masuk Cepat PIN Admin"
                className="p-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span className="hidden sm:inline-block text-[11px]">PIN Admin</span>
              </button>
            )}
            <button
              onClick={onOpenLogin}
              className="bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 cursor-pointer transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk / Daftar</span>
            </button>
          </div>
        )}

        {/* Mobile Menu Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg bg-[#090e1a] border border-gray-800 text-gray-300 md:hidden hover:bg-gray-800"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-[#070b14] border-b border-gray-800/80 p-4 md:hidden shadow-2xl flex flex-col space-y-3 animate-in fade-in slide-in-from-top-2">
          {/* User Status in Mobile Menu */}
          {user && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-white block truncate">
                  {user.displayName || user.email}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {userRole === 'admin' ? 'Administrator' : userRole === 'reseller' ? 'Partner Reseller' : 'User Umum'}
                </span>
              </div>
              <button
                onClick={() => {
                  onOpenProfile();
                  setMobileMenuOpen(false);
                }}
                className="px-2 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold shrink-0 ml-2"
              >
                Lihat Kuota
              </button>
            </div>
          )}

          {/* Mobile View Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-gray-800">
            <button
              onClick={() => {
                onNavigateView?.('tools');
                setMobileMenuOpen(false);
              }}
              className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 ${
                currentView === 'tools'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Modul Skripsi</span>
            </button>
            <button
              onClick={() => {
                onNavigateView?.('blog');
                setMobileMenuOpen(false);
              }}
              className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 ${
                currentView === 'blog'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Blog Makalah</span>
              {makalahCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-500/30 text-blue-200 text-[10px]">
                  {makalahCount}
                </span>
              )}
            </button>
          </div>

          <nav className="flex flex-col space-y-2 text-sm text-gray-300">
            <button 
              onClick={() => {
                onNavigateView?.('tools');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setMobileMenuOpen(false);
              }}
              className="text-left py-1.5 px-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Modul Skripsi</span>
            </button>
            <button 
              onClick={() => {
                onNavigateView?.('template_jurnal');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1.5 px-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-between text-indigo-300 font-semibold"
            >
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-indigo-400" />
                <span>Template Artikel (Jurnal Formatter)</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                SINTA/Scopus
              </span>
            </button>
            <a
              href="/notajilid"
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                window.history.pushState(null, '', '/notajilid');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="text-left py-1.5 px-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-between text-emerald-300 font-semibold"
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>Nota Jilid & Hardcover Otomatis</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                V8
              </span>
            </a>
            <a
              href="/sewatoga"
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                window.history.pushState(null, '', '/sewatoga');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="text-left py-1.5 px-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-between text-purple-300 font-semibold"
            >
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-purple-400" />
                <span>Penyewaan Toga Wisuda Online</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Wisuda
              </span>
            </a>
            <button 
              onClick={() => {
                onNavigateView?.('blog');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1.5 px-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-between text-blue-300 font-semibold"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span>Portal Blog & Artikel (Makalah & AGC)</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Hub
              </span>
            </button>
            <button 
              onClick={() => {
                const el = document.getElementById('panduan-pembayaran');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                setMobileMenuOpen(false);
              }}
              className="text-left py-1.5 px-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cara Beli
            </button>
            <button 
              onClick={() => {
                onOpenProfile();
                setMobileMenuOpen(false);
              }}
              className="text-left py-1.5 px-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Status & Kuota
            </button>
            {onOpenDocumentArchive && (
              <button 
                onClick={() => {
                  onOpenDocumentArchive();
                  setMobileMenuOpen(false);
                }}
                className="text-left py-1.5 px-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-between"
              >
                <span>Riwayat Naskah</span>
                {documentsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 text-[10px]">
                    {documentsCount}
                  </span>
                )}
              </button>
            )}
            {isAdmin && onOpenTrafficStats && (
              <button
                onClick={() => {
                  onOpenTrafficStats();
                  setMobileMenuOpen(false);
                }}
                className="text-left py-1.5 px-2 rounded-lg hover:bg-slate-800 transition-colors text-blue-300 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  <span>Statistik & Trafik Web</span>
                </div>
                {todayTraffic && (
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold">
                    {todayTraffic.pageViews} PV • {todayTraffic.uniqueUsersCount} User
                  </span>
                )}
              </button>
            )}
            {isAdmin && onOpenRoleManagement && (
              <button
                onClick={() => {
                  onOpenRoleManagement();
                  setMobileMenuOpen(false);
                }}
                className="text-left py-1.5 px-2 rounded-lg hover:bg-slate-800 transition-colors text-purple-300 flex items-center gap-2 font-bold"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Akun Reseller (Diskon 50%)</span>
              </button>
            )}
            <a 
              href="https://wa.me/6285231176597"
              target="_blank"
              rel="noopener noreferrer"
              className="text-left py-1.5 px-2 rounded-lg hover:bg-slate-800 transition-colors text-emerald-400 flex items-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Hubungi CS WhatsApp (085231176597)</span>
            </a>
          </nav>

          {/* Action Log Out or Log In in Mobile Menu */}
          <div className="pt-2 border-t border-slate-800">
            {user ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSignOut();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span>Keluar Akun ({user.email})</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLogin();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk / Daftar Akun</span>
              </button>
            )}
          </div>
        </div>
      )}

    </header>
    </>
  );
};

import React from 'react';
import { 
  Flame, 
  BookOpen, 
  UploadCloud, 
  Zap, 
  SlidersHorizontal, 
  ExternalLink,
  Sparkles,
  FileText,
  FileCheck,
  Receipt,
  Layers,
  ChevronRight
} from 'lucide-react';

interface FooterProps {
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
  // Navigation & Publishing Hub props
  onNavigateView?: (view: 'tools' | 'blog' | 'agc_blog' | 'template_jurnal') => void;
  onOpenBatchUpload?: () => void;
  onOpenAgcAutoPost?: () => void;
  onOpenMakalahAdmin?: () => void;
  isAdmin?: boolean;
  makalahCount?: number;
  agcPostsCount?: number;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenPrivacy,
  onOpenTerms,
  onNavigateView,
  onOpenBatchUpload,
  onOpenAgcAutoPost,
  onOpenMakalahAdmin,
  isAdmin = false,
  makalahCount = 0,
  agcPostsCount = 0,
}) => {
  return (
    <footer className="border-t border-gray-800/80 bg-[#070b14] text-xs text-gray-400 mt-auto overflow-hidden">
      {/* Dedicated Clean Sub-Hub: Hub Publikasi & Content Engine (Blog, AGC, Blogspot, Batch Post) */}
      <div className="border-b border-gray-800/60 bg-gradient-to-b from-slate-950/80 to-[#070b14]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Column 1: Brand & Description */}
            <div className="md:col-span-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-black text-base flex items-center justify-center shadow-md shadow-indigo-600/30">
                  Z
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white tracking-wide">ZAIN.NET</h4>
                  <p className="text-[10px] text-gray-400">Ekosistem Otomasi Akademik & Portal Artikel</p>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed pr-2">
                Platform terpadu pemrosesan skripsi, format jurnal ilmiah SINTA/Scopus, serta generator artikel otomatis dengan standar kurasi konten cerdas.
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-gray-300 font-medium">Layanan Online Aktif 24/7</span>
              </div>
            </div>

            {/* Column 2: Blog & AGC Network */}
            <div className="md:col-span-4 space-y-3">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs uppercase tracking-wider">
                <Flame className="w-4 h-4 text-amber-400 fill-current" />
                <span>Portal Blog & AGC Network</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Akses arsip bacaan, portal berita viral otomatis (AGC), dan repositori makalah terstruktur:
              </p>
              <div className="space-y-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onNavigateView?.('agc_blog');
                    if (typeof window !== 'undefined' && window.history.pushState) {
                      window.history.pushState({}, '', '/agc');
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-amber-950/30 hover:bg-amber-900/40 border border-amber-500/20 text-amber-200 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5 text-amber-400 fill-current" />
                    <div>
                      <span className="font-bold text-xs text-white group-hover:text-amber-300">Blog AGC (Berita Viral)</span>
                      <p className="text-[10px] text-amber-300/70">Generator tren otomatis harian</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                    {agcPostsCount > 0 ? `${agcPostsCount} Post` : 'Aktif'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onNavigateView?.('blog');
                    if (typeof window !== 'undefined' && window.history.pushState) {
                      window.history.pushState({}, '', '/blog');
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-blue-950/30 hover:bg-blue-900/40 border border-blue-500/20 text-blue-200 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                    <div>
                      <span className="font-bold text-xs text-white group-hover:text-blue-300">Blog Makalah Mahasiswa</span>
                      <p className="text-[10px] text-blue-300/70">Repositori karya tulis & referensi</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono font-bold">
                    {makalahCount > 0 ? `${makalahCount} Post` : 'Arsip'}
                  </span>
                </button>
              </div>
            </div>

            {/* Column 3: Content Publishing Engine (Admin / Creator Tools) */}
            <div className="md:col-span-4 space-y-3">
              <div className="flex items-center gap-1.5 text-indigo-300 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Panel Generator & Publikasi</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Kelola naskah, otomatisasi posting harian, dan sinkronisasi artikel:
              </p>

              <div className="space-y-1.5 pt-1">
                {/* Auto Post AGC Action */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenAgcAutoPost) {
                      onOpenAgcAutoPost();
                    } else {
                      onNavigateView?.('agc_blog');
                    }
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-gray-200 hover:text-white transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
                    <span className="font-semibold text-xs text-slate-200 group-hover:text-amber-300">⚡ Auto Post AGC Viral</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Batch Post Word Action */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenBatchUpload) {
                      onOpenBatchUpload();
                    } else {
                      onNavigateView?.('blog');
                    }
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-gray-200 hover:text-white transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-semibold text-xs text-slate-200 group-hover:text-blue-300">+ Batch Post Word (.docx)</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Panel Blogspot / CMS Makalah */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenMakalahAdmin) {
                      onOpenMakalahAdmin();
                    } else {
                      onNavigateView?.('blog');
                    }
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-gray-200 hover:text-white transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
                    <span className="font-semibold text-xs text-slate-200 group-hover:text-purple-300">Panel Kelola Blogspot & Makalah</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Bottom Legal & Copyright Bar */}
      <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-gray-500">
        <div>
          <p className="text-gray-400 font-medium">© 2026 ZAIN.NET — Skripsi, Artikel Ilmiah & Makalah</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Platform otomatisasi tugas akhir mahasiswa • CS WA: 0852-3117-6597</p>
          <p className="text-[10px] text-gray-400 mt-1">Tampilan berdasarkan Charitize. Designed by <a href="https://htmlcodex.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-300">HTML Codex</a>.</p>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-gray-400">
          <button
            type="button"
            onClick={() => {
              onNavigateView?.('tools');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="hover:text-indigo-400 transition-colors cursor-pointer"
          >
            Modul Skripsi
          </button>
          <a
            href="/notajilid"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState(null, '', '/notajilid');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="hover:text-emerald-400 transition-colors cursor-pointer"
          >
            Nota Jilid
          </a>
          <a
            href="/sewatoga"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState(null, '', '/sewatoga');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="hover:text-purple-400 transition-colors cursor-pointer"
          >
            Sewa Toga
          </a>
          {onOpenTerms && (
            <button
              type="button"
              onClick={onOpenTerms}
              className="hover:text-gray-300 transition-colors cursor-pointer"
            >
              Syarat & Ketentuan
            </button>
          )}
          {onOpenPrivacy && (
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="hover:text-gray-300 transition-colors cursor-pointer"
            >
              Kebijakan Privasi
            </button>
          )}
        </div>
      </div>
    </footer>
  );
};

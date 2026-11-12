import { appUrl } from '../utils/deploymentBridge';
import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  RotateCw, 
  Maximize2, 
  Minimize2, 
  Home,
  BookOpen,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface HardCoverViewProps {
  onBackToHome?: () => void;
  isStandalone?: boolean;
}

export const HardCoverView: React.FC<HardCoverViewProps> = ({ 
  onBackToHome,
  isStandalone = true 
}) => {
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const iframeSrc = 'https://hanslakomesem-commits.github.io/Edit-Hard-Cover/';

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen?.().catch((err) => {
        console.warn('Exit fullscreen failed:', err);
      });
    }
  };

  const handleReload = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const handleNavigateHome = () => {
    if (onBackToHome) {
      onBackToHome();
    } else {
      window.history.pushState(null, '', '/');
      window.location.href = appUrl('/');
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-50 flex flex-col bg-[#07111f] text-slate-100 overflow-hidden font-sans select-none"
    >
      {/* Top Navigation Control Bar */}
      <header className="h-14 bg-slate-900/95 border-b border-slate-800/80 px-4 flex items-center justify-between gap-3 shrink-0 shadow-lg backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleNavigateHome}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white text-xs font-bold transition-all border border-slate-700/60 shadow-sm cursor-pointer"
            title="Kembali ke Dashboard ZAIN.NET"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Kembali ke Menu Utama</span>
            <Home className="w-3.5 h-3.5 sm:hidden" />
          </button>

          <div className="h-4 w-px bg-slate-700/80 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-extrabold text-white tracking-tight">
                  Menu No 12: Edit Hard Cover Skripsi
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold hidden md:inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  V4.10 • Hard Cover Studio
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                ZAIN.NET Cover V4.10 • Presisi 10–28 mm • Polos & Warna • Ekspor Batch Siap Cetak
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReload}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60 cursor-pointer"
            title="Muat Ulang Aplikasi"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60 cursor-pointer"
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Embedded Hard Cover Web Application */}
      <main className="flex-1 w-full h-[calc(100vh-3.5rem)] relative bg-[#0f467e]/20 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#07111f] text-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-xl shadow-amber-500/20 animate-pulse mb-4">
              <BookOpen className="w-7 h-7" />
            </div>
            <p className="text-base font-bold text-white tracking-wide">
              Menyiapkan ZAIN.NET Cover Studio V4.10...
            </p>
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              Memuat sistem generator presisi 10–28 mm...
            </p>
          </div>
        )}

        <iframe
          key={iframeKey}
          id="hardcover-app-frame"
          src={iframeSrc}
          title="ZAIN.NET Cover Skripsi Presisi V4.2"
          className="w-full h-full border-0 bg-slate-900"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; camera; microphone; print"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
        />
      </main>
    </div>
  );
};

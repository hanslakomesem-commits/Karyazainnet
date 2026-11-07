import { backendUrl } from '../utils/deploymentBridge';
import { appUrl } from '../utils/deploymentBridge';
import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  RotateCw, 
  Maximize2, 
  Minimize2, 
  Home
} from 'lucide-react';

interface NotaJilidViewProps {
  onBackToHome?: () => void;
}

export const NotaJilidView: React.FC<NotaJilidViewProps> = ({ onBackToHome }) => {
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [embedMode, setEmbedMode] = useState<'proxy' | 'direct'>('proxy');
  const containerRef = useRef<HTMLDivElement>(null);

  // Target direct URL and internal proxy URL
  const DIRECT_URL = 'https://zainnet-nota-v8.pages.dev/?utm_source=chatgpt.com';
  const PROXY_URL = '/proxy-notajilid?utm_source=chatgpt.com';
  const iframeSrc = embedMode === 'proxy' ? backendUrl(PROXY_URL) : DIRECT_URL;

  // Listen to fullscreen change
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
      className="fixed inset-0 z-50 w-screen h-screen bg-slate-950 overflow-hidden select-none flex flex-col"
    >
      {/* Discreet floating action controls without revealing external domain/iframe branding */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 pointer-events-auto">
        <button
          onClick={handleReload}
          title="Segarkan halaman"
          aria-label="Segarkan halaman"
          className="w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white backdrop-blur-md border border-white/10 shadow-lg flex items-center justify-center transition-all cursor-pointer opacity-70 hover:opacity-100"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
        </button>

        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Keluar layar penuh" : "Layar penuh"}
          aria-label="Layar penuh"
          className="w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white backdrop-blur-md border border-white/10 shadow-lg flex items-center justify-center transition-all cursor-pointer opacity-70 hover:opacity-100 hidden sm:flex"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={handleNavigateHome}
          title="Kembali ke Beranda"
          aria-label="Kembali ke Beranda"
          className="h-8 px-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white backdrop-blur-md border border-white/10 shadow-lg flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer opacity-80 hover:opacity-100"
        >
          <Home className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden xs:inline">Beranda</span>
        </button>
      </div>

      {/* Full native content viewport */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-white">
        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-20 transition-opacity">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/30 animate-pulse mb-3">
              <span className="text-2xl font-black text-white">Z</span>
            </div>
            <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <RotateCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
              <span>Memuat Formulir Nota Otomatis...</span>
            </p>
          </div>
        )}

        {/* Embedded Content */}
        <iframe
          key={`${iframeKey}-${embedMode}`}
          id="notajilid-embed-frame"
          src={iframeSrc}
          title="Nota Otomatis ZAIN.NET"
          className="w-full h-full border-0 bg-white"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; camera; microphone; print"
          allowFullScreen
          onLoad={() => {
            setIsLoading(false);
          }}
          onError={() => {
            setIsLoading(false);
            if (embedMode === 'proxy') {
              setEmbedMode('direct');
            }
          }}
        />
      </div>
    </div>
  );
};

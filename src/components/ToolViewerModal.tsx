import React, { useState, useEffect, useRef } from 'react';
import { X, Maximize2, Lock, ShieldCheck, RefreshCw } from 'lucide-react';
import { ToolItem, UserRole, ToolMaintenanceItem, AppUser, UserActivityLogEntry } from '../types';
import { recordSessionInProgress, recordSessionCompleted, getSessionForTool } from '../utils/sessionTracker';
import { isIframeTool } from '../data/toolsData';
import { SkripsiPaginatorView } from './SkripsiPaginatorView';
import { SkripsiPaginatorFixedView } from './SkripsiPaginatorFixedView';
import { PhotoGridView } from '../photoGrid/PhotoGridView';
import { Label103View } from '../label103/Label103View';
import GabungFileApp from '../gabungFile/App';
import { NotaJilidView } from './NotaJilidView';
import { SewaTogaView } from './SewaTogaView';
import { ArtikelGeminiView } from './ArtikelGeminiView';
import JournalConverterApp from '../journalConverter/App';
import PisahSkripsiApp from '../pisahSkripsi/App';

interface ToolViewerModalProps {
  tool: ToolItem | null;
  quota?: number;
  resellerTrialRemaining?: number;
  userRole?: UserRole;
  user?: AppUser | null;
  userId?: string;
  maintenanceInfo?: ToolMaintenanceItem;
  onClose: () => void;
  onFinishCreation?: (tool: ToolItem, details?: string) => void | Promise<void>;
  onNotifyUnfinished?: (tool: ToolItem) => void;
}


export const ToolViewerModal: React.FC<ToolViewerModalProps> = ({tool,userRole='public',userId,user,onClose,onFinishCreation}) => {
  const effectiveUserId = userId || user?.uid || 'guest';
  const isAdmin = userRole === 'admin';
  const [isLoading,setIsLoading] = useState(false);
  const [status,setStatus] = useState('Proses belum selesai. Status dicatat otomatis saat hasil siap.');
  const [completed,setCompleted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  const finishRef = useRef(onFinishCreation);
  finishRef.current = onFinishCreation;
  const iframeKey = tool?.id;
  const addLog = (_type: string,_message: string) => {};
  useEffect(() => {
    if (!tool) return;
    done.current=false; setCompleted(false);
    recordSessionInProgress(tool,effectiveUserId,[],0,0,'Modul dibuka. Menunggu hasil proses.');
    const sync = (event: Event) => {
      const detail=(event as CustomEvent).detail;
      if (!done.current) return;
      setStatus(detail?.ok ? 'Selesai — status tersimpan di akun.' : `Hasil siap; penyimpanan akun tertunda. ${detail?.message || 'Akan dicoba ulang otomatis.'}`);
    };
    window.addEventListener('zain_sync_status',sync);
    return () => window.removeEventListener('zain_sync_status',sync);
  },[tool?.id,effectiveUserId]);
  // ZAINNET_LINK7_SAFE_CLOSE_PARENT_20261109
  // Generation completion is NOT a download completion signal.
  const handleLink7GenerationReady = (fileName: string) => {
    if (!tool || done.current) return;
    done.current = true;
    setStatus('Artikel selesai. Menyiapkan 2 file Word. Modul tetap terbuka sampai keduanya dikonfirmasi terunduh.');
    recordSessionCompleted(tool, effectiveUserId, { fileName, reason: 'Artikel Link 7 selesai dibuat' }, [], 0);
    Promise.resolve(finishRef.current?.(tool, 'Artikel Link 7 selesai dibuat')).catch((err) => {
      setStatus('Artikel selesai, tetapi pencatatan kuota tertunda: ' + (err?.message || 'Periksa akun.'));
    });
  };
  const handleLink7DownloadsConfirmed = () => {
    if (!done.current) return;
    setStatus('Dua file Word dikonfirmasi terunduh. Kembali ke menu utama...');
    setCompleted(true);
    setTimeout(() => onClose(), 1200);
  };
  const isLink7 = tool?.id === 'art-7' || tool?.url === 'internal://journal-converter' || tool?.url === '/journal-converter';
  const handleAutoFinishDownload = (fileName: string, reason: string) => {
    if (!tool || done.current) return;
    done.current = true;
    setCompleted(true);
    setStatus('Hasil siap — transaksi dinyatakan selesai & mengamankan sesi…');
    recordSessionCompleted(tool, effectiveUserId, { fileName, reason }, [], 0);
    Promise.resolve(finishRef.current?.(tool, reason)).then(() => {
      setStatus(isAdmin ? 'Selesai — hasil berhasil dibuat.' : 'Selesai — transaksi selesai & kuota berhasil digunakan.');
    }).catch((e) => setStatus(`Hasil siap; penyimpanan akun tertunda. ${e.message}`));

    // Untuk SEMUA menu dengan link biasa / modul in-app:
    // Setelah proses download selesai, aplikasi langsung kembali otomatis ke halaman utama (home)
    // dan transaksi dinyatakan selesai agar tidak bisa dimanfaatkan kembali oleh oknum nakal.
    setStatus('File berhasil diunduh! Transaksi dinyatakan selesai. Mengalihkan kembali ke halaman utama ZAIN.NET…');
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      onClose();
    }, 1500);
  };
  useEffect(() => {
    const onMessage=(event: MessageEvent) => {
      const frame=containerRef.current?.querySelector('iframe');
      if (!frame || event.source!==frame.contentWindow) return;
      if (event.origin!==new URL(frame.src,location.href).origin) return;
      if (event.data?.type==='ZAINNET_GENERATION_COMPLETE' && event.data.success===true)
        handleAutoFinishDownload(String(event.data.fileName || 'Dokumen'),'Sinyal hasil berhasil dari modul');
    };
    window.addEventListener('message',onMessage);
    return () => window.removeEventListener('message',onMessage);
  },[tool?.id,effectiveUserId]);
  if (!tool) return null;
  if (isIframeTool(tool) && !isAdmin) return <div className="fixed inset-0 z-50 bg-slate-950 text-white p-10">Modul iframe khusus admin. <button onClick={onClose}>Kembali</button></div>;
  if (tool.id==='nota-1') return <NotaJilidView onBackToHome={onClose} />;
  if (tool.id==='toga-1') return <SewaTogaView onBackToHome={onClose} />;
  return <div ref={containerRef} className="fixed inset-0 z-50 bg-slate-950 flex flex-col text-white">
    {completed && (
      <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Transaksi Dinyatakan Selesai</h2>
        <p className="text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
          File dokumen berhasil diunduh. Transaksi Anda telah dinyatakan selesai dan sesi ditutup untuk melindungi keamanan akun Anda. Mengalihkan kembali ke halaman utama...
        </p>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/80 px-4 py-2.5 rounded-xl border border-emerald-800">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Mengalihkan ke Beranda ZAIN.NET...</span>
        </div>
      </div>
    )}
    <header className="p-3 flex items-center gap-3 border-b border-slate-700">
      <div className="flex-1"><strong>{tool.title}</strong><p role="status" className="text-xs mt-1 text-slate-300">{status}</p></div>
      <button title="Layar penuh" onClick={() => containerRef.current?.requestFullscreen?.()}><Maximize2 size={20}/></button>
      <button aria-label="Kembali ke menu" onClick={() => {
        if (isLink7 && done.current) {
          setStatus('Periksa kedua unduhan Word terlebih dahulu dan tekan tombol konfirmasi di bawah hasil artikel.');
          return;
        }
        onClose();
      }}><X size={24}/></button>
    </header>
    <div className="flex-1 min-h-0 overflow-auto">
{tool.id === 'num-2' ||
        tool.id === 'num-3' ||
        tool.url === 'internal://skripsi-paginator' ||
        tool.url === 'internal://skripsi-paginator-fixed' ? (
          <div key={iframeKey} className="w-full h-full overflow-y-auto bg-slate-50">
            <SkripsiPaginatorFixedView
              onCorrectionComplete={(outFileName) => {
                handleAutoFinishDownload(
                  outFileName,
                  'Koreksi & validasi penomoran halaman Word (.docx) + TOC selesai'
                );
              }}
            />
          </div>
        ) : tool.id === 'foto-1' || tool.url === 'internal://docx-photo-grid' ? (
          <div key={iframeKey} className="w-full h-full overflow-y-auto bg-neutral-100">
            <PhotoGridView
              onExportComplete={(outFileName) => {
                handleAutoFinishDownload(
                  outFileName,
                  'Edit foto & ekspor kisi foto Word (.docx) selesai'
                );
              }}
            />
          </div>
        ) : tool.id === 'label-103' || tool.url === 'internal://label-103' ? (
          <div key={iframeKey} className="w-full h-full overflow-y-auto bg-slate-50">
            <Label103View
              onExportComplete={(outFileName) => {
                handleAutoFinishDownload(
                  outFileName,
                  'Pemformatan & ekspor Label Undangan 103 selesai'
                );
              }}
            />
          </div>
        ) : tool.id === 'gabung-1' || tool.url === 'internal://gabung-file' ? (
          <div key={iframeKey} className="w-full h-full overflow-y-auto bg-slate-900">
            <GabungFileApp
              onExportComplete={(outFileName) => {
                handleAutoFinishDownload(
                  outFileName,
                  'Penggabungan berkas scan & lampiran skripsi Word (.docx) selesai'
                );
              }}
            />
          </div>
        ) : tool.id === 'art-6' || tool.url === '/artikel-gemini' || tool.url === 'internal://artikel-gemini' ? (
          <div key={iframeKey} className="w-full h-full overflow-y-auto bg-[#07111f]">
            <ArtikelGeminiView
              onBackToHome={() => {
                if (typeof window !== 'undefined') {
                  window.history.pushState(null, '', '/');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
                onClose();
              }}
              onExportComplete={(outFileName) => {
                handleAutoFinishDownload(
                  outFileName,
                  'Penyusunan naskah artikel ilmiah .DOCX + Gemini 3.1 Flash Lite selesai'
                );
              }}
            />
          </div>
        ) : tool.id === 'art-7' || tool.url === 'internal://journal-converter' || tool.url === '/journal-converter' ? (
          <div key={iframeKey} className="w-full h-full overflow-y-auto bg-slate-100">
            <JournalConverterApp
              onArticleComplete={(outFileName) => {
                handleLink7GenerationReady(outFileName);
              }}
              onDownloadsConfirmed={handleLink7DownloadsConfirmed}
            />
          </div>
        ) : tool.id === 'split-3' || tool.url === 'internal://pisah-skripsi' || tool.url === '/pisah-skripsi' ? (
          <div key={iframeKey} className="w-full h-full overflow-y-auto bg-slate-100 dark:bg-slate-950">
            <PisahSkripsiApp
              onBackToHome={onClose}
              onExportComplete={(outFileName) => {
                handleAutoFinishDownload(
                  outFileName,
                  'Pemisahan file skripsi (15 Bagian Resmi) selesai'
                );
              }}
            />
          </div>
        ) : tool.id === 'cover-1' || tool.url === 'https://hanslakomesem-commits.github.io/Edit-Hard-Cover/' || tool.url === '/edit-hard-cover' || tool.url === 'internal://edit-hard-cover' ? (
          <iframe
            key={iframeKey}
            id="module-embed-view-hardcover"
            src="https://hanslakomesem-commits.github.io/Edit-Hard-Cover/"
            title={tool.title}
            className="w-full h-full border-0 bg-slate-900"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; camera; microphone; print"
            allowFullScreen
            onLoad={() => {
              setIsLoading(false);
              addLog('info', 'ZAIN.NET Cover V4.10 berhasil terhubung dan siap digunakan.');
            }}
          />
        ) : (
          <iframe
            key={iframeKey}
            id="module-embed-view"
            src={
              tool.id === 'nota-1' || 
              tool.url === '/notajilid' || 
              tool.url?.includes('zainnet-nota-v8.pages.dev')
                ? '/proxy-notajilid?utm_source=chatgpt.com'
                : (tool.id === 'toga-1' || tool.url === '/sewatoga' || tool.url?.includes('sewatoga.pages.dev')
                  ? '/proxy-sewatoga?utm_source=chatgpt.com'
                  : tool.url)
            }
            title={tool.title}
            className="w-full h-full border-0 bg-white"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; camera; microphone; print"
            allowFullScreen
            onLoad={() => {
              setIsLoading(false);
              addLog('info', 'Antarmuka generator berhasil terhubung dan siap digunakan.');
            }}
          />
        )}
    </div>
  </div>;
};

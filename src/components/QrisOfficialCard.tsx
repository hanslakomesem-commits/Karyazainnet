import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, ZoomIn, Copy, Check, ShieldCheck, Sparkles, Smartphone, ArrowRight, CreditCard } from 'lucide-react';
import { ManualQrisConfig } from '../types';

interface QrisOfficialCardProps {
  config: ManualQrisConfig;
  targetAmount?: number;
  orderId?: string;
}

export const QrisOfficialCard: React.FC<QrisOfficialCardProps> = ({
  config,
  targetAmount,
  orderId
}) => {
  const [copiedNmid, setCopiedNmid] = useState<boolean>(false);
  const [showEnlarged, setShowEnlarged] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const nmid = config.nmid || 'ID1024339728304';
  const merchantName = config.merchantName || 'ZAIN.NET, TLANAKAN';
  const terminalId = config.terminalId || 'A01';
  const printedBy = config.printedBy || '93600914';
  const qrisPayload = config.qrisString || '00020101021151560014ID.CO.QRIS.WWW0115ID10243397283040203UMI0308936009145204581253033605802ID5918ZAIN.NET, TLANAKAN6008TLANAKAN61056937162070103A016304ACD0';

  const handleCopyNmid = () => {
    navigator.clipboard.writeText(nmid);
    setCopiedNmid(true);
    setTimeout(() => setCopiedNmid(false), 2000);
  };

  const handleDownloadQr = () => {
    try {
      setIsDownloading(true);
      // Create downloadable SVG canvas
      const svg = document.getElementById('official-qris-svg');
      if (!svg) {
        // Fallback to direct image download
        window.open(config.qrisImageUrl, '_blank');
        setIsDownloading(false);
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      canvas.width = 600;
      canvas.height = 850;

      img.onload = () => {
        if (ctx) {
          // Fill white background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Top Header
          ctx.fillStyle = '#111827';
          ctx.font = 'bold 24px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(merchantName, canvas.width / 2, 80);

          ctx.font = 'normal 16px Arial, sans-serif';
          ctx.fillStyle = '#4B5563';
          ctx.fillText(`NMID: ${nmid}`, canvas.width / 2, 110);
          ctx.fillText(terminalId, canvas.width / 2, 135);

          // Draw QR
          ctx.drawImage(img, (canvas.width - 420) / 2, 160, 420, 420);

          // Footer
          ctx.font = 'bold 16px Arial, sans-serif';
          ctx.fillStyle = '#111827';
          ctx.fillText('SATU QRIS UNTUK SEMUA', canvas.width / 2, 630);

          ctx.font = 'normal 12px Arial, sans-serif';
          ctx.fillStyle = '#6B7280';
          ctx.fillText('Cek aplikasi penyelenggara di: www.aspi-qris.id', canvas.width / 2, 655);
          ctx.fillText(`Dicetak oleh: ${printedBy} | Versi cetak: v1.0.2024.08.21`, canvas.width / 2, 680);

          if (targetAmount) {
            ctx.font = 'bold 18px Arial, sans-serif';
            ctx.fillStyle = '#059669';
            ctx.fillText(`Nominal Pas: Rp ${targetAmount.toLocaleString('id-ID')}`, canvas.width / 2, 730);
          }

          const pngUrl = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = pngUrl;
          downloadLink.download = `QRIS-${merchantName.replace(/[^a-zA-Z0-9]/g, '_')}-${orderId || 'Order'}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
        setIsDownloading(false);
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (e) {
      console.warn('Canvas download fallback:', e);
      window.open(config.qrisImageUrl, '_blank');
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Official QRIS Flyer Card Container */}
      <div 
        ref={cardRef}
        className="w-full max-w-sm sm:max-w-md bg-white text-slate-900 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden border border-slate-200 select-none"
      >
        {/* Top-Left Red Geometric Accents */}
        <div className="absolute top-0 left-0 w-16 h-16 pointer-events-none">
          <div className="absolute top-0 left-0 w-0 h-0 border-t-[40px] border-t-red-600 border-r-[40px] border-r-transparent"></div>
        </div>

        {/* Top-Right Red Accent */}
        <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
          <div className="absolute top-0 right-0 w-0 h-0 border-t-[40px] border-t-red-600 border-l-[40px] border-l-transparent"></div>
        </div>

        {/* Bottom-Right Red Accent */}
        <div className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none">
          <div className="absolute bottom-0 right-0 w-0 h-0 border-b-[60px] border-b-red-600 border-l-[60px] border-l-transparent"></div>
        </div>

        {/* Header: QRIS & GPN Logos */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
          <div className="flex items-center gap-1.5">
            {/* QRIS Logo Badge */}
            <div className="bg-slate-950 text-white px-2 py-0.5 rounded font-black tracking-tighter text-sm flex items-center">
              <span>QR</span>
              <span className="text-red-500">IS</span>
            </div>
            <div className="text-[9px] leading-tight font-bold text-slate-800 tracking-tight">
              <div>QR Code Standar</div>
              <div>Pembayaran Nasional</div>
            </div>
          </div>

          {/* GPN Logo Badge */}
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center text-white text-[10px] font-black shadow-sm">
              GPN
            </div>
          </div>
        </div>

        {/* Merchant Info Header */}
        <div className="text-center my-2 space-y-0.5">
          <h3 className="font-extrabold text-base sm:text-lg text-slate-950 uppercase tracking-tight">
            {merchantName}
          </h3>
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600 font-mono font-semibold">
            <span>NMID: {nmid}</span>
            <button
              type="button"
              onClick={handleCopyNmid}
              title="Salin NMID"
              className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              {copiedNmid ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="text-xs font-bold text-slate-700 tracking-widest">
            {terminalId}
          </div>
        </div>

        {/* Center QR Code */}
        <div className="my-3 flex flex-col items-center justify-center">
          <div 
            onClick={() => setShowEnlarged(true)}
            className="p-2 sm:p-3 bg-white rounded-2xl border-2 border-slate-900/10 shadow-lg cursor-pointer hover:shadow-xl hover:border-slate-900/30 transition-all group relative"
          >
            {config.qrisImageUrl && config.qrisImageUrl.startsWith('data:image') ? (
              <img
                src={config.qrisImageUrl}
                alt="QRIS Barcode"
                className="w-48 h-48 sm:w-56 sm:h-56 mx-auto object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <QRCodeSVG
                id="official-qris-svg"
                value={qrisPayload}
                size={230}
                level="M"
                includeMargin={true}
                className="w-48 h-48 sm:w-56 sm:h-56 mx-auto"
              />
            )}

            {/* Hover overlay hint */}
            <div className="absolute inset-0 bg-slate-900/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-bold pointer-events-none">
              <ZoomIn className="w-4 h-4" />
              <span>Klik Perbesar</span>
            </div>
          </div>
        </div>

        {/* Footer info: Satu QRIS Untuk Semua */}
        <div className="text-center pt-2 border-t border-slate-100 space-y-1">
          <div className="text-xs font-black text-slate-900 tracking-wider">
            SATU QRIS UNTUK SEMUA
          </div>
          <div className="text-[10px] text-slate-500">
            Cek aplikasi penyelenggara di: <strong className="text-slate-700">www.aspi-qris.id</strong>
          </div>
          <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 font-mono">
            <span>Dicetak oleh: {printedBy}</span>
            <span>Versi: v1.0.2024.08.21</span>
          </div>
        </div>

        {/* Bottom Guide Icons (Buka -> Scan -> Bayar) */}
        <div className="mt-3 pt-2 border-t border-slate-100 bg-slate-50 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-3 rounded-b-3xl flex items-center justify-around text-center">
          <div className="flex flex-col items-center">
            <Smartphone className="w-4 h-4 text-red-600 mb-0.5" />
            <span className="text-[9px] font-bold text-slate-700 leading-tight">1. Buka M-Banking/E-Wallet</span>
          </div>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <div className="flex flex-col items-center">
            <CreditCard className="w-4 h-4 text-red-600 mb-0.5" />
            <span className="text-[9px] font-bold text-slate-700 leading-tight">2. Scan & Cek Nama</span>
          </div>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <div className="flex flex-col items-center">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mb-0.5" />
            <span className="text-[9px] font-bold text-slate-700 leading-tight">3. Ketik Nominal Pas</span>
          </div>
        </div>
      </div>

      {/* Action Buttons Below the QR Card */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
        <button
          type="button"
          onClick={handleDownloadQr}
          disabled={isDownloading}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span>{isDownloading ? 'Menyimpan...' : 'Unduh Gambar QRIS (Simpan ke Galeri)'}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowEnlarged(true)}
          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
          <span>Perbesar QR</span>
        </button>
      </div>

      {/* Enlarged QR Modal */}
      {showEnlarged && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-sm text-slate-900">{merchantName}</span>
              <button
                type="button"
                onClick={() => setShowEnlarged(false)}
                className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-inner inline-block">
              {config.qrisImageUrl && config.qrisImageUrl.startsWith('data:image') ? (
                <img
                  src={config.qrisImageUrl}
                  alt="QRIS Barcode"
                  className="w-64 h-64 mx-auto object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <QRCodeSVG
                  value={qrisPayload}
                  size={280}
                  level="M"
                  includeMargin={true}
                  className="mx-auto"
                />
              )}
            </div>

            <div className="text-xs text-slate-600">
              NMID: <strong className="font-mono text-slate-900">{nmid}</strong>
              <div className="text-[11px] text-emerald-700 font-bold mt-1">
                Scan langsung dari aplikasi M-Banking atau E-Wallet apa saja
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowEnlarged(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

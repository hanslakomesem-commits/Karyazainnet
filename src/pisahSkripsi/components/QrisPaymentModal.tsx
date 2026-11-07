import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Copy,
  Check,
  RefreshCw,
  X,
  Lock,
  Settings,
  ExternalLink,
  Key,
  Globe,
  HelpCircle,
  CreditCard,
  BookOpen,
  Download
} from 'lucide-react';

export interface QrisPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title: string;
  description: string;
  amount: number; // e.g., 5000 or 10000
}

export const QrisPaymentModal: React.FC<QrisPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title,
  description,
  amount,
}) => {
  const [activeTab, setActiveTab] = useState<'pay' | 'midtrans_config' | 'tutorial'>('pay');
  const [copied, setCopied] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes counter
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'checking' | 'success'>('pending');
  const [trxId] = useState(() => `MID-QRIS-${Math.floor(100000 + Math.random() * 900000)}`);

  // QR Code States
  const [qrString, setQrString] = useState<string>('');
  const [qrUrl, setQrUrl] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);
  const [qrError, setQrError] = useState<string | null>(null);

  // Midtrans Configuration state
  const [serverKey, setServerKey] = useState('');
  const [clientKey, setClientKey] = useState('');
  const [isProduction, setIsProduction] = useState(false);
  const [isConfigSaved, setIsConfigSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const webhookUrl = `${window.location.origin}/api/midtrans/qris/notify`;

  // Fetch current Midtrans Config from server on open
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/midtrans/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.isProduction !== undefined) setIsProduction(data.isProduction);
        if (data.clientKey) setClientKey(data.clientKey);
      })
      .catch((err) => console.warn('Could not fetch Midtrans config:', err));
  }, [isOpen]);

  // Request real Midtrans QRIS charge on modal open
  useEffect(() => {
    if (!isOpen) return;

    setIsGeneratingQr(true);
    setQrError(null);

    fetch('/api/midtrans/qris/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, invoiceNumber: trxId, title }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.qrString) {
          setQrString(data.qrString);
          if (data.qrUrl) setQrUrl(data.qrUrl);

          // Convert the valid QRIS string into a high-res scannable PNG Data URL using qrcode package
          QRCode.toDataURL(data.qrString, {
            width: 400,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
          })
            .then((url: string) => {
              setQrDataUrl(url);
            })
            .catch((err: any) => {
              console.error('Failed to convert QR string to data URL:', err);
            });
        } else if (data.error) {
          setQrError(data.error);
        }
      })
      .catch((err) => {
        console.error('Error requesting Midtrans QRIS:', err);
        setQrError('Gagal membuat transaksi QRIS. Silakan coba lagi.');
      })
      .finally(() => {
        setIsGeneratingQr(false);
      });
  }, [isOpen, amount, trxId, title]);

  // Timer countdown
  useEffect(() => {
    if (!isOpen) return;
    setPaymentStatus('pending');
    setTimeLeft(300);

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [checkingManual, setCheckingManual] = useState(false);

  // Automatic Payment Detection Polling (strictly checks backend without auto-passing)
  useEffect(() => {
    if (!isOpen || paymentStatus === 'success' || activeTab !== 'pay') return;

    const pollInterval = setInterval(() => {
      fetch(`/api/midtrans/qris/status/${trxId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === 'SUCCESS' || data.verified === true) {
            setPaymentStatus('success');
            setTimeout(() => {
              onSuccess();
            }, 1200);
          }
        })
        .catch((e) => console.warn('Poll status check error:', e));
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [isOpen, paymentStatus, activeTab, trxId, onSuccess]);

  const handleManualCheckStatus = async () => {
    setCheckingManual(true);
    setCheckMessage(null);
    try {
      const res = await fetch(`/api/midtrans/qris/status/${trxId}`);
      const data = await res.json();
      if (data.status === 'SUCCESS' || data.verified === true) {
        setPaymentStatus('success');
        setCheckMessage('✓ Pembayaran terverifikasi!');
        setTimeout(() => {
          onSuccess();
        }, 1200);
      } else {
        setCheckMessage('Belum ada transaksi pembayaran terverifikasi. Mohon lakukan scan & bayar QRIS terlebih dahulu.');
      }
    } catch (err) {
      setCheckMessage('Gagal mengecek status ke server.');
    } finally {
      setCheckingManual(false);
    }
  };

  const handleDownloadQrCode = () => {
    const downloadSource = qrDataUrl || qrUrl;
    if (!downloadSource) {
      alert('Kode QRIS belum siap untuk didownload.');
      return;
    }

    try {
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadSource;
      downloadLink.download = `kode-qris-${trxId}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error('Error downloading QR code:', err);
      alert('Gagal mendownload kode QRIS.');
    }
  };

  if (!isOpen) return null;

  const formattedAmount = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopyTrx = () => {
    navigator.clipboard.writeText(trxId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleSaveMidtransConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const res = await fetch('/api/midtrans/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverKey,
          clientKey,
          isProduction,
        }),
      });
      const data = await res.json();
      setIsConfigSaved(true);
      setTimeout(() => setIsConfigSaved(false), 3000);
    } catch (err) {
      console.error('Error saving Midtrans config:', err);
      alert('Gagal menyimpan konfigurasi Midtrans.');
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-md">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-widest uppercase opacity-80 block">
                MIDTRANS QRIS PAYMENT GATEWAY
              </span>
              <h3 className="text-base font-bold text-white">Pembayaran Layanan Skripsi</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition-colors text-white"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <button
            onClick={() => setActiveTab('pay')}
            className={`flex-1 py-3 px-3 text-xs font-bold border-b-2 flex items-center justify-center space-x-1.5 transition-colors ${
              activeTab === 'pay'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Bayar QRIS</span>
          </button>

          <button
            onClick={() => setActiveTab('midtrans_config')}
            className={`flex-1 py-3 px-3 text-xs font-bold border-b-2 flex items-center justify-center space-x-1.5 transition-colors ${
              activeTab === 'midtrans_config'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Koneksi Midtrans</span>
          </button>

          <button
            onClick={() => setActiveTab('tutorial')}
            className={`flex-1 py-3 px-3 text-xs font-bold border-b-2 flex items-center justify-center space-x-1.5 transition-colors ${
              activeTab === 'tutorial'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span>Tutorial Lengkap</span>
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'pay' && (
            <>
              {/* Item details */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 mb-5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Transaksi</span>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h4>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                    {formattedAmount}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
              </div>

              {/* QRIS Display Container */}
              <div className="flex flex-col items-center bg-white dark:bg-slate-950 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-inner relative mb-5">
                {/* QRIS Header branding logo simulation */}
                <div className="flex items-center justify-between w-full pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-1">
                    <span className="text-blue-600 font-extrabold text-sm tracking-tighter">MIDTRANS</span>
                    <span className="text-[10px] text-slate-400 font-medium">| QRIS GPN</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">NMID: ID1024883920194</span>
                </div>

                {/* Dynamic Real QR Code */}
                <div className="relative p-3 bg-white rounded-xl shadow-md border border-slate-200 flex flex-col items-center min-w-[220px] min-h-[220px] justify-center">
                  {isGeneratingQr ? (
                    <div className="flex flex-col items-center justify-center p-8 space-y-2">
                      <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                      <span className="text-xs font-semibold text-slate-500">Membuat Kode QRIS Midtrans...</span>
                    </div>
                  ) : qrError ? (
                    <div className="text-center p-4">
                      <p className="text-xs font-semibold text-red-500 mb-2">{qrError}</p>
                      <button
                        onClick={() => window.location.reload()}
                        className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg"
                      >
                        Coba Lagi
                      </button>
                    </div>
                  ) : (
                    <>
                      {(qrDataUrl || qrUrl) ? (
                        <img
                          id="qris-img-code"
                          src={qrDataUrl || qrUrl}
                          alt="Kode QRIS Midtrans Resmi"
                          className="w-48 h-48 object-contain rounded-lg"
                        />
                      ) : (
                        <div className="w-48 h-48 flex items-center justify-center bg-slate-100 rounded-lg text-xs text-slate-400">
                          Memuat QR Code...
                        </div>
                      )}

                      <span className="text-[11px] font-semibold text-slate-700 mt-2">
                        Merchant: LAYANAN SKRIPSI ZAIN.NET
                      </span>

                      {/* Download QR Code Button */}
                      <button
                        type="button"
                        onClick={handleDownloadQrCode}
                        className="mt-2.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 dark:text-blue-300 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800 flex items-center space-x-1.5 transition-colors active:scale-95 shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Download QRIS Kode</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Countdown timer & TRX info */}
                <div className="w-full mt-3 flex items-center justify-between text-xs px-1">
                  <div className="flex items-center space-x-1 text-slate-500 dark:text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>Batas Waktu:</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {formatTimer(timeLeft)}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyTrx}
                    className="flex items-center space-x-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Salin ID Transaksi"
                  >
                    <span className="font-mono text-[11px]">{trxId}</span>
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Automatic Payment Detector Status Banner */}
              <div className="rounded-2xl p-4 border transition-all mb-5 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
                {paymentStatus === 'pending' && (
                  <div className="flex items-center space-x-3">
                    <div className="relative flex items-center justify-center">
                      <div className="w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-75 absolute"></div>
                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                        <span>Mendeteksi Pembayaran Midtrans Otomatis...</span>
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Scan QRIS menggunakan GoPay, ShopeePay, OVO, Dana, BCA, Mandiri, atau Mobile Banking Anda.
                      </p>
                    </div>
                  </div>
                )}

                {paymentStatus === 'checking' && (
                  <div className="flex items-center space-x-3">
                    <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />
                    <div className="flex-1">
                      <h5 className="text-xs font-bold text-amber-700 dark:text-amber-400">
                        Mengecek Mutasi Midtrans QRIS...
                      </h5>
                      <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80">
                        Sistem sedang memverifikasi pembayaran QRIS Anda secara real-time.
                      </p>
                    </div>
                  </div>
                )}

                {paymentStatus === 'success' && (
                  <div className="flex items-center space-x-3 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 animate-bounce" />
                    <div className="flex-1">
                      <h5 className="text-sm font-bold">Pembayaran Berhasil Terkonfirmasi!</h5>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        Membuka dan mengunduh dokumen secara otomatis...
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="space-y-2.5">
                <button
                  onClick={handleManualCheckStatus}
                  disabled={paymentStatus === 'success' || checkingManual}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {checkingManual ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  <span>Cek Status Pembayaran Sekarang</span>
                </button>

                {checkMessage && (
                  <div className={`p-3 rounded-xl text-xs font-semibold text-center animate-in fade-in ${
                    paymentStatus === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300'
                  }`}>
                    {checkMessage}
                  </div>
                )}

                <button
                  onClick={onClose}
                  className="w-full py-2 px-4 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-medium transition-colors"
                >
                  Batal
                </button>
              </div>

              <div className="mt-4 text-center flex items-center justify-center space-x-1 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Pembayaran terenkripsi & aman dengan gateway Midtrans QRIS</span>
              </div>
            </>
          )}

          {activeTab === 'midtrans_config' && (
            /* Midtrans Configuration Tab */
            <div className="space-y-5">
              <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60">
                <div className="flex items-start space-x-3">
                  <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">
                      Formulir Koneksi Midtrans Gateway
                    </h4>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-1 leading-relaxed">
                      Masukkan Server Key dan Client Key dari Dashboard Midtrans Anda agar pembayaran QRIS terhubung langsung ke rekening usaha Anda.
                    </p>
                  </div>
                </div>
              </div>

              {/* Input Form */}
              <form onSubmit={handleSaveMidtransConfig} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Midtrans Server Key
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      placeholder="Contoh: SB-Mid-server-xxxx..."
                      value={serverKey}
                      onChange={(e) => setServerKey(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Midtrans Client Key
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Contoh: SB-Mid-client-xxxx..."
                      value={clientKey}
                      onChange={(e) => setClientKey(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      Mode Produksi / Production (Live)
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Aktifkan jika menggunakan kunci produksi Midtrans resmi (Bukan Sandbox)
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isProduction}
                    onChange={(e) => setIsProduction(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saveLoading}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                >
                  {saveLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Simpan Kunci API Midtrans</span>
                </button>

                {isConfigSaved && (
                  <p className="text-xs text-center font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                    ✓ Konfigurasi Midtrans QRIS berhasil disimpan!
                  </p>
                )}
              </form>

              {/* Webhook Notification URL */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Notification URL (Webhook)
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                  Salin URL ini dan tempel di Midtrans Dashboard &gt; Configuration &gt; Payment Notification URL.
                </p>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-mono text-slate-600 dark:text-slate-400 select-all"
                  />
                  <button
                    onClick={handleCopyWebhook}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors shrink-0"
                  >
                    {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedWebhook ? 'Tersalin!' : 'Salin'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tutorial' && (
            /* Midtrans Step-by-Step Tutorial Tab */
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/60 flex items-start space-x-3">
                <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Panduan Step-by-Step Menghubungkan Midtrans QRIS
                  </h4>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                    Ikuti langkah di bawah ini untuk mendapatkan Server Key dan mengaktifkan deteksi pembayaran otomatis.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                {/* Step 1 */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px]">1</span>
                    <h5 className="font-bold text-slate-900 dark:text-slate-100">Daftar / Login Akun Midtrans</h5>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed pl-7">
                    Buka situs resmi Midtrans Dashboard di{' '}
                    <a
                      href="https://dashboard.midtrans.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 font-bold underline inline-flex items-center space-x-0.5"
                    >
                      <span>dashboard.midtrans.com</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    . Jika ingin mencoba pengujian gratis tanpa registrasi badan usaha, masuk ke mode <b>Sandbox</b> di{' '}
                    <a
                      href="https://dashboard.sandbox.midtrans.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 font-bold underline inline-flex items-center space-x-0.5"
                    >
                      <span>dashboard.sandbox.midtrans.com</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    .
                  </p>
                </div>

                {/* Step 2 */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px]">2</span>
                    <h5 className="font-bold text-slate-900 dark:text-slate-100">Ambil Server Key & Client Key</h5>
                  </div>
                  <ul className="list-disc pl-11 text-slate-600 dark:text-slate-400 space-y-1">
                    <li>Di bilah navigasi sebelah kiri, klik menu <b>SETTINGS</b> &gt; <b>Access Keys</b>.</li>
                    <li>Salin <b>Server Key</b> (biasanya diawali <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">SB-Mid-server-</code> untuk Sandbox atau <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">Mid-server-</code> untuk Production).</li>
                    <li>Salin <b>Client Key</b> (diawali <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">SB-Mid-client-</code> atau <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">Mid-client-</code>).</li>
                  </ul>
                </div>

                {/* Step 3 */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px]">3</span>
                    <h5 className="font-bold text-slate-900 dark:text-slate-100">Simpan Kunci di Formulir Aplikasi</h5>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed pl-7">
                    Kembali ke tab <b>Koneksi Midtrans</b> di aplikasi ini, tempelkan Server Key & Client Key yang sudah disalin, lalu klik tombol <b>Simpan Kunci API Midtrans</b>.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px]">4</span>
                    <h5 className="font-bold text-slate-900 dark:text-slate-100">Daftarkan Payment Notification URL (Webhook)</h5>
                  </div>
                  <ul className="list-disc pl-11 text-slate-600 dark:text-slate-400 space-y-1">
                    <li>Di Midtrans Dashboard, buka menu <b>SETTINGS</b> &gt; <b>Configuration</b>.</li>
                    <li>Pada kolom <b>Payment Notification URL</b>, masukkan URL Webhook berikut:</li>
                    <li className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-semibold break-all">
                      {webhookUrl}
                    </li>
                    <li>Pilih <b>Notification Strategy</b>: <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">Send all notifications</code>, lalu klik <b>Save</b>.</li>
                  </ul>
                </div>

                {/* Step 5 */}
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <h5 className="font-bold text-emerald-900 dark:text-emerald-200">Selesai! Sistem Siap Digunakan</h5>
                  </div>
                  <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed pl-7">
                    Setiap kali pembeli melakukan pembayaran via GoPay, QRIS, atau E-Wallet lainnya, Midtrans akan mengirimkan sinyal konfirmasi dan aplikasi ini akan membuka file/unduhan secara otomatis tanpa input manual.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

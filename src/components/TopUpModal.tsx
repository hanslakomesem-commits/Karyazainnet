import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Wallet, 
  CheckCircle2, 
  Copy, 
  Check, 
  QrCode, 
  Building2, 
  Smartphone, 
  MessageCircle, 
  Upload, 
  Loader2, 
  Clock, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { User } from 'firebase/auth';
import { QRCodeSVG } from 'qrcode.react';
import { doc, setDoc, onSnapshot } from '../storage/documents';
import { db } from '../firebase';
import { PaymentConfig, UserPurchase, AppUser } from '../types';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | AppUser | null;
  currentBalance: number;
  paymentConfig: PaymentConfig;
  onTopUpSuccess?: (newBalance: number) => void;
  onOpenLogin?: () => void;
  initialAmount?: number;
}

const PRESET_AMOUNTS = [
  { amount: 10000, label: 'Rp 10.000', desc: 'Cukup untuk 1-2 artikel' },
  { amount: 20000, label: 'Rp 20.000', desc: 'Pas untuk 2-3 modul' },
  { amount: 35000, label: 'Rp 35.000', desc: 'Paket 1 Kategori Penuh' },
  { amount: 50000, label: 'Rp 50.000', desc: 'Favorit Mahasiswa (5+ artikel)', popular: true },
  { amount: 100000, label: 'Rp 100.000', desc: 'Super Hemat Bebas Buat' },
];

export const TopUpModal: React.FC<TopUpModalProps> = ({
  isOpen,
  onClose,
  user,
  currentBalance,
  paymentConfig,
  onTopUpSuccess,
  onOpenLogin,
  initialAmount,
}) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(initialAmount || 50000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'bank_transfer' | 'qris'>('bank_transfer');

  useEffect(() => {
    if (isOpen && initialAmount) {
      setSelectedAmount(initialAmount);
      setIsCustom(false);
      setCustomAmount('');
    }
  }, [isOpen, initialAmount]);
  
  const [senderName, setSenderName] = useState<string>('');
  const [senderBank, setSenderBank] = useState<string>('DANA');
  const [senderPhone, setSenderPhone] = useState<string>('');
  
  const [orderId, setOrderId] = useState<string>('');
  const [uniqueCode, setUniqueCode] = useState<number>(0);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  
  const [proofImageBase64, setProofImageBase64] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedPurchase, setSubmittedPurchase] = useState<UserPurchase | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasHandledTopupRef = useRef<boolean>(false);
  const onTopUpSuccessRef = useRef(onTopUpSuccess);

  useEffect(() => {
    onTopUpSuccessRef.current = onTopUpSuccess;
  }, [onTopUpSuccess]);

  const effectiveAmount = isCustom ? (parseInt(customAmount.replace(/\D/g, ''), 10) || 0) : selectedAmount;
  const totalPayAmount = effectiveAmount + (paymentConfig.enableUniqueCode ? uniqueCode : 0);

  // Initialize order ID and unique code on open or amount change
  useEffect(() => {
    if (isOpen) {
      hasHandledTopupRef.current = false;
      const generatedOrderId = `TOPUP-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      const randomCode = paymentConfig.enableUniqueCode ? Math.floor(100 + Math.random() * 899) : 0;
      
      setOrderId(generatedOrderId);
      setUniqueCode(randomCode);
      setSenderName(user?.displayName || '');
      setProofImageBase64(null);
      setUploadError(null);
      setSubmittedPurchase(null);
      setIsSubmitting(false);
    }
  }, [isOpen, user, paymentConfig.enableUniqueCode]);

  // Realtime Firestore Listener for Submitted Transaction Verification
  useEffect(() => {
    if (!submittedPurchase || !submittedPurchase.orderId) return;

    let isSubscribed = true;
    const trxRef = doc(db, 'transactions', submittedPurchase.orderId);
    const unsubscribe = onSnapshot(trxRef, (docSnap) => {
      if (!isSubscribed) return;
      if (docSnap.exists()) {
        const data = docSnap.data() as UserPurchase;
        setSubmittedPurchase(data);

        if (data.status === 'completed' && !hasHandledTopupRef.current) {
          hasHandledTopupRef.current = true;
          isSubscribed = false;
          const topupAmt = data.amountPaid || effectiveAmount;
          const newTotal = currentBalance + topupAmt;
          if (onTopUpSuccessRef.current) {
            onTopUpSuccessRef.current(newTotal);
          }
          if (user) {
            try {
              localStorage.setItem(`zain_wallet_${user.uid}`, newTotal.toString());
              if (user.email) {
                localStorage.setItem(`zain_wallet_${user.email}`, newTotal.toString());
                const emailDocId = user.email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
                setDoc(doc(db, 'wallets_by_email', emailDocId), {
                  userId: user.uid,
                  userEmail: user.email,
                  balance: newTotal,
                  updatedAt: Date.now()
                }, { merge: true }).catch(() => {});
              }
              setDoc(doc(db, 'users', user.uid, 'data', 'wallet'), {
                userId: user.uid,
                userEmail: user.email || '',
                balance: newTotal,
                updatedAt: Date.now()
              }, { merge: true }).catch(() => {});
              setDoc(doc(db, 'users', user.uid), {
                walletBalance: newTotal,
                updatedAt: new Date().toISOString()
              }, { merge: true }).catch(() => {});
            } catch (_e) {}
          }
        }
      }
    }, (error) => {
      console.warn('Realtime topup listener warning:', error);
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [submittedPurchase?.orderId, currentBalance, effectiveAmount]);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(id);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Harap unggah file gambar (JPG, PNG, atau JPEG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Ukuran gambar maksimal 5MB.');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setProofImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const getWhatsAppMessage = (customName?: string, customBankName?: string, customTotal?: number) => {
    const userName = (customName !== undefined ? customName : senderName).trim() || user?.displayName || 'Pengguna';
    const paymentMethod = (customBankName !== undefined ? customBankName : senderBank) || 'DANA';
    const amount = customTotal !== undefined ? customTotal : totalPayAmount;
    const formattedAmount = amount.toLocaleString('id-ID');

    return `Nama : ${userName}\nJenis pesanan : Isi Saldo Akun (Top Up)\nPembayaran : ${paymentMethod}\nTotal pembayaran : ${formattedAmount}\nStatus : sudah transfer mohon di konfirmasi`;
  };

  const handleSendViaWhatsApp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (effectiveAmount < 5000) {
      setUploadError('Minimal pengisian saldo adalah Rp 5.000.');
      return;
    }

    setIsSubmitting(true);
    setUploadError(null);

    const finalSenderName = (senderName.trim() || user?.displayName || (user?.email ? user.email.split('@')[0] : 'Pelanggan Tamu'));

    const purchaseData: UserPurchase = {
      id: orderId,
      userId: user ? user.uid : 'guest',
      userEmail: user?.email || (senderPhone ? `${senderPhone}@guest.zain.net` : 'tamu@zain.net'),
      itemId: 'wallet:topup',
      itemType: 'topup',
      itemTitle: `Isi Saldo Akun (Rp ${effectiveAmount.toLocaleString('id-ID')})`,
      amountPaid: totalPayAmount,
      originalAmount: effectiveAmount,
      uniqueCode: uniqueCode,
      orderId: orderId,
      purchasedAt: Date.now(),
      quotaGranted: effectiveAmount,
      paymentType: activeTab === 'qris' ? 'qris_manual' : 'bank_transfer',
      method: activeTab === 'qris' ? 'qris_manual' : 'bank_transfer',
      status: 'pending',
      senderName: finalSenderName,
      senderBank: senderBank.trim() || 'DANA',
      userEnteredAmount: totalPayAmount,
      paymentProofUrl: proofImageBase64 || '',
      transferNotes: `Top Up Saldo: Rp ${effectiveAmount.toLocaleString('id-ID')} | Pembayaran: ${senderBank}` + (senderPhone ? ` | WA: ${senderPhone}` : ''),
    };

    try {
      // 1. Save to global transactions collection for Admin real-time notification & approval
      await setDoc(doc(db, 'transactions', orderId), purchaseData);

      // 2. Also save to user's personal purchases collection if logged in
      if (user) {
        await setDoc(doc(db, 'users', user.uid, 'purchases', orderId), purchaseData);
      }

      setSubmittedPurchase(purchaseData);

      // 3. Open WhatsApp with formatted confirmation message
      const waUrl = `https://wa.me/62${paymentConfig.adminWhatsApp.replace(/^0/, '')}?text=${encodeURIComponent(
        getWhatsAppMessage(purchaseData.senderName, purchaseData.senderBank, totalPayAmount)
      )}`;

      const opened = window.open(waUrl, '_blank');
      if (!opened) {
        window.location.href = waUrl;
      }
    } catch (err: any) {
      console.error('Error saving topup transaction:', err);
      setSubmittedPurchase(purchaseData);
      const waUrl = `https://wa.me/62${paymentConfig.adminWhatsApp.replace(/^0/, '')}?text=${encodeURIComponent(
        getWhatsAppMessage(purchaseData.senderName, purchaseData.senderBank, totalPayAmount)
      )}`;
      window.open(waUrl, '_blank');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div 
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto relative text-slate-100 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  Isi Saldo Akun (Top Up)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Instan & Bebas Potong
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Isi saldo sekali, transaksi artikel/skripsi langsung terpotong otomatis
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Current Balance Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 border border-indigo-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Saldo Akun Anda Saat Ini</span>
                <span className="text-lg sm:text-xl font-black text-white font-mono">
                  Rp {currentBalance.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {user ? (
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-mono truncate max-w-[120px]">
                  {user.email}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Akun Terhubung
                </span>
              </div>
            ) : (
              <div>
                {onOpenLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenLogin();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-colors cursor-pointer"
                  >
                    Login Google Dulu
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Submitted Verification State Banner (If Waiting for Admin ACC) */}
          {submittedPurchase && (
            <div className={`p-4 rounded-2xl border transition-all ${
              submittedPurchase.status === 'completed'
                ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
                : submittedPurchase.status === 'rejected'
                ? 'bg-red-950/70 border-red-500/60 text-red-200'
                : 'bg-amber-950/60 border-amber-500/50 text-amber-200 animate-pulse'
            }`}>
              <div className="flex items-start gap-3">
                {submittedPurchase.status === 'completed' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                ) : submittedPurchase.status === 'rejected' ? (
                  <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                ) : (
                  <Clock className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-white">
                      {submittedPurchase.status === 'completed'
                        ? 'Saldo Berhasil Ditambahkan!'
                        : submittedPurchase.status === 'rejected'
                        ? 'Top Up Ditolak'
                        : 'Menunggu Konfirmasi Admin...'}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      ID: {submittedPurchase.orderId}
                    </span>
                  </div>

                  <p className="text-slate-300">
                    {submittedPurchase.status === 'completed'
                      ? `Selamat! Saldo sebesar Rp ${(submittedPurchase.amountPaid || effectiveAmount).toLocaleString('id-ID')} telah aktif dan langsung dapat digunakan untuk membuat artikel.`
                      : submittedPurchase.status === 'rejected'
                      ? `Alasan: ${submittedPurchase.rejectionReason || 'Nominal tidak sesuai atau bukti transfer tidak terbaca.'}`
                      : 'Bukti pembayaran dan permintaan top up telah terkirim ke Admin. Saldo akun akan otomatis terisi seketika Admin menyetujui di panel.'}
                  </p>

                  {submittedPurchase.status === 'pending' && (
                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      <a
                        href={`https://wa.me/62${paymentConfig.adminWhatsApp.replace(/^0/, '')}?text=${encodeURIComponent(
                          getWhatsAppMessage(submittedPurchase.senderName, submittedPurchase.senderBank, submittedPurchase.amountPaid)
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Kirim Ulang Pesan WA</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => setSubmittedPurchase(null)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
                      >
                        Isi Nominal Lain
                      </button>
                    </div>
                  )}

                  {submittedPurchase.status === 'completed' && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                      >
                        Mulai Buat Artikel Sekarang
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!submittedPurchase && (
            <>
              {/* STEP 1: PILIH NOMINAL TOP UP */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pilih Nominal Pengisian Saldo:</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Min. Rp 5.000</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PRESET_AMOUNTS.map((preset) => {
                    const isSelected = !isCustom && selectedAmount === preset.amount;
                    return (
                      <button
                        key={preset.amount}
                        type="button"
                        onClick={() => {
                          setSelectedAmount(preset.amount);
                          setIsCustom(false);
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? 'bg-emerald-950/60 border-emerald-500 shadow-md shadow-emerald-900/30 ring-1 ring-emerald-500/40'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        {preset.popular && (
                          <span className="absolute -top-0 -right-0 px-2 py-0.5 rounded-bl-lg bg-emerald-500 text-slate-950 font-black text-[9px] uppercase tracking-wider">
                            Favorit
                          </span>
                        )}
                        <span className="text-sm font-bold text-white block font-mono">
                          {preset.label}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                          {preset.desc}
                        </span>
                      </button>
                    );
                  })}

                  {/* Custom Nominal Option */}
                  <button
                    type="button"
                    onClick={() => setIsCustom(true)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isCustom
                        ? 'bg-emerald-950/60 border-emerald-500 shadow-md ring-1 ring-emerald-500/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <span className="text-sm font-bold text-white block">
                      Nominal Bebas
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Ketik jumlah sendiri
                    </span>
                  </button>
                </div>

                {/* Custom Input Field */}
                {isCustom && (
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 animate-fadeIn">
                    <label className="text-xs font-semibold text-slate-300">
                      Masukkan Nominal Saldo yang Ingin Diisi (Rp):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                        Rp
                      </span>
                      <input
                        type="text"
                        value={customAmount}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setCustomAmount(val ? Number(val).toLocaleString('id-ID') : '');
                        }}
                        placeholder="Contoh: 75.000"
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-sm font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Total Summary & Nominal Transfer Bulat */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-medium">Nominal Transfer Top Up</span>
                    {paymentConfig.enableUniqueCode && uniqueCode > 0 ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        +Kode Unik: {uniqueCode}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Nominal Bulat
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                      Rp {totalPayAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">
                    💡 Saldo masuk: <strong>Rp {effectiveAmount.toLocaleString('id-ID')}</strong> (tanpa biaya / tanpa kode unik). Estimasi saldo baru: Rp {(currentBalance + effectiveAmount).toLocaleString('id-ID')}.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(totalPayAmount.toString(), 'nominal-topup')}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                >
                  {copiedAccount === 'nominal-topup' ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4 text-slate-950" />}
                  <span>{copiedAccount === 'nominal-topup' ? 'Tersalin!' : 'Salin Nominal'}</span>
                </button>
              </div>

              {/* STEP 2: METODE PEMBAYARAN */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    Pilih Metode Transfer Pembayaran:
                  </label>
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveTab('bank_transfer')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTab === 'bank_transfer'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Bank & E-Wallet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('qris')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTab === 'qris'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>QRIS Scan</span>
                    </button>
                  </div>
                </div>

                {/* Bank / E-Wallet Accounts List */}
                {activeTab === 'bank_transfer' ? (
                  <div className="space-y-2">
                    {paymentConfig.bankAccounts.map((account, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                            {account.bankName.includes('DANA') || account.bankName.includes('OVO') ? (
                              <Smartphone className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Building2 className="w-4 h-4 text-blue-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">
                                {account.bankName}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                a.n. <strong className="text-slate-300">{account.accountHolder}</strong>
                              </span>
                            </div>
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              {account.accountNumber}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopy(account.accountNumber, `acc-${idx}`)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                            copiedAccount === `acc-${idx}`
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                          }`}
                        >
                          {copiedAccount === `acc-${idx}` ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* QRIS Mode */
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center space-y-3">
                    <div className="p-3 bg-white rounded-2xl shadow-xl">
                      <QRCodeSVG
                        value={paymentConfig.qrisString || '00020101021151560014ID.CO.QRIS.WWW0115ID10243397283040203UMI0308936009145204581253033605802ID5918ZAIN.NET, TLANAKAN6008TLANAKAN61056937162070103A016304ACD0'}
                        size={160}
                        level="M"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">QRIS Standar Pembayaran Nasional</p>
                      <p className="text-[11px] text-slate-400">Scan via GoPay, OVO, Dana, ShopeePay, BCA, Livin Mandiri, BRImo</p>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 3: FORM KONFIRMASI WHATSAPP */}
              <form onSubmit={handleSendViaWhatsApp} className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">
                      Konfirmasi Pengisian Saldo ke WhatsApp Admin
                    </h4>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Admin: 085231176597
                  </span>
                </div>

                {uploadError && (
                  <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{uploadError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Sender Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nama Anda / Pengirim <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Zaki"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Payment Method / Bank */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Metode / Bank Yang Dipakai <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={senderBank}
                      onChange={(e) => setSenderBank(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="DANA">DANA (085231176597)</option>
                      <option value="Bank BCA">Bank BCA (1921060632)</option>
                      <option value="Bank BRI">Bank BRI (646701017777539)</option>
                      <option value="Sea Bank">Sea Bank (901162515189)</option>
                      <option value="OVO">OVO (085231176597)</option>
                      <option value="QRIS Standar Nasional">QRIS Standar Nasional</option>
                    </select>
                  </div>
                </div>

                {/* Live Message Template Preview */}
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Format Pesan WhatsApp Otomatis:</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Format Resmi</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/90 border border-emerald-500/20 text-xs font-mono text-emerald-200 whitespace-pre-line leading-relaxed selection:bg-emerald-700">
                    {getWhatsAppMessage()}
                  </div>
                </div>

                {/* Optional Receipt Attachment */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Lampiran Foto Struk / Bukti Transfer
                    </label>
                    <span className="text-[10px] text-slate-400">
                      (Bisa kirim di WA atau lampirkan di sini)
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {proofImageBase64 ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-emerald-500/40">
                      <div className="flex items-center gap-3 truncate">
                        <img
                          src={proofImageBase64}
                          alt="Bukti Transfer"
                          className="w-12 h-12 rounded-lg object-cover border border-slate-700"
                        />
                        <div className="truncate">
                          <p className="text-xs font-bold text-emerald-300 truncate">Foto Struk Terlampir</p>
                          <p className="text-[10px] text-slate-400">Tersimpan di sistem untuk ACC admin</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer shrink-0"
                      >
                        Ganti
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl p-3 text-center cursor-pointer transition-colors bg-slate-900/40 hover:bg-slate-900 flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-slate-200"
                    >
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span>Klik di sini jika ingin melampirkan foto struk di sistem web</span>
                    </div>
                  )}
                </div>

                {/* Send WA Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || effectiveAmount < 5000}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-50 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Menyiapkan Pesan WhatsApp...</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-5 h-5 text-white" />
                      <span>Kirim Bukti & Minta ACC Saldo ke WhatsApp Admin</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center text-slate-400">
                  Setelah menekan tombol di atas, WhatsApp Anda akan otomatis terbuka dengan format pesan lengkap ke Admin (<strong>085231176597</strong>). Admin akan meng-ACC permintaan top up Anda di panel web.
                </p>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

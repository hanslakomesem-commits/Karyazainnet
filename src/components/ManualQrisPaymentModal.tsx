import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  CheckCircle2, 
  QrCode, 
  ShieldCheck, 
  Copy, 
  Check, 
  Loader2, 
  Building2, 
  Wallet, 
  AlertCircle, 
  ArrowRight,
  Clock,
  ExternalLink,
  Crown,
  Sparkles,
  MessageCircle,
  Upload,
  Image as ImageIcon,
  HelpCircle,
  Smartphone,
  RefreshCw,
  Coins,
  Store,
  MapPin,
  Banknote
} from 'lucide-react';
import { User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from '../storage/documents';
import { db } from '../firebase';
import { UserPurchase, ManualQrisConfig, UserRole, UserLoyalty, AppUser } from '../types';
import { QrisOfficialCard } from './QrisOfficialCard';

export interface CheckoutTarget {
  type: 'tool' | 'category' | 'all_access';
  id: string; // 'art-1', '1', 'all_access'
  title: string;
  subtitle?: string;
  priceRp: number;
  originalPriceRp?: number;
  mayarPaymentUrl?: string;
  badge?: string;
}

interface ManualQrisPaymentModalProps {
  target: CheckoutTarget | null;
  user: User | AppUser | null;
  userRole?: UserRole;
  discountPercentage?: number;
  paymentConfig: ManualQrisConfig;
  loyalty?: UserLoyalty;
  resellerTrialRemaining?: number;
  userWalletBalance?: number;
  onOpenTopUp?: () => void;
  onPayWithWallet?: (target: CheckoutTarget, quantity: number, totalAmount: number) => Promise<void>;
  onClose: () => void;
  onPaymentSuccess: (purchase: UserPurchase) => void;
  onUseFreeReward?: (target: CheckoutTarget) => void;
  onUseResellerTrial?: (target: CheckoutTarget) => void;
}

type PaymentMethodTab = 'bayar_di_tempat' | 'qris' | 'bank_transfer';

export const ManualQrisPaymentModal: React.FC<ManualQrisPaymentModalProps> = ({
  target,
  user,
  userRole = 'public',
  discountPercentage = 50,
  paymentConfig,
  loyalty,
  resellerTrialRemaining = 0,
  userWalletBalance = 0,
  onOpenTopUp,
  onPayWithWallet,
  onClose,
  onPaymentSuccess,
  onUseFreeReward,
  onUseResellerTrial
}) => {
  const [activeTab, setActiveTab] = useState<PaymentMethodTab>('bayar_di_tempat');
  const [orderId, setOrderId] = useState<string>('');
  const [uniqueCode, setUniqueCode] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [enteredAmount, setEnteredAmount] = useState<number>(0);
  const [isPayingWithWallet, setIsPayingWithWallet] = useState<boolean>(false);
  const [walletPaidSuccess, setWalletPaidSuccess] = useState<boolean>(false);

  // Form State (Transfer & QRIS)
  const [senderName, setSenderName] = useState<string>('');
  const [senderBank, setSenderBank] = useState<string>('Bank BCA');
  const [senderPhone, setSenderPhone] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState<string>('');
  const [proofImageBase64, setProofImageBase64] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Bayar di Tempat (Tunai di Loket) State
  const [codSenderName, setCodSenderName] = useState<string>('');
  const [codSenderPhone, setCodSenderPhone] = useState<string>('');
  const [codNotes, setCodNotes] = useState<string>('');
  const [isSubmittingCod, setIsSubmittingCod] = useState<boolean>(false);
  const [codSuccess, setCodSuccess] = useState<boolean>(false);

  // Verification tracking state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedPurchase, setSubmittedPurchase] = useState<UserPurchase | null>(null);
  const [copiedAmount, setCopiedAmount] = useState<boolean>(false);
  const [copiedAccountIndex, setCopiedAccountIndex] = useState<number | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<boolean>(false);
  const [showEnlargedQr, setShowEnlargedQr] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasHandledSuccessRef = useRef<boolean>(false);
  const onPaymentSuccessRef = useRef(onPaymentSuccess);

  useEffect(() => {
    onPaymentSuccessRef.current = onPaymentSuccess;
  }, [onPaymentSuccess]);

  // Reseller 50% discount calculations per item
  const isReseller = userRole === 'reseller';
  const rawUnitPrice = target?.originalPriceRp || target?.priceRp || 0;
  const unitPrice = isReseller 
    ? Math.round(rawUnitPrice * ((100 - (discountPercentage || 50)) / 100))
    : (target?.priceRp || rawUnitPrice);
  const baseCost = unitPrice * quantity;

  const targetId = target?.id;
  const targetType = target?.type;

  // Initialize order when target or quantity changes
  useEffect(() => {
    if (target) {
      hasHandledSuccessRef.current = false;
      const generatedOrderId = `ZAIN-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      const randomCode = paymentConfig.enableUniqueCode ? Math.floor(100 + Math.random() * 899) : 0;
      const calculatedTotal = baseCost + randomCode;

      setOrderId(generatedOrderId);
      setUniqueCode(randomCode);
      setTotalAmount(calculatedTotal);
      setEnteredAmount(calculatedTotal);
      setSenderName(user?.displayName || '');
      setSenderPhone('');
      setTransferNotes('');
      setProofImageBase64('');
      setUploadError(null);
      setSubmittedPurchase(null);
      setIsSubmitting(false);
      setWalletPaidSuccess(false);
      setCodSenderName(user?.displayName || '');
      setCodSenderPhone('');
      setCodNotes('');
      setIsSubmittingCod(false);
      setCodSuccess(false);
    }
  }, [targetId, targetType, quantity, paymentConfig.enableUniqueCode, baseCost]);

  // Realtime Firestore Listener for Submitted Transaction Verification
  useEffect(() => {
    if (!submittedPurchase?.id) return;

    let isSubscribed = true;
    const trxDocRef = doc(db, 'transactions', submittedPurchase.id);
    const unsubscribe = onSnapshot(trxDocRef, (docSnap) => {
      if (!isSubscribed) return;
      if (docSnap.exists()) {
        const data = docSnap.data() as UserPurchase;
        setSubmittedPurchase((prev) => {
          if (prev && prev.status === data.status && prev.id === data.id && prev.paymentProofUrl === data.paymentProofUrl) {
            return prev;
          }
          return data;
        });

        // If approved by Admin, trigger success ONLY ONCE
        if ((data.status === 'completed' || data.status === 'settlement') && !hasHandledSuccessRef.current) {
          hasHandledSuccessRef.current = true;
          isSubscribed = false;
          if (onPaymentSuccessRef.current) {
            onPaymentSuccessRef.current(data);
          }
        }
      }
    }, (err) => {
      console.warn('Firestore transaction listener error:', err);
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [submittedPurchase?.id]);

  if (!target) return null;

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(String(totalAmount));
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const handleCopyAccount = (accountNumber: string, index: number) => {
    navigator.clipboard.writeText(accountNumber);
    setCopiedAccountIndex(index);
    setTimeout(() => setCopiedAccountIndex(null), 2000);
  };

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(orderId);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Harap pilih file gambar (JPG, PNG, atau JPEG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Ukuran gambar maksimal 5MB.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setProofImageBase64(reader.result as string);
      setIsUploading(false);
    };
    reader.onerror = () => {
      setUploadError('Gagal membaca file gambar.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const getWhatsAppMessage = (customName?: string, customBank?: string, customQty?: number, customAmount?: number) => {
    const userName = (customName !== undefined ? customName : senderName).trim() || user?.displayName || 'Pengguna';
    const orderType = target?.title || 'Pembuatan Artikel';
    const paymentMethod = (customBank !== undefined ? customBank : senderBank) || 'DANA';
    const qty = customQty !== undefined ? customQty : quantity;
    const amount = customAmount !== undefined ? customAmount : totalAmount;

    let unitName = 'artikel';
    const lowerTitle = orderType.toLowerCase();
    if (lowerTitle.includes('bab')) unitName = 'bab';
    else if (lowerTitle.includes('skripsi') || lowerTitle.includes('modul')) unitName = 'modul';
    else if (target?.type === 'category') unitName = 'paket';
    else if (target?.type === 'all_access') unitName = 'akses VIP';

    const formattedAmount = amount.toLocaleString('id-ID');
    const totalPembayaranLine = qty > 1 
      ? `Total pembayaran : ${formattedAmount} untuk ${qty} ${unitName}`
      : `Total pembayaran : ${formattedAmount}`;

    return `Nama : ${userName}\nJenis pesanan : ${orderType}\nPembayaran : ${paymentMethod}\n${totalPembayaranLine}\nStatus : sudah transfer mohon di konfirmasi`;
  };

  const formattedWhatsAppUrl = `https://wa.me/62${paymentConfig.adminWhatsApp.replace(/^0/, '')}?text=${encodeURIComponent(
    getWhatsAppMessage()
  )}`;

  const handleSendViaWhatsApp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setIsSubmitting(true);
    setUploadError(null);

    const finalSenderName = (senderName.trim() || user?.displayName || (user?.email ? user.email.split('@')[0] : 'Pelanggan Tamu'));

    const purchaseData: UserPurchase = {
      id: orderId,
      userId: user?.uid || 'guest',
      userEmail: user?.email || (senderPhone ? `${senderPhone}@guest.zain.net` : 'tamu@zain.net'),
      itemId: target.type === 'tool' ? `tool:${target.id}` : target.type === 'category' ? `category:${target.id}` : 'all_access',
      itemType: target.type,
      itemTitle: quantity > 1 ? `${target.title} (${quantity}x)` : target.title,
      amountPaid: totalAmount,
      originalAmount: (target.priceRp || 0) * quantity,
      uniqueCode: uniqueCode,
      orderId: orderId,
      purchasedAt: Date.now(),
      quotaGranted: quantity,
      paymentType: activeTab === 'qris' ? 'qris_manual' : 'bank_transfer',
      method: activeTab === 'qris' ? 'qris_manual' : 'bank_transfer',
      status: 'pending',
      senderName: finalSenderName,
      senderBank: senderBank.trim() || 'DANA',
      userEnteredAmount: enteredAmount || totalAmount,
      paymentProofUrl: proofImageBase64 || '',
      transferNotes: `Jenis Pesanan: ${target.title} (${quantity}x) | Pembayaran: ${senderBank} | Total: Rp ${totalAmount.toLocaleString('id-ID')}` + (senderPhone ? ` | WA: ${senderPhone}` : ''),
    };

    try {
      // Save to global transactions collection for admin web verification
      await setDoc(doc(db, 'transactions', orderId), purchaseData);

      // Also save to user's personal purchases subcollection if logged in
      if (user) {
        await setDoc(doc(db, 'users', user.uid, 'purchases', orderId), purchaseData);
      }

      setSubmittedPurchase(purchaseData);

      // Open WhatsApp directly with exact formatted message
      const waUrl = `https://wa.me/62${paymentConfig.adminWhatsApp.replace(/^0/, '')}?text=${encodeURIComponent(
        getWhatsAppMessage(purchaseData.senderName, purchaseData.senderBank, quantity, totalAmount)
      )}`;
      
      const opened = window.open(waUrl, '_blank');
      if (!opened) {
        window.location.href = waUrl;
      }
    } catch (err: any) {
      console.error('Error saving manual transaction:', err);
      setSubmittedPurchase(purchaseData);
      const waUrl = `https://wa.me/62${paymentConfig.adminWhatsApp.replace(/^0/, '')}?text=${encodeURIComponent(
        getWhatsAppMessage()
      )}`;
      window.open(waUrl, '_blank');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSendViaWhatsApp();
  };

  const handleBayarDiTempat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setIsSubmittingCod(true);
    setUploadError(null);

    const codOrderId = `COD-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const finalCustomerName = (codSenderName.trim() || senderName.trim() || user?.displayName || 'Mahasiswa (Bayar di Tempat)');
    const phone = (codSenderPhone.trim() || senderPhone.trim() || '');
    const notes = codNotes.trim();

    const purchaseData: UserPurchase = {
      id: codOrderId,
      userId: user?.uid || 'guest',
      userEmail: user?.email || (phone ? `${phone}@guest.zain.net` : 'guest@zain.net'),
      itemId: target.type === 'tool' ? `tool:${target.id}` : target.type === 'category' ? `category:${target.id}` : 'all_access',
      itemType: target.type,
      itemTitle: quantity > 1 ? `${target.title} (${quantity}x)` : target.title,
      amountPaid: baseCost,
      originalAmount: (target.priceRp || 0) * quantity,
      uniqueCode: 0,
      orderId: codOrderId,
      purchasedAt: Date.now(),
      quotaGranted: quantity,
      paymentType: 'bayar_di_tempat',
      method: 'bayar_di_tempat',
      status: 'pending', // Perlu persetujuan admin setelah menerima pembayaran tunai di loket!
      senderName: finalCustomerName,
      senderBank: 'Bayar di Tempat (Tunai)',
      userEnteredAmount: baseCost,
      paymentProofUrl: '',
      transferNotes: `[Bayar di Tempat / Tunai] Pesanan: ${target.title} (${quantity}x) | Tagihan: Rp ${baseCost.toLocaleString('id-ID')}` + (notes ? ` | Info/Lokasi: ${notes}` : '') + (phone ? ` | HP/WA: ${phone}` : '')
    };

    try {
      // Save to global transactions collection for admin verification
      await setDoc(doc(db, 'transactions', codOrderId), purchaseData);

      // Also save to user's personal purchases subcollection if logged in
      if (user) {
        await setDoc(doc(db, 'users', user.uid, 'purchases', codOrderId), purchaseData);
      }
    } catch (err: any) {
      console.warn('Error saving COD transaction in Firestore:', err);
    }

    setCodSuccess(true);
    setIsSubmittingCod(false);

    // Set to submittedPurchase so user sees the real-time pending screen.
    // As soon as Admin clicks "Setujui" in the Admin Verification Modal,
    // the onSnapshot listener will immediately detect status 'completed' and unlock the module!
    setSubmittedPurchase(purchaseData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${
              activeTab === 'bayar_di_tempat' 
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-slate-950 shadow-emerald-500/20' 
                : 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/20'
            }`}>
              {activeTab === 'bayar_di_tempat' ? (
                <Coins className="w-5 h-5 text-slate-950 stroke-[2.5]" />
              ) : (
                <QrCode className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  {activeTab === 'bayar_di_tempat' ? 'Bayar di Tempat (Tunai)' : 'Pembayaran QRIS & Transfer'}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  activeTab === 'bayar_di_tempat'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                }`}>
                  {activeTab === 'bayar_di_tempat' ? 'Perlu Disetujui Admin' : 'Langsung & Aman'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {activeTab === 'bayar_di_tempat' 
                  ? 'Ajukan pesanan tunai, disetujui Admin saat bayar di loket / kampus' 
                  : 'Verifikasi cepat oleh Admin ZAIN.NET'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Target Item Summary Card with Quantity Controls */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {target.type === 'tool' ? 'Pembayaran Khusus Link Ini (Per Link)' : 'Paket Kategori Lengkap'}
                </span>
                <h4 className="font-bold text-white text-base mt-1.5">
                  {target.title}
                </h4>
                <p className="text-xs text-slate-400">
                  {target.subtitle || 'Berlaku untuk proses pembuatan / pengolahan dokumen'}
                </p>
              </div>

              <div className="text-left sm:text-right sm:border-l sm:border-slate-800 sm:pl-4">
                <span className="text-[11px] text-slate-400 block font-medium">Harga Satuan</span>
                {isReseller ? (
                  <div className="flex flex-col sm:items-end">
                    <span className="text-sm font-black text-emerald-400">
                      Rp {unitPrice.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[11px] text-slate-500 line-through">
                      Rp {rawUnitPrice.toLocaleString('id-ID')}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm font-bold text-slate-300">
                    Rp {unitPrice.toLocaleString('id-ID')}
                  </span>
                )}
              </div>
            </div>

            {/* Reseller 50% Discount Information Badge */}
            {isReseller && (
              <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-between text-xs text-indigo-200">
                <span className="flex items-center gap-1.5 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Diskon Khusus Akun Reseller 50% Per Item
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  Hemat Rp {((rawUnitPrice - unitPrice) * quantity).toLocaleString('id-ID')}
                </span>
              </div>
            )}

            {/* Quantity Selector for Tools / Articles */}
            {target.type === 'tool' && (
              <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300">Jumlah Pembelian:</span>
                  <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 text-sm font-bold cursor-pointer transition-colors"
                    >
                      -
                    </button>
                    <span className="px-3 py-1 text-xs font-mono font-bold text-emerald-400 min-w-[2.5rem] text-center">
                      {quantity}x
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(50, quantity + 1))}
                      className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-bold cursor-pointer transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Quick Selection Pills */}
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 5, 10].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuantity(q)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        quantity === q
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {q}x
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Special Role / Voucher Actions (If Available) */}
          {userRole === 'public' && loyalty && loyalty.freeRewardsAvailable > 0 && onUseFreeReward && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-emerald-200">Anda Memiliki {loyalty.freeRewardsAvailable} Voucher Gratis!</p>
                  <p className="text-slate-400 text-[11px]">Klaim promo Beli 3x Gratis 1x tanpa bayar sepeserpun.</p>
                </div>
              </div>
              <button
                onClick={() => onUseFreeReward(target)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-extrabold text-xs shadow-md hover:from-amber-400 hover:to-emerald-400 cursor-pointer whitespace-nowrap"
              >
                Gunakan Gratis
              </button>
            </div>
          )}

          {userRole === 'reseller' && resellerTrialRemaining > 0 && onUseResellerTrial && (
            <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-cyan-200">Sisa Free Trial Reseller: {resellerTrialRemaining}/3x</p>
                  <p className="text-slate-400 text-[11px]">Gunakan sesi uji coba gratis Anda untuk modul ini.</p>
                </div>
              </div>
              <button
                onClick={() => onUseResellerTrial(target)}
                className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md cursor-pointer whitespace-nowrap"
              >
                Buka Free Trial
              </button>
            </div>
          )}

          {/* IF ALREADY SUBMITTED PROOF: Show Verification Waiting Screen */}
          {submittedPurchase ? (
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-950 border border-emerald-500/30 text-center space-y-4">
              
              {submittedPurchase.status === 'completed' || submittedPurchase.status === 'settlement' ? (
                <div className="space-y-2">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto ring-4 ring-emerald-500/30">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="font-extrabold text-lg text-white">
                    Pembayaran Telah Diverifikasi!
                  </h4>
                  <p className="text-xs text-emerald-300">
                    Kuota 1x pembuatan naskah Anda telah aktif dan siap digunakan.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-3 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    Buka Modul Sekarang
                  </button>
                </div>
              ) : submittedPurchase.status === 'rejected' ? (
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-base text-red-300">
                    Pembayaran Belum Disetujui
                  </h4>
                  <p className="text-xs text-slate-300 bg-red-950/40 p-3 rounded-xl border border-red-500/30">
                    Alasan: {submittedPurchase.rejectionReason || 'Nominal tidak cocok atau bukti pembayaran kurang jelas.'}
                  </p>
                  <button
                    onClick={() => setSubmittedPurchase(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Upload Ulang Bukti Pembayaran
                  </button>
                </div>
              ) : (
                /* Pending State */
                <div className="space-y-4">
                  <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-30"></span>
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-lg">
                      <Clock className="w-7 h-7 animate-pulse" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-base sm:text-lg text-white">
                      {submittedPurchase.paymentType === 'bayar_di_tempat'
                        ? 'Menunggu Persetujuan Admin (Bayar di Tempat)...'
                        : 'Menunggu Konfirmasi Admin...'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {submittedPurchase.paymentType === 'bayar_di_tempat' ? (
                        <>
                          Pesanan Bayar di Tempat untuk Order <strong className="text-slate-200 font-mono">{submittedPurchase.id}</strong> telah tercatat. Silakan lakukan pembayaran tunai di loket / kampus. Admin akan menyetujui transaksi ini di Panel Admin dan modul Anda akan terbuka otomatis!
                        </>
                      ) : (
                        <>
                          Bukti pembayaran Anda untuk Order <strong className="text-slate-200 font-mono">{submittedPurchase.id}</strong> telah dikirim. Admin akan segera memverifikasi dan kuota Anda akan aktif otomatis tanpa perlu reload.
                        </>
                      )}
                    </p>
                  </div>

                  {/* Summary of submitted transaction */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-left text-xs space-y-2">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>{submittedPurchase.paymentType === 'bayar_di_tempat' ? 'Tagihan Bayar Tunai:' : 'Total Ditransfer:'}</span>
                      <span className="font-bold text-emerald-400 text-sm">
                        Rp {submittedPurchase.amountPaid.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Atas Nama:</span>
                      <span className="font-semibold text-slate-200">{submittedPurchase.senderName}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Metode:</span>
                      <span className="font-semibold text-emerald-300">
                        {submittedPurchase.paymentType === 'bayar_di_tempat' ? 'Bayar di Tempat (Tunai di Loket)' : submittedPurchase.senderBank}
                      </span>
                    </div>
                    {submittedPurchase.paymentType === 'bayar_di_tempat' && (
                      <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-[11px] leading-relaxed">
                        📍 <strong>Status Real-time:</strong> Menunggu disetujui Admin. Begitu Admin menerima uang tunai dan menekan "Setujui" di Panel Verifikasi Admin, modul ini akan otomatis terbuka seketika tanpa perlu reload!
                      </div>
                    )}
                    {submittedPurchase.paymentProofUrl && (
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-slate-400">Bukti Transfer:</span>
                        <a 
                          href={submittedPurchase.paymentProofUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Lihat Gambar</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* WhatsApp Direct Push Option or COD Controls */}
                  {submittedPurchase.paymentType === 'bayar_di_tempat' ? (
                    <div className="pt-2 space-y-2">
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                        <p className="text-[11px] text-slate-400">
                          Mahasiswa <strong className="text-slate-200">tidak perlu mengirim bukti ke WhatsApp</strong>. Cukup tunjukkan Order ID <span className="font-mono font-bold text-white">{submittedPurchase.id}</span> saat bertemu Admin.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSubmittedPurchase(null)}
                          className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition-colors"
                        >
                          Ganti Metode Pembayaran
                        </button>
                        <button
                          type="button"
                          onClick={onClose}
                          className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
                        >
                          Tutup (Bisa Dicek Nanti)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2">
                      <a
                        href={formattedWhatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Konfirmasi Cepat Lewat WhatsApp</span>
                      </a>
                      <p className="text-[11px] text-slate-500 mt-1.5">
                        Kirim bukti via WhatsApp untuk proses verifikasi kilat (1-3 menit).
                      </p>
                    </div>
                  )}
                </div>
              )}

            </div>
          ) : (
            /* STEP 1: TRANSFER DETAILS & QRIS */
            <div className="space-y-4">
              
              {/* Wallet Balance Payment Quick Option */}
              {user && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 border border-indigo-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">Saldo Akun Anda:</span>
                        <span className="text-xs font-mono font-extrabold text-emerald-400">
                          Rp {userWalletBalance.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {userWalletBalance >= baseCost
                          ? 'Saldo Anda cukup! Bayar langsung tanpa perlu transfer/tunggu verifikasi.'
                          : `Saldo kurang Rp ${Math.max(0, baseCost - userWalletBalance).toLocaleString('id-ID')} untuk bayar dengan saldo.`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {userWalletBalance >= baseCost ? (
                      <button
                        type="button"
                        disabled={isPayingWithWallet || walletPaidSuccess}
                        onClick={async () => {
                          if (!target || isPayingWithWallet || walletPaidSuccess) return;
                          const cost = baseCost;
                          setIsPayingWithWallet(true);
                          setUploadError(null);
                          try {
                            if (onPayWithWallet) {
                              await onPayWithWallet(target, quantity, cost);
                              setWalletPaidSuccess(true);
                              setTimeout(() => {
                                onClose();
                              }, 1300);
                            }
                          } catch (err: any) {
                            setUploadError(err?.message || 'Gagal memproses pemotongan saldo. Silakan coba kembali.');
                          } finally {
                            setIsPayingWithWallet(false);
                          }
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-900/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                      >
                        {isPayingWithWallet ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                            <span>Memproses...</span>
                          </>
                        ) : walletPaidSuccess ? (
                          <>
                            <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                            <span>Berhasil!</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-slate-950" />
                            <span>Bayar Pakai Saldo (Rp {baseCost.toLocaleString('id-ID')})</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          if (onOpenTopUp) onOpenTopUp();
                        }}
                        className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow transition-all"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>+ Isi Saldo</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Banner Sukses Bayar Saldo */}
              {walletPaidSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500 text-center space-y-1.5 animate-in zoom-in-95">
                  <div className="w-8 h-8 mx-auto rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                    <Check className="w-5 h-5 stroke-[3]" />
                  </div>
                  <h4 className="font-black text-sm text-white">Pembayaran Sukses Diproses!</h4>
                  <p className="text-xs text-emerald-200">
                    Saldo sebesar <strong>Rp {baseCost.toLocaleString('id-ID')}</strong> berhasil dipotong. Kuota pembuatan langsung ditambahkan.
                  </p>
                </div>
              )}

              {/* Nominal Tagihan Bulat */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-medium">
                      {activeTab === 'bayar_di_tempat' ? 'Tagihan Bayar di Tempat' : 'Nominal Total Transfer'}
                    </span>
                    {activeTab === 'bayar_di_tempat' || uniqueCode === 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Nominal Pas
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        +Kode Unik: {uniqueCode}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                      Rp {(activeTab === 'bayar_di_tempat' ? baseCost : totalAmount).toLocaleString('id-ID')}
                    </span>
                  </div>
                  {activeTab === 'bayar_di_tempat' ? (
                    <p className="text-[11px] text-emerald-300/90 mt-1">
                      💡 Bayar tunai pas saat bertemu Admin di kampus / loket. Langsung aktif tanpa kirim bukti WA!
                    </p>
                  ) : uniqueCode > 0 ? (
                    <p className="text-[11px] text-amber-300/90 mt-1">
                      ⚠️ <strong>PENTING:</strong> Transfer tepat hingga 3 digit terakhir agar pembayaran Anda langsung dikenali.
                    </p>
                  ) : (
                    <p className="text-[11px] text-emerald-300/90 mt-1">
                      💡 Silakan transfer <strong>pas Rp {totalAmount.toLocaleString('id-ID')}</strong> (nominal bulat tanpa kode unik).
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCopyAmount}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                >
                  {copiedAmount ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4 text-slate-950" />}
                  <span>{copiedAmount ? 'Tersalin!' : 'Salin Nominal'}</span>
                </button>
              </div>

              {/* Payment Method Switcher Tabs */}
              <div className="grid grid-cols-3 rounded-2xl bg-slate-950 p-1.5 border border-slate-800 gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('bayar_di_tempat')}
                  className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer text-center ${
                    activeTab === 'bayar_di_tempat'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  <Coins className={`w-4 h-4 ${activeTab === 'bayar_di_tempat' ? 'text-white' : 'text-emerald-400'}`} />
                  <span className="truncate">Bayar di Tempat</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('qris')}
                  className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer text-center ${
                    activeTab === 'qris'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  <QrCode className={`w-4 h-4 ${activeTab === 'qris' ? 'text-white' : 'text-blue-400'}`} />
                  <span className="truncate">Scan QRIS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('bank_transfer')}
                  className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer text-center ${
                    activeTab === 'bank_transfer'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  <Building2 className={`w-4 h-4 ${activeTab === 'bank_transfer' ? 'text-white' : 'text-indigo-400'}`} />
                  <span className="truncate">Transfer Bank</span>
                </button>
              </div>

              {/* TAB 1: Bayar di Tempat (Tunai Langsung di Loket - Tanpa WA) */}
              {activeTab === 'bayar_di_tempat' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/40 space-y-4 shadow-lg shadow-emerald-950/20">
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-inner">
                          <Coins className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm sm:text-base text-white">
                              Bayar di Tempat (Tunai di Loket)
                            </h4>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Perlu Persetujuan Admin
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5">
                            Cukup ajukan pesanan di sini tanpa perlu kirim bukti ke WhatsApp. Admin akan menyetujui transaksi setelah pembayaran tunai diterima.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white block">Tanpa Chat WhatsApp</span>
                          <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">Tidak perlu kirim screenshot atau bukti transfer</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 flex items-start gap-2.5">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white block">Persetujuan Admin</span>
                          <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">Admin menyetujui & membuka modul dari Panel Admin</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 flex items-start gap-2.5">
                        <Store className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white block">Bayar Pas di Loket</span>
                          <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">Rp {baseCost.toLocaleString('id-ID')} diserahkan saat bertemu</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Nama Mahasiswa / Pemesan <span className="text-emerald-400">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: Muhammad Hanafi"
                            value={codSenderName}
                            onChange={(e) => setCodSenderName(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Nomor WhatsApp / HP <span className="text-slate-500 font-normal">(opsional)</span>
                          </label>
                          <input
                            type="tel"
                            placeholder="08xxxxxxxxxx"
                            value={codSenderPhone}
                            onChange={(e) => setCodSenderPhone(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Lokasi Kampus / Loket / Catatan <span className="text-slate-500 font-normal">(opsional)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: Kampus IAIN / Loket ZAIN.NET / Fakultas Tarbiyah"
                          value={codNotes}
                          onChange={(e) => setCodNotes(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Total Bayar Tunai di Tempat:</span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                          Rp {baseCost.toLocaleString('id-ID')}
                        </span>
                        <span className="text-[10px] text-emerald-300/80 block mt-0.5">
                          Nominal bulat pas tanpa kode unik
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-block">
                          {quantity}x Kuota Pembuatan
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-1">Perlu Persetujuan</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleBayarDiTempat}
                      disabled={isSubmittingCod || codSuccess}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.99] disabled:opacity-60 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      {isSubmittingCod ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                          <span>Mengajukan Pesanan...</span>
                        </>
                      ) : (
                        <>
                          <Coins className="w-5 h-5 text-slate-950" />
                          <span>Ajukan Bayar di Tempat (Menunggu Persetujuan Admin)</span>
                        </>
                      )}
                    </button>

                    <p className="text-[11px] text-center text-slate-400 leading-relaxed">
                      ⚡ Mahasiswa <strong className="text-slate-200">tidak perlu kirim bukti transfer ke WhatsApp</strong>. Cukup selesaikan bayar tunai di loket / kampus, dan Admin akan menyetujui pesanan Anda di Panel Admin agar modul terbuka seketika.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 1: QRIS Display */}
              {activeTab === 'qris' && (
                <div className="space-y-4">
                  <QrisOfficialCard
                    config={paymentConfig}
                    targetAmount={totalAmount}
                    orderId={orderId}
                  />

                  {/* Anti-Kesalahan: Panduan Langkah Pembayaran */}
                  <div className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-500/30 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-blue-300">
                      <HelpCircle className="w-4 h-4 text-blue-400" />
                      <span>Petunjuk Pembayaran QRIS Agar Sesuai Ketentuan:</span>
                    </div>
                    <ol className="list-decimal list-inside text-slate-300 space-y-1 text-[11px] leading-relaxed">
                      <li>Buka aplikasi <strong className="text-white">BCA, Mandiri, BRI, DANA, GoPay, OVO, ShopeePay</strong> atau Bank Anda.</li>
                      <li>Scan barcode QRIS <strong className="text-white">ZAIN.NET, TLANAKAN</strong> di atas atau simpan gambar ke galeri HP.</li>
                      <li>Ketik nominal transfer <strong className="text-emerald-400 font-mono">Rp {totalAmount.toLocaleString('id-ID')}</strong> (jangan dibulatkan agar terverifikasi otomatis).</li>
                      <li>Simpan screenshot / struk bukti transfer dan unggah pada formulir di bawah.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* TAB 2: List of Bank Accounts */}
              {activeTab === 'bank_transfer' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                    💡 <em>Silakan transfer ke salah satu rekening atau E-Wallet resmi berikut. Pastikan nominal transfer tepat <strong>Rp {totalAmount.toLocaleString('id-ID')}</strong>.</em>
                  </div>

                  <div className="space-y-2.5">
                    {paymentConfig.bankAccounts.map((account, index) => (
                      <div
                        key={index}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">
                              {account.bankName}
                            </p>
                            <p className="text-sm font-mono font-bold text-blue-300">
                              {account.accountNumber}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              a.n. <strong>{account.accountHolder}</strong>
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyAccount(account.accountNumber, index)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedAccountIndex === index ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedAccountIndex === index ? 'Disalin' : 'Salin Rekening'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Switch Banner to Bayar di Tempat (Shown on QRIS & Bank Transfer) */}
              {activeTab !== 'bayar_di_tempat' && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-md">
                  <div className="flex items-center gap-2.5 text-emerald-200">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Coins className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">Ingin bayar tunai di kampus tanpa kirim WA?</span>
                      <span className="text-[11px] text-slate-300">Pilih Bayar di Tempat. Cukup ajukan pesanan dan bayar langsung saat bertemu Admin.</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('bayar_di_tempat')}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs whitespace-nowrap cursor-pointer transition-all shadow-md shadow-emerald-950/40 shrink-0"
                  >
                    Pilih Bayar di Tempat
                  </button>
                </div>
              )}

              {/* STEP 2: FORM KONFIRMASI PEMBAYARAN VIA WHATSAPP (Hanya untuk QRIS & Transfer Bank) */}
              {activeTab !== 'bayar_di_tempat' && (
                <form onSubmit={handleSendViaWhatsApp} className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-sm font-bold text-white">
                        Konfirmasi Bukti Transfer via WhatsApp
                      </h4>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Kirim Langsung ke Admin
                    </span>
                  </div>

                {uploadError && (
                  <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
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
                      Metode / Bank Pembayaran <span className="text-red-400">*</span>
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

                {/* Jenis Pesanan Display Card */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="text-slate-400">
                    <span>Jenis Pesanan:</span>
                    <p className="font-bold text-white text-sm mt-0.5">
                      {target.title} {quantity > 1 ? <span className="text-emerald-400 font-mono text-xs">({quantity}x)</span> : null}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">Total Pembayaran:</span>
                    <p className="font-bold text-emerald-400 text-sm mt-0.5 font-mono">
                      Rp {totalAmount.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                {/* Live Preview of WhatsApp Message Template */}
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

                {/* Upload Image Area (Optional if sending directly via WA) */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Lampiran Struk Bukti Transfer
                    </label>
                    <span className="text-[10px] text-slate-400">
                      (Bisa kirim langsung di chat WA atau lampirkan di sini)
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
                    <div className="relative p-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <img
                          src={proofImageBase64}
                          alt="Preview Bukti"
                          className="w-12 h-12 rounded-lg object-cover border border-slate-700"
                        />
                        <div className="truncate">
                          <p className="text-xs font-bold text-emerald-300 truncate">Foto Struk Terlampir</p>
                          <p className="text-[10px] text-slate-400">Tersimpan untuk verifikasi Admin</p>
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
                      <span>Klik di sini jika ingin melampirkan foto struk di web</span>
                    </div>
                  )}
                </div>

                {/* Primary Action: Send to WhatsApp Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-60 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Menyiapkan Pesan WhatsApp...</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-5 h-5 text-white" />
                      <span>Kirim Bukti Pembayaran ke WhatsApp Admin</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center text-slate-400">
                  Setelah menekan tombol di atas, WhatsApp Anda akan otomatis terbuka dengan format pesan lengkap ke Admin (<strong>085231176597</strong>).
                </p>
              </form>
            )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verifikasi Manual Langsung ke Rekening Pribadi Owner</span>
          </div>

          <a
            href={formattedWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Butuh Bantuan? Hubungi WhatsApp</span>
          </a>
        </div>

      </div>
    </div>
  );
};

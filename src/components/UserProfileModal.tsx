import React from 'react';
import { 
  X, 
  Mail, 
  ShieldCheck, 
  Calendar, 
  LogOut, 
  Award,
  BookMarked,
  Sparkles,
  CreditCard,
  Crown,
  MessageCircle,
  Wallet,
  PlusCircle
} from 'lucide-react';
import { User } from 'firebase/auth';
import { UserPurchase, UserQuotas, UserRole, UserLoyalty, AppUser } from '../types';
import { Gift, Check, FolderArchive, BookOpen } from 'lucide-react';

interface UserProfileModalProps {
  user: User | AppUser | null;
  userRole?: UserRole;
  discountPercentage?: number;
  favoritesCount?: number;
  documentsCount?: number;
  quotas?: UserQuotas;
  purchases?: UserPurchase[];
  loyalty?: UserLoyalty;
  resellerTrials?: { [toolId: string]: number };
  walletBalance?: number;
  onOpenTopUp?: () => void;
  onClose: () => void;
  onSignOut: () => void;
  onOpenDocumentArchive?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  userRole = 'public',
  discountPercentage = 50,
  favoritesCount = 0,
  documentsCount = 0,
  quotas = {},
  purchases = [],
  loyalty,
  resellerTrials = {},
  walletBalance = 0,
  onOpenTopUp,
  onClose,
  onSignOut,
  onOpenDocumentArchive
}) => {
  if (!user) return null;

  const isAdmin = userRole === 'admin';
  const isReseller = userRole === 'reseller';

  const totalQuotaRemaining = Object.values(quotas || {}).reduce<number>((sum, q) => sum + (typeof q === 'number' ? q : 0), 0);

  const rawCreation = ('metadata' in user && (user as any).metadata?.creationTime)
    ? (user as any).metadata.creationTime
    : ('createdAt' in user && user.createdAt)
    ? user.createdAt
    : null;

  const creationDate = rawCreation 
    ? new Date(rawCreation).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : 'Aktif';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-slate-100 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Profile Header */}
        <div className="text-center pt-2 pb-4">
          <div className="relative inline-block mb-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User Profile'}
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-blue-500/30 mx-auto shadow-xl"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white mx-auto shadow-xl">
                {user.displayName ? user.displayName.charAt(0) : 'U'}
              </div>
            )}
            <div className={`absolute -bottom-1 -right-1 p-1.5 rounded-full ring-4 ring-slate-900 ${
              isAdmin ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
            }`}>
              {isAdmin ? <Crown className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            </div>
          </div>

          <h3 className="text-lg font-bold text-white">
            {user.displayName || 'Pengguna ZAIN.NET'}
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            {user.email}
          </p>

          {/* Role Status Tag */}
          <div className="mt-3 flex items-center justify-center gap-2">
            {isAdmin ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-xs font-extrabold text-amber-300">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Akun Administrator (Semua Modul Gratis Tanpa Batas)</span>
              </span>
            ) : isReseller ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-xs font-extrabold text-blue-300">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Akun Reseller / Partnership (Diskon {discountPercentage}% All Item)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300">
                <span>Akun Pengguna Umum (Harga Normal)</span>
              </span>
            )}
          </div>

          {!isAdmin && (
            <div className="mt-2 flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-300">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sisa Kuota Aktif: {totalQuotaRemaining}x Pembuatan</span>
              </span>
            </div>
          )}
        </div>

        {/* Wallet Balance Card */}
        <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/60 border border-indigo-500/30 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Saldo Akun Anda</span>
              <span className="text-lg font-black text-white font-mono">
                Rp {walletBalance.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {onOpenTopUp && (
            <button
              onClick={() => {
                onClose();
                onOpenTopUp();
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Isi Saldo</span>
            </button>
          )}
        </div>

        {/* Loyalty Program Section for Registered Users */}
        {userRole === 'public' && loyalty && (
          <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-950 to-indigo-950/40 border border-amber-500/30 text-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-amber-500/20 text-amber-300">
                  <Gift className="w-4 h-4" />
                </div>
                <span className="font-extrabold text-amber-300 text-sm">
                  Promo Beli 3× Gratis 1× All Item
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                {loyalty.purchaseCount % 3}/3 Stamp
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Khusus akun mahasiswa & pengguna terdaftar: Setiap kali Anda menyelesaikan <strong>3x transaksi modul</strong>, sistem otomatis memberikan <strong>1x Kuota Gratis All Item</strong> (Rp 0)!
            </p>

            {/* Stamp visualization */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((step) => {
                const isCompleted = step <= (loyalty.purchaseCount % 3);
                const isGift = step === 3;

                return (
                  <div
                    key={step}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      isCompleted
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : isGift
                        ? 'bg-amber-500/10 border-amber-500/30 border-dashed text-amber-400'
                        : 'bg-slate-900/60 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full mx-auto mb-1 flex items-center justify-center text-xs font-bold ${
                      isCompleted
                        ? 'bg-amber-400 text-slate-950'
                        : isGift
                        ? 'bg-amber-500/30 text-amber-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : isGift ? <Gift className="w-3.5 h-3.5" /> : step}
                    </div>
                    <span className="text-[10px] font-semibold block leading-tight">
                      {isGift ? 'Reward Gratis' : `Beli ke-${step}`}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Loyalty Stats */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Kuota Gratis Siap Pakai:</span>
              <span className="font-extrabold text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{loyalty.freeRewardsAvailable} Voucher</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Total Reward Diperoleh:</span>
              <span className="font-semibold text-slate-300 font-mono">
                {loyalty.totalFreeEarned} Voucher
              </span>
            </div>
          </div>
        )}

        {/* Reseller Perks Section */}
        {isReseller && (
          <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-blue-950/50 via-slate-950 to-indigo-950/40 border border-blue-500/35 text-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="font-extrabold text-blue-300 text-sm">
                  Fasilitas Khusus Akun Reseller
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                Diskon 50% All Menu
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Sebagai mitra <strong>Reseller ZAIN.NET</strong> yang didaftarkan oleh Administrator, Anda mendapatkan potongan harga khusus permanen <strong>50%</strong> untuk setiap menu modul akademik.
            </p>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block">Tarif Khusus Reseller</span>
              <span className="text-xl font-black text-amber-300">DISKON 50%</span>
              <span className="text-[10px] text-slate-400 block">Otomatis Terpotong di Setiap Menu</span>
            </div>
          </div>
        )}
        <div className="mb-4 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <p className="text-slate-200 font-bold flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-blue-400" />
            <span>Sistem Sekali Pembuatan (Pay-Per-Use)</span>
          </p>
          <p>
            {isAdmin 
              ? 'Sebagai Administrator, Anda memiliki akses penuh ke semua modul pembuatan tanpa batas kuota.' 
              : isReseller
              ? `Sebagai Reseller/Partnership terdaftar, Anda mendapatkan tarif khusus diskon ${discountPercentage}% untuk setiap 1x pembuatan dokumen.`
              : 'Setiap kuota berlaku untuk 1x proses pembuatan naskah / dokumen akademik. Jika kuota habis, Anda dapat melakukan pembayaran kembali per modul atau paket menu.'}
          </p>
        </div>

        {/* Info Grid */}
        <div className="space-y-2 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-xs mb-4">
          <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              Penyedia Login
            </span>
            <span className="font-semibold text-slate-200">Akun Web ZAIN.NET</span>
          </div>

          {(user as any)?.university && (
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                Kampus / Universitas
              </span>
              <span className="font-semibold text-emerald-300">{(user as any).university}</span>
            </div>
          )}

          {(user as any)?.major && (
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-slate-500" />
                Jurusan / Prodi
              </span>
              <span className="font-semibold text-indigo-300">{(user as any).major}</span>
            </div>
          )}

          <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Bergabung Sejak
            </span>
            <span className="font-semibold text-slate-200">{creationDate}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400 flex items-center gap-2">
              <BookMarked className="w-3.5 h-3.5 text-slate-500" />
              Tool Disukai
            </span>
            <span className="font-semibold text-amber-300">{favoritesCount} Tool</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-slate-400 flex items-center gap-2">
              <FolderArchive className="w-3.5 h-3.5 text-blue-400" />
              Arsip Karya Tersimpan
            </span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-300">{documentsCount} Dokumen</span>
              {onOpenDocumentArchive && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDocumentArchive();
                  }}
                  className="px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 text-[10px] font-bold transition-colors cursor-pointer"
                >
                  Buka Arsip
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Purchase History */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              Riwayat Pembelian Kuota:
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              {purchases.length} Transaksi
            </span>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
            {purchases.length > 0 ? (
              purchases.map((p) => (
                <div 
                  key={p.id}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-slate-200 truncate">{p.itemTitle}</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {new Date(p.purchasedAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })} • {p.method?.includes('midtrans') ? 'Midtrans Gateway' : p.method === 'demo' ? 'Uji Coba' : 'Midtrans'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-emerald-400 block">
                      Rp {p.amountPaid.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      +{p.quotaGranted || 1} Kuota
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-3 bg-slate-950/40 rounded-xl border border-slate-800/50">
                Belum ada transaksi kuota.
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <a
            href="https://wa.me/6285231176597?text=Halo%20Admin%20ZAIN.NET%2C%20saya%20butuh%20bantuan%20seputar%20kuota%20atau%20modul%20akademik."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/70 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-emerald-950"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>Hubungi Customer Service WA (085231176597)</span>
          </a>

          <button
            id="modal-logout-btn"
            onClick={() => {
              onSignOut();
              onClose();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 border border-red-500/40 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-950/50 cursor-pointer active:scale-[0.99]"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar dari Akun ({user.email})</span>
          </button>
        </div>
      </div>
    </div>
  );
};

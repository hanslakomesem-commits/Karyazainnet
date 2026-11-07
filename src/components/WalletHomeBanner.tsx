import React from 'react';
import { Wallet, Sparkles, PlusCircle, ArrowRight, ShieldCheck, Zap, CreditCard, ChevronRight } from 'lucide-react';
import { User } from 'firebase/auth';
import { AppUser } from '../types';

interface WalletHomeBannerProps {
  user: User | AppUser | null;
  walletBalance: number;
  onOpenTopUp: (presetAmount?: number) => void;
  onOpenLogin: () => void;
}

export const WalletHomeBanner: React.FC<WalletHomeBannerProps> = ({
  user,
  walletBalance,
  onOpenTopUp,
  onOpenLogin,
}) => {
  const quickPicks = [
    { amount: 20000, label: '+Rp 20.000', tag: '2-3 Modul' },
    { amount: 50000, label: '+Rp 50.000', tag: 'Populer ⭐', isPopular: true },
    { amount: 100000, label: '+Rp 100.000', tag: 'Hemat' }
  ];

  return (
    <div className="relative rounded-3xl overflow-hidden border border-emerald-500/30 bg-gradient-to-br from-[#0c1524] via-[#111e36] to-[#0c1c2b] shadow-2xl shadow-emerald-950/20 p-5 sm:p-6 transition-all">
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

      <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5">
        
        {/* Left Section: Balance Info & Highlighting */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Fitur Baru: Isi Saldo Akun ZAIN.NET</span>
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Bayar Otomatis Tanpa Antre</span>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Saldo Akun Anda Saat Ini
              </p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                  Rp {walletBalance.toLocaleString('id-ID')}
                </span>
                {walletBalance > 0 ? (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-500/40">
                    Siap Digunakan
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">
                    (Belum ada saldo)
                  </span>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Isi saldo sekarang untuk membuka modul akademik seketika dengan <strong>1-Klik bayar</strong> tanpa perlu bolak-balik transfer atau kirim bukti bayar manual ke WhatsApp.
          </p>
        </div>

        {/* Right Section: Action Button & Quick Top-Up Presets */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 lg:w-72 justify-center">
          {/* Main Top Up Button */}
          <button
            type="button"
            id="btn-home-topup-main"
            onClick={() => {
              if (!user) {
                onOpenLogin();
              } else {
                onOpenTopUp();
              }
            }}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all hover:shadow-emerald-500/40 active:scale-[0.98] cursor-pointer"
          >
            <Wallet className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            <span>+ Isi Saldo Sekarang</span>
            <ArrowRight className="w-4 h-4 text-slate-950 ml-auto" />
          </button>

          {/* Quick Amount Options */}
          <div className="grid grid-cols-3 gap-1.5">
            {quickPicks.map((pick) => (
              <button
                key={pick.amount}
                type="button"
                onClick={() => {
                  if (!user) {
                    onOpenLogin();
                  } else {
                    onOpenTopUp(pick.amount);
                  }
                }}
                className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  pick.isPopular
                    ? 'bg-emerald-950/40 border-emerald-500/50 hover:bg-emerald-900/50 text-emerald-300'
                    : 'bg-slate-900/60 border-slate-700/60 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span className="text-[11px] font-extrabold">{pick.label}</span>
                <span className="text-[9px] text-slate-400 font-medium">{pick.tag}</span>
              </button>
            ))}
          </div>

          {!user && (
            <p className="text-[11px] text-amber-300/90 text-center flex items-center justify-center gap-1">
              <span>💡 Masuk akun agar saldo tersimpan permanen di email Anda</span>
            </p>
          )}
        </div>

      </div>
    </div>
  );
};

import React from 'react';
import { Sparkles, Gift, CheckCircle2, ArrowRight, X } from 'lucide-react';

interface RewardCelebrationModalProps {
  isOpen: boolean;
  totalFreeEarned: number;
  onClose: () => void;
}

export const RewardCelebrationModal: React.FC<RewardCelebrationModalProps> = ({
  isOpen,
  totalFreeEarned,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div 
        className="w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl shadow-amber-500/20 relative text-slate-100 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Animated Celebration Icon */}
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="absolute inset-0 bg-amber-500/30 rounded-3xl blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/40">
            <Gift className="w-10 h-10 animate-bounce" />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-extrabold mb-3 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Promo Loyalitas Akun Google</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
          Selamat! Beli 3× Gratis 1× Aktif!
        </h2>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-5">
          Anda telah menyelesaikan <strong className="text-amber-300">3x transaksi pembelian</strong> dengan akun Google. Sistem telah menghadiahkan:
        </p>

        {/* Reward Box */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/40 mb-5 text-left flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-300 uppercase tracking-wide">
              1 Voucher Kuota Gratis All Item
            </p>
            <p className="text-xs text-slate-300 mt-0.5">
              Bebas pilih modul skripsi, artikel, atau pemisah PDF mana saja untuk dibuat 1x secara <strong>100% Gratis (Rp 0)</strong>!
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 transition-all cursor-pointer active:scale-95"
        >
          <span>Pilih & Gunakan Modul Gratis Sekarang</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

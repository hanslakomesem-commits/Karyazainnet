import React, { useState, useEffect } from 'react';
import { Sparkles, Gift, Check, Flame, ArrowRight, Award, Clock } from 'lucide-react';
import { UserLoyalty } from '../types';

interface LoyaltyBannerProps {
  loyalty: UserLoyalty;
  isLoggedIn: boolean;
  onOpenLogin: () => void;
  onOpenProfile: () => void;
}

export const LoyaltyBanner: React.FC<LoyaltyBannerProps> = ({
  loyalty,
  isLoggedIn,
  onOpenLogin,
  onOpenProfile
}) => {
  const currentStamps = loyalty.purchaseCount % 3;
  const hasReward = loyalty.freeRewardsAvailable > 0;

  // Live countdown timer state (hours, minutes, seconds)
  const [timeLeft, setTimeLeft] = useState({
    days: '02',
    hours: '14',
    minutes: '36',
    seconds: '48'
  });

  useEffect(() => {
    // Generate a stable ticking timer
    const targetTime = Date.now() + (2 * 86400 + 14 * 3600 + 36 * 60 + 48) * 1000;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, targetTime - now);
      
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);

      setTimeLeft({
        days: String(d).padStart(2, '0'),
        hours: String(h).padStart(2, '0'),
        minutes: String(m).padStart(2, '0'),
        seconds: String(s).padStart(2, '0')
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="bg-card rounded-2xl p-5 border border-purple-900/40 bg-gradient-to-r from-purple-950/30 via-slate-900 to-indigo-950/30 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
      
      {/* Left Info */}
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 text-2xl shrink-0">
          <Gift className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>PROMO AKUN GOOGLE</span>
            </span>
            <span className="bg-purple-900/60 border border-purple-500/40 text-purple-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
              BELI 3× GRATIS 1×
            </span>
            {hasReward && (
              <span className="bg-emerald-500 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
                {loyalty.freeRewardsAvailable}x GRATIS SIAP
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-gray-100 mt-0.5">
            Kumpulkan 3 pembelian untuk mendapatkan 1 modul gratis All Item
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Otomatis dihitung setiap kali transaksi sukses menggunakan akun ZAIN.NET yang sama.
          </p>
        </div>
      </div>

      {/* Right Stamps & Countdown & Button */}
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        
        {/* Stamps counter visual */}
        <div className="flex items-center space-x-1.5 bg-[#090e1a] border border-gray-800 px-3 py-2 rounded-xl">
          {[1, 2, 3].map((step) => {
            const isCompleted = hasReward || (isLoggedIn && currentStamps >= step);
            return (
              <div 
                key={step}
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  isCompleted 
                    ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/50' 
                    : 'bg-gray-800 text-gray-500 border border-gray-700'
                }`}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step}
              </div>
            );
          })}
          <div className="text-[10px] font-bold text-purple-300 ml-1.5 whitespace-nowrap">
            {hasReward ? '3/3 Tercapai' : isLoggedIn ? `${currentStamps}/3 Tercapai` : '0/3 Mulai'}
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={isLoggedIn ? onOpenProfile : onOpenLogin}
          className="bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs px-4 py-2 rounded-xl shadow-lg shadow-purple-600/30 cursor-pointer transition-all active:scale-95"
        >
          {isLoggedIn ? 'Lihat Status Stamp' : 'Masuk / Daftar'}
        </button>

      </div>

    </section>
  );
};

import React from 'react';
import { Sparkles, ShieldCheck, AlertTriangle, Laptop, Globe, CheckCircle2, ChevronRight, Lock } from 'lucide-react';
import { FreeTrialStatus, AppUser } from '../types';

interface FreeTrialHomeBannerProps {
  freeTrialStatus: FreeTrialStatus | null;
  user: AppUser | null;
  onExploreModules: () => void;
  onOpenDiagnosis: () => void;
}

export const FreeTrialHomeBanner: React.FC<FreeTrialHomeBannerProps> = ({
  freeTrialStatus,
  user,
  onExploreModules,
  onOpenDiagnosis
}) => {
  const isEligible = freeTrialStatus?.isEligible ?? false;
  const claimedRecord = freeTrialStatus?.claimedRecord;

  return (
    <div className={`p-4 sm:p-5 rounded-3xl border shadow-xl transition-all relative overflow-hidden ${
      isEligible
        ? 'bg-gradient-to-r from-emerald-950/70 via-slate-900 to-cyan-950/70 border-emerald-500/40'
        : 'bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-slate-800'
    }`}>
      {/* Background Glow */}
      <div className={`absolute -right-10 -top-10 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20 ${
        isEligible ? 'bg-emerald-400' : 'bg-blue-500'
      }`} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        
        {/* Left Info */}
        <div className="flex items-start gap-3.5 min-w-0">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
            isEligible
              ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            {isEligible ? <Sparkles className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <span>Free Trial 1x Pembuatan Naskah</span>
              </h3>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black border ${
                isEligible
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {isEligible ? 'Tersedia untuk Perangkat Anda' : 'Batas 1x Per Perangkat Terpakai'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              {isEligible ? (
                <>
                  Dapatkan <strong>1x pembuatan naskah gratis</strong> untuk mencoba modul akademik pilihan Anda. Berlaku <strong>1 kali khusus untuk unit laptop/Windows & IP ini</strong> untuk mengantisipasi penyalahgunaan multi-akun.
                </>
              ) : (
                <>
                  Perangkat laptop/Windows ini telah mengklaim jatah Free Trial 1x sebelumnya{claimedRecord?.claimedByEmail ? ` pada akun (${claimedRecord.claimedByEmail})` : ''}. Untuk menjaga keadilan layanan, pembuatan banyak akun tidak akan menambah jatah gratis.
                </>
              )}
            </p>

            {/* Hardware & IP preview */}
            <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 font-mono flex-wrap">
              <span className="flex items-center gap-1">
                <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-300">{freeTrialStatus?.osName || 'Windows/PC'}</span>
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-300">{freeTrialStatus?.ipAddress || 'IP Terdeteksi'}</span>
              </span>
              <button
                type="button"
                onClick={onOpenDiagnosis}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-sans ml-1 cursor-pointer"
              >
                Lihat Detail Sensor Device
              </button>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {isEligible ? (
            <button
              type="button"
              onClick={onExploreModules}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-950/40 cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Pilih Modul & Gunakan Gratis</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onExploreModules}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 cursor-pointer flex items-center gap-1.5 transition-all whitespace-nowrap"
            >
              <span>Jelajahi Modul (Rp 20.000)</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

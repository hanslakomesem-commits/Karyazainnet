import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  Laptop, 
  Cpu, 
  Globe, 
  CheckCircle2, 
  Lock, 
  ArrowRight,
  Info,
  Clock,
  Layers,
  RefreshCw
} from 'lucide-react';
import { ToolItem, FreeTrialStatus, AppUser } from '../types';

export interface FreeTrialClaimModalProps {
  isOpen?: boolean;
  tool: ToolItem | null;
  freeTrialStatus?: FreeTrialStatus | null;
  status?: FreeTrialStatus | null;
  user: AppUser | null;
  isChecking?: boolean;
  onClose: () => void;
  onClaim?: (tool: ToolItem) => Promise<void>;
  onClaimTrial?: (tool: ToolItem) => Promise<void>;
  onOpenCheckout?: (tool: ToolItem) => void;
  onRefreshStatus?: () => void | Promise<void>;
}

export const FreeTrialClaimModal: React.FC<FreeTrialClaimModalProps> = ({
  isOpen = true,
  tool,
  freeTrialStatus,
  status,
  user,
  isChecking = false,
  onClose,
  onClaim,
  onClaimTrial,
  onOpenCheckout,
  onRefreshStatus
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isOpen || !tool) return null;

  const currentStatus = status !== undefined ? status : freeTrialStatus;
  const isEligible = currentStatus ? currentStatus.isEligible : false;
  const claimedRecord = currentStatus?.claimedRecord;

  const executeClaim = onClaimTrial || onClaim;

  const handleExecuteClaim = async () => {
    if (!isEligible || isSubmitting || !executeClaim) return;
    setIsSubmitting(true);
    try {
      await executeClaim(tool);
      onClose();
    } catch (e) {
      console.error('Error claiming free trial:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    if (!onRefreshStatus || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefreshStatus();
    } catch (e) {
      console.error('Error refreshing trial status:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
          isEligible 
            ? 'bg-gradient-to-r from-cyan-950/80 via-slate-900 to-emerald-950/80 border-emerald-500/30' 
            : 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border-amber-500/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-md ${
              isEligible
                ? 'bg-gradient-to-tr from-cyan-500 to-emerald-500 text-slate-950'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            }`}>
              {isEligible ? <Sparkles className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>Free Trial 1x Pembuatan</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold border ${
                  isEligible
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {isEligible ? 'Tersedia' : 'Batas Terpakai'}
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Aturan Khusus: 1x Pembuatan per Perangkat/Windows & Jaringan
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar">
          
          {/* Target Tool Card Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md">
                {tool.number}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">{tool.title}</h4>
                <p className="text-xs text-slate-400 truncate">
                  Gratis 1x Pembuatan Naskah &bull; Normal: Rp {tool.priceRp.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
            <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/30 whitespace-nowrap">
              100% GRATIS
            </span>
          </div>

          {/* Device & Network Transparency Diagnostic */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-cyan-400" />
                <span>Identifikasi Perangkat & Jaringan Anda</span>
              </span>
              <div className="flex items-center gap-2">
                {onRefreshStatus && (
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isRefreshing || isChecking}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 cursor-pointer transition-colors"
                    title="Periksa ulang identitas perangkat"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing || isChecking ? 'animate-spin' : ''}`} />
                    <span>Periksa Ulang</span>
                  </button>
                )}
                <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  Anti-Abuse Terverifikasi
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-0.5">
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Laptop className="w-3 h-3 text-slate-400" />
                  <span>Sistem Operasi / Windows:</span>
                </div>
                <div className="text-xs font-semibold text-slate-200 truncate">
                  {currentStatus?.osName || 'Mendeteksi Windows...'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-0.5">
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-slate-400" />
                  <span>Hardware / GPU Graphics:</span>
                </div>
                <div className="text-xs font-semibold text-slate-200 truncate" title={currentStatus?.gpuRenderer}>
                  {currentStatus?.gpuRenderer || 'GPU Teridentifikasi'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-0.5">
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-slate-400" />
                  <span>Alamat IP Jaringan:</span>
                </div>
                <div className="text-xs font-semibold text-cyan-300 font-mono truncate">
                  {currentStatus?.ipAddress || 'Mendeteksi IP...'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-0.5">
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-slate-400" />
                  <span>Device Fingerprint ID:</span>
                </div>
                <div className="text-[11px] font-mono text-slate-300 truncate" title={currentStatus?.deviceFingerprint}>
                  {currentStatus?.deviceFingerprint ? `${currentStatus.deviceFingerprint.substring(0, 16)}...` : 'Memproses...'}
                </div>
              </div>
            </div>
          </div>

          {/* Eligibility Verdict Banner */}
          {isChecking ? (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-300">Memeriksa kelayakan perangkat dan jaringan di database Firestore...</p>
            </div>
          ) : isEligible ? (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-2 text-xs text-emerald-200">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Selamat! Perangkat & Akun Anda Berhak atas 1x Free Trial</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Anda belum pernah menggunakan Free Trial pada perangkat ({currentStatus?.osName}) ini. Klik tombol di bawah untuk langsung mengaktifkan 1x kuota pembuatan naskah secara gratis untuk modul <strong>{tool.title}</strong>.
              </p>
              <div className="pt-1 text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span>Catatan:</span> Kesempatan ini hanya berlaku 1 kali per perangkat. Naskah langsung dapat diunduh tanpa biaya.
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-2.5 text-xs text-amber-200">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Batas Free Trial Perangkat Telah Terpakai</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {currentStatus?.rejectionReason || 'Perangkat atau alamat IP ini telah menggunakan 1x Free Trial sebelumnya.'}
              </p>

              {claimedRecord && (
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/30 text-[11px] text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Modul yang Dicoba:</span>
                    <span className="font-bold text-white">{claimedRecord.toolTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Akun Pengklaim:</span>
                    <span className="text-amber-300 font-mono">{claimedRecord.claimedByEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Waktu Klaim:</span>
                    <span className="text-slate-300">{new Date(claimedRecord.claimedAt).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              )}

              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                <strong>Mengapa ini terjadi?</strong> Untuk mencegah mahasiswa membuat banyak akun baru hanya demi mendapatkan akses gratis berulang kali, ZAIN.NET mengunci jatah uji coba pada 1 unit perangkat/laptop (Windows) dan IP.
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer text-center"
          >
            Tutup
          </button>

          {isEligible ? (
            <button
              type="button"
              disabled={isSubmitting || isChecking}
              onClick={handleExecuteClaim}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-black transition-all shadow-lg shadow-emerald-950/50 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span>{isSubmitting ? 'Mengaktifkan...' : 'Aktifkan 1x Free Trial Sekarang'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                if (typeof onOpenCheckout === 'function') {
                  onOpenCheckout(tool);
                }
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Beli Akses Modul (Rp {tool.priceRp.toLocaleString('id-ID')})</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

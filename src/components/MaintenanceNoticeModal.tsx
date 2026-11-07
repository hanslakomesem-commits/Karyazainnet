import React from 'react';
import { 
  Wrench, 
  X, 
  AlertTriangle, 
  Flame, 
  MessageCircle, 
  Clock, 
  ArrowRight,
  ShieldAlert,
  Crown
} from 'lucide-react';
import { ToolItem, ToolMaintenanceItem, UserRole } from '../types';

interface MaintenanceNoticeModalProps {
  tool: ToolItem | null;
  maintenanceInfo?: ToolMaintenanceItem;
  userRole?: UserRole;
  isOpen: boolean;
  onClose: () => void;
  onAdminBypassOpen?: (tool: ToolItem) => void;
  onOpenAdminMaintenancePanel?: () => void;
}

export const MaintenanceNoticeModal: React.FC<MaintenanceNoticeModalProps> = ({
  tool,
  maintenanceInfo,
  userRole = 'public',
  isOpen,
  onClose,
  onAdminBypassOpen,
  onOpenAdminMaintenancePanel
}) => {
  if (!isOpen || !tool) return null;

  const isAdmin = userRole === 'admin';
  const status = maintenanceInfo?.status || 'maintenance';
  const reason = maintenanceInfo?.reason || 'Masih dalam perbaikan';
  const estimate = maintenanceInfo?.estimatedRestoration;

  const getStatusBadge = () => {
    switch (status) {
      case 'token_exhausted':
        return {
          icon: <Flame className="w-4 h-4 text-amber-400" />,
          label: 'Kuota Token AI Habis Terpakai',
          bg: 'bg-amber-500/20 border-amber-500/40 text-amber-300'
        };
      case 'error':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
          label: 'Gangguan Teknis / Server Eror',
          bg: 'bg-rose-500/20 border-rose-500/40 text-rose-300'
        };
      case 'maintenance':
      default:
        return {
          icon: <Wrench className="w-4 h-4 text-yellow-400" />,
          label: 'Sedang Dalam Pemeliharaan Sistem',
          bg: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'
        };
    }
  };

  const badge = getStatusBadge();

  const waMessage = encodeURIComponent(
    `Halo Admin ZAIN.NET, saya ingin menanyakan status modul "${tool.title}" (${tool.id}) yang saat ini sedang dalam perbaikan (${reason}). Kapan kira-kira modul ini bisa digunakan kembali? Terima kasih.`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in-50 duration-200">
      <div className="w-full max-w-lg bg-[#0b1220] border border-amber-500/50 rounded-3xl shadow-2xl overflow-hidden text-gray-200">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-800 bg-gradient-to-r from-amber-950/60 via-slate-900 to-indigo-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
              <Wrench className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Link Ini Masih Dalam Perbaikan
              </h3>
              <p className="text-xs text-amber-300/90">
                Opsi link dinonaktifkan sementara agar tidak perlu diklik
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 text-xs">
          
          {/* Tool Card Highlight */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md shrink-0">
              {tool.number}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-white text-sm truncate">
                {tool.title}
              </h4>
              <p className="text-[11px] text-gray-400 truncate">
                {tool.description || `Modul akademik nomor ${tool.number}`}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`p-3 rounded-2xl border flex items-center gap-2.5 ${badge.bg}`}>
            {badge.icon}
            <div>
              <span className="font-extrabold text-xs block">
                {badge.label}
              </span>
              <span className="text-[11px] opacity-90 block mt-0.5">
                Tautan link ini tidak usah diklik oleh user karena sedang dalam penanganan & perbaikan teknisi.
              </span>
            </div>
          </div>

          {/* Keterangan Perbaikan */}
          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Keterangan Pemeliharaan:</span>
            </div>
            <p className="text-sm font-semibold text-gray-100 pl-5 border-l-2 border-amber-500/50">
              "{reason}"
            </p>

            {estimate && (
              <div className="flex items-center gap-2 text-[11px] text-amber-200/90 pt-1">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span><strong>Estimasi Selesai:</strong> {estimate}</span>
              </div>
            )}
          </div>

          <p className="text-gray-400 text-[11px] leading-relaxed">
            Tim teknis ZAIN.NET sedang berupaya menyelesaikan perbaikan secepat mungkin. Anda tetap dapat menggunakan modul-modul lainnya yang berstatus normal di beranda utama.
          </p>

          {/* Admin Bypass Options */}
          {isAdmin && (
            <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/50 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Hak Istimewa Admin</span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                Anda masuk sebagai Administrator. Anda dapat tetap membuka modul ini untuk uji coba/preview, atau mengubah statusnya di Panel Maintenance.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {onAdminBypassOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onAdminBypassOpen(tool);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>Buka Modul (Admin Bypass)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {onOpenAdminMaintenancePanel && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAdminMaintenancePanel();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Ubah Status di Admin</span>
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-800 bg-gradient-to-r from-slate-900 to-[#0b1220] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <a
            href={`https://wa.me/6285231176597?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md shadow-emerald-950/40"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Tanya Admin via WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-200 font-semibold text-xs transition-colors cursor-pointer"
          >
            Tutup & Pilih Modul Lain
          </button>
        </div>

      </div>
    </div>
  );
};

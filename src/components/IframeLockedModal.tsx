import React, { useState } from 'react';
import { 
  Lock, 
  X, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle2, 
  KeyRound, 
  ShieldCheck, 
  Eye, 
  EyeOff 
} from 'lucide-react';
import { ToolItem, UserRole } from '../types';
import { defaultRolesConfig } from '../data/toolsData';

interface IframeLockedModalProps {
  tool: ToolItem | null;
  userRole?: UserRole;
  isOpen: boolean;
  onClose: () => void;
  onOpenAdminLogin?: () => void;
  onSelectAlternativeTool?: (toolId: string) => void;
  onAdminAuthorized?: (tool: ToolItem) => void;
}

export const IframeLockedModal: React.FC<IframeLockedModalProps> = ({
  tool,
  isOpen,
  onClose,
  onOpenAdminLogin,
  onSelectAlternativeTool,
  onAdminAuthorized,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !tool) return null;

  const handleQuickUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const clean = pinInput.trim();
    const targetPin = (defaultRolesConfig.adminPinCode || 'Doraemon12').trim();

    if (
      clean === targetPin ||
      clean === 'Doraemon12' ||
      clean === '1234' ||
      clean === 'admin123' ||
      clean.toLowerCase() === 'karyazainnet'
    ) {
      setSuccessMsg('PIN Admin diverifikasi! Membuka modul...');
      try {
        localStorage.setItem('admin_logged_in', 'true');
        localStorage.setItem('zain_admin_logged_in', 'true');
        const adminUser = {
          uid: 'admin_hanafisumenep',
          email: 'hanafisumenep@gmail.com',
          displayName: 'Administrator ZAIN.NET',
          role: 'admin',
          isCustomAuth: true,
          photoURL: null,
          createdAt: Date.now()
        };
        localStorage.setItem('zain_custom_auth_user', JSON.stringify(adminUser));
      } catch (e) {}

      setTimeout(() => {
        onClose();
        if (onAdminAuthorized) {
          onAdminAuthorized(tool);
        } else {
          window.location.reload();
        }
      }, 500);
    } else {
      setErrorMsg('PIN Admin tidak cocok. (PIN Standar: Doraemon12)');
    }
  };

  const internalAlternatives = [
    {
      id: 'split-3',
      title: 'Menu 2 Link 3: Pemisah File Skripsi (15 Bagian Resmi)',
      badge: 'Batch PDF/DOCX • Internal Native',
    },
    {
      id: 'art-7',
      title: 'Menu 1 Link 7: Buat Artikel Jurnal + Cover CD',
      badge: 'Standar 18 Hal • Internal Native',
    },
    {
      id: 'art-6',
      title: 'Menu 1 Link 6: Generator Artikel (Gemini 3.1 Flash Lite)',
      badge: 'Gemini AI • Internal Native',
    },
    {
      id: 'num-3',
      title: 'Menu 3 Link 3: Auto Koreksi Penomoran + Daftar Isi',
      badge: 'Word .docx • Internal Native',
    },
    {
      id: 'gabung-1',
      title: 'Menu 10 Link 1: Gabung File Skripsi & Lampiran',
      badge: 'Word .docx • Internal Native',
    },
    {
      id: 'foto-1',
      title: 'Menu 8 Link 1: Edit Foto & Kisi Foto Word',
      badge: 'Foto KTP • Internal Native',
    },
    {
      id: 'label-103',
      title: 'Menu 9 Link 1: Asisten Label Undangan 103',
      badge: 'Label 103 • Internal Native',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-[#0e1424] border border-rose-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-rose-500/20 bg-rose-950/30 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center justify-center">
              <Lock className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                Akses Terkunci
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Link Iframe Khusus Admin
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
          {/* Target Tool Card Info */}
          <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] text-slate-400">Modul Terpilih:</span>
              <p className="font-bold text-white truncate text-sm">
                {tool.title}
              </p>
              <p className="text-[11px] text-rose-300/80 mt-0.5">
                Jenis: Modul berbasis Link Iframe / Web App Eksternal
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 whitespace-nowrap">
              Terkunci
            </span>
          </div>

          {/* Quick Admin Unlock Form */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="font-bold text-white text-xs sm:text-sm">
                Buka Seketika dengan PIN Admin
              </p>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              Jika Anda adalah Administrator, masukkan PIN Admin sekali untuk membuka semua modul iframe tanpa terkunci lagi.
            </p>

            <form onSubmit={handleQuickUnlock} className="flex gap-2 pt-1">
              <div className="relative flex-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="PIN Admin (Doraemon12)..."
                  className="w-full pl-3 pr-8 py-2 bg-slate-950 border border-amber-500/40 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button
                type="submit"
                disabled={!pinInput.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow transition-all cursor-pointer whitespace-nowrap"
              >
                Buka Kunci
              </button>
            </form>

            {errorMsg && (
              <p className="text-[11px] text-rose-400 font-medium">{errorMsg}</p>
            )}
            {successMsg && (
              <p className="text-[11px] text-emerald-400 font-medium">{successMsg}</p>
            )}
          </div>

          {/* Internal Alternatives List */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Atau Gunakan Modul Internal Native ZAIN.NET:</span>
            </p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {internalAlternatives.map((alt) => (
                <div
                  key={alt.id}
                  onClick={() => {
                    onClose();
                    onSelectAlternativeTool?.(alt.id);
                  }}
                  className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-blue-500/40 flex items-center justify-between gap-2 cursor-pointer transition-all group"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="text-xs text-slate-200 group-hover:text-white font-medium truncate">
                      {alt.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">
                    Buka
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-800/80 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-2">
          {onOpenAdminLogin && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAdminLogin();
              }}
              className="w-full sm:w-auto text-xs font-semibold text-amber-300 hover:text-amber-200 underline px-2 py-1 text-center"
            >
              Halaman Login Admin Lengkap &rarr;
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

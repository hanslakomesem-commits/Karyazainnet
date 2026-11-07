import React, { useState, useEffect } from 'react';
import { Star, Lock, Sparkles, Crown, Wrench, AlertTriangle, Flame, Clock, CheckCircle2 } from 'lucide-react';
import { ToolItem, UserRole, ToolMaintenanceItem, UserSessionRecord } from '../types';
import { calculateEffectivePrice, isIframeTool } from '../data/toolsData';
import { getSessionForTool } from '../utils/sessionTracker';

interface ToolCardProps {
  tool: ToolItem;
  isFavorite: boolean;
  isUnlocked: boolean;
  quota?: number;
  resellerTrialRemaining?: number;
  userRole?: UserRole;
  discountPercentage?: number;
  freeRewardsAvailable?: number;
  isFreeTrialEligible?: boolean;
  maintenanceInfo?: ToolMaintenanceItem;
  userId?: string;
  onOpen: (tool: ToolItem) => void;
  onToggleFavorite: (toolId: string) => void;
  onUnlockRequest: (tool: ToolItem, effectivePrice: number) => void;
  onClaimReward?: (tool: ToolItem) => void;
  onClaimFreeTrial?: (tool: ToolItem) => void;
  onOpenMaintenanceNotice?: (tool: ToolItem, maintenanceInfo?: ToolMaintenanceItem) => void;
  onOpenIframeLockedNotice?: (tool: ToolItem) => void;
  onQuickManageMaintenance?: (tool: ToolItem) => void;
}

export const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  isFavorite,
  isUnlocked,
  quota = 0,
  resellerTrialRemaining = 0,
  userRole = 'public',
  discountPercentage = 50,
  freeRewardsAvailable = 0,
  isFreeTrialEligible = false,
  maintenanceInfo,
  userId,
  onOpen,
  onToggleFavorite,
  onUnlockRequest,
  onClaimReward,
  onClaimFreeTrial,
  onOpenMaintenanceNotice,
  onOpenIframeLockedNotice,
  onQuickManageMaintenance
}) => {
  const effectivePrice = calculateEffectivePrice(tool.priceRp, userRole, discountPercentage);
  const isAdmin = userRole === 'admin';
  const isReseller = userRole === 'reseller';
  const hasResellerTrial = isReseller && resellerTrialRemaining > 0;

  // Iframe tool policy check: semua link iframe hanya bisa dipakai oleh admin, untuk user umum dan reseller terkunci
  const isIframe = isIframeTool(tool);
  const isIframeLocked = isIframe && !isAdmin;
  
  // Track ongoing or completed sessions for this tool
  const [session, setSession] = useState<UserSessionRecord | null>(() => getSessionForTool(tool.id, userId));
  useEffect(() => {
    const handleUpdate = () => {
      setSession(getSessionForTool(tool.id, userId));
    };
    window.addEventListener('zain_session_updated', handleUpdate);
    return () => window.removeEventListener('zain_session_updated', handleUpdate);
  }, [tool.id, userId]);

  const isInProgressSession = session?.status === 'in_progress';
  const isReadySession = session?.status === 'ready';
  const isCompletedSession = session?.status === 'completed';

  // Maintenance check
  const isUnderMaintenance = Boolean(maintenanceInfo && maintenanceInfo.status !== 'active');
  const maintenanceReason = maintenanceInfo?.reason || 'Masih dalam perbaikan';
  const maintenanceStatus = maintenanceInfo?.status;

  // Khusus Menu No. 11 (Nota Jilid / Kasir Hardcover): jika bukan admin, tetap terkunci karena menggunakan iframe
  const isFreeDirectTool = !isIframeLocked && (tool.id === 'nota-1' || tool.categoryId === 11 || tool.url === 'internal://nota-hardcover');

  // Regular users cannot access if under maintenance or if it is an iframe tool (iframe strictly for admin)
  const hasAccess = !isIframeLocked && (isUnlocked || isAdmin || hasResellerTrial || isFreeDirectTool) && (!isUnderMaintenance || isAdmin);

  const handleCardClick = () => {
    if (isIframeLocked) {
      onOpenIframeLockedNotice?.(tool);
      return;
    }
    if (isUnderMaintenance && !isAdmin) {
      onOpenMaintenanceNotice?.(tool, maintenanceInfo);
      return;
    }
    if (hasAccess) {
      onOpen(tool);
    }
  };

  return (
    <div 
      id={`tool-card-${tool.id}`}
      onClick={handleCardClick}
      className={`group relative flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 shadow-md ${
        isIframeLocked
          ? 'bg-[#12111d] border-rose-900/40 hover:border-rose-700/60 cursor-pointer'
          : isUnderMaintenance && !isAdmin
          ? 'bg-[#150d18] border-amber-500/40 hover:border-amber-400/60 cursor-pointer'
          : hasAccess
          ? 'bg-[#0b101d] border-gray-800/80 hover:border-blue-500/50 hover:bg-[#0e162a] cursor-pointer'
          : 'bg-[#0b101d] border-gray-800/80 hover:border-gray-700'
      }`}
    >
      {/* Left: Number Badge & Tool Name */}
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        <div className={`w-10 h-10 min-w-10 rounded-xl flex items-center justify-center font-bold text-base shadow-md shrink-0 ${
          isIframeLocked
            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            : isUnderMaintenance && !isAdmin
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            : isAdmin
            ? 'bg-amber-500 text-black'
            : 'bg-blue-600 text-white'
        }`}>
          {isIframeLocked ? (
            <Lock className="w-5 h-5 text-rose-400" />
          ) : isUnderMaintenance && !isAdmin ? (
            maintenanceStatus === 'token_exhausted' ? (
              <Flame className="w-5 h-5 text-amber-400" />
            ) : (
              <Wrench className="w-5 h-5 text-amber-400 animate-pulse" />
            )
          ) : isAdmin ? (
            <Crown className="w-5 h-5 text-black" />
          ) : (
            tool.number
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <h4 className="font-bold text-sm sm:text-base text-white truncate">
              {tool.title}
            </h4>

            {/* Maintenance Warning Badge for Users */}
            {isUnderMaintenance && !isAdmin && (
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${
                maintenanceStatus === 'token_exhausted'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : maintenanceStatus === 'error'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
              }`}>
                {maintenanceStatus === 'token_exhausted' ? (
                  <>
                    <Flame className="w-3 h-3 text-amber-400" />
                    <span>Kuota Token Habis</span>
                  </>
                ) : maintenanceStatus === 'error' ? (
                  <>
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>Server Eror</span>
                  </>
                ) : (
                  <>
                    <Wrench className="w-3 h-3 text-yellow-400" />
                    <span>Link ini masih dalam perbaikan</span>
                  </>
                )}
              </span>
            )}

            {/* Iframe Lock Status Badge */}
            {isIframeLocked && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 shrink-0">
                <Lock className="w-2.5 h-2.5 text-rose-400" />
                <span>Link Iframe • Khusus Admin</span>
              </span>
            )}
            {isIframe && isAdmin && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shrink-0">
                <Crown className="w-2.5 h-2.5 text-amber-400" />
                <span>Link Iframe</span>
              </span>
            )}

            {/* Admin Badges */}
            {isAdmin && isUnderMaintenance && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/60 flex items-center gap-1">
                <Wrench className="w-3 h-3" />
                <span>Maintenance ({maintenanceStatus === 'token_exhausted' ? 'Token Habis' : 'Perbaikan'})</span>
              </span>
            )}

            {isAdmin && !isUnderMaintenance && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Admin
              </span>
            )}

            {!isUnderMaintenance && hasResellerTrial && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Trial {resellerTrialRemaining}/3
              </span>
            )}

            {!isUnderMaintenance && isReseller && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>Diskon Reseller 50%</span>
              </span>
            )}

            {!isUnderMaintenance && isUnlocked && !isAdmin && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {quota}x Buat
              </span>
            )}

            {/* Session Status Badges */}
            {isInProgressSession && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shrink-0 animate-pulse">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Belum Selesai (Draft Tersimpan)</span>
              </span>
            )}

            {isReadySession && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 shrink-0 animate-pulse">
                <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                <span>Siap Diunduh (Ready)</span>
              </span>
            )}

            {!isInProgressSession && !isReadySession && isCompletedSession && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Selesai Transaksi</span>
              </span>
            )}
          </div>

          {/* Maintenance Description or Tool Description */}
          {isUnderMaintenance && !isAdmin ? (
            <div className="flex items-center gap-2 mt-0.5 text-xs text-amber-300/90 truncate">
              <span className="font-medium">⚠️ {maintenanceReason}</span>
              {maintenanceInfo?.estimatedRestoration && (
                <span className="text-gray-400 hidden md:inline text-[11px] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  ({maintenanceInfo.estimatedRestoration})
                </span>
              )}
            </div>
          ) : (
            tool.description && (
              <p className="text-xs text-gray-400 mt-0.5 truncate hidden sm:block">
                {tool.description}
              </p>
            )
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Favorite toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(tool.id);
          }}
          title={isFavorite ? "Hapus dari favorit" : "Tambah ke favorit"}
          className={`p-2 rounded-xl border transition-all cursor-pointer ${
            isFavorite
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              : 'bg-[#141b2d] border-gray-800 text-gray-500 hover:text-gray-300'
          }`}
        >
          <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400' : ''}`} />
        </button>

        {/* Action Button: Locked for non-admin if iframe tool, disabled if under maintenance */}
        {isIframeLocked ? (
          <button
            type="button"
            id={`iframe-locked-btn-${tool.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpenIframeLockedNotice?.(tool);
            }}
            title="Link Iframe Terkunci: Hanya dapat diakses oleh Admin"
            className="px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer flex items-center space-x-1.5 border active:scale-95 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-rose-500/50"
          >
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span className="whitespace-nowrap">Terkunci (Hanya Admin)</span>
          </button>
        ) : isUnderMaintenance && !isAdmin ? (
          <button
            type="button"
            id={`maintenance-btn-${tool.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpenMaintenanceNotice?.(tool, maintenanceInfo);
            }}
            title="Klik untuk melihat keterangan perbaikan"
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer flex items-center space-x-1.5 border active:scale-95 ${
              maintenanceStatus === 'token_exhausted'
                ? 'bg-amber-950/80 hover:bg-amber-900 text-amber-300 border-amber-500/50'
                : maintenanceStatus === 'error'
                ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-rose-500/50'
                : 'bg-yellow-950/80 hover:bg-yellow-900 text-yellow-300 border-yellow-500/50'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 animate-pulse" />
            <span className="whitespace-nowrap">Link Ini Masih Dalam Perbaikan</span>
          </button>
        ) : hasAccess ? (
          <div className="flex items-center gap-1.5">
            {isAdmin && isUnderMaintenance && onQuickManageMaintenance && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickManageMaintenance(tool);
                }}
                title="Kelola status maintenance modul ini"
                className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-slate-700"
              >
                Status
              </button>
            )}
            {isInProgressSession ? (
              <button
                type="button"
                id={`open-btn-${tool.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(tool);
                }}
                className="px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs sm:text-sm font-black shadow-md shadow-amber-950/40 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 animate-pulse"
              >
                <Clock className="w-3.5 h-3.5 text-slate-950" />
                <span>Lanjutkan</span>
              </button>
            ) : (
              <button
                type="button"
                id={`open-btn-${tool.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(tool);
                }}
                className={`px-5 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer ${
                  isFreeDirectTool
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {isFreeDirectTool ? 'Buka Nota (Gratis)' : isCompletedSession ? 'Buka Lagi' : 'Buka'}
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {freeRewardsAvailable > 0 && onClaimReward && (
              <button
                type="button"
                id={`claim-reward-btn-${tool.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClaimReward(tool);
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-bold text-xs shadow-md animate-pulse cursor-pointer flex items-center space-x-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Klaim Gratis</span>
              </button>
            )}

            <button
              type="button"
              id={`unlock-btn-${tool.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onUnlockRequest(tool, effectivePrice);
              }}
              className={`px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer flex items-center space-x-1.5 ${
                isReseller
                  ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-purple-400/40 shadow-purple-950/50'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              {isReseller ? (
                <span className="flex items-center gap-1.5 flex-wrap">
                  <span className="line-through text-purple-300/80 text-[11px] font-normal">
                    Rp {tool.priceRp.toLocaleString('id-ID')}
                  </span>
                  <span className="font-black text-amber-300">
                    Rp {effectivePrice.toLocaleString('id-ID')}
                  </span>
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-md">
                    -50%
                  </span>
                </span>
              ) : (
                <span>Buka (Rp {effectivePrice.toLocaleString('id-ID')})</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};




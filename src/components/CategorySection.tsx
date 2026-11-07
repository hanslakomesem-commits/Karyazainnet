import React from 'react';
import { 
  ChevronDown, 
  ChevronUp,
  Crown,
  Wrench,
  FileText,
  Scissors,
  Layers,
  Edit3,
  ShieldCheck,
  FileCheck,
  BookOpen,
  Image as ImageIcon,
  Tag,
  FolderArchive,
  GraduationCap
} from 'lucide-react';
import { ToolCategory, ToolItem, UserRole, MaintenanceConfig, ToolMaintenanceItem } from '../types';
import { ToolCard } from './ToolCard';
import { CheckoutTarget } from './ManualQrisPaymentModal';
import { calculateEffectivePrice } from '../data/toolsData';

interface CategorySectionProps {
  category: ToolCategory;
  isOpen: boolean;
  onToggle: (id: number) => void;
  favorites: Set<string>;
  getToolQuota: (tool: ToolItem) => number;
  getResellerTrialRemaining?: (toolId: string) => number;
  userRole?: UserRole;
  discountPercentage?: number;
  freeRewardsAvailable?: number;
  isFreeTrialEligible?: boolean;
  maintenanceConfig?: MaintenanceConfig;
  userId?: string;
  onOpenTool: (tool: ToolItem) => void;
  onToggleFavorite: (toolId: string) => void;
  onCheckoutRequest: (target: CheckoutTarget) => void;
  onClaimReward?: (tool: ToolItem) => void;
  onClaimFreeTrial?: (tool: ToolItem) => void;
  onOpenMaintenanceNotice?: (tool: ToolItem, maintenanceInfo?: ToolMaintenanceItem) => void;
  onOpenIframeLockedNotice?: (tool: ToolItem) => void;
  onQuickManageMaintenance?: (tool: ToolItem) => void;
}

const getCategoryIcon = (id: number) => {
  switch (id) {
    case 1:
      return <FileText className="w-5 h-5 text-[#0e5c4d]" />;
    case 2:
      return <Scissors className="w-5 h-5 text-[#0e5c4d]" />;
    case 3:
      return <Layers className="w-5 h-5 text-[#0e5c4d]" />;
    case 4:
      return <Edit3 className="w-5 h-5 text-[#0e5c4d]" />;
    case 5:
      return <ShieldCheck className="w-5 h-5 text-[#0e5c4d]" />;
    case 6:
      return <FileCheck className="w-5 h-5 text-[#0e5c4d]" />;
    case 7:
      return <BookOpen className="w-5 h-5 text-[#0e5c4d]" />;
    case 8:
      return <ImageIcon className="w-5 h-5 text-[#0e5c4d]" />;
    case 9:
      return <Tag className="w-5 h-5 text-[#0e5c4d]" />;
    case 10:
      return <FolderArchive className="w-5 h-5 text-[#0e5c4d]" />;
    case 11:
      return <GraduationCap className="w-5 h-5 text-[#0e5c4d]" />;
    case 12:
      return <BookOpen className="w-5 h-5 text-[#0e5c4d]" />;
    default:
      return <FileText className="w-5 h-5 text-[#0e5c4d]" />;
  }
};

export const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  isOpen,
  onToggle,
  favorites,
  getToolQuota,
  getResellerTrialRemaining,
  userRole = 'public',
  discountPercentage = 50,
  freeRewardsAvailable = 0,
  isFreeTrialEligible = false,
  maintenanceConfig,
  userId,
  onOpenTool,
  onToggleFavorite,
  onCheckoutRequest,
  onClaimReward,
  onClaimFreeTrial,
  onOpenMaintenanceNotice,
  onOpenIframeLockedNotice,
  onQuickManageMaintenance
}) => {
  const isAdmin = userRole === 'admin';
  const isReseller = userRole === 'reseller';
  const effectivePackagePrice = calculateEffectivePrice(category.packagePriceRp, userRole, discountPercentage);
  const totalCategoryTrials = isReseller && getResellerTrialRemaining
    ? category.tools.reduce((sum, t) => sum + getResellerTrialRemaining(t.id), 0)
    : 0;
  const allToolsHaveQuota = isAdmin || category.tools.every((t) => getToolQuota(t) > 0);

  // Count tools in maintenance
  const maintenanceCount = category.tools.filter(
    t => maintenanceConfig?.items?.[t.id]?.status && maintenanceConfig.items[t.id].status !== 'active'
  ).length;

  return (
    <div 
      id={`section-${category.id}`}
      className={`rounded-2xl border transition-all duration-300 overflow-hidden bg-white border-slate-200/90 border-l-[5px] border-l-amber-400 shadow-sm hover:shadow-md ${
        isOpen
          ? 'md:col-span-2 shadow-lg ring-1 ring-amber-400/40 border-amber-300'
          : 'hover:border-slate-300'
      }`}
    >
      {/* Accordion Header Button */}
      <button
        type="button"
        onClick={() => onToggle(category.id)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-3 p-3.5 sm:p-4 text-left transition-colors cursor-pointer hover:bg-slate-50/70"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Category Number Badge */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 min-w-9 sm:min-w-10 rounded-lg flex items-center justify-center font-extrabold text-base sm:text-lg text-white bg-[#0e5c4d] shadow-sm shrink-0">
            {category.number}
          </div>

          {/* Category Icon */}
          <div className="w-8 h-8 min-w-8 flex items-center justify-center text-[#0e5c4d] shrink-0">
            {getCategoryIcon(category.id)}
          </div>

          {/* Category Info */}
          <div className="min-w-0 flex-1 pr-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="font-bold text-[15px] sm:text-base text-slate-900 tracking-tight leading-snug">
                {category.title}
              </h2>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#fef3c7] text-[#92400e] border border-amber-300/60 shrink-0">
                  <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
                  <span>Admin</span>
                </span>
              )}
              {maintenanceCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                  <Wrench className="w-2.5 h-2.5 text-rose-600" />
                  <span>{maintenanceCount} Modul Perbaikan</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-normal mt-0.5 leading-relaxed break-words">
              {category.subtitle || `${category.tools.length} alat untuk ${category.title.toLowerCase()}`}
            </p>
          </div>
        </div>

        {/* Arrow Toggle Indicator */}
        <div className={`w-9 h-9 min-w-9 rounded-xl flex items-center justify-center transition-all duration-200 shrink-0 border border-amber-200/70 ${
          isOpen
            ? 'bg-amber-400 text-slate-900 shadow-sm'
            : 'bg-[#fef3c7] hover:bg-[#fde68a] text-[#b45309]'
        }`}>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 stroke-[2.5]" />
          ) : (
            <ChevronDown className="w-5 h-5 stroke-[2.5]" />
          )}
        </div>
      </button>

      {/* Accordion Content */}
      <div 
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-[2500px] opacity-100 px-4 sm:px-5 pb-4 sm:pb-5 pt-3 border-t border-slate-100 bg-slate-50/50' : 'max-h-0 opacity-0 px-4 sm:px-5 py-0 pointer-events-none'
        }`}
      >
        {/* List of tools in this category */}
        <div className="flex flex-col gap-2.5">
          {category.tools.map((tool) => {
            const quota = getToolQuota(tool);
            const resellerTrialRemaining = getResellerTrialRemaining ? getResellerTrialRemaining(tool.id) : 0;
            const isUnlocked = isAdmin || quota > 0 || (isReseller && resellerTrialRemaining > 0);
            const maintenanceInfo = maintenanceConfig?.items?.[tool.id];

            return (
              <ToolCard
                key={tool.id}
                tool={tool}
                isFavorite={favorites.has(tool.id)}
                isUnlocked={isUnlocked}
                quota={quota}
                resellerTrialRemaining={resellerTrialRemaining}
                userRole={userRole}
                discountPercentage={discountPercentage}
                freeRewardsAvailable={freeRewardsAvailable}
                isFreeTrialEligible={isFreeTrialEligible}
                maintenanceInfo={maintenanceInfo}
                userId={userId}
                onOpen={onOpenTool}
                onToggleFavorite={onToggleFavorite}
                onClaimReward={onClaimReward}
                onClaimFreeTrial={onClaimFreeTrial}
                onOpenMaintenanceNotice={onOpenMaintenanceNotice}
                onOpenIframeLockedNotice={onOpenIframeLockedNotice}
                onQuickManageMaintenance={onQuickManageMaintenance}
                onUnlockRequest={(targetTool, effectivePrice) => onCheckoutRequest({
                  type: 'tool',
                  id: targetTool.id,
                  title: `1x Pembuatan: ${targetTool.title}`,
                  subtitle: `Pembayaran & kuota khusus untuk link ini (${targetTool.title}) — Dihitung per tiap link (Bukan per nomor ${category.number})`,
                  priceRp: effectivePrice,
                  originalPriceRp: targetTool.priceRp,
                  badge: isReseller ? 'Diskon Reseller 50%' : targetTool.badge,
                  mayarPaymentUrl: targetTool.mayarPaymentUrl || category.mayarPaymentUrl
                })}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

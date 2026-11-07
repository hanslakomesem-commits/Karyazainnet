import React from 'react';
import { 
  FileText, 
  Scissors, 
  Hash, 
  BookOpen, 
  ShieldCheck, 
  Sparkles, 
  ChevronDown, 
  Crown, 
  Layers, 
  Lock, 
  Unlock, 
  Star,
  LayoutGrid,
  Wrench
} from 'lucide-react';
import { ToolCategory, ToolItem, UserRole, MaintenanceConfig, ToolMaintenanceItem } from '../types';
import { ToolCard } from './ToolCard';
import { CheckoutTarget } from './ManualQrisPaymentModal';
import { calculateEffectivePrice } from '../data/toolsData';

interface ModuleGridProps {
  categories: ToolCategory[];
  favorites: Set<string>;
  getToolQuota: (tool: ToolItem) => number;
  getResellerTrialRemaining?: (toolId: string) => number;
  userRole?: UserRole;
  discountPercentage?: number;
  freeRewardsAvailable?: number;
  openSectionId: number | null;
  maintenanceConfig?: MaintenanceConfig;
  onToggleSection: (id: number) => void;
  onOpenTool: (tool: ToolItem) => void;
  onToggleFavorite: (toolId: string) => void;
  onCheckoutRequest: (target: CheckoutTarget) => void;
  onClaimReward?: (tool: ToolItem) => void;
  onOpenTopUp?: () => void;
  onOpenProfile?: () => void;
  selectedCategoryTab?: string;
  onSelectCategoryTab?: (tab: string) => void;
  totalToolsCount?: number;
  filterFavoritesOnly?: boolean;
  onToggleFilterFavorites?: () => void;
  onOpenMaintenanceNotice?: (tool: ToolItem, maintenanceInfo?: ToolMaintenanceItem) => void;
  onOpenIframeLockedNotice?: (tool: ToolItem) => void;
  onQuickManageMaintenance?: (tool: ToolItem) => void;
}

export const ModuleGrid: React.FC<ModuleGridProps> = ({
  categories,
  favorites,
  getToolQuota,
  getResellerTrialRemaining,
  userRole = 'public',
  discountPercentage = 50,
  freeRewardsAvailable = 0,
  openSectionId,
  maintenanceConfig,
  onToggleSection,
  onOpenTool,
  onToggleFavorite,
  onCheckoutRequest,
  onClaimReward,
  onOpenTopUp,
  onOpenProfile,
  selectedCategoryTab = 'all',
  onSelectCategoryTab,
  totalToolsCount = 13,
  filterFavoritesOnly = false,
  onToggleFilterFavorites,
  onOpenMaintenanceNotice,
  onOpenIframeLockedNotice,
  onQuickManageMaintenance
}) => {
  const isAdmin = userRole === 'admin';
  const isReseller = userRole === 'reseller';

  const cat1Count = categories.find(c => c.id === 1)?.tools.length ?? 4;
  const cat2Count = categories.find(c => c.id === 2)?.tools.length ?? 2;

  const getBadgeBg = (id: number) => {
    switch (id) {
      case 1:
        return 'bg-indigo-600';
      case 2:
        return 'bg-blue-600';
      case 3:
        return 'bg-purple-600';
      case 4:
        return 'bg-indigo-600';
      case 5:
        return 'bg-blue-600';
      case 6:
        return 'bg-purple-600';
      case 7:
        return 'bg-teal-600';
      case 8:
        return 'bg-emerald-600';
      case 9:
        return 'bg-amber-600';
      case 10:
        return 'bg-cyan-600';
      case 11:
        return 'bg-rose-600';
      default:
        return 'bg-indigo-600';
    }
  };

  return (
    <section id="semua-modul" className="space-y-4">
      
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <LayoutGrid className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-gray-100">Semua Modul</h2>
          <span className="text-xs text-gray-500 font-normal">| Pilih modul yang Anda butuhkan</span>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button 
          onClick={() => {
            if (onSelectCategoryTab) onSelectCategoryTab('all');
          }}
          className={`px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
            selectedCategoryTab === 'all' && !filterFavoritesOnly
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-[#090e1a] border border-gray-800 hover:border-gray-700 text-gray-400'
          }`}
        >
          Semua Modul ({totalToolsCount})
        </button>

        <button 
          onClick={() => {
            if (onSelectCategoryTab) onSelectCategoryTab('1');
            onToggleSection(1);
          }}
          className={`px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
            selectedCategoryTab === '1' && !filterFavoritesOnly
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-[#090e1a] border border-gray-800 hover:border-gray-700 text-gray-400'
          }`}
        >
          Pembuatan Artikel ({cat1Count})
        </button>

        <button 
          onClick={() => {
            if (onSelectCategoryTab) onSelectCategoryTab('2');
            onToggleSection(2);
          }}
          className={`px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
            selectedCategoryTab === '2' && !filterFavoritesOnly
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-[#090e1a] border border-gray-800 hover:border-gray-700 text-gray-400'
          }`}
        >
          Pemisah Berkas ({cat2Count})
        </button>

        <button 
          onClick={() => {
            if (onSelectCategoryTab) onSelectCategoryTab('3');
            onToggleSection(3);
          }}
          className={`px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
            selectedCategoryTab === '3' && !filterFavoritesOnly
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-[#090e1a] border border-gray-800 hover:border-gray-700 text-gray-400'
          }`}
        >
          Penomoran & TOC (3)
        </button>

        <button 
          onClick={() => {
            if (onSelectCategoryTab) onSelectCategoryTab('10');
            onToggleSection(10);
          }}
          className={`px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
            selectedCategoryTab === '10' && !filterFavoritesOnly
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-[#090e1a] border border-gray-800 hover:border-gray-700 text-gray-400'
          }`}
        >
          Gabung File (10)
        </button>

        <button 
          onClick={() => {
            if (onSelectCategoryTab) onSelectCategoryTab('11');
            onToggleSection(11);
          }}
          className={`px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
            selectedCategoryTab === '11' && !filterFavoritesOnly
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-[#090e1a] border border-gray-800 hover:border-gray-700 text-gray-400'
          }`}
        >
          Nota Hardcover (11)
        </button>

        {onToggleFilterFavorites && (
          <button 
            onClick={onToggleFilterFavorites}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center space-x-1.5 ${
              filterFavoritesOnly
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'bg-[#090e1a] border border-gray-800 hover:border-gray-700 text-gray-400'
            }`}
          >
            <Star className={`w-3 h-3 ${favorites.size > 0 ? 'fill-current' : ''}`} />
            <span>Favorit ({favorites.size})</span>
          </button>
        )}
      </div>

      {/* Module Cards Grid (2 rows x 3 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Render Cards 1 to 5 */}
        {categories.map((category) => {
          const isExpanded = openSectionId === category.id;
          const badgeBg = getBadgeBg(category.id);
          const hasUnlocked = isAdmin || category.tools.some((t) => getToolQuota(t) > 0);
          const maintenanceCount = category.tools.filter(
            (t) => maintenanceConfig?.items?.[t.id]?.status && maintenanceConfig.items[t.id].status !== 'active'
          ).length;

          return (
            <div 
              key={category.id}
              className={`bg-card rounded-xl p-4 flex flex-col justify-between space-y-3 transition-all hover:border-gray-700 ${
                maintenanceCount > 0 ? 'border-amber-500/30' : ''
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`w-5 h-5 rounded-md ${badgeBg} text-white font-bold text-xs flex items-center justify-center`}>
                      {category.number}
                    </span>
                    <h3 className="font-bold text-sm text-gray-100">
                      {category.title}
                    </h3>
                  </div>
                  {maintenanceCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Wrench className="w-2.5 h-2.5" />
                      <span>{maintenanceCount} Perbaikan</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1.5 text-[11px] text-gray-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  <span>Paket Kategori Rp {category.packagePriceRp.toLocaleString('id-ID')}</span>
                </div>

                <p className="text-[11px] text-gray-400 leading-relaxed min-h-[32px]">
                  {category.subtitle || (
                    category.id === 1 ? '3 modul penetap naskah, skripsi & jurnal publikasi (Mayar Payment)' :
                    category.id === 2 ? '3 modul pemotong dan ekstraktor bab skripsi' :
                    category.id === 3 ? 'Sistem penomoran skripsi baku & editor PDF akademik' :
                    category.id === 4 ? '3 modul penyusun makalah & laporan ilmiah mahasiswa' :
                    category.id === 5 ? 'Modul parafrase skripsi & revisi dokumen anti-plagiasi' :
                    category.id === 6 ? 'Modul generator penyusun proposal skripsi & penelitian ilmiah' :
                    'Modul penelusuran referensi akademik, literatur jurnal terakreditasi & sitasi'
                  )}
                </p>
              </div>

              <button 
                onClick={() => onToggleSection(category.id)}
                className={`bg-btn hover:bg-slate-800 text-gray-200 text-xs py-2 rounded-lg flex items-center justify-center space-x-1.5 w-full font-medium transition-colors cursor-pointer ${
                  isExpanded ? 'border-indigo-500 text-indigo-300' : ''
                }`}
              >
                {hasUnlocked ? (
                  <Unlock className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Lock className="w-3 h-3 text-gray-400" />
                )}
                <span>
                  {isExpanded 
                    ? 'Tutup Rincian' 
                    : hasUnlocked 
                    ? 'Buka Modul' 
                    : `Beli Paket (Rp ${category.packagePriceRp.toLocaleString('id-ID')})`}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
          );
        })}

        {/* Card VIP: Paket Lengkap Card */}
        <div className="bg-card border-amber-500/50 rounded-xl p-4 flex flex-col justify-between space-y-3 relative overflow-hidden bg-gradient-to-b from-amber-500/10 to-transparent">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-md bg-amber-500 text-black font-bold text-xs flex items-center justify-center">
                <Crown className="w-3.5 h-3.5 text-black" />
              </span>
              <h3 className="font-bold text-sm text-amber-300">
                Paket Lengkap VIP
              </h3>
            </div>

            <div className="flex items-center space-x-1.5 text-[11px] text-amber-400/80">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>Paket Komplit Rp 45.000</span>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed min-h-[32px]">
              Akses semua modul & fitur premium dengan harga hemat
            </p>
          </div>

          <button 
            onClick={onOpenTopUp ? onOpenTopUp : () => {
              window.open('https://wa.me/6285231176597?text=Halo%20Admin%20ZAIN.NET%2C%20saya%20tertarik%20Paket%20Lengkap%20Premium.', '_blank');
            }}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs py-2 rounded-lg flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all active:scale-95"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Beli Paket (Rp 45.000)</span>
          </button>
        </div>

      </div>

      {/* Expanded Tools Details View for Selected Category */}
      {openSectionId !== null && (
        <div className="mt-6 p-5 sm:p-6 rounded-2xl bg-[#090e1a] border border-indigo-500/30 shadow-2xl space-y-4 animate-in fade-in-50 duration-200">
          
          {(() => {
            const activeCategory = categories.find((c) => c.id === openSectionId);
            if (!activeCategory) return null;

            return (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-md">
                      {activeCategory.number}
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white">
                        {activeCategory.title}
                      </h3>
                      <p className="text-xs text-gray-400">
                        Pilih modul kerja di bawah ini untuk memulai 1x penulisan naskah
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleSection(openSectionId)}
                    className="px-3 py-1 rounded-lg bg-[#0e172a] border border-gray-700 hover:bg-slate-800 text-gray-300 font-semibold text-xs transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    Tutup Rincian
                  </button>
                </div>

                {/* Sub-Tools Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
                  {activeCategory.tools.map((tool) => {
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
                        maintenanceInfo={maintenanceInfo}
                        onOpen={onOpenTool}
                        onToggleFavorite={onToggleFavorite}
                        onClaimReward={onClaimReward}
                        onOpenMaintenanceNotice={onOpenMaintenanceNotice}
                        onOpenIframeLockedNotice={onOpenIframeLockedNotice}
                        onQuickManageMaintenance={onQuickManageMaintenance}
                        onUnlockRequest={(targetTool, effectivePrice) => onCheckoutRequest({
                          type: 'tool',
                          id: targetTool.id,
                          title: `1x Pembuatan: ${targetTool.title}`,
                          subtitle: `Pembayaran & kuota khusus untuk link ini (${targetTool.title}) — Dihitung per tiap link`,
                          priceRp: effectivePrice,
                          originalPriceRp: targetTool.priceRp,
                          badge: isReseller ? 'Diskon Reseller 50%' : targetTool.badge,
                          mayarPaymentUrl: targetTool.mayarPaymentUrl || activeCategory.mayarPaymentUrl
                        })}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })()}

        </div>
      )}

    </section>
  );
};


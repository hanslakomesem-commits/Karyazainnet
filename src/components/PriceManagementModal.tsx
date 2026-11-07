import React, { useState, useEffect } from 'react';
import { 
  X, 
  DollarSign, 
  Tag, 
  Save, 
  RotateCcw, 
  Sparkles, 
  Percent, 
  Crown, 
  Check, 
  Sliders, 
  Layers, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { ToolCategory, CustomPricesConfig } from '../types';
import { defaultCustomPrices } from '../data/toolsData';

interface PriceManagementModalProps {
  categories: ToolCategory[];
  currentPrices: CustomPricesConfig;
  isOpen: boolean;
  onClose: () => void;
  onSavePrices: (newPrices: CustomPricesConfig) => Promise<void>;
}

export const PriceManagementModal: React.FC<PriceManagementModalProps> = ({
  categories,
  currentPrices,
  isOpen,
  onClose,
  onSavePrices
}) => {
  const [pricesState, setPricesState] = useState<CustomPricesConfig>(currentPrices);
  const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'packages'>('items');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setPricesState(currentPrices);
  }, [currentPrices, isOpen]);

  if (!isOpen) return null;

  const handleToolPriceChange = (toolId: string, val: number) => {
    const safeVal = Math.max(0, isNaN(val) ? 0 : val);
    setPricesState(prev => ({
      ...prev,
      itemPrices: {
        ...prev.itemPrices,
        [toolId]: safeVal
      }
    }));
  };

  const handleCategoryPriceChange = (categoryId: number, val: number) => {
    const safeVal = Math.max(0, isNaN(val) ? 0 : val);
    setPricesState(prev => ({
      ...prev,
      categoryPrices: {
        ...prev.categoryPrices,
        [categoryId]: safeVal
      }
    }));
  };

  const handleAllAccessChange = (val: number) => {
    const safeVal = Math.max(0, isNaN(val) ? 0 : val);
    setPricesState(prev => ({
      ...prev,
      allAccessPriceRp: safeVal
    }));
  };

  const handleDiscountChange = (val: number) => {
    const safeVal = Math.min(100, Math.max(0, isNaN(val) ? 0 : val));
    setPricesState(prev => ({
      ...prev,
      resellerDiscountPercentage: safeVal
    }));
  };

  const handleResetToDefault = () => {
    if (confirm('Kembalikan semua konfigurasi harga ke harga default awal?')) {
      setPricesState(defaultCustomPrices);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSavePrices({
        ...pricesState,
        updatedAt: Date.now()
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (e) {
      alert('Gagal menyimpan harga: ' + String(e));
    } finally {
      setIsSaving(false);
    }
  };

  const calculateResellerPrice = (basePrice: number) => {
    const discount = pricesState.resellerDiscountPercentage || 50;
    return Math.round(basePrice * ((100 - discount) / 100));
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-black/80 my-auto text-slate-100 max-h-[92vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20 shrink-0">
              <Tag className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Manajemen Harga Dinamis
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                  Khusus Admin
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Atur tarif per modul, harga paket kategori, dan persentase diskon reseller tanpa edit kode.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 pt-4 pb-2 border-b border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('items')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'items'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Harga Per Item Modul</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'categories'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Harga Paket Kategori</span>
          </button>

          <button
            onClick={() => setActiveTab('packages')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'packages'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>All-Access & Diskon Reseller</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 custom-scrollbar">

          {/* TAB 1: Per-Item Tool Prices */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>
                  Perubahan harga per item berlaku instan untuk checkout Midtrans satu kali pakai (pay-per-use).
                </span>
              </div>

              <div className="space-y-3">
                {categories.map((category) => (
                  <div key={category.id} className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-b border-slate-800/80 pb-1.5">
                      <span>Kategori: {category.title}</span>
                      <span className="text-[11px] font-mono">{category.tools.length} Modul</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {category.tools.map((tool) => {
                        const currentVal = pricesState.itemPrices[tool.id] !== undefined
                          ? pricesState.itemPrices[tool.id]
                          : tool.priceRp;
                        const resVal = calculateResellerPrice(currentVal);

                        return (
                          <div key={tool.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-2">
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-white truncate">{tool.title}</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                  {tool.id}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                Reseller ({pricesState.resellerDiscountPercentage}%): <strong className="text-blue-300 font-mono">Rp {resVal.toLocaleString('id-ID')}</strong>
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">Rp</span>
                                <input
                                  type="number"
                                  step="1000"
                                  min="0"
                                  value={currentVal}
                                  onChange={(e) => handleToolPriceChange(tool.id, parseInt(e.target.value))}
                                  className="w-full pl-8 pr-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                              {/* Quick increments */}
                              <button
                                type="button"
                                onClick={() => handleToolPriceChange(tool.id, currentVal + 1000)}
                                className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300"
                                title="+ Rp 1.000"
                              >
                                +1k
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Category Package Prices */}
          {activeTab === 'categories' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                <Layers className="w-4 h-4 shrink-0" />
                <span>
                  Harga paket kategori memberikan akses ke semua modul dalam satu kategori skripsi/artikel sekaligus.
                </span>
              </div>

              <div className="space-y-2.5">
                {categories.map((category) => {
                  const currentPkgVal = pricesState.categoryPrices[category.id] !== undefined
                    ? pricesState.categoryPrices[category.id]
                    : category.packagePriceRp;
                  const resVal = calculateResellerPrice(currentPkgVal);

                  return (
                    <div key={category.id} className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-300 font-black text-xs flex items-center justify-center">
                            {category.number}
                          </span>
                          <h4 className="text-sm font-bold text-white truncate">
                            Paket {category.title}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Mencakup {category.tools.length} modul aktif. Harga Reseller: <strong className="text-blue-300 font-mono">Rp {resVal.toLocaleString('id-ID')}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 sm:w-56 shrink-0">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">Rp</span>
                          <input
                            type="number"
                            step="1000"
                            min="0"
                            value={currentPkgVal}
                            onChange={(e) => handleCategoryPriceChange(category.id, parseInt(e.target.value))}
                            className="w-full pl-8 pr-2 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCategoryPriceChange(category.id, currentPkgVal + 2000)}
                          className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                          title="+ Rp 2.000"
                        >
                          +2k
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: All-Access & Reseller Discounts */}
          {activeTab === 'packages' && (
            <div className="space-y-4">
              {/* All-Access Package */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/30 via-slate-950 to-indigo-950/30 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">Tarif Paket All-Access VIP</h4>
                    <p className="text-xs text-slate-400">Akses tanpa batas ke seluruh 9+ modul ZAIN.NET sekaligus.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="number"
                      step="5000"
                      min="0"
                      value={pricesState.allAccessPriceRp}
                      onChange={(e) => handleAllAccessChange(parseInt(e.target.value))}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-amber-500/40 rounded-xl text-sm font-mono font-extrabold text-amber-300 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="text-right text-xs text-slate-400 shrink-0">
                    Reseller: <span className="font-bold text-amber-300 font-mono">Rp {calculateResellerPrice(pricesState.allAccessPriceRp).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Reseller Discount Percentage */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300">
                    <Percent className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">Persentase Diskon Reseller Mitra</h4>
                    <p className="text-xs text-slate-400">Potongan harga otomatis untuk semua akun bereputasi Reseller.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={pricesState.resellerDiscountPercentage}
                      onChange={(e) => handleDiscountChange(parseInt(e.target.value))}
                      className="w-full pl-4 pr-9 py-2.5 bg-slate-900 border border-blue-500/40 rounded-xl text-sm font-mono font-extrabold text-blue-300 focus:outline-none focus:border-blue-400"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {[30, 40, 50, 60].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleDiscountChange(pct)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          pricesState.resellerDiscountPercentage === pct
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary note */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  Semua harga yang disimpan akan langsung terintegrasi dengan invoice Midtrans QRIS/VA dan harga kartu modul pengguna secara realtime.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Harga Default</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan & Terapkan Harga</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

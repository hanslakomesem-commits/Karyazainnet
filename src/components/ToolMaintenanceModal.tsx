import React, { useState } from 'react';
import { 
  Wrench, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Zap, 
  Clock, 
  ExternalLink, 
  Search, 
  Save, 
  ShieldAlert,
  Flame
} from 'lucide-react';
import { MaintenanceConfig, ToolMaintenanceStatus, ToolCategory } from '../types';

interface ToolMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ToolCategory[];
  maintenanceConfig: MaintenanceConfig;
  onSaveConfig: (newConfig: MaintenanceConfig) => Promise<void>;
}

export const ToolMaintenanceModal: React.FC<ToolMaintenanceModalProps> = ({
  isOpen,
  onClose,
  categories,
  maintenanceConfig,
  onSaveConfig
}) => {
  if (!isOpen) return null;

  // Flatten all tools with their category details
  const allTools = categories.flatMap(cat => 
    cat.tools.map(tool => ({
      ...tool,
      categoryTitle: cat.title,
      categoryNumber: cat.number
    }))
  );

  const [items, setItems] = useState<{ [toolId: string]: {
    status: ToolMaintenanceStatus;
    reason?: string;
    estimatedRestoration?: string;
  } }>(() => {
    const initial: { [toolId: string]: any } = {};
    allTools.forEach(tool => {
      const existing = maintenanceConfig.items?.[tool.id];
      initial[tool.id] = {
        status: existing?.status || 'active',
        reason: existing?.reason || 'Link ini masih dalam perbaikan',
        estimatedRestoration: existing?.estimatedRestoration || ''
      };
    });
    return initial;
  });

  const [globalNotice, setGlobalNotice] = useState<string>(
    maintenanceConfig.globalNotice || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'maintenance_only' | 'active_only'>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Quick preset reasons
  const quickReasons = [
    'Link ini masih dalam perbaikan',
    'Kuota token AI habis terpakai, sedang isi ulang',
    'Server modul sedang pemeliharaan berkala',
    'Sedang proses update tautan & perbaikan teknisi'
  ];

  const handleStatusChange = (toolId: string, status: ToolMaintenanceStatus) => {
    setItems(prev => ({
      ...prev,
      [toolId]: {
        ...prev[toolId],
        status,
        reason: prev[toolId]?.reason || (status === 'token_exhausted' ? 'Kuota token AI habis terpakai, sedang isi ulang' : 'Masih dalam perbaikan')
      }
    }));
  };

  const handleReasonChange = (toolId: string, reason: string) => {
    setItems(prev => ({
      ...prev,
      [toolId]: {
        ...prev[toolId],
        reason
      }
    }));
  };

  const handleEstimateChange = (toolId: string, estimatedRestoration: string) => {
    setItems(prev => ({
      ...prev,
      [toolId]: {
        ...prev[toolId],
        estimatedRestoration
      }
    }));
  };

  const handleResetAllToActive = () => {
    if (!window.confirm('Pulihkan status semua modul menjadi Normal / Aktif?')) return;
    const reset: { [toolId: string]: any } = {};
    allTools.forEach(tool => {
      reset[tool.id] = {
        status: 'active',
        reason: 'Masih dalam perbaikan',
        estimatedRestoration: ''
      };
    });
    setItems(reset);
    setGlobalNotice('');
  };

  const handleSetAllMaintenance = () => {
    if (!window.confirm('Set semua modul menjadi Dalam Perbaikan?')) return;
    const maintenanceAll: { [toolId: string]: any } = {};
    allTools.forEach(tool => {
      maintenanceAll[tool.id] = {
        status: 'maintenance',
        reason: 'Sistem ZAIN.NET sedang dalam pemeliharaan berkala',
        estimatedRestoration: 'Perkiraan selesai 1-2 jam lagi'
      };
    });
    setItems(maintenanceAll);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMessage(null);
    try {
      const updatedConfig: MaintenanceConfig = {
        items: items as any,
        globalNotice: globalNotice.trim(),
        updatedAt: Date.now(),
        updatedBy: 'admin'
      };
      await onSaveConfig(updatedConfig);
      setSuccessMessage('Pengaturan status maintenance berhasil disimpan dan disinkronkan ke seluruh sistem!');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      alert(`Gagal menyimpan pengaturan: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered tools
  const filteredTools = allTools.filter(tool => {
    const item = items[tool.id];
    const isMaintenance = item && item.status !== 'active';

    if (filterStatus === 'maintenance_only' && !isMaintenance) return false;
    if (filterStatus === 'active_only' && isMaintenance) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        tool.title.toLowerCase().includes(q) ||
        tool.id.toLowerCase().includes(q) ||
        tool.categoryTitle.toLowerCase().includes(q) ||
        (item?.reason || '').toLowerCase().includes(q)
      );
    }

    return true;
  });

  const totalMaintenanceCount = Object.values(items).filter((i: any) => i?.status && i.status !== 'active').length;
  const totalActiveCount = allTools.length - totalMaintenanceCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in-50 duration-200">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0b1220] border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden text-gray-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-800/80 bg-gradient-to-r from-amber-950/70 via-slate-900 to-indigo-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-md">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg text-white">
                  Kelola Link Maintenance & Eror
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-black">
                  Admin Panel
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Kunci link modul yang sedang perbaikan, eror, atau token AI habis agar tidak dapat diklik mahasiswa & user.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Success Banner */}
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2.5 shadow-lg animate-in fade-in-50">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          {/* Quick Metrics & Global Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 block">Total Modul Terdaftar</span>
                <span className="text-xl font-black text-white">{allTools.length} Modul</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                {allTools.length}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 block">Modul Aktif (Normal)</span>
                <span className="text-xl font-black text-emerald-400">{totalActiveCount} Normal</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
              totalMaintenanceCount > 0 
                ? 'bg-amber-950/40 border-amber-500/40' 
                : 'bg-slate-900/90 border-slate-800'
            }`}>
              <div>
                <span className="text-xs text-gray-400 block">Maintenance / Eror / Token Habis</span>
                <span className={`text-xl font-black ${totalMaintenanceCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {totalMaintenanceCount} Terkunci
                </span>
              </div>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                totalMaintenanceCount > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Global Notice (Optional Banner across the app) */}
          <div className="p-4 rounded-2xl bg-[#0e1628] border border-gray-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Pengumuman Pemeliharaan Global (Opsional)</span>
              </label>
              {globalNotice && (
                <button
                  type="button"
                  onClick={() => setGlobalNotice('')}
                  className="text-[11px] text-red-400 hover:underline cursor-pointer"
                >
                  Hapus Pengumuman
                </button>
              )}
            </div>
            <input
              type="text"
              value={globalNotice}
              onChange={(e) => setGlobalNotice(e.target.value)}
              placeholder="Contoh: Beberapa server AI sedang proses isi ulang kuota token & update sistem. Mohon bersabar."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
            <p className="text-[11px] text-gray-400">
              Jika diisi, banner peringatan ini akan muncul di bagian atas halaman beranda bagi semua pengunjung.
            </p>
          </div>

          {/* Quick Action Toolbar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Search & Filter */}
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari link / modul..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                    filterStatus === 'all' ? 'bg-indigo-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Semua ({allTools.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('maintenance_only')}
                  className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                    filterStatus === 'maintenance_only' ? 'bg-amber-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Terkunci ({totalMaintenanceCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('active_only')}
                  className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                    filterStatus === 'active_only' ? 'bg-emerald-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Aktif ({totalActiveCount})
                </button>
              </div>
            </div>

            {/* Batch buttons */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleResetAllToActive}
                title="Aktifkan semua modul"
                className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 hover:bg-emerald-900/60 text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Pulihkan Semua Normal</span>
              </button>

              <button
                type="button"
                onClick={handleSetAllMaintenance}
                title="Kunci semua modul ke status maintenance"
                className="px-3 py-1.5 rounded-xl bg-red-950/60 border border-red-500/40 hover:bg-red-900/60 text-red-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Kunci Semua Maintenance</span>
              </button>
            </div>
          </div>

          {/* Module List Cards */}
          <div className="space-y-3">
            {filteredTools.map((tool) => {
              const current = items[tool.id] || { status: 'active', reason: 'Masih dalam perbaikan' };
              const isMaintenance = current.status !== 'active';

              return (
                <div 
                  key={tool.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isMaintenance
                      ? current.status === 'token_exhausted'
                        ? 'bg-amber-950/20 border-amber-500/50 shadow-md'
                        : current.status === 'error'
                        ? 'bg-rose-950/20 border-rose-500/50 shadow-md'
                        : 'bg-yellow-950/20 border-yellow-500/50 shadow-md'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Tool info & Status Selector */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-800/80">
                    <div className="flex items-start space-x-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isMaintenance ? 'bg-amber-500 text-slate-950' : 'bg-indigo-600 text-white'
                      }`}>
                        {tool.number}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white">
                            {tool.title}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                            {tool.id}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-800/50">
                            Kategori {tool.categoryNumber}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                          <span className="font-mono text-gray-500 truncate max-w-xs">{tool.url}</span>
                          <a
                            href={tool.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-0.5 shrink-0"
                            title="Buka link asli untuk pengecekan"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Uji Link</span>
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Status Pill Selector */}
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(tool.id, 'active')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                          current.status === 'active'
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                            : 'bg-slate-800/80 text-gray-400 border-slate-700 hover:bg-slate-800 hover:text-gray-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Normal (Aktif)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange(tool.id, 'maintenance')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                          current.status === 'maintenance'
                            ? 'bg-yellow-500 text-slate-950 border-yellow-400 shadow-md'
                            : 'bg-slate-800/80 text-yellow-300/70 border-slate-700 hover:bg-slate-800 hover:text-yellow-300'
                        }`}
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Dalam Perbaikan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange(tool.id, 'token_exhausted')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                          current.status === 'token_exhausted'
                            ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                            : 'bg-slate-800/80 text-amber-300/70 border-slate-700 hover:bg-slate-800 hover:text-amber-300'
                        }`}
                      >
                        <Flame className="w-3.5 h-3.5" />
                        <span>Kuota Token Habis</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange(tool.id, 'error')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                          current.status === 'error'
                            ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                            : 'bg-slate-800/80 text-rose-300/70 border-slate-700 hover:bg-slate-800 hover:text-rose-300'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Eror / Gangguan</span>
                      </button>
                    </div>
                  </div>

                  {/* If Maintenance / Error / Token Habis, show customizable notice & estimates */}
                  {isMaintenance && (
                    <div className="mt-3 pt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs animate-in fade-in-50">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-gray-300 font-semibold flex items-center gap-1">
                            <span>Keterangan Alasan (Ditampilkan ke Mahasiswa / User):</span>
                          </label>
                        </div>
                        <input
                          type="text"
                          value={current.reason || ''}
                          onChange={(e) => handleReasonChange(tool.id, e.target.value)}
                          placeholder="Keterangan masih dalam perbaikan..."
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-500/40 text-xs text-amber-200 focus:outline-none focus:border-amber-400"
                        />

                        {/* Quick preset chips */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {quickReasons.map((qr, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleReasonChange(tool.id, qr)}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-gray-300 cursor-pointer transition-colors border border-slate-700"
                            >
                              {qr}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-gray-300 font-semibold block mb-1">
                          Estimasi Selesai Perbaikan (Opsional):
                        </label>
                        <div className="relative">
                          <Clock className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={current.estimatedRestoration || ''}
                            onChange={(e) => handleEstimateChange(tool.id, e.target.value)}
                            placeholder="Contoh: Perkiraan selesai 1-2 jam lagi / Pukul 20:00 WIB"
                            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-gray-700 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1.5">
                          Mahasiswa/user yang membuka link ini akan melihat keterangan bahwa modul masih dalam perbaikan dan tombol klik dinonaktifkan.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-gray-800/80 bg-gradient-to-r from-[#080d17] via-slate-900 to-[#080d17] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-400 text-center sm:text-left">
            <span>Status tersimpan langsung di server cloud & otomatis berlaku untuk seluruh user ZAIN.NET.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Tutup
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan Maintenance'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

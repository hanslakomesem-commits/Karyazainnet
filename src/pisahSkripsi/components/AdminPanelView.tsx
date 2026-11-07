import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Key,
  CreditCard,
  ToggleLeft,
  ToggleRight,
  LogOut,
  Sparkles,
  Layers,
  BookOpen,
  CheckCircle2,
  RefreshCw,
  Server,
  Settings,
  Zap,
  Info,
  Coins
} from 'lucide-react';

interface AdminPanelViewProps {
  onLogoutAdmin: () => void;
  onNavigateToTab: (tab: 'splitter') => void;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  onLogoutAdmin,
  onNavigateToTab,
}) => {
  const [globalFreeMode, setGlobalFreeMode] = useState<boolean>(() => {
    return localStorage.getItem('global_free_mode') === 'true';
  });

  const [midtransConfig, setMidtransConfig] = useState<{
    serverKey: string;
    clientKey: string;
    isProduction: boolean;
  }>({
    serverKey: '',
    clientKey: 'Mid-client-V33Dm4LLDjMp9TTo',
    isProduction: true,
  });

  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/midtrans/config')
      .then((res) => res.json())
      .then((data) => {
        setMidtransConfig({
          serverKey: data.serverKey || '',
          clientKey: data.clientKey || 'Mid-client-V33Dm4LLDjMp9TTo',
          isProduction: data.isProduction !== undefined ? data.isProduction : true,
        });
      })
      .catch((err) => console.warn('Could not load Midtrans config in Admin View:', err));
  }, []);

  const handleToggleGlobalFreeMode = () => {
    const nextVal = !globalFreeMode;
    setGlobalFreeMode(nextVal);
    localStorage.setItem('global_free_mode', nextVal ? 'true' : 'false');
  };

  const handleSaveMidtransConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setSaveSuccess(false);

    fetch('/api/midtrans/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(midtransConfig),
    })
      .then((res) => res.json())
      .then((data) => {
        setIsSavingConfig(false);
        if (data.success) {
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        }
      })
      .catch((err) => {
        console.error('Failed to save Midtrans config:', err);
        setIsSavingConfig(false);
        alert('Gagal menyimpan konfigurasi Midtrans.');
      });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Admin Status Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-blue-800/50">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 backdrop-blur-md flex items-center justify-center border border-blue-400/30 shrink-0 shadow-inner">
              <ShieldCheck className="w-8 h-8 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Status Admin Aktif
                </span>
                <span className="text-xs text-blue-300 font-medium">1x Login - Gratis Seterusnya</span>
              </div>
              <h2 className="text-2xl font-black mt-1 tracking-tight">Dashboard Administrator</h2>
              <p className="text-xs text-blue-200 mt-1 max-w-xl">
                Logged in sebagai <strong className="text-white font-mono bg-white/10 px-2 py-0.5 rounded">karyazainnet</strong>.
                Seluruh fitur pemisahan file skripsi (15 bab & batch processing) kini <strong>100% Bebas Biaya (0 Rupiah)</strong> untuk akun Anda.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={onLogoutAdmin}
              className="px-4 py-2.5 bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold rounded-xl border border-red-500/50 flex items-center space-x-2 transition-all active:scale-95 shadow-md shadow-red-950/40"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar Administrator</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Admin Privileges Status */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Hak Akses Layanan</h3>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
              Bebas Biaya
            </span>
          </div>

          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-2 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Mode Akun:</span>
                <span className="font-bold text-slate-900 dark:text-white">Administrator</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Biaya Pemisah Skripsi:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Rp 0 (Gratis)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Batch Processing:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Aktif (Bebas Biaya)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Sesi Login:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">Permanen (Saved)</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onNavigateToTab('splitter')}
                className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Buka Pemisah File Skripsi</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Pengaturan Akses Bebas Biaya Pengguna */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Mode Bebas Biaya Global</h3>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Aktifkan opsi ini jika ingin membebaskan biaya QRIS untuk <strong>semua pengunjung/pengguna</strong> aplikasi tanpa perlu login Admin.
          </p>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                {globalFreeMode ? 'Gratis Untuk Semua Pengguna' : 'Hanya Admin Yang Gratis'}
              </span>
              <span className="text-[11px] text-slate-500">
                {globalFreeMode ? 'QRIS tidak dipicu untuk siapapun' : 'Pengguna biasa tetap bayar via QRIS'}
              </span>
            </div>

            <button
              onClick={handleToggleGlobalFreeMode}
              className="text-blue-600 dark:text-blue-400 transition-colors p-1 cursor-pointer"
            >
              {globalFreeMode ? (
                <ToggleRight className="w-10 h-10 text-emerald-500" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-slate-400" />
              )}
            </button>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigateToTab('splitter')}
              className="w-full py-2.5 px-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Kembali Ke Pemisah Skripsi</span>
            </button>
          </div>
        </div>

        {/* Card 3: Status Server & Midtrans Overview */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Status Server Midtrans</h3>
            </div>
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/80 px-2 py-0.5 rounded-full">
              {midtransConfig.isProduction ? 'Production Mode' : 'Sandbox Mode'}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-slate-500">Midtrans Host:</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {midtransConfig.isProduction ? 'api.midtrans.com' : 'api.sandbox.midtrans.com'}
              </span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-slate-500">Server Key:</span>
              <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                {midtransConfig.serverKey ? `${midtransConfig.serverKey.substring(0, 14)}...` : 'Belum diisi'}
              </span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-slate-500">Client Key:</span>
              <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                {midtransConfig.clientKey ? `${midtransConfig.clientKey.substring(0, 14)}...` : 'Belum diisi'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Midtrans Settings Form */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pengaturan Kunci API Midtrans (Runtime Config)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ubah Server Key & Client Key Midtrans secara langsung tanpa perlu merestart server.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveMidtransConfig} className="space-y-4">
          {saveSuccess && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center space-x-2 text-xs text-emerald-700 dark:text-emerald-300 font-semibold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Konfigurasi Midtrans berhasil diperbarui di server runtime!</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                <Key className="w-3.5 h-3.5 text-blue-600" />
                <span>Server Key Midtrans</span>
              </label>
              <input
                type="text"
                value={midtransConfig.serverKey}
                onChange={(e) => setMidtransConfig({ ...midtransConfig, serverKey: e.target.value })}
                placeholder="Mid-server-xxxx"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                <span>Client Key Midtrans</span>
              </label>
              <input
                type="text"
                value={midtransConfig.clientKey}
                onChange={(e) => setMidtransConfig({ ...midtransConfig, clientKey: e.target.value })}
                placeholder="Mid-client-xxxx"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isProductionCheck"
                checked={midtransConfig.isProduction}
                onChange={(e) => setMidtransConfig({ ...midtransConfig, isProduction: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
              />
              <label htmlFor="isProductionCheck" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                Mode Production (api.midtrans.com)
              </label>
            </div>

            <button
              type="submit"
              disabled={isSavingConfig}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSavingConfig ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Kunci Midtrans</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

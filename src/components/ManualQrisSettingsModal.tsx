import React, { useState, useRef } from 'react';
import { 
  X, 
  Save, 
  Plus, 
  Trash2, 
  QrCode, 
  Building2, 
  Upload, 
  MessageCircle, 
  ShieldCheck, 
  HelpCircle,
  Hash,
  Check,
  ExternalLink
} from 'lucide-react';
import { ManualQrisConfig, BankAccountInfo } from '../types';

interface ManualQrisSettingsModalProps {
  config: ManualQrisConfig;
  isOpen?: boolean;
  onClose: () => void;
  onSaveConfig: (newConfig: ManualQrisConfig) => Promise<void>;
}

export const ManualQrisSettingsModal: React.FC<ManualQrisSettingsModalProps> = ({
  config,
  isOpen = true,
  onClose,
  onSaveConfig
}) => {
  const [merchantName, setMerchantName] = useState<string>(config.merchantName || 'ZAIN.NET, TLANAKAN');
  const [nmid, setNmid] = useState<string>(config.nmid || 'ID1024339728304');
  const [terminalId, setTerminalId] = useState<string>(config.terminalId || 'A01');
  const [printedBy, setPrintedBy] = useState<string>(config.printedBy || '93600914');
  const [qrisString, setQrisString] = useState<string>(config.qrisString || '00020101021151560014ID.CO.QRIS.WWW0115ID10243397283040203UMI0308936009145204581253033605802ID5918ZAIN.NET, TLANAKAN6008TLANAKAN61056937162070103A016304ACD0');
  const [qrisImageUrl, setQrisImageUrl] = useState<string>(config.qrisImageUrl || '');
  const [adminWhatsApp, setAdminWhatsApp] = useState<string>(config.adminWhatsApp || '085231176597');
  const [enableUniqueCode, setEnableUniqueCode] = useState<boolean>(config.enableUniqueCode === true);
  const [bankAccounts, setBankAccounts] = useState<BankAccountInfo[]>(config.bankAccounts || []);
  const [paymentInstructions, setPaymentInstructions] = useState<string>(config.paymentInstructions || '');
  
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleRestoreOfficialQris = () => {
    setMerchantName('ZAIN.NET, TLANAKAN');
    setNmid('ID1024339728304');
    setTerminalId('A01');
    setPrintedBy('93600914');
    setQrisString('00020101021151560014ID.CO.QRIS.WWW0115ID10243397283040203UMI0308936009145204581253033605802ID5918ZAIN.NET, TLANAKAN6008TLANAKAN61056937162070103A016304ACD0');
    setQrisImageUrl('https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=00020101021151560014ID.CO.QRIS.WWW0115ID10243397283040203UMI0308936009145204581253033605802ID5918ZAIN.NET,%20TLANAKAN6008TLANAKAN61056937162070103A016304ACD0');
  };

  const handleAddBankAccount = () => {
    setBankAccounts([
      ...bankAccounts,
      {
        bankName: 'BCA / DANA / Mandiri',
        accountNumber: '',
        accountHolder: 'IMAM HANAFI'
      }
    ]);
  };

  const handleRemoveBankAccount = (index: number) => {
    setBankAccounts(bankAccounts.filter((_, i) => i !== index));
  };

  const handleUpdateBankField = (index: number, field: keyof BankAccountInfo, value: string) => {
    const updated = [...bankAccounts];
    updated[index] = { ...updated[index], [field]: value };
    setBankAccounts(updated);
  };

  const handleUploadCustomQr = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setQrisImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    const newConfig: ManualQrisConfig = {
      ...config,
      merchantName: merchantName.trim(),
      nmid: nmid.trim(),
      terminalId: terminalId.trim(),
      printedBy: printedBy.trim(),
      qrisString: qrisString.trim(),
      qrisImageUrl: qrisImageUrl.trim(),
      adminWhatsApp: adminWhatsApp.trim(),
      enableUniqueCode,
      bankAccounts,
      paymentInstructions: paymentInstructions.trim(),
      updatedAt: Date.now()
    };

    try {
      await onSaveConfig(newConfig);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Error saving QRIS config:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white">
                Pengaturan QRIS & Rekening Bank
              </h3>
              <p className="text-xs text-slate-400">
                Atur barcode QRIS statis, nomor WhatsApp CS & rekening transfer manual
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {savedSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Pengaturan QRIS & Rekening berhasil disimpan!</span>
            </div>
          )}

          {/* Merchant & Admin WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nama Merchant / Usaha
              </label>
              <input
                type="text"
                required
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                placeholder="Contoh: ZAIN.NET ACADEMIC STORE"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nomor WhatsApp Admin Verifikasi
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={adminWhatsApp}
                  onChange={(e) => setAdminWhatsApp(e.target.value)}
                  placeholder="Contoh: 085231176597"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Unique Code Toggle */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-emerald-400" />
                <span>Gunakan Kode Unik 3 Digit (Saat ini: {enableUniqueCode ? 'Aktif' : 'Nonaktif / Nominal Bulat'})</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {enableUniqueCode 
                  ? 'Menambahkan 3 digit acak di akhir nominal transfer (Contoh: Rp 8.000 menjadi Rp 8.243).' 
                  : 'Nominal transfer dibulatkan pas sesuai harga paket (Contoh: Rp 5.000, Rp 10.000, Rp 25.000) tanpa kode unik.'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableUniqueCode}
                onChange={(e) => setEnableUniqueCode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* QRIS Image & Identity Configuration */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Identitas Barcode QRIS Nasional</span>
              </h4>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRestoreOfficialQris}
                  className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Pakai QRIS Resmi ZAIN.NET</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Gambar</span>
                </button>
              </div>
            </div>

            {/* NMID & Terminal ID inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-semibold">NMID (National Merchant ID)</label>
                <input
                  type="text"
                  value={nmid}
                  onChange={(e) => setNmid(e.target.value)}
                  placeholder="ID1024339728304"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-semibold">Terminal ID</label>
                <input
                  type="text"
                  value={terminalId}
                  onChange={(e) => setTerminalId(e.target.value)}
                  placeholder="A01"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-semibold">Dicetak Oleh</label>
                <input
                  type="text"
                  value={printedBy}
                  onChange={(e) => setPrintedBy(e.target.value)}
                  placeholder="93600914"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono"
                />
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleUploadCustomQr}
              className="hidden"
            />

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                URL Gambar QRIS (Opsional / Otomatis digenerate jika kosong):
              </label>
              <input
                type="text"
                value={qrisImageUrl}
                onChange={(e) => setQrisImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {qrisImageUrl && (
              <div className="p-3 bg-slate-900 rounded-xl flex items-center gap-3 border border-slate-800">
                <img
                  src={qrisImageUrl}
                  alt="QRIS Preview"
                  className="w-20 h-20 bg-white p-1 rounded-lg object-contain"
                />
                <div className="text-xs">
                  <p className="font-bold text-emerald-300">Preview QRIS Aktif</p>
                  <p className="text-slate-400 text-[11px]">Barcode ini akan tampil di modal pembayaran semua pengguna.</p>
                </div>
              </div>
            )}
          </div>

          {/* Bank Accounts List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>Daftar Rekening Bank & E-Wallet Penerima</span>
              </h4>

              <button
                type="button"
                onClick={handleAddBankAccount}
                className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Rekening</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {bankAccounts.map((account, index) => (
                <div
                  key={index}
                  className="p-3 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 relative group"
                >
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Nama Bank / E-Wallet</label>
                    <input
                      type="text"
                      value={account.bankName}
                      onChange={(e) => handleUpdateBankField(index, 'bankName', e.target.value)}
                      placeholder="BCA / DANA / BRI"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Nomor Rekening / No. HP</label>
                    <input
                      type="text"
                      value={account.accountNumber}
                      onChange={(e) => handleUpdateBankField(index, 'accountNumber', e.target.value)}
                      placeholder="1930528811"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400 mb-0.5">Atas Nama (a.n.)</label>
                      <input
                        type="text"
                        value={account.accountHolder}
                        onChange={(e) => handleUpdateBankField(index, 'accountHolder', e.target.value)}
                        placeholder="M. ZAINI"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveBankAccount(index)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 cursor-pointer"
                      title="Hapus rekening ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Petunjuk Pembayaran Tambahan (Opsional)
            </label>
            <textarea
              rows={3}
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              placeholder="Tuliskan petunjuk transfer..."
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Crown, 
  Sparkles, 
  Users, 
  Plus, 
  Trash2, 
  Save, 
  Check, 
  Search, 
  AlertCircle, 
  Mail, 
  Percent,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Copy,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import { RolesConfig, UserRole } from '../types';
import { resolveUserRole } from '../data/toolsData';
import { 
  createOrUpdateAccountByAdmin, 
  updateAccountPasswordByAdmin, 
  deleteAccountByAdmin,
  getLocalAccounts 
} from '../utils/authService';

interface RoleManagementModalProps {
  currentConfig: RolesConfig;
  currentUserEmail?: string | null;
  onClose: () => void;
  onSaveConfig: (newConfig: RolesConfig) => void;
}

export const RoleManagementModal: React.FC<RoleManagementModalProps> = ({
  currentConfig,
  currentUserEmail,
  onClose,
  onSaveConfig
}) => {
  const [adminEmails, setAdminEmails] = useState<string[]>([...currentConfig.adminEmails]);
  const [resellerEmails, setResellerEmails] = useState<string[]>([...currentConfig.resellerEmails]);
  const [discountPercent, setDiscountPercent] = useState<number>(currentConfig.resellerDiscountPercentage || 50);
  const [adminPin, setAdminPin] = useState<string>(currentConfig.adminPinCode || 'Doraemon12');
  const [showAdminPin, setShowAdminPin] = useState<boolean>(false);
  const [visiblePasswords, setVisiblePasswords] = useState<{ [email: string]: boolean }>({});
  const [localAccounts, setLocalAccounts] = useState(() => getLocalAccounts());
  const [copiedPasswordEmail, setCopiedPasswordEmail] = useState<string | null>(null);

  // New admin email inputs
  const [newAdminInput, setNewAdminInput] = useState<string>('');
  
  // Reseller creation with password by Admin
  const [resellerEmailInput, setResellerEmailInput] = useState<string>('');
  const [resellerPasswordInput, setResellerPasswordInput] = useState<string>('');
  const [resellerNameInput, setResellerNameInput] = useState<string>('');
  const [resellerWaInput, setResellerWaInput] = useState<string>('');
  const [resellerInitialBalance, setResellerInitialBalance] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isCreatingReseller, setIsCreatingReseller] = useState<boolean>(false);
  const [resellerSuccessMsg, setResellerSuccessMsg] = useState<string | null>(null);
  const [copiedCredential, setCopiedCredential] = useState<boolean>(false);
  const [lastCreatedAccount, setLastCreatedAccount] = useState<{ email: string; password: string; name: string; balance?: number } | null>(null);

  // Quick password reset state for existing reseller
  const [resetTargetEmail, setResetTargetEmail] = useState<string | null>(null);
  const [newPasswordForReset, setNewPasswordForReset] = useState<string>('');
  const [isResettingPassword, setIsResettingPassword] = useState<boolean>(false);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

  // Status feedback
  const [adminError, setAdminError] = useState<string | null>(null);
  const [resellerError, setResellerError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Email Role Tester
  const [testEmail, setTestEmail] = useState<string>('');

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const generateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let pass = 'Zain';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += '!';
    setResellerPasswordInput(pass);
  };

  const handleAddAdmin = () => {
    setAdminError(null);
    const clean = newAdminInput.trim().toLowerCase();
    if (!clean) return;
    if (!isValidEmail(clean)) {
      setAdminError('Format email tidak valid (contoh: nama@domain.com)');
      return;
    }
    if (adminEmails.includes(clean)) {
      setAdminError('Email ini sudah terdaftar sebagai Admin.');
      return;
    }
    setAdminEmails(prev => [...prev, clean]);
    setNewAdminInput('');
  };

  const handleRemoveAdmin = (emailToRemove: string) => {
    if (adminEmails.length <= 1) {
      setAdminError('Minimal harus ada 1 email Admin.');
      return;
    }
    setAdminEmails(prev => prev.filter(e => e !== emailToRemove));
    setAdminError(null);
  };

  const handleCreateResellerAccount = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setResellerError(null);
    setResellerSuccessMsg(null);
    const cleanEmail = resellerEmailInput.trim().toLowerCase();
    const cleanPass = resellerPasswordInput.trim();
    const cleanName = resellerNameInput.trim() || 'Mitra Reseller ZAIN.NET';
    const cleanWa = resellerWaInput.trim();

    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setResellerError('Format email reseller tidak valid (contoh: mitra@domain.com)');
      return;
    }

    if (!cleanPass || cleanPass.length < 4) {
      setResellerError('Password reseller minimal 4 karakter.');
      return;
    }

    setIsCreatingReseller(true);
    try {
      const initBal = parseInt(resellerInitialBalance.replace(/\D/g, ''), 10) || 0;
      const res = await createOrUpdateAccountByAdmin({
        email: cleanEmail,
        password: cleanPass,
        name: cleanName,
        whatsapp: cleanWa,
        role: 'reseller',
        initialBalance: initBal
      });

      if (!res.success) {
        setResellerError(res.error || 'Gagal membuat akun reseller.');
        setIsCreatingReseller(false);
        return;
      }

      // Add to resellerEmails list if not already present
      if (!resellerEmails.includes(cleanEmail)) {
        const updatedList = [...resellerEmails, cleanEmail];
        setResellerEmails(updatedList);
        onSaveConfig({
          ...currentConfig,
          resellerEmails: updatedList,
          resellerDiscountPercentage: discountPercent,
          adminPinCode: adminPin
        });
      }

      setLastCreatedAccount({
        email: cleanEmail,
        password: cleanPass,
        name: cleanName,
        balance: initBal
      });

      setLocalAccounts(getLocalAccounts());
      setResellerSuccessMsg(`Akun Reseller "${cleanEmail}" beserta password berhasil dibuat dan disimpan!`);
      setResellerEmailInput('');
      setResellerPasswordInput('');
      setResellerNameInput('');
      setResellerWaInput('');
      setResellerInitialBalance('');
    } catch (err: any) {
      setResellerError(err?.message || 'Terjadi kesalahan saat membuat akun reseller.');
    } finally {
      setIsCreatingReseller(false);
    }
  };

  const handleCopyWhatsAppGuide = (account: { email: string; password: string; name?: string; balance?: number }) => {
    const balanceInfo = account.balance && account.balance > 0 
      ? `\n💰 *Saldo Awal:* Rp ${account.balance.toLocaleString('id-ID')}`
      : '';
    const text = `*AKUN RESELLER ZAIN.NET ACADEMIC HUB*
Halo ${account.name || 'Mitra'}, akun reseller Anda telah aktif:
📧 *Email:* ${account.email}
🔑 *Password:* ${account.password}${balanceInfo}
🏷️ *Hak Akses:* Reseller Mitra Resmi
🎁 *Keuntungan:* Diskon 50% untuk Setiap Menu Modul (Otomatis Aktif)
🌐 *Link Login:* ${window.location.origin}
(Pilih tombol 'Masuk Akun' lalu login dengan Email & Password di atas)`;

    navigator.clipboard.writeText(text);
    setCopiedCredential(true);
    setTimeout(() => setCopiedCredential(false), 2500);
  };

  const handleSaveResetPassword = async (email: string) => {
    if (!newPasswordForReset.trim() || newPasswordForReset.trim().length < 4) {
      setResetFeedback('Password baru minimal 4 karakter.');
      return;
    }
    setIsResettingPassword(true);
    try {
      const res = await updateAccountPasswordByAdmin(email, newPasswordForReset.trim());
      if (res.success) {
        setLocalAccounts(getLocalAccounts());
        setResetFeedback(`Password untuk ${email} berhasil diubah menjadi "${newPasswordForReset.trim()}"!`);
        setTimeout(() => {
          setResetTargetEmail(null);
          setNewPasswordForReset('');
          setResetFeedback(null);
        }, 2500);
      } else {
        setResetFeedback(res.error || 'Gagal mengubah password.');
      }
    } catch (e: any) {
      setResetFeedback(e?.message || 'Gagal mengubah password.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleRemoveReseller = async (emailToRemove: string) => {
    setResellerEmails(prev => prev.filter(e => e !== emailToRemove));
    await deleteAccountByAdmin(emailToRemove);
    setResellerError(null);
  };

  const handleSave = () => {
    const updated: RolesConfig = {
      adminEmails: Array.from(new Set(adminEmails.map(e => e.trim().toLowerCase()))),
      resellerEmails: Array.from(new Set(resellerEmails.map(e => e.trim().toLowerCase()))),
      resellerDiscountPercentage: Math.max(1, Math.min(99, Number(discountPercent) || 50)),
      adminPinCode: adminPin.trim() || 'Doraemon12',
      updatedAt: Date.now()
    };
    onSaveConfig(updated);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
  };

  const simulatedConfig: RolesConfig = {
    adminEmails,
    resellerEmails,
    resellerDiscountPercentage: discountPercent
  };
  const testRole: UserRole = testEmail ? resolveUserRole(testEmail, simulatedConfig) : 'public';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in overflow-y-auto">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative text-slate-100 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 shrink-0">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white leading-tight">
              Manajemen Role & Hak Akses Pengguna
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Atur daftar email untuk Admin (Semua Gratis), Reseller/Partner (Diskon 50%), dan User Umum (Normal).
            </p>
          </div>
        </div>

        {/* 3 Categories Overview Pill */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-6">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-300">1. Role Admin</span>
            </div>
            <p className="text-[11px] text-slate-300 font-semibold">Harga: Rp 0 (Semua Gratis)</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Akses langsung seluruh modul tanpa batasan kuota.</p>
          </div>

          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-blue-300">2. Role Reseller / Partner</span>
            </div>
            <p className="text-[11px] text-slate-300 font-semibold">Harga: Diskon {discountPercent}% All Item</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Potongan setengah harga untuk setiap modul & paket.</p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-300">3. Role User Umum</span>
            </div>
            <p className="text-[11px] text-slate-300 font-semibold">Harga: Tarif Normal</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Email yang tidak terdaftar otomatis menjadi User Umum.</p>
          </div>
        </div>

        {/* Section 1: Admin Emails Management */}
        <div className="mb-5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Daftar Email Admin ({adminEmails.length})
              </h4>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
              All Gratis
            </span>
          </div>

          {/* Add Admin Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={newAdminInput}
                onChange={(e) => setNewAdminInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAdmin()}
                placeholder="Masukkan email Google admin baru..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
            <button
              onClick={handleAddAdmin}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-colors shadow-md shadow-amber-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </div>

          {adminError && (
            <p className="text-[11px] text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>{adminError}</span>
            </p>
          )}

          {/* Admin Email List */}
          <div className="flex flex-wrap gap-2 pt-1 max-h-32 overflow-y-auto">
            {adminEmails.map((email) => (
              <div 
                key={email}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs font-mono"
              >
                <span>{email}</span>
                {email === currentUserEmail && (
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-sans font-bold">Anda</span>
                )}
                <button
                  onClick={() => handleRemoveAdmin(email)}
                  title="Hapus dari Admin"
                  className="text-amber-400/60 hover:text-red-400 p-0.5 rounded cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Reseller Emails & Password Management (Admin creates account + password) */}
        <div className="mb-5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Kelola & Buat Akun Reseller ({resellerEmails.length})
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                🎁 Free Trial 3x Per Item
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Diskon Reseller:</span>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5 text-xs font-bold text-blue-300">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-10 bg-transparent text-center focus:outline-none"
                  />
                  <span>%</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Admin dapat <strong>membuatkan akun reseller beserta password-nya</strong> langsung di bawah ini. Pendaftaran akun reseller eksklusif hanya dapat dibuat oleh Admin. Reseller dapat langsung login menggunakan email dan kata sandi yang ditentukan, serta otomatis mendapatkan <strong>Diskon 50% untuk setiap menu</strong> (tanpa free trial).
          </p>

          {/* Form Buat Akun Reseller Beserta Password oleh Admin */}
          <form 
            onSubmit={handleCreateResellerAccount}
            className="p-3.5 rounded-xl bg-slate-900/90 border border-blue-900/40 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                Buat Akun Reseller Baru (Email & Password)
              </span>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer font-medium"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Buat Sandi Acak Otomatis</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Email Reseller */}
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={resellerEmailInput}
                  onChange={(e) => setResellerEmailInput(e.target.value)}
                  placeholder="Email reseller (contoh: mitra@gmail.com)..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                  required
                />
              </div>

              {/* Password Reseller (Dibuatkan oleh Admin) */}
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={resellerPasswordInput}
                  onChange={(e) => setResellerPasswordInput(e.target.value)}
                  placeholder="Buatkan password reseller (min. 4 kar)..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  title={showPassword ? "Sembunyikan" : "Lihat sandi"}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Nama Mitra / Toko (Opsional) */}
              <div className="relative">
                <Users className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={resellerNameInput}
                  onChange={(e) => setResellerNameInput(e.target.value)}
                  placeholder="Nama mitra / nama reseller (opsional)..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* No WhatsApp Reseller (Opsional) */}
              <div className="relative">
                <span className="text-[10px] font-bold text-slate-500 absolute left-3 top-1/2 -translate-y-1/2">WA</span>
                <input
                  type="text"
                  value={resellerWaInput}
                  onChange={(e) => setResellerWaInput(e.target.value)}
                  placeholder="No. WhatsApp mitra (opsional)..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* Saldo Awal Dompet Reseller (Opsional) */}
              <div className="relative sm:col-span-2">
                <span className="text-[10px] font-bold text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2">Rp</span>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={resellerInitialBalance}
                  onChange={(e) => setResellerInitialBalance(e.target.value)}
                  placeholder="Saldo awal dompet reseller (opsional, contoh: 50000)..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-500">
                Reseller dapat langsung login tanpa harus register mandiri.
              </span>
              <button
                type="submit"
                disabled={isCreatingReseller}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-md shadow-blue-600/30 shrink-0"
              >
                {isCreatingReseller ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mendaftarkan...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Buatkan Akun & Password</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Feedback Messages */}
          {resellerError && (
            <p className="text-[11px] text-red-400 flex items-center gap-1.5 p-2 rounded-lg bg-red-950/40 border border-red-900/40">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{resellerError}</span>
            </p>
          )}

          {/* Success Banner with One-Click Copy for WhatsApp */}
          {lastCreatedAccount && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Akun Reseller Berhasil Dibuat!
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyWhatsAppGuide(lastCreatedAccount)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                >
                  {copiedCredential ? (
                    <>
                      <Check className="w-3 h-3 text-white" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Salin Format WhatsApp Reseller</span>
                    </>
                  )}
                </button>
              </div>
              <div className="text-[11px] text-slate-300 space-y-0.5 font-mono bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <div>Email: <strong className="text-white">{lastCreatedAccount.email}</strong></div>
                <div>Password: <strong className="text-emerald-300">{lastCreatedAccount.password}</strong></div>
                <div className="text-[10px] text-slate-400 font-sans mt-1">
                  Kirimkan detail di atas kepada reseller agar dapat langsung masuk ke web.
                </div>
              </div>
            </div>
          )}

          {/* Daftar Reseller Aktif dengan Tombol Ganti Sandi & Hapus */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400">
                Daftar Email Reseller Aktif ({resellerEmails.length}):
              </span>
            </div>

            {resellerEmails.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {resellerEmails.map((email) => {
                  const account = localAccounts.find(a => a.email.toLowerCase() === email.toLowerCase());
                  const password = account?.rawPassword;
                  const isVisible = visiblePasswords[email] || false;

                  return (
                    <div 
                      key={email}
                      className="flex flex-col gap-2 px-3 py-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-200 text-xs font-mono"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="truncate font-semibold">{email}</span>
                          <span className="text-[9px] font-sans px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                            Diskon 50%
                          </span>
                        </div>

                        {/* Sandi Reseller Preview & Control for Admin */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 bg-slate-950/90 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px]">
                            <span className="text-slate-400 font-sans text-[10px]">Sandi:</span>
                            {password ? (
                              <>
                                <span className={isVisible ? "text-amber-300 font-bold font-mono select-all" : "text-slate-400 tracking-wider font-bold"}>
                                  {isVisible ? password : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setVisiblePasswords(prev => ({ ...prev, [email]: !prev[email] }))}
                                  title={isVisible ? "Sembunyikan Sandi" : "Lihat Sandi Reseller"}
                                  className="text-slate-400 hover:text-amber-300 p-0.5 cursor-pointer transition-colors"
                                >
                                  {isVisible ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(password);
                                    setCopiedPasswordEmail(email);
                                    setTimeout(() => setCopiedPasswordEmail(null), 2000);
                                  }}
                                  title="Salin Sandi"
                                  className="text-slate-400 hover:text-cyan-300 p-0.5 cursor-pointer transition-colors"
                                >
                                  {copiedPasswordEmail === email ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </>
                            ) : (
                              <span className="text-slate-500 italic text-[10px] font-sans">
                                Belum tersimpan (klik Ganti Password)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Ganti Password Reseller */}
                            <button
                              type="button"
                              onClick={() => {
                                if (resetTargetEmail === email) {
                                  setResetTargetEmail(null);
                                  setNewPasswordForReset('');
                                  setResetFeedback(null);
                                } else {
                                  setResetTargetEmail(email);
                                  setNewPasswordForReset('');
                                  setResetFeedback(null);
                                }
                              }}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-sans font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <KeyRound className="w-2.5 h-2.5 text-amber-400" />
                              <span>{resetTargetEmail === email ? 'Batal' : 'Ganti Password'}</span>
                            </button>

                            {/* Hapus Reseller */}
                            <button
                              type="button"
                              onClick={() => handleRemoveReseller(email)}
                              title="Hapus dari daftar Reseller"
                              className="p-1 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                    {/* Inline Form Ganti Password untuk Reseller Ini */}
                    {resetTargetEmail === email && (
                      <div className="w-full mt-2 pt-2 border-t border-blue-900/50 flex flex-col sm:flex-row items-center gap-2 animate-in fade-in">
                        <div className="relative flex-1 w-full">
                          <Lock className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={newPasswordForReset}
                            onChange={(e) => setNewPasswordForReset(e.target.value)}
                            placeholder="Ketik password baru reseller..."
                            className="w-full pl-7 pr-3 py-1.5 bg-slate-900 border border-amber-500/40 rounded-lg text-xs text-amber-200 font-mono focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={isResettingPassword}
                          onClick={() => handleSaveResetPassword(email)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[11px] font-sans rounded-lg flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                        >
                          <Save className="w-3 h-3" />
                          <span>Simpan Sandi Baru</span>
                        </button>
                      </div>
                    )}

                    {resetTargetEmail === email && resetFeedback && (
                      <div className="w-full text-[10px] font-sans text-amber-300 p-1.5 rounded bg-amber-950/40 border border-amber-500/30">
                        {resetFeedback}
                      </div>
                    )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-1">
                Belum ada akun reseller. Gunakan form di atas untuk membuat akun reseller beserta password-nya.
              </p>
            )}
          </div>
        </div>

        {/* Section 3: Kunci Rahasia / PIN Admin (Login Tanpa Google) */}
        <div className="mb-5 p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Kunci Rahasia / PIN Admin (Bypass Google Auth)
              </h4>
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Akses Darurat & Offline
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Jika sistem otentikasi Google atau Firebase mengalami gangguan, Anda dapat masuk dan membuka panel Admin secara instan hanya dengan memasukkan PIN rahasia ini.
          </p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type={showAdminPin ? 'text' : 'password'}
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder="Atur PIN Rahasia Admin..."
                className="w-full pl-3 pr-9 py-2 bg-slate-900 border border-amber-500/40 focus:border-amber-400 rounded-xl text-xs text-amber-200 font-mono tracking-wider focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowAdminPin(!showAdminPin)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-300 cursor-pointer"
                title={showAdminPin ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showAdminPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setAdminPin('Doraemon12')}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
            >
              Reset Default
            </button>
          </div>
        </div>

        {/* Section 4: Live Role Tester */}
        <div className="mb-5 p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300">
              Cek Status Role untuk Email Tertentu:
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Ketik email untuk tes role (misal: user@gmail.com)..."
              className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
            />
            {testEmail && (
              <div className="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5">
                {testRole === 'admin' && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Admin (All Gratis)
                  </span>
                )}
                {testRole === 'reseller' && (
                  <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Reseller (Trial 3x & Diskon {discountPercent}%)
                  </span>
                )}
                {testRole === 'public' && (
                  <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    User Umum (Harga Normal)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <p className="text-[11px] text-slate-500">
            Perubahan akan otomatis tersinkronisasi ke Firebase Firestore.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan Role</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Sparkles, 
  FileText, 
  Scissors, 
  Hash, 
  BookOpen, 
  ShieldCheck, 
  ArrowRight,
  AlertCircle,
  Loader2,
  LogIn,
  UserPlus,
  KeyRound,
  Eye,
  EyeOff,
  Mail,
  User,
  GraduationCap,
  Building,
  Lock,
  Phone,
  CheckCircle2,
  Crown,
  UserCheck,
  Receipt
} from 'lucide-react';
import { AppUser, RolesConfig } from '../types';
import { 
  loginWithEmailPassword, 
  registerStudentAccount, 
  loginWithAdminMasterPin 
} from '../utils/authService';

interface LoginViewProps {
  rolesConfig: RolesConfig;
  onLoginSuccess: (user: AppUser) => void;
  onGuestLogin?: () => void;
  onNavigateToBlog?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ 
  rolesConfig,
  onLoginSuccess, 
  onGuestLogin,
  onNavigateToBlog 
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'admin_pin'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State: Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Form State: Register (Mahasiswa & Umum)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUniv, setRegUniv] = useState('');
  const [regMajor, setRegMajor] = useState('');
  const [regWa, setRegWa] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Form State: Admin PIN Quick Access
  const [adminPin, setAdminPin] = useState('');
  const [adminEmail, setAdminEmail] = useState(rolesConfig.adminEmails[0] || 'hanafisumenep@gmail.com');
  const [showAdminPin, setShowAdminPin] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await loginWithEmailPassword({
        email: loginEmail,
        password: loginPassword,
        rolesConfig
      });

      if (!res.success || !res.user) {
        setError(res.error || 'Gagal masuk. Periksa kembali email dan kata sandi.');
        setLoading(false);
        return;
      }

      setSuccessMsg(`Selamat datang kembali, ${res.user.displayName || 'Pengguna'}!`);
      setTimeout(() => {
        onLoginSuccess(res.user!);
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Terjadi kendala saat masuk sistem.');
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (regPassword !== regConfirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok. Pastikan kedua kata sandi sama.');
      return;
    }

    setLoading(true);

    try {
      const res = await registerStudentAccount({
        name: regName,
        email: regEmail,
        password: regPassword,
        university: regUniv,
        major: regMajor,
        whatsapp: regWa,
        rolesConfig
      });

      if (!res.success || !res.user) {
        setError(res.error || 'Pendaftaran gagal. Silakan coba kembali.');
        setLoading(false);
        return;
      }

      setSuccessMsg(`Pendaftaran akun mahasiswa berhasil! Mengalihkan ke dashboard...`);
      setTimeout(() => {
        onLoginSuccess(res.user!);
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Terjadi kendala saat pendaftaran akun.');
      setLoading(false);
    }
  };

  const handleAdminPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    const res = loginWithAdminMasterPin(adminPin, adminEmail, rolesConfig);
    if (!res.success || !res.user) {
      setError(res.error || 'PIN Rahasia Admin salah.');
      setLoading(false);
      return;
    }

    setSuccessMsg('Otorisasi Administrator berhasil! Membuka panel kontrol...');
    setTimeout(() => {
      onLoginSuccess(res.user!);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center p-3 sm:p-6 md:p-8 text-slate-100 relative">
      
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg z-10 my-4 sm:my-8">
        {onNavigateToBlog && (
          <div className="mb-3 text-center">
            <button
              type="button"
              onClick={onNavigateToBlog}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-semibold shadow-lg transition-all cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-rose-400" />
              <span>Buka Blog & Repositori Makalah (Tanpa Login)</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        )}
        
        {/* Main Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl shadow-black/60">
          
          {/* Brand Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 sm:w-18 sm:h-18 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-indigo-500/25 ring-4 ring-white/10 mb-3">
              Z
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
              ZAIN.NET
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Pusat Tools Skripsi, Artikel & Makalah Akademik
            </p>

            <div className="flex items-center justify-center gap-2 mt-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[11px] font-semibold text-indigo-300">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Login & Registrasi Web Mandiri</span>
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 mb-6">
            <button
              type="button"
              id="tab-btn-login"
              onClick={() => { setActiveTab('login'); setError(null); setSuccessMsg(null); }}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk Akun</span>
            </button>

            <button
              type="button"
              id="tab-btn-register"
              onClick={() => { setActiveTab('register'); setError(null); setSuccessMsg(null); }}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Daftar Akun</span>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-white/20 text-white uppercase hidden sm:inline-block">
                Baru
              </span>
            </button>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMsg}</div>
            </div>
          )}

          {/* ================= TAB 1: MASUK (SIGN IN) ================= */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="nama@email.com atau email kampus"
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveTab('admin_pin')}
                    className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Crown className="w-3 h-3" />
                    <span>Login Kunci PIN Admin</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Masukkan kata sandi Anda"
                    className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/30 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses Masuk...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Masuk ke ZAIN.NET</span>
                  </>
                )}
              </button>

              {/* Tombol Masuk Sebagai Tamu - Di Bawah Tombol Masuk ke ZAIN.NET dengan Desain & Ukuran Kolom Sama */}
              {onGuestLogin && (
                <button
                  type="button"
                  id="guest-signin-btn"
                  onClick={onGuestLogin}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/30 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 mt-2.5"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Masuk sebagai tamu</span>
                </button>
              )}

              <div className="text-center pt-2">
                <p className="text-xs text-slate-400">
                  Belum punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => { setActiveTab('register'); setError(null); }}
                    className="text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
                  >
                    Daftar Akun Mahasiswa
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ================= TAB 2: DAFTAR AKUN MAHASISWA ================= */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Pendaftaran Akun Mahasiswa & Umum ZAIN.NET</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Lengkap <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Nama Lengkap Anda"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Asal Kampus / Universitas
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={regUniv}
                      onChange={(e) => setRegUniv(e.target.value)}
                      placeholder="Contoh: UNESA, UB, UI..."
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Program Studi / Jurusan
                  </label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={regMajor}
                      onChange={(e) => setRegMajor(e.target.value)}
                      placeholder="Contoh: Manajemen, TI..."
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Alamat Email <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="email@gmail.com"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nomor WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={regWa}
                      onChange={(e) => setRegWa(e.target.value)}
                      placeholder="081234567890"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kata Sandi (Min. 6 Karakter) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-9 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Konfirmasi Sandi <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/30 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 mt-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mendaftarkan Akun Anda...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Daftar Akun Mahasiswa Sekarang</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <p className="text-xs text-slate-400">
                  Sudah punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => { setActiveTab('login'); setError(null); }}
                    className="text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
                  >
                    Masuk di sini
                  </button>
                </p>
              </div>

            </form>
          )}

          {/* ================= TAB 3: ADMIN MASTER PIN ================= */}
          {activeTab === 'admin_pin' && (
            <form onSubmit={handleAdminPinSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>Akses Langsung Administrator</span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Gunakan PIN Rahasia Admin untuk membuka kontrol penuh ZAIN.NET, verifikasi bukti pembayaran QRIS, atur kuota, dan kelola role tanpa perlu password biasa.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  PIN Rahasia Admin
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showAdminPin ? 'text' : 'password'}
                    required
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="Masukkan PIN Rahasia Admin"
                    className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPin(!showAdminPin)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showAdminPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Administrator
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="fastprint2026@gmail.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Membuka Akses Admin...</span>
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4 text-slate-950" />
                    <span>Buka Akses Admin Sekarang</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => { setActiveTab('login'); setError(null); }}
                  className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
                >
                  Kembali ke Form Masuk Biasa
                </button>
              </div>
            </form>
          )}

          {/* Promo Pengguna Terdaftar */}
          <div className="mt-6 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border border-amber-500/20 text-left">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/30">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-amber-300">
                    Promo Spesial Akun Mahasiswa
                  </span>
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 uppercase">
                    Beli 3 Gratis 1
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  Setiap kali menyelesaikan <strong>3x transaksi modul</strong>, sistem otomatis memberikan <strong>1x Kuota Bebas Pilih Gratis (Rp 0)</strong>!
                </p>
              </div>
            </div>
          </div>

          {/* Direct Shortcut to Menu No 11 (Nota Jilid / Kasir Hardcover) */}
          <div className="mt-5 p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-emerald-950/40 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Menu No. 11: Nota Jilid & Kasir Pembayaran</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    Bebas Akses
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Akses langsung cetak nota jilid & kalkulasi biaya tanpa perlu login
                </p>
              </div>
            </div>
            <a
              href="/notajilid"
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 shadow-md shrink-0 cursor-pointer"
            >
              <span>Buka Nota Jilid</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* WhatsApp Admin Support Link */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <a
              href="https://wa.me/6285231176597?text=Halo%20Admin%20ZAIN.NET%2C%20saya%20ingin%20bertanya%20seputar%20pendaftaran%20akun%20mahasiswa."
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors py-1.5 px-3 rounded-lg hover:bg-emerald-950/40 inline-flex items-center gap-1.5"
            >
              <span>Butuh bantuan akun? Hubungi WhatsApp Admin (085231176597)</span>
            </a>
          </div>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-3 text-slate-500 font-medium tracking-wider text-[10px]">
                Fitur Unggulan Tersedia
              </span>
            </div>
          </div>

          {/* Tools Highlights Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-left">
            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">Buat Artikel</p>
                <p className="text-[10px] text-slate-400 truncate">3 Modul Cerdas</p>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                <Scissors className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">Pisah PDF</p>
                <p className="text-[10px] text-slate-400 truncate">3 Pemisah Bab</p>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400 shrink-0">
                <Hash className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">Penomoran</p>
                <p className="text-[10px] text-slate-400 truncate">Format Baku</p>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">Penyusun Makalah</p>
                <p className="text-[10px] text-slate-400 truncate">Standar Kampus</p>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-2 col-span-2 sm:col-span-1">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">Turun Plagiasi</p>
                <p className="text-[10px] text-slate-400 truncate">Parafrase Skripsi</p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500 mt-5">
          © 2026 ZAIN.NET — Sistem Otentikasi & Manajemen Akademik Mandiri
        </p>

      </div>
    </div>
  );
};

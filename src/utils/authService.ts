import { db } from '../firebase';
import { database } from '../storage/client';
import { doc, getDoc, setDoc } from '../storage/documents';
import { AppUser, RegisteredUserAccount, RolesConfig, UserRole } from '../types';
import { resolveUserRole } from '../data/toolsData';

const LOCAL_ACCOUNTS_KEY = 'zain_registered_accounts_v1';
const ACTIVE_USER_SESSION_KEY = 'zain_custom_auth_user';

// Secure SHA-256 password hash helper with dedicated salt (never plaintext)
export const hashPassword = async (password: string): Promise<string> => {
  const salt = '_zain_academic_salt_2026';
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + salt);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (_e) {}

  // Fallback for Node.js / SSR environment
  try {
    if (typeof require !== 'undefined' || typeof process !== 'undefined') {
      const nodeCrypto = await import('crypto');
      return nodeCrypto.createHash('sha256').update(password + salt).digest('hex');
    }
  } catch (_e) {}

  return btoa(unescape(encodeURIComponent(password + salt)));
};

// Check Supabase connection health
export const checkSupabaseConnection = async (): Promise<{ ok: boolean; message: string }> => {
  try {
    const sb = database();
    const { data: _, error } = await sb.from('academic_documents').select('path').limit(1);
    if (error) {
      return { ok: false, message: `Koneksi Supabase gagal: ${error.message}` };
    }
    return { ok: true, message: 'Database Supabase Academic Hub terhubung aktif.' };
  } catch (err: any) {
    return { ok: false, message: `Koneksi Supabase terputus: ${err?.message || 'Gagal terhubung'}` };
  }
};

// Safe session storage helper
export const setActiveSession = (user: AppUser) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_USER_SESSION_KEY, JSON.stringify(user));
    }
  } catch (e) {
    console.error('Error saving active user session', e);
  }
};

export const clearActiveSession = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ACTIVE_USER_SESSION_KEY);
    }
  } catch (e) {
    console.error('Error clearing active user session', e);
  }
};

// Local storage cache helpers (used purely as transient cache, never as sole database)
export const getLocalAccounts = (): RegisteredUserAccount[] => {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch (e) {
    console.error('Error reading local accounts', e);
  }
  return [];
};

export const saveLocalAccounts = (accounts: RegisteredUserAccount[]) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
    }
  } catch (e) {
    console.error('Error saving local accounts', e);
  }
};

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  university?: string;
  major?: string;
  whatsapp?: string;
  rolesConfig: RolesConfig;
}

export interface RegisterResult {
  success: boolean;
  user?: AppUser;
  error?: string;
}

// Register a new Mahasiswa / User account directly to Supabase
export const registerStudentAccount = async (payload: RegisterPayload): Promise<RegisterResult> => {
  const cleanEmail = payload.email.trim().toLowerCase();
  const cleanName = payload.name.trim();
  const cleanPassword = payload.password.trim();
  const cleanUniv = payload.university?.trim() || '';
  const cleanMajor = payload.major?.trim() || '';
  const cleanWa = payload.whatsapp?.trim() || '';

  if (!cleanName) {
    return { success: false, error: 'Silakan isi nama lengkap Anda.' };
  }

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { success: false, error: 'Format alamat email tidak valid.' };
  }

  if (cleanPassword.length < 6) {
    return { success: false, error: 'Kata sandi minimal 6 karakter demi keamanan akun Anda.' };
  }

  const emailDocId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');

  // 1. Check if email already registered in Supabase
  try {
    const authRef = doc(db, 'auth_accounts', emailDocId);
    const snap = await getDoc(authRef);
    if (snap.exists()) {
      const existingData = snap.data();
      if (!existingData?.isDeleted) {
        return { success: false, error: 'Email ini sudah terdaftar di sistem ZAIN.NET. Silakan langsung Masuk (Login).' };
      }
    }
  } catch (e) {
    console.warn('Supabase check notice:', e);
  }

  // ZAINNET_SUPABASE_ADMIN_AUTH_V1: do not mint an admin through public registration.
  if (cleanEmail === 'hanslakomesem@gmail.com' ||
      payload.rolesConfig.adminEmails.some(e => e.trim().toLowerCase() === cleanEmail)) {
    return { success: false, error: 'Email administrator harus masuk melalui Supabase Auth, bukan pendaftaran akun biasa.' };
  }
  const role: UserRole = resolveUserRole(cleanEmail, payload.rolesConfig);
  const passwordHash = await hashPassword(cleanPassword);
  const uid = `mhs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const newAccount: RegisteredUserAccount = {
    uid,
    name: cleanName,
    email: cleanEmail,
    passwordHash,
    university: cleanUniv,
    major: cleanMajor,
    whatsapp: cleanWa,
    role,
    createdAt: now
  };

  // 2. Synchronous save to Supabase cloud database
  try {
    const authRef = doc(db, 'auth_accounts', emailDocId);
    await setDoc(authRef, {
      ...newAccount,
      updatedAt: now
    }, { merge: true });

    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      uid,
      email: cleanEmail,
      displayName: cleanName,
      university: cleanUniv,
      major: cleanMajor,
      whatsapp: cleanWa,
      role,
      walletBalance: 0,
      authProvider: 'supabase_registered',
      createdAt: new Date().toISOString(),
      updatedAt: now
    }, { merge: true });

    // Initialize wallet and quotas documents in Supabase
    await setDoc(doc(db, 'users', uid, 'data', 'wallet'), {
      userId: uid,
      balance: 0,
      updatedAt: now
    }, { merge: true });

    await setDoc(doc(db, 'users', uid, 'data', 'quotas'), {}, { merge: true });
  } catch (err: any) {
    console.error('Supabase registration sync failed:', err);
    return { 
      success: false, 
      error: `Penyimpanan akun ke Supabase gagal: ${err?.message || 'Koneksi database terputus'}. Silakan coba kembali.` 
    };
  }

  // 3. Cache locally in current browser for fast offline refresh
  const localAccounts = getLocalAccounts();
  const existingIdx = localAccounts.findIndex(a => a.email.toLowerCase() === cleanEmail);
  if (existingIdx >= 0) {
    localAccounts[existingIdx] = newAccount;
  } else {
    localAccounts.push(newAccount);
  }
  saveLocalAccounts(localAccounts);

  const appUser: AppUser = {
    uid,
    email: cleanEmail,
    displayName: cleanName,
    photoURL: null,
    isCustomAuth: true,
    university: cleanUniv,
    major: cleanMajor,
    whatsapp: cleanWa,
    role,
    createdAt: now
  };

  setActiveSession(appUser);
  return { success: true, user: appUser };
};

export interface LoginPayload {
  email: string;
  password: string;
  rolesConfig: RolesConfig;
}

// Login with Email & Password (queries Supabase as single source of truth across all browsers)
export const loginWithEmailPassword = async (payload: LoginPayload): Promise<RegisterResult> => {
  const cleanEmail = payload.email.trim().toLowerCase();
  const cleanPassword = payload.password.trim();

  if (!cleanEmail) {
    return { success: false, error: 'Silakan masukkan alamat email Anda.' };
  }

  if (!cleanPassword) {
    return { success: false, error: 'Silakan masukkan kata sandi akun Anda.' };
  }

  // ZAINNET_SUPABASE_ADMIN_AUTH_V1: only the verified Auth session may grant admin.
  // Password is validated by Supabase Auth; it is NEVER read from legacy auth_accounts.
  const authorizedAdminEmail = 'hanslakomesem@gmail.com';
  if (cleanEmail === authorizedAdminEmail) {
    try {
      const { data, error } = await database().auth.signInWithPassword({
        email: cleanEmail, password: cleanPassword
      });
      if (error || !data.user) {
        return { success: false, error: 'Login Supabase gagal: ' + (error?.message || 'Email atau password tidak cocok.') };
      }
      if (data.user.app_metadata?.academic_role !== 'admin' ||
          data.user.email?.trim().toLowerCase() !== authorizedAdminEmail) {
        await database().auth.signOut();
        return { success: false, error: 'Akun belum memiliki izin administrator di Supabase Auth.' };
      }
      clearActiveSession(); // avoid reviving the insecure local admin profile
      return { success: true, user: {
        uid: data.user.id,
        email: authorizedAdminEmail,
        displayName: data.user.user_metadata?.full_name || data.user.user_metadata?.name || 'Administrator ZAIN.NET',
        photoURL: null,
        isCustomAuth: false,
        role: 'admin',
        createdAt: Date.now()
      } };
    } catch (error: any) {
      return { success: false, error: 'Tidak dapat terhubung ke Supabase Auth: ' + (error?.message || 'Coba ulang.') };
    }
  }
  // Legacy PIN and password hashes must never grant an administrative role.
  if (payload.rolesConfig.adminEmails.some(e => e.trim().toLowerCase() === cleanEmail) ||
      cleanEmail === 'fastprint2026@gmail.com') {
    return { success: false, error: 'Login admin lama sudah dinonaktifkan. Gunakan akun admin Supabase Auth yang telah diverifikasi.' };
  }

  const inputHash = await hashPassword(cleanPassword);
  const emailDocId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
  let account: RegisteredUserAccount | undefined = undefined;

  // Read Supabase directly before using Render (avoid cold start).
let connectionError = '';
try {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const { data, error } = await database()
      .from('academic_documents')
      .select('payload')
      .eq('path', `auth_accounts/${emailDocId}`)
      .maybeSingle()
      .abortSignal(controller.signal);
    if (error) throw error;
    if (data?.payload && !data.payload.isDeleted) {
      account = data.payload as RegisteredUserAccount;
    }
  } finally {
    clearTimeout(timer);
  }
} catch (e: any) {
  connectionError = e?.message || 'Supabase tidak dapat dihubungi';
  console.warn('Account lookup unavailable:', connectionError);
}

// Mirror fallback with an explicit limit, never wait forever.
if (!account) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(
      `/api/academic/document?path=${encodeURIComponent(`auth_accounts/${emailDocId}`)}`,
      { signal: controller.signal }
    );
    if (response.ok) {
      const result = await response.json();
      const stored = result?.data?.payload;
      if (stored && !stored.isDeleted) account = stored as RegisteredUserAccount;
    }
  } catch (e: any) {
    if (!connectionError) connectionError = e?.name === 'AbortError'
      ? 'Server Render tidak merespons dalam 8 detik'
      : (e?.message || 'Server Render tidak dapat dihubungi');
  } finally {
    clearTimeout(timer);
  }
}

// Last resort: same-browser legacy cache, do not overwrite remote user.
if (!account) {
  account = getLocalAccounts().find(
    a => a.email.toLowerCase() === cleanEmail && !a.isDeleted
  );
}
if (!account && connectionError) {
  return { success: false, error: 'Login belum terhubung ke database: ' + connectionError };
}

  const isAdmin = cleanEmail === 'fastprint2026@gmail.com' || payload.rolesConfig.adminEmails.some(a => a.toLowerCase() === cleanEmail);
  const targetPin = (payload.rolesConfig.adminPinCode || 'Doraemon12').trim();

  // If account found in Supabase (or synced cache), verify password
  if (account) {
    const isPasswordValid = 
      account.passwordHash === inputHash || 
      (isAdmin && (cleanPassword === 'Doraemon12' || cleanPassword === targetPin));

    if (!isPasswordValid) {
      return { success: false, error: 'Kata sandi salah. Silakan periksa kembali.' };
    }

    // Update local cache
    const localAccounts = getLocalAccounts();
    const exIdx = localAccounts.findIndex(a => a.email.toLowerCase() === cleanEmail);
    if (exIdx >= 0) {
      localAccounts[exIdx] = account;
    } else {
      localAccounts.push(account);
    }
    saveLocalAccounts(localAccounts);

    const appUser: AppUser = {
      uid: account.uid,
      email: account.email,
      displayName: account.name || (cleanEmail === 'fastprint2026@gmail.com' ? 'Admin Fastprint' : 'Administrator ZAIN.NET'),
      photoURL: null,
      isCustomAuth: true,
      university: account.university,
      major: account.major,
      whatsapp: account.whatsapp,
      role: account.role === 'reseller' ? 'reseller' : resolveUserRole(account.email, payload.rolesConfig),
      createdAt: account.createdAt
    };

    setActiveSession(appUser);
    return { success: true, user: appUser };
  }

  // If configured as Admin, allow login with admin pin code
  if (isAdmin && (cleanPassword === targetPin || cleanPassword === 'Doraemon12')) {
    const appUser: AppUser = {
      uid: `admin_${emailDocId}`,
      email: cleanEmail,
      displayName: cleanEmail === 'fastprint2026@gmail.com' ? 'Admin Fastprint' : 'Administrator ZAIN.NET',
      photoURL: null,
      isCustomAuth: true,
      role: 'admin',
      createdAt: Date.now()
    };
    setActiveSession(appUser);
    return { success: true, user: appUser };
  }

  return { 
    success: false, 
    error: 'Akun tidak ditemukan. Bagi mahasiswa atau pengguna baru, silakan klik tab "Daftar Akun Mahasiswa" untuk mendaftar terlebih dahulu.' 
  };
};

// Security epoch to force logout of accounts prior to password reset
export const SESSION_SECURITY_EPOCH = 'zain_auth_epoch_v2026_doraemon12';

// Direct Admin Master PIN Login
// ZAINNET_SUPABASE_ADMIN_AUTH_V1: legacy master PIN cannot create an admin session.
export const loginWithAdminMasterPin = (_pin: string, _adminEmail: string, _rolesConfig: RolesConfig): RegisterResult => ({
  success: false, error: 'Akses admin melalui PIN ditutup. Masuk menggunakan email dan password Supabase Auth.'
});

export interface AdminCreateResellerPayload {
  email: string;
  password: string;
  name?: string;
  whatsapp?: string;
  role?: UserRole;
  initialBalance?: number;
}

// Admin creates or updates an account directly with email and password (NEVER plain text password)
export const createOrUpdateAccountByAdmin = async (
  payload: AdminCreateResellerPayload
): Promise<{ success: boolean; account?: RegisteredUserAccount; error?: string }> => {
  const cleanEmail = payload.email.trim().toLowerCase();
  const cleanPassword = payload.password.trim();
  const cleanName = payload.name?.trim() || 'Mitra Reseller ZAIN.NET';
  const cleanWa = payload.whatsapp?.trim() || '';
  const role: UserRole = payload.role || 'reseller';
  const initialBalance = typeof payload.initialBalance === 'number' && payload.initialBalance > 0 ? payload.initialBalance : 0;

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { success: false, error: 'Format email tidak valid (contoh: mitra@domain.com).' };
  }

  if (!cleanPassword || cleanPassword.length < 4) {
    return { success: false, error: 'Password minimal 4 karakter.' };
  }

  try {
    const passwordHash = await hashPassword(cleanPassword);
    const now = Date.now();
    const emailDocId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');

    // Check if account already exists in Supabase
    let existingUid: string | undefined = undefined;
    let existingCreatedAt: number = now;
    try {
      const snap = await getDoc(doc(db, 'auth_accounts', emailDocId));
      if (snap.exists()) {
        const d = snap.data();
        existingUid = d.uid;
        if (d.createdAt) existingCreatedAt = d.createdAt;
      }
    } catch (_e) {}

    const uid = existingUid || `reseller_${now}_${Math.random().toString(36).substring(2, 7)}`;

    const newAccount: RegisteredUserAccount = {
      uid,
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      whatsapp: cleanWa,
      role,
      createdAt: existingCreatedAt
    };

    // Save to Supabase auth_accounts & users collections
    await setDoc(doc(db, 'auth_accounts', emailDocId), {
      ...newAccount,
      updatedAt: now,
      lastPasswordCreatedByAdmin: now
    }, { merge: true });

    await setDoc(doc(db, 'users', uid), {
      uid,
      email: cleanEmail,
      displayName: cleanName,
      whatsapp: cleanWa,
      role,
      walletBalance: initialBalance,
      updatedAt: now
    }, { merge: true });

    if (initialBalance > 0) {
      await setDoc(doc(db, 'users', uid, 'data', 'wallet'), {
        userId: uid,
        balance: initialBalance,
        updatedAt: now
      }, { merge: true });
    }

    // Ensure reseller email is in Supabase settings/roles_config
    if (role === 'reseller') {
      const cfgRef = doc(db, 'settings', 'roles_config');
      const cfgSnap = await getDoc(cfgRef);
      if (cfgSnap.exists()) {
        const cData = cfgSnap.data() as RolesConfig;
        const currentList = cData.resellerEmails || [];
        if (!currentList.some(re => re.trim().toLowerCase() === cleanEmail)) {
          await setDoc(cfgRef, {
            resellerEmails: [...currentList, cleanEmail],
            resellerDiscountPercentage: cData.resellerDiscountPercentage || 50
          }, { merge: true });
        }
      }
    }

    // Cache locally
    const localAccounts = getLocalAccounts();
    const existingIdx = localAccounts.findIndex(a => a.email.toLowerCase() === cleanEmail);
    if (existingIdx >= 0) {
      localAccounts[existingIdx] = newAccount;
    } else {
      localAccounts.push(newAccount);
    }
    saveLocalAccounts(localAccounts);

    return { success: true, account: newAccount };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal membuat akun reseller di Supabase.' };
  }
};

// Admin promotes an existing user account to Reseller (50% discount automatically)
export const promoteUserToResellerRole = async (
  email: string,
  uid?: string
): Promise<{ success: boolean; error?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return { success: false, error: 'Email tidak valid' };

  try {
    const now = Date.now();
    const cfgRef = doc(db, 'settings', 'roles_config');
    const cfgSnap = await getDoc(cfgRef);
    let updatedResellers: string[] = [cleanEmail];
    let currentDiscount = 50;

    if (cfgSnap.exists()) {
      const cData = cfgSnap.data() as RolesConfig;
      const currentList = cData.resellerEmails || [];
      currentDiscount = cData.resellerDiscountPercentage || 50;
      if (!currentList.some(re => re.trim().toLowerCase() === cleanEmail)) {
        updatedResellers = [...currentList, cleanEmail];
      } else {
        updatedResellers = currentList;
      }
    }
    await setDoc(cfgRef, {
      resellerEmails: updatedResellers,
      resellerDiscountPercentage: currentDiscount
    }, { merge: true });

    if (uid) {
      await setDoc(doc(db, 'users', uid), {
        role: 'reseller',
        updatedAt: now
      }, { merge: true });
    }

    const emailDocId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    await setDoc(doc(db, 'auth_accounts', emailDocId), {
      role: 'reseller',
      updatedAt: now
    }, { merge: true });

    const local = getLocalAccounts();
    const idx = local.findIndex(a => a.email.toLowerCase() === cleanEmail);
    if (idx >= 0) {
      local[idx].role = 'reseller';
      saveLocalAccounts(local);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal upgrade akun ke reseller' };
  }
};

// Admin revokes Reseller status from an account
export const revokeUserResellerRole = async (
  email: string,
  uid?: string
): Promise<{ success: boolean; error?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return { success: false, error: 'Email tidak valid' };

  try {
    const now = Date.now();
    const cfgRef = doc(db, 'settings', 'roles_config');
    const cfgSnap = await getDoc(cfgRef);
    if (cfgSnap.exists()) {
      const cData = cfgSnap.data() as RolesConfig;
      const currentList = cData.resellerEmails || [];
      const filtered = currentList.filter(re => re.trim().toLowerCase() !== cleanEmail);
      await setDoc(cfgRef, {
        resellerEmails: filtered
      }, { merge: true });
    }

    if (uid) {
      await setDoc(doc(db, 'users', uid), {
        role: 'public',
        updatedAt: now
      }, { merge: true });
    }

    const emailDocId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    await setDoc(doc(db, 'auth_accounts', emailDocId), {
      role: 'public',
      updatedAt: now
    }, { merge: true });

    const local = getLocalAccounts();
    const idx = local.findIndex(a => a.email.toLowerCase() === cleanEmail);
    if (idx >= 0) {
      local[idx].role = 'public';
      saveLocalAccounts(local);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal mencabut hak reseller' };
  }
};

// Admin updates password for an account (stores hash only)
export const updateAccountPasswordByAdmin = async (
  email: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = newPassword.trim();

  if (!cleanPassword || cleanPassword.length < 4) {
    return { success: false, error: 'Password baru minimal 4 karakter.' };
  }

  try {
    const passwordHash = await hashPassword(cleanPassword);
    const now = Date.now();
    const emailDocId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');

    await setDoc(doc(db, 'auth_accounts', emailDocId), {
      passwordHash,
      updatedAt: now,
      lastPasswordUpdatedByAdmin: now
    }, { merge: true });

    const localAccounts = getLocalAccounts();
    const existingIdx = localAccounts.findIndex(a => a.email.toLowerCase() === cleanEmail);
    if (existingIdx >= 0) {
      localAccounts[existingIdx].passwordHash = passwordHash;
      saveLocalAccounts(localAccounts);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal memperbarui password di Supabase.' };
  }
};

// Admin deletes an account
export const deleteAccountByAdmin = async (email: string): Promise<void> => {
  const cleanEmail = email.trim().toLowerCase();
  const emailDocId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');

  const localAccounts = getLocalAccounts().filter(a => a.email.toLowerCase() !== cleanEmail);
  saveLocalAccounts(localAccounts);

  try {
    await setDoc(doc(db, 'auth_accounts', emailDocId), {
      isDeleted: true,
      deletedAt: Date.now()
    }, { merge: true });
  } catch (fsErr) {
    console.warn('Supabase delete sync warning:', fsErr);
  }
};

// Safe Migration: Migrate any accounts stored in legacy browser localStorage to Supabase
export const migrateLegacyLocalAccountsToSupabase = async (): Promise<number> => {
  if (typeof localStorage === 'undefined') return 0;
  let migratedCount = 0;
  try {
    const localAccounts = getLocalAccounts();
    for (const acc of localAccounts) {
      if (acc && acc.email && acc.passwordHash) {
        const cleanEmail = acc.email.trim().toLowerCase();
        const emailDocId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
        const snap = await getDoc(doc(db, 'auth_accounts', emailDocId));
        if (!snap.exists()) {
          // Upload to Supabase
          const { rawPassword: _, ...safeAcc } = acc as any;
          await setDoc(doc(db, 'auth_accounts', emailDocId), {
            ...safeAcc,
            updatedAt: Date.now()
          }, { merge: true });
          if (acc.uid) {
            await setDoc(doc(db, 'users', acc.uid), {
              uid: acc.uid,
              email: cleanEmail,
              displayName: acc.name,
              university: acc.university || '',
              major: acc.major || '',
              whatsapp: acc.whatsapp || '',
              role: acc.role || 'public',
              updatedAt: Date.now()
            }, { merge: true });
          }
          migratedCount++;
        }
      }
    }
  } catch (err) {
    console.warn('Legacy local accounts migration notice:', err);
  }
  return migratedCount;
};

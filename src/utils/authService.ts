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
// ZAINNET_SUPABASE_AUTH_ONLY_20261112: never create a browser-only login session.
export const setActiveSession = (_user: AppUser) => { /* Only Supabase Auth may establish a session. */ };

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
export const getLocalAccounts = (): RegisteredUserAccount[] => [];

export const saveLocalAccounts = (_accounts: RegisteredUserAccount[]) => { /* Legacy password storage disabled. */ };

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
  message?: string;
}

// Register a new Mahasiswa / User account directly to Supabase
export const registerStudentAccount = async (payload: RegisterPayload): Promise<RegisterResult> => {
  const email=payload.email.trim().toLowerCase();
  const name=payload.name.trim();
  const password=payload.password;
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return {success:false,error:'Nama lengkap dan email yang valid diperlukan.'};
  if (password.length < 8) return {success:false,error:'Password minimal 8 karakter.'};
  // Roles are assigned by a trusted admin, NEVER by email lists or user_metadata.
  try {
    const {data,error}=await database().auth.signUp({
      email,password,options:{data:{full_name:name}}
    });
    if(error) return {success:false,error:error.message};
    if(!data.user) return {success:false,error:'Supabase belum mengembalikan identitas akun.'};
    if(!data.session) return {success:true,message:'Cek email untuk mengonfirmasi akun Supabase, lalu masuk dengan email dan password.'};
    return {success:true,user:{
      uid:data.user.id,email:data.user.email||email,displayName:name,
      photoURL:null,isCustomAuth:false,role:'public',createdAt:Date.now()
    }};
  }catch(e:any){return {success:false,error:e?.message||'Pendaftaran Supabase gagal.'};}
};

export interface LoginPayload {
  email: string;
  password: string;
  rolesConfig: RolesConfig;
}

// Login with Email & Password (queries Supabase as single source of truth across all browsers)
export const loginWithEmailPassword = async (payload: LoginPayload): Promise<RegisterResult> => {
  const email=payload.email.trim().toLowerCase();
  const password=payload.password;
  if (!email||!password) return {success:false,error:'Masukkan email dan password Supabase.'};
  try {
    const {data,error}=await database().auth.signInWithPassword({email,password});
    if(error||!data.user)return {success:false,error:error?.message||'Akun Supabase tidak ditemukan.'};
    if (!data.user.email_confirmed_at) return {success:false,error:'Konfirmasi alamat email melalui Supabase terlebih dahulu.'};
    const role=data.user.app_metadata?.academic_role==='admin' ? 'admin'
      : data.user.app_metadata?.academic_role==='reseller' ? 'reseller' : 'public';
    clearActiveSession();
    return {success:true,user:{
      uid:data.user.id,email:data.user.email||email,
      displayName:data.user.user_metadata?.full_name||data.user.user_metadata?.name||email,
      photoURL:data.user.user_metadata?.avatar_url||null,isCustomAuth:false,
      role,createdAt:Date.now()
    }};
  }catch(e:any){return {success:false,error:e?.message||'Login Supabase gagal.'};}
};

// Security epoch to force logout of accounts prior to password reset
export const SESSION_SECURITY_EPOCH = 'zain_auth_epoch_supabase_only_v4_20261112';

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
// All account administration is delegated to a server-side Edge Function.
// Only a validated Supabase Auth admin JWT is accepted there.
async function invokeAdminAccount(action: string, email: string, extra: Record<string,unknown>={}) {
  const client=database();
  const {data:{session},error:sessionError}=await client.auth.getSession();
  if(sessionError||!session?.access_token)throw new Error('Masuk melalui Supabase Auth administrator dahulu.');
  const {data,error}=await client.functions.invoke('zainnet-admin-accounts',{
    body:{action,email,...extra},headers:{Authorization:`Bearer ${session.access_token}`}
  });
  if(error){
    let detail='';
    try{ const body=await error.context?.json?.(); detail=body?.error||''; }catch(_e){}
    throw new Error(detail||error.message||'Fungsi admin Supabase gagal.');
  }
  if(data?.error)throw new Error(data.error);
  if(!data?.ok)throw new Error('Permintaan tidak dapat diverifikasi.');
  return data;
}

export const createOrUpdateAccountByAdmin = async (
  payload: AdminCreateResellerPayload
): Promise<{ success: boolean; account?: RegisteredUserAccount; error?: string }> => {
  const email=payload.email.trim().toLowerCase();
  try{
    const r=await invokeAdminAccount('invite',email,{
      name:payload.name||'Mitra Reseller ZAIN.NET',
      initialBalance:Math.max(0,Number(payload.initialBalance||0))
    });
    return {success:true,account:{uid:r.uid,email,name:payload.name||'Mitra Reseller ZAIN.NET',
      passwordHash:'',role:'reseller',createdAt:Date.now()}};
  }catch(e:any){return {success:false,error:e?.message||'Gagal mengundang reseller.'};}
};

// Admin promotes an existing user account to Reseller (50% discount automatically)
export const promoteUserToResellerRole = async (email: string,_uid?:string): Promise<{success:boolean;error?:string}>=>{
  try{await invokeAdminAccount('promote',email.trim().toLowerCase());return {success:true};}
  catch(e:any){return {success:false,error:e?.message||'Gagal mengubah role di Supabase Auth.'};}
};

// Admin revokes Reseller status from an account
export const revokeUserResellerRole = async (email: string,_uid?:string): Promise<{success:boolean;error?:string}>=>{
  try{await invokeAdminAccount('revoke',email.trim().toLowerCase());return {success:true};}
  catch(e:any){return {success:false,error:e?.message||'Gagal mencabut role di Supabase Auth.'};}
};

// Admin updates password for an account (stores hash only)
// Admin cannot see or set another user's password in the browser.
// The user receives a Supabase password-reset email instead.
export const updateAccountPasswordByAdmin = async (email:string,_newPassword:string): Promise<{success:boolean;error?:string}>=>{
  try{await invokeAdminAccount('reset',email.trim().toLowerCase());return {success:true};}
  catch(e:any){return {success:false,error:e?.message||'Gagal mengirim tautan reset.'};}
};

// Admin deletes an account
export const deleteAccountByAdmin = async (email:string): Promise<void>=>{
  await invokeAdminAccount('disable',email.trim().toLowerCase());
};

// Safe Migration: Migrate any accounts stored in legacy browser localStorage to Supabase
export const migrateLegacyLocalAccountsToSupabase = async (): Promise<number> => {
  // Never upload browser-stored passwords or trust local account databases.
  return 0;
};

// ZAINNET_SUPABASE_AUTH_ONLY_20261112

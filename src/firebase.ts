import { appUrl } from './utils/deploymentBridge';
// Compatibility module name retained to avoid changing every component import.
// Authentication and document persistence both use Supabase.
import type { User } from 'firebase/auth';
import { database } from './storage/client';
export { db } from './storage/documents';
export type { User };
export function mapAuthUser(u: any): User | null {
  return u ? { uid: u.id, email: u.email, displayName: u.user_metadata?.name || u.user_metadata?.full_name || u.email,
    photoURL: u.user_metadata?.avatar_url || null, role: u.app_metadata?.academic_role || 'public',
    isCustomAuth: false, emailVerified: !!u.email_confirmed_at } as unknown as User : null;
}
export const auth: any = { currentUser: null };
export function onAuthStateChanged(_auth: any, callback: (user: User | null) => void) {
  let active = true;
  let subscription: any;
  try {
    subscription = database().auth.onAuthStateChange((_event, session) => {
      auth.currentUser = mapAuthUser(session?.user);
      // Do not await database work inside Supabase's auth lock.
      setTimeout(() => { if (active) callback(auth.currentUser); }, 0);
    }).data.subscription;
  } catch { setTimeout(() => { if (active) callback(null); }, 0); }
  return () => { active = false; subscription?.unsubscribe(); };
}
export async function logoutUser() { const { error } = await database().auth.signOut(); if (error) throw error; auth.currentUser = null; }
export async function loginWithGoogle(): Promise<User> {
  const { error } = await database().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + appUrl('/') } });
  if (error) throw error;
  return new Promise(() => {}); // Navigation completes the login.
}
// Old Google bridge links are no longer accepted; Supabase handles OAuth redirects.
export const GoogleAuthProvider: any = { credential: () => ({}) };
export async function signInWithCredential(..._args: any[]): Promise<any> { throw new Error('Masuk kembali melalui login Supabase.'); }
export const AUTHORIZED_CLOUD_RUN_HOST = '';
export const isAuthorizedNativeDomain = () => true;

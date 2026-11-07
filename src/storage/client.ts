import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://pxseiytikiulxincoolh.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_KA2AwEzwuepbHm2yu95IkA_eUBb2sXK';

let instance: SupabaseClient;
export function configureStorageClient(client: SupabaseClient) { instance = client; }
export function database(): SupabaseClient {
  if (instance) return instance;
  let url = import.meta.env?.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  let key = import.meta.env?.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  if (!url || url.includes('kuil') || url.includes('coohl')) url = DEFAULT_SUPABASE_URL;
  if (!key) key = DEFAULT_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY lalu build ulang.');
  if (key.startsWith('sb_secret_') || (() => { try { return JSON.parse(atob((key.split('.')[1] || ''))).role === 'service_role'; } catch { return false; } })()) {
    throw new Error('Gunakan publishable/anon key, bukan secret/service_role key.');
  }
  instance = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return instance;
}

export function isStorageConfigured(): boolean {
  if (instance) return true;
  const url = import.meta.env?.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = import.meta.env?.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes('YOUR_PROJECT'));
}

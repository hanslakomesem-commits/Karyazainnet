import { database } from './client';
// Compatibility API for the document paths used across the application.
// Connects to server-side persistent engine on /api/academic/* with Supabase backup.
export const db: any = {};
type Ref = { path: string; kind: 'doc' | 'collection'; constraints?: any[] };
function ref(kind: Ref['kind'], base: any, parts: string[]): Ref {
  const path = [base?.path, ...parts].filter(Boolean).join('/');
  return { path, kind };
}
export const doc = (base: any, ...parts: string[]) => ref('doc', base, parts);
export const collection = (base: any, ...parts: string[]) => ref('collection', base, parts);
export const increment = (value: number) => ({ __academic_increment: value });
export const orderBy = (field: string, direction = 'asc') => ({ field, direction });
export const limit = (count: number) => ({ count });
export const query = (r: Ref, ...constraints: any[]) => ({ ...r, constraints });
const snapshot = (path: string, data?: any) => ({ 
  id: path.split('/').pop()!, 
  ref: doc(db, path), 
  exists: () => data !== undefined && data !== null, 
  data: () => data 
});

export async function getDoc(r: Ref) {
  // For payment status and wallet, Supabase is authoritative. Render's
  // in-memory cache may still show an old pending transaction.
  if (r.path.startsWith('transactions/') || /\/data\/wallet$/.test(r.path)) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const { data, error } = await database()
        .from('academic_documents')
        .select('payload')
        .eq('path', r.path)
        .maybeSingle()
        .abortSignal(controller.signal);
      if (!error && data?.payload !== undefined) return snapshot(r.path, data.payload);
    } catch (_e) {} finally { clearTimeout(timeout); }
  }
  // Render remains a fallback, but a cold start must not block the UI.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`/api/academic/document?path=${encodeURIComponent(r.path)}`, { signal: controller.signal });
    if (res.ok) {
      const json = await res.json();
      if (json && json.data && json.data.payload !== undefined) {
        return snapshot(r.path, json.data.payload);
      }
    }
  } catch (_e) {} finally { clearTimeout(timeout); }

  // 2. Query Supabase directly
  try {
    const { data, error } = await database().from('academic_documents').select('payload').eq('path', r.path).maybeSingle();
    if (!error && data?.payload !== undefined) {
      return snapshot(r.path, data.payload);
    }
  } catch (_err) {}

  return snapshot(r.path, undefined);
}

export async function getDocs(r: Ref) {
  let docMap = new Map<string, any>();

  // 1. Fetch from server endpoint (bounded, so admin notifications do not freeze).
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`/api/academic/documents?parent_path=${encodeURIComponent(r.path)}`, { signal: controller.signal });
    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.data)) {
        json.data.forEach((item: any) => {
          if (item?.path) docMap.set(item.path, item.payload);
        });
      }
    }
  } catch (_e) {} finally { clearTimeout(timeout); }

  // 2. Fetch from Supabase directly to ensure no multi-device misses
  try {
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await database().from('academic_documents').select('path,payload').eq('parent_path', r.path).order('path').range(offset, offset + 499);
      if (error) break;
      if (Array.isArray(data)) {
        data.forEach((row: any) => {
          // Supabase is the source of truth for transaction approval state.
          if (row?.path && (r.path === 'transactions' || !docMap.has(row.path))) {
            docMap.set(row.path, row.payload);
          }
        });
      }
      if (!data || data.length < 500) break;
    }
  } catch (_err) {}

  let rows: any[] = [];
  for (const [path, payload] of docMap.entries()) {
    rows.push({ path, payload });
  }

  // Handle constraints (orderBy, limit)
  for (const c of r.constraints || []) {
    if (c.field) rows.sort((a,b) => {
      const x = a.payload?.[c.field], y = b.payload?.[c.field];
      return (x < y ? -1 : x > y ? 1 : 0) * (c.direction === 'desc' ? -1 : 1);
    });
    if (c.count !== undefined) rows = rows.slice(0, c.count);
  }

  const docs = rows.map(row => snapshot(row.path, row.payload));
  return { docs, empty: !docs.length, size: docs.length, forEach: (fn: (d: any) => void) => docs.forEach(fn) };
}

export async function setDoc(r: Ref, value: any, options?: { merge?: boolean }) {
  const payload = JSON.parse(JSON.stringify(value));
  let savedOnServer = false;
  let savedOnSupabase = false;

  // 1. Save to server persistent disk store
  try {
    const res = await fetch('/api/academic/write-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: r.path,
        payload,
        merge: !!options?.merge,
        update_only: false
      })
    });
    if (res.ok) {
      const resJson = await res.json();
      savedOnServer = true;
      if (resJson?.supabaseSynced) savedOnSupabase = true;
    }
  } catch (_e) {}

  // 2. Direct write to Supabase if not verified via server
  if (!savedOnSupabase) {
    try {
      const rpcRes = await database().rpc('academic_write_document', { 
        p_path: r.path, 
        p_payload: payload, 
        p_merge: !!options?.merge, 
        p_update_only: false 
      });
      if (!rpcRes.error) {
        savedOnSupabase = true;
      } else {
        const parts = r.path.split('/');
        const parentPath = parts.slice(0, -1).join('/');
        const upsertRes = await database().from('academic_documents').upsert({
          path: r.path,
          parent_path: parentPath,
          payload,
          updated_at: new Date().toISOString()
        });
        if (!upsertRes.error) savedOnSupabase = true;
      }
    } catch (_err) {}
  }

  if (!savedOnServer && !savedOnSupabase) {
    throw new Error('Gagal menyimpan data ke server dan Supabase.');
  }
}

export async function updateDoc(r: Ref, value: any) {
  const payload = JSON.parse(JSON.stringify(value));
  let savedOnServer = false;
  let savedOnSupabase = false;

  try {
    const res = await fetch('/api/academic/write-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: r.path,
        payload,
        merge: true,
        update_only: true
      })
    });
    if (res.ok) {
      const resJson = await res.json();
      savedOnServer = true;
      if (resJson?.supabaseSynced) savedOnSupabase = true;
    }
  } catch (_e) {}

  if (!savedOnSupabase) {
    try {
      const rpcRes = await database().rpc('academic_write_document', { 
        p_path: r.path, 
        p_payload: payload, 
        p_merge: true, 
        p_update_only: true 
      });
      if (!rpcRes.error) {
        savedOnSupabase = true;
      } else {
        const parts = r.path.split('/');
        const parentPath = parts.slice(0, -1).join('/');
        const upRes = await database().from('academic_documents').upsert({
          path: r.path,
          parent_path: parentPath,
          payload,
          updated_at: new Date().toISOString()
        });
        if (!upRes.error) savedOnSupabase = true;
      }
    } catch (_err) {}
  }

  if (!savedOnServer && !savedOnSupabase) {
    throw new Error('Gagal memperbarui data ke server dan Supabase.');
  }
}

export async function deleteDoc(r: Ref) {
  try {
    await fetch(`/api/academic/document?path=${encodeURIComponent(r.path)}`, { method: 'DELETE' });
  } catch (_e) {}

  try {
    await database().from('academic_documents').delete().eq('path', r.path);
  } catch (_err) {}
}

// Poll serially every 2.5s for real-time order notifications
export function onSnapshot(r: Ref, next: (snapshot: any) => void, fail?: (error: any) => void) {
  let stopped = false; 
  let timer: ReturnType<typeof setTimeout>;
  const poll = async () => {
    try { 
      const value = r.kind === 'doc' ? await getDoc(r) : await getDocs(r); 
      if (!stopped) next(value); 
    }
    catch (error) { 
      if (!stopped) fail?.(error); 
    }
    finally { 
      if (!stopped) timer = setTimeout(poll, 2500); 
    }
  };
  void poll();
  return () => { stopped = true; clearTimeout(timer); };
}


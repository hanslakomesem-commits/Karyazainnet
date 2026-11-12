import { ToolItem, UserSessionRecord, UserActivityLogEntry } from '../types';
import { database } from '../storage/client';

const SESSIONS_STORAGE_KEY = 'zain_user_tool_sessions_v1';
export const OUTBOX_STORAGE_KEY = 'zain_supabase_sessions_outbox_v1';

// Helper to get storage key scoped to user or guest
const getStorageKey = (userId?: string) => {
  return userId ? `${SESSIONS_STORAGE_KEY}_${userId}` : `${SESSIONS_STORAGE_KEY}_guest`;
};

// Retrieve all recorded sessions for the user
export const getAllUserSessions = (userId?: string): Record<string, UserSessionRecord> => {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading user tool sessions:', e);
  }
  return {};
};

// Retrieve a specific session for a tool
export const getSessionForTool = (toolId: string, userId?: string): UserSessionRecord | null => {
  const sessions = getAllUserSessions(userId);
  return sessions[toolId] || null;
};

// Hydrate user sessions from Supabase into local cache
export const hydrateUserSessions = async (userId: string): Promise<void> => {
  if (!userId || userId === 'guest') return;
  try {
    const client = database();
    const { data, error } = await client
      .from('academic_documents')
      .select('path, payload')
      .eq('parent_path', `users/${userId}/sessions`);

    if (error || !data) return;

    const key = getStorageKey(userId);
    const existing = getAllUserSessions(userId);

    // ZAINNET_LINK7_DOWNLOAD_SYNC_FIX_20261112: do not overwrite a newer
    // local completion with an older remote in-progress snapshot.
    data.forEach((row: any) => {
      if (!row.payload?.toolId) return;
      const incoming = row.payload as UserSessionRecord;
      const local = existing[incoming.toolId];
      const remoteTime = Number(incoming.completedAt || incoming.lastActiveAt || 0);
      const localTime = Number(local?.completedAt || local?.lastActiveAt || 0);
      if (!local || remoteTime > localTime ||
          (remoteTime === localTime && local.status !== 'completed')) {
        existing[incoming.toolId] = incoming;
      }
    });

    localStorage.setItem(key, JSON.stringify(existing));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zain_session_updated', {
        detail: { sessions: existing }
      }));
    }
  } catch (e) {
    console.warn('Could not hydrate user sessions from Supabase:', e);
  }
};

// Save a session record locally
export const saveUserSession = (session: UserSessionRecord): void => {
  try {
    const key = getStorageKey(session.userId);
    const sessions = getAllUserSessions(session.userId);
    sessions[session.toolId] = session;
    localStorage.setItem(key, JSON.stringify(sessions));

    // Also dispatch custom event for instant cross-component synchronization
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zain_session_updated', {
        detail: { toolId: session.toolId, session }
      }));
    }
  } catch (e) {
    console.warn('Error saving user tool session:', e);
  }
};

// Record or update session as IN PROGRESS (Belum Selesai)
// Crucial: When starting new after completion, creates a brand new unique session/job ID.
export const recordSessionInProgress = (
  tool: ToolItem,
  userId: string | undefined,
  currentLogs: UserActivityLogEntry[] = [],
  activeSeconds: number = 0,
  interactionCount: number = 0,
  notes: string = 'Pengguna membuka modul. Transaksi dalam proses pembuatan.'
): UserSessionRecord => {
  const existing = getSessionForTool(tool.id, userId);
  const now = Date.now();
  const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // If previous session was completed, allocate a brand new session/job ID
  const isPreviousCompleted = existing?.status === 'completed';
  const sessionId = !isPreviousCompleted && existing?.id ? existing.id : `sess-${tool.id}-${now}`;

  const updatedLogs: UserActivityLogEntry[] = [
    ...currentLogs,
    {
      id: `log-prog-${now}`,
      time: timeStr,
      type: 'status',
      message: `[STATUS: IN PROGRESS] ${notes}`
    }
  ];

  const session: UserSessionRecord = {
    id: sessionId,
    toolId: tool.id,
    toolTitle: tool.title,
    categoryId: tool.categoryId,
    userId: userId || 'guest',
    status: 'in_progress',
    startedAt: !isPreviousCompleted && existing?.startedAt ? existing.startedAt : now,
    lastActiveAt: now,
    activeSeconds: !isPreviousCompleted ? Math.max(existing?.activeSeconds || 0, activeSeconds) : activeSeconds,
    interactionCount: !isPreviousCompleted ? Math.max(existing?.interactionCount || 0, interactionCount) : interactionCount,
    notes,
    logs: updatedLogs
  };

  saveUserSession(session);
  return session;
};

// Record session as READY (File Berhasil Dibuat)
export const recordSessionReady = (
  tool: ToolItem,
  userId: string | undefined,
  fileName: string,
  currentLogs: UserActivityLogEntry[] = [],
  activeSeconds: number = 0
): UserSessionRecord => {
  const existing = getSessionForTool(tool.id, userId);
  const now = Date.now();
  const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const sessionId = existing?.status !== 'completed' && existing?.id ? existing.id : `sess-${tool.id}-${now}`;

  const updatedLogs: UserActivityLogEntry[] = [
    ...currentLogs,
    {
      id: `log-ready-${now}`,
      time: timeStr,
      type: 'status',
      message: `[STATUS: READY] Berkas "${fileName}" berhasil dibuat dan siap diunduh.`
    }
  ];

  const session: UserSessionRecord = {
    id: sessionId,
    toolId: tool.id,
    toolTitle: tool.title,
    categoryId: tool.categoryId,
    userId: userId || 'guest',
    status: 'ready',
    startedAt: existing?.startedAt || now,
    lastActiveAt: now,
    activeSeconds: Math.max(existing?.activeSeconds || 0, activeSeconds),
    interactionCount: (existing?.interactionCount || 0) + 1,
    notes: `Berkas "${fileName}" siap diunduh. Menunggu pengguna menekan download.`,
    logs: updatedLogs
  };

  saveUserSession(session);
  return session;
};

// Flush offline/pending completion outbox to Supabase
export const flushSessionOutbox = async (): Promise<void> => {
  let rawOutbox: string | null = null;
  try {
    rawOutbox = localStorage.getItem(OUTBOX_STORAGE_KEY);
  } catch (e) {
    return;
  }
  if (!rawOutbox) return;

  let outbox: Record<string, UserSessionRecord> = {};
  try {
    outbox = JSON.parse(rawOutbox);
  } catch (e) {
    return;
  }

  const sessionIds = Object.keys(outbox);
  if (sessionIds.length === 0) return;

  let client: any = null;
  try {
    client = database();
  } catch (err: any) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zain_sync_status', {
        detail: { ok: false, message: 'Menunggu inisialisasi koneksi Supabase.' }
      }));
    }
    return;
  }

  if (!client) return;

  // Verify the CURRENT Supabase Auth account. Outbox entries from a guest,
  // another account or a legacy login must not trigger 'Invalid session'.
  const { data: identity, error: identityError } = await client.auth.getUser();
  const authenticatedUid = identityError ? null : identity?.user?.id;
  if (!authenticatedUid) return;

  for (const sid of sessionIds) {
    const sess = outbox[sid];
    if (!sess || sess.userId !== authenticatedUid || sess.status !== 'completed') continue;
    try {
      const { data, error } = await client.rpc('academic_complete_session', {
        p_session: sess,
        p_details: sess.notes || sess.downloadInfo?.reason || 'Hasil siap dan diunduh'
      });

      if (error) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('zain_sync_status', {
            detail: { ok: false, toolId: sess.toolId, sessionId: sid, message: error.message || 'Gagal menyimpan status ke Supabase.' }
          }));
        }
        break;
      }

      delete outbox[sid];
      try {
        localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(outbox));
      } catch (e) {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zain_sync_status', {
          detail: { ok: true, toolId: sess.toolId, sessionId: sid }
        }));
      }
    } catch (e: any) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zain_sync_status', {
          detail: { ok: false, toolId: sess.toolId, sessionId: sid, message: e?.message || 'Koneksi database terputus.' }
        }));
      }
      break;
    }
  }
};

// Record session as COMPLETED (Selesai Transaksi Otomatis)
// Triggered otomatis ketika user menekan download dan proses download dimulai
export const recordSessionCompleted = (
  tool: ToolItem,
  userId: string | undefined,
  downloadInfo: { fileName: string; reason: string },
  currentLogs: UserActivityLogEntry[] = [],
  activeSeconds: number = 0
): UserSessionRecord => {
  const existing = getSessionForTool(tool.id, userId);
  const now = Date.now();
  const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const sessionId = existing?.id || `sess-${tool.id}-${now}`;

  const updatedLogs: UserActivityLogEntry[] = [
    ...currentLogs,
    {
      id: `log-dl-${now}`,
      time: timeStr,
      type: 'download',
      message: `[BERKAS DIUNDUH] "${downloadInfo.fileName}" berhasil diunduh (${downloadInfo.reason}). Waktu: ${timeStr}`
    },
    {
      id: `log-done-${now + 1}`,
      time: timeStr,
      type: 'complete',
      message: `[STATUS: COMPLETED / SELESAI TRANSAKSI OTOMATIS] Berkas diunduh. Transaksi resmi dinyatakan selesai dan kuota 1x dicatat ke Supabase.`
    }
  ];

  const session: UserSessionRecord = {
    id: sessionId,
    toolId: tool.id,
    toolTitle: tool.title,
    categoryId: tool.categoryId,
    userId: userId || 'guest',
    status: 'completed',
    startedAt: existing?.startedAt || now,
    lastActiveAt: now,
    completedAt: now,
    activeSeconds: Math.max(existing?.activeSeconds || 0, activeSeconds),
    interactionCount: (existing?.interactionCount || 0) + 1,
    downloadInfo: {
      fileName: downloadInfo.fileName,
      downloadedAt: now,
      reason: downloadInfo.reason
    },
    notes: `Transaksi selesai otomatis saat berkas "${downloadInfo.fileName}" diunduh.`,
    logs: updatedLogs
  };

  saveUserSession(session);

  // Queue to persistent outbox for Supabase synchronization
  try {
    const rawOutbox = localStorage.getItem(OUTBOX_STORAGE_KEY);
    const outbox: Record<string, UserSessionRecord> = rawOutbox ? JSON.parse(rawOutbox) : {};
    outbox[session.id] = session;
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(outbox));
  } catch (e) {
    console.warn('Error queuing session outbox:', e);
  }

  // Asynchronously flush outbox to Supabase
  setTimeout(() => {
    flushSessionOutbox().catch(() => {});
  }, 10);

  return session;
};

// Setup online synchronization
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushSessionOutbox().catch(() => {});
  });
}

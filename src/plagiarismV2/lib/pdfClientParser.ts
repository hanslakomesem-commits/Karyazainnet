import { database } from '../../storage/client';
import { backendUrl } from '../../utils/deploymentBridge';
/**
 * Safe client-side PDF text extraction fallback & binary utilities
 */

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 0x8000; // 32KB chunks to avoid stack overflow
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

/**
 * Fallback browser PDF text extractor that parses stream and text objects
 */
export function extractTextFromPdfBufferLocally(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const rawString = decoder.decode(new Uint8Array(buffer));

  const extractedLines: string[] = [];

  // 1. Extract strings inside PDF text blocks: (text) Tj or [(text)] TJ
  const textMatches = rawString.match(/\(([^()]{3,})\)\s*(?:Tj|TJ|'|")/g) || [];
  for (const match of textMatches) {
    const clean = match
      .replace(/^\(/, '')
      .replace(/\)\s*(?:Tj|TJ|'|")$/, '')
      .replace(/\\([()\\])/g, '$1')
      .replace(/\\r/g, ' ')
      .replace(/\\n/g, ' ')
      .trim();

    if (clean.length > 5 && !clean.startsWith('/')) {
      extractedLines.push(clean);
    }
  }

  if (extractedLines.length > 0) {
    return extractedLines.join(' ');
  }

  // 2. Fallback: Search for continuous readable words in raw buffer
  const words = rawString.match(/[A-Za-z0-9\u00C0-\u024F\u1E00-\u1EFF.,;:!?"'()\- ]{25,}/g) || [];
  if (words.length > 0) {
    return words.join('\n\n').trim();
  }

  return 'Laporan plagiasi PDF berhasil dimuat. Siap untuk dipindai oleh sistem.';
}

/**
 * Safe Fetch helper with timeout that guarantees JSON parsing and prevents HTML doctype errors
 */
export async function safeFetchJson<T>(
  url: string,
  options?: RequestInit,
  timeoutMs = 60000
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { data: { session }, error: authError } = await database().auth.getSession();
    if (authError || !session?.access_token) throw new Error('Login Supabase diperlukan untuk menggunakan layanan ini.');
    const headers = new Headers(options?.headers);
    headers.set('Authorization', `Bearer ${session.access_token}`);
    const safePath = url.startsWith('/api/') ? url.replace(/^\/api/, '/api/plagiarism-v2') : url;
    const resp = await fetch(backendUrl(safePath), {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = resp.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      const rawText = await resp.text();
      if (rawText.includes('<!DOCTYPE') || rawText.includes('<html')) {
        throw new Error(`Server mengembalikan respon HTML (status ${resp.status}).`);
      }
      try {
        return JSON.parse(rawText) as T;
      } catch {
        throw new Error(rawText.slice(0, 200) || `Gagal memproses respon dari ${url} (status ${resp.status})`);
      }
    }

    if (!resp.ok) {
      let errorMsg = `Permintaan gagal (status ${resp.status})`;
      try {
        const errData = await resp.json();
        if (errData?.error) errorMsg = errData.error;
      } catch {
        // ignore
      }
      throw new Error(errorMsg);
    }

    return (await resp.json()) as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Waktu tunggu permintaan habis (${Math.round(timeoutMs / 1000)} detik). Menggunakan pemrosesan cepat.`);
    }
    throw err;
  }
}

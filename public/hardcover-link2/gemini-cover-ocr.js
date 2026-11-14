/** ZAIN.NET Menu 12 Link 2 — OCR multimodal via backend Render (tanpa kunci API di browser). */
import {prepareOCRImage,prepareOCRZones} from './ocr-fast.js?v=4.47';
import {auditCoverTransliteration} from './transliteration-check.js?v=4.47';
import {alignTitleFormatting} from './title-format.js?v=4.47';

const API = 'https://zainnet-api.onrender.com/api/hardcover-cover-ocr/read';
const SUPABASE_URL = 'https://pxseiytikiulxincoolh.supabase.co';
const SUPABASE_PUBLIC_KEY = 'sb_publishable_KA2AwEzwuepbHm2yu95IkA_eUBb2sXK';
const KEY = 'sb-pxseiytikiulxincoolh-auth-token';
const str = value => String(value ?? '');

function readStoredSession() {
  let raw;
  try { raw = localStorage.getItem(KEY); }
  catch { throw Error('Browser tidak mengizinkan akses sesi login. Buka Menu 12 Link 2 langsung dari situs ZAIN.NET, bukan dari tab privat atau mode yang memblokir penyimpanan.'); }
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch { throw Error('Data sesi login pada browser rusak. Keluar dari ZAIN.NET, masuk kembali dengan akun admin, lalu buka ulang Menu 12 Link 2.'); }
}
function flattenSession(saved) {
  const nested = saved?.currentSession && typeof saved.currentSession === 'object' ? saved.currentSession : {};
  return { ...(saved || {}), ...nested };
}
async function refreshSession(saved) {
  const current = flattenSession(saved);
  const refreshToken = current.refresh_token;
  if (!refreshToken) throw Error('Sesi admin pada perangkat ini tidak memiliki refresh token. Keluar dari ZAIN.NET, login kembali dengan akun admin, lalu ulangi pembacaan.');
  let response;
  try {
    response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLIC_KEY },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store'
    });
  } catch {
    throw Error('Tidak dapat memperbarui sesi Supabase. Periksa koneksi internet dan coba login ulang.');
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    if (response.status === 400 || response.status === 401) throw Error('Sesi Supabase sudah kedaluwarsa. Keluar dari ZAIN.NET, login kembali dengan akun admin, lalu ulangi pembacaan.');
    throw Error(String(body.msg || body.message || body.error_description || body.error || `Pembaruan sesi gagal (HTTP ${response.status}).`));
  }
  const next = { ...(saved || {}), ...body };
  if (saved?.currentSession && typeof saved.currentSession === 'object') next.currentSession = { ...saved.currentSession, ...body };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* token tetap dapat dipakai untuk permintaan ini */ }
  return next;
}
async function accessToken(forceRefresh = false) {
  const saved = readStoredSession();
  if (!saved) throw Error('Sesi login Supabase tidak ditemukan pada perangkat ini. Login ke www.zainnet.store menggunakan akun admin, lalu buka ulang Menu 12 Link 2.');
  let session = flattenSession(saved);
  const expiresAt = Number(session.expires_at || 0);
  const expiringSoon = expiresAt > 0 && expiresAt <= Math.floor(Date.now() / 1000) + 60;
  if (forceRefresh || !session.access_token || expiringSoon) session = flattenSession(await refreshSession(saved));
  if (typeof session.access_token !== 'string' || !session.access_token) throw Error('Token admin tidak tersedia. Login kembali ke ZAIN.NET lalu ulangi pembacaan.');
  return session.access_token;
}
async function toBase64(blob) {
  // Kurangi memory spike akibat String.fromCharCode(...array) pada HP.
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(Error('Gagal membaca gambar untuk Gemini.'));
    reader.onload = () => resolve(str(reader.result).split(',')[1] || '');
    reader.readAsDataURL(blob);
  });
}
export function validateGeminiResult(value) {
  if (!value || typeof value !== 'object' || typeof value.judul !== 'string') throw Error('Format ekstraksi Gemini tidak lengkap.');
  const data = {...value};
  data.judul = data.judul.normalize('NFC');
  for (const key of ['nama','prodi','fakultas','universitas','kota','program_jenjang']) {
    if (typeof data[key] === 'string') data[key] = data[key].normalize('NFC');
  }
  const segments = Array.isArray(data.title_segments) ? data.title_segments.filter(x=>x && typeof x.text==='string').map(x=>({...x,text:x.text.normalize('NFC')})) : [];
  if (segments.length && segments.map(x=>x.text).join('') === data.judul) {
    data.title_segments = segments.map(x=>({text:x.text,italic:x.italic===true}));
  } else {
    const aligned = alignTitleFormatting(data.judul, segments);
    if (aligned.length) {
      data.title_segments = aligned;
      data.warnings = [...(Array.isArray(data.warnings)?data.warnings:[]),'Format italic dipetakan ulang setelah normalisasi spasi/karakter. Tetap cocokkan dengan foto asli.'];
    } else {
      data.title_segments = data.judul ? [{text:data.judul,italic:false}] : [];
      data.warnings = [...(Array.isArray(data.warnings)?data.warnings:[]),'Format miring dari layanan pembacaan tidak dapat dipetakan dengan aman; mohon periksa secara manual.'];
    }
  }
  const audit = auditCoverTransliteration(data);
  data.transliteration_detected = audit.hasTransliteration;
  data.warnings = [...(Array.isArray(data.warnings)?data.warnings:[]),...audit.warnings,
    'Sumber: Gemini 3.1 Flash-Lite. Validasi Q/O, italic, dan karakter transliterasi pada editor sebelum ekspor.'];
  return data;
}
export async function readCoverWithGemini(image, {onProgress=()=>{}}={}) {
  let token = await accessToken();
  onProgress('Menyiapkan foto resolusi tinggi untuk pembacaan Gemini...');
  const full=await prepareOCRImage(image,{maxSide:2450,contrast:1.1});
  let crop=null;
  try {const zones=await prepareOCRZones(image,{threshold:false}); crop=zones.judul || null;} catch { /* gambar penuh tetap digunakan */ }
  const [imageBase64,titleCropBase64]=await Promise.all([toBase64(full),crop?toBase64(crop):Promise.resolve('')]);
  onProgress('Gemini memeriksa Q/O, tanda transliterasi, dan bagian judul italic...');
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(()=>controller.abort(),68_000) : null;
  const send = async bearer => {
    let response;
    try {
      response = await fetch(API,{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${bearer}`},
        body:JSON.stringify({imageBase64,mimeType:full.type||'image/png',titleCropBase64,titleCropMimeType:crop?.type||'image/png'}),
        ...(controller ? {signal:controller.signal} : {}),
        cache:'no-store'
      });
    } catch(error) {
      if(error?.name==='AbortError') throw error;
      throw Error(`Koneksi ke layanan Gemini gagal: ${String(error?.message||error)}. Periksa internet dan domain situs ZAIN.NET yang digunakan. Hasil tidak dialihkan diam-diam ke OCR lokal.`);
    }
    const body=await response.json().catch(()=>({}));
    return {response,body};
  };
  try {
    let result = await send(token);
    if (result.response.status === 401) {
      onProgress('Sesi admin diperbarui; mencoba koneksi Gemini kembali...');
      token = await accessToken(true);
      result = await send(token);
    }
    const {response,body}=result;
    if(response.status===401) throw Error('Sesi admin tidak diterima oleh server. Login ulang ke ZAIN.NET, lalu coba kembali.');
    if(response.status===403) throw Error('Akun yang digunakan belum dikenali sebagai admin Supabase. Gunakan akun admin ZAIN.NET.');
    if(!response.ok || !body.success) throw Error(String(body.error || `Layanan OCR gagal (HTTP ${response.status}).`));
    return validateGeminiResult(body.data);
  } catch(e) {
    if(e?.name==='AbortError') throw Error('Gemini tidak merespons dalam batas waktu 68 detik. Coba foto lebih kecil atau ulangi.');
    throw e;
  } finally {if(timer)clearTimeout(timer);}
}

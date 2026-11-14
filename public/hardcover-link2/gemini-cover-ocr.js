/** ZAIN.NET Menu 12 Link 2 — OCR multimodal via backend Render (tanpa kunci API di browser). */
import {prepareOCRImage,prepareOCRZones} from './ocr-fast.js';
import {auditCoverTransliteration} from './transliteration-check.js';

const API = 'https://zainnet-api.onrender.com/api/hardcover-cover-ocr/read';
const KEY = 'sb-pxseiytikiulxincoolh-auth-token';
const str = value => String(value ?? '');

function accessToken() {
  // Supabase menyimpan sesi pada origin www.zainnet.store; iframe Link 2 same-origin.
  let saved;
  try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* sesi lama invalid */ }
  const token = saved?.access_token || saved?.currentSession?.access_token;
  if (typeof token !== 'string' || !token) throw Error('Sesi login Supabase tidak ditemukan. Buka Link 2 melalui akun admin ZAIN.NET.');
  return token;
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
    data.title_segments = data.judul ? [{text:data.judul,italic:false}] : [];
    data.warnings = [...(Array.isArray(data.warnings)?data.warnings:[]),'Format miring dari layanan pembacaan tidak cocok dengan teks judul; mohon periksa secara manual.'];
  }
  const audit = auditCoverTransliteration(data);
  data.transliteration_detected = audit.hasTransliteration;
  data.warnings = [...(Array.isArray(data.warnings)?data.warnings:[]),...audit.warnings,
    'Sumber: Gemini 3.1 Flash-Lite. Validasi Q/O, italic, dan karakter transliterasi pada editor sebelum ekspor.'];
  return data;
}
export async function readCoverWithGemini(image, {onProgress=()=>{}}={}) {
  const token=accessToken();
  onProgress('Menyiapkan foto resolusi tinggi untuk pembacaan Gemini...');
  const full=await prepareOCRImage(image,{maxSide:2450,contrast:1.1});
  let crop=null;
  try {const zones=await prepareOCRZones(image,{threshold:false}); crop=zones.judul || null;} catch { /* gambar penuh tetap digunakan */ }
  const [imageBase64,titleCropBase64]=await Promise.all([toBase64(full),crop?toBase64(crop):Promise.resolve('')]);
  onProgress('Gemini memeriksa Q/O, tanda transliterasi, dan bagian judul italic...');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),68_000);
  try {
    const response=await fetch(API,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body:JSON.stringify({imageBase64,mimeType:full.type||'image/png',titleCropBase64,titleCropMimeType:crop?.type||'image/png'}),
      signal:controller.signal,
      cache:'no-store'
    });
    const body=await response.json().catch(()=>({}));
    if(!response.ok || !body.success)throw Error(str(body.error || `Layanan OCR gagal (HTTP ${response.status})`));
    return validateGeminiResult(body.data);
  } catch(e) {
    if(e?.name==='AbortError')throw Error('Gemini tidak merespons dalam batas waktu.');
    throw e;
  } finally {clearTimeout(timer);}
}

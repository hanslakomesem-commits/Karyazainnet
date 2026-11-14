/** Menu 12 Link 2: reconstruction of an unfamiliar university cover from its scan.
 * OCR and geometry only. Rendering is local, original image is never persisted here. */
import { Router, type Request, type Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

export const hardcoverCustomLayoutRouter = Router();
const rate = new Map<string, { count: number, until: number, running: number }>();
const MAX_B64 = 9_000_000;
const clamp = (x: unknown) => Math.min(1000, Math.max(0, Number(x) || 0));
const LIMIT_BLOCKS = 160;
const fields = (x: any) => ({
  x: clamp(x?.x), y: clamp(x?.y), w: clamp(x?.w), h: clamp(x?.h),
});
function parseResult(value: string) {
  const parsed = JSON.parse(value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, ''));
  if (!parsed || !Array.isArray(parsed.blocks) || !parsed.blocks.length) throw Error('Tidak ada blok tulisan terbaca.');
  const blocks = parsed.blocks.slice(0, LIMIT_BLOCKS).filter((x: any) => typeof x?.text === 'string' && x.text.trim()).map((x: any) => ({
    text: x.text.replace(/\u0000/g, '').slice(0, 1000).normalize('NFC'),
    ...fields(x),
    bold: x.bold === true, italic: x.italic === true, underline: x.underline === true,
    align: ['left', 'center', 'right'].includes(x.align) ? x.align : 'center',
    color: /^#[0-9a-f]{6}$/i.test(x.color || '') ? x.color : '#111111',
    size: Math.max(6, Math.min(36, Number(x.size) || 12)),
  })).filter((x: any) => x.w > 2 && x.h > 1);
  if (!blocks.length) throw Error('Koordinat tulisan tidak valid.');
  const images = (Array.isArray(parsed.images) ? parsed.images : []).slice(0, 8).map((x: any) => ({kind: x.kind === 'logo' ? 'logo' : 'ornament', ...fields(x)})).filter((x: any) => x.w > 4 && x.h > 4);
  const fullText = typeof parsed.full_text === 'string' ? parsed.full_text.slice(0, 25000).normalize('NFC') : '';
  const unclear = (Array.isArray(parsed.unclear) ? parsed.unclear : []).slice(0, 30).filter((x: any) => typeof x === 'string').map((x: string) => x.slice(0, 160));
  // Detect missing transcription lines, but NEVER silently invent text to fill a gap.
  const folded = (s: string) => s.toLocaleUpperCase('id-ID').replace(/\s+/g, ' ').trim();
  const missing = fullText.split('\n').map((x: string) => x.trim()).filter(Boolean).filter((line: string) => !folded(blocks.map((b: any) => b.text).join(' ')).includes(folded(line))).slice(0, 30);
  return { blocks, images, full_text: fullText, unclear, missing, warnings: ['Semua blok harus dicocokkan dengan scan asli sebelum membuat PDF. Model bisa keliru membaca huruf, posisi, logo, dan format.'] };
}

hardcoverCustomLayoutRouter.post('/analyze', async (req: Request, res: Response) => {
  res.set('Cache-Control', 'private, no-store');
  const token = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'Masuk sebagai admin ZAIN.NET terlebih dahulu.' });
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://pxseiytikiulxincoolh.supabase.co';
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!key) return res.status(503).json({error: 'Autentikasi server belum siap.'});
  let userId = '';
  try {
    const supabase = createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}});
    const {data, error} = await supabase.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({error: 'Sesi berakhir. Login kembali.'});
    if (data.user.app_metadata?.academic_role !== 'admin') return res.status(403).json({error: 'Mode Custom Scan khusus admin.'});
    userId = data.user.id;
  } catch { return res.status(503).json({error:'Tidak dapat memverifikasi sesi.'}); }
  const image = req.body?.imageBase64;
  if (typeof image !== 'string' || image.length < 100 || image.length > MAX_B64 || !/^[\w+/]+={0,2}$/.test(image)) return res.status(400).json({error:'Gambar scan tidak valid / terlalu besar.'});
  const mime = req.body?.mimeType;
  if (!['image/png','image/jpeg','image/webp'].includes(mime)) return res.status(400).json({error:'Gunakan JPG, PNG atau WebP.'});
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({error:'Gemini API belum diatur di Render.'});
  const now = Date.now(), current = rate.get(userId) || {count:0, until:now+900000,running:0};
  if (now > current.until) { current.count=0;current.until=now+900000; }
  if (current.running >= 1 || current.count >= 12) return res.status(429).json({error:'Batas penggunaan Custom Scan tercapai. Coba kembali nanti.'});
  current.count++;current.running++;rate.set(userId,current);
  try {
    const prompt = `Anda menyalin SELURUH elemen halaman SAMPUL AKADEMIK yang belum punya template. Ini pekerjaan transkripsi visual & estimasi geometri, BUKAN membuat sampul baru berdasarkan pengetahuan umum.
Baca setiap karakter dari gambar, termasuk semua baris kecil, kalimat pengajuan gelar, prodi, kota, nomor identitas, pembimbing, keterangan tambahan. Tidak boleh meringkas, menghapus, menerjemahkan, menambah, atau mengganti kata. Pertahankan Q/O, transliterasi (ā ī ū ḥ ṣ ḍ ṭ ṡ ż ʿ ʾ), kapitalisasi, tanda baca, dan ganti baris yang terlihat pada scan.
Koordinat x,y,w,h dalam skala 0..1000 dari tepi foto yang benar-benar berisi sampul; x/y adalah pojok kiri atas dan w/h ukuran kotak. Satu block untuk SETIAP BARIS TEKS; jika dalam baris yang sama ada bagian italic/tegak atau font berbeda, pecah menjadi beberapa block dengan koordinat masing-masing, tetap urut atas-ke-bawah lalu kiri-ke-kanan. Jangan membuang satu kata pun. Ukuran teks font dalam pt secara perkiraan untuk A4, bold/italic/underline benar-benar berdasarkan bentuk gambar, jangan menebak italic dari kata asing. Align left/center/right sesuai aslinya. Warna hex jika dapat dipastikan.
Semua logo/gambar (bukan teks) masuk images dengan kind='logo' atau 'ornament' serta kotak posisi yang pas; jangan tulis ulang logo sebagai teks. Jangan menggambar logo baru.
Tulis transkripsi teks lengkap per baris ke full_text, supaya bisa diaudit dengan semua blok teks. Jika ada kata yang samar, catat pada unclear (jangan mengarang). Jangan membuat halaman belakang atau punggung dari gambar depan.
Keluarkan HANYA JSON tanpa markdown: {"blocks":[{"text":"...","x":100,"y":120,"w":800,"h":36,"size":12,"bold":true,"italic":false,"underline":false,"align":"center","color":"#111111"}],"images":[{"kind":"logo","x":400,"y":540,"w":200,"h":200}],"full_text":"BARIS 1\\nBARIS 2","unclear":[]}.`;
    const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY, httpOptions: {timeout: 55_000}});
    const result = await ai.models.generateContent({model:'gemini-3.1-flash-lite', contents:{parts:[{inlineData:{mimeType:mime,data:image}}, {text:prompt}]},config:{responseMimeType:'application/json',temperature:0}});
    if (!result.text) return res.status(502).json({error:'Hasil OCR kosong.'});
    const layout = parseResult(result.text);
    return res.json({success:true, layout});
  } catch (error: any) {
    const msg = String(error?.message || error);
    console.warn('[custom-scan-layout]', msg.slice(0,220));
    return res.status(/429|RESOURCE_EXHAUSTED/.test(msg)?429:502).json({error:'Analisis Custom Scan belum berhasil. Gunakan scan lebih jelas atau ulangi.'});
  } finally {current.running=Math.max(0,current.running-1);}
});

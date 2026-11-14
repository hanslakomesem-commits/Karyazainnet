/** Menu 12 Link 2: OCR gambar cover. API key hanya digunakan di Render. */
import { Router, type Request, type Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

export const hardcoverCoverOcrRouter = Router();
const recent = new Map<string, { count: number; resetAt: number; active: number }>();
const MODEL = 'gemini-3.1-flash-lite';
const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp']);
// Tanda diakritik dan hamzah/ain: audit visual, bukan perbaikan ejaan berbasis tebakan.
const transliterationMarks = /[\u0100-\u024f\u1e00-\u1eff\u02bb-\u02bf\u0300-\u036f\u2018\u2019]/u;
const fields = ['judul','nama','nim','prodi','fakultas','universitas','kota','jenis_dokumen','bulan_tahun','program_jenjang'] as const;

function getImage(input: unknown, mime: unknown, maxLength: number) {
  if (typeof input !== 'string') return null;
  const data = input.replace(/^data:image\/(?:jpeg|png|webp);base64,/i, '');
  const type = typeof mime === 'string' ? mime : 'image/jpeg';
  if (!allowedMime.has(type) || data.length < 80 || data.length > maxLength || !/^[a-z\d+/]+={0,2}$/i.test(data)) return null;
  return { inlineData: { mimeType: type, data } };
}
function tidy(value: unknown, max = 1800) {
  return typeof value === 'string' ? value.replace(/\u0000/g, '').slice(0, max).trim() : '';
}
function decodeResult(text: string) {
  let raw: any;
  try { raw = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')); }
  catch { throw new Error('Model tidak menghasilkan JSON yang valid.'); }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Struktur hasil pembacaan tidak sesuai.');
  const result: Record<string, any> = {};
  for (const field of fields) result[field] = tidy(raw[field], field === 'judul' ? 1800 : 250).normalize('NFC');
  const parts = Array.isArray(raw.title_segments) ? raw.title_segments.slice(0, 60).filter((p: any) => p && typeof p.text === 'string') : [];
  // Normalisasi kanonik Unicode menggabungkan huruf + tanda baca diakritik tanpa menghapusnya.
  const normalizedParts = parts.map((p: any) => ({ text: String(p.text).replace(/\u0000/g, '').slice(0, 1200).normalize('NFC'), italic: p.italic === true }));
  const joined = normalizedParts.map((p: any) => p.text).join('');
  if (joined.trim() && joined.trim().replace(/\s+/g, ' ').toLocaleUpperCase('id-ID') === result.judul.replace(/\s+/g, ' ').toLocaleUpperCase('id-ID')) {
    normalizedParts[0].text = normalizedParts[0].text.replace(/^\s+/u, '');
    normalizedParts[normalizedParts.length - 1].text = normalizedParts[normalizedParts.length - 1].text.replace(/\s+$/u, '');
    result.title_segments = normalizedParts;
    result.judul = normalizedParts.map((p: any) => p.text).join('');
  } else {
    // Jangan menebak italic apabila pemetaan tidak sinkron dengan judul.
    result.title_segments = result.judul ? [{ text: result.judul, italic: false }] : [];
  }
  const notes = Array.isArray(raw.uncertain_characters) ? raw.uncertain_characters.slice(0, 8).map((x: unknown) => tidy(x, 140)).filter(Boolean) : [];
  const warnings = [
    'Hasil Gemini harus dibandingkan dengan foto asli sebelum dicetak; periksa Q/O dan huruf miring.',
    ...notes.map((x: string) => `Karakter perlu diperiksa: ${x}`),
  ];
  const fieldsWithMarks = ['judul','nama','prodi','fakultas','universitas','kota','program_jenjang'].filter((key) => transliterationMarks.test(result[key] || ''));
  result.transliteration_detected = fieldsWithMarks.length > 0;
  if (fieldsWithMarks.length) warnings.push('Transliterasi Arab–Latin terdeteksi (' + fieldsWithMarks.join(', ') + '): verifikasi titik, garis panjang, hamzah/ain, dan kapitalisasi sesuai foto sebelum cetak.');
  if (Object.values(result).some((v) => typeof v === 'string' && /\uFFFD|\u00ad/u.test(v))) warnings.push('Ada karakter Unicode rusak atau soft hyphen: periksa sebelum cetak.');
  if (!result.judul) warnings.push('Judul belum terbaca jelas. Isi atau koreksi manual.');
  if (parts.length && !normalizedParts.some((p: any) => p.italic)) warnings.push('Belum ada huruf miring yang dapat dikonfirmasi dari gambar. Periksa judul.');
  if (result.judul && !result.title_segments.some((p: any) => p.italic) && Array.isArray(raw.title_segments) && raw.title_segments.some((p: any) => p.italic)) {
    warnings.push('Pemetaan italic tidak sinkron dengan teks judul; penanda italic tidak diterapkan otomatis.');
  }
  result.nama_garis_bawah = raw.nama_garis_bawah === true;
  result.warnings = warnings;
  result.ocr_source = 'gemini-3.1-flash-lite';
  return result;
}

hardcoverCoverOcrRouter.post('/read', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, private');
  const bearer = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return res.status(401).json({ error: 'Sesi Supabase diperlukan untuk pembacaan cover.' });
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://pxseiytikiulxincoolh.supabase.co';
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) return res.status(503).json({ error: 'Konfigurasi autentikasi server belum tersedia.' });
  let userId = '';
  try {
    const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.auth.getUser(bearer);
    if (error || !data.user) return res.status(401).json({ error: 'Sesi sudah berakhir. Silakan login kembali.' });
    if (data.user.app_metadata?.academic_role !== 'admin') return res.status(403).json({ error: 'OCR cover khusus admin ZAIN.NET.' });
    userId = data.user.id;
  } catch {
    return res.status(503).json({ error: 'Verifikasi login sedang tidak tersedia.' });
  }
  const full = getImage(req.body?.imageBase64, req.body?.mimeType, 10_500_000);
  const crop = req.body?.titleCropBase64 ? getImage(req.body?.titleCropBase64, req.body?.titleCropMimeType, 7_000_000) : null;
  if (!full || (req.body?.titleCropBase64 && !crop)) return res.status(400).json({ error: 'Foto tidak valid atau melebihi batas. Gunakan JPG/PNG/WebP.' });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return res.status(503).json({ error: 'Layanan Gemini belum dikonfigurasi di Render.' });
  const now = Date.now();
  const counter = recent.get(userId) || { count: 0, resetAt: now + 15 * 60_000, active: 0 };
  if (now > counter.resetAt) { counter.count = 0; counter.resetAt = now + 15 * 60_000; }
  if (counter.count >= 20 || counter.active >= 2) return res.status(429).json({ error: 'Batas pembacaan tercapai. Coba beberapa saat lagi.' });
  counter.count++;
  counter.active++;
  recent.set(userId, counter);
  if (recent.size > 1000) for (const [uid, value] of recent) if (value.resetAt < now && value.active === 0) recent.delete(uid);
  const prompt = `Anda adalah transkriptor visual cover skripsi, tesis, dan artikel akademik ZAIN.NET. Baca berdasarkan bentuk huruf pada GAMBAR, bukan tebakan dari konteks.

PRIORITAS TINGGI:
- BEDAKAN HURUF Q dan O: perhatikan ekor/tangkai Q. Periksa setiap Q/O pada JUDUL dan NAMA, termasuk kata berbahasa Inggris. Jangan otomatis mengubah Q menjadi O ataupun O menjadi Q karena kata yang lebih umum.
- TRANSLITERASI ARAB–LATIN (WAJIB): periksa dan SALIN apa adanya semua tanda pada huruf transliterasi, misalnya ā, ī, ū, ḥ, ṣ, ḍ, ṭ, ẓ, ṡ, ż, ṯ, ḏ, serta hamzah/ain (ʾ, ʿ, ‘, ’) dan gabungan seperti al-Qur’ān, Ṣaḥīḥ, Ḥadīṡ, dan ‘ilm JIKA MEMANG TERCETAK. Contoh hanya menjelaskan bentuk karakter, BUKAN kata untuk ditambahkan ke judul.
- Jangan menghapus diakritik atau mengubah ḥ menjadi h, ṣ menjadi s, ṭ menjadi t, ḍ menjadi d, ā menjadi a, dan jangan menciptakan diakritik baru jika tidak tampak pada gambar. Huruf bertitik dan bergaris dapat sangat kecil; gunakan perbesaran judul sebagai pembanding.
- Jangan menormalkan gaya transliterasi menurut satu pedoman tertentu: ikuti tulisan pada foto, termasuk variasi apostrof, hamzah, ain, dan ejaan. Jika satu karakter samar atau tidak terbukti, cantumkan posisi/kata dan kandidatnya pada uncertain_characters untuk diperiksa pengguna; jangan memastikan tanpa bukti visual.
- Pertahankan secara akurat huruf miring (italic): hasilkan "title_segments" sebagai urutan potongan teks judul, masing-masing {"text":"...","italic":true/false}. Hanya true jika terlihat benar-benar miring secara visual. Bila bagian judul campur miring dan tegak, pisahkan tepat di batas tipografinya. JANGAN menandai miring hanya karena istilah asing.
- Isi "judul" HARUS sama dengan gabungan tepat dari setiap "text" di title_segments (spasi dan tanda baca sama). Pertahankan urutan kata, ejaan, angka, apostrof, nama Latin, gelar, kapitalisasi, dan diakritik. Jangan parafrase, melengkapi, atau mengoreksi berdasarkan dugaan.
- Data nama mahasiswa, NIM, program studi, fakultas, universitas, kota, jenis_dokumen, bulan_tahun, dan program_jenjang hanya bila terlihat. Jika tidak terlihat isi string kosong. nama_garis_bawah boolean true hanya jika nama benar-benar bergaris bawah.
- Jika Q/O, tanda diakritik transliterasi, apostrof, atau italic masih samar, tulis alasan singkat pada uncertain_characters, bukan memastikan secara palsu.
- Gambar kedua (jika ada) adalah perbesaran wilayah judul untuk cross-check huruf dan italic. Posisikan sesuai foto lengkap, jangan baca sebagai dokumen lain.

Kembalikan HANYA JSON, tanpa markdown, dengan struktur {"judul":"...","title_segments":[{"text":"...","italic":false}],"nama":"...","nim":"...","prodi":"...","fakultas":"...","universitas":"...","kota":"...","jenis_dokumen":"...","bulan_tahun":"...","program_jenjang":"...","nama_garis_bawah":false,"uncertain_characters":[]}.`;
  try {
    const client = new GoogleGenAI({ apiKey, httpOptions: { timeout: 58_000 } });
    const parts: any[] = [full, ...(crop ? [crop] : []), { text: prompt }];
    const response = await client.models.generateContent({ model: MODEL, contents: { parts }, config: { responseMimeType: 'application/json', temperature: 0 } });
    if (!response.text) return res.status(502).json({ error: 'Model tidak mengembalikan teks. Coba OCR lokal.' });
    const data = decodeResult(response.text);
    return res.status(200).json({ success: true, data });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = /429|RESOURCE_EXHAUSTED/i.test(msg) ? 429 : /timeout|504|503|UNAVAILABLE/i.test(msg) ? 503 : 502;
    console.warn('[cover-ocr] Gemini error:', msg.slice(0, 180));
    return res.status(status).json({ error: status === 429 ? 'Kuota atau batas permintaan Gemini tercapai; gunakan OCR lokal.' : 'Pembacaan Gemini tidak tersedia. OCR lokal tetap bisa digunakan.' });
  } finally {
    counter.active = Math.max(0, counter.active - 1);
  }
});

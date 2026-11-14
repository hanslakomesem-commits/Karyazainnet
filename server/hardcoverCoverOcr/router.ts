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

function getImage(input: unknown, mime: unknown, maxLength: number): CoverImage | null {
  if (typeof input !== 'string') return null;
  const data = input.replace(/^data:image\/(?:jpeg|png|webp);base64,/i, '');
  const type = typeof mime === 'string' ? mime : 'image/jpeg';
  if (!allowedMime.has(type) || data.length < 80 || data.length > maxLength || !/^[a-z\d+/]+={0,2}$/i.test(data)) return null;
  const buffer = Buffer.from(data, 'base64');
  if (!buffer.length) return null;
  return { buffer, mimeType: type };
}
type CoverImage = { buffer: Buffer; mimeType: string };
type GeminiImagePart = { inlineData: { mimeType: string; data: string } };
async function prepareGeminiImages(source: CoverImage): Promise<{ full: GeminiImagePart; titleCrop: GeminiImagePart | null; nameCrop: GeminiImagePart | null }> {
  const original: GeminiImagePart = { inlineData: { mimeType: source.mimeType, data: source.buffer.toString('base64') } };
  try {
    const canvasModule = await import('@napi-rs/canvas');
    const image = await canvasModule.loadImage(source.buffer);
    const sourceWidth = Number(image.width), sourceHeight = Number(image.height);
    if (!sourceWidth || !sourceHeight || sourceWidth * sourceHeight > 80000000) throw new Error('Dimensi foto tidak valid atau terlalu besar.');
    const scale = Math.min(1, 2800 / Math.max(sourceWidth, sourceHeight), Math.sqrt(6500000 / (sourceWidth * sourceHeight)));
    const width = Math.max(1, Math.round(sourceWidth * scale)), height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = canvasModule.createCanvas(width, height), context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const fullBuffer = canvas.toBuffer('image/jpeg');
    const makeCrop = (xRatio: number, yRatio: number, widthRatio: number, heightRatio: number): GeminiImagePart => {
      const x = Math.max(0, Math.floor(width * xRatio));
      const y = Math.max(0, Math.floor(height * yRatio));
      const cropWidth = Math.max(1, Math.min(width - x, Math.round(width * widthRatio)));
      const cropHeight = Math.max(1, Math.min(height - y, Math.round(height * heightRatio)));
      const cropScale = Math.min(2, 4400 / Math.max(cropWidth, cropHeight), Math.sqrt(4200000 / (cropWidth * cropHeight)));
      const cropCanvas = canvasModule.createCanvas(Math.max(1, Math.round(cropWidth * cropScale)), Math.max(1, Math.round(cropHeight * cropScale)));
      const cropContext = cropCanvas.getContext('2d');
      cropContext.fillStyle = '#ffffff';
      cropContext.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
      cropContext.drawImage(canvas, x, y, cropWidth, cropHeight, 0, 0, cropCanvas.width, cropCanvas.height);
      const cropBuffer = cropCanvas.toBuffer('image/jpeg');
      cropCanvas.width = 0;
      cropCanvas.height = 0;
      return { inlineData: { mimeType: 'image/jpeg', data: cropBuffer.toString('base64') } };
    };
    const titleCrop = makeCrop(0.025, 0.015, 0.95, 0.29);
    const nameCrop = makeCrop(0.035, 0.46, 0.93, 0.40);
    canvas.width = 0;
    canvas.height = 0;
    return {
      full: { inlineData: { mimeType: 'image/jpeg', data: fullBuffer.toString('base64') } },
      titleCrop,
      nameCrop
    };
  } catch (error: any) {
    console.warn('[cover-ocr] Normalisasi server gagal; memakai foto asli:', String(error?.message || error).slice(0, 140));
    return { full: original, titleCrop: null, nameCrop: null };
  }
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

function parseGeminiJson(value: string) {
  const fence = String.fromCharCode(96).repeat(3);
  let text = String(value || '').trim();
  if (text.startsWith(fence)) {
    const newline = text.indexOf('\n');
    text = newline >= 0 ? text.slice(newline + 1) : text.slice(fence.length);
    if (text.endsWith(fence)) text = text.slice(0, -fence.length);
  }
  return JSON.parse(text.trim());
}
function appendTitleSegment(out: Array<{ text: string; italic: boolean }>, text: string, italic: boolean) {
  if (!text) return;
  const last = out[out.length - 1];
  if (last && last.italic === italic) last.text += text;
  else out.push({ text, italic });
}
function applyItalicSpans(title: string, spans: unknown[]) {
  if (!Array.isArray(spans) || !title) return null;
  const ranges: Array<[number, number]> = [];
  for (const item of spans.slice(0, 30)) {
    if (typeof item !== 'string' || !item.trim()) return null;
    const phrase = item.normalize('NFC');
    const start = title.indexOf(phrase);
    if (start < 0 || title.indexOf(phrase, start + phrase.length) >= 0) return null;
    ranges.push([start, start + phrase.length]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const out: Array<{ text: string; italic: boolean }> = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start < cursor) return null;
    appendTitleSegment(out, title.slice(cursor, start), false);
    appendTitleSegment(out, title.slice(start, end), true);
    cursor = end;
  }
  appendTitleSegment(out, title.slice(cursor), false);
  return out.length ? out : [{ text: title, italic: false }];
}
async function detectVisualFormatting(client: any, images: GeminiImagePart[], title: string, name: string) {
  const prompt = [
    'Anda adalah pemeriksa FORMAT VISUAL cover, bukan OCR. Jangan membaca ulang atau mengubah teks.',
    'Judul OCR yang harus dipertahankan persis: ' + JSON.stringify(title),
    'Nama mahasiswa yang harus dicari pada cover: ' + JSON.stringify(name),
    'Gambar 1 adalah cover lengkap. Gambar 2 adalah crop judul. Gambar 3 adalah crop area identitas/nama jika tersedia.',
    'TUGAS ITALIC: periksa bentuk huruf pada judul. Tentukan hanya rentang yang benar-benar tampak miring (italic/oblique), bukan karena berbahasa Inggris, istilah asing, atau transliterasi. Judul boleh campuran italic dan tegak. Setiap rentang harus berupa SUBSTRING PERSIS dari judul OCR di atas, dengan kapitalisasi, tanda baca, diakritik, dan spasi yang sama.',
    'Jika yakin tidak ada bagian miring, gunakan italic_status="confirmed" dan italic_spans=[]. Jika yakin ada, masukkan setiap rentang italic sebagai satu string persis. Jika bentuknya tidak cukup jelas, gunakan italic_status="uncertain" dan italic_spans=null. Jangan menebak.',
    'TUGAS GARIS BAWAH: periksa apakah NAMA MAHASISWA yang disebut di atas benar-benar memiliki garis horizontal tepat di bawah tulisan namanya. Jangan keliru dengan garis pada judul, garis dekoratif, atau garis di area lain. nama_garis_bawah=true jika garis jelas berada tepat di bawah nama; false jika jelas tidak ada; null jika tidak yakin. name_underline_status="confirmed" hanya jika yakin.',
    'Kembalikan JSON saja, tanpa markdown: {"italic_status":"confirmed|uncertain","italic_spans":[],"name_underline_status":"confirmed|uncertain","nama_garis_bawah":true|false|null}.'
  ].join('\n');
  const response = await new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Audit visual format melewati 28 detik.')), 28000);
    client.models.generateContent({
      model: MODEL,
      contents: { parts: [...images, { text: prompt }] },
      config: { responseMimeType: 'application/json', temperature: 0 }
    }).then((value: any) => { clearTimeout(timer); resolve(value); }, (error: any) => { clearTimeout(timer); reject(error); });
  });
  if (!response?.text) throw new Error('Audit visual tidak mengembalikan hasil.');
  const raw = parseGeminiJson(response.text);
  return {
    italicStatus: raw.italic_status === 'confirmed' ? 'confirmed' : 'uncertain',
    italicSpans: Array.isArray(raw.italic_spans) ? raw.italic_spans : null,
    nameUnderlineStatus: raw.name_underline_status === 'confirmed' ? 'confirmed' : 'uncertain',
    nameUnderlined: typeof raw.nama_garis_bawah === 'boolean' ? raw.nama_garis_bawah : null
  };
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
  // Browser hanya mengirim foto asli; semua perangkat dinormalisasi dengan proses server yang sama.
  const full = getImage(req.body?.imageBase64, req.body?.mimeType, 35_000_000);
  if (!full) return res.status(400).json({ error: 'Foto asli tidak valid atau melebihi batas 25 MB. Gunakan JPG/PNG/WebP.' });
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
- Gambar kedua adalah perbesaran wilayah judul; gambar ketiga adalah perbesaran area nama/identitas. Gunakan hanya untuk memeriksa format visual sesuai posisinya pada cover lengkap.

Kembalikan HANYA JSON, tanpa markdown, dengan struktur {"judul":"...","title_segments":[{"text":"...","italic":false}],"nama":"...","nim":"...","prodi":"...","fakultas":"...","universitas":"...","kota":"...","jenis_dokumen":"...","bulan_tahun":"...","program_jenjang":"...","nama_garis_bawah":false,"uncertain_characters":[]}.`;
  try {
    const client = new GoogleGenAI({ apiKey, httpOptions: { timeout: 58_000 } });
  const prepared = await prepareGeminiImages(full);
  const imageParts: GeminiImagePart[] = [
    prepared.full,
    ...(prepared.titleCrop ? [prepared.titleCrop] : []),
    ...(prepared.nameCrop ? [prepared.nameCrop] : [])
  ];
  const response = await client.models.generateContent({
    model: MODEL,
    contents: { parts: [...imageParts, { text: prompt }] },
    config: { responseMimeType: 'application/json', temperature: 0 }
  });
  if (!response.text) return res.status(502).json({ error: 'Model tidak mengembalikan teks. Coba OCR lokal.' });
  const data = decodeResult(response.text);
  // Audit visual selalu berjalan, termasuk ketika hasil awal sudah berisi label italic.
  try {
    const visual = await detectVisualFormatting(client, imageParts, data.judul, data.nama);
    if (visual.italicStatus === 'confirmed' && visual.italicSpans) {
      const correctedSegments = applyItalicSpans(data.judul, visual.italicSpans);
      if (correctedSegments) {
        data.title_segments = correctedSegments;
        data.title_format_source = 'gemini-visual-audit';
        data.warnings.push('Format italic diperiksa ulang dari foto dan diterapkan per bagian judul.');
      } else {
        data.warnings.push('Rentang italic dari pemeriksaan visual tidak cocok persis dengan judul OCR; format awal dipertahankan untuk koreksi manual.');
      }
    } else {
      data.warnings.push('Pemeriksaan visual belum dapat memastikan bagian italic. Periksa format judul secara manual.');
    }
    if (visual.nameUnderlineStatus === 'confirmed' && typeof visual.nameUnderlined === 'boolean') {
      data.nama_garis_bawah = visual.nameUnderlined;
      data.name_underline_source = 'gemini-visual-audit';
      if (visual.nameUnderlined) data.warnings.push('Garis bawah nama mahasiswa terdeteksi dari pemeriksaan visual.');
    } else {
      data.warnings.push('Garis bawah nama belum dapat dipastikan oleh pemeriksaan visual; kotak Garis bawah nama tetap dapat dikoreksi manual.');
    }
  } catch (visualError: any) {
    data.warnings.push('Pemeriksaan visual italic/garis bawah tidak selesai: ' + String(visualError?.message || 'layanan tidak tersedia').slice(0, 100) + '. Teks OCR tetap dipertahankan; periksa format secara manual.');
  }
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

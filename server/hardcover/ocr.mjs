import { GoogleGenAI } from '@google/genai';
import { categorize } from './cover-classifier.mjs';

const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const FALLBACK_MODELS = ['gemini-flash-latest', 'gemini-3.8-flash'];

const INSTRUCTION = `Anda OCR untuk cover skripsi Indonesia. Balas HANYA JSON object.
Foto pengguna adalah sumber satu-satunya. Salin akurat; jangan menebak satu huruf pun.
Bedakan judul, nama, NIM (string), prodi, fakultas, universitas, jenis_dokumen,
Jenis dokumen harus sesuai foto: SKRIPSI, TESIS, THESIS, DISERTASI, MAKALAH, dan lainnya. Jangan bakukan SKRIPSI,
bulan, tahun, bulan_tahun. Logo tidak diperlukan; abaikan tulisan dalam logo.
Pertahankan karakter transliterasi Arab seperti ā ī ū ḥ ṣ ḍ ṭ ẓ ‘ ’.
Deteksi italic hanya dari tampilan VISUAL. Jangan berasumsi semua istilah asing miring.
Bagi judul ke dalam title_segments [{"text":"...","italic":true/false}].
Gabungan segmen HARUS identik persis dengan judul, tanpa penambahan/hilang spasi.
Tulis warning jika ambigu. Jika tidak terbaca, isi string kosong, jangan berhalusinasi.
Skema JSON: {"judul":"","nama":"","nim":"","prodi":"","fakultas":"",
"universitas":"","jenis_dokumen":"","bulan":"","tahun":"",
"bulan_tahun":"","title_segments":[{"text":"","italic":false}],"warnings":[]}.`;

/**
 * Optimizes huge mobile camera images (> 1600px width/height or > 1MB)
 * to speed up transfer to Gemini from 30s down to 1-2s.
 */
async function optimizeImage(buffer, mimeType) {
  try {
    const { createCanvas, loadImage } = await import('@napi-rs/canvas');
    const img = await loadImage(buffer);
    const maxDim = 1600;
    if (img.width <= maxDim && img.height <= maxDim && buffer.length < 1024 * 1024) {
      return { buffer, mimeType };
    }
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    const optimized = canvas.toBuffer('image/jpeg');
    return { buffer: optimized, mimeType: 'image/jpeg' };
  } catch (_) {
    return { buffer, mimeType };
  }
}

/**
 * Local offline OCR fallback in case Google Gemini experiences temporary 503 high demand spikes.
 */
async function fallbackLocalOcr(photoBuffer) {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    const ret = await worker.recognize(photoBuffer);
    await worker.terminate();
    const rawText = ret.data.text || '';
    const lines = rawText.split('\n').map(s => s.trim()).filter(Boolean);
    const result = categorize(lines, [
      'Layanan Gemini sedang mengalami lonjakan trafik (503). Sistem otomatis mengaktifkan pembaca OCR cadangan agar foto Anda tetap terbaca tanpa macet.'
    ]);
    return result;
  } catch (err) {
    throw Object.assign(new Error(`Gagal membaca foto: ${err?.message || 'Layanan sedang sibuk'}`), { status: 502 });
  }
}

export async function readCover(photoBuffer, mimeType = 'image/jpeg') {
  if (!process.env.GEMINI_API_KEY) {
    return await fallbackLocalOcr(photoBuffer);
  }

  const { buffer: readyBuffer, mimeType: readyMime } = await optimizeImage(photoBuffer, mimeType);
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError = null;
  let response = null;

  for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
    const model = modelsToTry[attempt];
    try {
      response = await Promise.race([
        ai.models.generateContent({
          model,
          contents: [{
            role: 'user',
            parts: [
              { text: INSTRUCTION },
              { inlineData: { mimeType: readyMime, data: readyBuffer.toString('base64') } }
            ]
          }],
          config: { temperature: 0, responseMimeType: 'application/json' }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout 25s pada model ' + model)), 25000))
      ]);
      if (response && response.text) break;
    } catch (error) {
      lastError = error;
      const errMsg = String(error?.message || error);
      console.warn(`[HardCover OCR] Model ${model} error:`, errMsg);
      if (attempt < modelsToTry.length - 1) {
        await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }

  if (!response || !response.text) {
    console.warn('[HardCover OCR] All Gemini models busy/unavailable, falling back to local OCR engine...');
    return await fallbackLocalOcr(readyBuffer);
  }

  let parsed;
  try {
    parsed = JSON.parse(String(response.text || '').replace(/^```(?:json)?|```$/gm, '').trim());
  } catch {
    console.warn('[HardCover OCR] JSON parse error from Gemini, using local OCR fallback...');
    return await fallbackLocalOcr(readyBuffer);
  }

  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    return await fallbackLocalOcr(readyBuffer);
  }

  const keys = ['judul', 'nama', 'nim', 'prodi', 'fakultas', 'universitas', 'jenis_dokumen', 'bulan', 'tahun', 'bulan_tahun'];
  const output = Object.fromEntries(keys.map(k => [k, typeof parsed[k] === 'string' ? parsed[k] : (parsed[k] == null ? '' : String(parsed[k]))]));
  const segments = Array.isArray(parsed.title_segments) ? parsed.title_segments.filter(x => x && typeof x.text === 'string').map(x => ({ text: x.text, italic: !!x.italic })) : [];
  output.warnings = Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : [];

  if (segments.map(s => s.text).join('') !== output.judul) {
    output.title_segments = [{ text: output.judul, italic: false }];
    output.warnings.push('Format italic tidak konsisten dengan judul; periksa dan koreksi secara manual.');
  } else {
    output.title_segments = segments;
  }

  return output;
}

// ZAINNET_MENU5_LINK2_PARAPHRASE_V2_20261113
import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
export const plagiarismV2Router = express.Router();
const router = plagiarismV2Router;

// Lazy initialize Gemini Client
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Available Models: gemini-3.1-flash-lite is the default ultra-fast, cheap & high-performance model
export const SUPPORTED_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-3.1-pro-preview',
];

/**
 * Execute Gemini API with primary ultra-fast model (gemini-3.1-flash-lite) + auto fallback chain
 */
async function generateWithFallback(
  contents: string,
  schemaConfig?: any,
  preferredModel?: string
): Promise<{ text: string; modelUsed: string }> {
  let lastError: any = null;

  // Always prioritize Gemini 3.1 Flash-Lite for maximum speed and cost efficiency
  const primaryModel = preferredModel && SUPPORTED_MODELS.includes(preferredModel)
    ? preferredModel
    : 'gemini-3.1-flash-lite';

  const candidateList = [
    primaryModel,
    ...SUPPORTED_MODELS.filter((m) => m !== primaryModel),
  ];

  for (const model of candidateList) {
    try {
      const config: any = {};
      if (schemaConfig) {
        config.responseMimeType = schemaConfig.responseMimeType || 'application/json';
        if (schemaConfig.responseSchema) {
          config.responseSchema = schemaConfig.responseSchema;
        }
      }

      const generatePromise = getAI().models.generateContent({
        model,
        contents,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      // 12-second rapid timeout per model call for ultra-responsive user experience
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout model ${model}`)), 12000)
      );

      const response: any = await Promise.race([generatePromise, timeoutPromise]);

      if (response && response.text) {
        return { text: response.text, modelUsed: model };
      }
    } catch (err: any) {
      lastError = err;
      const isTemporaryDemand =
        err?.status === 'UNAVAILABLE' ||
        err?.message?.includes('503') ||
        err?.message?.includes('high demand') ||
        err?.message?.includes('Timeout');
      if (isTemporaryDemand) {
        console.warn(`Model ${model} sedang sibuk (503/timeout), otomatis beralih ke model cadangan...`);
      } else {
        console.warn(`Model ${model} attempt failed:`, err?.message || err);
      }
    }
  }

  throw lastError || new Error('Semua model Gemini sedang sibuk atau melampaui kuota.');
}

/**
 * ZAINNET_MENU5_NATURAL_EDITOR_V1
 * Fail-safe: when the remote editor is unavailable, do NOT invent a revision.
 * Keep the original passage unchanged for a responsible manual review.
 */
function academicLocalParaphrase(
  text: string,
  _style: string = 'natural_academic',
  _protectedTerms: string[] = []
): { paraphrased: string; alt: string; note: string } {
  const original = String(text || '');
  return {
    paraphrased: original,
    alt: original,
    note: 'Belum diproses: layanan revisi otomatis sedang tidak tersedia. Teks asli dipertahankan untuk ditinjau manual.',
  };
}

// Authentication/entitlement check for EVERY tool-specific API request.
// CORS alone is not authentication; never expose a public unauthenticated Gemini endpoint.
const usage = new Map<string, { count: number, expires: number }>();
router.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.setHeader('Cache-Control', 'no-store, private');
  const token = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'Silakan masuk ke akun ZAIN.NET untuk menggunakan Link 2.' });
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://pxseiytikiulxincoolh.supabase.co';
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!key) return res.status(503).json({ error: 'Layanan login belum tersedia.' });
  try {
    const sb = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: identity, error: authError } = await sb.auth.getUser(token);
    const user = authError ? null : identity.user;
    if (!user) return res.status(401).json({ error: 'Sesi masuk sudah berakhir. Silakan login kembali.' });
    if (user.app_metadata?.academic_role !== 'admin') {
      const uid = user.id;
      const [{ data: quota, error: quotaError }, { data: trial, error: trialError }] = await Promise.all([
        sb.from('academic_documents').select('payload').eq('path', `users/${uid}/data/quotas`).maybeSingle(),
        sb.from('academic_documents').select('payload').eq('path', `users/${uid}/data/reseller_trials`).maybeSingle(),
      ]);
      if (quotaError || trialError) throw quotaError || trialError;
      const val = quota?.payload?.['plag-2'];
      const paid = typeof val === 'number' && Number.isSafeInteger(val) && val > 0 ? val : 0;
      const used = trial?.payload?.['plag-2'];
      const validTrial = user.app_metadata?.academic_role === 'reseller' &&
        (typeof used === 'number' && Number.isSafeInteger(used) ? used : 0) < 3;
      if (paid === 0 && !validTrial) return res.status(402).json({ error: 'Kuota Menu 5 Link 2 habis. Silakan membeli hak pembuatan terlebih dahulu.' });
    }
    const now = Date.now();
    if (usage.size > 1000) for (const [id, v] of usage) if (v.expires < now) usage.delete(id);
    const record = usage.get(user.id) || { count: 0, expires: now + 15*60_000 };
    if (record.expires < now) { record.count = 0; record.expires = now + 15*60_000; }
    if (++record.count > 50) return res.status(429).json({ error: 'Terlalu banyak permintaan. Coba kembali beberapa saat lagi.' });
    usage.set(user.id, record);
    return next();
  } catch (e: any) {
    console.warn('[plagiarism-v2/auth]', String(e?.message || e).slice(0,160));
    return res.status(503).json({ error: 'Pemeriksaan akun belum berhasil. Silakan ulangi tanpa membayar kembali.' });
  }
});

router.post('/parse-pdf', async (req, res) => {
  let doc: any;
  try {
    const base64Data = req.body?.base64Data;
    if (typeof base64Data !== 'string' || !base64Data || base64Data.length > 19_000_000) {
      return res.status(400).json({ error: 'Unggah laporan PDF yang valid (maksimal 14 MB).' });
    }
    const binary = Buffer.from(base64Data, 'base64');
    if (binary.subarray(0, 5).toString('ascii') !== '%PDF-') {
      return res.status(400).json({ error: 'Berkas yang dikirim bukan PDF.' });
    }
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    doc = await pdfjs.getDocument({ data: new Uint8Array(binary), isEvalSupported: false,
      disableFontFace: true, useSystemFonts: true }).promise;
    if (doc.numPages > 300) return res.status(413).json({ error: 'Laporan PDF maksimal 300 halaman.' });
    const pages: string[] = [];
    for (let i=1; i<=doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push((content.items || []).map((item: any) => item.str || '').join(' '));
      page.cleanup();
    }
    const text = pages.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    return res.json({ text, numpages: doc.numPages, info: null });
  } catch (err: any) {
    console.warn('[plagiarism-v2/pdf]', String(err?.message || err).slice(0, 180));
    return res.status(422).json({ error: 'Laporan PDF belum dapat dibaca. Coba PDF digital atau salin teks laporan.' });
  } finally {
    try { await doc?.destroy(); } catch {}
  }
});

  router.post('/extract-plagiarism', async (req, res) => {
    try {
      const { textContent, preferredModel } = req.body;

      if (!textContent || typeof textContent !== 'string') {
        return res.status(400).json({ error: 'Teks sumber laporan plagiasi diperlukan' });
      }

      const prompt = `Anda adalah asisten akademik ahli analisis plagiasi skripsi/tesis Indonesia.
Tugas Anda: Dari teks laporan plagiasi berikut, ekstrak kalimat atau frasa utama yang terindikasi plagiasi/kesamaan tinggi.
Jika teks merupakan kumpulan kalimat, pisahkan menjadi segmen-segmen kalimat/paragraf yang bermakna.

Teks Laporan/Plagiasi:
"""
${textContent.slice(0, 10000)}
"""

Kembalikan format JSON array of strings berisi daftar potongan teks/kalimat yang terindikasi plagiasi untuk diparafrase.
Pastikan teks yang diekstrak adalah kalimat lengkap atau frasa bermakna dalam bahasa Indonesia/akademik.`;

      try {
        const { text, modelUsed } = await generateWithFallback(
          prompt,
          {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  originalText: {
                    type: Type.STRING,
                    description: 'Teks/kalimat yang terindikasi plagiasi',
                  },
                  similarityScore: {
                    type: Type.NUMBER,
                    description: 'Estimasi tingkat kesamaan plagiasi (persentase 0-100)',
                  },
                  contextNote: {
                    type: Type.STRING,
                    description: 'Catatan ringkas konteks akademik kalimat',
                  },
                },
                required: ['originalText'],
              },
            },
          },
          preferredModel
        );

        const extractedItems = JSON.parse(text || '[]');
        if (extractedItems.length > 0) {
          return res.json({ items: extractedItems, modelUsed });
        }
      } catch (aiErr) {
        console.warn('AI Extraction failed/limited, using local rule-based extractor:', aiErr);
      }

      // Local Fallback Extractor
      const quoteMatches = textContent.match(/"([^"]{25,})"/g);
      let fallbackItems = [];
      if (quoteMatches && quoteMatches.length > 0) {
        fallbackItems = quoteMatches.map((q, idx) => ({
          originalText: q.replace(/^"|"$/g, '').trim(),
          similarityScore: 85 - idx * 2,
          contextNote: 'Kutipan terdeteksi plagiasi',
        }));
      } else {
        const lines = textContent
          .split(/\n+/)
          .map((l) => l.trim().replace(/^\d+[\.\)]\s*/, ''))
          .filter((l) => l.length > 35);

        fallbackItems = lines.slice(0, 15).map((l, idx) => ({
          originalText: l,
          similarityScore: 80 - (idx % 10),
          contextNote: 'Kalimat terindikasi plagiasi',
        }));
      }

      res.json({ items: fallbackItems, modelUsed: 'local_engine' });
    } catch (err: any) {
      console.error('Error extracting plagiarism:', err);
      res.status(500).json({ error: err.message || 'Gagal mengekstrak plagiasi dari laporan' });
    }
  });

  // API: Paraphrase text in Academic Indonesian with user-selected Gemini Model
  router.post('/paraphrase', async (req, res) => {
    try {
      const { items, style = 'academic_formal', protectedTerms = [], preferredModel } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Daftar teks untuk diparafrase diperlukan' });
      }
      if (items.length > 100 || items.some((x: any) => String(x.text || x.originalText || '').length > 12000)) {
        return res.status(413).json({ error: 'Jumlah teks terlalu besar. Proses maksimal 100 bagian dalam satu permintaan.' });
      }

      let styleInstruction = 'Sunting seperlunya agar jelas, baku, dan sesuai gaya penulis naskah asli; hindari sinonim yang dipaksakan.';
      if (style === 'natural_academic') {
        styleInstruction = 'REVISI AKADEMIK NATURAL: Gunakan gaya bahasa penulis asli, kalimat efektif, variasi struktur yang wajar, dan pilihan kata umum yang tepat. Jangan menambah argumen baru. Jika kalimat sudah baik, pertahankan tanpa perubahan.';
      } else if (style === 'active_passive') {
        styleInstruction = 'METODE RESTRUKTURISASI KLAUSA: Ubah orientasi subjek-objek, konversikan kalimat aktif menjadi pasif atau sebaliknya, tanpa menghilangkan istilah teknis rujukan.';
      } else if (style === 'split_sentences') {
        styleInstruction = 'Pecah kalimat panjang jika dapat meningkatkan kejelasan. Jaga hubungan sebab-akibat, konteks, sitasi, dan maksud asli.';
      } else if (style === 'synthesize') {
        styleInstruction = 'METODE SINTESIS ARGUMEN: Rangkum intisari dan substansi ilmiah gagasan tersebut ke dalam konstruksi kalimat baru dengan perspektif akademis orisinal.';
      } else if (style === 'deep_reconstruct') {
        styleInstruction = 'Susun ulang gagasan yang rumit menjadi uraian yang runtut dan mudah dipahami tanpa mengubah data, argumen atau istilah teknis. Jangan memaksakan kosakata yang tidak alami.';
      } else if (style === 'synonym_rephrase') {
        styleInstruction = 'Gunakan diksi yang tepat dan lazim dalam penulisan ilmiah. Ubah hanya kata yang memang perlu diperjelas; jangan mengganti istilah teknis atau sinonim secara mekanis.';
      } else if (style === 'quote_block') {
        styleInstruction = 'Bila bagian ini benar-benar kutipan langsung dari sumber yang tersedia, pertahankan teks sumber secara verbatim dan rujukannya. Jangan mengarang kutipan, atribusi, atau menyarankan manipulasi pemeriksaan similarity.';
      }

      const protectedClause = protectedTerms.length > 0
        ? `\n5. DILARANG KERAS MENGUBAH / MENGGANTI ISTILAH TERLINDUNGI BERIKUT (Pertahankan karakter demi karakter): [${protectedTerms.join(', ')}]`
        : '';

      const CHUNK_SIZE = 4;
      const chunks = [];
      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        chunks.push(items.slice(i, i + CHUNK_SIZE));
      }

      let usedAI = false;
      let finalModelUsed = preferredModel || 'gemini-3.1-flash-lite';

      // Process all chunks concurrently for maximum speed with Gemini 3.1 Flash-Lite
      const chunkWorker = async (chunk: any[]) => {
        const prompt = `Anda adalah editor bahasa akademik Indonesia. Revisi naskah secara bertanggung jawab berdasarkan maksud dan gaya penulis asli, bukan untuk menyiasati pendeteksi otomatis.
TUGAS:
1. Pertahankan makna, fakta, angka, simpulan, dan terminologi khusus. Jangan membuat sumber, kutipan, data, atau argumen baru.
2. Gunakan bahasa Indonesia baku yang jelas, efektif, tidak bertele-tele, dan selaras dengan gaya penulis.
3. Hindari awalan kalimat yang berulang, sinonim yang dibuat-buat, dan pengubahan kalimat yang sudah jelas.
4. Pertahankan sitasi, tanda rujukan, token yang dilindungi, serta keterkaitan dengan paragraf sekitarnya.${protectedClause}
5. Jika suatu kalimat tidak perlu diubah atau berisiko berubah makna, kembalikan persis seperti semula.

PENDEKATAN PENYUNTINGAN: ${styleInstruction}

Daftar bagian dari dokumen beserta petunjuk konteks:
${JSON.stringify(chunk, null, 2)}

Berikan JSON array: id, originalText, paraphrasedText, alternativeText, explanation.
Penjelasan harus menjelaskan suntingan faktual, bukan menjanjikan nilai similarity atau hasil AI detector.`;

        try {
          const { text, modelUsed } = await generateWithFallback(
            prompt,
            {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    originalText: { type: Type.STRING },
                    paraphrasedText: { type: Type.STRING },
                    alternativeText: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                  required: ['id', 'originalText', 'paraphrasedText'],
                },
              },
            },
            preferredModel || 'gemini-3.1-flash-lite'
          );

          finalModelUsed = modelUsed;
          const chunkRes = JSON.parse(text || '[]');
          if (Array.isArray(chunkRes) && chunkRes.length > 0) {
            const normalized = chunk.map((item: any) => {
              const original = String(item.text || item.originalText || '');
              const found = chunkRes.find((r: any) => String(r?.id) === String(item.id));
              if (!found || typeof found.paraphrasedText !== 'string' || !found.paraphrasedText.trim()) {
                return {
                  id: item.id, originalText: original, paraphrasedText: original,
                  alternativeText: '', requiresReview: true, source: 'manual_review',
                  explanation: 'Respons penyuntingan belum lengkap; teks asli tidak diubah.'
                };
              }
              return { ...found, id: item.id, requiresReview: false, source: 'editor' };
            });
            if (normalized.some((r: any) => !r.requiresReview)) usedAI = true;
            return normalized;
          }
        } catch (chunkErr) {
          console.warn('Gemini chunk call failed, using academic local engine for this chunk:', chunkErr);
        }

        // Chunk Fallback to offline academic engine
        return chunk.map((item: any) => {
          const original = String(item.text || item.originalText || '');
          const local = academicLocalParaphrase(original, style, protectedTerms);
          return {
            id: item.id,
            originalText: original,
            paraphrasedText: local.paraphrased,
            alternativeText: '',
            explanation: local.note,
            requiresReview: true,
            source: 'manual_review',
          };
        });
      };

      // Bound concurrency to two requests at once to protect limited Render memory.
      const chunkResultsArray: any[][] = [];
      for (let i = 0; i < chunks.length; i += 2) {
        const partialResults = await Promise.all(chunks.slice(i, i + 2).map(chunkWorker));
        chunkResultsArray.push(...partialResults);
      }
      const aggregatedResults = chunkResultsArray.flat();

        const requiresReviewCount = aggregatedResults.filter((r: any) => r.requiresReview).length;
      res.json({
        results: aggregatedResults,
        modelUsed: usedAI ? finalModelUsed : 'manual_review',
        source: requiresReviewCount > 0 ? (usedAI ? 'partial_review' : 'manual_review') : 'editor',
        requiresReviewCount,
      });
    } catch (err: any) {
      console.error('Error paraphrasing:', err);
      res.status(500).json({ error: err.message || 'Gagal memparafrase teks skripsi' });
    }
  });

  // Comprehensive Multi-Strategy Deep Resolver for Stubborn Plagiarism Sentences
  router.post('/resolve-stubborn', async (req, res) => {
    try {
      const { text, context, protectedTerms = [], preferredModel } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Teks diperlukan' });
      }

      const protectedClause = protectedTerms.length > 0
        ? `\nJAGA DAN JANGAN UBAH ISTILAH BERIKUT: [${protectedTerms.join(', ')}]`
        : '';

      const prompt = `Anda adalah editor akademik yang membantu memperjelas kalimat sulit tanpa mengubah gagasan, angka, atau sitasi asli.

Teks Asli: "${text}"
${context ? `Konteks Paragraf Asli: "${context}"` : ''}${protectedClause}

TUGAS: Berikan variasi yang secara akademik masuk akal, hanya bila diperlukan:
1. TEKNIK 1: Pemecah Kalimat -> Pecah kalimat panjang bila membuat makna lebih jelas.
2. TEKNIK 2: Rekonstruksi Kontekstual -> Susun ulang secara wajar tanpa memindahkan fokus argumen.
3. TEKNIK 3: Ringkasan Gagasan -> Ringkas hanya jika tidak menghilangkan data penting.
4. TEKNIK 4: Kutipan Langsung Terverifikasi -> Tampilkan verbatim hanya jika teks adalah kutipan asli dan atribusinya tersedia.

Kembalikan dalam JSON:
{
  "solutions": [
    {
      "technique": "Pemecah Kalimat Majemuk",
      "text": "...",
      "estimatedSimilarity": "Tidak dapat diperkirakan tanpa pemeriksaan terpisah",
      "rationale": "Membuat kalimat panjang lebih mudah dipahami."
    },
    {
      "technique": "Rekonstruksi Radikal",
      "text": "...",
      "estimatedSimilarity": "Tidak dapat diperkirakan tanpa pemeriksaan terpisah",
      "rationale": "Memperjelas susunan klausa tanpa mengubah fokus argumen."
    },
    {
      "technique": "Sintesis Argumen",
      "text": "...",
      "estimatedSimilarity": "Tidak dapat diperkirakan tanpa pemeriksaan terpisah",
      "rationale": "Memadatkan gagasan tanpa menghilangkan fakta atau rujukan."
    },
    {
      "technique": "Kutipan Langsung Resmi",
      "text": "...",
      "estimatedSimilarity": "Tidak dapat diperkirakan tanpa pemeriksaan terpisah",
      "rationale": "Mempertahankan kutipan asli dan sumbernya secara akurat."
    }
  ]
}`;

      try {
        const { text: aiText, modelUsed } = await generateWithFallback(
          prompt,
          {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                solutions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      technique: { type: Type.STRING },
                      text: { type: Type.STRING },
                      estimatedSimilarity: { type: Type.STRING },
                      rationale: { type: Type.STRING },
                    },
                    required: ['technique', 'text', 'estimatedSimilarity', 'rationale'],
                  },
                },
              },
              required: ['solutions'],
            },
          },
          preferredModel
        );

        const result = JSON.parse(aiText || '{}');
        if (result.solutions && result.solutions.length > 0) {
          return res.json({ solutions: result.solutions, modelUsed, source: 'ai' });
        }
      } catch (aiErr: any) {
        console.warn('Resolve stubborn AI fallback:', aiErr?.message);
      }

      return res.status(503).json({ error: 'Layanan revisi lanjutan belum tersedia. Teks asli dipertahankan; tinjau dan sunting manual.' });
    } catch (err: any) {
      console.error('Error resolving stubborn plagiarism:', err);
      res.status(500).json({ error: err.message || 'Gagal memproses solusi kalimat sulit' });
    }
  });

  // Single Item Fast Paraphrase / Regeneration with chosen Gemini Model
  router.post('/paraphrase-single', async (req, res) => {
    try {
      const { text, context, style = 'academic_formal', protectedTerms = [], preferredModel } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Teks diperlukan' });
      }

      const protectedClause = protectedTerms.length > 0
        ? `\nPENTING: Pertahankan istilah berikut tanpa perubahan: [${protectedTerms.join(', ')}]`
        : '';

      const prompt = `Sunting kalimat skripsi ke dalam Bahasa Indonesia akademik yang wajar dan jelas. Jaga gaya penulis asli, makna, rujukan, dan konteks; jangan menambah fakta atau sumber. Bila sudah baik, biarkan seperti semula.${protectedClause}

Teks Asli: "${text}"
${context ? `Konteks Paragraf Asli: "${context}"` : ''}
Gaya: ${style}

Berikan 3 variasi hasil parafrase ilmiah yang berbeda sudut pandang/struktur kalimatnya.`;

      try {
        const { text: aiText, modelUsed } = await generateWithFallback(
          prompt,
          {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                option1: { type: Type.STRING, description: 'Opsi Parafrase Formal Baku' },
                option2: { type: Type.STRING, description: 'Opsi Restrukturisasi Kalimat' },
                option3: { type: Type.STRING, description: 'Opsi Diksi & Kosakata Ilmiah' },
                similarityReductionTip: { type: Type.STRING },
              },
              required: ['option1', 'option2', 'option3'],
            },
          },
          preferredModel
        );

        const result = JSON.parse(aiText || '{}');
        if (result.option1) {
          return res.json({ result, modelUsed, source: 'ai' });
        }
      } catch (aiErr: any) {
        console.warn('Single paraphrase AI fallback:', aiErr?.message);
      }

      return res.status(503).json({ error: 'Variasi otomatis belum tersedia. Teks asli tidak diubah. Silakan coba lagi atau edit manual.' });
    } catch (err: any) {
      console.error('Error single paraphrase:', err);
      res.status(500).json({ error: err.message || 'Gagal memproses parafrase' });
    }
  });

  // API: Audit EYD V & KBBI for Academic Indonesian
  router.post('/audit-eyd', (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Teks diperlukan untuk audit EYD' });
      }

      // Check against basic KBBI non-baku
      const nonBakuDict: Record<string, string> = {
        merubah: 'mengubah',
        praktek: 'praktik',
        analisa: 'analisis',
        respon: 'respons',
        aktifitas: 'aktivitas',
        efektifitas: 'efektivitas',
        resiko: 'risiko',
        antrian: 'antrean',
        atlit: 'atlet',
        cidera: 'cedera',
        faham: 'paham',
        hakekat: 'hakikat',
        himbau: 'imbau',
        ijin: 'izin',
        jadual: 'jadwal',
        karir: 'karier',
        komplit: 'komplet',
        konkrit: 'konkret',
        kordinasi: 'koordinasi',
        kuitansi: 'kuitansi',
        kwitansi: 'kuitansi',
        metoda: 'metode',
        obyek: 'objek',
        obyektif: 'objektif',
        subyek: 'subjek',
        subyektif: 'subjektif',
        prosentase: 'persentase',
        sistim: 'sistem',
        standarisasi: 'standardisasi',
        tehnik: 'teknik',
        tehnologi: 'teknologi',
        terimakasih: 'terima kasih',
        dimana: 'di mana',
        disamping: 'di samping',
      };

      const issues: any[] = [];
      let correctedText = text;
      let counter = 0;

      for (const [nonBaku, baku] of Object.entries(nonBakuDict)) {
        const regex = new RegExp(`\\b${nonBaku}\\b`, 'gi');
        if (regex.test(text)) {
          issues.push({
            id: `server-eyd-${++counter}`,
            originalWord: nonBaku,
            suggestedWord: baku,
            category: 'non_baku',
            explanation: `Kata tidak baku menurut KBBI. Bentuk baku: "${baku}".`,
          });
          correctedText = correctedText.replace(regex, baku);
        }
      }

      const words = text.match(/\b\w+\b/g) || [];
      const score = Math.max(50, Math.min(100, Math.round(100 - (issues.length / Math.max(1, words.length)) * 100 * 4)));

      res.json({
        totalIssues: issues.length,
        score,
        issues,
        correctedText,
      });
    } catch (err: any) {
      console.error('Error auditing EYD:', err);
      res.status(500).json({ error: err.message || 'Gagal memeriksa EYD' });
    }
  });

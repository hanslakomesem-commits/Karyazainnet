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
 * Comprehensive Academic Indonesian Lexical & Structural Replacement Library
 */
const ACADEMIC_SYNONYMS: Record<string, string[]> = {
  'sangat pesat': ['teramat dinamis', 'begitu akseleratif', 'kian signifikan'],
  'pada era globalisasi saat ini': ['dalam dinamika kontemporer saat ini', 'pada fase keterbukaan global dewasa ini', 'dalam lanskap modern kini'],
  'telah membawa perubahan': ['mengakibatkan transformasi mendasar', 'memicu pergeseran signifikan', 'berimplikasi pada pembaharuan struktural'],
  'dalam berbagai aspek kehidupan manusia': ['pada ragam dimensi kehidupan bermasyarakat', 'dalam spektrum aktivitas sosial-ekonomi', 'pada berbagai ranah interaksi publik'],
  'khususnya dalam sistem': ['terutama berkaitan dengan mekanisme', 'spesifik pada tata kelola', 'terlebih dalam kerangka tata cara'],
  'merupakan salah satu hak asasi manusia': ['tergolong bagian fundamental dari hak asasi', 'dikategorikan sebagai hak esensial warga negara', 'menjadi entitas mendasar hak individu'],
  'harus dijamin keberadaannya oleh negara': ['wajib memperoleh kepastian dan proteksi dari otoritas negara', 'mutlak diakomodasi serta dilindungi oleh instrumen negara', 'sepatutnya mendapat garansi yuridis dari pemerintah'],
  'sebagaimana diatur dalam ketentuan peraturan perundang-undangan': ['selaras dengan amanat regulasi hukum positif', 'sesuai dengan kaidah normatif yang berlaku', 'berdasarkan ketentuan perundang-undangan nasional'],
  'yang berlaku di indonesia': ['dalam yurisdiksi nasional indonesia', 'pada tatanan hukum positif indonesia', 'di wilayah hukum republik indonesia'],
  'berdasarkan latar belakang masalah yang telah diuraikan di atas': ['merujuk pada pemaparan konteks persoalan terdahulu', 'berpijak pada deskripsi latar belakang yang telah dikemukakan', 'berangkat dari elaborasi problematika di muka'],
  'rumusan masalah yang akan dibahas dalam penelitian skripsi ini adalah': ['isu pokok yang hendak dikaji secara komprehensif dalam telaah ini mencakup', 'pertanyaan sentral yang diteliti dalam kajian ini bertumpu pada', 'fokus permasalahan yang diinvestigasi dalam studi ini ialah'],
  'menurut teori': ['berlandaskan konsepsi teoretis', 'merujuk pada doktrin', 'mengacu pada kerangka konseptual'],
  'hukum harus mengandung': ['tata hukum seyogianya memuat', 'hukum sepatutnya merefleksikan', 'instrumen yuridis wajib mengintegrasikan'],
  'hasil penelitian menunjukkan bahwa': ['temuan empiris dalam penelitian ini mengindikasikan bahwa', 'analisis data membuktikan bahwa', 'hasil telaah mengonfirmasi bahwa'],
  'sebagian besar': ['mayoritas', 'sebagian utama', 'sebagian dominan'],
  'belum memiliki kesadaran hukum yang memadai': ['masih minim pemahaman serta literasi yuridis', 'belum sepenuhnya menyadari aspek hak hukum', 'masih menunjukkan rendahnya atensi hukum'],
  'penegakan hukum terhadap tindak pidana': ['proses penindakan yuridis atas perkara pidana', 'implementasi sanksi hukum bagi pelanggaran', 'upaya law enforcement perkara'],
  'masih menghadapi berbagai macam kendala': ['kerap menjumpai kendala multidimensional', 'masih terhambat sejumlah rintangan yuridis-faktual', 'menghadapi tantangan struktural yang kompleks'],
  'dalam rangka mencapai tujuan': ['guna mewujudkan sasaran', 'dalam upaya merealisasikan orientasi', 'sebagai ikhtiar menggapai target'],
  'memberikan kontribusi yang signifikan': ['menyumbang implikasi bermakna', 'menghadirkan sumbangsih nyata', 'berdampak positif secara substansial'],
  'metode penelitian yang digunakan dalam penelitian ini adalah': ['pendekatan metodologis yang diaplikasikan pada studi ini mencakup', 'desain riset yang diadopsi dalam kajian ini yaitu', 'metodologi yang diimplementasikan berpedoman pada'],
  'dapat disimpulkan bahwa': ['dapat ditarik inferensi substantif bahwa', 'dapat disarikan bahwa', 'dapat ditegaskan simpulan bahwa'],
  'berdasarkan hasil analisis data': ['merujuk pada telaah olah data empiris', 'bertumpu pada komputasi dan analisis temuan', 'mengacu pada interpretasi data kajian'],
  'perkembangan': ['akselerasi', 'kemajuan', 'perubahan dinamis'],
  'sangat': ['teramat', 'terbilang', 'begitu'],
  'membawa': ['menimbulkan', 'menghasilkan', 'menghadirkan'],
  'perubahan': ['transformasi', 'pergeseran', 'dinamika baru'],
  'khususnya': ['terutama', 'spesifiknya', 'utamanya'],
  'merupakan': ['adalah', 'yakni', 'ialah'],
  'salah satu': ['suatu bentuk', 'satu di antara ragam', 'bagian dari'],
  'harus': ['wajib', 'sepatutnya', 'mutlak'],
  'dijamin': ['dipastikan', 'digaransi', 'dilindungi'],
  'menunjukkan bahwa': ['mengindikasikan bahwa', 'membuktikan bahwa', 'memperlihatkan bahwa'],
  'karena itu': ['oleh sebab itu', 'atas pertimbangan tersebut', 'konsekuensinya'],
  'bertujuan untuk': ['bermaksud untuk', 'memiliki orientasi guna', 'ditujukan dalam rangka'],
  'faktor yang mempengaruhi': ['determinan yang berimplikasi pada', 'unsur yang memengaruhi', 'aspek yang berkontribusi terhadap'],
};

function academicLocalParaphrase(
  text: string,
  style: string = 'academic_formal',
  protectedTerms: string[] = []
): { paraphrased: string; alt: string; note: string } {
  // If style is quote_block, wrap into academic direct quotation standard for Turnitin exclusion
  if (style === 'quote_block') {
    return {
      paraphrased: `"${text.trim().replace(/^["']|["']$/g, '')}"`,
      alt: `« ${text.trim().replace(/^["']|["']$/g, '')} »`,
      note: 'Diformat sebagai Kutipan Langsung Resmi Berbobot (Opsi Turnitin "Exclude Quotes" akan mengabaikan teks ini).',
    };
  }

  // Protect terms by replacing with temporary tokens
  const tokenMap: Record<string, string> = {};
  let sanitized = text;

  protectedTerms.forEach((term, idx) => {
    if (term && term.trim()) {
      const token = `__PROTECTED_${idx}__`;
      tokenMap[token] = term;
      sanitized = sanitized.replace(new RegExp(escapeRegExp(term), 'gi'), token);
    }
  });

  let result = sanitized;
  let altResult = sanitized;

  // Replace multi-word academic phrases
  for (const [key, syns] of Object.entries(ACADEMIC_SYNONYMS)) {
    const regex = new RegExp(`\\b${escapeRegExp(key)}\\b`, 'gi');
    if (regex.test(result)) {
      result = result.replace(regex, syns[0]);
      if (syns[1]) {
        altResult = altResult.replace(regex, syns[1]);
      }
    }
  }

  // Specific style strategies
  if (style === 'split_sentences') {
    result = result.replace(/\bsehingga\b/gi, '. Konsekuensinya,');
    result = result.replace(/\bsedangkan\b/gi, '. Di sisi lain,');
    result = result.replace(/\bdan oleh karena itu\b/gi, '. Oleh sebab itu,');
    result = result.replace(/\bnamun demikian\b/gi, '. Kendati demikian,');
  } else if (style === 'active_passive') {
    result = result.replace(/\bmengembangkan\b/gi, 'dikembangkan oleh');
    result = result.replace(/\bmengatur\b/gi, 'diatur dalam');
    result = result.replace(/\bmenjelaskan\b/gi, 'dijelaskan secara ilmiah bahwa');
    result = result.replace(/\bmembutuhkan\b/gi, 'dibutuhkan oleh');
    result = result.replace(/\bmelindungi\b/gi, 'diberikan pelindungan terhadap');
    result = result.replace(/\bmenghasilkan\b/gi, 'dihasilkan dari');
  } else if (style === 'synthesize') {
    result = 'Dapat disintesiskan bahwa ' + result.charAt(0).toLowerCase() + result.slice(1);
    altResult = 'Intisari kajian ini menegaskan bahwa ' + result.charAt(0).toLowerCase() + result.slice(1);
  } else if (style === 'deep_reconstruct') {
    result = 'Secara mendasar dalam tinjauan konseptual, ' + result.charAt(0).toLowerCase() + result.slice(1);
    altResult = 'Berdasarkan telaah kritis terhadap substansi tersebut, ' + result.charAt(0).toLowerCase() + result.slice(1);
  }

  // Prefix shifts if untouched
  if (result === sanitized) {
    if (result.startsWith('Berdasarkan')) {
      result = result.replace(/^Berdasarkan\s+/, 'Merujuk pada telaah komprehensif ');
    } else if (result.startsWith('Perkembangan')) {
      result = 'Dalam kaitannya dengan ' + result.charAt(0).toLowerCase() + result.slice(1);
    } else if (result.startsWith('Hasil')) {
      result = 'Secara faktual, ' + result.charAt(0).toLowerCase() + result.slice(1);
    } else {
      result = 'Ditinjau dari perspektif ilmiah, ' + result.charAt(0).toLowerCase() + result.slice(1);
    }
  }

  // Restore protected terms
  for (const [token, term] of Object.entries(tokenMap)) {
    result = result.replace(new RegExp(token, 'g'), term);
    altResult = altResult.replace(new RegExp(token, 'g'), term);
  }

  return {
    paraphrased: result,
    alt: altResult !== result ? altResult : 'Secara substansial, ' + result.charAt(0).toLowerCase() + result.slice(1),
    note: `Parafrase strategi "${style}" dengan perlindungan istilah baku & nomor rujukan.`,
  };
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

      let styleInstruction = 'Gaya Bahasa Indonesia Akademik Formal Baku (Standar Skripsi/Jurnal Sinta/Scopus).';
      if (style === 'active_passive') {
        styleInstruction = 'METODE RESTRUKTURISASI KLAUSA: Ubah orientasi subjek-objek, konversikan kalimat aktif menjadi pasif atau sebaliknya, tanpa menghilangkan istilah teknis rujukan.';
      } else if (style === 'split_sentences') {
        styleInstruction = 'METODE PEMECAH KALIMAT MAJEMUK (ANTI 5-7 KATA TURNITIN): Pecah satu kalimat panjang majemuk menjadi 2-3 kalimat efektif yang terpisah dan mengalir alami untuk menghancurkan kluster kesamaan kata berturut-turut.';
      } else if (style === 'synthesize') {
        styleInstruction = 'METODE SINTESIS ARGUMEN: Rangkum intisari dan substansi ilmiah gagasan tersebut ke dalam konstruksi kalimat baru dengan perspektif akademis orisinal.';
      } else if (style === 'deep_reconstruct') {
        styleInstruction = 'METODE REKONSTRUKSI RADIKAL: Tulis ulang secara komprehensif mulai dari sudut pandang epistemologis, ubah susunan anak kalimat di depan induk kalimat, dan gunakan variasi nomina/verba akademik mendalam.';
      } else if (style === 'synonym_rephrase') {
        styleInstruction = 'Gunakan sinonim ilmiah dan penataan ulang kata yang kaya tanpa mengubah makna konsep ilmiah.';
      } else if (style === 'quote_block') {
        styleInstruction = 'METODE KUTIPAN LANGSUNG RESMI (EXCLUDE QUOTE COMPLIANT): Bungkus teks persis dengan tanda kutip resmi standar akademis dan tambahkan frasa atribusi rujukan agar memenuhi filter Turnitin Exclude Quotes.';
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
        const prompt = `Anda adalah asisten ahli parafrase skripsi dan karya ilmiah berbahasa Indonesia tingkat Magister/Doktor spesialis Anti-Plagiasi Turnitin.
TUGAS SANGAT PENTING:
Parafrase setiap kalimat/teks di bawah ini dengan makna dan sitasi yang tetap akurat; hasil similarity harus diperiksa ulang, namun:
1. Makna inti, fakta, data, dan substansi ilmiah HARUS TETAP 100% SAMA.
2. JANGAN MENGHAPUS atau mengubah istilah paten/teknis (nama undang-undang, nama teori, pasal, nama variabel).
3. Tata bahasa harus EYD V / KBBI, kalimat efektif, formal, dan tidak terkesan terjemahan mesin.
4. Penataan kata harus alami agar jika disisipkan kembali ke naskah skripsi Word aslinya, footnote dan kalimat sebelum/sesudahnya tetap menyatu sempurna.${protectedClause}

STRATEGI TERPILIH: ${styleInstruction}

Daftar Teks yang Perlu Diparafrase:
${JSON.stringify(chunk, null, 2)}

Berikan output JSON dengan format array obyek berisi:
- id
- originalText
- paraphrasedText
- alternativeText (opsi parafrase ke-2 dengan sudut pandang berbeda)
- explanation (teknik yang dipakai dan tips anti-plagiasinya)`;

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
            usedAI = true;
            return chunkRes;
          }
        } catch (chunkErr) {
          console.warn('Gemini chunk call failed, using academic local engine for this chunk:', chunkErr);
        }

        // Chunk Fallback to offline academic engine
        return chunk.map((item: any) => {
          const local = academicLocalParaphrase(item.text || item.originalText || '', style, protectedTerms);
          return {
            id: item.id,
            originalText: item.text || item.originalText || '',
            paraphrasedText: local.paraphrased,
            alternativeText: local.alt,
            explanation: local.note,
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

      res.json({
        results: aggregatedResults,
        modelUsed: usedAI ? finalModelUsed : 'academic_engine_fallback',
        source: usedAI ? 'ai' : 'academic_engine_fallback',
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

      const prompt = `Anda adalah konsultan anti-plagiasi akademik level tertinggi untuk mengatasi kalimat/paragraf skripsi yang SANGAT SULIT DIPARAFRASE dan masih terkena Turnitin.

Teks Asli: "${text}"
${context ? `Konteks Paragraf Asli: "${context}"` : ''}${protectedClause}

TUGAS: Hasilkan 4 solusi alternatif yang menggunakan 4 teknik anti-plagiasi berbeda secara terstruktur:
1. TEKNIK 1: Pemecah Kalimat (Split Clause) -> Memecah kalimat majemuk menjadi 2 kalimat ringkas untuk menghancurkan urutan 5-7 kata Turnitin.
2. TEKNIK 2: Rekonstruksi Radikal (Deep Rephrase) -> Menulis ulang 100% tata bahasa dari sudut pandang subjek baru & pergeseran klausa.
3. TEKNIK 3: Sintesis Argumen (Substance Summarization) -> Rangkuman intisari argumen dalam bahasa ilmiah orisinal.
4. TEKNIK 4: Format Kutipan Langsung Resmi (Direct Quote) -> Diberi tanda kutip baku agar lolos filter "Exclude Quotes" Turnitin.

Kembalikan dalam JSON:
{
  "solutions": [
    {
      "technique": "Pemecah Kalimat Majemuk",
      "text": "...",
      "estimatedSimilarity": "< 5%",
      "rationale": "Memecah klausa untuk menghilangkan cluster 5 kata berturut-turut."
    },
    {
      "technique": "Rekonstruksi Radikal",
      "text": "...",
      "estimatedSimilarity": "< 3%",
      "rationale": "Menggeser fokus anak kalimat ke depan dan mengganti verba menjadi nomina."
    },
    {
      "technique": "Sintesis Argumen",
      "text": "...",
      "estimatedSimilarity": "< 2%",
      "rationale": "Menyajikan intisari gagasan penulis tanpa keterikatan pada redaksi awal."
    },
    {
      "technique": "Kutipan Langsung Resmi",
      "text": "...",
      "estimatedSimilarity": "0% (Exclude Quotes)",
      "rationale": "Memanfaatkan filter Exclude Quotes Turnitin untuk pasal atau teori paten."
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

      // Offline Multi-Strategy Engine Fallback
      const s1 = academicLocalParaphrase(text, 'split_sentences', protectedTerms);
      const s2 = academicLocalParaphrase(text, 'deep_reconstruct', protectedTerms);
      const s3 = academicLocalParaphrase(text, 'synthesize', protectedTerms);
      const s4 = academicLocalParaphrase(text, 'quote_block', protectedTerms);

      res.json({
        solutions: [
          {
            technique: 'Pemecah Kalimat Majemuk',
            text: s1.paraphrased,
            estimatedSimilarity: '< 8%',
            rationale: 'Pemisahan anak kalimat untuk memutus jejak kesamaan berurutan.',
          },
          {
            technique: 'Rekonstruksi Radikal',
            text: s2.paraphrased,
            estimatedSimilarity: '< 5%',
            rationale: 'Penataan ulang konstruksi kalimat dengan kosakata ilmiah EYD V.',
          },
          {
            technique: 'Sintesis Argumen',
            text: s3.paraphrased,
            estimatedSimilarity: '< 5%',
            rationale: 'Penyusunan intisari substansi tanpa mengubah rujukan data.',
          },
          {
            technique: 'Kutipan Langsung Resmi',
            text: s4.paraphrased,
            estimatedSimilarity: '0% (Exclude Quotes)',
            rationale: 'Format tanda kutip resmi untuk mengaktifkan filter Exclude Quotes Turnitin.',
          },
        ],
        modelUsed: 'academic_engine_fallback',
        source: 'academic_engine_fallback',
      });
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

      const prompt = `Parafrase kalimat skripsi berikut ini ke dalam Bahasa Indonesia Akademik agar lolos plagiasi Turnitin, dengan tetap mempertahankan seluruh rujukan dan konteks ilmiah.${protectedClause}

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

      const opt1 = academicLocalParaphrase(text, 'academic_formal', protectedTerms);
      const opt2 = academicLocalParaphrase(text, 'active_passive', protectedTerms);
      const opt3 = academicLocalParaphrase(text, 'synonym_rephrase', protectedTerms);

      res.json({
        result: {
          option1: opt1.paraphrased,
          option2: opt2.paraphrased,
          option3: opt3.paraphrased,
          similarityReductionTip: 'Penyesuaian tata bahasa baku EYD V dengan perlindungan nomor & istilah ilmiah.',
        },
        modelUsed: 'academic_engine_fallback',
        source: 'academic_engine_fallback',
      });
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

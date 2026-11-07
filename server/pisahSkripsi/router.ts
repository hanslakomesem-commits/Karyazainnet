import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';

export const pisahSkripsiRouter = express.Router();

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.trim() === '') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        timeout: 30000,
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

/**
 * AI Endpoint to analyze thesis text structure and metadata
 */
pisahSkripsiRouter.post('/api/analyze-thesis', async (req, res) => {
  try {
    const { pages, totalPages } = req.body as {
      pages: { pageNumber: number; text: string }[];
      totalPages: number;
    };

    if (!pages || !Array.isArray(pages)) {
      return res.status(400).json({ error: 'Pages array is required' });
    }

    const ai = getAI();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on server.',
      });
    }

    // Prepare concise relevant page summary for prompt (prevents 504 Deadline Exceeded)
    const total = pages.length;
    const isHeadingPage = (text: string) =>
      /^\s*(bab\s+[ivx\d]+|daftar\s+pustaka|lampiran|riwayat\s+hidup|curriculum\s+vitae|pernyataan\s+keaslian)/im.test(text);

    const relevantPages = pages.filter((p) => {
      if (p.pageNumber <= 20) return true;
      if (p.pageNumber > total - 15) return true;
      return isHeadingPage(p.text || '');
    });

    const pageSummaries = relevantPages.map(p => {
      const clean = (p.text || '').replace(/\s+/g, ' ').substring(0, 180);
      return `[Halaman ${p.pageNumber}]: ${clean}`;
    }).join('\n');

    const systemInstruction = `Anda adalah pakar analisis dokumen skripsi/tugas akhir universitas di Indonesia.
Tugas Anda adalah mendeteksi metadata mahasiswa dari Cover dan mendeteksi rentang halaman (1-indexed) untuk setiap bagian skripsi berikut:
- COVER (1-2 hal)
- HALAMAN_PERSETUJUAN (1 hal)
- HALAMAN_PENGESAHAN (1 hal)
- ABSTRAK (Abstrak Indonesia/Inggris)
- KATA_PENGANTAR (Kata Pengantar/Prakata)
- DAFTAR_ISI (Daftar Isi, Daftar Tabel, Gambar, Lampiran - berakhir sebelum BAB I)
- BAB_I (Mulai BAB I Pendahuluan - berakhir sebelum BAB II)
- BAB_II (Mulai BAB II - berakhir sebelum BAB III)
- BAB_III (Mulai BAB III - berakhir sebelum BAB IV)
- BAB_IV (Mulai BAB IV - berakhir sebelum BAB V atau Daftar Pustaka)
- BAB_V (Mulai BAB V - jika skripsi hanya sampai BAB IV, set startPage: 0, endPage: 0)
- DAFTAR_PUSTAKA (Daftar Pustaka / Daftar Rujukan)
- KEASLIAN_TULISAN (Pernyataan Keaslian Tulisan/Keaslian Dokumen, jika ada. Jika tidak ada set 0, 0)
- LAMPIRAN (Seluruh lampiran sebelum Riwayat Hidup, jika ada. Jika tidak ada set 0, 0)
- RIWAYAT_HIDUP (Riwayat Hidup / Curriculum Vitae, jika ada. Jika tidak ada set 0, 0)

Aturan Khusus:
1. Nomor halaman yang Anda berikan HARUS berdasarkan urutan halaman fisik PDF (1 sampai ${totalPages}).
2. JANGAN ambil judul 'BAB I' yang terdapat di dalam Halaman Daftar Isi.
3. Untuk Metadata:
   - nama: Nama lengkap mahasiswa (Huruf kapital)
   - nim: Nomor Induk Mahasiswa
   - prodi: Nama lengkap Program Studi (misal: Hukum Keluarga Islam, Pendidikan Bahasa Arab, Ekonomi Syariah, dll)
   - judul: Judul skripsi lengkap
   - email: Email mahasiswa jika ditemukan, jika tidak ada isi ""`;

    const prompt = `Analisis teks halaman skripsi berikut (${totalPages} total halaman):\n\n${pageSummaries}`;

    const candidateModels = ['gemini-3.1-flash-lite'];
    let lastError: any = null;
    let response: any = null;

    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                metadata: {
                  type: Type.OBJECT,
                  properties: {
                    nama: { type: Type.STRING },
                    nim: { type: Type.STRING },
                    prodi: { type: Type.STRING },
                    judul: { type: Type.STRING },
                    email: { type: Type.STRING },
                  },
                  required: ['nama', 'nim', 'prodi', 'judul'],
                },
                sections: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      key: { type: Type.STRING },
                      startPage: { type: Type.INTEGER },
                      endPage: { type: Type.INTEGER },
                      notes: { type: Type.STRING },
                    },
                    required: ['key', 'startPage', 'endPage'],
                  },
                },
              },
              required: ['metadata', 'sections'],
            },
          },
        });
        if (response && response.text) break;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          console.warn('[analyze-thesis] Quota Gemini tercapai; sistem otomatis menggunakan deteksi heuristik cepat.');
          break;
        }
        if (errMsg.includes('504') || errMsg.includes('Deadline') || errMsg.includes('Timeout')) {
          console.warn('[analyze-thesis] Batas waktu Gemini terlewati; sistem otomatis menggunakan deteksi heuristik cepat.');
          break;
        }
        console.warn(`[analyze-thesis] Model ${modelName} warning:`, errMsg);
      }
    }

    if (!response || !response.text) {
      return res.status(200).json({ success: false, fallback: true, error: lastError?.message || 'Gagal menghasilkan analisis dokumen' });
    }

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.warn('Warning in /api/analyze-thesis (using fallback):', err?.message || err);
    return res.status(200).json({ success: false, fallback: true, error: err?.message || 'Gagal menganalisis skripsi' });
  }
});

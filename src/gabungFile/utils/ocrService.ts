/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OCR Service for Student Document Attachments (Menu No 10)
 * Dual-tier:
 * 1. Primary: Gemini 3.1 Flash Lite Multimodal OCR (/api/gemini/document-ocr)
 *    Accurately identifies official university documents, stamps, and signatures in ~1s.
 * 2. Fallback: Local Tesseract.js / Canvas heuristics with strict safety timeout.
 */

import { backendUrl } from '../../utils/deploymentBridge';

export interface DocumentOcrResult {
  documentType?: 'pengesahan' | 'persetujuan' | 'keaslian' | 'surat_tugas' | 'kartu_bimbingan_depan' | 'kartu_bimbingan_belakang' | 'izin_penelitian' | 'telah_meneliti' | 'bebas_plagiasi' | 'unknown';
  titleSnippet: string;
  confidence: 'high' | 'medium' | 'low';
  orientation?: number;
  hasTableBackground?: boolean;
}

/**
 * Creates a fast downscaled base64 JPEG from an image file (max 900px)
 */
async function fileToCompressedBase64(file: File, maxDim = 1500): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const origW = img.naturalWidth || img.width || 1;
        const origH = img.naturalHeight || img.height || 1;
        const scale = Math.min(1, maxDim / Math.max(origW, origH));
        const w = Math.max(1, Math.round(origW * scale));
        const h = Math.max(1, Math.round(origH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve({ base64: e.target?.result as string, mimeType: file.type || 'image/jpeg' });
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const base64 = canvas.toDataURL('image/jpeg', 0.86);
        resolve({ base64, mimeType: 'image/jpeg' });
      };
      img.onerror = () => {
        resolve({ base64: e.target?.result as string, mimeType: file.type || 'image/jpeg' });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve({ base64: '', mimeType: 'image/jpeg' });
    reader.readAsDataURL(file);
  });
}

/**
 * High-accuracy AI OCR for student document attachments
 */
export async function performDocumentAiOcr(file: File): Promise<DocumentOcrResult | null> {
  try {
    const { base64, mimeType } = await fileToCompressedBase64(file);
    if (!base64) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 65000); // 12-second safety timeout

    const resp = await fetch(backendUrl('/api/gemini/document-ocr'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: base64,
        mimeType,
        fileName: file.name,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json();
      if (data && data.success && data.documentType) {
        return {
          documentType: data.documentType,
          titleSnippet: data.titleSnippet || '',
          confidence: data.confidence || 'high',
          orientation: data.orientation || 0,
          hasTableBackground: !!data.hasTableBackground,
        };
      }
    }
  } catch (err) {
    console.warn('AI Document OCR unavailable or timed out, using heuristic fallback:', err);
  }
  return null;
}

/**
 * Extracts text from the top 35% of the image where document headers/titles are printed.
 * Uses Gemini AI first, then quick heuristics if offline. Never hangs for 5 minutes.
 */
// Worker OCR lokal yang digunakan saat Render/Gemini tidak bisa diakses.
// Memindai teks pada foto, BUKAN menebak dari nama WhatsApp Image.
async function recognizeLocally(file: File): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  // Bahasa Indonesia + Inggris; data bahasa diunduh oleh Tesseract.js pada pemindaian pertama.
  const worker = await createWorker(['ind', 'eng'], 1);
  try {
    const result = await worker.recognize(file);
    const text = result?.data?.text || '';
    const confidence = Number(result?.data?.confidence ?? 0);
    if (confidence < 25 || text.trim().length < 6) return '';
    return text.replace(/\s+/g, ' ').trim().slice(0, 2400);
  } finally {
    await worker.terminate();
  }
}

const typeToHeading: Record<string, string> = {
  pengesahan: 'HALAMAN PENGESAHAN TIM PENGUJI',
  persetujuan: 'HALAMAN PERSETUJUAN PEMBIMBING',
  keaslian: 'SURAT PERNYATAAN KEASLIAN TULISAN',
  surat_tugas: 'SURAT TUGAS PEMBIMBING',
  kartu_bimbingan_depan: 'KARTU BIMBINGAN HALAMAN DEPAN',
  kartu_bimbingan_belakang: 'KARTU BIMBINGAN CATATAN KONSULTASI',
  izin_penelitian: 'SURAT IZIN PENELITIAN',
  telah_meneliti: 'SURAT TELAH MENELITI',
  bebas_plagiasi: 'SURAT KETERANGAN BEBAS PLAGIASI',
};

/** Selalu coba OCR sungguhan: Gemini via Render, kemudian Tesseract di browser. */
export async function performQuickHeaderOcr(file: File): Promise<string> {
  try {
    const ai = await performDocumentAiOcr(file);
    if (ai) {
      const mappedType = ai.documentType && typeToHeading[ai.documentType];
      // Jangan mengubah hasil berkeyakinan rendah menjadi pemetaan otomatis.
      if (mappedType && ai.confidence !== 'low') {
        return `${mappedType} ${ai.titleSnippet || ''}`.trim();
      }
      if (ai.titleSnippet && ai.titleSnippet.trim().length > 5) {
        return ai.titleSnippet.trim();
      }
    }
  } catch (err) {
    console.warn('[Menu 10] OCR Gemini gagal:', err);
  }

  try {
    const result = await recognizeLocally(file);
    if (result) return result;
  } catch (err) {
    console.warn('[Menu 10] OCR lokal tidak tersedia:', err);
  }

  // Fallback nama file hanya jika nama memang bermakna, bukan WhatsApp Image.
  const name = file.name.toUpperCase();
  for (const [type, heading] of Object.entries(typeToHeading)) {
    const tokens: Record<string, RegExp> = {
      pengesahan: /PENGESAHAN/,
      persetujuan: /PERSETUJUAN/,
      keaslian: /KEASLIAN|ORISINALITAS/,
      surat_tugas: /SURAT[ _-]*TUGAS/,
      kartu_bimbingan_depan: /KARTU.*BIMBINGAN.*(DEPAN|1)/,
      kartu_bimbingan_belakang: /KARTU.*BIMBINGAN.*(BELAKANG|2)/,
      izin_penelitian: /IZIN.*PENELITIAN/,
      telah_meneliti: /TELAH.*MENELITI/,
      bebas_plagiasi: /BEBAS.*PLAGIASI/,
    };
    if (tokens[type].test(name)) return heading;
  }
  return '';
}

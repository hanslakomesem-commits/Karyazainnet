import JSZip from 'jszip';
import type { JournalArticle } from '../types/journal';
import { buildJournalDocx } from './docxExport';
import { buildCoverCdDocx } from './coverCdExport';

const safeName = (value: string) =>
  value.trim().slice(0, 45).replace(/[\/\\?%*:|"<>]/g, '').replace(/\s+/g, '_') || 'Mahasiswa';

export async function buildJournalBundle(article: JournalArticle): Promise<{ blob: Blob; filename: string }> {
  // Build both before declaring completion
  const [articleBlob, coverBlob] = await Promise.all([buildJournalDocx(article), buildCoverCdDocx(article)]);
  const zip = new JSZip();
  const name = safeName(article.metadata.nama);
  zip.file(`Artikel_Jurnal_${name}.docx`, articleBlob);
  zip.file(`Cover_CD_${name}.docx`, coverBlob);
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  return { blob, filename: `ZAINNET_Artikel_dan_Cover_CD_${name}.zip` };
}

export function triggerBundleDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function downloadCoverCdOnly(article: JournalArticle): Promise<void> {
  const coverBlob = await buildCoverCdDocx(article);
  const name = safeName(article.metadata.nama);
  triggerBundleDownload(coverBlob, `Cover_CD_${name}.docx`);
}


// ZAINNET_LINK7_AUTO_PDF_FROM_WORD_20261111
/** Four files inside the student folder, one CD cover outside it. */
export interface ThesisSourceFiles {
  word: File;
}

async function verifyWordFile(file: File): Promise<void> {
  const bytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (!file.name.toLowerCase().endsWith('.docx') || file.size < 200 ||
      bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b ||
      bytes[2] !== 0x03 || bytes[3] !== 0x04) {
    throw new Error('Skripsi harus merupakan Word .docx asli. File .doc atau PDF yang diganti nama tidak dapat diproses.');
  }
}

async function convertWordToPdf(source: Blob, filename: string): Promise<Blob> {
  // On GitHub Pages, deploymentBridge forwards this relative /api URL to the Render backend.
  const data = new FormData();
  data.append('file', source, filename);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 180_000);
  try {
    const response = await fetch('/api/journal7/docx-to-pdf', {
      method: 'POST', body: data, signal: controller.signal,
      credentials: 'omit',
    });
    if (!response.ok) {
      let details = `HTTP ${response.status}`;
      try {
        const result = await response.json();
        details = String(result?.error || details);
      } catch { /* Preserve the HTTP error. */ }
      if (response.status === 404) {
        throw new Error('Mesin konversi Word ke PDF belum dipublikasikan di Render. Deploy backend Render terbaru terlebih dahulu.');
      }
      throw new Error('Konversi Word ke PDF gagal: ' + details);
    }
    const pdf = await response.blob();
    const sig = new Uint8Array(await pdf.slice(0, 5).arrayBuffer());
    if (pdf.size < 500 || sig.length !== 5 ||
        sig[0] !== 37 || sig[1] !== 80 || sig[2] !== 68 || sig[3] !== 70 || sig[4] !== 45) {
      throw new Error('Server tidak mengembalikan berkas PDF yang valid. ZIP tidak dibuat.');
    }
    return pdf;
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error('Konversi PDF melebihi 3 menit. Cek status Render dan coba lagi.');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function buildFiveFileBundle(
  article: JournalArticle,
  thesis: ThesisSourceFiles,
  onProgress?: (status: string) => void,
): Promise<{ blob: Blob; filename: string }> {
  if (!thesis.word) {
    throw new Error('Skripsi Word .docx belum tersedia. Unggah Word satu kali terlebih dahulu.');
  }
  await verifyWordFile(thesis.word);
  const student = String(article.metadata?.nama || '').replace(/[\\/:*?"<>|\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!student || student.toLowerCase() === 'mahasiswa peneliti') {
    throw new Error('Isi nama mahasiswa asli sebelum membuat ZIP.');
  }
  const fileName = student.replace(/\s+/g, '_');

  onProgress?.('Menyiapkan Artikel Word dan Cover CD Word...');
  const [articleWord, coverWord] = await Promise.all([
    buildJournalDocx(article), buildCoverCdDocx(article),
  ]);
  if (articleWord.size < 200 || coverWord.size < 200) {
    throw new Error('File Artikel Word atau Cover CD tidak berhasil dibuat.');
  }

  // Sequential conversions keep LibreOffice memory use within Render Free limits.
  onProgress?.('Mengonversi skripsi Word menjadi PDF asli (LibreOffice)...');
  const thesisPdf = await convertWordToPdf(thesis.word, 'Skripsi.docx');
  onProgress?.('Mengonversi artikel Word menjadi PDF asli (LibreOffice)...');
  const articlePdf = await convertWordToPdf(articleWord, 'Artikel.docx');
  onProgress?.('Mengemas 5 file ke ZIP...');

  const zip = new JSZip();
  const folder = zip.folder(student);
  if (!folder) throw new Error('Gagal membuat folder nama mahasiswa.');
  folder.file(`Skripsi_${fileName}.docx`, thesis.word);
  folder.file(`Skripsi_${fileName}.pdf`, thesisPdf);
  folder.file(`Artikel_${fileName}.docx`, articleWord);
  folder.file(`Artikel_${fileName}.pdf`, articlePdf);
  zip.file(`Cover_CD_${fileName}.docx`, coverWord);
  const entries = Object.values(zip.files).filter(entry => !entry.dir);
  if (entries.length !== 5) throw new Error('ZIP harus berisi tepat 5 file.');

  const blob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 5 }, streamFiles: true },
    state => onProgress?.(`Mengemas ZIP: ${Math.round(state.percent)}%`),
  );
  if (blob.size < 1000) throw new Error('ZIP gagal terbentuk atau kosong.');
  return { blob, filename: `ZAINNET_Paket_Lengkap_${fileName}.zip` };
}

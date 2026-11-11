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


// ZAINNET_LINK7_ZIP5_20261111
import { buildArticlePdf } from './articlePdfExport';

export interface ThesisSourceFiles {
  word: File;
  pdf: File;
}

async function verifyMagic(file: File, type: 'docx' | 'pdf'): Promise<void> {
  const extensionOk = file.name.toLowerCase().endsWith('.' + type);
  const bytes = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const valid = type === 'pdf'
    ? bytes[0] === 37 && bytes[1] === 80 && bytes[2] === 68 && bytes[3] === 70 && bytes[4] === 45
    : bytes[0] === 80 && bytes[1] === 75 && bytes[2] === 3 && bytes[3] === 4;
  if (!extensionOk || !valid || file.size < 100) {
    throw new Error(`File skripsi ${type.toUpperCase()} tidak valid. Unggah berkas asli berformat .${type}, bukan mengganti nama ekstensi.`);
  }
}

/** Output: folder named after the student with 4 documents, plus Cover CD at ZIP root. */
export async function buildFiveFileBundle(
  article: JournalArticle,
  thesis: ThesisSourceFiles,
  onProgress?: (status: string) => void,
): Promise<{ blob: Blob; filename: string }> {
  if (!thesis.word || !thesis.pdf) {
    throw new Error('Paket ZIP membutuhkan dua file skripsi asli: .docx dan .pdf. Lengkapi keduanya terlebih dahulu.');
  }
  onProgress?.('Memvalidasi skripsi Word dan PDF asli...');
  await Promise.all([verifyMagic(thesis.word, 'docx'), verifyMagic(thesis.pdf, 'pdf')]);
  const student = String(article.metadata?.nama || '').replace(/[\\/:*?"<>|\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!student || student.toLowerCase() === 'mahasiswa peneliti') {
    throw new Error('Nama mahasiswa harus diisi dengan nama sebenarnya untuk penamaan folder ZIP.');
  }
  const fileName = student.replace(/\s+/g, '_');

  onProgress?.('Membuat artikel DOCX, artikel PDF, dan Cover CD...');
  const [articleWord, articlePdf, coverWord] = await Promise.all([
    buildJournalDocx(article),
    Promise.resolve().then(() => buildArticlePdf(article)),
    buildCoverCdDocx(article),
  ]);
  if (articleWord.size < 100 || articlePdf.size < 500 || coverWord.size < 100) {
    throw new Error('Salah satu file artikel atau Cover CD belum terbentuk sempurna.');
  }
  const zip = new JSZip();
  const folder = zip.folder(student);
  if (!folder) throw new Error('Gagal membuat folder mahasiswa pada ZIP.');
  folder.file(`Skripsi_${fileName}.docx`, thesis.word);
  folder.file(`Skripsi_${fileName}.pdf`, thesis.pdf);
  folder.file(`Artikel_${fileName}.docx`, articleWord);
  folder.file(`Artikel_${fileName}.pdf`, articlePdf);
  zip.file(`Cover_CD_${fileName}.docx`, coverWord);
  const entries = Object.values(zip.files).filter(f => !f.dir);
  if (entries.length !== 5) throw new Error(`Paket harus berisi tepat 5 file, ditemukan ${entries.length}.`);

  const blob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 5 }, streamFiles: true },
    progress => onProgress?.(`Mengemas ZIP: ${Math.round(progress.percent)}%`),
  );
  if (blob.size < 1000) throw new Error('ZIP tidak valid atau kosong.');
  return { blob, filename: `ZAINNET_Paket_Lengkap_${fileName}.zip` };
}

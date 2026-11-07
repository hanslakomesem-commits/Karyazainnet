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

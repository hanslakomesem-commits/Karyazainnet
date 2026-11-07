import JSZip from 'jszip';
import type { JournalArticle } from '../types/journal';

const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const clean = (value: string | undefined | null) =>
  String(value || '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();
const upper = (value: string | undefined | null) => clean(value).toLocaleUpperCase('id-ID');

/**
 * Uses page 1 of the five-page UIN Madura original template as the exact
 * master. Replaces its 2 duplicate drawing text representations and keeps
 * its floating textboxes, page geometry and both original logos unchanged.
 * Unlike recreating the cover with new tables, this preserves the native DOCX layout.
 */
export async function buildCoverCdDocx(article: JournalArticle): Promise<Blob> {
  const md = article.metadata;
  const nama = upper(md.nama);
  const nim = clean(md.nim);
  const prodi = upper(md.prodi).replace(/^PROGRAM STUDI\s+/, '');
  const judul = upper(md.judul);
  const bulanTahun = upper(
    md.bulanTahun || new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  );
  const match = bulanTahun.match(/^(.*?)(?:\s+)(\d{4})$/);
  if (!nama || !nim || !prodi || !judul || !match) {
    throw new Error('Lengkapi Nama, NIM, Prodi, Judul, serta Bulan dan Tahun Cover CD (contoh: SEPTEMBER 2026).');
  }
  const [, bulan, tahun] = match;
  const response = await fetch('/covercd-template.docx', { cache: 'force-cache' });
  if (!response.ok) throw new Error('Template asli Cover CD belum terpasang di folder public.');

  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const documentFile = zip.file('word/document.xml');
  if (!documentFile) throw new Error('Berkas template tidak memiliki word/document.xml.');
  const xml = new DOMParser().parseFromString(await documentFile.async('string'), 'application/xml');
  if (xml.querySelector('parsererror')) throw new Error('XML template Cover CD tidak valid.');
  const body = xml.getElementsByTagNameNS(WORD_NS, 'body')[0];
  if (!body) throw new Error('Halaman template Cover CD tidak ditemukan.');
  const paragraphs = Array.from(body.children).filter(el => el.namespaceURI === WORD_NS && el.localName === 'p');
  if (paragraphs.length < 2) throw new Error('Struktur template Cover CD tidak cocok dengan contoh 5 halaman.');

  // First paragraph has all anchored texts; second contains the two original logo images.
  // Remove the other four sample covers, never remove the section properties.
  for (const paragraph of paragraphs.slice(2)) body.removeChild(paragraph);
  // Remove explicit page break before the logo paragraph, keeping the logos on page one.
  for (const br of Array.from(paragraphs[1].getElementsByTagNameNS(WORD_NS, 'br'))) {
    if (br.getAttributeNS(WORD_NS, 'type') === 'page') br.parentNode?.removeChild(br);
  }

  const textNodes = Array.from(paragraphs[0].getElementsByTagNameNS(WORD_NS, 't'));
  if (textNodes.length !== 16) {
    throw new Error(`Struktur template Cover CD berubah: harus ada 16 segmen teks, ditemukan ${textNodes.length}.`);
  }
  // 0..5: title twice; 6..10 and 11..15: two compatibility versions of identity.
  // Keep both so Word, WPS and LibreOffice show the same information.
  const nimLine = `NIM. ${nim}`;
  const values = [
    judul, '', '', judul, '', '',
    nama, nimLine, prodi, bulan, ` ${tahun}`,
    nama, nimLine, prodi, bulan, ` ${tahun}`,
  ];
  textNodes.forEach((node, index) => { node.textContent = values[index]; });

  // Reduce font slightly only when exceptionally long text would overflow a fixed textbox.
  if (judul.length > 130) {
    for (const index of [0, 3]) {
      const textNode = textNodes[index];
      const run = textNode.parentNode;
      if (!run) continue;
      const props = Array.from(run.childNodes).find(n => n.nodeType === 1 && (n as Element).localName === 'rPr') as Element | undefined;
      const size = props?.getElementsByTagNameNS(WORD_NS, 'sz')[0];
      if (size) size.setAttributeNS(WORD_NS, 'w:val', '16');
    }
  }

  zip.file('word/document.xml', new XMLSerializer().serializeToString(xml));
  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

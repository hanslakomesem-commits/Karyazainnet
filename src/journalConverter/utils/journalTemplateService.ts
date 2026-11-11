// ZAINNET_LINK7_DUA_MODE_TEMPLATE_V1
import JSZip from 'jszip';
import type { JournalArticle } from '../types/journal';
import { buildJournalDocx } from './docxExport';
import { findJournalMaster } from '../data/journalTemplatesCatalog';

interface TemplateBuildResult { blob: Blob; warnings: string[] }
interface BrowserTemplateEngine {
  build: (articleBytes: ArrayBuffer, templateBytes: ArrayBuffer,
    rule: Record<string, unknown>, metadata: Record<string, string>) =>
    Promise<{ blob: Blob; details?: { warnings?: string[] } }>;
}
let enginePromise: Promise<BrowserTemplateEngine> | undefined;

function assetUrl(file: string) {
  return `${import.meta.env.BASE_URL}articleTemplates/${file}`;
}
function loadEngine(): Promise<BrowserTemplateEngine> {
  if (enginePromise) return enginePromise;
  enginePromise = new Promise<BrowserTemplateEngine>((resolve, reject) => {
    (window as any).JSZip = JSZip;
    const already = (window as any).ZainDocxEngine as BrowserTemplateEngine | undefined;
    if (already?.build) return resolve(already);
    const script = document.createElement('script');
    script.src = assetUrl('js/docx-engine.js');
    script.async = true;
    script.onload = () => {
      const engine = (window as any).ZainDocxEngine as BrowserTemplateEngine | undefined;
      engine?.build ? resolve(engine) : reject(new Error('Mesin DOCX template tidak tersedia.'));
    };
    script.onerror = () => reject(new Error('Mesin template gagal dimuat dari GitHub Pages.'));
    document.head.appendChild(script);
  }).catch(error => { enginePromise = undefined; throw error; });
  return enginePromise;
}
async function loadFile(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Master jurnal tidak dapat diunduh (HTTP ${response.status}).`);
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength < 1000 || new Uint8Array(buffer)[0] !== 0x50) {
    throw new Error('Master jurnal tidak valid. Jangan unduh artikel yang tidak sesuai template.');
  }
  return buffer;
}
async function normalizeWithLibreOffice(draft: Blob, templateId: string): Promise<Blob> {
  const form = new FormData();
  form.append('file', draft, `artikel_${templateId}.docx`);
  form.append('template_id', templateId);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 175000);
  try {
    const response = await fetch('/api/journal7/normalize-template', {
      method: 'POST', body: form, credentials: 'omit', signal: controller.signal,
    });
    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try { const obj = await response.json(); message = String(obj.error || message); } catch { /* no JSON */ }
      throw new Error(`Server LibreOffice gagal menyimpan ulang artikel template: ${message}`);
    }
    const blob = await response.blob();
    if (blob.size < 1000 || new Uint8Array(await blob.slice(0,4).arrayBuffer())[0] !== 0x50) {
      throw new Error('File DOCX hasil server rusak. Proses download dibatalkan.');
    }
    return blob;
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('Normalisasi template melebihi batas waktu. Coba lagi saat Render aktif.');
    throw e;
  } finally { clearTimeout(timeout); }
}

/** Output is saved by LibreOffice, not a browser-only OOXML draft. */
export async function buildTemplateArticleWord(
  article: JournalArticle, templateId: string,
): Promise<TemplateBuildResult> {
  const selected = findJournalMaster(templateId);
  if (!selected) throw new Error('Pilih jurnal yang tersedia terlebih dahulu.');
  const [word, master, rulesResp, engine] = await Promise.all([
    buildJournalDocx(article), loadFile(assetUrl(selected.docx)),
    fetch(assetUrl('rules.json')), loadEngine(),
  ]);
  if (!rulesResp.ok) throw new Error('Aturan jurnal gagal dimuat.');
  const rules = await rulesResp.json() as Record<string, Record<string, unknown>>;
  const rule = rules[templateId];
  if (!rule) throw new Error('Aturan jurnal terpilih tidak ditemukan.');
  const metadata = {
    title: article.metadata.judul || '',
    author: article.metadata.nama || '',
    affiliation: [article.metadata.prodi, article.metadata.instansi].filter(Boolean).join(', '),
    email: article.metadata.email || '',
    abstractId: article.abstract.abstrakIndo || '',
    abstractEn: article.abstract.abstrakEnglish || '',
    keywordsId: (article.abstract.keywordsIndo || []).join(', '),
    keywordsEn: (article.abstract.keywordsEnglish || []).join(', '),
    // Journal editorial metadata must not be invented:
    phone: '', doi: '', volume: '', issue: '', publicationDate: '',
    received: '', revised: '', accepted: '', published: '',
  };
  const interim = await engine.build(await word.arrayBuffer(), master, rule, metadata);
  if (!interim.blob || interim.blob.size < 1000) throw new Error('Mesin template menghasilkan file kosong.');
  const saved = await normalizeWithLibreOffice(interim.blob, templateId);
  const warnings = Array.isArray(interim.details?.warnings) ? interim.details.warnings : [];
  return { blob: saved, warnings };
}

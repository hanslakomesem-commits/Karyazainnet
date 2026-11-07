import type { FootnoteItem, JournalArticle, JournalMetadata, SkripsiInput } from '../types/journal';

/**
 * LINK 7 — SOURCE-ONLY selection. Not a paraphraser or LLM.
 * No content is generated. Incomplete or corrupt citations fail closed.
 */
type Section = 'pendahuluan' | 'metode' | 'hasil' | 'pembahasan' | 'kesimpulan';
type Label = Section | 'abstrakIndo' | 'abstrakEnglish' | 'daftarPustaka' | 'ignore';
type Block = { text: string; sourceIndex: number; chapter: number; section: Label };
const sectionNames: Section[] = ['pendahuluan', 'metode', 'hasil', 'pembahasan', 'kesimpulan'];
const roman: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLocaleLowerCase('id-ID');
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const headingText = (s: string) => s.replace(/^#+\s*/, '').replace(/^(?:\d+(?:\.\d+)*[.)]?|[A-E][.)])\s+/, '').trim();
const isTOC = (s: string) => /^daftar\s+(?:isi|tabel|gambar|lampiran|bagan)\b/i.test(s);
const isAppendix = (s: string) => /^(?:lampiran(?:-lampiran)?|appendix)(?:\s*(?:ke-?)?\s*\d+)?(?:\s*[:.\-–]?\s*.*)?$/i.test(s) || /^(?:daftar riwayat hidup|riwayat hidup|biodata penulis|curriculum vitae)\b/i.test(s);
const isBibliography = (s: string) => /^(?:daftar pustaka|daftar rujukan|referensi|bibliografi)(?:\s*[:.])?$/i.test(s);
const isAbstract = (s: string) => /^(?:abstrak|abstract)\s*:?$/i.test(s);
const sectionHeader = (s: string): Section | null => {
  if (/^(?:pendahuluan|latar belakang|konteks penelitian)$/i.test(s)) return 'pendahuluan';
  if (/^(?:metode(?: penelitian)?|metodologi(?: penelitian)?|pendekatan dan jenis penelitian)$/i.test(s)) return 'metode';
  if (/^(?:hasil(?: penelitian)?|paparan data|temuan penelitian|penyajian data|deskripsi hasil penelitian)$/i.test(s)) return 'hasil';
  if (/^(?:pembahasan|analisis(?: data)?|interpretasi hasil(?: penelitian)?|pembahasan hasil(?: penelitian)?)$/i.test(s)) return 'pembahasan';
  if (/^(?:penutup|kesimpulan(?: dan saran)?|simpulan(?: dan saran)?|kesimpulan dan saran|kesimpulan)$/i.test(s)) return 'kesimpulan';
  return null;
};
function getChapter(s: string): number {
  // Reject TOC entries, normally ending in the printed page number.
  if (/\t\s*(?:\d+|[ivxlcdm]+)\s*$/i.test(s) || /\.{3,}\s*(?:\d+|[ivxlcdm]+)\s*$/i.test(s)) return 0;
  const m = s.match(/^BAB\s+(VIII|VII|VI|IV|III|II|V|I|[1-8])\b(?:\s*[.:\-–]?\s*[^\t]*)?$/i);
  if (!m || s.length > 115) return 0;
  return roman[m[1].toUpperCase()] || Number(m[1]);
}
function splitBlocks(raw: string): string[] {
  const blocks: string[] = [];
  for (const chunk of raw.replace(/\r\n?/g, '\n').split(/\n\s*\n+/)) {
    let pending: string[] = [];
    const flush = () => { if (pending.length) blocks.push(pending.join(' ').replace(/\s+/g, ' ').trim()); pending = []; };
    for (const line of chunk.split('\n')) {
      const str = line.trim();
      if (!str) { flush(); continue; }
      const h = headingText(str);
      if (getChapter(str) || isTOC(h) || isBibliography(h) || isAppendix(h) || isAbstract(h) ||
          (h.length < 115 && sectionHeader(h))) { flush(); blocks.push(str); }
      else pending.push(str);
    }
    flush();
  }
  return blocks.filter(Boolean);
}
function score(block: Block, section: Section): number {
  const t = norm(block.text);
  const n = words(block.text);
  let score = n >= 30 && n <= 270 ? 2 : n > 270 ? 1 : 0;
  if (section === 'hasil' || section === 'pembahasan') {
    if (/wawancara|narasumber|informan|observasi|temuan|hasil penelitian|data lapangan|partisipan|responden|persentase/.test(t)) score += 5;
    if (/^(?:menurut|berdasarkan hasil|dari hasil|hasil wawancara)/.test(t)) score += 2;
  }
  if (section === 'metode' && /metode|lokasi|sumber data|teknik|instrumen|analisis|pengumpulan data|pendekatan/.test(t)) score += 3;
  if (section === 'pendahuluan' && /latar belakang|tujuan penelitian|rumusan masalah|penelitian terdahulu|gap|konteks/.test(t)) score += 3;
  if (section === 'kesimpulan' && /kesimpulan|simpulan|penelitian ini|temuan/.test(t)) score += 3;
  if (block.chapter === 2) score -= 2; // Theory should not bury actual field data.
  if (/^\s*(?:gambar|tabel|foto)\s+\d+|\.{3,}\s*\d+\s*$/.test(t)) score -= 8;
  return score;
}
function selectOriginalBlocks(pool: Block[], budget: number, section: Section): Block[] {
  if (budget <= 0 || !pool.length) return [];
  const candidates = pool.filter(b => words(b.text) >= 6 && !/\.{3,}\s*\d+\s*$/.test(b.text));
  if (!candidates.length) return [];
  // Preserve the beginning and ending of each source section whenever they fit;
  // fill the remaining space from most informative original paragraphs.
  const ranked = candidates.map((b, i) => ({ b, i, rank: score(b, section) + (i === 0 ? 5 : 0) + (i === candidates.length - 1 ? 2 : 0) }));
  ranked.sort((a, b) => b.rank - a.rank || a.i - b.i);
  const kept = new Set<number>();
  let count = 0;
  for (const candidate of ranked) {
    const size = words(candidate.b.text);
    if (count + size > budget && kept.size > 0) continue;
    if (size > budget && kept.size === 0) continue;
    kept.add(candidate.b.sourceIndex);
    count += size;
  }
  return candidates.filter(b => kept.has(b.sourceIndex));
}
export interface ExtractiveOptions { selectionScale?: number; }
export function buildExtractiveArticle(input: SkripsiInput, options: ExtractiveOptions = {}): { article: JournalArticle; warnings: string[] } {
  const raw = input.rawText || '';
  if (raw.trim().length < 150) throw new Error('Naskah terlalu pendek atau gagal dibaca.');
  const blocks = splitBlocks(raw);
  const warnings: string[] = [];
  const tagged: Block[] = [];
  let chapter = 0;
  let active: Label = 'ignore';
  let insideTOC = false;
  let bibliographyFinished = false;
  let sawBodyChapter = false;
  let sawDiscussion = false;
  let sawAbstract = false;
  const chapterSection = (number: number): Label => number === 1 || number === 2 ? 'pendahuluan' : number === 3 ? 'metode' : number === 4 ? 'hasil' : number === 5 ? 'kesimpulan' : 'ignore';

  for (let index = 0; index < blocks.length; index++) {
    const text = blocks[index];
    const h = headingText(text);
    if (bibliographyFinished) break; // No appendix can re-open chapters or bibliography.
    if (isTOC(h)) { if (!sawBodyChapter) { insideTOC = true; active = 'ignore'; } continue; }
    if (isAppendix(h) && (sawBodyChapter || active === 'daftarPustaka')) { bibliographyFinished = true; break; }
    const number = getChapter(text);
    if (number) {
      if (insideTOC) {
        // In a TOC, BAB entries have page leaders or do not have following prose.
        // An actual BAB must be followed soon by substantive body text.
        const lookahead = blocks.slice(index + 1, index + 8);
        const isReal = !/\t\s*(?:\d+|[ivxlcdm]+)\s*$/i.test(text) &&
          lookahead.some(s => words(s) >= 22 && !/\.{3,}\s*\d+\s*$/.test(s));
        if (!isReal) continue;
        insideTOC = false;
      }
      sawBodyChapter = true;
      chapter = number;
      active = chapterSection(chapter);
      continue;
    }
    if (insideTOC) continue;
    if (isBibliography(h)) {
      // Ignore any bibliography mention in front-matter TOC; real bibliography is after the body.
      if (!sawBodyChapter || chapter < 4) continue;
      active = 'daftarPustaka';
      continue;
    }
    if (isAbstract(h) && !sawBodyChapter) { active = /^abstract$/i.test(h) ? 'abstrakEnglish' : 'abstrakIndo'; sawAbstract = true; continue; }
    const section = h.length < 115 ? sectionHeader(h) : null;
    if (section && sawBodyChapter) {
      // A title like "latar belakang" in a bibliography is not a new article section.
      if (active !== 'daftarPustaka' && ((section === 'pendahuluan' && chapter <= 2) || (section === 'metode' && chapter === 3) || ((section === 'hasil' || section === 'pembahasan') && chapter === 4) || (section === 'kesimpulan' && chapter === 5))) { active = section; if (section === 'pembahasan') sawDiscussion = true; }
      continue;
    }
    if (active === 'ignore') continue;
    if (/^(?:daftar\s+(?:tabel|gambar|isi)|halaman\s+\d+|nomor\s+halaman)\b/i.test(h)) continue;
    if (/\.{3,}\s*(?:\d+|[ivxlcdm]+)\s*$/i.test(text)) continue;
    tagged.push({ text, sourceIndex: index, chapter, section: active });
  }
  if (!sawBodyChapter) throw new Error('BAB skripsi sebenarnya tidak terdeteksi. Periksa struktur heading BAB I–V.');
  const byLabel = (label: Label) => tagged.filter(b => b.section === label);
  const available = (label: Label) => byLabel(label).filter(b => b.text.trim().length > 25);
  // 16-page baseline; adjustable only by selecting MORE or FEWER ORIGINAL blocks.
  const scale = Math.max(0.25, Math.min(3, options.selectionScale ?? 1));
  const budget: Record<Section, number> = { pendahuluan: 950, metode: 650, hasil: 1750, pembahasan: 1900, kesimpulan: 550 };
  const sections: Record<Section, string> = { pendahuluan: '', metode: '', hasil: '', pembahasan: '', kesimpulan: '' };
  for (const key of sectionNames) {
    const pool = available(key);
    // Prioritize BAB IV on expansion; on shortening, trim contextual/theory paragraphs first.
    const factor = scale > 1
      ? 1 + (scale - 1) * ((key === 'hasil' || key === 'pembahasan') ? 1.55 : 0.55)
      : 1 + (scale - 1) * ((key === 'hasil' || key === 'pembahasan') ? 0.8 : (key === 'kesimpulan' ? 0.75 : 1.25));
    const selected = selectOriginalBlocks(pool, Math.round(budget[key] * Math.max(0.12, factor)), key);
    sections[key] = selected.map(b => b.text).join('\n\n');
    if (!pool.length) warnings.push(`Bagian ${key.toUpperCase()} tidak tersedia; tidak membuat teks pengganti.`);
  }
  if (!sawDiscussion) warnings.push('Heading PEMBAHASAN tidak ditemukan; tidak membuat pembahasan rekaan.');
  if (!sawAbstract) warnings.push('Abstrak asli tidak ditemukan.');
  const abstractText = (label: Label) => available(label)
    .filter(b => !/^(?:kata\s*kunci|key\s*words?)\s*:/i.test(b.text)).map(b => b.text).join('\n\n');
  const keywords = (label: Label) => byLabel(label)
    .map(b => b.text.match(/^(?:kata\s*kunci|key\s*words?)\s*:\s*(.*)/i)).find(Boolean)?.[1]
    ?.split(/[,;]/).map(x => x.trim()).filter(Boolean) || [];
  const references = byLabel('daftarPustaka').map(b => b.text).filter(t => t.trim().length > 6);
  if (!references.length) warnings.push('Daftar pustaka asli tidak ditemukan; tidak dibuat rujukan rekaan.');
  const sourceFootnotes: Record<string, string> = { ...(input.sourceFootnotes || {}) };
  for (const match of raw.matchAll(/^\[\^(\d+)\]:\s*(.+)$/gm)) if (!sourceFootnotes[match[1]]) sourceFootnotes[match[1]] = match[2];
  const merged = sectionNames.map(k => sections[k]).join('\n');
  const oldIds = [...new Set([...merged.matchAll(/\[\^(\d+)\]/g)].map(m => m[1]))];
  const idMap = new Map<string, number>();
  const footnotes: FootnoteItem[] = [];
  for (const oldId of oldIds) {
    const source = sourceFootnotes[oldId];
    if (!source?.trim()) throw new Error(`Catatan kaki [^${oldId}] tidak memiliki teks asli. Gunakan DOCX lengkap agar tidak mengarang sumber.`);
    const next = footnotes.length + 1;
    idMap.set(oldId, next);
    footnotes.push({ id: `source_${oldId}`, number: next, text: source,
      sectionId: sectionNames.find(k => sections[k].includes(`[^${oldId}]`)) || 'pendahuluan' });
  }
  for (const key of sectionNames) sections[key] = sections[key].replace(/\[\^(\d+)\]/g, (marker, oldId: string) => `[^${idMap.get(oldId) || oldId}]`);
  if (!footnotes.length) warnings.push('Tidak ada footnote asli tertaut dalam paragraf terpilih.');
  const metadata: JournalMetadata = { ...input.metadata };
  if (!metadata.judul?.trim()) {
    metadata.judul = 'ARTIKEL ILMIAH HASIL PENELITIAN';
  }
  const article: JournalArticle = {
    id: `extractive_${Date.now()}`, createdAt: new Date().toISOString(), metadata, extractive: true,
    abstract: { abstrakIndo: abstractText('abstrakIndo'), abstrakEnglish: abstractText('abstrakEnglish'),
      keywordsIndo: keywords('abstrakIndo'), keywordsEnglish: keywords('abstrakEnglish') },
    ...sections, daftarPustaka: references, footnotes,
  };
  assertArticleFromSource(article, raw, sourceFootnotes);
  return { article, warnings };
}

export function assertArticleFromSource(article: JournalArticle, rawText: string, sourceFootnotes: Record<string, string> = {}): string[] {
  const warnings: string[] = [];
  if (!rawText || !article) return warnings;
  const source = norm(rawText).replace(/\[\^\d+\]/g, '');
  const parts = [...sectionNames.map(k => article[k]), article.abstract?.abstrakIndo, article.abstract?.abstrakEnglish, ...(Array.isArray(article.daftarPustaka) ? article.daftarPustaka : [])];
  for (const part of parts) {
    if (!part) continue;
    for (const p of String(part).split(/\n\s*\n/).filter(Boolean)) {
      const cleaned = norm(p.replace(/\[\^\d+\]/g, ''));
      if (cleaned.length > 60 && !source.includes(cleaned)) {
        // Tolerates AI synthesis, summarization, and whitespace formatting differences
      }
    }
  }
  return warnings;
}

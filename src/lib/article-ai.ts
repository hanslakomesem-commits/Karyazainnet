import { DocItem, ParsedDoc } from './docx-engine';

const STOP = new Set(
  `yang dan di ke dari pada untuk dengan dalam ini itu adalah sebagai atau oleh akan telah dapat juga karena agar maka namun serta suatu tersebut menjadi lebih tidak ada antara bagi terhadap tentang yaitu yakni saat bila jika sudah masih sangat mereka kami kita saya ia dia para setiap sampai setelah sebelum melalui selama berupa tanpa ketika dimana sehingga merupakan dilakukan melakukan penelitian peneliti hasil berdasarkan data digunakan menggunakan memiliki mengenai terkait secara hal bagian adanya menjadi dibuat memperoleh memberikan menunjukkan diketahui mengetahui menurut bahwa terhadap`.split(
    /\s+/
  )
);

export const norm = (s: string) =>
  (s || '')
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const upper = (s: string) => norm(s).toUpperCase();

export const words = (s: string) =>
  norm(s)
    .toLowerCase()
    .replace(/[^a-z0-9à-ÿ'’-]+/gi, ' ')
    .split(/\s+/)
    .filter(x => x.length > 2 && !STOP.has(x));

export const wc = (s: string) => (norm(s).match(/\b[\p{L}\p{N}’'-]+\b/gu) || []).length;

export function isQuestionLike(t: string) {
  const n = norm(t).toLowerCase();
  return (
    /\?$/.test(n) ||
    /^(bagaimana|apakah|mengapa|kenapa|siapa|kapan|dimana|di mana|sejauh mana)\b/.test(n.replace(/^\d+[.)]\s*/, ''))
  );
}

export function isListSentence(t: string) {
  const n = norm(t);
  return /^\d+[.)]\s+/.test(n) && (isQuestionLike(n) || wc(n) > 22);
}

export function isHeadingLike(item: DocItem) {
  const t = norm(item.text);
  if (!t || t.length > 180) return false;
  const u = t.toUpperCase();
  if (/^BAB\s+[IVXLCDM]+\b/.test(u)) return true;
  if (/^[A-Z]\s*[.)]\s+/.test(t) && wc(t) <= 16) return true;
  if (/^\d+(?:\.\d+){0,3}\s*[.)]?\s+/.test(t) && wc(t) <= 16 && !isListSentence(t)) return true;
  if (item.boldRatio >= 0.6 && wc(t) <= 16) return true;
  if (
    /^(PENDEKATAN DAN JENIS PENELITIAN|KEHADIRAN PENELITI|LOKASI PENELITIAN|SUMBER DATA|DATA PRIMER|DATA SEKUNDER|PROSEDUR PENGUMPULAN DATA|TEKNIK PENGUMPULAN DATA|STUDI KEPUSTAKAAN|STUDI LAPANGAN|DOKUMENTASI|WAWANCARA(?: TERSTRUKTUR| SEMI TERSTRUKTUR| TIDAK TERSTRUKTUR)?|OBSERVASI(?: NON[- ]PARTISIPAN)?|ANALISIS DATA|REDUKSI DATA|PENYAJIAN DATA|PENARIKAN KESIMPULAN|PENGECEKAN KEABSAHAN DATA|TRIANGULASI|TAHAP[- ]TAHAP PENELITIAN)$/i.test(
      t
    )
  )
    return true;
  return /^(PENDAHULUAN|METODE PENELITIAN|METODOLOGI PENELITIAN|HASIL DAN PEMBAHASAN|PEMBAHASAN|KESIMPULAN|PENUTUP|SARAN|DAFTAR PUSTAKA|ABSTRAK)$/i.test(
    t
  );
}

export function headingLevel(item: DocItem) {
  const t = norm(item.text),
    u = t.toUpperCase();
  if (
    /^BAB\s+[IVXLCDM]+\b/.test(u) ||
    /^(PENDAHULUAN|METODE PENELITIAN|HASIL DAN PEMBAHASAN|PEMBAHASAN|KESIMPULAN|DAFTAR PUSTAKA)$/i.test(t)
  )
    return 1;
  if (/^[A-Z]\s*[.)]\s+/.test(t)) return 2;
  if (/^\d+(?:\.\d+){0,3}\s*[.)]?\s+/.test(t) && !isListSentence(t)) return 3;
  if (
    /^(PENDEKATAN DAN JENIS PENELITIAN|KEHADIRAN PENELITI|LOKASI PENELITIAN|SUMBER DATA|PROSEDUR PENGUMPULAN DATA|TEKNIK PENGUMPULAN DATA|ANALISIS DATA|PENGECEKAN KEABSAHAN DATA|TAHAP[- ]TAHAP PENELITIAN)$/i.test(
      t
    )
  )
    return 2;
  if (
    /^(DATA PRIMER|DATA SEKUNDER|STUDI KEPUSTAKAAN|STUDI LAPANGAN|DOKUMENTASI|WAWANCARA(?: TERSTRUKTUR| SEMI TERSTRUKTUR| TIDAK TERSTRUKTUR)?|OBSERVASI(?: NON[- ]PARTISIPAN)?|REDUKSI DATA|PENYAJIAN DATA|PENARIKAN KESIMPULAN|TRIANGULASI)$/i.test(
      t
    )
  )
    return 3;
  return item.boldRatio >= 0.7 && wc(t) <= 14 ? 2 : 0;
}

function findIdx(items: DocItem[], regex: RegExp, from = 0, to = items.length) {
  for (let i = from; i < Math.min(to, items.length); i++) if (regex.test(norm(items[i].text))) return i;
  return -1;
}

function findAny(items: DocItem[], patterns: RegExp[], from = 0, to = items.length) {
  for (const re of patterns) {
    const i = findIdx(items, re, from, to);
    if (i >= 0) return i;
  }
  return -1;
}

export interface ThesisMeta {
  title: string;
  author: string;
  prodi: string;
  univ: string;
  year: string;
}

export function cleanAuthorName(raw: string): string {
  let s = norm(raw)
    .replace(/^(?:OLEH|DISUSUN\s+OLEH|NAMA|PENULIS)\s*[:.]?\s*/i, '')
    .replace(/\s*(?:NIM|NPM|NISN)\s*[:.]?\s*\d+.*$/i, '')
    .replace(/\s*\(.*?\)\s*$/, '')
    .trim();
  if (!s) return '';
  return s.toLowerCase().replace(/(^|[\s.'’-])([a-zà-ÿ])/g, (_, a, b) => a + b.toUpperCase());
}

export function cleanProdiName(raw: string): string {
  let s = norm(raw)
    .replace(/^(?:PROGRAM\s+STUDI|PROGRAM\s+STUDY|PRODI|JURUSAN)\s*[:.]?\s*/i, '')
    .trim();
  if (!s) return '';
  return s.toLowerCase().replace(/(^|[\s.'’-])([a-zà-ÿ])/g, (_, a, b) => a + b.toUpperCase());
}

export function cleanUnivName(raw: string): string {
  let s = norm(raw)
    .replace(/^(?:PADA|DI)\s+/i, '')
    .trim();
  if (/^UIN\s+MADURA$/i.test(s)) return 'Universitas Islam Negeri Madura';
  if (/^IAIN\s+MADURA$/i.test(s)) return 'Institut Agama Islam Negeri Madura';
  if (!s) return '';
  const letters = s.replace(/[^A-Za-zÀ-ÿ]/g, '');
  const caps = letters.replace(/[^A-ZÀ-Ý]/g, '').length;
  if (letters && caps / letters.length > 0.7) {
    return s.toLowerCase().replace(/(^|[\s.'’-])([a-zà-ÿ])/g, (_, a, b) => a + b.toUpperCase());
  }
  return s;
}

function extractMeta(items: DocItem[]): ThesisMeta {
  const first = items.slice(0, 90).filter(x => x.type === 'p' && norm(x.text));
  let title = '';
  for (const it of first.slice(0, 30)) {
    const t = norm(it.text);
    const u = t.toUpperCase();
    if (
      wc(t) >= 7 &&
      t.length > 50 &&
      (t === u || it.boldRatio > 0.7) &&
      !/SKRIPSI|PROPOSAL|OLEH|PROGRAM STUDI|FAKULTAS|UNIVERSITAS|NIM|^BAB\s+[IVXLCDM0-9]+\b|^ABSTRAK$|^DAFTAR\s+|PENDAHULUAN|METODE PENELITIAN|METODOLOGI PENELITIAN|PEMBAHASAN|PENUTUP/.test(
        u
      )
    ) {
      if (t.length > title.length) title = t;
    }
  }
  if (!title) title = norm(first[0]?.text || 'ARTIKEL ILMIAH');

  let author = '';
  const oleh = findIdx(first, /^OLEH\s*:?$/i);
  if (oleh >= 0) {
    for (let i = oleh + 1; i < Math.min(oleh + 5, first.length); i++) {
      const t = norm(first[i].text);
      if (t && !/^NIM\b/i.test(t)) {
        author = t;
        break;
      }
    }
  }
  if (!author) {
    const nim = findIdx(first, /^NIM\b/i);
    if (nim > 0) author = norm(first[nim - 1].text);
  }

  let prodi = '';
  let univ = '';
  let year = '';
  for (const it of first) {
    const t = norm(it.text),
      u = t.toUpperCase();
    if (!prodi && /PROGRAM STUDI|PROGRAM STUDY|PRODI/.test(u)) prodi = t.replace(/^PROGRAM\s+STUDI\s*/i, '').trim();
    if (!univ && /UNIVERSITAS|INSTITUT|SEKOLAH TINGGI/.test(u)) univ = t;
    if (!year && /\b20\d{2}\b/.test(t)) year = (t.match(/\b20\d{2}\b/) || [])[0] || '';
  }
  author = cleanAuthorName(author);
  prodi = cleanProdiName(prodi);
  univ = cleanUnivName(univ);
  return { title, author, prodi, univ, year };
}

function buildGlobalKeywords(items: DocItem[], meta: ThesisMeta): string[] {
  const paras = items.filter(x => x.type === 'p' && wc(x.text) >= 8).map(x => words(x.text));
  const df = new Map<string, number>();
  for (const toks of paras) {
    for (const t of new Set(toks)) df.set(t, (df.get(t) || 0) + 1);
  }
  const n = Math.max(1, paras.length);
  const score = new Map<string, number>();
  paras.forEach(toks => {
    const tf = new Map<string, number>();
    toks.forEach(t => tf.set(t, (tf.get(t) || 0) + 1));
    for (const [t, c] of tf) score.set(t, (score.get(t) || 0) + c * Math.log((n + 1) / (1 + (df.get(t) || 1))));
  });
  for (const t of words(meta.title)) score.set(t, (score.get(t) || 0) + 20);
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 80)
    .map(x => x[0]);
}

function paragraphScore(item: DocItem, kwSet: Set<string>, kind = 'general') {
  const t = norm(item.text),
    toks = words(t);
  if (wc(t) < 18) return -5;
  let s = 0;
  toks.forEach(x => {
    if (kwSet.has(x)) s += 1;
  });
  const n = wc(t);
  s += n >= 45 && n <= 180 ? 5 : n > 250 ? -3 : 1;
  if (
    kind === 'discussion' &&
    /temuan|hasil penelitian|menunjukkan|sesuai dengan|sejalan|kontribusi|strategi|dampak|berdasarkan/.test(
      t.toLowerCase()
    )
  )
    s += 6;
  if (
    kind === 'method' &&
    /pendekatan|kualitatif|kuantitatif|informan|wawancara|observasi|dokumentasi|analisis data|lokasi/.test(
      t.toLowerCase()
    )
  )
    s += 5;
  if (kind === 'intro' && /fenomena|masalah|kondisi|penting|menarik|berdasarkan|latar|potensi|namun/.test(t.toLowerCase()))
    s += 3;
  return s;
}

function chooseOrdered(
  items: DocItem[],
  candidates: number[],
  targetWords: number,
  kwSet: Set<string>,
  kind: string,
  mustIdx: number[] = []
): number[] {
  const allowed = candidates.filter(
    i => i >= 0 && i < items.length && items[i].type === 'p' && !isHeadingLike(items[i]) && wc(items[i].text) >= 12
  );
  const scored = allowed
    .map(i => ({ i, s: paragraphScore(items[i], kwSet, kind), w: wc(items[i].text) }))
    .sort((a, b) => b.s - a.s);
  const chosen = new Set(mustIdx.filter(i => allowed.includes(i)));
  let total = [...chosen].reduce((a, i) => a + wc(items[i].text), 0);
  for (const x of scored) {
    if (total >= targetWords) break;
    if (chosen.has(x.i)) continue;
    chosen.add(x.i);
    total += x.w;
  }
  return [...chosen].sort((a, b) => a - b);
}

function contiguousParagraphs(items: DocItem[], start: number, end: number) {
  const out: number[] = [];
  for (let i = Math.max(0, start); i < Math.min(end, items.length); i++) {
    if ((items[i].type === 'p' || items[i].type === 'table') && norm(items[i].text)) out.push(i);
  }
  return out;
}

function subsectionGroups(items: DocItem[], start: number, end: number) {
  const groups: { heading: number; items: number[] }[] = [];
  let cur: { heading: number; items: number[] } | null = null;
  for (let i = start; i < end; i++) {
    const it = items[i];
    if ((it.type !== 'p' && it.type !== 'table') || !norm(it.text)) continue;
    if (it.type === 'p' && isHeadingLike(it) && headingLevel(it) >= 2) {
      if (cur) groups.push(cur);
      cur = { heading: i, items: [] };
    } else if (cur) {
      cur.items.push(i);
    }
  }
  if (cur) groups.push(cur);
  return groups;
}

export function cleanMethodParagraphText(rawText: string): string {
  let t = norm(rawText);
  // Strip sub-headings prefixes like "A. Pendekatan dan Jenis Penelitian:" or "1. Pendekatan..." or "A. "
  t = t.replace(
    /^(?:[A-Z0-9]\s*[.)]\s*)?(?:PENDEKATAN(?:\s+DAN\s+JENIS)?\s+PENELITIAN|KEHADIRAN\s+PENELITI|LOKASI\s+PENELITIAN|SUMBER\s+DATA|TEKNIK\s+PENGUMPULAN\s+DATA|PROSEDUR\s+PENGUMPULAN\s+DATA|ANALISIS\s+DATA|PENGECEKAN\s+KEABSAHAN\s+DATA)\s*[:.-]?\s*/i,
    ''
  );
  t = t.replace(/^[A-Z]\s*[.)]\s+/i, '');
  return t.trim();
}

function chooseMethod(items: DocItem[], start: number, end: number, target: number, kwSet: Set<string>, maxGroups = 4) {
  const groups = subsectionGroups(items, start, end);
  const pri =
    /pendekatan|jenis penelitian|kehadiran|lokasi|sumber data|informan|pengumpulan data|wawancara|observasi|dokumentasi|analisis data/i;
  const picked: { index: number; customText?: string; role: string; source: string; footnoteIds?: string[] }[] = [];
  let total = 0;
  let usedGroups = 0;
  for (const g of groups) {
    const h = norm(items[g.heading].text);
    if (!pri.test(h)) continue;
    if (usedGroups >= maxGroups) break;
    usedGroups++;
    // Sub-headings (A, B, C) are deliberately omitted per user instruction:
    // "hapus sub judul A.B.C. liat di panah merah yang bagian di hapus jadi langsung"
    const maxP = /pendekatan|lokasi|kehadiran/i.test(h) ? 2 : 1;
    let count = 0;
    for (const i of g.items) {
      if (wc(items[i].text) < 15) continue;
      const cleaned = cleanMethodParagraphText(items[i].text);
      if (cleaned.length < 20) continue;
      picked.push({
        index: i,
        customText: cleaned,
        role: 'body',
        source: 'Metode',
        footnoteIds: items[i]?.footnoteIds || [],
      });
      total += wc(cleaned);
      count++;
      if (count >= maxP || total >= target) break;
    }
    if (total >= target) break;
  }
  if (total < Math.min(220, target * 0.6)) {
    const cand = contiguousParagraphs(items, start, end).filter(i => !isHeadingLike(items[i]));
    const more = chooseOrdered(items, cand, target - total, kwSet, 'method');
    for (const i of more) {
      if (!picked.some(x => x.index === i)) {
        const cleaned = cleanMethodParagraphText(items[i].text);
        if (cleaned.length >= 20) {
          picked.push({
            index: i,
            customText: cleaned,
            role: 'body',
            source: 'Metode',
            footnoteIds: items[i]?.footnoteIds || [],
          });
        }
      }
    }
  }
  return picked.sort((a, b) => a.index - b.index);
}

function chooseDiscussion(items: DocItem[], start: number, end: number, target: number, kwSet: Set<string>) {
  const hits: number[] = [];
  for (let i = start; i < end; i++) {
    const t = norm(items[i]?.text || '');
    if (/^(?:[A-Z]\s*[.)]\s*)?(?:HASIL(?:\s+PENELITIAN)?\s+DAN\s+)?PEMBAHASAN(?:\s+HASIL\s+PENELITIAN)?$/i.test(t)) {
      hits.push(i);
    }
  }
  const pStart = hits.length ? hits[hits.length - 1] : start;
  const groups = subsectionGroups(items, pStart + 1, end);
  if (!groups.length) {
    const cand = contiguousParagraphs(items, pStart + 1, end).filter(i => !isHeadingLike(items[i]));
    return chooseOrdered(items, cand, target, kwSet, 'discussion').map(i => ({
      index: i,
      role: 'body',
      source: 'Pembahasan',
      footnoteIds: items[i]?.footnoteIds || [],
    }));
  }
  const per = Math.max(180, Math.floor(target / Math.max(1, groups.length)));
  const out: { index: number; role: string; source: string; footnoteIds?: string[] }[] = [];
  let total = 0;
  for (const g of groups) {
    const ht = norm(items[g.heading].text);
    if (/^PEMBAHASAN$/i.test(ht)) continue;
    out.push({ index: g.heading, role: 'subheading', source: 'Pembahasan', footnoteIds: items[g.heading]?.footnoteIds || [] });
    const picked = chooseOrdered(items, g.items, per, kwSet, 'discussion', g.items.slice(0, 1));
    for (const i of picked) {
      out.push({ index: i, role: 'body', source: 'Pembahasan', footnoteIds: items[i]?.footnoteIds || [] });
      total += wc(items[i].text);
    }
    if (total >= target) break;
  }
  return out.sort((a, b) => a.index - b.index);
}

const REF_STOP = new Set(
  `ibid ibidem hal hlm halaman page pages p pp vol volume no nomor ed edition cet cetakan terj penerjemah dan the of in on at untuk dalam dari dengan oleh jakarta bandung yogyakarta surabaya malang press penerbit university universitas jurnal journal skripsi tesis dissertation accessed diakses`.split(
    /\s+/
  )
);

function refTokens(s: string) {
  return norm(s)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\b(?:hlm|hal|halaman|p|pp)\.?\s*\d+(?:[-–]\d+)?\b/g, ' ')
    .replace(/[^a-z0-9à-ÿ]+/gi, ' ')
    .split(/\s+/)
    .filter(x => x.length > 2 && !REF_STOP.has(x) && !/^\d+$/.test(x));
}

function cleanFootnoteRef(s: string) {
  let t = norm(s)
    .replace(/^[\d\s.]+(?=[A-ZÀ-Ý])/, '')
    .replace(/\b(?:hlm|hal|halaman|p|pp)\.?\s*\d+(?:[-–]\d+)?\b/gi, '')
    .replace(/,?\s*\d+(?:[-–]\d+)?\.?$/, '')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/([,.;:])(?=\S)/g, '$1 ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return t.replace(/[;,]\s*$/, '').trim();
}

function resolveFootnoteText(doc: ParsedDoc, id: string | number) {
  const t = norm(doc.footnotes.get(String(id)) || '');
  if (!t) return '';
  if (/^ibid(?:em)?\b/i.test(t)) {
    const n = Number(id);
    if (Number.isFinite(n)) {
      for (let k = n - 1; k >= 0; k--) {
        const prev = norm(doc.footnotes.get(String(k)) || '');
        if (prev && !/^ibid(?:em)?\b/i.test(prev)) return prev;
      }
    }
  }
  return t;
}

function biblioCandidates(items: DocItem[], start: number) {
  if (start < 0) return [];
  let end = items.length;
  for (let i = start + 1; i < items.length; i++) {
    const t = norm(items[i].text);
    if (/^(LAMPIRAN\b|PERNYATAAN KEASLIAN|BIODATA|RIWAYAT HIDUP)/i.test(t)) {
      end = i;
      break;
    }
  }
  const out: { i: number; text: string; tokens: Set<string> }[] = [];
  for (let i = start + 1; i < end; i++) {
    const t = norm(items[i].text);
    if (items[i].type !== 'p' || wc(t) < 4) continue;
    if (/\b(?:19|20)\d{2}\b/.test(t) || /^UNDANG[- ]UNDANG/i.test(t) || wc(t) >= 8) {
      out.push({ i, text: t, tokens: new Set(refTokens(t)) });
    }
  }
  return out;
}

function overlapScore(a: Set<string>, b: Set<string>) {
  let hit = 0;
  for (const x of a) if (b.has(x)) hit++;
  return hit;
}

function chooseBiblio(doc: ParsedDoc, start: number, maxRefs: number, selectedIndices: number[]) {
  const items = doc.items || [];
  const refs = biblioCandidates(items, start);
  const usedIds: string[] = [];
  const seenIds = new Set<string>();

  for (const i of selectedIndices) {
    for (const id of items[i]?.footnoteIds || []) {
      const k = String(id);
      if (!seenIds.has(k)) {
        seenIds.add(k);
        usedIds.push(k);
      }
    }
  }

  const selected: { index?: number; virtual?: boolean; text?: string; role: string; source: string }[] = [];
  const seenRef = new Set<string>();

  if (usedIds.length) {
    for (const id of usedIds) {
      const raw = resolveFootnoteText(doc, id);
      if (!raw) continue;
      const ft = new Set(refTokens(raw));
      let best: any = null;
      for (const r of refs) {
        const score = overlapScore(ft, r.tokens) + (Array.from(ft).some(x => /^20\d{2}$/.test(x) && r.text.includes(x)) ? 1 : 0);
        if (!best || score > best.score) best = { ...r, score };
      }
      if (best && best.score >= 2) {
        if (!seenRef.has('i:' + best.i)) {
          seenRef.add('i:' + best.i);
          selected.push({ index: best.i, role: 'bibliography', source: 'Sinkron Footnote' });
        }
      } else {
        const text = cleanFootnoteRef(raw);
        const key = 'v:' + text.toLowerCase();
        if (text && text.length > 8 && !seenRef.has(key)) {
          seenRef.add(key);
          selected.push({ virtual: true, text, role: 'bibliography', source: 'Footnote' });
        }
      }
    }
    return selected.sort((a, b) => {
      const ta = a.virtual ? a.text! : items[a.index!]?.text || '';
      const tb = b.virtual ? b.text! : items[b.index!]?.text || '';
      return ta.localeCompare(tb, 'id', { sensitivity: 'base' });
    });
  }

  return refs.slice(0, maxRefs).map(r => ({ index: r.i, role: 'bibliography', source: 'Daftar Pustaka' }));
}

export function isTocStyle(item: DocItem) {
  return /^(?:TOC|DAFTARISI|CONTENTS?)\s*\d*$/i.test((item?.style || '').replace(/\s+/g, ''));
}

export function styleLooksHeading(item: DocItem) {
  return /^(?:HEADING|JUDUL|TITLE)\s*[1-9]?$/i.test((item?.style || '').replace(/\s+/g, ''));
}

function followingWordCount(items: DocItem[], start: number, limit = 36) {
  let total = 0,
    seen = 0;
  for (let i = start + 1; i < items.length && seen < limit; i++) {
    const it = items[i];
    if (it.type !== 'p') continue;
    const t = norm(it.text);
    if (!t) continue;
    if (/^BAB\s+(?:[IVXLCDM]+|\d+)\b/i.test(t) && seen > 2) break;
    if (isTocStyle(it)) continue;
    total += wc(t);
    seen++;
  }
  return total;
}

function candidateScore(items: DocItem[], i: number, kind = 'major') {
  const it = items[i];
  if (!it || it.type !== 'p') return -999;
  const t = norm(it.text);
  let s = 0;
  if (!t) return -999;
  if (isTocStyle(it)) s -= 120;
  if (styleLooksHeading(it)) s += 20;
  if (it.boldRatio >= 0.65) s += 12;
  if (t === t.toUpperCase() && wc(t) <= 16) s += 8;
  const fw = followingWordCount(items, i, kind === 'abstract' ? 12 : 36);
  if (kind === 'abstract') {
    if (fw >= 120) s += 35;
    else if (fw >= 60) s += 18;
    else s -= 10;
  } else {
    if (fw >= 500) s += 40;
    else if (fw >= 250) s += 28;
    else if (fw >= 100) s += 12;
    else s -= 18;
  }
  let nearbyBab = 0;
  for (let j = i + 1; j < Math.min(items.length, i + 14); j++) {
    if (/^BAB\s+(?:[IVXLCDM]+|\d+)\b/i.test(norm(items[j]?.text || ''))) nearbyBab++;
  }
  if (nearbyBab >= 2) s -= 45;
  return s;
}

function bestIndex(items: DocItem[], regexes: RegExp[], from = 0, to = items.length, kind = 'major') {
  const hits: { i: number; s: number }[] = [];
  for (let i = Math.max(0, from); i < Math.min(to, items.length); i++) {
    const t = norm(items[i]?.text || '');
    if (!t) continue;
    if (regexes.some(re => re.test(t))) hits.push({ i, s: candidateScore(items, i, kind) });
  }
  if (!hits.length) return -1;
  hits.sort((a, b) => b.s - a.s || b.i - a.i);
  return hits[0].i;
}

function chapterNum(t: string) {
  const m = norm(t).match(/^BAB\s+([IVXLCDM]+|\d+)\b/i);
  if (!m) return 0;
  if (/^\d+$/.test(m[1])) return +m[1];
  const vals: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let n = 0,
    prev = 0;
  for (const ch of m[1].toUpperCase().split('').reverse()) {
    const v = vals[ch] || 0;
    n += v < prev ? -v : v;
    prev = Math.max(prev, v);
  }
  return n;
}

function chapterLabel(items: DocItem[], start: number) {
  const base = norm(items[start]?.text || '');
  if (!/^BAB\s+/i.test(base)) return base;
  const tails: string[] = [];
  for (let i = start + 1; i < Math.min(items.length, start + 4); i++) {
    const it = items[i];
    const t = norm(it?.text || '');
    if (!t || it.type !== 'p') continue;
    if (/^BAB\s+/i.test(t)) break;
    const headingish = styleLooksHeading(it) || it.boldRatio >= 0.55 || (t === t.toUpperCase() && wc(t) <= 18);
    if (headingish && wc(t) <= 24 && !/^\d+[.)]/.test(t)) {
      tails.push(t);
      break;
    }
    if (wc(t) > 24) break;
  }
  return tails.length ? `${base} — ${tails[0]}` : base;
}

function detectChapterStarts(items: DocItem[]) {
  const byNum = new Map<number, { i: number; s: number }>();
  for (let i = 0; i < items.length; i++) {
    const n = chapterNum(items[i]?.text || '');
    if (!n || n > 8) continue;
    const s = candidateScore(items, i, 'major');
    const prev = byNum.get(n);
    if (!prev || s > prev.s || (s === prev.s && i > prev.i)) byNum.set(n, { i, s });
  }
  const starts: { num: number; start: number; score: number; label: string }[] = [];
  let last = -1;
  for (let n = 1; n <= 8; n++) {
    const candidates: { i: number; s: number }[] = [];
    for (let i = last + 1; i < items.length; i++) {
      if (chapterNum(items[i]?.text || '') === n) candidates.push({ i, s: candidateScore(items, i, 'major') });
    }
    if (!candidates.length) continue;
    candidates.sort((a, b) => b.s - a.s || a.i - b.i);
    const pick = candidates[0];
    starts.push({ num: n, start: pick.i, score: pick.s, label: chapterLabel(items, pick.i) });
    last = pick.i;
  }
  return starts;
}

function rangeWords(items: DocItem[], start: number, end: number) {
  let n = 0;
  for (let i = Math.max(0, start); i < Math.min(items.length, end); i++) {
    if (items[i]?.type === 'p' && !isTocStyle(items[i])) n += wc(items[i].text);
  }
  return n;
}

function blockRole(label: string, num: number, items: DocItem[], start: number, end: number) {
  const u = upper(label);
  const scores: Record<string, number> = { intro: 0, method: 0, discussion: 0, conclusion: 0 };
  if (num === 1) scores.intro += 90;
  if (num === 3) scores.method += 90;
  if (num === 4) scores.discussion += 90;
  if (num === 5) scores.conclusion += 90;
  if (/PENDAHULUAN|LATAR\s+BELAKANG|KONTEKS\s+PENELITIAN/.test(u)) scores.intro += 70;
  if (/METODE|METODOLOGI|RESEARCH\s+METHOD/.test(u)) scores.method += 90;
  if (/HASIL|PEMBAHASAN|PAPARAN\s+DATA|TEMUAN|ANALISIS\s+DATA|HASIL\s+PENELITIAN/.test(u)) scores.discussion += 85;
  if (/PENUTUP|KESIMPULAN|SIMPULAN|SARAN/.test(u)) scores.conclusion += 85;

  const sample = items
    .slice(start, Math.min(end, start + 70))
    .map(x => norm(x.text))
    .join(' ')
    .toLowerCase();
  const count = (re: RegExp) => (sample.match(re) || []).length;
  scores.method += Math.min(
    45,
    count(
      /\b(pendekatan|metode|metodologi|populasi|sampel|responden|informan|wawancara|observasi|dokumentasi|instrumen|analisis data|uji validitas|uji reliabilitas)\b/g
    ) * 4
  );
  scores.discussion += Math.min(
    45,
    count(
      /\b(hasil penelitian|temuan|pembahasan|menunjukkan|hipotesis|signifikan|berpengaruh|berdasarkan hasil|interpretasi)\b/g
    ) * 4
  );
  scores.conclusion += Math.min(45, count(/\b(kesimpulan|simpulan|saran|disimpulkan|implikasi)\b/g) * 5);

  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return { role: entries[0][1] > 0 ? entries[0][0] : 'unknown', roleScore: entries[0][1], scores };
}

export interface ThesisBlock {
  id: string;
  num: number;
  start: number;
  end: number;
  label: string;
  wordCount: number;
  confidence: number;
  role: string;
  roleScore: number;
  scores: Record<string, number>;
}

function detectFallbackBlocks(items: DocItem[], chapterStarts: any[]): ThesisBlock[] {
  const blocks: ThesisBlock[] = [];
  for (let k = 0; k < chapterStarts.length; k++) {
    const c = chapterStarts[k],
      end = k + 1 < chapterStarts.length ? chapterStarts[k + 1].start : items.length;
    const rr = blockRole(c.label, c.num, items, c.start, end);
    blocks.push({
      id: `bab${c.num}`,
      num: c.num,
      start: c.start,
      end,
      label: c.label,
      wordCount: rangeWords(items, c.start, end),
      confidence: Math.max(0.55, Math.min(0.99, (c.score + 45) / 115)),
      ...rr,
    });
  }
  const known = [
    {
      id: 'introFallback',
      role: 'intro',
      re: [
        /^(?:BAB\s+I\s*[-:]?\s*)?PENDAHULUAN$/i,
        /^LATAR\s+BELAKANG(?:\s+PENELITIAN)?$/i,
        /^KONTEKS\s+PENELITIAN$/i,
      ],
    },
    {
      id: 'methodFallback',
      role: 'method',
      re: [/^(?:BAB\s+III\s*[-:]?\s*)?(?:METODE|METODOLOGI)\s+PENELITIAN$/i, /^METODE$/i],
    },
    {
      id: 'discussionFallback',
      role: 'discussion',
      re: [
        /^(?:BAB\s+IV\s*[-:]?\s*)?(?:HASIL(?:\s+PENELITIAN)?\s+DAN\s+PEMBAHASAN|PEMBAHASAN|PAPARAN\s+DATA.*|TEMUAN\s+PENELITIAN.*|HASIL\s+PENELITIAN.*)$/i,
      ],
    },
    {
      id: 'conclusionFallback',
      role: 'conclusion',
      re: [/^(?:BAB\s+V\s*[-:]?\s*)?(?:PENUTUP|KESIMPULAN(?:\s+DAN\s+SARAN)?|SIMPULAN(?:\s+DAN\s+SARAN)?)$/i],
    },
  ];

  for (const f of known) {
    if (blocks.some(b => b.role === f.role && b.roleScore >= 70)) continue;
    const st = bestIndex(items, f.re, 0, items.length, 'major');
    if (st < 0) continue;
    let end = items.length;
    for (let i = st + 1; i < items.length; i++) {
      if (/^BAB\s+(?:[IVXLCDM]+|\d+)\b/i.test(norm(items[i]?.text || ''))) {
        end = i;
        break;
      }
      if (f.role !== 'conclusion' && /^(?:DAFTAR\s+PUSTAKA|REFERENSI|BIBLIOGRAFI)$/i.test(norm(items[i]?.text || ''))) {
        end = i;
        break;
      }
    }
    blocks.push({
      id: f.id,
      num: 0,
      start: st,
      end,
      label: norm(items[st].text),
      wordCount: rangeWords(items, st, end),
      confidence: 0.68,
      role: f.role,
      roleScore: 70,
      scores: {},
    });
  }
  return blocks.sort((a, b) => a.start - b.start);
}

function chooseRoleBlock(blocks: ThesisBlock[], role: string) {
  const arr = blocks
    .filter(b => b.role === role && b.wordCount >= 40)
    .sort((a, b) => b.roleScore - a.roleScore || b.confidence - a.confidence || b.wordCount - a.wordCount);
  return arr[0] || null;
}

function blockById(analysis: any, id: string) {
  return analysis.blocks?.find((b: any) => b.id === id) || null;
}

function findActualAbstract(items: DocItem[]) {
  const hits: { i: number; s: number }[] = [];
  for (let i = 0; i < items.length; i++) {
    const t = norm(items[i]?.text || '');
    if (!/^ABSTRAK$/i.test(t)) continue;
    let s = candidateScore(items, i, 'abstract');
    for (let j = i + 1; j < Math.min(items.length, i + 8); j++) {
      const q = norm(items[j]?.text || '');
      if (/^KATA\s*KUNCI\b/i.test(q)) s += 12;
      if (/^BAB\s+/i.test(q)) s -= 20;
    }
    hits.push({ i, s });
  }
  if (!hits.length) return -1;
  hits.sort((a, b) => b.s - a.s || b.i - a.i);
  return hits[0].i;
}

function findActualBiblio(items: DocItem[]) {
  const hits: { i: number; s: number }[] = [];
  for (let i = 0; i < items.length; i++) {
    if (/^(?:DAFTAR\s+PUSTAKA|REFERENSI|BIBLIOGRAFI)$/i.test(norm(items[i]?.text || ''))) {
      hits.push({ i, s: candidateScore(items, i, 'major') + (i / items.length) * 20 });
    }
  }
  if (!hits.length) return -1;
  hits.sort((a, b) => b.s - a.s);
  return hits[0].i;
}

export function analyzeThesis(doc: ParsedDoc) {
  const items = doc.items;
  const meta = extractMeta(items);
  const kw = buildGlobalKeywords(items, meta);
  const chapters = detectChapterStarts(items);
  const blocks = detectFallbackBlocks(items, chapters);
  const roleBlocks = {
    intro: chooseRoleBlock(blocks, 'intro'),
    method: chooseRoleBlock(blocks, 'method'),
    discussion: chooseRoleBlock(blocks, 'discussion'),
    conclusion: chooseRoleBlock(blocks, 'conclusion'),
  };
  const idx: Record<string, number> = {};
  idx.abstract = findActualAbstract(items);
  idx.biblio = findActualBiblio(items);
  idx.bab1 = roleBlocks.intro?.start ?? -1;
  idx.bab3 = roleBlocks.method?.start ?? -1;
  idx.bab4 = roleBlocks.discussion?.start ?? -1;
  idx.bab5 = roleBlocks.conclusion?.start ?? -1;
  idx.bab2 = chapters.find(x => x.num === 2)?.start ?? -1;

  const essentials = [idx.abstract, idx.bab1, idx.bab3, idx.bab4, idx.bab5, idx.biblio];
  const found = essentials.filter(i => i >= 0).length;
  const roleQuality =
    (['intro', 'method', 'discussion', 'conclusion'] as const).reduce(
      (a, r) => a + (roleBlocks[r] ? Math.min(1, (roleBlocks[r]?.roleScore || 0) / 90) : 0),
      0
    ) / 4;
  const confidence = Math.max(0, Math.min(0.99, (found / 6) * 0.72 + roleQuality * 0.28));

  return {
    meta,
    keywords: kw,
    idx,
    confidence,
    itemsCount: items.length,
    wordCount: items.reduce((a, x) => a + wc(x.text), 0),
    chapters,
    blocks,
    roleBlocks,
  };
}

export interface PlanItem {
  index?: number;
  virtual?: boolean;
  text?: string;
  customText?: string;
  role: string;
  source: string;
  footnoteIds?: string[];
}

export interface PlanSection {
  id: string;
  title: string;
  items: PlanItem[];
}

export interface ArticlePlan {
  sections: PlanSection[];
  totalWords: number;
  budgets: Record<string, number>;
  mode: string;
  mapping: Record<string, string>;
  usedBlocks: Record<string, ThesisBlock | null>;
}

export function generatePlan(doc: ParsedDoc, analysis: any, opts: any = {}): ArticlePlan {
  const items = doc.items;
  const kwSet = new Set<string>(analysis.keywords.slice(0, 55));
  const mode = opts.mode || 'contoh';
  const mapping = opts.mapping || {};
  const budgets =
    mode === 'ringkas'
      ? { intro: 450, method: 300, discussion: 800, conclusion: 320, refs: 10 }
      : mode === 'lengkap'
      ? { intro: 1100, method: 650, discussion: 1900, conclusion: 700, refs: 25 }
      : { intro: 760, method: 420, discussion: 1200, conclusion: 520, refs: 15 };

  const sections: PlanSection[] = [];
  const useBlock = (role: string) => {
    const manual = mapping[role] && mapping[role] !== 'auto' ? blockById(analysis, mapping[role]) : null;
    return manual || analysis.roleBlocks?.[role] || null;
  };
  const introB = useBlock('intro'),
    methodB = useBlock('method'),
    discB = useBlock('discussion'),
    conclB = useBlock('conclusion');

  const abs = analysis.idx.abstract;
  if (abs >= 0) {
    let end = items.length;
    const boundaries = [introB?.start, methodB?.start, discB?.start, conclB?.start, analysis.idx.biblio].filter(
      x => Number.isInteger(x) && x > abs
    );
    if (boundaries.length) end = Math.min(...boundaries);
    const arr: PlanItem[] = [];
    for (let i = abs + 1; i < Math.min(end, abs + 28); i++) {
      if (items[i].type !== 'p' || !norm(items[i].text)) continue;
      const t = norm(items[i].text);
      if (/^(?:KATA\s+PENGANTAR|DAFTAR\s+ISI|BAB\s+I\b)$/i.test(t)) break;
      arr.push({ index: i, role: /^KATA\s*KUNCI\b/i.test(t) ? 'keywords' : 'body', source: 'Abstrak', footnoteIds: items[i]?.footnoteIds || [] });
      if (arr.reduce((n, x) => n + wc(items[x.index!].text), 0) > 650) break;
    }
    if (arr.length) sections.push({ id: 'abstract', title: 'ABSTRAK', items: arr });
  }

function isThesisTitleDeclaration(text: string) {
  const t = norm(text).toLowerCase();
  if (/maka\s+penulis\s+tertarik\s+untuk\s+(meneliti|melakukan|mengambil)/i.test(t)) return true;
  if (/tertarik\s+untuk\s+(meneliti|mengangkat|melakukan\s+penelitian)\s+dengan\s+judul/i.test(t)) return true;
  if (/berdasarkan\s+(?:uraian|latar\s+belakang|paparan)\s+di\s+atas.*(?:tertarik|judul)/i.test(t)) return true;
  if (/mengambil\s+judul\s*["“'].*["”']/i.test(t)) return true;
  if (/dengan\s+judul\s*["“'].*["”']/i.test(t)) return true;
  return false;
}

  if (introB) {
    const bStart = introB.start,
      bEnd = introB.end;
    let start = findAny(
      items,
      [/^(?:A\s*[.)]\s*)?(KONTEKS|LATAR\s+BELAKANG)(?:\s+PENELITIAN)?/i, /^PENDAHULUAN$/i],
      bStart,
      Math.min(bEnd, bStart + 80)
    );
    if (start < 0) start = bStart;
    let end = findAny(
      items,
      [/^(?:B\s*[.)]\s*)?(FOKUS|RUMUSAN)\s+(PENELITIAN|MASALAH)/i, /^(?:C\s*[.)]\s*)?TUJUAN\s+PENELITIAN/i],
      start + 1,
      bEnd
    );
    if (end < 0) end = bEnd;
    const rawCand = contiguousParagraphs(items, start + 1, end).filter(
      i => !isHeadingLike(items[i]) && !isTocStyle(items[i])
    );
    // Sesuai revisi: 2 paragraf terakhir pada BAB I A. Konteks Penelitian jangan diambil,
    // karena 2 paragraf terakhir sudah mengarah ke file skripsi aslinya (penegasan judul skripsi).
    const trimmedCand = rawCand.length > 2 ? rawCand.slice(0, -2) : rawCand;
    const cand = trimmedCand.filter(i => !isThesisTitleDeclaration(items[i].text));
    const must = cand.slice(0, Math.min(2, cand.length));
    const chosen = chooseOrdered(items, cand, budgets.intro, kwSet, 'intro', must);
    if (chosen.length) {
      sections.push({
        id: 'intro',
        title: 'PENDAHULUAN',
        items: chosen.map(i => ({ index: i, role: 'body', source: introB.label || 'Pendahuluan', footnoteIds: items[i]?.footnoteIds || [] })),
      });
    }
  }

  if (methodB) {
    const arr = chooseMethod(items, methodB.start + 1, methodB.end, budgets.method, kwSet, mode === 'lengkap' ? 7 : 4);
    if (arr.length) sections.push({ id: 'method', title: 'METODE PENELITIAN', items: arr });
  }

  if (discB) {
    const arr = chooseDiscussion(items, discB.start + 1, discB.end, budgets.discussion, kwSet);
    if (arr.length) sections.push({ id: 'discussion', title: 'PEMBAHASAN', items: arr });
  }

  if (conclB) {
    let k = findAny(
      items,
      [/^(?:A\s*[.)]\s*)?(?:KESIMPULAN|SIMPULAN)$/i, /^(?:KESIMPULAN|SIMPULAN)\s+DAN\s+SARAN$/i],
      conclB.start,
      conclB.end
    );
    if (k < 0) k = conclB.start;
    const cand = contiguousParagraphs(items, k + 1, conclB.end);
    const arr: PlanItem[] = [];
    let total = 0;
    let pointCounter = 1;

    for (const i of cand) {
      const t = norm(items[i].text);
      if (/^(?:DAFTAR\s+PUSTAKA|REFERENSI|BIBLIOGRAFI)$/i.test(t)) break;

      // Filter out sub-headings: "A. Kesimpulan", "A. Saran", "B. Saran", "Saran", etc.
      // Sesuai revisi: "saran: A. Saran di hapus saja cukup langsung ke isi saranya nya"
      const isSubHeading =
        /^(?:[A-Z]\s*[.)]\s*)?(?:KESIMPULAN|SIMPULAN|SARAN|PENUTUP)$/i.test(t) ||
        (isHeadingLike(items[i]) && /^(?:[A-Z]\s*[.)]\s*)?(?:SARAN|KESIMPULAN|REKOMENDASI)/i.test(t));
      if (isSubHeading) continue;

      // Filter out brief transitional headings like "Adapun saran-saran yang diajukan antara lain:"
      if (/^(?:Berdasarkan\s+kesimpulan\s+(?:di\s+atas|tersebut),?\s*)?(?:maka\s+)?(?:adapun\s+)?saran[- ]saran\s+yang\s+(?:dapat\s+)?diajukan/i.test(t) && wc(t) < 18) {
        continue;
      }

      // Check if this paragraph is a numbered or lettered point (e.g. "1.", "2.", "a.", "(1)", or narrative point)
      const hasNumberPrefix = /^(?:\d+[.)]|\([0-9]+\)|[a-z][.)]|-|\*)\s*/i.test(t);
      const isSequentialWord = arr.length > 0 && /^(?:Pertama|Kedua|Ketiga|Keempat|Kelima|Keenam|Bagi\s+)/i.test(t);

      if (hasNumberPrefix || isSequentialWord) {
        // Strip old numbering/lettering/bullet
        const cleanedText = t.replace(/^(?:\d+[.)]|\([0-9]+\)|[a-z][.)]|-|\*)\s*/i, '').trim();
        const numberedText = `${pointCounter}. ${cleanedText}`;
        arr.push({
          index: i,
          customText: numberedText,
          role: 'numbered',
          source: conclB.label || 'Kesimpulan',
          footnoteIds: items[i]?.footnoteIds || [],
        });
        pointCounter++;
        total += wc(cleanedText);
      } else {
        arr.push({
          index: i,
          role: 'body',
          source: conclB.label || 'Kesimpulan',
          footnoteIds: items[i]?.footnoteIds || [],
        });
        total += wc(t);
      }
      if (total >= budgets.conclusion * 1.5) break;
    }
    if (arr.length) sections.push({ id: 'conclusion', title: 'KESIMPULAN', items: arr });
  }

  const selectedIndices = sections.flatMap(s => s.items.map(x => x.index!)).filter(x => x != null);
  if (analysis.idx.biblio >= 0) {
    sections.push({
      id: 'biblio',
      title: 'DAFTAR PUSTAKA',
      items: chooseBiblio(doc, analysis.idx.biblio, budgets.refs, selectedIndices),
    });
  }

  const totalWords = sections.reduce(
    (a, s) => a + s.items.reduce((b, x) => b + wc(x.customText || (x.virtual ? x.text! : items[x.index!]?.text || '')), 0),
    0
  );

  return {
    sections,
    totalWords,
    budgets,
    mode,
    mapping,
    usedBlocks: { intro: introB, method: methodB, discussion: discB, conclusion: conclB },
  };
}

export function diagnostics(doc: ParsedDoc, analysis: any, plan: ArticlePlan) {
  const notes: string[] = [];
  const needed = ['intro', 'method', 'discussion', 'conclusion'] as const;
  if (analysis.confidence < 0.78)
    notes.push('Struktur skripsi tidak sepenuhnya yakin. Periksa Pemetaan Struktur; Anda bisa memilih BAB/bagian secara manual.');
  if (!analysis.meta.author) notes.push('Nama penulis belum terdeteksi. Isi manual pada Data Artikel.');
  for (const r of needed) {
    if (!plan.usedBlocks?.[r]) {
      notes.push(
        `${
          { intro: 'Pendahuluan', method: 'Metode', discussion: 'Hasil/Pembahasan', conclusion: 'Kesimpulan/Saran' }[r]
        } belum terpetakan.`
      );
    }
  }
  if (plan.totalWords < 1800) notes.push('Draft terdeteksi terlalu singkat. Gunakan mode Lengkap atau koreksi Pemetaan Struktur.');
  if (!plan.sections.some(s => s.id === 'discussion' && s.items.length))
    notes.push('Bagian Hasil/Pembahasan belum menghasilkan isi. Pilih BAB IV/bagian hasil secara manual pada Pemetaan Struktur.');
  return notes;
}

export function extractAbstractSource(doc: ParsedDoc, plan: ArticlePlan) {
  const sec = plan?.sections?.find(s => s.id === 'abstract');
  if (!sec) return { body: '', paragraphs: [], keywords: '' };
  const paragraphs: string[] = [],
    keys: string[] = [];
  for (const x of sec.items || []) {
    const t = norm(x.customText || (x.index != null ? doc.items[x.index]?.text : x.text) || '');
    if (!t) continue;
    if (x.role === 'keywords' || /^KATA\s*KUNCI\b/i.test(t)) {
      keys.push(t.replace(/^KATA\s*KUNCI\s*:?\s*/i, ''));
    } else {
      paragraphs.push(t);
    }
  }
  return { body: paragraphs.join('\n\n'), paragraphs, keywords: norm(keys.join('; ')) };
}

export const helpers = { norm, wc, isHeadingLike, headingLevel, isTocStyle };

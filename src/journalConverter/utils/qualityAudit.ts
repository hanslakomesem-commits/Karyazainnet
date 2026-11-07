import type { JournalArticle } from '../types/journal';

export function auditGeneratedArticle(article: JournalArticle, sourceText: string): string[] {
  const warnings: string[] = [];
  const source = sourceText.toLocaleLowerCase('id-ID').replace(/\s+/g, ' ');
  const text = [article.pendahuluan, article.metode, article.hasil, article.pembahasan, article.kesimpulan].join(' ');
  for (const key of ['pendahuluan', 'metode', 'hasil', 'pembahasan', 'kesimpulan'] as const) {
    if (!article[key]?.trim()) warnings.push(`Bagian ${key} kosong.`);
  }
  const normalizedNumbers = (value: string) => [...new Set((value.match(/\b\d{2,}(?:[.,]\d+)?%?\b/g) || []).map(v => v.replace(/\D/g, '')))];
  const sourceNumbers = new Set(normalizedNumbers(sourceText));
  const unverifiedNumbers = normalizedNumbers(text).filter(num => num.length >= 3 && !sourceNumbers.has(num));
  if (unverifiedNumbers.length) warnings.push(`Angka yang belum ditemukan identik di naskah asal: ${unverifiedNumbers.slice(0, 12).join(', ')}. Periksa tabel, tahun, dan statistik sebelum dicetak.`);
  const markers = [...text.matchAll(/\[\^(\d+)\]/g)].map(m => Number(m[1]));
  const footnoteNumbers = new Set((article.footnotes || []).map(f => Number(f.number)));
  const unmatched = [...new Set(markers.filter(n => !footnoteNumbers.has(n)))];
  if (unmatched.length) warnings.push(`Ada penanda footnote tanpa data rujukan: ${unmatched.join(', ')}.`);
  const noMarker = (article.footnotes || []).filter(f => !markers.includes(Number(f.number)) && (!f.anchorWord || !text.toLowerCase().includes(f.anchorWord.toLowerCase())));
  if (noMarker.length) warnings.push(`${noMarker.length} catatan kaki belum memiliki posisi rujukan yang jelas; tidak akan dipaksakan ke paragraf lain.`);
  const refs = (article.daftarPustaka || []).filter(Boolean);
  if (!refs.length) warnings.push('Daftar rujukan kosong; periksa pustaka skripsi asli.');
  const citationMatches = refs.filter(ref => {
    const words = ref.toLowerCase().match(/[a-zà-ÿ]{4,}/g) || [];
    return words.slice(0, 2).some(w => source.includes(w));
  });
  if (refs.length && citationMatches.length < refs.length) warnings.push(`${refs.length - citationMatches.length} entri daftar rujukan belum bisa dicocokkan otomatis dengan teks skripsi; verifikasi manual.`);
  const countWords = (article.abstract?.abstrakIndo || '').trim().split(/\s+/).filter(Boolean).length;
  if (countWords && (countWords < 50 || countWords > 100)) warnings.push(`Abstrak Indonesia ${countWords} kata; pedoman meminta sekitar 50–75 kata (maksimal 100).`);
  if (!article.metadata?.nim) warnings.push('NIM masih kosong: Cover CD belum dapat dibuat.');
  return warnings;
}

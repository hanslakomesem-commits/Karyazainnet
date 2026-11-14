/** Menandai transliterasi terlihat tanpa mengubah ejaan sumber scan. */
// Diakritik transliterasi yang lazim, tanda hamzah/ain, dan Unicode combining marks.
export const TRANSLITERATION_MARKS = /[\u0100-\u024f\u1e00-\u1eff\u02bb-\u02bf\u0300-\u036f\u2018\u2019]/u;
const unicodeProblem = /\uFFFD|\u00ad/u;

export function auditCoverTransliteration(input) {
  const fields = ['judul','nama','prodi','fakultas','universitas','kota','program_jenjang'];
  const warnings = [];
  const values = fields.map(k => String(input?.[k] ?? ''));
  const hasMarks = values.some(v => TRANSLITERATION_MARKS.test(v));
  if (hasMarks) warnings.push('Tanda transliterasi Arab–Latin terdeteksi. Cocokkan tiap huruf bertitik/bergaris, hamzah, dan ain dengan foto asli sebelum cetak.');
  if (values.some(v => unicodeProblem.test(v))) warnings.push('Ada karakter Unicode tidak terbaca atau soft hyphen. Koreksi sesuai foto sebelum membuat PDF.');
  return { hasTransliteration: hasMarks, warnings };
}

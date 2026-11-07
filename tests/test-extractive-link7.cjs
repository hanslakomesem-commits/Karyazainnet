// node tests/test-extractive-link7.cjs (after npm install / npm ci)
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const file = path.resolve(__dirname, '../src/journalConverter/utils/extractiveArticle.ts');
const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod = { exports: {} };
new Function('module', 'exports', compiled)(mod, mod.exports);
const { buildExtractiveArticle, assertArticleFromSource } = mod.exports;
const title = 'PENGARUH PENDIDIKAN KARAKTER PADA SISWA MADRASAH';
const rawText = `SKRIPSI\n${title}\nNama : Hana\nNIM: 22382001001\n\nABSTRAK\nPenelitian membahas pendidikan karakter pada siswa madrasah dan dilakukan melalui pengamatan kelas yang dilaporkan dalam naskah.\n\nBAB I PENDAHULUAN\n\nPenelitian berangkat dari persoalan pembelajaran dalam kelas dan menganalisis pengaruh praktik pendidikan karakter pada siswa secara bertahap.[^7]\n\nBAB II KAJIAN TEORI\n\nTeori pendidikan karakter dibahas dalam kajian teori naskah.\n\nBAB III METODE PENELITIAN\n\nMetode yang dipakai adalah observasi dan wawancara langsung dengan tiga narasumber yang dipilih berdasarkan daftar responden penelitian.\n\nBAB IV HASIL PENELITIAN\n\nTemuan penelitian mencatat praktik pembelajaran dilakukan dengan diskusi kelas dan pendampingan pembimbing selama beberapa pertemuan.[^8]\n\n4.2 Pembahasan\n\nDiskusi pada penelitian menunjukkan partisipasi siswa pada proses pembelajaran yang tercatat dalam pengamatan awal.\n\nBAB V KESIMPULAN\n\nKesimpulan menyatakan kegiatan pembelajaran dapat dilaksanakan dengan mengikuti rancangan awal sesuai temuan dalam naskah.\n\nDAFTAR PUSTAKA\n\nPenulis Asli. Buku Asli. Kota Asli: Penerbit Asli, 2025.`;
const sourceFootnotes = { '7': 'Penulis Asli. Buku Asli. Kota Asli: Penerbit Asli, 2025.', '8': 'Wawancara dengan Informan Asli, 12 Mei 2025.' };
const input = { rawText, sourceFootnotes, targetLengthPages: 18, metadata: { judul: title, nama: 'Hana', nim: '22382001001', prodi: 'Pendidikan Agama Islam', bulanTahun: 'OKTOBER 2026', email: '' } };
const { article } = buildExtractiveArticle(input);
assertArticleFromSource(article, rawText, sourceFootnotes);
assert.equal(article.footnotes.length, 2);
assert.match(article.hasil, /\[\^2\]/);
for (const s of ['pendahuluan', 'metode', 'hasil', 'pembahasan', 'kesimpulan']) assert.ok(article[s].length > 0, `missing ${s}`);
assert.throws(() => assertArticleFromSource({ ...article, hasil: 'Hasil penelitian direkayasa oleh AI.' }, rawText, sourceFootnotes));
assert.throws(() => assertArticleFromSource({ ...article, footnotes: [{ id: 'fake', number: 1, text: 'Wawancara dengan tokoh rekaan, 2026.' }] }, rawText, sourceFootnotes));
assert.throws(() => buildExtractiveArticle({ ...input, sourceFootnotes: { '7': sourceFootnotes['7'] } }));
console.log('PASS: sumber asli, lima bagian, footnote tertaut, teks rekaan ditolak, rujukan hilang ditolak');

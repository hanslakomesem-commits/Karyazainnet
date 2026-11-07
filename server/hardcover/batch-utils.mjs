/** Pure helpers for one PDF per cover with an independently selected spine. */
export const MAX_BATCH_ORDERS = 40;
export function safeFileName(value, fallback = 'MAHASISWA') {
  return String(value ?? '').toLocaleUpperCase('id-ID').normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '').slice(0, 54) || fallback;
}
export function validateOrderItems(items, availableThicknesses) {
  if (!Array.isArray(items) || items.length === 0) throw Object.assign(new Error('Tidak ada pesanan yang dipilih.'), {status:400});
  if (items.length > MAX_BATCH_ORDERS) throw Object.assign(new Error(`Maksimal ${MAX_BATCH_ORDERS} pesanan per unduhan.`), {status:400});
  const seen = new Set();
  return items.map((item, index) => {
    const nomor = Number(item?.nomor);
    if (!Number.isInteger(nomor) || nomor < 1 || nomor > 999 || seen.has(nomor)) throw Object.assign(new Error(`Nomor urut pesanan #${index + 1} tidak valid atau duplikat.`), {status:400});
    seen.add(nomor);
    const thickness = Number(item?.thickness);
    if (!availableThicknesses.includes(thickness)) throw Object.assign(new Error(`Pesanan #${nomor}: pilih ketebalan punggung 10–28 mm yang tersedia.`), {status:400});
    if (!item.data || typeof item.data !== 'object' || Array.isArray(item.data)) throw Object.assign(new Error(`Pesanan #${nomor}: data mahasiswa belum tersedia.`), {status:400});
    const style=String(item.style||'polos').toLowerCase();
    if(!['polos','merah','maroon','custom'].includes(style))throw Object.assign(new Error(`Pesanan #${nomor}: pilihan warna salah.`),{status:400});
    if(style!=='polos'&&thickness===28)throw Object.assign(new Error(`Pesanan #${nomor}: warna 28 mm belum aman karena tanda potong belakang keluar dari kertas 475 mm. Diperlukan master warna baru.`),{status:422});
    const custom_color=String(item.custom_color||'#005AA7');
    if(style==='custom' && !/^#[0-9a-fA-F]{6}$/.test(custom_color))throw Object.assign(new Error(`Pesanan #${nomor}: kode warna custom harus #RRGGBB.`),{status:400});
    return {nomor, thickness, style, custom_color, data:item.data};
  });
}
export function pdfOrderFileName(order) {
  return `${String(order.nomor).padStart(2,'0')}_${safeFileName(order.data.nama)}_${String(order.style||'polos').toUpperCase()}_${order.thickness}MM.pdf`;
}
function csvCell(text) {
  let value = String(text ?? '').replace(/[\r\n\t]+/g, ' ').trim();
  if (/^[=+\-@]/u.test(value)) value = "'" + value;
  return '"' + value.replace(/"/g, '""') + '"';
}
export function makeBatchReportCSV(rows) {
  const headers=['No','Nama Mahasiswa','NIM','Ketebalan (mm)','Jenis Cover','Status','Nama File','Keterangan'];
  return '\uFEFF' + [headers,...rows.map(row=>[row.nomor,row.nama,row.nim,row.thickness,row.style||'polos',row.status,row.filename||'',(row.errors||row.warnings||[]).join('; ')])]
    .map(line=>line.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

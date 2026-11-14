/* ZAIN.NET V4.6: helper murni OCR zona. Tidak memakai API/token.
 * Semua koordinat relatif terhadap foto yang sudah dinormalisasi orientasinya.
 */
export const COVER_ZONES = Object.freeze([
  {id:'judul', label:'Judul atas', x:0.035, y:0.025, width:0.93, height:0.255},
  {id:'identitas', label:'Nama, jenis dokumen, NIM', x:0.09, y:0.205, width:0.82, height:0.38},
  {id:'kampus', label:'Prodi, nama kampus lengkap dan kota', x:0.035, y:0.715, width:0.93, height:0.28},
  {id:'logo', label:'Teks dalam logo kampus (pembanding)', x:0.16, y:0.435, width:0.68, height:0.40}
]);
export function normalizedLines(text){
  return String(text||'').replace(/\r/gu,'').split('\n').map(s=>s.replace(/[\t\u00a0]+/gu,' ').replace(/\s+/gu,' ').trim()).filter(Boolean);
}
export function zoneBounds(zone,width,height){
  const x=Math.max(0,Math.min(width-1,Math.floor(zone.x*width)));
  const y=Math.max(0,Math.min(height-1,Math.floor(zone.y*height)));
  return {x,y,width:Math.max(1,Math.min(width-x,Math.round(zone.width*width))),height:Math.max(1,Math.min(height-y,Math.round(zone.height*height)))};
}
const TYPE=/^(?:SKRIPSI|TESIS|THESIS|DISERTASI|DISSERTATION|MAKALAH|TUGAS\s+AKHIR|LAPORAN(?:\s+AKHIR)?)$/iu;
const LABEL=/^(?:SKRIPSI|TESIS|THESIS|OLEH|WRITTEN\s+BY|NIM|N\.?I\.?M|FAKULTAS|FACULTY|PRODI|PROGRAM\s+STUDI|UNIVERSITAS|UNIVERSITY|UIN|IAIN|AGUSTUS|JUNI|JULI|202\d)\b/iu;
const AMBIGUOUS = /[|{}<>]/u;
const normalize=s=>String(s||'').replace(/\s+/gu,' ').trim();
function goodTitle(text){
  const cleaned=normalize(text);
  return cleaned.length>20 && cleaned.split(' ').length>=4 && !AMBIGUOUS.test(cleaned);
}
export function titleFromZone(text){
  const lines=normalizedLines(text), candidate=[];
  for (const line of lines){
    const upper=line.toLocaleUpperCase('id-ID');
    if(TYPE.test(upper) || /^(OLEH\s*:?|N\s*\.?I\s*\.?M|NAMA\s*:?)/iu.test(upper)) break;
    if (/^(UNIVERSITAS|FAKULTAS|PROGRAM STUDI|PRODI|UIN\b)/iu.test(upper)) break;
    if (line.length>4 && !/^\d{4}$/u.test(line) && !/^\W+$/u.test(line))candidate.push(line);
  }
  const title=normalize(candidate.join(' '));
  return goodTitle(title)?title:'';
}
export function nimFromZone(text){
  const lines=normalizedLines(text);
  for (let i=0;i<lines.length;i++){
    // Jangan mengganti O→0 atau I→1 tanpa bukti. Semua digit harus hasil OCR asli.
    const line=lines[i];
    const hit=line.match(/\bN\s*\.?\s*[I1]\s*\.?\s*M\s*\.?\s*[:.\-\s]*([0-9][0-9\s.\-]{6,19}[0-9])\b/iu);
    if (hit) return hit[1].replace(/[^0-9]/gu,'');
    if (/^N\s*\.?\s*[I1]\s*\.?\s*M\s*\.?\s*[:.\-]?$/iu.test(line)) {
      const next=(lines[i+1]||'').replace(/[\s.\-]/gu,'');
      if (/^\d{8,16}$/u.test(next))return next;
    }
  }
  return '';
}
export function nameFromZone(text){
  const lines=normalizedLines(text);
  for (let i=0;i<lines.length;i++){
    const line=lines[i];
    const match=line.match(/^(?:OLEH|WRITTEN\s+BY|PREPARED\s+BY|SUBMITTED\s+BY)\s*[:.]?\s*(.*)$/iu);
    if (!match)continue;
    let value=(match[1]||'').trim();
    if(!value)value=lines[i+1]||'';
    if (!value || /^(?:NIM|N\.?I\.?M|SKRIPSI|TESIS|THESIS)/iu.test(value))return '';
    return value;
  }
  return '';
}
export function typeFromZone(text){
  return normalizedLines(text).find(line=>TYPE.test(line.toLocaleUpperCase('id-ID')))||'';
}
import {campusIdentity,institutionLooksIncomplete,coverLanguage} from './classifier.js';
export function footerFromZone(text){
  const lines=normalizedLines(text);const result={};
  const identified=campusIdentity(lines);if(identified.universitas)result.universitas=identified.universitas;if(identified.kota)result.kota=identified.kota;
  for(let i=0;i<lines.length;i++){
    const v=lines[i];
    for(const [key,regex] of [
      ['prodi',/^(?:PROGRAM\s+STUDI|PRODI|JURUSAN)\s*[:.]?\s*(.*)$/iu],
      ['fakultas',/^FAKULTAS\s*[:.]?\s*(.*)$/iu],
    ]){
      const m=v.match(regex);if(!m)continue;
      let val=m[1]||(lines[i+1]||'');
      val=normalize(val);
      if(val && !LABEL.test(val))result[key]=val;

    }
    if(!result.prodi && (/^(?:DEPARTMENT\s+OF|STUDY\s+PROGRAM\s+(?:OF|IN)|PROGRAM\s+OF)\s+\S/iu.test(v)||
      /\b(?:STUDY\s+PROGRAM|TEACHING\s+LEARNING\s+PROGRAM|EDUCATION\s+PROGRAM|LANGUAGE\s+PROGRAM|DEPARTMENT)$/iu.test(v)))result.prodi=v;
    if(!result.fakultas && (/^FACULTY\s+OF\s+\S/iu.test(v)||/\bFACULTY$/iu.test(v)))result.fakultas=v;
    const date=v.match(/\b(?:JANUARI|FEBRUARI|MARET|APRIL|MEI|JUNI|JULI|AGUSTUS|SEPTEMBER|OKTOBER|NOVEMBER|DESEMBER|JANUARY|FEBRUARY|MARCH|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+\d{4}\b/iu);
    if(date)result.bulan_tahun=date[0];
    else if(!result.bulan_tahun && /^20\d{2}$/u.test(v))result.bulan_tahun=v;
  }
  return result;
}
export function mergeZones(base,zoneText={},confidences={}){
  const result={...base,warnings:[...(base.warnings||[])]};
  const title=titleFromZone(zoneText.judul), name=nameFromZone(zoneText.identitas);
  const nim=nimFromZone(zoneText.identitas),foot=footerFromZone(zoneText.kampus);
  const zoneValues={judul:title,nama:name,nim,jenis_dokumen:typeFromZone(zoneText.identitas)||typeFromZone(zoneText.judul),...foot};
  let recovered=0;let improvedTitle=false;
  const inconsistent=[];
  for(const [key,value] of Object.entries(zoneValues)){
    if(!value)continue;
    const existing=normalize(result[key]);
    if(!existing){result[key]=value;recovered++;continue;}
    if(existing.toLocaleUpperCase('id-ID')!==normalize(value).toLocaleUpperCase('id-ID')){
      if(key==='universitas'&&institutionLooksIncomplete(existing)&&normalize(value).toLocaleUpperCase('id-ID').startsWith(existing.toLocaleUpperCase('id-ID')+' ')){result.universitas=value;recovered++;continue;}
      // Jika judul penuh terpotong tetapi 75%+ kata sebelumnya muncul lagi pada zona,
      // zona dapat melengkapinya. Perbedaan tetap wajib ditandai untuk diperiksa.
      if(key==='judul'){
        const a=existing.toLocaleUpperCase('id-ID').split(/\s+/gu).filter(Boolean);
        const b=normalize(value).toLocaleUpperCase('id-ID').split(/\s+/gu).filter(Boolean);
        const found=a.filter(w=>b.includes(w)).length;
        if(a.length>=4 && b.length>=a.length+2 && found/a.length>=.75 && !/\b(?:OLEH|NIM|FAKULTAS|UNIVERSITAS)\b/iu.test(value)){
          result.judul=value;improvedTitle=true;continue;
        }
      }
      inconsistent.push(key);
    }
  }
  const logoLines=normalizedLines(zoneText.logo||'');
  if(logoLines.length){
    const readable=logoLines.join(' ').toLocaleUpperCase('id-ID');
    if(institutionLooksIncomplete(result.universitas))result.warnings.push('Nama kampus belum lengkap. Teks logo yang terbaca sebagai pembanding: '+readable.slice(0,110)+'. Periksa manual, jangan otomatis diganti.');
    else if(/AL\s+MUJTAMA/iu.test(readable)&&!/AL\s+MUJTAMA/iu.test(result.universitas))result.warnings.push('Tulisan logo AL MUJTAMA berbeda dari kolom kampus. Periksa foto asli.');
  }
  if(improvedTitle)result.warnings.push('Judul utama tampak terpotong; diganti dengan pembacaan zona yang lebih lengkap. WAJIB periksa foto asli.');
  if(recovered)result.warnings.push(`${recovered} kolom kosong berhasil diisi dari OCR per zona. Mohon verifikasi.`);
  if(inconsistent.length)result.warnings.push(`Perbedaan pembacaan halaman vs zona (${inconsistent.join(', ')}). Periksa foto asli; aplikasi tidak menebak versi mana yang benar.`);
  const confidence=Number(confidences.full);
  if(Number.isFinite(confidence) && confidence>=0 && confidence<60)result.warnings.push(`OCR halaman memiliki tingkat keyakinan rendah (${Math.round(confidence)}%). Periksa setiap huruf.`);
  result.bahasa=coverLanguage({...result,bahasa:'auto'});
  result.title_segments=result.judul?[{text:result.judul,italic:false}]:[];
  // Jangan melakukan normalisasi NIM berdasar jumlah digit kampus karena bisa mengubah data.
  return result;
}

/** Deterministic local fields extraction; review fields before production. */
function compact(str){return String(str??'').replace(/\s+/gu,' ').trim();}
const TYPES=/^(SKRIPSI|TESIS|THESIS|DISERTASI|DISSERTATION|MAKALAH|LAPORAN(?:\s+(?:AKHIR|PENELITIAN|MAGANG))?|TUGAS AKHIR|KARYA TULIS ILMIAH|PROPOSAL(?:\s+PENELITIAN)?)$/iu;
const MONTHS='JANUARI|FEBRUARI|MARET|APRIL|MEI|JUNI|JULI|AGUSTUS|SEPTEMBER|OKTOBER|NOVEMBER|DESEMBER|JANUARY|FEBRUARY|MARCH|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER';
export function categorize(lines, hints=[]){
 const txt=lines.map(compact).filter(Boolean), warnings=[...hints];
 const upper=txt.map(x=>x.toLocaleUpperCase('id-ID'));
 const findIndex=(re)=>upper.findIndex(s=>re.test(s));
 const getAfter=(index,re)=>{if(index<0)return '';const str=txt[index].replace(re,'').trim().replace(/^[:.\-–\s]+/u,'');return str||txt[index+1]||'';};
 const kindIndex=findIndex(TYPES);const kind=kindIndex>=0?txt[kindIndex]:'';
 const nimIndex=findIndex(/\bN\s*\.?\s*I\s*\.?\s*M\s*\.?\s*[:.\s-]*\d{6,20}/iu);
 let nim='';if(nimIndex>=0)nim=(upper[nimIndex].match(/\bN\s*\.?\s*I\s*\.?\s*M\s*\.?\s*[:.\s-]*(\d{6,20})/iu)||[])[1]||'';
 const olehIndex=findIndex(/^(?:OLEH\s*:?|OLEH\s+.+)$/u);
 let nama=olehIndex>=0?getAfter(olehIndex,/^OLEH\s*:?\s*/iu):'';
 if(nama&&/^(NIM|NAMA|SKRIPSI|TESIS)/iu.test(nama))nama='';
 if(!nama){const namaIndex=findIndex(/^NAMA\s*[:.]/u);if(namaIndex>=0)nama=getAfter(namaIndex,/^NAMA\s*[:.]\s*/iu);}
 const prodiIndex=findIndex(/^(?:PROGRAM\s+STUDI|PRODI|JURUSAN)\b/iu);
 const fakultasIndex=findIndex(/^FAKULTAS\b/iu);
 const universitasIndex=findIndex(/^(?:UNIVERSITAS|INSTITUT|SEKOLAH TINGGI|POLITEKNIK|UIN|IAIN|STAIN)\b/iu);
 const prodi=getAfter(prodiIndex,/^(?:PROGRAM\s+STUDI|PRODI|JURUSAN)\s*:?\s*/iu);
 const fakultas=getAfter(fakultasIndex,/^FAKULTAS\s*:?\s*/iu);
 const universitas=universitasIndex>=0?txt[universitasIndex]:'';
 let date='';for(let i=upper.length-1;i>=0;i--){if(new RegExp(`^(?:${MONTHS})\\s+\\d{4}$|^\\d{4}$`,'iu').test(upper[i])){date=txt[i];break;}}
 let titleCandidates=txt.slice(0,kindIndex>=0?kindIndex:Math.min(5,txt.length));
 titleCandidates=titleCandidates.filter(s=> !/^UNIVERSITAS|^UIN |^KEMENTERIAN |^OLEH\b/iu.test(s));
 const judul=compact(titleCandidates.join(' '));
 const missing=[['judul',judul],['nama',nama],['nim',nim],['prodi',prodi],['fakultas',fakultas],['universitas',universitas],['jenis_dokumen',kind],['bulan_tahun',date]].filter(([,v])=>!v).map(([k])=>k);
 if(missing.length)warnings.push('Periksa kolom belum terdeteksi: '+missing.join(', ')+'. Ekstraksi lokal tidak menebak isinya.');
 warnings.push('Teks PDF/Word dibaca tanpa Gemini. Periksa italic dan ejaan pada editor sebelum ekspor.');
 return {judul,nama,nim,prodi,fakultas,universitas,jenis_dokumen:kind,bulan_tahun:date,bulan:(date.match(new RegExp(MONTHS,'iu'))||[])[0]||'',tahun:(date.match(/\d{4}/u)||[])[0]||'',title_segments:judul?[{text:judul,italic:false}]:[],warnings};
}

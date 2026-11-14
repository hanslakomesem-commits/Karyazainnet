/**
 * ZAIN.NET V4.23 • Cover CD, measured from the five-page Word reference.
 * Source page: 137.02 × 137.02 mm. Coordinates in PDF points measured from TOP.
 * Does not use a hard-cover spine or a thickness setting.
 */
export const CD_PAGE_MM=137.0188888889;
export const CD_PAGE_PT=CD_PAGE_MM*72/25.4;
export const CD_LAYOUT=Object.freeze({
  centerX:187.1,
  nameTop:61.0,nimTop:71.3,
  studyTop:92.0,dateTop:102.4,
  leftLogo:{left:47.35,top:150.25,width:85.65,height:93.75},
  rightLogo:{left:227.2,top:150.6,width:85.45,height:92.95},
  titleTop:254.2,titleMaxBottom:321.0,
  maxTextWidth:322.0,titleMaxWidth:210.0,
  titleSize:9,titleMinSize:7.0,titlePitchRatio:1.15
});
export function assertCDData(data){
 const missing=['nama','nim','judul'].filter(k=>!String(data?.[k]??'').trim());
 if(missing.length)throw new Error('Cover CD memerlukan '+missing.join(', '));
 for(const k of ['nama','nim','judul','prodi','bulan_tahun']){
  const txt=String(data[k]??'');
  if(txt.length>1700)throw new Error('Teks '+k+' terlalu panjang untuk cover CD.');
  if(/[\u0600-\u06FF]/u.test(txt))throw new Error('Teks Arab kanan-ke-kiri belum didukung untuk cover CD.');
 }
 return true;
}
function wrapAtWidth(text,size,widthOf,maxWidth){
 const words=String(text).trim().replace(/\s+/gu,' ').split(' ').filter(Boolean);
 if(words.some(w=>widthOf(w,size)>maxWidth))return null;
 const rows=[];let row='';
 for(const w of words){const proposed=row?row+' '+w:w;
  if(row && widthOf(proposed,size)>maxWidth){rows.push(row);row=w;}
  else row=proposed;
 }
 if(row)rows.push(row);
 return rows;
}
export function computeCDTitle(text,widthOf,layout=CD_LAYOUT){
 const cleaned=String(text??'').replace(/\s+/gu,' ').trim();
 if(!cleaned)throw new Error('Judul cover CD kosong.');
 if(typeof widthOf!=='function')throw new Error('Pengukur font PDF belum tersedia.');
 for(let size=layout.titleSize;size>=layout.titleMinSize-.001;size=Math.round((size-.25)*100)/100){
  const lines=wrapAtWidth(cleaned,size,widthOf,layout.titleMaxWidth);
  if(!lines)continue;
  const pitch=size*layout.titlePitchRatio;
  if(layout.titleTop+(lines.length-1)*pitch+size<=layout.titleMaxBottom+.01)
   return {lines,size,pitch,top:layout.titleTop};
 }
 throw new Error('Judul Cover CD terlalu panjang untuk area di bawah dua logo, bahkan pada 7 pt. Periksa judul sebelum cetak.');
}
export function getCDLabel(mode){return mode==='covercd'?'COVER CD • 137 × 137 mm':null;}

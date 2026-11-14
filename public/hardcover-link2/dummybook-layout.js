/** ZAIN.NET V4.21 — Dummybook one-piece 420×297mm spread.
 * Geometry measured from the user's "contoh dummy book terbaru.pdf", pages 1–6.
 * Only the first six reference pages (spines 5..10 mm) are used.
 * Source pages retain original front cover art, crop marks and guides.
 */
export const DUMMY_SIZES=Object.freeze([5,6,7,8,9,10]);
export const DUMMY_PAGE=Object.freeze({
 widthPt:420*72/25.4,heightPt:297*72/25.4,
 backXPt:174.8,backWidthPt:300,backTopPt:264,backBottomPt:579,
 frontCenterPt:880.4,titleTopPt:106.3,titleBottomPt:174.5,
 spineTitleTopPt:290,spineTitleBottomPt:550,spineTitleCenterPt:418,
});
const refs=[
 [594.8155,608.9888],[592.2643,609.2722],[589.1462,608.9888],
 [586.5951,609.2722],[583.4769,608.9888],[580.9258,609.2722]
];
export function dummySpineGeometry(mm){
 mm=Number(mm);if(!DUMMY_SIZES.includes(mm))throw Error('Punggung Dummybook hanya 5–10 mm');
 const page=mm-5,[left,right]=refs[page],widthPt=right-left;
 if(Math.abs(widthPt*25.4/72-mm)>.06)throw Error('Ukuran punggung tidak cocok dengan PDF referensi');
 return {mm,left,right,center:(left+right)/2,widthPt,page};
}
export function wrapByMetrics(text,size,maxWidth,widthFn){
 const words=String(text||'').trim().split(/\s+/u).filter(Boolean),rows=[];
 let current='';
 for(const word of words){
  if(widthFn(word,size)>maxWidth+.05)throw Error(`Kata abstrak terlalu panjang untuk lebar halaman: ${word}`);
  const next=current?current+' '+word:word;
  if(current&&widthFn(next,size)>maxWidth){rows.push(current);current=word;}
  else current=next;
 }
 if(current)rows.push(current);
 return rows;
}
/** Select only intact final paragraphs. No rewriting, invented sentences or truncation.
 * Prefer 2 last paragraphs, 3 if 2 leave an awkward empty area,
 * 1 only if 2 cannot fit at a legible font size.
 */
export function chooseDummyBackText(paragraphs,widthFn,{
 width=DUMMY_PAGE.backWidthPt,top=DUMMY_PAGE.backTopPt,bottom=DUMMY_PAGE.backBottomPt,
 minFont=9,maxFont=11,minGoodLines=11
}={}){
 const ps=(paragraphs||[]).map(p=>String(p||'').replace(/\s+/gu,' ').trim()).filter(Boolean);
 if(!ps.length)throw Error('Paragraf abstrak belum tersedia. Unggah skripsi PDF/Word yang mengandung ABSTRAK atau tempel manual.');
 if(ps.length>50)throw Error('Terdeteksi terlalu banyak paragraf. Periksa batas abstrak dan kata kunci.');
 const make=(count,size)=>{
  const chosen=ps.slice(-count),lines=chosen.map(p=>wrapByMetrics(p,size,width,widthFn));
  const linePitch=size*1.4,gap=size*.74;
  const totalLines=lines.reduce((a,b)=>a+b.length,0);
  const height=totalLines*linePitch+(lines.length-1)*gap;
  return {paragraphs:chosen,lines,paragraphCount:chosen.length,size,linePitch,gap,
   height,totalLines,fits:height<=bottom-top-4};
 };
 let two=null, three=null,one=null;let trouble='';
 const sizes=[];for(let s=maxFont;s>=minFont-.01;s=Math.round((s-.25)*100)/100)sizes.push(s);
 const pick=(count)=>{
  for(const size of sizes){try{const v=make(count,size);if(v.fits)return v;}catch(e){trouble=e.message;}}
  return null;
 };
 two=pick(Math.min(2,ps.length));
 if(two){
  if(ps.length>=3&&two.totalLines<minGoodLines){
   three=pick(3);
   if(three&&three.totalLines<=25)return {...three,reason:'Dua paragraf terlalu pendek; dipilih tiga paragraf terakhir.'};
  }
  return {...two,reason:'Dua paragraf terakhir sesuai area belakang.'};
 }
 if(ps.length>=2){one=pick(1);if(one)return {...one,reason:'Dua paragraf tidak muat; dipilih satu paragraf terakhir.'};}
 throw Error('Abstrak terlalu panjang untuk area belakang Dummybook. '+(trouble||'')+' Teks tidak dipotong atau diringkas.');
}

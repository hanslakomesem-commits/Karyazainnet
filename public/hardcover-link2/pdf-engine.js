/**
 * ZAIN.NET PDF engine, static-browser GitHub Pages edition V4.44.
 * For colored covers, generate a NEW uniform DeviceRGB background and vector trim lines; never overlay the old marked PDF.
 * Plain marks are reconstructed only in the final V4.38 cleanup; layouts keep original geometry.
 * Important: Tinos is not the commercial Times New Roman face used in the
 * supplied PDF. Production printing still requires a proof and font review.
 */
import {colorGuideGeometry, SOURCE_SPINE, mmPoint} from './guide-geometry.js';
import {threeLineReferenceStatus, withinSpine} from './color-spine-profile.js';
import {getAutomaticUnicodeFonts,getAutomaticUnicodeRegular} from './font-unicode.js';
import {getDummyArialFontBytes} from './font-arial-compatible.js';
import {DUMMY_SIZES,DUMMY_PAGE,dummySpineGeometry,chooseDummyBackText} from './dummybook-layout.js';
import {IPS_SIZES,IPS_REFERENCE,ipsSpineGeometry} from './soft-ips-layout.js';
import {CD_PAGE_MM,CD_PAGE_PT,CD_LAYOUT,assertCDData,computeCDTitle} from './cover-cd-layout.js';
import {canonicalUniversity,plainCoverIdentity,normalizeCoverAcademicIdentity} from './classifier.js';
import {PLAIN_V1,PLAIN_V2,PLAIN_V11,PLAIN_V22,PLAIN_VARIANTS,PLAIN_215_VARIANTS,plainFrontLayout,plainFrontFits} from './plain-variant-layout.js';
const {PDFDocument, StandardFonts, degrees, rgb}=globalThis.PDFLib||{};
const ALL=Array.from({length:19},(_,i)=>i+10);
let LAYOUT=null,MASTER=null,COLOR_LOGO=null,UNIRA_MASTER=null,UNIRA_LOGO=null,UIM_LOGO=null,DUMMY_MASTER=null,IPS_MASTER=null;
const pagePt={width:483*72/25.4,height:330*72/25.4};
const PLAIN_PRINT_MM={width:480,height:330};
const COLOR_PRINT_MM={width:475,height:320};
const UNIRA_PRINT_MM={width:484,height:330};
const UIM_PRINT_MM={width:475,height:320};
const DUMMY_PRINT_MM={width:420,height:297};
const IPS_PRINT_MM={width:330,height:210};
const CD_PRINT_MM={width:CD_PAGE_MM,height:CD_PAGE_MM};
const mmPt=(v)=>v*72/25.4;
// Exact production colors. MAROON = #8B0000 (RGB 139,0,0).
const MAROON=rgb?.(139/255,0,0);
const YELLOW=rgb?.(1,242/255,0); // #FFF200, drawn as vector (not inherited from a PDF)
const BLACK=rgb?.(0,0,0);
let userFontBold=null,userFontItalic=null;
export function setUserFonts(bold,italic){userFontBold=bold||null;userFontItalic=italic||null;}
async function loadAsset(url,kind='bytes'){
 const controller=new AbortController();const id=setTimeout(()=>controller.abort(),25000);
 try{const r=await fetch(new URL(url,import.meta.url),{signal:controller.signal});if(!r.ok)throw Error(`HTTP ${r.status} ${url}`);return kind==='json'?await r.json():new Uint8Array(await r.arrayBuffer());}
 finally{clearTimeout(id);}
}
async function ensureAssets(){
 if(LAYOUT&&MASTER&&COLOR_LOGO&&UNIRA_MASTER&&UNIRA_LOGO&&UIM_LOGO)return;
 if(!PDFDocument)throw Error('Pustaka pdf-lib gagal dimuat. Cek internet untuk memuat pustaka statis CDN, kemudian refresh.');
 const [lo,ma,colorLogo,uimLogo,unira,uniraLogo]=await Promise.all([
  loadAsset('./assets/layout.json','json'),loadAsset('./assets/masters.pdf'),loadAsset('./uin_madura_logo_clean.png?v=4.44'),loadAsset('./uim_logo_clean.png?v=4.44'),loadAsset('./assets/unira_clean.pdf'),loadAsset('./assets/unira_logo_custom.png?v=4.22')]);
 LAYOUT=lo.templates;MASTER=ma;COLOR_LOGO=colorLogo;UIM_LOGO=uimLogo;UNIRA_MASTER=unira;UNIRA_LOGO=uniraLogo;
}
export async function checkAssets(){await ensureAssets();return {thicknesses:ALL};}
const NEAR=0.18;
const LATIN_CHECK=/[\u0600-\u06ff\u0750-\u077f]/u;

export class PDFPreflightError extends Error {constructor(msg){super(msg);this.status=422;this.name='PDFPreflightError';}}
export const thicknesses=ALL;
export const calibration=LAYOUT;
function fail(msg){throw new PDFPreflightError(msg);}
function norm(s){return String(s??'').replace(/\s+/gu,' ').trim();}
function upper(s){return norm(s).toLocaleUpperCase('id-ID');}
// V4.44: Word/photo input may omit the program. Null is automatic;
// an explicit empty string is a user's request to remove this line.
export function resolveProgramJenjang(data,mode){
 const institution=upper(canonicalUniversity(data?.universitas||''));
 const isUim=institution==='UNIVERSITAS ISLAM MADURA'||institution==='UIM';
 const defaultUim=mode==='uim'||mode==='customlogo1'||(['custom','customlogo2','merah','maroon'].includes(mode)&&isUim);
 const entered=data?.program_jenjang;
 const value=entered===null||entered===undefined?(defaultUim?'PROGRAM MAGISTER (S2)':''):norm(entered);
 if(value.length>120)fail('Program/Jenjang maksimal 120 karakter.');
 if(value.includes('\u00ad')||LATIN_CHECK.test(value))fail('Kolom Program/Jenjang berisi karakter yang belum didukung.');
 return upper(value);
}
function normalizeTitleSegments(data){
 const title=String(data.judul??'');
 if(!title.trim())fail('Kolom judul kosong.');
 let segs=Array.isArray(data.title_segments)?data.title_segments:Array.isArray(data.titleSegments)?data.titleSegments:null;
 if(!segs?.length)segs=[{text:title,italic:false}];
 segs=segs.map(x=>({text:String(x.text??''),italic:!!x.italic}));
 if(segs.map(x=>x.text).join('')!==title)fail('Format italic dan isi judul belum sinkron. Periksa kembali editor judul.');
 return segs;
}
function validate(data,thickness){
 if(!data||typeof data!=='object')fail('Data cover tidak valid.');
 if(!ALL.includes(Number(thickness)))fail('Pilihan ketebalan tidak tersedia di master PDF.');
 for(const name of ['judul','nama','nim','prodi','universitas','jenis_dokumen','bulan_tahun']){
  if(!String(data[name]??'').trim())fail(`Kolom ${name} belum diisi.`);
  if(String(data[name]).length>2000)fail(`Kolom ${name} terlalu panjang.`);
  if(String(data[name]).includes('\u00ad'))fail(`Kolom ${name} mengandung soft hyphen (U+00AD). Koreksi manual sebelum ekspor.`);
  if(LATIN_CHECK.test(String(data[name])))fail('Aksara Arab langsung belum didukung engine PDF Node ini. Transliterasi Arab-Latin dapat digunakan.');
 }
 // Kota dan fakultas opsional; tetap periksa karakter jika diisi.
 if(norm(data.kota)){
  if(String(data.kota).length>100)fail('Kolom kota terlalu panjang.');
  if(LATIN_CHECK.test(String(data.kota)))fail('Aksara Arab pada kolom kota belum didukung.');
 }
 if(norm(data.fakultas)){
  if(String(data.fakultas).length>2000)fail('Kolom fakultas terlalu panjang.');
  if(String(data.fakultas).includes('\u00ad'))fail('Kolom fakultas mengandung soft hyphen (U+00AD).');
  if(LATIN_CHECK.test(String(data.fakultas)))fail('Aksara Arab langsung pada kolom fakultas belum didukung.');
 }
 return normalizeTitleSegments(data);
}

/** Embed Unicode fonts in every generated PDF; no silent character replacement. */
async function getFonts(pdf,warnings=[]){
 let boldBytes=userFontBold,italicBytes=userFontItalic;
 let source='font milik pengguna';
 if(!(boldBytes&&italicBytes)){
  const automatic=await getAutomaticUnicodeFonts(message=>{
   try{globalThis.dispatchEvent?.(new CustomEvent('zainnet-font-status',{detail:message}));}catch{}
  });
  boldBytes=automatic.bold;italicBytes=automatic.italic;
  source='Tinos Unicode otomatis';
 }
 const kit=globalThis.fontkit||globalThis.Fontkit;
 if(!kit)fail('Komponen fontkit gagal dimuat. Periksa jaringan CDN atau refresh website. Font Unicode tidak dapat digunakan tanpa komponen ini.');
 pdf.registerFontkit(kit);
 try{
  const [bold,italic]=await Promise.all([
   pdf.embedFont(boldBytes,{subset:true}),pdf.embedFont(italicBytes,{subset:true})
  ]);
  const boldSet=new Set(bold.getCharacterSet()), italicSet=new Set(italic.getCharacterSet());
  try{globalThis.dispatchEvent?.(new CustomEvent('zainnet-font-status',{detail:`Font Unicode aktif: ${source}. Siap membuat PDF.`}));}catch{}
  warnings.push(`Font PDF: ${source}. Pastikan tampilan sesuai contoh sebelum cetak.`);
  return {bold:[{font:bold,face:{hasGlyphForCodePoint:cp=>boldSet.has(cp)}}],
          italic:[{font:italic,face:{hasGlyphForCodePoint:cp=>italicSet.has(cp)}}]};
 }catch(err){fail('Font Unicode tidak berhasil ditanamkan ke PDF: '+String(err.message||err)+'. Gunakan TTF/OTF yang valid atau coba ulang saat jaringan stabil.');}
}
function chars(str){return Array.from(str);}
function selectGlyph(fonts,style,ch){
 const wanted=style?'italic':'bold';
 const cp=ch.codePointAt(0);
 // The bundled latin-ext fallback is only chosen when the primary lacks glyph.
 const chosen=fonts[wanted].find(e=>e.face.hasGlyphForCodePoint(cp));
 if(!chosen)fail(`Karakter ${ch} (U+${cp.toString(16).toUpperCase()}) belum didukung oleh font Unicode aktif. Pilih font TTF/OTF yang memiliki karakter ini, tanpa mengubah teks sumber.`);
 return chosen;
}
function runs(fonts,text,italic){
 const result=[];
 for(const ch of chars(text)){
  const ff=selectGlyph(fonts,italic,ch);
  if(result.length && result.at(-1).ff===ff)result.at(-1).text+=ch;
  else result.push({ff,text:ch,italic});
 }
 return result;
}
function pieces(fonts,segs){
 const result=[];
 for(const s of segs){
  for(const item of runs(fonts,String(s.text),!!s.italic)){
   if(result.length&&result.at(-1).ff===item.ff)result.at(-1).text+=item.text;
   else result.push(item);
  }
 }
 return result;
}
function measure(fonts,segs,size){return pieces(fonts,segs).reduce((a,x)=>a+x.ff.font.widthOfTextAtSize(x.text,size),0);}
function renderLine(page,fonts,segs,size,cx,baseline,vertical=false,ink=BLACK){
 const line=pieces(fonts,segs);
 const width=line.reduce((a,r)=>a+r.ff.font.widthOfTextAtSize(r.text,size),0);
 let position=baseline-width/2;
 if(!vertical){
  let x=cx-width/2;
  for(const part of line){page.drawText(part.text,{x,y:page.getHeight()-baseline,font:part.ff.font,size,color:ink});x+=part.ff.font.widthOfTextAtSize(part.text,size);}
 }else{
  for(const part of line){page.drawText(part.text,{x:cx,y:page.getHeight()-position,font:part.ff.font,size,rotate:degrees(270),color:ink});position+=part.ff.font.widthOfTextAtSize(part.text,size);}
 }
 return width;
}
function tokensFromSegments(segs){
 const t=[];for(const s of segs){for(const x of String(s.text).match(/\S+|\s+/gu)||[]){
   if(x.trim())t.push({text:x,italic:s.italic});else t.push({text:' ',italic:false});
 }}
 while(t[0]?.text===' ')t.shift();while(t.at(-1)?.text===' ')t.pop();
 return t;
}
function sliceTokens(tokens,a,b){
 const arr=tokens.slice(a,b);
 while(arr[0]?.text===' ')arr.shift();while(arr.at(-1)?.text===' ')arr.pop();
 return arr;
}
function greedyLines(fonts,segs,size,maxWidth){
 const tokens=tokensFromSegments(segs);let lines=[],current=[];
 const save=()=>{if(current.length){lines.push(sliceTokens(current,0,current.length));current=[];}};
 for(const t of tokens){
  if(!current.length&&t.text===' ')continue;
  if(current.length&&t.text!==' '&&measure(fonts,[...current,t],size)>maxWidth){save();}
  current.push(t);
  if(measure(fonts,current,size)>maxWidth+NEAR&&current.length===1)fail(`Kata ${t.text} tidak muat pada bagian depan.`);
 }
 save();return lines;
}
function frontTitle(fonts,segs,config,data,warnings){
 const sample=norm(config.sample_title);
 if(norm(data.judul).toLowerCase()===sample.toLowerCase() && !segs.some(s=>s.italic) && Array.isArray(config.sample_title_lines)){
  return {lines:config.sample_title_lines.map(text=>[{text,italic:false}]),size:12};
 }
 for(let sz=12;sz>=9.2-1e-5;sz=Math.round((sz-.2)*10)/10){
  const rows=greedyLines(fonts,segs,sz,375);
  if(rows.length<=7){if(sz<12)warnings.push(`Ukuran font judul depan turun ke ${sz.toFixed(1)} pt.`);return {lines:rows,size:sz};}
 }
 fail('Judul cover depan melebihi area yang tersedia pada template Serli; PDF tidak dibuat.');
}
export function spineRows(fonts,segs,size,maxLen,maxRows,minRows=1){
 const toks=tokensFromSegments(segs); if(!toks.length)fail('Judul punggung kosong.');
 const words=[];let acc=[];
 for(const t of toks){if(t.text===' '){if(acc.length){words.push(acc);acc=[];}} else acc.push(t);}
 if(acc.length)words.push(acc);
 const n=words.length;
 const combine=(start,end)=>{
  const parts=[];
  for(let i=start;i<end;i++){
   if(i>start)parts.push({text:' ',italic:false});
   parts.push(...words[i]);
  }
  return parts;
 };
 // Keep the most balanced valid line lengths, do not split words or diacritics.
 for(let lines=Math.min(minRows,n);lines<=Math.min(3,maxRows,n);lines++){
  let best=null;
  const check=(edges)=>{
   const result=[]; const lens=[];
   for(let i=0;i<edges.length-1;i++){
    const part=combine(edges[i],edges[i+1]);const len=measure(fonts,part,size);
    if(len>maxLen+NEAR)return;
    result.push(part);lens.push(len);
   }
   const max=Math.max(...lens),min=Math.min(...lens);
   const score=(max-min)**2 + 0.002*lens.reduce((a,v)=>a+v*v,0);
   if(!best||score<best.score)best={score,result};
  };
  if(lines===1)check([0,n]);
  if(lines===2){for(let a=1;a<n;a++)check([0,a,n]);}
  if(lines===3){for(let a=1;a<n-1;a++)for(let b=a+1;b<n;b++)check([0,a,b,n]);}
  if(best)return best.result;
 }
 fail(`Judul punggung tidak muat ${maxRows} baris dalam ${size} pt.`);
}
function spinePositions(size,mm,count,layout=LAYOUT?.[mm]){
 const c=layout,left=c.left,right=c.right;
 // Match the more stable colored-cover calibration a bit closer so the
 // plain spine rows stay visually centered between the two fold guides.
 const pitch=size*1.11;
 const span=(count-1)*pitch+(0.892-(-0.216))*size;
 if(span>right-left-.30+0.001)fail('Baris punggung akan melewati garis batas fisik.');
 const base=(left+right)/2-(0.892-.216)*size/2;
 return Array.from({length:count},(_,i)=>base+(count-1)*pitch/2-i*pitch);
}
/**
 * Visual-quality font selection. Never shrink a wide spine to 6 pt only
 * to preserve two lines when three lines of legible 9 pt would fit.
 *
 * 10–12 mm: prioritas 2 baris sampai 6 pt karena punggung sempit.
 * 13–22 mm: coba 2 baris 9 dan 8 pt, kemudian 3 baris 9 pt.
 * 23–28 mm: utamakan keterbacaan 9 pt: coba 2 baris 9 pt, lalu
 *           3 baris 9 pt SEBELUM mengecilkan ke 8/7/6 pt.
 *
 * Three lines are NEVER chosen if two lines fit at 9 pt. The trade-off
 * for other widths is explicit and tested.
 */
export function spineRowPreferences(base,minFont=6,thicknessMm=10){
 const sizes=[];
 for(let s=base;s>=minFont;s--)sizes.push(s);
 if(thicknessMm<=12){
  return [...sizes.map(size=>({rows:2,size})),...sizes.map(size=>({rows:3,size}))];
 }
 if(thicknessMm>=23){
  return sizes.flatMap(size=>[{rows:2,size},{rows:3,size}]);
 }
 // Moderate widths: retain 2 lines down to 8 pt, then prefer 9pt 3-lines
 // over reducing to 7 or 6pt just for the two-line target.
 const result=[];
 for(const size of sizes){
  if(size===base)result.push({rows:2,size});
  else if(size===base-1)result.push({rows:2,size});
 }
 result.push({rows:3,size:base});
 for(const size of sizes.filter(n=>n<=base-2)){
  result.push({rows:2,size});
  const previous=size+1;
  if(previous<base)result.push({rows:3,size:previous});
 }
 result.push({rows:3,size:minFont});
 // No repeated choices; maintain order.
 return result.filter((c,i,a)=>a.findIndex(x=>x.rows===c.rows&&x.size===c.size)===i);
}
/** The Serli references have a different calibrated center at several
 * thicknesses (e.g. 14-16 mm vs 17-18 mm). The values already exist in
 * assets/layout.json, extracted from the user's original reference pages.
 * NEVER add an arbitrary constant +6pt (the V4.15 regression).
 * Coordinate y is measured from the TOP of the 483x330mm source PDF.
 * The physical print master is rescaled to 480x330mm only after rendering.
 */
export const PLAIN_SPINE_TITLE_SAFE_TOP_PT=76;
export const PLAIN_SPINE_TITLE_SAFE_BOTTOM_PT=513;
export const PLAIN_SPINE_TITLE_MARGIN_PT=1.0;
export function plainSpineTitleGeometry(lengthsPt,layout){
 if(!layout||!Number.isFinite(layout.spine_title_center_y)||
     !Number.isFinite(layout.left)||!Number.isFinite(layout.right)||layout.right<=layout.left){
   throw new PDFPreflightError('Kalibrasi posisi punggung polos tidak valid.');
 }
 if(!Array.isArray(lengthsPt)||lengthsPt.length<1||lengthsPt.length>3||
     lengthsPt.some(len=>!Number.isFinite(len)||len<=0)){
   throw new PDFPreflightError('Panjang baris punggung polos tidak valid.');
 }
 const centerTopPt=layout.spine_title_center_y;
 const topPt=lengthsPt.map(len=>centerTopPt-len/2);
 const bottomPt=lengthsPt.map(len=>centerTopPt+len/2);
 const safe=topPt.every(v=>v>=PLAIN_SPINE_TITLE_SAFE_TOP_PT+PLAIN_SPINE_TITLE_MARGIN_PT)&&
   bottomPt.every(v=>v<=PLAIN_SPINE_TITLE_SAFE_BOTTOM_PT-PLAIN_SPINE_TITLE_MARGIN_PT);
 return {centerTopPt,topPt,bottomPt,safe,
   topLimitPt:PLAIN_SPINE_TITLE_SAFE_TOP_PT,
   bottomLimitPt:PLAIN_SPINE_TITLE_SAFE_BOTTOM_PT};
}
export function chooseSpine(fonts,segs,mm,warnings,layout=LAYOUT?.[mm]){
 if(!layout)fail(`Data kalibrasi punggung ${mm} mm belum tersedia.`);
 const base=mm===10?8:9;
 const cy=layout.spine_title_center_y;
 if(!Number.isFinite(cy))fail(`Posisi punggung polos ${mm} mm tidak ditemukan.`);
 const maxLen=2*Math.min(cy-PLAIN_SPINE_TITLE_SAFE_TOP_PT,
                              PLAIN_SPINE_TITLE_SAFE_BOTTOM_PT-cy)-2*PLAIN_SPINE_TITLE_MARGIN_PT;
 for(const {rows,size} of spineRowPreferences(base,6,mm)){
  try{
   const result=spineRows(fonts,segs,size,maxLen,rows,rows);
   const xs=spinePositions(size,mm,result.length,layout);
   const geometry=plainSpineTitleGeometry(result.map(line=>measure(fonts,line,size)),layout);
   if(!geometry.safe)continue;
   if(result.length===3)warnings.push(`Judul punggung POLOS ${mm} mm memakai 3 baris pada ${size} pt agar tetap terbaca jelas.`);
   if(size<base)warnings.push(`Font judul punggung POLOS turun dari ${base} ke ${size} pt karena tidak muat pada ukuran lebih besar.`);
   return {result,xs,size,cy:geometry.centerTopPt,titleBoundsPt:{top:Math.min(...geometry.topPt),bottom:Math.max(...geometry.bottomPt)}};
  }catch(e){if(!(e instanceof PDFPreflightError))throw e;}
 }
 fail(`Judul tidak muat dalam zona aman punggung POLOS ${mm} mm (minimal 6 pt, maksimal 3 baris). Periksa judul sebelum dicetak.`);
}
export function nameUnderlineEnabled(data){return data?.nama_garis_bawah===true || data?.nama_garis_bawah==='true';}
function single(page,fonts,text,size,cx,y,maxWidth,label,warnings,minFont=size,rotated=false,ink=BLACK,underline=false){
 text=String(text).trim();
 let final=size;const natural=measure(fonts,[{text,italic:false}],size);
 if(natural>maxWidth){final=Math.floor((size*maxWidth/natural*.994)*100)/100;
   if(final<minFont)fail(`${label} terlalu panjang untuk area yang tersedia. Diperlukan ${final} pt; batas aman ${minFont} pt.`);
   warnings.push(`${label} disesuaikan dari ${size} menjadi ${final} pt.`);
 }
 const width=renderLine(page,fonts,[{text,italic:false}],final,cx,y,rotated,ink);
 if(underline&&!rotated){
  const uy=page.getHeight()-y-Math.max(.95,final*.135);
  page.drawLine({start:{x:cx-width/2,y:uy},end:{x:cx+width/2,y:uy},thickness:Math.max(.5,final*.052),color:ink});
 }
}

/** V4.27: Font TAHUN/BULAN-TAHUN untuk punggung Polos V1.
 * Jangan campur dengan font judul punggung yang tetap adaptif.
 * Master Serli memakai ukuran tahun kecil (7.28–10.92 pt); pengaturan
 * produksi baru meminta 12 pt untuk 12–28mm. Pada 10/11mm geser
 * baseline ke tengah punggung agar 10.5/11 pt tetap aman.
 * Koordinat Y tahun tidak berubah dari referensi master.
 */
export function plainSpineYearLayout(mm,layout){
 mm=Number(mm);
 if(!Number.isInteger(mm)||mm<10||mm>28||!layout||
     !Number.isFinite(layout.left)||!Number.isFinite(layout.right)||
     !Number.isFinite(layout.spine_year_x)||!Number.isFinite(layout.spine_year_y))
    throw new PDFPreflightError('Kalibrasi tahun punggung Polos tidak tersedia.');
 const size=mm===10?10.5:mm===11?11:12;
 const x=mm<=11?(layout.left+layout.right)/2:layout.spine_year_x;
 const margin=1.0;
 // Konservatif: ruang horizontal per sisi minimal 0.6 x font + 1 pt.
 if(x-layout.left<size*.6+margin || layout.right-x<size*.6+margin)
    throw new PDFPreflightError(`Tahun ${size} pt tidak muat di punggung Polos ${mm} mm.`);
 return {size,x,y:layout.spine_year_y,margin};
}

async function generatePlainPDF(data,mm,variant=PLAIN_V1){
 mm=Number(mm);const segs=validate(data,mm);const conf=LAYOUT[mm],warnings=[];
 const doc=await PDFDocument.create();const src=await PDFDocument.load(MASTER);
 if(src.getPageCount()!==ALL.length)fail('Jumlah master PDF tidak sama dengan konfigurasi 19 ukuran.');
 const [page]=await doc.copyPages(src,[conf.page]);doc.addPage(page);
 if(Math.abs(page.getWidth()-pagePt.width)>.55||Math.abs(page.getHeight()-pagePt.height)>.55)fail('Ukuran master bukan 483 × 330 mm.');
 const fonts=await getFonts(doc,warnings);
 for(const c of [...String(data.judul),...segs.map(s=>s.text)].join(''))if(LATIN_CHECK.test(c))fail('Aksara Arab belum mendukung shaping RTL.');
 const placement=plainFrontLayout(variant,conf);
 const identity=plainCoverIdentity(data);
 // V4.33: ONLY the additional 215mm Polos variants are re-centered.
 // Use the ACTUAL printed fold-to-trim interval, not the old 217mm
 // template's text anchor nor a relative shift calculated from old trim.
 // Source 483mm coordinates are converted to printed 480mm in resizePlainToPrint.
 if(PLAIN_215_VARIANTS.includes(variant)){
  const g=plain215TrimGeometry(mm,conf);
  const trueCenterPrinted=(g.foldRight+g.newRight)/2;
  const trueCenterSource=trueCenterPrinted/(480/483);
  placement.frontCX=trueCenterSource;
  placement.typeCX=trueCenterSource;
 }
 if(!plainFrontFits(placement))fail('Tata letak teks Polos akan saling menimpa. Periksa kalibrasi template.');
 const front=frontTitle(fonts,segs,conf,data,warnings);
 for(let i=0;i<front.lines.length;i++)renderLine(page,fonts,front.lines[i],front.size,placement.frontCX,placement.titleY+i*placement.titlePitch);
 single(page,fonts,upper(data.jenis_dokumen),17.8998,placement.typeCX,placement.typeY,240,'Jenis dokumen',warnings,13);
 single(page,fonts,identity.authorLabel,12,placement.frontCX,placement.labelY,180,'Label penulis',warnings,12);
 single(page,fonts,upper(data.nama),12,placement.frontCX,placement.nameY,400,'Nama depan',warnings,9,false,BLACK,nameUnderlineEnabled(data));
 single(page,fonts,`${conf.front_nim_prefix} ${norm(data.nim)}`,12,placement.frontCX,placement.nimY,390,'NIM',warnings,9);
 const hasCity=!!norm(data.kota),hasFaculty=!!norm(data.fakultas),lineGap=13.29;
 const shift=hasCity?lineGap:0;
 single(page,fonts,identity.prodiLine,12,placement.frontCX,(hasFaculty?placement.prodiY:placement.fakultasY)-shift,395,'Prodi',warnings,9);
 if(hasFaculty)single(page,fonts,identity.fakultasLine,12,placement.frontCX,placement.fakultasY-shift,395,'Fakultas',warnings,9);
 single(page,fonts,upper(canonicalUniversity(data.universitas)),12,placement.frontCX,placement.universitasY-shift,395,'Universitas',warnings,9);
 if(hasCity)single(page,fonts,upper(data.kota),12,placement.frontCX,placement.universitasY,395,'Kota kampus',warnings,9);
 single(page,fonts,upper(data.bulan_tahun),12,placement.frontCX,placement.tahunY,395,'Tanggal',warnings,9.5);
 // Polos V1 dan Polos V2 harus TIDAK menampilkan gambar logo.
 // Logo aset UIN/UNIRA tetap tersedia untuk Cover CD, Warna, dan UNIRA.
 const spine=chooseSpine(fonts,segs,mm,warnings);
 for(let i=0;i<spine.result.length;i++)renderLine(page,fonts,spine.result[i],spine.size,spine.xs[i],spine.cy??conf.spine_title_center_y,true);
 single(page,fonts,upper(data.jenis_dokumen),conf.spine_type_pt,conf.spine_type_x,conf.spine_type_y,135,'Jenis dokumen punggung',warnings,6,true);
 single(page,fonts,upper(data.nama),conf.spine_name_pt,conf.spine_name_x,conf.spine_name_y,175,'Nama punggung',warnings,6,true);
 const yearPlacement=(variant===PLAIN_V1||variant===PLAIN_V11)?plainSpineYearLayout(mm,conf):
   {size:conf.spine_year_pt,x:conf.spine_year_x,y:conf.spine_year_y};
 // Untuk V1 jangan mengecilkan tahun 12 pt secara diam-diam. Jika tulisan
 // terlalu panjang, minta koreksi manual daripada merusak standar cetak.
 single(page,fonts,upper(data.bulan_tahun),yearPlacement.size,yearPlacement.x,yearPlacement.y,
   (variant===PLAIN_V1||variant===PLAIN_V11)?145:115,'Tanggal punggung',warnings,
   (variant===PLAIN_V1||variant===PLAIN_V11)?yearPlacement.size:6,true);
 const bytes=await doc.save({useObjectStreams:true});
 // This is a structural preflight, NOT a substitute for a pixel-perfect print proof.
 const reopened=await PDFDocument.load(bytes);
 if(reopened.getPageCount()!==1)fail('PDF hasil harus terdiri dari tepat satu halaman.');
 const p=reopened.getPage(0);
 if(Math.abs(p.getWidth()-pagePt.width)>.55||Math.abs(p.getHeight()-pagePt.height)>.55)fail('PDF hasil tidak berukuran 483 × 330 mm.');
 return {bytes:new Uint8Array(bytes),warnings,details:{mm,spine_font_pt:spine.size,spine_lines:spine.result.length,spine_title_center_y:spine.cy??conf.spine_title_center_y,spine_title_bounds_pt:spine.titleBoundsPt,plain_variant:variant,front_logo:false,spine_year_font_pt:yearPlacement.size}};
}


/** Printed plain sizes are 480×330 mm per latest requirement. The source
 * Serli master is 483×330 mm; we only apply a 0.62% horizontal reduction to
 * preserve ALL of the original lines and crop marks within 480 mm.
 * This is disclosed in the README; a 480 mm native master is preferable
 * if a pixel-identical proof is required. */
async function resizePlainToPrint(bytes) {
 const d=await PDFDocument.create();
 const [ep]=await d.embedPdf(bytes);
 const page=d.addPage([mmPt(PLAIN_PRINT_MM.width),mmPt(PLAIN_PRINT_MM.height)]);
 page.drawPage(ep,{x:0,y:0,width:page.getWidth(),height:page.getHeight()});
 return new Uint8Array(await d.save({useObjectStreams:true}));
}

/** Additional Polos trims: keep the existing fold guides and print canvas,
 * move ONLY the two outer full-height trim marks inward so the distance
 * from outer trim to the nearest spine fold is exactly 215mm on BOTH sides.
 * Original source trim measured x=60.5pt (10mm) and 1320.12pt (all),
 * source master 483mm shrinks to 480mm in resizePlainToPrint.
 * Original V1/V2 side geometry remains, while V4.38 simplifies guides for ALL Polos.
 */
export function plain215TrimGeometry(mm,conf){
 const scale=480/483;
 const originalLeft=(60.50-(mm-10)*mmPt(1))*scale;
 const originalRight=1320.12*scale;
 const foldLeft=conf.left*scale, foldRight=conf.right*scale;
 const newLeft=foldLeft-mmPt(215),newRight=foldRight+mmPt(215);
 if(newLeft<2||newRight>mmPt(480)-2||newLeft<=originalLeft||newRight>=originalRight)
  throw new PDFPreflightError(`Garis potong 215mm pada Polos ${mm}mm melewati batas kertas atau master tidak sesuai.`);
 return {originalLeft,originalRight,newLeft,newRight,foldLeft,foldRight,
  leftPanelMM:(foldLeft-newLeft)/mmPt(1),rightPanelMM:(newRight-foldRight)/mmPt(1)};
}
/** Original small center marks on the LEFT/RIGHT panel come from the
 * Serli master at x=366.62 and 997.77 source pt, independently of spine mm.
 * They are NOT the spine folds (conf.left/right), which must remain visible.
 * All x coordinates below are scaled with the 483 -> 480 mm master conversion.
 */
export function plain215MarkCleanupGeometry(mm,conf){
 const g=plain215TrimGeometry(mm,conf),scale=480/483;
 return {...g,centerBack:366.62*scale,centerFront:997.77*scale,
   topTickEndFromTop:47.5,bottomTickStartFromTop:887.0,
   originalRightHorizontalLength:37.3*scale,originalLeftHorizontalLength:30.4*scale};
}
async function adjustPlain215Trim(bytes,mm,conf){
 const pdf=await PDFDocument.load(bytes);
 const page=pdf.getPage(0),g=plain215MarkCleanupGeometry(mm,conf);
 const paper=rgb(1,1,1),ink=rgb(0.1358,0.12105,0.1243);
 const pageHeight=page.getHeight(),pageWidth=page.getWidth();
 const yBottom=pageHeight-920.94,yTop=pageHeight-15.33;
 const cover=(x,y,width,height)=>page.drawRectangle({x,y,width,height,color:paper});
 // Clear the OLD two outer ticks (10-28mm). The new 215mm ticks are added
 // at the correct fold-to-trim coordinates. No full-height strokes are added.
 for(const x of [g.originalLeft,g.originalRight]){
   cover(x-2.3,yBottom-2,4.6,yTop-yBottom+4);
 }
 // Remove exactly four unwanted center-panel marks: 2 top + 2 bottom.
 // NEVER erase g.foldLeft/g.foldRight (genuine folding marks).
 // Original source center marks are around 31-33pt tall and 1.5pt wide.
 for(const x of [g.centerBack,g.centerFront]){
   cover(x-2.5,yTop-35,5,38);
   cover(x-2.5,yBottom-3,5,54);
 }
 // Existing horizontal edge strokes point to ORIGINAL 217mm cut ticks.
 // Remove the old short horizontal strokes at BOTH edges before redrawing
 // aligned to the NEW 215mm cut coordinates. Upper strokes at source y~46pt;
 // lower strokes at source y~888pt. Keep all print text and folds intact.
 for(const [x0,x1] of [
    [g.originalLeft-g.originalLeftHorizontalLength-2,g.originalLeft+3],
    [g.originalRight-3,Math.min(pageWidth,g.originalRight+g.originalRightHorizontalLength+3)]
 ]){
   const left=Math.max(0,x0),right=Math.min(pageWidth,x1);
   if(right>left){
     cover(left,yTop-35,right-left,7.5);
     cover(left,yBottom+27.5,right-left,8);
   }
 }
 // Four short vertical cut ticks at x=215mm fold-to-trim distance.
 // Source Serli has an offset in Y between vertical and horizontal crop lines;
 // preserve that design while matching their X coordinates precisely.
 const tickLengthPt=18;
 for(const x of [g.newLeft,g.newRight]){
   page.drawLine({start:{x,y:yTop},end:{x,y:yTop-tickLengthPt},thickness:.55,color:ink});
   page.drawLine({start:{x,y:yBottom},end:{x,y:yBottom+tickLengthPt},thickness:.55,color:ink});
 }
 // Short edge horizontal ticks meet the SAME X as the new vertical marks,
 // without the 1mm leftover from the old 217mm reference.
 const upperHorizontalY=yTop-31.2,lowerHorizontalY=yBottom+32.4;
 const segments=[
   [Math.max(0,g.newLeft-g.originalLeftHorizontalLength),g.newLeft],
   [g.newRight,Math.min(pageWidth,g.newRight+g.originalRightHorizontalLength)]
 ];
 for(const [left,right] of segments){
   if(right>left){
     page.drawLine({start:{x:left,y:upperHorizontalY},end:{x:right,y:upperHorizontalY},thickness:.55,color:ink});
     page.drawLine({start:{x:left,y:lowerHorizontalY},end:{x:right,y:lowerHorizontalY},thickness:.55,color:ink});
   }
 }
 return {bytes:new Uint8Array(await pdf.save({useObjectStreams:true})),geometry:g};
}


/** ZAIN.NET V4.38 — penanda potong Polos minimalis mengikuti update(1).pdf.
 * Berlaku untuk SEMUA empat varian Polos (217 dan 215), pada 10–28 mm.
 * Hanya strip kosong paling atas dan bawah yang dilapisi putih; teks tidak
 * berubah. Penanda lipatan punggung empat buah tetap ada dan berjarak benar.
 * Semua koordinat di bawah adalah point dalam PDF hasil 480 × 330 mm.
 * PDF acuan menampilkan garis vertikal sekitar 3,5 pt dan sudut L pendek;
 * referensi acuan 475 × 320 mm, jadi posisinya disesuaikan dengan master 480.
 */
export function plainMinimalGuideGeometry(mm,conf,variant){
 if(!PLAIN_VARIANTS.includes(variant))fail('Varian Polos penanda minimalis tidak dikenal.');
 if(!ALL.includes(Number(mm))||!conf||!Number.isFinite(conf.left)||!Number.isFinite(conf.right))
  fail('Ketebalan/kalibrasi penanda Polos tidak valid.');
 const scale=480/483;
 const trim215=PLAIN_215_VARIANTS.includes(variant)?plain215TrimGeometry(Number(mm),conf):null;
 const originalLeft=(60.50-(Number(mm)-10)*mmPt(1))*scale;
 const originalRight=1320.12*scale;
 const leftTrim=trim215?trim215.newLeft:originalLeft;
 const rightTrim=trim215?trim215.newRight:originalRight;
 // Pada master Serli empat penanda punggung: luar-kiri, lipatan kiri,
 // lipatan kanan, luar-kanan; keduanya tetap ada pada versi PDF fix.
 const spineMarks=[(conf.left-mmPt(10))*scale,conf.left*scale,conf.right*scale,(conf.right+mmPt(10))*scale];
 if(!(leftTrim>0&&rightTrim<mmPt(480)&&spineMarks.every((x,i)=>i===0||x>spineMarks[i-1])&&
      leftTrim<spineMarks[0]&&spineMarks[3]<rightTrim))
  fail('Penanda minimalis Polos berada di luar kertas atau saling bertumpuk.');
 return {leftTrim,rightTrim,spineMarks,verticalPt:3.5,cornerHorizontalPt:9.5,
  topBaselineFromTopPt:46.6,bottomBaselineFromBottomPt:46.9,
  panelTrimMM:trim215?215:217};
}
async function simplifyAllPlainGuides(bytes,mm,conf,variant){
 const g=plainMinimalGuideGeometry(mm,conf,variant);
 const pdf=await PDFDocument.load(bytes),page=pdf.getPage(0);
 const w=page.getWidth(),h=page.getHeight();
 if(Math.abs(w-mmPt(480))>.3||Math.abs(h-mmPt(330))>.3)
  fail('Penanda minimalis memerlukan master 480 × 330 mm.');
 const white=rgb(1,1,1),ink=rgb(0.1358,0.12105,0.1243);
 // Menghapus sekaligus 8 garis master lama per sisi atas/bawah:
 // 2 penanda sudut, 2 garis tengah panel kiri/kanan yang DIHILANGKAN,
 // serta 4 penanda punggung lama yang terlalu panjang. Area kosong
 // setinggi 65pt aman dari judul dan semua identitas (mulai di bawahnya).
 page.drawRectangle({x:0,y:h-65,width:w,height:65,color:white});
 page.drawRectangle({x:0,y:0,width:w,height:65,color:white});
 const top=h-g.topBaselineFromTopPt, bottom=g.bottomBaselineFromBottomPt;
 // Empat penanda punggung pendek, masing-masing atas & bawah.
 for(const x of g.spineMarks){
  page.drawLine({start:{x,y:top},end:{x,y:top+g.verticalPt},thickness:.95,color:ink});
  page.drawLine({start:{x,y:bottom},end:{x,y:bottom-g.verticalPt},thickness:.95,color:ink});
 }
 // Hanya dua sudut L di tepi kiri dan kanan; tidak ada tanda di tengah panel.
 for(const [x,sign] of [[g.leftTrim,-1],[g.rightTrim,+1]]){
  page.drawLine({start:{x,y:top},end:{x,y:top+g.verticalPt},thickness:.95,color:ink});
  page.drawLine({start:{x,y:bottom},end:{x,y:bottom-g.verticalPt},thickness:.95,color:ink});
  // Pada mm=28 garis luar kiri dekat tepi halaman: jangan pernah melewati kertas.
  const horizontalPt=Math.min(g.cornerHorizontalPt,sign<0?x-1:w-x-1);
  if(horizontalPt<3)fail('Garis sudut minimalis terlalu dekat tepi kertas.');
  page.drawLine({start:{x:x+sign*horizontalPt,y:top},end:{x,y:top},thickness:.95,color:ink});
  page.drawLine({start:{x:x+sign*horizontalPt,y:bottom},end:{x,y:bottom},thickness:.95,color:ink});
 }
 return {bytes:new Uint8Array(await pdf.save({useObjectStreams:true})),geometry:g};
}

const COLOR_TYPES=['merah','maroon','custom','customlogo1','customlogo2'];
export const coverTypes=[...PLAIN_VARIANTS,...COLOR_TYPES,'unira','uim','dummybook','softips','covercd','coverartikel'];
export const printSizes={polos:PLAIN_PRINT_MM,poloslogoatas:PLAIN_PRINT_MM,polosv11:PLAIN_PRINT_MM,polosv22:PLAIN_PRINT_MM,merah:COLOR_PRINT_MM,maroon:COLOR_PRINT_MM,custom:COLOR_PRINT_MM,customlogo1:UIM_PRINT_MM,customlogo2:COLOR_PRINT_MM,unira:UNIRA_PRINT_MM,uim:UIM_PRINT_MM,dummybook:DUMMY_PRINT_MM,softips:IPS_PRINT_MM,covercd:CD_PRINT_MM,coverartikel:COLOR_PRINT_MM};
export function validateCoverMode(mode,customColor) {
 const type=String(mode||'polos').toLowerCase();
 if(!coverTypes.includes(type))fail('Pilihan jenis cover tidak dikenal.');
 if(!['custom','customlogo1','customlogo2'].includes(type))return {type,color:null};
 const hex=String(customColor||'').trim();
 if(!/^#[0-9A-Fa-f]{6}$/.test(hex))fail('Pilih kode warna custom dalam format #RRGGBB.');
 return {type,color:hex.toUpperCase()};
}
function hexRgb(value) {
 const h=value.replace('#','');
 return rgb(parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255);
}
/** V4.40 — Logo kustom per pesanan. Anchor ditentukan dari PDF asli.
 * V1 / UIM: image rect x=917.6..1083.4, top=456.0..621.8 pt.
 * V2 / UIN maroon: x=893.51..1107.08, top=309.89..523.46 pt.
 * Pengaturan manual hanya lebar; rasio asli logo dan titik pusat tidak berubah.
 */
export const CUSTOM_LOGO_ANCHORS=Object.freeze({
 customlogo1:Object.freeze({centerX:1000.50,centerY:538.90,defaultWidthMm:58.5,topSafe:405,bottomSafe:715,leftSafe:800,rightSafe:1200}),
 customlogo2:Object.freeze({centerX:1000.29,centerY:416.67,defaultWidthMm:75.3,topSafe:286,bottomSafe:594,leftSafe:800,rightSafe:1200})
});
async function embedCustomCoverLogo(doc,page,mode,uploaded){
 const anchor=CUSTOM_LOGO_ANCHORS[mode];
 if(!anchor)fail('Varian logo custom tidak dikenal.');
 if(!uploaded?.bytes || !uploaded.bytes.byteLength)fail('Upload logo untuk '+(mode==='customlogo1'?'Custom Logo V1':'Custom Logo V2')+' terlebih dahulu (PNG/JPG/WebP).');
 const bytes=uploaded.bytes instanceof Uint8Array?uploaded.bytes:new Uint8Array(uploaded.bytes);
 if(bytes.length>8*1024*1024)fail('Logo lebih dari 8 MB. Gunakan PNG/JPG lebih kecil.');
 const mime=String(uploaded.mime||'').toLowerCase();
 const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
 const jpg=bytes[0]===255&&bytes[1]===216;
 if(!((mime==='image/png'&&png)||(mime==='image/jpeg'&&jpg)))fail('Logo tidak valid. Pilih PNG/JPG atau WebP yang dikonversi browser ke PNG.');
 const widthMm=Number(uploaded.widthMm??anchor.defaultWidthMm);
 if(!Number.isFinite(widthMm)||widthMm<10||widthMm>100)fail('Lebar logo manual harus 10–100 mm.');
 let logo;
 try{logo=png?await doc.embedPng(bytes):await doc.embedJpg(bytes);}catch(e){fail('Logo gagal dibaca sebagai gambar: '+String(e.message||e));}
 if(!logo.width||!logo.height)fail('Ukuran piksel logo tidak valid.');
 const width=mmPt(widthMm),height=width*logo.height/logo.width;
 const left=anchor.centerX-width/2,right=anchor.centerX+width/2;
 const top=anchor.centerY-height/2,bottom=anchor.centerY+height/2;
 if(top<anchor.topSafe||bottom>anchor.bottomSafe||left<anchor.leftSafe||right>anchor.rightSafe)
  fail(`Logo ${widthMm} mm terlalu besar/tinggi untuk posisi ${mode==='customlogo1'?'UIM':'UIN'} (tinggi otomatis ${(height/mmPt(1)).toFixed(1)} mm). Kecilkan lebar logo agar tidak menimpa teks.`);
 page.drawImage(logo,{x:left,y:page.getHeight()-bottom,width,height});
 return {width_mm:widthMm,height_mm:height/mmPt(1),center_x_pt:anchor.centerX,center_y_pt:anchor.centerY};
}
function splitFrontTitle(fonts,segs,maxWidth=405,maxRows=5){
 for(let pt=12;pt>=9.8-1e-6;pt=Math.round((pt-.2)*10)/10){
  const lines=greedyLines(fonts,segs,pt,maxWidth);
  if(lines.length<=maxRows)return {lines,size:pt};
 }
 fail('Judul cover depan warna terlalu panjang untuk maksimal lima baris di posisi asli. Periksa dan ringkas hanya bila sesuai naskah.');
}
/** Color 3-line title anchor calibrated from all 19 reference PDF pages.
 * PDF coordinates here are POINTS measured from the TOP of the page.
 * The other engine uses bottom-origin coordinates, so only renderLine()
 * converts a top-origin center to a PDF page drawing coordinate.
 */
export const COLOR_SPINE_TITLE_CENTER_TOP_PT=295.0;
export const COLOR_SPINE_TITLE_SAFE_TOP_PT=30*72/25.4;
export const COLOR_SPINE_TITLE_SAFE_BOTTOM_PT=181*72/25.4;
/**
 * Return true visual bounds for rotated title lines; useful both during
 * production and for tests. Each line has its own actual font advance width.
 * The engine draws each line centered on centerTopPt, not shifted by half its
 * advance twice. This fixes the title entering the top crop-mark region.
 */
export function calibrateColorSpineTitleRows(lengthsPt,centerTopPt=COLOR_SPINE_TITLE_CENTER_TOP_PT){
 if(!Array.isArray(lengthsPt)||!lengthsPt.length||lengthsPt.length>3||
     lengthsPt.some(w=>!Number.isFinite(w)||w<=0)||!Number.isFinite(centerTopPt)){
   throw new Error('Geometri judul punggung tidak valid.');
 }
 const topPt=lengthsPt.map(width=>centerTopPt-width/2);
 const bottomPt=lengthsPt.map(width=>centerTopPt+width/2);
 const safe=topPt.every(v=>v>=COLOR_SPINE_TITLE_SAFE_TOP_PT)&&
            bottomPt.every(v=>v<=COLOR_SPINE_TITLE_SAFE_BOTTOM_PT);
 return {centerTopPt:lengthsPt.map(()=>centerTopPt),topPt,bottomPt,safe,
   topLimitPt:COLOR_SPINE_TITLE_SAFE_TOP_PT,
   bottomLimitPt:COLOR_SPINE_TITLE_SAFE_BOTTOM_PT};
}

/**
 * V4.14: a SEPARATE font preference policy for colored covers.
 * The front cover and the plain-cover path do not use this function.
 *
 * 10–12mm: attempt 2 lines with shrinking fonts, then 3 lines as a fallback.
 * 13–28mm: attempt 2 lines at 9pt, and if they cannot fit, attempt
 * 3 lines at 9pt BEFORE reducing font size. Use 8/7/6pt only if both
 * 9pt layouts fail their actual physical and vertical-space checks.
 */
export function colorSpinePreferences(thicknessMm,base=thicknessMm===10?8:9,minFont=6){
 const sizes=Array.from({length:base-minFont+1},(_,i)=>base-i);
 if(thicknessMm<=12)return [
  ...sizes.map(size=>({rows:2,size})),
  ...sizes.map(size=>({rows:3,size}))
 ];
 return sizes.flatMap(size=>[{rows:2,size},{rows:3,size}]);
}
/**
 * Calculate the usable LENGTH of a colored spine-title row from the real
 * printable title zone. An old hard-coded 320pt limit caused needless
 * down-sizing to 7pt/6pt even when the title was safely inside the zone.
 * The top and bottom safety checks remain authoritative for every line.
 */
export function colorTitleMaxLengthPt(safety=2){
 const center=COLOR_SPINE_TITLE_CENTER_TOP_PT;
 return 2*Math.min(center-COLOR_SPINE_TITLE_SAFE_TOP_PT,
                   COLOR_SPINE_TITLE_SAFE_BOTTOM_PT-center)-safety;
}
/** Color title layout: front design is NEVER modified here.
 * Punggung stays centered between its two INNER yellow fold guides.
 * Printed title center = 295pt from the top of the 475×320mm master.
 */
export function colorSpine(fonts,segs,mm,warnings){
 const {right,left,center:middle}=colorGuideGeometry(mm);
 const base=mm===10?8:9;
 const maxLineLength=colorTitleMaxLengthPt();
 const centerTop=COLOR_SPINE_TITLE_CENTER_TOP_PT;
 let lastError='';
 for(const choice of colorSpinePreferences(mm,base,6)){
  try{
   const lines=spineRows(fonts,segs,choice.size,maxLineLength,choice.rows,choice.rows);
   if(!withinSpine(choice.size,lines.length,right-left,1.1))continue;
   const pitch=choice.size*1.11;
   const x=lines.map((_,i)=>middle+(lines.length-1)*pitch/2-i*pitch);
   const geometry=calibrateColorSpineTitleRows(
      lines.map(line=>measure(fonts,line,choice.size)),centerTop);
   if(!geometry.safe)continue;
   if(lines.length===3)warnings.push(`Judul punggung WARNA ${mm} mm memakai 3 baris pada ${choice.size} pt; 2 baris pada ukuran tersebut tidak cukup.`);
   if(choice.size<base)warnings.push(`Judul punggung WARNA turun dari ${base} pt ke ${choice.size} pt karena tidak muat pada font yang lebih besar.`);
   return {lines,x,fromTop:geometry.centerTopPt,size:choice.size,middle,
     edges:[left,right],count:lines.length,
     titleBoundsPt:{top:Math.min(...geometry.topPt),bottom:Math.max(...geometry.bottomPt)},
     titleCenterTopPt:centerTop,
     maxLineLengthPt:maxLineLength};
  }catch(error){if(!(error instanceof PDFPreflightError))throw error;lastError=error.message;}
 }
 fail(`Judul punggung warna ${mm} mm tidak muat 2–3 baris pada 9/8/7/6 pt dalam batas garis kuning dan zona cetak. ${lastError} File tidak dibuat.`);
}
/** V4.43: Fresh VECTOR crop guides on a brand-new, single-color page.
 * No source yellow guides, no old PDF, no painted rectangles to mask them.
 * Left-side marks follow the thickness calibration, right-side marks stay fixed.
 */
export function drawPrecisionColorGuides(page,mm,background){
 const geom=colorGuideGeometry(mm);
 const w=page.getWidth(),h=page.getHeight(),yellow=YELLOW;
 // The only exception is the outer trim tick at 28 mm, outside the sheet.
 // Keep ALL calibrated spine folds untouched. Move only that OUTER mark 1.5 pt inside.
 const farLeft=geom.guidesLeft[0]<0?1.5:geom.guidesLeft[0];
 const marks=[farLeft,...geom.guidesLeft.slice(1),...geom.guidesRight];
 const line=(x,top)=>page.drawLine({start:{x,y:top?h:0},end:{x,y:top?h-32.2:32.2},thickness:.5,color:yellow});
 for(const x of marks){if(x>=0&&x<=w){line(x,true);line(x,false);}}
 const rightCorner=geom.guidesRight.at(-1);
 for(const y of [h-32.2,32.2]){
  page.drawLine({start:{x:Math.max(0,farLeft-45),y},end:{x:farLeft,y},thickness:.5,color:yellow});
  page.drawLine({start:{x:rightCorner,y},end:{x:w,y},thickness:.5,color:yellow});
 }
 return {...geom,drawnOuterLeft:farLeft,outerInsetPt:farLeft-geom.guidesLeft[0]};
}
/** Colored spine metadata mirrors the actual title's font size and pitch.
 * This deliberately replaces V4.26's extra-wide metadata gap.
 * No silent change in size: fail if the two metadata lanes cannot physically fit.
 */
export function colorSpineMetadataLanes(mm, fontSize=Math.max(6,Math.min(9,Number(mm)-2))){
 const geom=colorGuideGeometry(mm);
 const spanPt=geom.right-geom.left;
 const inkRatio=1.108;
 const pitch=fontSize*1.11;
 const inkWidth=inkRatio*fontSize;
 const total=(2-1)*pitch+inkWidth;
 if(total<=spanPt+1e-5){
  const nameX=geom.center-pitch/2;
  const typeX=geom.center+pitch/2;
  const actualGap=typeX-inkWidth/2-(nameX+inkWidth/2);
  return {typeX,nameX,size:fontSize,pitch,gapPt:actualGap,inkWidth,
    leftPrinted:nameX-inkWidth/2,rightPrinted:typeX+inkWidth/2,
    foldLeft:geom.left,foldRight:geom.right,marginPt:0};
 }
 throw new PDFPreflightError(`Tulisan identitas punggung warna ${mm} mm tidak muat bila disamakan dengan font/jarak judul ${fontSize} pt. Periksa ketebalan atau judul sebelum mencetak.`);
}
async function generateColorPDF(data,mm,mode,customColor,customLogo=null){
 mm=Number(mm);
 const segs=validate(data,mm),warnings=[];
 const {type,color}=validateCoverMode(mode,customColor);
 if(type==='polos')fail('Kesalahan mode cover warna.');
 const doc=await PDFDocument.create();
 const page=doc.addPage([mmPt(475),mmPt(320)]);
 const background=type==='merah'?rgb(1,0,0):type==='maroon'?MAROON:hexRgb(color);
 // Uniform DeviceRGB page, no inherited maroon, no old crop marks, no overlays.
 page.drawRectangle({x:0,y:0,width:page.getWidth(),height:page.getHeight(),color:background});
 // Restore ONLY the original UIN logo image at exactly the PDF's measured location.
 // Old PDF background and yellow guides are intentionally never embedded.
 if(type!=='customlogo2'){
  const uinLogo=await doc.embedPng(COLOR_LOGO);
  page.drawImage(uinLogo,{x:893.2254,y:page.getHeight()-523.4554,width:213.5674,height:213.5674});
 }
 // A shifted yellow crop mark falling OUTSIDE the 475mm page is a
 // production safety failure, not a cosmetic warning. 28mm on the supplied
 // color master has this problem; never export a PDF with a missing trim mark.
 const anticipatedMarks=colorGuideGeometry(mm);
 const refStatus=threeLineReferenceStatus(mm);
 if(refStatus.warning)warnings.push(refStatus.warning);
 // Physical page clipping: the left horizontal corner segment can run past
 // x=0 even before the vertical guide does. Never conceal this adjustment.
 const leftCornerStart=anticipatedMarks.guidesLeft[0]-45;
 if(leftCornerStart<0){
  warnings.push(`Tanda sudut potong belakang dipendekkan ${(-leftCornerStart/mmPt(1)).toFixed(2)} mm agar tidak keluar kertas 475 mm. Jika tanda sudut harus panjang penuh, perlu revisi master cetak.`);
 }
 // 28 mm: the original reference's furthest OUTER trim mark is outside 475 mm.
 // Our fresh vector geometry retains exact spine folds and moves only that outer mark.
 if(anticipatedMarks.leftmostMarkClipped){
  warnings.push(`Warna ${mm} mm: hanya tanda potong luar kiri ditempatkan 1.5 pt dari tepi halaman; dua garis lipatan punggung tetap pada ukuran asli. Periksa proof sebelum cetak.`);
 }
 if(anticipatedMarks.guidesLeft[0]>=0&&anticipatedMarks.guidesLeft[0]<mmPt(1.1))
   warnings.push(`Tanda potong kiri hanya ${(anticipatedMarks.guidesLeft[0]/mmPt(1)).toFixed(2)} mm dari tepi kertas; periksa sebelum cetak.`);
 const marks=drawPrecisionColorGuides(page,mm,background);
 if(Math.abs(page.getWidth()-mmPt(475))>.3||Math.abs(page.getHeight()-mmPt(320))>.3)fail('Template warna bukan 475 × 320 mm.');
 const fonts=await getFonts(doc,warnings);
 const logoDetail=type==='customlogo2'?await embedCustomCoverLogo(doc,page,type,customLogo):null;
 const front=splitFrontTitle(fonts,segs);
 // Cover front layout follows *color reference*, NOT Serli/plain layout.
 for(let i=0;i<front.lines.length;i++)renderLine(page,fonts,front.lines[i],front.size,1000.7,120.2+i*13.29,false,YELLOW);
 single(page,fonts,upper(data.jenis_dokumen),17.9,1000.7,248.4,230,'Jenis dokumen warna',warnings,14,false,YELLOW);
 single(page,fonts,'Oleh',12,1000.7,614.8,165,'Label Oleh',warnings,12,false,YELLOW);
 single(page,fonts,norm(data.nama),12,1000.7,628.1,330,'Nama warna',warnings,8,false,YELLOW,nameUnderlineEnabled(data));
 single(page,fonts,`NIM. ${norm(data.nim)}`,12,1000.7,641.4,330,'NIM warna',warnings,9,false,YELLOW);
 const hasCity=!!norm(data.kota),hasFaculty=!!norm(data.fakultas),cityShift=hasCity?13.3:0;
 const frontStudyTop=(hasFaculty?767.1:780.4)-cityShift;
 const programLine=resolveProgramJenjang(data,type);
 if(programLine)single(page,fonts,programLine,12,1000.7,frontStudyTop-13.29,395,'Program/Jenjang warna',warnings,8.5,false,YELLOW);
 single(page,fonts,`PROGRAM STUDI ${upper(data.prodi)}`,12,1000.7,frontStudyTop,395,'Prodi warna',warnings,9,false,YELLOW);
 if(hasFaculty)single(page,fonts,`FAKULTAS ${upper(data.fakultas)}`,12,1000.7,780.4-cityShift,395,'Fakultas warna',warnings,9,false,YELLOW);
 single(page,fonts,upper(canonicalUniversity(data.universitas)),12,1000.7,793.7-cityShift,395,'Universitas warna',warnings,9,false,YELLOW);
 if(hasCity)single(page,fonts,upper(data.kota),12,1000.7,793.7,395,'Kota warna',warnings,9,false,YELLOW);
 // Original colored samples print the YEAR only, not the month name.
 const yearMatch=norm(data.bulan_tahun).match(/\b\d{4}\b/u);
 const year=yearMatch?yearMatch[0]:norm(data.bulan_tahun);
 single(page,fonts,year,12,1000.7,807,250,'Tahun warna',warnings,9,false,YELLOW);
 const spine=colorSpine(fonts,segs,mm,warnings);
 for(let i=0;i<spine.lines.length;i++)renderLine(page,fonts,spine.lines[i],spine.size,spine.x[i],spine.fromTop[i],true,YELLOW);
 // Two vertical lanes for document type and name, and a separate year below.
 // These are calculated from the ACTUAL available width for each order.
 const metadata=colorSpineMetadataLanes(mm,spine.size);
 if(Math.abs(metadata.size-spine.size)>.01)
  warnings.push(`Font nama/jenis dokumen punggung warna disesuaikan ke ${metadata.size} pt.`);
 single(page,fonts,upper(data.jenis_dokumen),metadata.size,metadata.typeX,661,100,'Jenis dokumen punggung warna',warnings,6,true,YELLOW);
 single(page,fonts,upper(data.nama),metadata.size,metadata.nameX,661,175,'Nama punggung warna',warnings,6,true,YELLOW);
 single(page,fonts,year,Math.min(8,metadata.size),spine.middle,798,75,'Tahun punggung warna',warnings,6,true,YELLOW);
 const out=new Uint8Array(await doc.save({useObjectStreams:true}));
 const reread=await PDFDocument.load(out);
 if(reread.getPageCount()!==1||Math.abs(reread.getPage(0).getWidth()-mmPt(475))>.3||Math.abs(reread.getPage(0).getHeight()-mmPt(320))>.3)fail('PDF warna gagal validasi ukuran 475 × 320 mm.');
 return {bytes:out,warnings,details:{mode:type,mm,spine_font_pt:spine.size,spine_lines:spine.lines.length,reference_3row_page:refStatus.referencePage,reference_3row_verified:refStatus.referenceAvailable,
    title_anchor_pt:spine.titleCenterTopPt,title_bounds_pt:spine.titleBoundsPt,
    guide_left:marks.left,guide_right:marks.right,paper_mm:COLOR_PRINT_MM,spine_metadata_font_pt:metadata.size,spine_metadata_gap_mm:metadata.gapPt/mmPt(1),logo:logoDetail?'logo custom unggahan':'logo asli diekstrak tanpa garis dari PDF warna',logo_geometry:logoDetail,background_hex:type==='merah'?'#FF0000':type==='maroon'?'#8B0000':color,guide_origin:'vector baru (tanpa master garis)'}};
}

/** UNIRA/Universitas Madura cover, measured from the uploaded 484x330mm reference.\n * Coordinates are in PDF points, origin at the upper-left for all text.\n * The supplied sample is a 10mm spine; all LEFT crop guides move by the\n * width delta while the RIGHT front cover and its title remain unchanged.\n * At 28mm, the leftmost horizontal corner is shortened if it crosses x=0.\n */
/** Original UNIRA PDF image rect: x685.215–697.172, y772.634–784.927 (top origin).
 * Original year text box: y787.9–796.4. User requested both slightly LOWER
 * than the prior generated output, so use a small explicit +3pt correction;
 * front cover text and all fold marks remain unchanged.
 */
export const UNIRA_SPINE_MEDIA=Object.freeze({logoTop:772.6344,logoWidth:11.9572,logoHeight:12.2925,yearBaseline:796.4,dropPt:3.0});
export const UNIRA_REFERENCE=Object.freeze({
 pageWidthPt:mmPt(484),pageHeightPt:mmPt(330),baseMm:10,
 leftGuides:[62.65,367.96,649.41,677.37],
 rightGuides:[705.62,733.64,999.18,1321.41],
 frontCenterX:1013.63,
 spineTitleCenterTopPt:374.0,
 spineSafeTopPt:187.0,
 spineSafeBottomPt:531.0
});
export function uniraSpineGeometry(mm){
 mm=Number(mm);
 if(!ALL.includes(mm))throw new PDFPreflightError('UNIRA: ketebalan hanya 10–28 mm.');
 const u=UNIRA_REFERENCE,delta=mmPt(mm-u.baseMm);
 const leftGuides=u.leftGuides.map(v=>v-delta),rightGuides=[...u.rightGuides];
 const left=leftGuides.at(-1),right=rightGuides[0],center=(left+right)/2;
 const observedMm=(right-left)/mmPt(1);
 if(Math.abs(observedMm-mm)>.7)throw new PDFPreflightError('Geometri punggung UNIRA tidak sesuai ketebalan pesanan.');
 if(leftGuides[0]<0||rightGuides.at(-1)>u.pageWidthPt)
  throw new PDFPreflightError('Penanda potong UNIRA keluar batas halaman.');
 return {mm,delta,leftGuides,rightGuides,left,right,center,observedMm};
}
function drawUniraCropGuides(page,mm,warnings){
 const g=uniraSpineGeometry(mm),h=page.getHeight(),w=page.getWidth();
 // Cover only the original trim strips; preserve the small UNIRA emblem.
 page.drawRectangle({x:0,y:h-53,width:w,height:53,color:rgb(1,1,1)});
 page.drawRectangle({x:0,y:0,width:w,height:53,color:rgb(1,1,1)});
 const line=(x,top)=>page.drawLine({start:{x,y:top?h-47:0},end:{x,y:top?h-14.6:32.4},thickness:.7,color:BLACK});
 for(const x of [...g.leftGuides,...g.rightGuides]){line(x,true);line(x,false);}
 // Original 10mm UNIRA PDF includes L-shaped corner ticks.
 for(const top of [true,false]){
  const y=top?h-47:47;
  const first=g.leftGuides[0],last=g.rightGuides.at(-1);
  const start=Math.max(0,first-44.1),end=Math.min(w,last+37.7);
  page.drawLine({start:{x:start,y},end:{x:first,y},thickness:.7,color:BLACK});
  page.drawLine({start:{x:last,y},end:{x:end,y},thickness:.7,color:BLACK});
 }
 if(g.leftGuides[0]-44.1<0)warnings.push('UNIRA: garis sudut kiri diperpendek agar tidak melewati halaman pada '+mm+' mm. Periksa proof sebelum cetak.');
 return g;
}
export function chooseUniraSpine(fonts,segs,mm,warnings){
 const geom=uniraSpineGeometry(mm),u=UNIRA_REFERENCE;
 const base=mm<=12?8:9;
 const maxLen=2*Math.min(u.spineTitleCenterTopPt-u.spineSafeTopPt,u.spineSafeBottomPt-u.spineTitleCenterTopPt)-4;
 for(const {rows,size} of colorSpinePreferences(mm,base,6)){
  try{
   const lines=spineRows(fonts,segs,size,maxLen,rows,rows);
   if(!withinSpine(size,lines.length,geom.right-geom.left,1.2))continue;
   const pitch=size*1.11;
   const xs=lines.map((_,i)=>geom.center+(lines.length-1)*pitch/2-i*pitch);
   const lens=lines.map(line=>measure(fonts,line,size));
   if(lens.some(len=>u.spineTitleCenterTopPt-len/2<u.spineSafeTopPt+1||u.spineTitleCenterTopPt+len/2>u.spineSafeBottomPt-1))continue;
   if(lines.length===3)warnings.push(`UNIRA ${mm} mm: judul memakai 3 baris ${size} pt karena tidak muat 2 baris pada font prioritas.`);
   if(size<base)warnings.push(`UNIRA ${mm} mm: font judul berkurang menjadi ${size} pt agar tetap di zona aman.`);
   return {lines,xs,size,centerTop:u.spineTitleCenterTopPt,geometry:geom};
  }catch(err){if(!(err instanceof PDFPreflightError))throw err;}
 }
 fail(`UNIRA ${mm} mm: judul tidak muat dalam batas punggung dan zona aman meski memakai 3 baris 6 pt.`);
}
async function generateUniraPDF(data,mm){
 mm=Number(mm);const segs=validate(data,mm),warnings=[];
 const doc=await PDFDocument.create();const src=await PDFDocument.load(UNIRA_MASTER);
 if(src.getPageCount()!==1)fail('Master UNIRA tidak berisi tepat satu halaman.');
 const [page]=await doc.copyPages(src,[0]);doc.addPage(page);
 const u=UNIRA_REFERENCE;
 if(Math.abs(page.getWidth()-u.pageWidthPt)>.35||Math.abs(page.getHeight()-u.pageHeightPt)>.35)fail('Ukuran master UNIRA bukan 484×330 mm.');
 const g=drawUniraCropGuides(page,mm,warnings);
 const fonts=await getFonts(doc,warnings);
 // Front coordinates calibrated from CONTOH COVER UNIRA.pdf; never move front.
 const cx=u.frontCenterX;
 let front=null;
 for(let sz=12;sz>=9.8-1e-6;sz=Math.round((sz-.2)*10)/10){
  const lines=greedyLines(fonts,segs,sz,375);
  if(lines.length<=5){front={lines,size:sz};break;}
 }
 if(!front)fail('Judul depan UNIRA terlalu panjang untuk zona judul. Periksa judul.');
 for(let i=0;i<front.lines.length;i++)renderLine(page,fonts,front.lines[i],front.size,cx,134.4+13.29*i,false,BLACK);
 single(page,fonts,upper(data.jenis_dokumen),15.9,cx,265,240,'Jenis dokumen UNIRA',warnings,11,false,BLACK);
 single(page,fonts,'Oleh :',12,cx,570,170,'Label Oleh UNIRA',warnings,12,false,BLACK);
 single(page,fonts,upper(data.nama),12,cx,583.3,330,'Nama UNIRA',warnings,8,false,BLACK,nameUnderlineEnabled(data));
 single(page,fonts,`NPM. ${norm(data.nim)}`,12,cx,596.6,330,'NPM UNIRA',warnings,8,false,BLACK);
 single(page,fonts,`PRODI ${upper(data.prodi)}`,12,cx,norm(data.fakultas)?781.3:794.6,390,'Prodi UNIRA',warnings,9,false,BLACK);
 if(norm(data.fakultas))single(page,fonts,`FAKULTAS ${upper(data.fakultas)}`,12,cx,794.6,390,'Fakultas UNIRA',warnings,9,false,BLACK);
 const institution=upper(canonicalUniversity(data.universitas));
 if(institution!=='UNIVERSITAS MADURA')warnings.push('Mode UNIRA dipilih tetapi nama universitas bukan UNIVERSITAS MADURA. Periksa sebelum cetak.');
 single(page,fonts,institution,12,cx,807.8,390,'Universitas UNIRA',warnings,9,false,BLACK);
 single(page,fonts,upper(norm(data.kota)||'PAMEKASAN'),12,cx,821.1,390,'Kota UNIRA',warnings,12,false,BLACK);
 const yearMatch=norm(data.bulan_tahun).match(/\b\d{4}\b/u),year=yearMatch?.[0]||norm(data.bulan_tahun);
 single(page,fonts,year,12,cx,834.4,150,'Tahun UNIRA',warnings,9,false,BLACK);
 // In the UNIRA reference, the spine type is at the top, title in the middle,
 // name+NPM underneath, and the small original logo immediately above YEAR.
 const spine=chooseUniraSpine(fonts,segs,mm,warnings);
 for(let i=0;i<spine.lines.length;i++)renderLine(page,fonts,spine.lines[i],spine.size,spine.xs[i],spine.centerTop,true,BLACK);
 single(page,fonts,upper(data.jenis_dokumen),8,g.center,116.4,140,'Jenis dokumen punggung UNIRA',warnings,6,true,BLACK);
 const metaSize=mm<=12?6.9:9;
 const pitch=mm<=12?6.2:Math.min(9,mmPt(mm)/3.1);
 single(page,fonts,upper(data.nama),metaSize,g.center+pitch/2,673,180,'Nama punggung UNIRA',warnings,6,true,BLACK);
 single(page,fonts,`NPM. ${norm(data.nim)}`,metaSize,g.center-pitch/2,673,175,'NPM punggung UNIRA',warnings,6,true,BLACK);
 // User-supplied replacement UNIVERSITY MADURA crest with transparency.
 // Embed PNG alpha natively; do not composite to black or white backgrounds.
 // Spine media stay fixed vertically across 10–28 mm; only X tracks center.
 const emblem=await doc.embedPng(UNIRA_LOGO);
 const im=UNIRA_SPINE_MEDIA;
 page.drawImage(emblem,{x:g.center-im.logoWidth/2,
   y:page.getHeight()-(im.logoTop+im.dropPt+im.logoHeight),width:im.logoWidth,height:im.logoHeight});
 single(page,fonts,year,8.5,g.center,im.yearBaseline+im.dropPt,90,'Tahun punggung UNIRA',warnings,6,false,BLACK);
 const out=new Uint8Array(await doc.save({useObjectStreams:true}));
 const check=await PDFDocument.load(out);
 if(check.getPageCount()!==1||Math.abs(check.getPage(0).getWidth()-mmPt(484))>.35||Math.abs(check.getPage(0).getHeight()-mmPt(330))>.35)fail('PDF UNIRA gagal verifikasi ukuran.');
 return {bytes:out,warnings,details:{mode:'unira',mm,paper_mm:UNIRA_PRINT_MM,spine_font_pt:spine.size,spine_lines:spine.lines.length,guide_left:g.left,guide_right:g.right,logo:'logo UNIRA transparan baru dari pengguna',logo_year_drop_pt:UNIRA_SPINE_MEDIA.dropPt}};
}



/** ZAIN.NET V4.39 – UIM / Universitas Islam Madura.
 * Reconstructed from the user's UIM.pdf, EXACT physical page 475 x 320 mm.
 * The user-supplied clean master retains the original maroon and embedded
 * UIM emblem. The supplied reference has a 15mm spine, not 10mm.
 * Other requested sizes shift ONLY the left four guide marks; the right
 * front cover, original logo and text anchors do not move.
 */
export const UIM_REFERENCE=Object.freeze({
  pageWidthPt:mmPt(475),pageHeightPt:mmPt(320),baseMm:15,
  leftGuides:[37.0315,362.9616,624.1615,652.4215],
  rightGuides:[694.9412,723.1212,988.2711,1310.6215],
  frontCenterX:1002.1,spineTitleCenterTopPt:294.0,
  spineSafeTopPt:94,spineSafeBottomPt:494,
  spineTypeAndNameTopPt:673,spineYearTopPt:803
});
const UIM_BACKGROUND=MAROON;
export function uimSpineGeometry(mm){
 mm=Number(mm);
 if(!ALL.includes(mm))throw new PDFPreflightError('UIM: ketebalan hanya 10–28 mm.');
 const r=UIM_REFERENCE,delta=mmPt(mm-r.baseMm);
 const leftGuides=r.leftGuides.map(x=>x-delta),rightGuides=[...r.rightGuides];
 const left=leftGuides.at(-1),right=rightGuides[0],center=(left+right)/2;
 const observedMm=(right-left)/mmPt(1);
 if(Math.abs(observedMm-mm)>.05)fail('Kalibrasi punggung UIM tidak tepat.');
 if(leftGuides[0]<0||rightGuides.at(-1)>r.pageWidthPt)fail('Garis UIM melewati bidang cetak.');
 return {mm,delta,leftGuides,rightGuides,left,right,center,observedMm};
}
export function drawUimGuides(page,mm,warnings=[],background=UIM_BACKGROUND,insetOuter=false){
 const g=uimSpineGeometry(mm),h=page.getHeight(),w=page.getWidth();
 // No colored masking strips: this function only draws fresh vector guide strokes.
 const ink=YELLOW,top=h-32.20,bottom=32.20;
 const outerX=g.leftGuides[0]<1.5?1.5:g.leftGuides[0];
 if(outerX!==g.leftGuides[0])warnings.push(`UIM ${mm} mm: hanya penanda potong luar kiri digeser ke dalam ${(outerX-g.leftGuides[0]).toFixed(2)} pt agar terlihat di kertas; posisi lipatan punggung tidak berubah.`);
 for(const x of [outerX,...g.leftGuides.slice(1),...g.rightGuides]){
  page.drawLine({start:{x,y:h},end:{x,y:top},color:ink,thickness:.5});
  page.drawLine({start:{x,y:0},end:{x,y:bottom},color:ink,thickness:.5});
 }
 const cornerLength=35.19;
 const left=outerX,right=g.rightGuides.at(-1);
 const cornerLeftStart=Math.max(0,left-cornerLength);
 if(left<cornerLength)warnings.push(`UIM ${mm} mm: sudut belakang kiri dipendekkan ${(cornerLength-left).toFixed(1)} pt agar tetap masuk kertas.`);
 for(const y of [top,bottom]){
  page.drawLine({start:{x:cornerLeftStart,y},end:{x:left,y},color:ink,thickness:.5});
  page.drawLine({start:{x:right,y},end:{x:w,y},color:ink,thickness:.5});
 }
 return g;
}
export function chooseUimSpine(fonts,segs,mm,warnings){
 const g=uimSpineGeometry(mm),u=UIM_REFERENCE;
 const base=mm<=12?8:9,maxLen=2*Math.min(u.spineTitleCenterTopPt-u.spineSafeTopPt,u.spineSafeBottomPt-u.spineTitleCenterTopPt)-4;
 for(const {rows,size} of colorSpinePreferences(mm,base,6)){
  try{
   const lines=spineRows(fonts,segs,size,maxLen,rows,rows);
   if(!withinSpine(size,lines.length,g.right-g.left,1.1))continue;
   const pitch=size*1.11;
   const xs=lines.map((_,i)=>g.center+(lines.length-1)*pitch/2-i*pitch);
   if(lines.some(line=>{const len=measure(fonts,line,size);return u.spineTitleCenterTopPt-len/2<u.spineSafeTopPt||u.spineTitleCenterTopPt+len/2>u.spineSafeBottomPt;}))continue;
   if(rows===3)warnings.push(`UIM ${mm} mm: judul punggung menggunakan tiga baris ${size} pt.`);
   if(size<base)warnings.push(`UIM ${mm} mm: font punggung diturunkan menjadi ${size} pt.`);
   return {lines,xs,size,centerTop:u.spineTitleCenterTopPt,geometry:g};
  }catch(err){if(!(err instanceof PDFPreflightError))throw err;}
 }
 fail(`Judul terlalu panjang untuk punggung UIM ${mm} mm, meskipun tiga baris 6 pt.`);
}
async function generateUimPDF(data,mm,custom=null){
 mm=Number(mm);const segs=validate(data,mm),warnings=[];
 const doc=await PDFDocument.create();
 const page=doc.addPage([mmPt(475),mmPt(320)]);
 const uniformColor=custom?hexRgb(custom.color):MAROON;
 page.drawRectangle({x:0,y:0,width:page.getWidth(),height:page.getHeight(),color:uniformColor});
 // UIM reference image is only the logo (no baked-in yellow lines/background).
 if(!custom){
  const uimLogo=await doc.embedPng(UIM_LOGO);
  page.drawImage(uimLogo,{x:917.5975,y:page.getHeight()-621.7690,width:165.7749,height:165.7749});
 }
 if(Math.abs(page.getWidth()-mmPt(475))>.35||Math.abs(page.getHeight()-mmPt(320))>.35)fail('Master UIM bukan 475 × 320 mm.');
 const geom=drawUimGuides(page,mm,warnings,custom?hexRgb(custom.color):UIM_BACKGROUND,!!custom);
 const fonts=await getFonts(doc,warnings),cx=UIM_REFERENCE.frontCenterX;
 const logoDetail=custom?await embedCustomCoverLogo(doc,page,'customlogo1',custom.logo):null;
 // Four lines in source; allow adaptive font down to 9.8pt if more text.
 let title;
 for(let size=12;size>=9.8-1e-6;size=Math.round((size-.2)*10)/10){
  const lines=greedyLines(fonts,segs,size,410);
  if(lines.length<=5){title={lines,size};break;}
 }
 if(!title)fail('Judul depan UIM terlalu panjang (lebih dari 5 baris).');
 title.lines.forEach((line,i)=>renderLine(page,fonts,line,title.size,cx,121.5+i*13.29,false,YELLOW));
 single(page,fonts,upper(data.jenis_dokumen),17.9,cx,250.5,230,'Jenis dokumen UIM',warnings,13,false,YELLOW);
 single(page,fonts,'Oleh',12,cx,343.8,160,'Oleh UIM',warnings,11,false,YELLOW);
 single(page,fonts,upper(data.nama),12,cx,357.1,370,'Nama UIM',warnings,8,false,YELLOW,nameUnderlineEnabled(data));
 single(page,fonts,`NIM. ${norm(data.nim)}`,12,cx,370.4,355,'NIM UIM',warnings,9,false,YELLOW);
 const faculty=!!norm(data.fakultas),city=!!norm(data.kota),gap=13.29;
 const frontStack=[];
 const programLine=resolveProgramJenjang(data,custom?'customlogo1':'uim');
 if(programLine)frontStack.push(programLine);
 frontStack.push(`PROGRAM STUDI ${upper(data.prodi)}`);
 if(faculty)frontStack.push(`FAKULTAS ${upper(data.fakultas)}`);
 const institution=upper(canonicalUniversity(data.universitas));
 if(institution!=='UNIVERSITAS ISLAM MADURA')warnings.push('Pilihan UIM digunakan dengan nama universitas lain; periksa data dan contoh sebelum cetak.');
 frontStack.push(institution);
 if(city)frontStack.push(upper(data.kota));
 frontStack.push((norm(data.bulan_tahun).match(/\b\d{4}\b/u)||[])[0]||norm(data.bulan_tahun));
 const baseTop=793.2-(frontStack.length-1)*gap;
 for(let i=0;i<frontStack.length;i++)single(page,fonts,frontStack[i],12,cx,baseTop+i*gap,390,`Identitas depan UIM baris ${i+1}`,warnings,8.5,false,YELLOW);
 const spine=chooseUimSpine(fonts,segs,mm,warnings);
 spine.lines.forEach((line,i)=>renderLine(page,fonts,line,spine.size,spine.xs[i],spine.centerTop,true,YELLOW));
 const metaSize=mm<=12?7:9,metaPitch=metaSize*1.11;
 if(!withinSpine(metaSize,2,geom.right-geom.left,1.1))fail('Nama & jenis dokumen UIM tidak muat di punggung.');
 single(page,fonts,upper(data.jenis_dokumen),metaSize,geom.center+metaPitch/2,673,105,'Jenis dokumen punggung UIM',warnings,6,true,YELLOW);
 single(page,fonts,upper(data.nama),metaSize,geom.center-metaPitch/2,673,180,'Nama punggung UIM',warnings,6,true,YELLOW);
 const year=(norm(data.bulan_tahun).match(/\b\d{4}\b/u)||[])[0]||norm(data.bulan_tahun);
 single(page,fonts,year,mm<=11?9.5:10,geom.center,803,70,'Tahun punggung UIM',warnings,8,true,YELLOW);
 const bytes=new Uint8Array(await doc.save({useObjectStreams:true}));
 const check=await PDFDocument.load(bytes);
 if(check.getPageCount()!==1||Math.abs(check.getPage(0).getWidth()-mmPt(475))>.35||Math.abs(check.getPage(0).getHeight()-mmPt(320))>.35)fail('UIM: verifikasi ukuran kertas gagal.');
 return {bytes,warnings,details:{mode:custom?'customlogo1':'uim',mm,paper_mm:UIM_PRINT_MM,spine_font_pt:spine.size,spine_lines:spine.lines.length,guide_left:geom.left,guide_right:geom.right,logo:custom?'logo custom unggahan':'logo UIM terpisah transparan',logo_geometry:logoDetail,source_reference_mm:15,background_hex:custom?custom.color:'#8B0000',guide_origin:'vector baru (tanpa master garis)'}};
}

/** V4.21 Dummybook: a SINGLE 420×297mm spread (back/spine/front).
 * Each size 5–10mm is copied from its corresponding original PDF reference
 * page, preserving the original photos, logo, pink background and fold marks.
 * Original student text and old abstract are removed from the clean master.
 */

async function getDummyFonts(pdf,warnings){
 const kit=globalThis.fontkit||globalThis.Fontkit;
 if(!kit)fail('Fontkit gagal dimuat, tidak bisa menanam font Arial pada Dummybook.');
 pdf.registerFontkit(kit);
 let bytes;try{bytes=await getDummyArialFontBytes();}catch(e){fail(e.message||String(e));}
 try{
  const [bold,italic,regular]=await Promise.all([
    pdf.embedFont(bytes.bold,{subset:true}),
    pdf.embedFont(bytes.italic,{subset:true}),
    pdf.embedFont(bytes.regular,{subset:true})]);
  const asFace=font=>({font,face:{hasGlyphForCodePoint:cp=>font.getCharacterSet().includes(cp)}});
  warnings.push('Dummybook: font '+bytes.label+'. Bila harus Arial asli, unggah font Arial Regular dan Bold yang berlisensi dari komputer.');
  return {regular,bold:[asFace(bold)],italic:[asFace(italic)],name:bytes.label};
 }catch(e){fail('Font Arial/Arimo tidak dapat dimasukkan ke PDF: '+String(e.message||e));}
}
export function dummyTitleSpine(fonts,segs,mm,warnings){
 const g=dummySpineGeometry(mm),centerTop=DUMMY_PAGE.spineTitleCenterPt;
 const top=DUMMY_PAGE.spineTitleTopPt,bottom=DUMMY_PAGE.spineTitleBottomPt;
 const maxLen=2*Math.min(centerTop-top,bottom-centerTop)-3;
 const start=mm<=6?4.7:mm<=8?5.5:6.5;
 for(const rows of [2,3])for(let size=start;size>=3.5;size=Math.round((size-.25)*100)/100){
  try{
   const lines=spineRows(fonts,segs,size,maxLen,rows,rows);
   const pitch=size*1.07;
   if((rows-1)*pitch+size*1.12>g.widthPt-1.0)continue;
   if(lines.some(line=>{const width=measure(fonts,line,size);return centerTop-width/2<top||centerTop+width/2>bottom;}))continue;
   if(rows===3)warnings.push('Judul punggung Dummybook memakai tiga baris hanya karena pilihan dua baris tidak muat.');
   if(size<start)warnings.push(`Font punggung Dummybook turun ke ${size} pt karena sempit.`);
   return {lines,size,xs:lines.map((_,i)=>g.center+(rows-1)*pitch/2-i*pitch),fromTop:centerTop,geometry:g};
  }catch(e){if(!(e instanceof PDFPreflightError))throw e;}
 }
 fail(`Judul terlalu panjang untuk punggung Dummybook ${mm} mm (batas font 3.5 pt). Tidak dipotong demi keselamatan cetak.`);
}
function drawJustifiedBackLine(page,font,line,size,x,y,width,justify){
 const words=line.split(/\s+/u);
 if(!justify||words.length<2){page.drawText(line,{x,y:page.getHeight()-y,size,font,color:BLACK});return;}
 const wsum=words.reduce((sum,w)=>sum+font.widthOfTextAtSize(w,size),0);
 const gap=(width-wsum)/(words.length-1);
 if(gap<1||gap>19){page.drawText(line,{x,y:page.getHeight()-y,size,font,color:BLACK});return;}
 let pos=x;
 for(const w of words){page.drawText(w,{x:pos,y:page.getHeight()-y,size,font,color:BLACK});pos+=font.widthOfTextAtSize(w,size)+gap;}
}
async function generateDummyPDF(data,mm){
 mm=Number(mm);if(!DUMMY_SIZES.includes(mm))fail('Dummybook hanya tersedia ukuran 5–10 mm.');
 const segs=validate(data,10),warnings=[];
 const pars=String(data.abstract_text||'').split(/\n\s*\n/u).map(p=>p.replace(/\s+/gu,' ').trim()).filter(Boolean);
 if(!pars.length)fail('Abstrak belum ada. Baca abstrak asli dari PDF/DOCX lengkap atau isi kolom abstrak.');
 if(pars.length>50)fail('Pemisahan paragraf abstrak tampak salah. Periksa kolom abstrak sebelum ekspor.');
 if(!DUMMY_MASTER)DUMMY_MASTER=await loadAsset('./assets/dummybook_spread_clean_5-10mm.pdf');
 const src=await PDFDocument.load(DUMMY_MASTER),doc=await PDFDocument.create();
 if(src.getPageCount()!==6)fail('Master Dummybook baru harus berisi enam pilihan ukuran 5–10 mm.');
 const g=dummySpineGeometry(mm);
 const [page]=await doc.copyPages(src,[g.page]);doc.addPage(page);
 if(Math.abs(page.getWidth()-DUMMY_PAGE.widthPt)>.6||Math.abs(page.getHeight()-DUMMY_PAGE.heightPt)>.6)fail('Master Dummybook bukan 420×297 mm.');
 const fonts=await getDummyFonts(doc,warnings);
 const spine=dummyTitleSpine(fonts,segs,mm,warnings);
 // Front cover: measured from the right half of the new reference.
 let front=null;
 for(let sz=14;sz>=10;sz-=.5){
  const lines=greedyLines(fonts,segs,sz,460);
  if(lines.length<=4){front={lines,size:sz};break;}
 }
 if(!front)fail('Judul depan Dummybook terlalu panjang untuk zona atas. Periksa judul asli.');
 const cx=DUMMY_PAGE.frontCenterPt;
 const pitch=Math.min(15.7,(DUMMY_PAGE.titleBottomPt-DUMMY_PAGE.titleTopPt)/Math.max(1,front.lines.length));
 for(let i=0;i<front.lines.length;i++)renderLine(page,fonts,front.lines[i],front.size,cx,118+i*pitch,false,BLACK);
 single(page,fonts,'Oleh:',16,cx,579,300,'Oleh Dummybook',warnings,13,false,BLACK);
 single(page,fonts,upper(data.nama),16,cx,595,370,'Nama Dummybook',warnings,9,false,BLACK,nameUnderlineEnabled(data));
 single(page,fonts,`NIM. ${norm(data.nim)}`,14,cx,611,340,'NIM Dummybook',warnings,9,false,BLACK);
 const hasCity=!!norm(data.kota),hasFaculty=!!norm(data.fakultas),cityShift=hasCity?15.6:0;
 single(page,fonts,`PROGRAM STUDI ${upper(data.prodi)}`,14,cx,(hasFaculty?707:722.6)-cityShift,420,'Prodi Dummybook',warnings,9,false,BLACK);
 if(hasFaculty)single(page,fonts,`FAKULTAS ${upper(data.fakultas)}`,14,cx,722.6-cityShift,420,'Fakultas Dummybook',warnings,9,false,BLACK);
 single(page,fonts,upper(canonicalUniversity(data.universitas)),14,cx,738.2-cityShift,420,'Universitas Dummybook',warnings,9,false,BLACK);
 if(hasCity)single(page,fonts,upper(data.kota),14,cx,738.2,420,'Kota Dummybook',warnings,9,false,BLACK);
 single(page,fonts,upper(data.bulan_tahun),14,cx,753.8,300,'Tanggal Dummybook',warnings,9,false,BLACK);
 // Spine text: centered inside the two ORIGINAL fold marks (no guessed shift).
 for(let i=0;i<spine.lines.length;i++)renderLine(page,fonts,spine.lines[i],spine.size,spine.xs[i],spine.fromTop,true,BLACK);
 const metaSize=mm<=6?3.9:4.5,step=metaSize*1.1;
 single(page,fonts,upper(data.nama),metaSize,g.center+step/2,170,93,'Nama punggung Dummybook',warnings,3.5,true,BLACK);
 single(page,fonts,`NIM. ${norm(data.nim)}`,metaSize,g.center-step/2,170,95,'NIM punggung Dummybook',warnings,3.5,true,BLACK);
 single(page,fonts,upper(data.bulan_tahun),metaSize,g.center,730,75,'Tahun punggung Dummybook',warnings,3.5,true,BLACK);
 // Exact final paragraphs, never summarized / invented / sliced mid-paragraph.
 const regular=fonts.regular;
 const characters=new Set(regular.getCharacterSet());
 const widthFn=(s,size)=>{
  for(const ch of s)if(!characters.has(ch.codePointAt(0)))fail(`Karakter abstrak '${ch}' tidak ada pada font Unicode. Pilih font yang sesuai.`);
  return regular.widthOfTextAtSize(s,size);
 };
 let layout;try{layout=chooseDummyBackText(pars,widthFn);}catch(e){fail(e.message||String(e));}
 const h=DUMMY_PAGE.backBottomPt-DUMMY_PAGE.backTopPt;
 let y=DUMMY_PAGE.backTopPt+(h-layout.height)/2+layout.size;
 for(const rows of layout.lines){
  for(let i=0;i<rows.length;i++){
   drawJustifiedBackLine(page,regular,rows[i],layout.size,DUMMY_PAGE.backXPt,y,DUMMY_PAGE.backWidthPt,i<rows.length-1);
   y+=layout.linePitch;
  }
  y+=layout.gap;
 }
 if(y-layout.gap>DUMMY_PAGE.backBottomPt+2)fail('Teks belakang melewati zona aman.');
 warnings.push(`Dummybook: ${layout.reason} ${layout.paragraphCount} paragraf terakhir, ${layout.totalLines} baris, ${layout.size} pt.`);
 const bytes=new Uint8Array(await doc.save({useObjectStreams:true}));
 const checked=await PDFDocument.load(bytes);
 if(checked.getPageCount()!==1)fail('Dummybook terbaru wajib 1 lembar 420×297 mm.');
 return {bytes,warnings,details:{mode:'dummybook',mm,paper_mm:DUMMY_PRINT_MM,pages:1,
  spine_font_pt:spine.size,spine_lines:spine.lines.length,back_paragraph_count:layout.paragraphCount,
  back_lines:layout.totalLines,back_font_pt:layout.size,dummy_font:fonts.name,source_reference_page:g.page+1}};
}

/** V4.20 Soft Cover IPS, 330 × 210 mm, landscape.
 * Based on the user's original Soft Cover IPS.pdf. Only the first reference
 * page is used as a clean visual base; sample student's text was stripped
 * without affecting the original colored UIN Madura logo or vector marks.
 * Fold marks at 5 mm are measured. Sizes 6–10 mm are extrapolated, with
 * the front/right fold fixed and all FOUR left-side marks translated equally.
 */
function ipsTitleSpine(fonts,segs,mm,warnings){
 const g=ipsSpineGeometry(mm),r=IPS_REFERENCE;
 const centerTop=r.titleCenterTopPt;
 const maxLen=2*Math.min(centerTop-r.titleSafeTopPt,r.titleSafeBottomPt-centerTop)-3;
 const base=mm<=5?5.0:mm<=6?5.4:mm<=8?6.2:7.0;
 // 2 columns before 3 columns; don't split a word in the middle.
 for(const rows of [2,3]){
  for(let size=base;size>=3.5;size=Math.round((size-.25)*100)/100){
   try{
    const lines=spineRows(fonts,segs,size,maxLen,rows,rows);
    const pitch=size*1.08;
    const glyphHeight=size*1.11;
    if((rows-1)*pitch+glyphHeight>g.widthPt-1.1)continue;
    const widths=lines.map(line=>measure(fonts,line,size));
    if(widths.some(width=>centerTop-width/2<r.titleSafeTopPt || centerTop+width/2>r.titleSafeBottomPt))continue;
    const xs=lines.map((_,i)=>g.center+(rows-1)*pitch/2-i*pitch);
    if(rows===3)warnings.push('Soft Cover IPS: punggung memakai 3 kolom karena 2 kolom tidak muat pada batas ukuran minimum.');
    if(size<base)warnings.push(`Soft Cover IPS ${mm} mm: font judul turun menjadi ${size.toFixed(2)} pt karena lebar dan panjang judul.`);
    return {lines,xs,size,centerTop,geometry:g};
   }catch(e){if(!(e instanceof PDFPreflightError))throw e;}
  }
 }
 fail(`Judul terlalu panjang untuk punggung Soft Cover IPS ${mm} mm. Tidak dipecah di tengah kata dan tidak dipotong.`);
}
function ipsGuides(page,g){
 // The source has four independent left-side top and bottom ticks, plus
 // static right-side ticks and corner guides. Keep the latter untouched.
 const h=page.getHeight(),white=rgb(1,1,1),ink=BLACK;
 const old=IPS_REFERENCE.leftTicksPt;
 for(let i=0;i<old.length;i++){
  const x=old[i];
  const start=i===0?x-8.8:x-1.5;
  const width=i===0?11:3;
  page.drawRectangle({x:start,y:h-13.0,width,height:13.0,color:white});
  page.drawRectangle({x:start,y:0,width,height:13.0,color:white});
 }
 for(let i=0;i<g.leftTicksPt.length;i++){
  const x=g.leftTicksPt[i];
  if(x<1||x>page.getWidth()-1)fail('Garis tanda potong IPS di luar kertas.');
  page.drawLine({start:{x,y:h-4.1},end:{x,y:h-11.1},thickness:.52,color:ink});
  page.drawLine({start:{x,y:4.1},end:{x,y:11.1},thickness:.52,color:ink});
  if(i===0){
   page.drawLine({start:{x:x-7.0,y:h-8.4},end:{x,y:h-8.4},thickness:.52,color:ink});
   page.drawLine({start:{x:x-7.0,y:8.4},end:{x,y:8.4},thickness:.52,color:ink});
  }
 }
}
/** Exported pure/layout entry point for unit tests. */
export function ipsSpine(fonts,segs,mm,warnings=[]){return ipsTitleSpine(fonts,segs,mm,warnings);}
async function generateSoftIPSPDF(data,mm){
 mm=Number(mm);
 if(!IPS_SIZES.includes(mm))fail('Soft Cover IPS: punggung tersedia 5–10 mm.');
 const segs=validate(data,10),warnings=[];
 if(!IPS_MASTER)IPS_MASTER=await loadAsset('./assets/soft_ips_clean.pdf');
 const src=await PDFDocument.load(IPS_MASTER),doc=await PDFDocument.create();
 if(src.getPageCount()!==1)fail('Master Soft Cover IPS harus satu halaman.');
 const [page]=await doc.copyPages(src,[0]);doc.addPage(page);
 if(Math.abs(page.getWidth()-IPS_REFERENCE.pageWidthPt)>.4||Math.abs(page.getHeight()-IPS_REFERENCE.pageHeightPt)>.4)fail('Ukuran master IPS bukan 330 × 210 mm landscape.');
 const fonts=await getFonts(doc,warnings);
 const g=ipsSpineGeometry(mm);
 ipsGuides(page,g);
 const cx=IPS_REFERENCE.frontCenterXPt;
 // Original type sizes and anchors measured directly from reference PDF.
 // Keep all front fields in place even when spine changes.
 let front=null;
 for(let size=8.5;size>=6.5;size-=.25){
  const lines=greedyLines(fonts,segs,size,305);
  if(lines.length<=5){front={lines,size};break;}
 }
 if(!front)fail('Judul cover depan IPS terlalu panjang untuk kotak judul. Periksa judul asli.');
 const titlePitch=front.size*1.12;
 const firstTitleTop=70.4-(front.lines.length-1)*titlePitch/2;
 for(let i=0;i<front.lines.length;i++)renderLine(page,fonts,front.lines[i],front.size,cx,firstTitleTop+i*titlePitch,false,BLACK);
 single(page,fonts,upper(data.jenis_dokumen),12.4,cx,153,250,'Jenis dokumen depan IPS',warnings,9,false,BLACK);
 single(page,fonts,'Oleh:',8.35,cx,234.8,160,'Label Oleh IPS',warnings,8,false,BLACK);
 single(page,fonts,norm(data.nama),8.35,cx,243.8,270,'Nama depan IPS',warnings,7,false,BLACK,nameUnderlineEnabled(data));
 single(page,fonts,`NIM. ${norm(data.nim)}`,8.35,cx,252.9,270,'NIM depan IPS',warnings,7,false,BLACK);
 const hasCity=!!norm(data.kota),hasFaculty=!!norm(data.fakultas),cityShift=hasCity?9.1:0;
 single(page,fonts,`PROGRAM STUDI ${upper(data.prodi)}`,8.35,cx,(hasFaculty?512.1:521.2)-cityShift,350,'Prodi IPS',warnings,6.5,false,BLACK);
 if(hasFaculty)single(page,fonts,`FAKULTAS ${upper(data.fakultas)}`,8.35,cx,521.2-cityShift,350,'Fakultas IPS',warnings,6.5,false,BLACK);
 single(page,fonts,upper(canonicalUniversity(data.universitas)),8.35,cx,530.3-cityShift,350,'Universitas IPS',warnings,6.5,false,BLACK);
 if(hasCity)single(page,fonts,upper(data.kota),8.35,cx,530.3,350,'Kota IPS',warnings,6.5,false,BLACK);
 const year=norm(data.bulan_tahun).match(/\b(?:19|20)\d{2}\b/u)?.[0]||norm(data.bulan_tahun);
 single(page,fonts,year,8.35,cx,539.3,160,'Tahun IPS',warnings,7,false,BLACK);
 const spine=ipsTitleSpine(fonts,segs,mm,warnings);
 for(let i=0;i<spine.lines.length;i++)renderLine(page,fonts,spine.lines[i],spine.size,spine.xs[i],spine.centerTop,true,BLACK);
 const metaPt=mm<=6?4.05:mm<=8?4.55:5.2;
 const metaPitch=metaPt*1.03;
 single(page,fonts,upper(data.nama),metaPt,g.center-metaPitch/2,391,97,'Nama punggung IPS',warnings,3.5,true,BLACK);
 single(page,fonts,upper(data.jenis_dokumen),metaPt,g.center+metaPitch/2,391,88,'Jenis punggung IPS',warnings,3.5,true,BLACK);
 single(page,fonts,year,metaPt,g.center,493,78,'Tahun punggung IPS',warnings,3.5,true,BLACK);
 if(mm!==5)warnings.push(`Ketebalan IPS ${mm} mm dihitung dari referensi 5 mm. Wajib cetak uji skala 100%.`);
 const bytes=new Uint8Array(await doc.save({useObjectStreams:true}));
 const verify=await PDFDocument.load(bytes);
 if(verify.getPageCount()!==1||Math.abs(verify.getPage(0).getWidth()-IPS_REFERENCE.pageWidthPt)>.4||Math.abs(verify.getPage(0).getHeight()-IPS_REFERENCE.pageHeightPt)>.4)fail('Hasil PDF Soft Cover IPS gagal verifikasi halaman dan ukuran.');
 return {bytes,warnings,details:{mode:'softips',mm,paper_mm:IPS_PRINT_MM,pages:1,spine_font_pt:spine.size,spine_lines:spine.lines.length,guide_left:g.left,guide_right:g.right}};
}


/** A single square CD cover based on the user's five-page Word reference.
 * Two original UIN Madura logos are preserved as a separate image asset.
 * A Cover CD has NO spine or hard-cover fold guides.
 */
async function generateCoverCDPDF(data){
 assertCDData(data);
 const warnings=[];
 const doc=await PDFDocument.create();
 const page=doc.addPage([CD_PAGE_PT,CD_PAGE_PT]);
 const fonts=await getFonts(doc,warnings);
 const logoBytes=await loadAsset('./assets/cover_cd_uin_logo.png');
 const logo=await doc.embedPng(logoBytes);
 const l=CD_LAYOUT;
 const bold=fonts.bold[0].font;
 function line(txt,size,top,maxWidth,minimum=7,underline=false){
  const value=upper(txt);if(!value)return;
  let adjusted=size;
  while(adjusted>=minimum && bold.widthOfTextAtSize(value,adjusted)>maxWidth)adjusted-=.25;
  if(adjusted<minimum)fail('Teks Cover CD terlalu panjang: '+value.slice(0,75));
  const width=bold.widthOfTextAtSize(value,adjusted),baseline=page.getHeight()-top-adjusted*.84;
  page.drawText(value,{x:l.centerX-width/2,y:baseline,size:adjusted,font:bold,color:BLACK});
  if(underline)page.drawLine({start:{x:l.centerX-width/2,y:baseline-Math.max(.95,adjusted*.135)},end:{x:l.centerX+width/2,y:baseline-Math.max(.95,adjusted*.135)},thickness:Math.max(.5,adjusted*.052),color:BLACK});
  if(adjusted<size)warnings.push('Cover CD: teks '+value.slice(0,25)+' disesuaikan menjadi '+adjusted+' pt.');
 }
 line(data.nama,9,l.nameTop,l.maxTextWidth,7,nameUnderlineEnabled(data));
 line('NIM: '+data.nim,9,l.nimTop,l.maxTextWidth,7);
 if(norm(data.prodi))line(data.prodi,9,l.studyTop,l.maxTextWidth,7);
 if(norm(data.bulan_tahun))line(data.bulan_tahun,9,l.dateTop,l.maxTextWidth,7);
 for(const box of [l.leftLogo,l.rightLogo]){
  page.drawImage(logo,{x:box.left,y:page.getHeight()-box.top-box.height,width:box.width,height:box.height});
 }
 const title=computeCDTitle(data.judul,(str,size)=>bold.widthOfTextAtSize(str,size));
 if(title.size<l.titleSize)warnings.push('Cover CD: font judul disesuaikan menjadi '+title.size+' pt agar tetap di bawah kedua logo.');
 title.lines.forEach((txt,i)=>line(txt,title.size,title.top+i*title.pitch,l.titleMaxWidth,title.size));
 const bytes=new Uint8Array(await doc.save({useObjectStreams:true}));
 const verify=await PDFDocument.load(bytes);
 if(verify.getPageCount()!==1||Math.abs(verify.getPage(0).getWidth()-CD_PAGE_PT)>.25||Math.abs(verify.getPage(0).getHeight()-CD_PAGE_PT)>.25)fail('Hasil Cover CD gagal pemeriksaan 137 × 137 mm.');
 return {bytes,warnings,details:{mode:'covercd',mm:null,paper_mm:CD_PRINT_MM,pages:1,title_lines:title.lines.length,title_font_pt:title.size,logo_count:2}};
}

/** Cover Artikel 475 × 320 mm: editable front on right, blank left.
 * Keep the ORIGINAL reference's FOUR short positioning marks: two at the
 * upper edge and two at the lower edge (no long spine/fold guides).
 */
async function generateArticleCoverPDF(data){
 if(!data||typeof data!=='object')fail('Data Cover Artikel tidak valid.');
 for(const field of ['judul','nama','nim','prodi','universitas','bulan_tahun']){
  const v=String(data[field]??'');
  if(!v.trim())fail('Cover Artikel: kolom '+field+' wajib diisi.');
  if(v.length>2000||v.includes('\u00ad')||LATIN_CHECK.test(v))
   fail('Cover Artikel: koreksi kolom '+field+' (teks terlalu panjang atau karakter belum didukung).');
 }
 if(String(data.fakultas??'').length>2000)fail('Cover Artikel: kolom fakultas terlalu panjang.');
 const segments=normalizeTitleSegments(data).map(s=>({text:s.text.toLocaleUpperCase('id-ID'),italic:s.italic}));
 const warnings=[];
 // Keep manually entered line breaks when present. Match the supplied sample's
 // original three lines even when the extracted PDF title arrived as one string.
 function articleTitleLines(fonts,pt){
  const entered=segments.map(s=>s.text).join('');
  if(/[\r\n]/u.test(entered)){
   const blocks=[[]];
   for(const seg of segments){
    seg.text.split(/\r?\n/u).forEach((part,i)=>{
     if(i)blocks.push([]);
     if(part)blocks.at(-1).push({text:part,italic:seg.italic});
    });
   }
   return blocks.filter(block=>block.some(s=>s.text.trim())).flatMap(block=>greedyLines(fonts,block,pt,412));
  }
  const reference='EKSPLORASI PERTEMANAN (CIRCLE) TERHADAP PERKEMBANGAN EMPATI DAN KETERAMPILAN SOSIAL REMAJA DI MTSN 1 PAMEKASAN';
  if(norm(entered)===reference){
   const tokens=tokensFromSegments(segments);
   const split1=tokens.findIndex(t=>t.text==='EMPATI'),split2=tokens.findIndex(t=>t.text==='MTSN');
   if(split1>0&&split2>split1)return [sliceTokens(tokens,0,split1),sliceTokens(tokens,split1,split2),sliceTokens(tokens,split2,tokens.length)];
  }
  return greedyLines(fonts,segments,pt,412);
 }

 const doc=await PDFDocument.create();
 const page=doc.addPage([mmPt(475),mmPt(320)]);
 // V4.46: match the two tiny positioning marks at BOTH the top and bottom
 // of cover artikel(1).pdf. Measured in original 475 x 320 mm PDF points.
 // They must never be removed even though the ARTICLE cover has no spine text.
 const markInk=rgb(0.13582,0.12105,0.12430);
 for(const x of [693.13,721.16]){
  for(const [top,bottom] of [[28.081,32.456],[874.344,882.081]]){
   page.drawLine({start:{x,y:page.getHeight()-top},end:{x,y:page.getHeight()-bottom},thickness:1.4,color:markInk});
  }
 }
 const fonts=await getFonts(doc,warnings);
 const cx=997.9;
 let title=null;
 for(let pt=12;pt>=9.5;pt-=.25){
  const rows=articleTitleLines(fonts,pt);
  if(rows.length<=4&&rows.every(row=>measure(fonts,row,pt)<=412+NEAR)){title={rows,pt};break;}
 }
 if(!title)fail('Judul Cover Artikel terlalu panjang untuk empat baris; periksa teks judul.');
 title.rows.forEach((line,i)=>renderLine(page,fonts,line,title.pt,cx,117.31+i*13.29,false,BLACK));
 if(title.pt<12)warnings.push('Cover Artikel: font judul disesuaikan menjadi '+title.pt+' pt.');
 single(page,fonts,'ARTIKEL',17.9,cx,244.17,420,'Label ARTIKEL',warnings,17.9);
 single(page,fonts,'Oleh:',12,cx,613.83,420,'Oleh',warnings);
 single(page,fonts,upper(data.nama),12,cx,627.12,425,'Nama Artikel',warnings,9,false,BLACK,nameUnderlineEnabled(data));
 single(page,fonts,'NIM: '+norm(data.nim),12,cx,640.41,425,'NIM Artikel',warnings,9);
 const prefixed=(prefix,value)=>{const clean=upper(value);return clean.startsWith(prefix+' ')?clean:prefix+' '+clean;};
 const footer=[prefixed('PROGRAM STUDI',data.prodi),...(norm(data.fakultas)?[prefixed('FAKULTAS',data.fakultas)]:[]),upper(canonicalUniversity(data.universitas)),upper(data.bulan_tahun)];
 const firstBaseline=801.24-(footer.length-1)*13.29;
 footer.forEach((line,i)=>single(page,fonts,line,12,cx,firstBaseline+i*13.29,425,'Identitas Artikel '+(i+1),warnings,9));
 const bytes=new Uint8Array(await doc.save({useObjectStreams:true}));
 const checked=await PDFDocument.load(bytes);
 if(checked.getPageCount()!==1||Math.abs(checked.getPage(0).getWidth()-mmPt(475))>.3||Math.abs(checked.getPage(0).getHeight()-mmPt(320))>.3)fail('PDF Cover Artikel gagal pemeriksaan ukuran kertas 475 × 320 mm.');
 return {bytes,warnings,details:{mode:'coverartikel',mm:null,paper_mm:COLOR_PRINT_MM,pages:1,has_spine:false,has_logo:false,position_marks:4,title_lines:title.rows.length,title_font_pt:title.pt}};
}

/** Main public API, backward-compatible with V3.8 */
export async function generatePDF(data,mm,mode='polos',customColor=null,customLogo=null){
 // Normalisasi satu kali sebelum semua jenis template menambahkan label.
 data=normalizeCoverAcademicIdentity(data);
 await ensureAssets();
 const c=validateCoverMode(mode,customColor);
 if(c.type==='coverartikel')return generateArticleCoverPDF(data);
 if(c.type==='covercd')return generateCoverCDPDF(data);
 if(c.type==='dummybook')return generateDummyPDF(data,mm);
 if(c.type==='softips')return generateSoftIPSPDF(data,mm);
 if(c.type==='unira')return generateUniraPDF(data,mm);
 if(c.type==='uim')return generateUimPDF(data,mm);
 if(c.type==='customlogo1')return generateUimPDF(data,mm,{color:c.color,logo:customLogo});
 if(!PLAIN_VARIANTS.includes(c.type))return generateColorPDF(data,mm,c.type,c.color,customLogo);
 const plain=await generatePlainPDF(data,mm,c.type);
 let out=await resizePlainToPrint(plain.bytes);
 let trim215=null;
 if(PLAIN_215_VARIANTS.includes(c.type)){
  const adjusted=await adjustPlain215Trim(out,Number(mm),LAYOUT[Number(mm)]);
  out=adjusted.bytes;trim215=adjusted.geometry;
 }
 // V4.38: normalisasi garis fix PDF untuk keempat varian Polos, bukan 215 saja.
 const minimal=await simplifyAllPlainGuides(out,Number(mm),LAYOUT[Number(mm)],c.type);
 out=minimal.bytes;
 const reopened=await PDFDocument.load(out);
 if(Math.abs(reopened.getPage(0).getWidth()-mmPt(480))>.3||Math.abs(reopened.getPage(0).getHeight()-mmPt(330))>.3)fail('PDF polos gagal validasi ukuran 480 × 330 mm.');
 return {...plain,bytes:out,details:{...plain.details,mode:c.type,paper_mm:PLAIN_PRINT_MM,side_trim_mm:trim215?215:217,trim_geometry:trim215,guide_style:'minimal_update_pdf',guide_geometry:minimal.geometry}};
}

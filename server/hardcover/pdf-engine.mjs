/**
 * ZAIN.NET PDF engine, Node.js edition for AI Studio Build.
 * Each page begins with the already cleaned ORIGINAL PDF vector master.
 * No template lines, crop marks, or cover geometry are re-created here.
 * Important: Tinos is not the commercial Times New Roman face used in the
 * supplied PDF. Production printing still requires a proof and font review.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PDFDocument, StandardFonts, degrees, rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fontsEngine from '@pdf-lib/fontkit';
import {colorGuideGeometry, SOURCE_SPINE, mmPoint} from './guide-geometry.mjs';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const LAYOUT=JSON.parse(await fs.readFile(path.join(ROOT,'assets','layout.json'),'utf8')).templates;
const ALL=Object.keys(LAYOUT).map(Number).sort((a,b)=>a-b);
const MASTER=await fs.readFile(path.join(ROOT,'assets','masters.pdf'));
const pagePt={width:483*72/25.4,height:330*72/25.4};
const PLAIN_PRINT_MM={width:480,height:330};
const COLOR_PRINT_MM={width:475,height:320};
const mmPt=(v)=>v*72/25.4;
const YELLOW=rgb(1,0.9487449527,0);
const BLACK=rgb(0,0,0);
const COLOR_MASTERS=await fs.readFile(path.join(ROOT,'assets','warna_clean.pdf'));
const COLOR_TRANSPARENT=await fs.readFile(path.join(ROOT,'assets','warna_transparent_marks_logo.pdf'));
const NEAR=0.18;
const LATIN_CHECK=/[\u0600-\u06ff\u0750-\u077f]/u;

export class PDFPreflightError extends Error {constructor(msg){super(msg);this.status=422;this.name='PDFPreflightError';}}
export const thicknesses=ALL;
export const calibration=LAYOUT;
function fail(msg){throw new PDFPreflightError(msg);}
function norm(s){return String(s??'').replace(/\s+/gu,' ').trim();}
function upper(s){return norm(s).toLocaleUpperCase('id-ID');}
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
 for(const name of ['judul','nama','nim','prodi','fakultas','universitas','jenis_dokumen','bulan_tahun']){
  if(!String(data[name]??'').trim())fail(`Kolom ${name} belum diisi.`);
  if(String(data[name]).length>2000)fail(`Kolom ${name} terlalu panjang.`);
  if(String(data[name]).includes('\u00ad'))fail(`Kolom ${name} mengandung soft hyphen (U+00AD). Koreksi manual sebelum ekspor.`);
  if(LATIN_CHECK.test(String(data[name])))fail('Aksara Arab langsung belum didukung engine PDF Node ini. Transliterasi Arab-Latin dapat digunakan.');
 }
 return normalizeTitleSegments(data);
}

const fontCache=new Map();
async function loadRuntimeFont(style,subset){
 const custom=style==='italic'?process.env.ZAIN_ITALIC_FONT:process.env.ZAIN_BOLD_FONT;
 if(custom){try{return await fs.readFile(custom);}catch{fail(`Font berlisensi tidak ditemukan pada path ${custom}.`);}}
 const fontDir=path.join(process.cwd(),'node_modules','@fontsource','tinos','files');
 let files=[];try{files=await fs.readdir(fontDir);}catch{fail('Paket @fontsource/tinos belum terpasang. Jalankan npm install.');}
 const suffix=style==='italic'?'italic':'normal';
 const preferred=[
   `tinos-${subset}-700-${suffix}.woff`, `tinos-${subset}-700-${suffix}.woff2`,
   `tinos-${subset}-700-${suffix}.ttf`
 ];
 const found=preferred.find(f=>files.includes(f)) || files.find(f=>f.includes(`${subset}-700-${suffix}`)&&/\.(woff|woff2|ttf)$/i.test(f));
 if(!found)fail(`Font Tinos ${style} subset ${subset} tidak tersedia dalam paket npm.`);
 return fs.readFile(path.join(fontDir,found));
}
async function getFonts(pdf,warnings=[]){
 pdf.registerFontkit(fontkit);
 const set={};
 try {
 for(const style of ['bold','italic']){
  set[style]=[];
  for(const subset of ['latin','latin-ext']){
   const bytes=await loadRuntimeFont(style,subset);
   try{
    const embedded=await pdf.embedFont(bytes,{subset:true});
    const fc=fontsEngine.create(bytes);
    set[style].push({font:embedded,face:fc,subset});
   }catch(e){fail(`Tidak dapat memuat font Tinos ${style} (${subset}): ${String(e.message||e).slice(0,130)}. Gunakan font TTF berlisensi bila diperlukan.`);}
  }
 }
 return set;
 } catch (error) {
  if(process.env.ZAIN_BOLD_FONT || process.env.ZAIN_ITALIC_FONT) throw error;
  // Safe fallback for the sample's ordinary ASCII if Fontsource's runtime
  // font files cannot be parsed in a specific AI Studio environment.
  // Do NOT silently replace non-ASCII transliteration characters.
  const bold=await pdf.embedFont(StandardFonts.TimesRomanBold);
  const italic=await pdf.embedFont(StandardFonts.TimesRomanBoldItalic);
  const supportsAscii={hasGlyphForCodePoint:(cp)=>cp>=32&&cp<=126};
  warnings.push('Font Tinos tidak tersedia; menggunakan font PDF standar Times Bold untuk karakter ASCII. Periksa tata letak dan cetak fisik.');
  return {
    bold:[{font:bold,face:supportsAscii,subset:'ascii'}],
    italic:[{font:italic,face:supportsAscii,subset:'ascii'}]
  };
 }
}
function chars(str){return Array.from(str);}
function selectGlyph(fonts,style,ch){
 const wanted=style?'italic':'bold';
 const cp=ch.codePointAt(0);
 // The bundled latin-ext fallback is only chosen when the primary lacks glyph.
 const chosen=fonts[wanted].find(e=>e.face.hasGlyphForCodePoint(cp));
 if(!chosen)fail(`Font tidak mendukung karakter ${ch} (U+${cp.toString(16).toUpperCase()}). Periksa font Unicode.`);
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
function spineRows(fonts,segs,size,maxLen,maxRows){
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
 for(let lines=1;lines<=Math.min(3,maxRows,n);lines++){
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
function spinePositions(size,mm,count){
 const c=LAYOUT[mm],left=c.left,right=c.right;
 const pitch=size*1.13;
 const span=(count-1)*pitch+(0.892-(-0.216))*size;
 if(span>right-left-.30+0.001)fail('Baris punggung akan melewati garis batas fisik.');
 const base=(left+right)/2-(0.892-.216)*size/2;
 return Array.from({length:count},(_,i)=>base+(count-1)*pitch/2-i*pitch);
}
function chooseSpine(fonts,segs,mm,warnings){
 const base=mm===10?8:9;
 const cy=LAYOUT[mm].spine_title_center_y;
 const maxLen=Math.min(460,2*(cy-54.5),2*(530-cy));
 for(const [rows,size] of [[2,base],...[base,base-1,base-2,base-3].filter(sz=>sz>=6).map(sz=>[3,sz])]){
  try{
   const result=spineRows(fonts,segs,size,maxLen,rows);
   const xs=spinePositions(size,mm,result.length);
   if(result.length===3)warnings.push(`Judul punggung ${mm} mm menjadi 3 baris.`);
   if(size<base)warnings.push(`Font judul punggung otomatis diturunkan dari ${base} ke ${size} pt.`);
   return {result,xs,size};
  }catch(e){if(!(e instanceof PDFPreflightError))throw e;}
 }
 fail(`Judul terlalu panjang untuk punggung ${mm} mm pada minimal 6 pt dan maksimal 3 baris. PDF diblokir supaya tidak salah cetak.`);
}
function single(page,fonts,text,size,cx,y,maxWidth,label,warnings,minFont=size,rotated=false,ink=BLACK){
 text=String(text).trim();
 let final=size;const natural=measure(fonts,[{text,italic:false}],size);
 if(natural>maxWidth){final=Math.floor((size*maxWidth/natural*.994)*100)/100;
   if(final<minFont)fail(`${label} terlalu panjang untuk area yang tersedia. Diperlukan ${final} pt; batas aman ${minFont} pt.`);
   warnings.push(`${label} disesuaikan dari ${size} menjadi ${final} pt.`);
 }
 renderLine(page,fonts,[{text,italic:false}],final,cx,y,rotated,ink);
}

async function generatePlainPDF(data,mm){
 mm=Number(mm);const segs=validate(data,mm);const conf=LAYOUT[mm],warnings=[];
 const doc=await PDFDocument.create();const src=await PDFDocument.load(MASTER);
 if(src.getPageCount()!==ALL.length)fail('Jumlah master PDF tidak sama dengan konfigurasi 19 ukuran.');
 const [page]=await doc.copyPages(src,[conf.page]);doc.addPage(page);
 if(Math.abs(page.getWidth()-pagePt.width)>.55||Math.abs(page.getHeight()-pagePt.height)>.55)fail('Ukuran master bukan 483 × 330 mm.');
 const fonts=await getFonts(doc,warnings);
 for(const c of [...String(data.judul),...segs.map(s=>s.text)].join(''))if(LATIN_CHECK.test(c))fail('Aksara Arab belum mendukung shaping RTL.');
 const front=frontTitle(fonts,segs,conf,data,warnings);
 for(let i=0;i<front.lines.length;i++)renderLine(page,fonts,front.lines[i],front.size,conf.front_cx,conf.front_title_y+i*conf.front_title_pitch);
 single(page,fonts,upper(data.jenis_dokumen),17.8998,conf.front_type_cx,conf.front_type_y,240,'Jenis dokumen',warnings,13);
 single(page,fonts,'Oleh:',12,conf.front_cx,conf.front_label_y,180,'Label Oleh',warnings,12);
 single(page,fonts,upper(data.nama),12,conf.front_cx,conf.front_name_y,400,'Nama depan',warnings,9);
 single(page,fonts,`${conf.front_nim_prefix} ${norm(data.nim)}`,12,conf.front_cx,conf.front_nim_y,390,'NIM',warnings,9);
 single(page,fonts,`PROGRAM STUDI ${upper(data.prodi)}`,12,conf.front_cx,conf.front_prodi_y,395,'Prodi',warnings,9);
 single(page,fonts,`FAKULTAS ${upper(data.fakultas)}`,12,conf.front_cx,conf.front_fakultas_y,395,'Fakultas',warnings,9);
 single(page,fonts,upper(data.universitas),12,conf.front_cx,conf.front_universitas_y,395,'Universitas',warnings,9);
 single(page,fonts,upper(data.bulan_tahun),12,conf.front_cx,conf.front_year_y,395,'Tanggal',warnings,9.5);
 const spine=chooseSpine(fonts,segs,mm,warnings);
 for(let i=0;i<spine.result.length;i++)renderLine(page,fonts,spine.result[i],spine.size,spine.xs[i],conf.spine_title_center_y,true);
 single(page,fonts,upper(data.jenis_dokumen),conf.spine_type_pt,conf.spine_type_x,conf.spine_type_y,135,'Jenis dokumen punggung',warnings,6,true);
 single(page,fonts,upper(data.nama),conf.spine_name_pt,conf.spine_name_x,conf.spine_name_y,175,'Nama punggung',warnings,6,true);
 single(page,fonts,upper(data.bulan_tahun),conf.spine_year_pt,conf.spine_year_x,conf.spine_year_y,115,'Tanggal punggung',warnings,6,true);
 const bytes=await doc.save({useObjectStreams:true});
 // This is a structural preflight, NOT a substitute for a pixel-perfect print proof.
 const reopened=await PDFDocument.load(bytes);
 if(reopened.getPageCount()!==1)fail('PDF hasil harus terdiri dari tepat satu halaman.');
 const p=reopened.getPage(0);
 if(Math.abs(p.getWidth()-pagePt.width)>.55||Math.abs(p.getHeight()-pagePt.height)>.55)fail('PDF hasil tidak berukuran 483 × 330 mm.');
 return {bytes:Buffer.from(bytes),warnings,details:{mm,spine_font_pt:spine.size,spine_lines:spine.result.length}};
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
 return Buffer.from(await d.save({useObjectStreams:true}));
}

const COLOR_TYPES=['merah','maroon','custom'];
export const coverTypes=['polos',...COLOR_TYPES];
export const printSizes={polos:PLAIN_PRINT_MM,merah:COLOR_PRINT_MM,maroon:COLOR_PRINT_MM,custom:COLOR_PRINT_MM};
export function validateCoverMode(mode,customColor) {
 const type=String(mode||'polos').toLowerCase();
 if(!coverTypes.includes(type))fail('Pilihan jenis cover tidak dikenal.');
 if(type!=='custom')return {type,color:null};
 const hex=String(customColor||'').trim();
 if(!/^#[0-9A-Fa-f]{6}$/.test(hex))fail('Pilih kode warna custom dalam format #RRGGBB.');
 return {type,color:hex.toUpperCase()};
}
function hexRgb(value) {
 const h=value.replace('#','');
 return rgb(parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255);
}
function splitFrontTitle(fonts,segs,maxWidth=405,maxRows=5){
 for(let pt=12;pt>=9.8-1e-6;pt=Math.round((pt-.2)*10)/10){
  const lines=greedyLines(fonts,segs,pt,maxWidth);
  if(lines.length<=maxRows)return {lines,size:pt};
 }
 fail('Judul cover depan warna terlalu panjang untuk maksimal lima baris di posisi asli. Periksa dan ringkas hanya bila sesuai naskah.');
}
function colorSpine(fonts,segs,mm,warnings){
 // The front cover and logo are FIXED. The color spine right-side guideline
 // is at x=693.10 PDF points, matching both user-supplied pages. The left
 // guideline moves by the exact ordered thickness in millimeters.
 const {right,left,center:middle}=colorGuideGeometry(mm);
 const base=mm===10?8:9;
 const topCenterY=324;
 const maxLen=320;
 for(let size=base;size>=6;size--){
  for(const allowed of [2,3]){
   try{
    const lines=spineRows(fonts,segs,size,maxLen,allowed);
    const pitch=size*1.11;
    // Size is real points; use bounding height no larger than available spine.
    const span=(lines.length-1)*pitch+size*1.15;
    if(span>right-left-1.1)continue;
    const x=lines.map((_,i)=>middle+(lines.length-1)*pitch/2-i*pitch);
    if(size<base)warnings.push(`Font judul punggung warna disesuaikan ${base} → ${size} pt.`);
    if(lines.length>2)warnings.push('Judul punggung warna menggunakan 3 baris.');
    return {lines,x,size,middle,centerY:topCenterY,edges:[left,right]};
   } catch(error){if(!(error instanceof PDFPreflightError))throw error;}
  }
 }
 fail(`Judul punggung warna ${mm} mm belum muat 3 baris pada ukuran minimum 6 pt. PDF tidak dibuat.`);
}
/** Original yellow crop ticks are replaced after covering only the top/bottom
 * strips of the CLEAN original master. Every LEFT tick, including the far
 * back-cover trim/hinge, shifts by the exact difference in thickness.
 * All right/front-side ticks stay fixed. Logo and full color-front layout stay.
 */
export function drawPrecisionColorGuides(page,mm,background){
 const geom=colorGuideGeometry(mm);
 const w=page.getWidth(),h=page.getHeight(), yellow=YELLOW;
 // Cover the existing reference ticks; never obscure text, logo, or cover data.
 page.drawRectangle({x:0,y:h-36,width:w,height:36,color:background});
 page.drawRectangle({x:0,y:0,width:w,height:36,color:background});
 const line=(x,top)=>page.drawLine({start:{x,y:top?h:0},end:{x,y:top?h-32.2:32.2},thickness:.5,color:yellow});
 for(const x of [...geom.guidesLeft,...geom.guidesRight]){
  if(x>=0 && x<=w){line(x,true);line(x,false);}
 }
 const leftCorner=geom.guidesLeft[0],rightCorner=geom.guidesRight.at(-1);
 for(const y of [h-32.2,32.2]){
  page.drawLine({start:{x:Math.max(0,leftCorner-45),y},end:{x:Math.max(0,leftCorner),y},thickness:.5,color:yellow});
  page.drawLine({start:{x:rightCorner,y},end:{x:w,y},thickness:.5,color:yellow});
 }
 return geom;
}
async function generateColorPDF(data,mm,mode,customColor){
 mm=Number(mm);
 const segs=validate(data,mm),warnings=[];
 const {type,color}=validateCoverMode(mode,customColor);
 if(type==='polos')fail('Kesalahan mode cover warna.');
 const doc=await PDFDocument.create();
 const src=await PDFDocument.load(type==='custom'?COLOR_TRANSPARENT:COLOR_MASTERS);
 const sourceIndex=type==='maroon'?1:0;
 if(type==='custom'){
  const pg=doc.addPage([mmPt(475),mmPt(320)]);
  pg.drawRectangle({x:0,y:0,width:pg.getWidth(),height:pg.getHeight(),color:hexRgb(color)});
  const [stamp]=await doc.embedPdf(await fs.readFile(path.join(ROOT,'assets','warna_transparent_marks_logo.pdf')),[0]);
  pg.drawPage(stamp,{x:0,y:0,width:pg.getWidth(),height:pg.getHeight()});
 } else {
  const [page]=await doc.copyPages(src,[sourceIndex]);doc.addPage(page);
 }
 const page=doc.getPage(0);
 const background=type==='merah'?rgb(1,0,0):type==='maroon'?rgb(139/255,0,0):hexRgb(color);
 // A shifted yellow crop mark falling OUTSIDE the 475mm page is a
 // production safety failure, not a cosmetic warning. 28mm on the supplied
 // color master has this problem; never export a PDF with a missing trim mark.
 const anticipatedMarks=colorGuideGeometry(mm);
 if(anticipatedMarks.leftmostMarkClipped){
   fail(`Mode warna ${mm} mm: garis potong kiri terluar keluar dari kertas 475 mm sebanyak ${(-anticipatedMarks.guidesLeft[0]/mmPt(1)).toFixed(2)} mm. PDF diblokir. Perlu master belakang yang diperbaiki atau penyesuaian trim yang disetujui operator.`);
 }
 if(anticipatedMarks.guidesLeft[0]<mmPt(1.1))
   warnings.push(`Tanda potong belakang kiri hanya ${(anticipatedMarks.guidesLeft[0]/mmPt(1)).toFixed(2)} mm dari tepi kertas; periksa sebelum cetak.`);
 const marks=drawPrecisionColorGuides(page,mm,background);
 if(Math.abs(page.getWidth()-mmPt(475))>.3||Math.abs(page.getHeight()-mmPt(320))>.3)fail('Template warna bukan 475 × 320 mm.');
 const fonts=await getFonts(doc,warnings);
 const front=splitFrontTitle(fonts,segs);
 // Cover front layout follows *color reference*, NOT Serli/plain layout.
 for(let i=0;i<front.lines.length;i++)renderLine(page,fonts,front.lines[i],front.size,1000.7,120.2+i*13.29,false,YELLOW);
 single(page,fonts,upper(data.jenis_dokumen),17.9,1000.7,248.4,230,'Jenis dokumen warna',warnings,14,false,YELLOW);
 single(page,fonts,'Oleh',12,1000.7,614.8,165,'Label Oleh',warnings,12,false,YELLOW);
 single(page,fonts,norm(data.nama),12,1000.7,628.1,330,'Nama warna',warnings,8,false,YELLOW);
 single(page,fonts,`NIM. ${norm(data.nim)}`,12,1000.7,641.4,330,'NIM warna',warnings,9,false,YELLOW);
 single(page,fonts,`PROGRAM STUDI ${upper(data.prodi)}`,12,1000.7,767.1,395,'Prodi warna',warnings,9,false,YELLOW);
 single(page,fonts,`FAKULTAS ${upper(data.fakultas)}`,12,1000.7,780.4,395,'Fakultas warna',warnings,9,false,YELLOW);
 single(page,fonts,upper(data.universitas),12,1000.7,793.7,395,'Universitas warna',warnings,9,false,YELLOW);
 // Original colored samples print the YEAR only, not the month name.
 const yearMatch=norm(data.bulan_tahun).match(/\b\d{4}\b/u);
 const year=yearMatch?yearMatch[0]:norm(data.bulan_tahun);
 single(page,fonts,year,12,1000.7,807,250,'Tahun warna',warnings,9,false,YELLOW);
 const spine=colorSpine(fonts,segs,mm,warnings);
 for(let i=0;i<spine.lines.length;i++)renderLine(page,fonts,spine.lines[i],spine.size,spine.x[i],spine.centerY,true,YELLOW);
 // Two vertical lanes for document type and name, and a separate year below.
 // These are calculated from the ACTUAL available width for each order.
 const pitch=mm>=13?8.9:6.2;
 const spineTypeSize=Math.max(6,Math.min(9,mm-2));
 single(page,fonts,upper(data.jenis_dokumen),spineTypeSize,spine.middle+pitch/2,661,100,'Jenis dokumen punggung warna',warnings,6,true,YELLOW);
 single(page,fonts,upper(data.nama),spineTypeSize,spine.middle-pitch/2,661,175,'Nama punggung warna',warnings,6,true,YELLOW);
 single(page,fonts,year,Math.min(8,spineTypeSize),spine.middle,798,75,'Tahun punggung warna',warnings,6,true,YELLOW);
 const out=Buffer.from(await doc.save({useObjectStreams:true}));
 const reread=await PDFDocument.load(out);
 if(reread.getPageCount()!==1||Math.abs(reread.getPage(0).getWidth()-mmPt(475))>.3||Math.abs(reread.getPage(0).getHeight()-mmPt(320))>.3)fail('PDF warna gagal validasi ukuran 475 × 320 mm.');
 return {bytes:out,warnings,details:{mode:type,mm,spine_font_pt:spine.size,spine_lines:spine.lines.length,guide_left:marks.left,guide_right:marks.right,paper_mm:COLOR_PRINT_MM,logo:'logo asli dari PDF warna'}};
}

/** Main public API, backward-compatible with V3.8 */
export async function generatePDF(data,mm,mode='polos',customColor=null){
 const c=validateCoverMode(mode,customColor);
 if(c.type!=='polos')return generateColorPDF(data,mm,c.type,c.color);
 const plain=await generatePlainPDF(data,mm);
 const out=await resizePlainToPrint(plain.bytes);
 const reopened=await PDFDocument.load(out);
 if(Math.abs(reopened.getPage(0).getWidth()-mmPt(480))>.3||Math.abs(reopened.getPage(0).getHeight()-mmPt(330))>.3)fail('PDF polos gagal validasi ukuran 480 × 330 mm.');
 return {...plain,bytes:out,details:{...plain.details,mode:'polos',paper_mm:PLAIN_PRINT_MM}};
}

/** ZAIN.NET COVER V4.22 — read the COMPLETE original ABSTRAK section.
 * Cover metadata still uses first-page extraction in document-reader.js.
 * This separate reader scans the thesis until the heading ABSTRAK is found
 * and then stops at Kata Kunci / ABSTRACT / next section, not at a page cap.
 * Only original paragraphs are returned; no summarization or fabrication.
 */
import {withTimeout} from './document-reader.js';
export function cleanParagraph(s){return String(s||'').replace(/[\u00a0\u200b]/gu,' ').replace(/\s+/gu,' ').trim();}
const abstractHeading=/^(?:ABSTRAK|ABSTRACT)\s*[:：]?$/iu;
const stopHeading=/^(?:KATA\s*KUNCI|KEY\s*WORDS?|ABSTRACT|ABSTRAK|KATA\s+PENGANTAR|BAB\s+[IVXLCDM]+|DAFTAR\s+ISI|DAFTAR\s+PUSTAKA|PENDAHULUAN|PENGESAHAN|HALAMAN\s+PERSETUJUAN|ACKNOWLEDGEMENTS?)\b/iu;
const isHeading=s=>abstractHeading.test(cleanParagraph(s));
const isStop=s=>stopHeading.test(cleanParagraph(s));
const metadata=/^(?:Nama|NIM|NPM|Judul|Pembimbing(?:\s+[I1]+)?|Program\s+Studi|Fakultas|Universitas|Tahun|Dosen|Jurusan)\s*[:：]/iu;
/** DOCX abstracts often start with a thesis citation of the form
 * "Adi Mulyono ... Skripsi ... Universitas ... pembimbing ...".
 * This is not abstract prose and must not appear on the back cover.
 */
export function isAbstractMetadata(s){
 const t=cleanParagraph(s);
 if(metadata.test(t))return true;
 if(/^(?:ABSTRAK|ABSTRACT|KATA\s*KUNCI|KEYWORDS?)\b/iu.test(t))return true;
 if(/^[\p{L}\s.'-]{5,90}\s*,?\s*\d{8,14}\b/u.test(t) && t.length<300)return true;
 if(/\b(?:skripsi|tesis)\b/iu.test(t) && /\b(?:universitas|fakultas|program\s+studi)\b/iu.test(t) &&
    /\b(?:pembimbing|promotor)\b/iu.test(t))return true;
 if(/^[^.!?]{3,100},?\s+\d{8,14}\s*[,.;]/u.test(t) && /\b(?:skripsi|tesis|universitas)\b/iu.test(t))return true;
 if(/\b(?:NIM|NPM)\s*[.:]?\s*\d{7,}\b/iu.test(t)&&
    /\b(?:skripsi|tesis|pembimbing|universitas|fakultas|studi)\b/iu.test(t))return true;
 if(/\b(?:skripsi|tesis)\b/iu.test(t)&& /\b(?:universitas|pembimbing)\b/iu.test(t)&&
    /\b(?:19|20)\d{2}\b/iu.test(t))return true;
 return false;
}
export function validateAbstractParagraphs(items){
 const ps=(items||[]).map(cleanParagraph).filter(Boolean).filter(p=>!isAbstractMetadata(p));
 if(!ps.length)throw Error('Bagian ABSTRAK ditemukan tetapi hanya metadata skripsi, bukan isi penelitian. Jangan gunakan identitas sebagai sampul belakang; koreksi paragraf manual atau unggah naskah lain.');
 if(ps.some(p=>/^(?:BAB\s+[IVXLCDM]+|DAFTAR\s+ISI|KATA\s+PENGANTAR)\b/iu.test(p)))throw Error('Pembatas ABSTRAK belum pasti; teks BAB lain terdeteksi. Periksa manual.');
 return ps;
}

export function parseAbstractParagraphs(blocks,{allowWithoutHeading=false}={}){
 const lines=(blocks||[]).map(cleanParagraph).filter(Boolean);
 const idx=lines.findIndex(isHeading);
 if(idx<0&&!allowWithoutHeading)return [];
 const out=[];
 for(const item of idx>=0?lines.slice(idx+1):lines){
  if(isStop(item))break;
  if(isAbstractMetadata(item))continue;
  if(item.length<24&&!/[.!?。]$/u.test(item))continue;
  out.push(item);
  if(out.length>=60)break;
 }
 return out;
}
function decodeXML(str){return String(str||'').replace(/&(?:#x([0-9a-f]+)|#(\d+)|amp|lt|gt|quot|apos);/giu,(m,h,n)=>{
 if(h||n){const v=parseInt(h||n,h?16:10);return v>0&&v<=0x10ffff?String.fromCodePoint(v):m;}
 return {'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[m.toLowerCase()]||m;
 });}
export function docxAbstractParagraphs(xml){
 const paragraphs=[];let found=false,finished=false;
 // A heading can be split over several <w:r>/<w:t>; reconstruct each w:p first.
 for(const match of String(xml||'').matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/gu)){
  const para=cleanParagraph([...match[1].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/gu)].map(m=>decodeXML(m[1])).join(''));
  if(!para)continue;
  if(!found){if(isHeading(para))found=true;continue;}
  if(isStop(para)){finished=true;break;}
  if(isAbstractMetadata(para))continue;
  if(para.length<24&&!/[.!?。]$/u.test(para))continue;
  paragraphs.push(para);
  if(paragraphs.length>60)break;
 }
 return paragraphs;
}
/** Group PDF.js spans into physical lines. PDF page's y coordinates point UP. */
export function pdfLines(items){
 const spans=(items||[]).filter(i=>String(i.str||'').trim()).map(i=>({text:cleanParagraph(i.str),x:Number(i.transform?.[4]||0),y:Number(i.transform?.[5]||0)}));
 spans.sort((a,b)=>b.y-a.y||a.x-b.x);
 const groups=[];
 for(const s of spans){let g=groups.find(g=>Math.abs(g.y-s.y)<2.5);
  if(!g){g={y:s.y,x:s.x,items:[]};groups.push(g);}g.items.push(s);g.x=Math.min(g.x,s.x);
 }
 return groups.sort((a,b)=>b.y-a.y).map(g=>({...g,text:cleanParagraph(g.items.sort((a,b)=>a.x-b.x).map(i=>i.text).join(' '))}));
}
/** Never invent a paragraph boundary based only on punctuation; use vertical
 * gap or new-line indent. If PDF loses indentation, return one paragraph and
 * flag it as ambiguous rather than splitting into fabricated paragraphs.
 */
export function groupPdfParagraphs(lines){
 if(!lines?.length)return [];
 const gaps=lines.slice(1).map((x,i)=>lines[i].y-x.y).filter(v=>v>1&&v<65).sort((a,b)=>a-b);
 const median=gaps[Math.floor((gaps.length-1)*.35)]||13;
 const paragraphs=[];let current='',previous=null;
 for(const l of lines){
  if(previous){const gap=previous.y-l.y,indent=l.x-previous.x;
   if((gap>median*1.55||(indent>12&&gap>median*.78))&&current){paragraphs.push(cleanParagraph(current));current='';}
  }
  current+=(current?' ':'')+l.text;previous=l;
 }
 if(current)paragraphs.push(cleanParagraph(current));
 return paragraphs.filter(p=>p.length>=24);
}
export async function readAbstractFromFile(file,{onProgress}={}){
 if(!file)throw Error('Pilih file PDF atau DOCX skripsi lengkap terlebih dahulu.');
 const progress=s=>{try{onProgress?.(s);}catch{}};
 if(/\.docx$/iu.test(file.name||'')){
  if(!globalThis.JSZip)throw Error('JSZip gagal dimuat.');
  progress('Membaca struktur Word sampai bagian ABSTRAK lengkap');
  const zip=await withTimeout(globalThis.JSZip.loadAsync(await file.arrayBuffer()),30000,'Membuka Word');
  const entry=zip.file('word/document.xml');if(!entry)throw Error('File DOCX tidak memiliki isi Word.');
  const xml=await withTimeout(entry.async('string'),45000,'Memuat teks DOCX');
  const paragraphs=docxAbstractParagraphs(xml);
  if(!paragraphs.length)throw Error('Bagian ABSTRAK lengkap tidak ditemukan sebagai paragraf di DOCX. Periksa judul heading atau salin abstrak manual.');
  const valid=validateAbstractParagraphs(paragraphs);
  return {paragraphs:valid,source:`DOCX asli: ${file.name}`,warnings:valid.length===1?['Hanya satu paragraf terdeteksi. Cocokkan batas paragraf dengan naskah asli.']:[]};
 }
 if(/\.pdf$/iu.test(file.name||'')||file.type==='application/pdf'){
  if(!globalThis.pdfjsLib)throw Error('PDF.js belum dimuat. Periksa akses pustaka browser.');
  globalThis.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  progress('Membuka seluruh struktur halaman PDF dan mencari heading ABSTRAK');
  const pdf=await withTimeout(globalThis.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer()),disableStream:true,disableAutoFetch:true}).promise,45000,'Membuka PDF skripsi');
  let found=false,done=false,paragraphs=[],lastPage=0;
  try{
   for(let i=1;i<=pdf.numPages;i++){
    lastPage=i;
    progress(found?`Membaca seluruh ABSTRAK: halaman ${i}`:`Mencari ABSTRAK: halaman ${i} dari ${pdf.numPages}`);
    const page=await withTimeout(pdf.getPage(i),18000,`PDF halaman ${i}`);
    const groups=pdfLines((await withTimeout(page.getTextContent(),18000,`Teks halaman ${i}`)).items);
    let start=0;
    if(!found){start=groups.findIndex(g=>isHeading(g.text));if(start<0)continue;found=true;start++;}
    const active=[];
    for(let j=start;j<groups.length;j++){
     const item=groups[j];
     if(isStop(item.text)){done=true;break;}
     if(isAbstractMetadata(item.text))continue;
     active.push(item);
    }
    const pagePars=groupPdfParagraphs(active);
    paragraphs.push(...pagePars);
    if(done)break;
    // Abstract often spans 1–2 pages. Guard against a missing section ending
    // accidentally harvesting a whole thesis; require manual correction.
    if(paragraphs.length>60||paragraphs.join(' ').length>22000)throw Error('Batas akhir ABSTRAK tidak ditemukan dengan jelas di PDF. Mohon tempel teks abstrak manual untuk menghindari BAB ikut tersalin.');
   }
   if(!found)throw Error(`Heading ABSTRAK tidak ditemukan pada ${pdf.numPages} halaman PDF. Jika hasil scan tanpa lapisan teks, salin abstrak manual.`);
   if(!paragraphs.length)throw Error('ABSTRAK ditemukan tetapi teksnya kosong atau berupa gambar scan.');
   paragraphs=validateAbstractParagraphs(paragraphs);
   const warnings=[];
   if(!done)warnings.push('Penanda akhir abstrak/Kata Kunci tidak ditemukan. Periksa agar tidak ada paragraf BAB lain yang ikut tersalin.');
   if(paragraphs.length===1)warnings.push('PDF hanya menghasilkan satu paragraf; periksa apakah paragraf aslinya terpisah.');
   return {paragraphs,source:`PDF asli: ${file.name} (ABSTRAK sampai halaman ${lastPage})`,warnings};
  }finally{try{await pdf.destroy();}catch{}}
 }
 throw Error('Untuk membaca abstrak otomatis gunakan PDF teks atau Word DOCX; foto/scan murni perlu salin manual.');
}

/* ZAIN.NET • pembaca PDF & DOCX di perangkat pengguna. Tidak ada layanan OCR berbayar. */
import {categorize,institutionLooksIncomplete} from './classifier.js';
import {recognizeLocalResult, prepareOCRZones, setOCRProgress} from './ocr-fast.js?v=4.47';
import {normalizedLines, mergeZones} from './ocr-zones.js?v=4.47';
import {scanNameUnderline,underlineScore,pdfNameBox} from './name-underline.js?v=4.47';
import {alignTitleFormatting,pdfFontLooksItalic,titleHasTransliteration} from './title-format.js?v=4.47';
import {readCoverWithGemini} from './gemini-cover-ocr.js?v=4.47';
export {setOCRProgress} from './ocr-fast.js';

export function withTimeout(promise,ms,label){
 let t;return Promise.race([Promise.resolve(promise),new Promise((_,reject)=>{t=setTimeout(()=>reject(new Error(`${label}: waktu proses melewati ${Math.round(ms/1000)} detik. Coba file lebih kecil atau ulangi.`)),ms);})]).finally(()=>clearTimeout(t));
}
const clean=s=>String(s||'').replace(/[\u00a0\u2000-\u200b]/gu,' ').replace(/\s+/gu,' ').trim();
function normalizedResult(lines,warnings=[],rich=null){
 const data=categorize(lines,warnings);
 if(rich?.length && data.judul){
  const aligned=alignTitleFormatting(data.judul,rich);
  if(aligned.length && aligned.map(x=>x.text).join('')===data.judul){
   data.title_segments=aligned;
   if(aligned.some(s=>s.italic))data.warnings.push('Italic judul ditemukan dari format font sumber. Periksa kembali sebelum cetak.');
  }else data.warnings.push('Format italic judul belum dapat dicocokkan dengan teks sumber; gunakan editor untuk memeriksa bagian miring.');
 }
 if(data.judul&&titleHasTransliteration(data.judul))data.warnings.push('Karakter transliterasi terdeteksi. Cocokkan setiap diakritik dengan dokumen asli.');
 return data;
}
function pdfLines(items,styles={}){
 const spans=[];
 for(const item of items||[]){const text=String(item.str||'').replace(/[\u00a0\u2000-\u200b]/gu,' ');if(!text.trim())continue;
  const x=item.transform?.[4]||0,y=item.transform?.[5]||0;
  spans.push({x,y,text,width:Number(item.width)||0,height:Number(item.height)||10,italic:pdfFontLooksItalic(item.fontName,styles[item.fontName]||{})});
 }
 spans.sort((a,b)=>b.y-a.y||a.x-b.x);
 const groups=[];
 for(const item of spans){let group=groups.find(g=>Math.abs(g.y-item.y)<2.3);if(!group){group={y:item.y,items:[]};groups.push(group);}group.items.push(item);}
 const lines=[];const rich=[];
 for(const group of groups.sort((a,b)=>b.y-a.y)){
  const items=group.items.sort((a,b)=>a.x-b.x);
  const row=[];
  for(const [index,item] of items.entries()){
   if(index){
    const prev=items[index-1];
    // Text layers may split a single word into different styled runs.
    // Only insert a space when geometry or explicit spaces justify it.
    const delta=item.x-(prev.x+prev.width);
    const needsSpace=/\s$/u.test(prev.text)||/^\s/u.test(item.text)||delta>Math.max(1.5,Math.min(3,prev.height*.18));
    if(needsSpace)row.push({text:' ',italic:false});
   }
   row.push({text:item.text,italic:item.italic});
  }
  const line=clean(row.map(i=>i.text).join(''));
  if(!line)continue;
  lines.push(line);
  if(rich.length)rich.push({text:' ',italic:false});
  rich.push(...row);
 }
 return {lines,rich};
}
// Baca foto sekali pada mode Cepat; bila judul/NIM hilang atau pengguna memilih Teliti,
// ulangi hanya area yang relevan dengan resolusi lebih besar. Semua proses di browser.
async function localOCR(blob, tag='Foto', options={}) {
 const stage=message=>{try{options.onProgress?.(message);}catch{}};
 const detail=!!options.detail;
  if(options.preferGemini!==false){
   stage('Mengirim foto ke Gemini 3.1 Flash-Lite...');
   return await readCoverWithGemini(blob,{onProgress:stage});
  }
  stage('OCR penuh: menyiapkan teks seluruh halaman');
 const full=await recognizeLocalResult(blob,{lang:'ind+eng',psm:'3',maxSide:detail?2400:2100});
 const lines=normalizedLines(full.text);
 const base=normalizedResult(lines,[`OCR ${tag} diproses lokal tanpa token. Selalu cocokkan setiap karakter dengan sumber.`, 'Foto/scan: OCR tidak membuktikan kata yang dicetak miring. Periksa Italic pada judul di editor sebelum ekspor.']);
 const mark=await scanNameUnderline(full.data,full.preparedImage,base.nama);
 if(mark.detected===true){base.nama_garis_bawah=true;base.warnings.push('Garis bawah nama terdeteksi dari garis visual foto; pastikan sesuai sumber.');}
 else base.warnings.push('Garis bawah nama dari foto belum dipastikan. Jika nama pada foto bergaris bawah, aktifkan kotak Garis bawah nama.');
 const confidence=Number.isFinite(full.confidence)?Math.round(full.confidence):null;
 if(confidence!==null && confidence>=0 && confidence<60)base.warnings.push(`Keyakinan OCR penuh ${confidence}% (rendah). Cek judul, nama, dan NIM.`);
 if(!lines.length)base.warnings.push('OCR keseluruhan belum menemukan teks; mode Teliti mencoba membaca zona.');
 const essentialMissing=!base.judul||!base.nama||!base.nim||!base.jenis_dokumen||!base.prodi;
 // Mode Cepat: hanya satu percobaan jika lengkap, pembacaan identitas tambahan jika belum lengkap.
 // Mode Teliti: judul, identitas, bagian bawah, dan teks logo sebagai pembanding.
 const needsCampus=(!base.universitas||institutionLooksIncomplete(base.universitas)||!base.kota);
 const zonesNeeded=detail||!lines.length?['judul','identitas','kampus','logo']:[...new Set([... (essentialMissing?['judul','identitas','kampus'].filter(k=>k==='judul'?!base.judul:k==='identitas'?!base.nama||!base.nim:false):[]),...(needsCampus?['kampus','logo']:[])])];
 if(!zonesNeeded.length)return base;
 stage(detail?'Mode Teliti: membaca ulang tiga zona':'Memulihkan kolom yang belum terbaca');
 let blobs={};
 try {blobs=await prepareOCRZones(blob,{threshold:detail && confidence!==null && confidence<72});}
 catch(error){base.warnings.push(`Gagal memproses zona: ${error.message}. Hasil utama tetap dapat dikoreksi.`);return base;}
 const zoneText={};let zoneNameUnderline=null;
 for(const key of zonesNeeded){
   stage(`OCR zona ${key} (${zonesNeeded.indexOf(key)+1}/${zonesNeeded.length})`);
   try{
     const result=await recognizeLocalResult(blobs[key],{lang:'ind+eng',isPrepared:true,psm:'6'});
     zoneText[key]=result.text;
     if(key==='identitas' && !base.nama_garis_bawah){
      const parsed=normalizedResult(normalizedLines(result.text));
      const name=parsed.nama||base.nama;
      if(name){const mark=await scanNameUnderline(result.data,result.preparedImage,name);if(mark.detected===true)zoneNameUnderline=true;}
     }

   }catch(error){
     base.warnings.push(`Zona ${key}: ${error.message}. Koreksi lewat editor bila perlu.`);
   }
 }
 const merged=mergeZones(base,zoneText,{full:full.confidence});
 if(zoneNameUnderline===true){merged.nama_garis_bawah=true;merged.warnings.push('Zona identitas: ditemukan garis bawah nama. Periksa sebelum cetak.');}
 merged.warnings=merged.warnings.filter(w=>!w.startsWith('Periksa kolom belum terdeteksi:'));
 const remaining=['judul','nama','nim','prodi','universitas','jenis_dokumen','bulan_tahun'].filter(k=>!merged[k]);
 if(remaining.length)merged.warnings.push(`Kolom yang masih perlu diisi: ${remaining.join(', ')}.`);
 if(detail)merged.warnings.push('Hasil zona harus diverifikasi. Deteksi italic dan ejaan/transliterasi dari foto belum dijamin oleh OCR lokal.');
 stage('Selesai menggabungkan hasil OCR dan pemeriksaan zona');
 return merged;
}
export async function readPhoto(file,options={}){return localOCR(file,'foto',options);}
export async function readPDF(file,options={}){
 const stage=message=>{try{options.onProgress?.(message);}catch(_){}};
 stage('Membuka PDF lokal, hanya halaman pertama');
 if(!globalThis.pdfjsLib)throw Error('PDF.js gagal dimuat dari CDN. Cek internet dan refresh. Tidak ada API key atau token yang diperlukan.');
 globalThis.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
 const data=new Uint8Array(await file.arrayBuffer());
 const task=globalThis.pdfjsLib.getDocument({data,disableAutoFetch:true,disableStream:true});
 let doc=null;
 try{
  doc=await withTimeout(task.promise,20000,'Membuka PDF');
  const first=await withTimeout(doc.getPage(1),12000,'Membaca halaman 1 PDF');
  stage('Mengambil text layer PDF halaman 1 (tanpa OCR)');
  const content=await withTimeout(first.getTextContent(),20000,'Ekstraksi halaman 1 PDF');
  const extracted=pdfLines(content.items,content.styles);
  const {lines}=extracted;
  const found=lines.join(' ').replace(/\s/g,'');
  if(found.length>=35 && (lines.some(line => /\b(SKRIPSI|TESIS|THESIS|DISERTASI|DISSERTATION|NIM|FAKULTAS|FACULTY|UNIVERSITAS|UNIVERSITY|WRITTEN)\b/iu.test(line)) || found.length>90)){
   stage('Teks PDF halaman 1 berhasil dibaca tanpa OCR');
   const result=normalizedResult(lines,[`Hanya halaman 1 dari ${doc.numPages} halaman PDF yang dibaca. Periksa urutan baris.`, 'PDF: Italic hanya dipulihkan jika nama font pada text layer menyebut Italic/Oblique; font dengan nama internal anonim perlu pemeriksaan manual.'],extracted.rich);
   if(typeof first.render==='function' && typeof first.getViewport==='function' && result.nama){
    try{
     const base=first.getViewport({scale:1});
     const scale=Math.min(1.5,1700/Math.max(base.width,base.height));
     const viewport=first.getViewport({scale});
     const nameBox=pdfNameBox(content.items,result.nama,viewport);
     if(nameBox){
      const canvas=document.createElement('canvas');canvas.width=Math.round(viewport.width);canvas.height=Math.round(viewport.height);
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      const task=first.render({canvasContext:ctx,viewport});
      try{await withTimeout(task.promise,20000,'Pemeriksaan garis bawah nama PDF');}
      catch(error){try{task.cancel();}catch{}throw error;}
      const score=underlineScore(ctx.getImageData(0,0,canvas.width,canvas.height),nameBox);
      canvas.width=canvas.height=0;
      if(score>=.82){result.nama_garis_bawah=true;result.warnings.push('PDF: garis bawah nama terdeteksi dari gambar halaman pertama; periksa sebelum cetak.');}
      else result.warnings.push('PDF: garis bawah nama tidak terkonfirmasi otomatis. Cocokkan kotak Garis bawah nama dengan sumber.');
     }
    }catch(error){result.warnings.push('Pemeriksaan garis bawah nama PDF tidak dapat dipastikan: '+error.message+'. Gunakan kotak manual.');}
   }
   return result;
  }
  stage('Halaman 1 berupa scan/gambar; menjalankan OCR lokal');
  const base=first.getViewport({scale:1});
  const scale=Math.min(1.55,1800/Math.max(base.width,base.height),Math.sqrt(2500000/(base.width*base.height)));
  const viewport=first.getViewport({scale});
  const canvas=document.createElement('canvas');canvas.width=Math.round(viewport.width);canvas.height=Math.round(viewport.height);
  const renderTask=first.render({canvasContext:canvas.getContext('2d'),viewport});
  try { await withTimeout(renderTask.promise,30000,'Render halaman 1 PDF scan'); }
  catch(error) { try {renderTask.cancel();} catch(_) {} throw error; }
  const image=await new Promise(res=>canvas.toBlob(res,'image/png'));
  if(!image)throw Error('Halaman pertama PDF scan tidak dapat dirender.');
  const result=await localOCR(image,'halaman pertama PDF scan',options);
  result.warnings.push('PDF scan: OCR lokal dipakai hanya untuk halaman 1.');
  return result;
 }finally{try{if(doc)await withTimeout(doc.destroy(),3000,'Menutup dokumen PDF');}catch{} }
}
// DOCX biasanya tidak mempunyai informasi pagination aktual. Ekstraksi cepat ini
// hanya memproses bagian awal body dokumen, dan tidak mem-parse seluruh halaman
// (150+ halaman sering membuat HP macet akibat DOMParser/getElementsByTagName).
function xmlDecode(value) {
 return String(value).replace(/&(?:#(\d+)|#x([\da-fA-F]+)|amp|lt|gt|quot|apos);/g, m => {
  if (m === '&amp;') return '&';
  if (m === '&lt;') return '<';
  if (m === '&gt;') return '>';
  if (m === '&quot;') return '"';
  if (m === '&apos;') return "'";
  const n = m.match(/^&#(?:x([\da-fA-F]+)|(\d+));$/u);
  if (!n) return m;
  const point = parseInt(n[1] || n[2], n[1] ? 16 : 10);
  return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : m;
 });
}
function parseStyleItalics(stylesXml){
 const map=new Map();
 for(const m of String(stylesXml||'').matchAll(/<w:style\b([^>]*)>([\s\S]*?)<\/w:style>/gu)){
  const id=m[1].match(/\bw:styleId=["']([^"']+)["']/u)?.[1];
  if(id){const rPr=m[2].match(/<w:rPr\b[^>]*>([\s\S]*?)<\/w:rPr>/u)?.[1]||'';
   map.set(id,{italic:hasItalic(rPr),underline:hasUnderline(rPr),basedOn:m[2].match(/<w:basedOn\b[^>]*w:val=["']([^"']+)/u)?.[1]||''});
  }
 }
 return map;
}
function hasItalic(xml){const tags=[...String(xml).matchAll(/<w:i\b([^>]*)\/?>(?:<\/w:i>)?/gu)];
 return tags.length? !/\bw:val=["'](?:0|false|off)["']/iu.test(tags.at(-1)[1]):null;
}
function hasUnderline(xml){
 const tags=[...String(xml).matchAll(/<w:u\b([^>]*?)(?:\/?>)/gu)];
 if(!tags.length)return null;
 const last=tags.at(-1)[1];return !/\bw:val=["'](?:none|0|false|off)["']/iu.test(last);
}
function styleUnderline(id,styles,seen=new Set()){
 if(!id||seen.has(id))return false;seen.add(id);
 const style=styles.get(id);return style?.underline ?? styleUnderline(style?.basedOn,styles,seen);
}
function styleItalic(id,styles,seen=new Set()){
 if(!id||seen.has(id))return false;seen.add(id);
 const style=styles.get(id);return style?.italic ?? styleItalic(style?.basedOn,styles,seen);
}
function parseEarlyParagraph(xml,styles=new Map()) {
 const segments = [];
 function push(text, italic, underline=false) {
  if (!text) return;
  if (segments.length && segments.at(-1).italic === italic && segments.at(-1).underline===underline) segments.at(-1).text += text;
  else segments.push({ text, italic, underline });
 }
 const breakAt = xml.search(/<w:(?:lastRenderedPageBreak\b|br\b[^>]*w:type=["']page["'])/u);
 const limited = breakAt >= 0 ? xml.slice(0, breakAt) : xml;
 const pPr=limited.match(/<w:pPr\b[^>]*>([\s\S]*?)<\/w:pPr>/u)?.[1]||'';
 const pStyle=pPr.match(/<w:pStyle\b[^>]*w:val=["']([^"']+)/u)?.[1]||'';
 const paraItalic=hasItalic(pPr.match(/<w:rPr\b[^>]*>([\s\S]*?)<\/w:rPr>/u)?.[1]||'') ?? styleItalic(pStyle,styles);
 const paraUnderline=hasUnderline(pPr.match(/<w:rPr\b[^>]*>([\s\S]*?)<\/w:rPr>/u)?.[1]||'') ?? styleUnderline(pStyle,styles);
 const runPattern = /<w:r\b[^>]*>([\s\S]*?)<\/w:r>/gu;
 let run, found = false;
 while ((run = runPattern.exec(limited)) !== null) {
  found = true;
  const body = run[1];
  const rPr=body.match(/<w:rPr\b[^>]*>([\s\S]*?)<\/w:rPr>/u)?.[1]||'';
  const rStyle=rPr.match(/<w:rStyle\b[^>]*w:val=["']([^"']+)/u)?.[1]||'';
  const italic=hasItalic(rPr) ?? (rStyle?styleItalic(rStyle,styles):paraItalic);
  const underline=hasUnderline(rPr) ?? (rStyle?styleUnderline(rStyle,styles):paraUnderline);
  const text = [...body.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/gu)].map(m=>xmlDecode(m[1])).join('');
  push(text, italic, underline);
 }
 // Support DOCX text-box text if not represented by outer w:r.
 if (!found) for (const match of limited.matchAll(/<(?:w|a):t(?:\s[^>]*)?>([\s\S]*?)<\/(?:w|a):t>/gu)) push(xmlDecode(match[1]), false);
 return {content:segments.map(s=>s.text).join('').replace(/\s+/gu,' ').trim(), segments, pageBreak:breakAt>=0,
  before:/<w:pageBreakBefore\b/u.test(xml)};
}
export async function readWord(file,options={}) {
 const stage = message => { try { options.onProgress?.(message); } catch (_) {} };
 if (!globalThis.JSZip) throw Error('JSZip tidak tersedia. Website menyertakan JSZip lokal; pastikan folder vendor ikut diunggah.');
 stage('Membuka file DOCX secara lokal');
 const array=await withTimeout(file.arrayBuffer(),15000,'Membaca file Word');
 const zip=await withTimeout(globalThis.JSZip.loadAsync(array),24000,'Membuka paket Word');
 const entry=zip.file('word/document.xml');
 if (!entry) throw Error('Ini bukan DOCX yang valid. Word .doc lama tidak didukung.');
 stage('Mengambil paragraf awal dokumen Word');
 const raw=await withTimeout(entry.async('string'),35000,'Membaca teks Word');
 const bodyStart=raw.search(/<w:body\b/u);
 if (bodyStart<0) throw Error('Isi dokumen Word tidak ditemukan.');
 const body=raw.slice(bodyStart);
 const stylesXml=zip.file('word/styles.xml')?await zip.file('word/styles.xml').async('string'):'';
 const styles=parseStyleItalics(stylesXml);
 const iterator=body.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/gu);
 const lines=[],pars=[];let explicit=false,approx=false,seenUniversity=false,paragraphs=0;
 const stopTitle=/^(?:ABSTRAK|ABSTRACT|KATA\s+PENGANTAR|DAFTAR\s+ISI|BAB\s+I\b|LEMBAR\s+PENGESAHAN|HALAMAN\s+PERSETUJUAN)/iu;
 for (const result of iterator) {
  if (++paragraphs>90) {approx=true;break;}
  const p=parseEarlyParagraph(result[0],styles);
  if (p.before && lines.length) {explicit=true;break;}
  const value=p.content;
  if (value) {
   if (lines.length>=2 && stopTitle.test(value)) {approx=true;break;}
   lines.push(value);pars.push(p);
   if (/\b(?:UNIVERSITAS|INSTITUT|UIN|IAIN|STAIN|UNIVERSITY|COLLEGE|INSTITUTE)\b/iu.test(value)) seenUniversity=true;
   if (seenUniversity && lines.length>=5 && /^(?:(?:JANUARI|FEBRUARI|MARET|APRIL|MEI|JUNI|JULI|AGUSTUS|SEPTEMBER|OKTOBER|NOVEMBER|DESEMBER|JANUARY|FEBRUARY|MARCH|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+)?\d{4}$/iu.test(value)) {approx=true;break;}
  }
  if (p.pageBreak) {explicit=true;break;}
  if (lines.length>=48) {approx=true;break;}
 }
 if (!lines.length) throw Error('Halaman awal DOCX tidak mengandung teks. Jika cover dibuat sebagai gambar, gunakan foto/OCR lokal.');
 const warnings=[explicit?'DOCX dibatasi pada penanda halaman yang ada.':'DOCX tidak selalu menyimpan batas halaman fisik. Hanya paragraf awal/cover yang diperkirakan; periksa data sebelum cetak.'];
 const result=normalizedResult(lines,warnings);
 const canonical=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]/gu,'');
 const nameParagraph=pars.find(p=>canonical(p.content)===canonical(result.nama));
 if(nameParagraph){
  const letters=nameParagraph.segments.reduce((n,r)=>n+(r.underline?canonical(r.text).length:0),0);
  const total=nameParagraph.segments.reduce((n,r)=>n+canonical(r.text).length,0);
  result.nama_garis_bawah=total>0 && letters/total>=.7;
  if(result.nama_garis_bawah)result.warnings.push('Garis bawah nama ditemukan dari properti underline DOCX.');
 }else result.warnings.push('Format garis bawah nama Word belum dapat dipastikan dari struktur paragraf; periksa kotak Garis bawah nama.');

 const typeIndex=lines.findIndex(t=>/^(SKRIPSI|TESIS|THESIS|DISERTASI|MAKALAH|LAPORAN(?:\s+AKHIR)?|TUGAS AKHIR)$/iu.test(t));
 if (typeIndex>0) {
  const rich=pars.slice(0,typeIndex).flatMap((p,i)=>i?[{text:' ',italic:false},...p.segments]:p.segments);
  const aligned=alignTitleFormatting(result.judul,rich);
  if(aligned.length&&aligned.map(x=>x.text).join('')===result.judul){
   result.title_segments=aligned;
   if(aligned.some(x=>x.italic))result.warnings.push('Italic dipulihkan dari properti run/style DOCX pada bagian judul.');
  }else result.warnings.push('Bagian italic Word belum dapat dicocokkan sepenuhnya ke judul; periksa di editor.');
 }
 stage(`Word selesai: ${lines.length} baris awal dibaca tanpa token`);
 return result;
}

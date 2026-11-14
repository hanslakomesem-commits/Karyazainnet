/* ZAIN.NET V4.42 — Pembatas custom; uploaded logos auto-converted to grayscale/black-white locally. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const ID=['line1','line2','line3','line4','logoMm','gapMm','fontPt','textY','opacity','textColor','clearBehind','logoMode','bwThreshold'];
const PAGE={w:210,h:297};
const img=new Image();
let imageUrl='',renderTimer=0, processedCache=null;
const state=()=>({
 lines:['line1','line2','line3','line4'].map(i=>$(i).value.trim()).filter(Boolean),
 logoMm:num('logoMm',10.5,5,40),gapMm:num('gapMm',2,0,20),fontPt:num('fontPt',15,9,26),
 textY:num('textY',125,15,245),opacity:num('opacity',55,10,100)/100,
 color:$('textColor').value,clearBehind:$('clearBehind').checked,logoMode:$('logoMode').value,bwThreshold:num('bwThreshold',165,1,254)
});
function num(id, fallback,min,max){const v=Number($(id).value);return Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback}
function message(s,problem=false){$('status').textContent=s;$('status').classList.toggle('bad',problem)}
function setBusy(v){['downloadDocx','downloadPdf','downloadPng'].forEach(id=>$(id).disabled=v)}
function imageReady(){return img.complete&&img.naturalWidth>0}
// Cache one processed bitmap for each logo, mode, and threshold. Both the preview
// and all three exports draw exclusively from this processed bitmap.
function processedLogo(props){
 if(!imageReady())return null;
 const mode=props.logoMode==='bw'?'bw':'gray';
 const key=`${img.src}|${mode}|${props.bwThreshold}`;
 if(processedCache?.key===key)return processedCache.canvas;
 const canvas=document.createElement('canvas');
 const limit=1600,factor=Math.min(1,limit/Math.max(img.naturalWidth,img.naturalHeight));
 canvas.width=Math.max(1,Math.round(img.naturalWidth*factor));
 canvas.height=Math.max(1,Math.round(img.naturalHeight*factor));
 const c=canvas.getContext('2d',{willReadFrequently:true});
 c.drawImage(img,0,0,canvas.width,canvas.height);
 const frame=c.getImageData(0,0,canvas.width,canvas.height);
 const data=frame.data;
 for(let i=0;i<data.length;i+=4){
  // Preserve existing alpha so transparent PNG logos remain transparent.
  const luminance=Math.round(0.2126*data[i]+0.7152*data[i+1]+0.0722*data[i+2]);
  const value=mode==='bw'?(luminance>=props.bwThreshold?255:0):luminance;
  data[i]=data[i+1]=data[i+2]=value;
 }
 c.putImageData(frame,0,0);
 processedCache={key,canvas};
 return canvas;
}
function fittedLines(ctx,sentence,limit){const out=[];let words=sentence.split(/\s+/),line='';for(const word of words){let test=line?`${line} ${word}`:word;if(ctx.measureText(test).width<=limit){line=test;continue}if(line){out.push(line);line=''}if(ctx.measureText(word).width<=limit){line=word;continue}let part='';for(const ch of word){if(ctx.measureText(part+ch).width>limit&&part){out.push(part);part=''}part+=ch}line=part}if(line)out.push(line);return out}
function paint(canvas,withText=true,props=state()){
 const W=canvas.width,scale=W/PAGE.w,H=Math.round(W*PAGE.h/PAGE.w);
 if(canvas.height!==H)canvas.height=H;
 const x=canvas.getContext('2d',{alpha:false});x.fillStyle='#fff';x.fillRect(0,0,W,H);
 if(!imageReady())return;
 const source=processedLogo(props);
 const unit=props.logoMm*scale,step=Math.max(1,(props.logoMm+props.gapMm)*scale);
 x.save();x.globalAlpha=props.opacity;
 // Pattern is clipped to the page, with small printer-safe margins.
 for(let yy=4*scale;yy+unit<=(PAGE.h-3)*scale;yy+=step){
  for(let xx=4*scale;xx+unit<=(PAGE.w-3)*scale;xx+=step)x.drawImage(source,xx,yy,unit,unit);
 }
 x.restore();
 const fontPx=props.fontPt*scale*25.4/72;
 let textLines=[];
 x.font=`bold ${fontPx}px "Times New Roman",Times,serif`;
 for(const line of props.lines)textLines.push(...fittedLines(x,line,W-20*scale));
 const lh=fontPx*1.18;
 const y=props.textY*scale;
 if(props.clearBehind&&textLines.length){const bgY=Math.max(0,y-lh*.75),bgH=lh*(textLines.length+.5);x.fillStyle='rgba(255,255,255,.95)';x.fillRect(5*scale,bgY,W-10*scale,bgH)}
 if(withText){x.fillStyle=props.color;x.textAlign='center';x.textBaseline='top';x.font=`bold ${fontPx}px "Times New Roman",Times,serif`;textLines.forEach((line,i)=>x.fillText(line,W/2,y+i*lh,W-16*scale))}
 return {textLines,props};
}
function update(){$('thresholdRow').hidden=$('logoMode').value!=='bw';window.clearTimeout(renderTimer);renderTimer=window.setTimeout(()=>{try{paint($('previewCanvas'),true);if(imageReady())$('logoThumb').src=processedLogo(state()).toDataURL('image/png');message('Logo otomatis dijadikan '+($('logoMode').value==='bw'?'hitam-putih tegas':'grayscale')+'. PDF, Word, dan PNG siap dibuat.')}catch(e){message('Pratinjau gagal: '+e.message,true)}},120)}
function loadLogo(src,asUrl=false){processedCache=null;if(imageUrl){URL.revokeObjectURL(imageUrl);imageUrl=''}if(asUrl)imageUrl=src;img.onload=()=>{processedCache=null;update()};img.onerror=()=>message('Logo tidak dapat dibaca. Gunakan JPG, PNG, atau WebP yang valid.',true);img.src=src}
function saveBlob(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
function renderFull(withText){const c=document.createElement('canvas');c.width=2480;paint(c,withText);return c}
function canvasBlob(canvas){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Gambar gagal diproses')),'image/png'))}
function esc(t){return String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]))}
function safeName(){return 'PEMBATAS_'+(state().lines.at(-1)||'CUSTOM').replace(/[^\p{L}\p{N}]+/gu,'_').slice(0,42)}
function lineRun(s,sz,color){return `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="${sz}"/><w:color w:val="${color}"/></w:rPr><w:t xml:space="preserve">${esc(s)}</w:t></w:r>`}
function fullDocXml(props){const pts=Math.round(props.fontPt*2),color=props.color.replace('#','').toUpperCase();let paragraphs=props.lines.map(s=>`<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="5" w:line="${Math.round(props.fontPt*23.6)}" w:lineRule="auto"/><w:keepNext/></w:pPr>${lineRun(s,pts,color)}</w:p>`).join('');if(!paragraphs)paragraphs='<w:p/>';
 const top=Math.round(Math.max(15,props.textY-1.5)*56.692913);
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${paragraphs}<w:sectPr><w:headerReference w:type="default" r:id="rId1"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="${top}" w:right="450" w:bottom="350" w:left="450" w:header="0" w:footer="0"/><w:cols w:space="720"/></w:sectPr></w:body></w:document>`}
function headerXml(){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:p><w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="0" behindDoc="1" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="7560000" cy="10692000"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="1" name="Motif logo pembatas" descr="Motif logo berulang, gambar latar di belakang teks editable"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="2" name="background.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="7560000" cy="10692000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r></w:p></w:hdr>`}
async function makeDocx(){if(!window.JSZip)throw new Error('Modul Word belum siap. Muat ulang halaman.');const b=await canvasBlob(renderFull(false));const buf=await b.arrayBuffer(),p=state();const z=new JSZip();
 z.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);
 z.file('_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
 z.file('word/_rels/document.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
 z.file('word/_rels/header1.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/background.png"/></Relationships>`);
 z.file('word/document.xml',fullDocXml(p));z.file('word/header1.xml',headerXml());
 z.file('word/styles.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="30"/></w:rPr></w:style></w:styles>`);
 z.file('word/media/background.png',buf);return z.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',compression:'DEFLATE',compressionOptions:{level:6}})
}
async function makePDF(){if(!window.PDFLib)throw new Error('Modul PDF belum siap. Periksa sambungan internet lalu refresh.');const bytes=await canvasBlob(renderFull(true));const pdf=await PDFLib.PDFDocument.create();const p=pdf.addPage([PAGE.w*72/25.4,PAGE.h*72/25.4]);const png=await pdf.embedPng(await bytes.arrayBuffer());p.drawImage(png,{x:0,y:0,width:p.getWidth(),height:p.getHeight()});return new Blob([await pdf.save()],{type:'application/pdf'})}
async function doAction(action){if(!imageReady()){message('Logo belum terbaca. Pilih gambar yang valid.',true);return}try{setBusy(true);message('Sedang membuat file...');const name=safeName();if(action==='docx'){saveBlob(await makeDocx(),name+'.docx');message('File Word berhasil dibuat. Teks dapat diedit di Word.')}else if(action==='pdf'){saveBlob(await makePDF(),name+'.pdf');message('PDF A4 satu halaman selesai. Periksa dahulu sebelum mencetak.')}else {saveBlob(await canvasBlob(renderFull(true)),name+'.png');message('PNG resolusi 300 DPI selesai dibuat.')}}catch(e){message('Gagal membuat file: '+e.message,true);console.error(e)}finally{setBusy(false)}}
for(const id of ID)$(id).addEventListener('input',update);
$('logoInput').addEventListener('change',ev=>{const f=ev.target.files?.[0];if(!f)return;if(!['image/png','image/jpeg','image/webp'].includes(f.type)){message('Format logo harus PNG, JPG, atau WebP.',true);return}if(f.size>10*1024*1024){message('Logo terlalu besar (maksimal 10 MB).',true);return}loadLogo(URL.createObjectURL(f),true)});
$('resetLogo').addEventListener('click',()=>{loadLogo('./pembatas_uim_logo.png');$('logoInput').value='';message('Logo UIM contoh dipulihkan.')});
$('presetUim').addEventListener('click',()=>{Object.entries({line1:'PROGRAM STUDI MANAJEMEN PENDIDIKAN ISLAM',line2:'FAKULTAS AGAMA ISLAM',line3:'UNIVERSITAS ISLAM MADURA',line4:''}).forEach(([k,v])=>$(k).value=v);update()});
$('clearText').addEventListener('click',()=>{['line1','line2','line3','line4'].forEach(k=>$(k).value='');update()});
$('downloadDocx').addEventListener('click',()=>doAction('docx'));
$('downloadPdf').addEventListener('click',()=>doAction('pdf'));
$('downloadPng').addEventListener('click',()=>doAction('png'));
$('printButton').addEventListener('click',async()=>{const tab=window.open('','_blank');if(!tab){message('Izinkan pop-up agar PDF dapat dibuka untuk dicetak.',true);return}try{const blob=await makePDF();const u=URL.createObjectURL(blob);tab.location.href=u;message('PDF dibuka di tab baru. Gunakan menu Cetak browser.');setTimeout(()=>URL.revokeObjectURL(u),60000)}catch(e){tab.close();message(e.message,true)}});
loadLogo('./pembatas_uim_logo.png');
})();

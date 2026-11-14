import {getAutomaticUnicodeFonts,getAutomaticUnicodeRegular} from './font-unicode.js';
const $=id=>document.getElementById(id);
const API='https://zainnet-api.onrender.com/api/hardcover-custom-layout/analyze';
const TOKEN_KEY='sb-pxseiytikiulxincoolh-auth-token';
let source=null,layout=null,selected=-1,pdfURL=null;
const state=()=>layout?.blocks||[];
function message(text,isError=false){const el=$('message');el.textContent=text;el.className='warn'+(isError?' error':'');}
const hideMessage=()=>{$('message').classList.add('hidden');};
const norm=(x)=>String(x??'').normalize('NFC');
const percent=v=>Math.max(0,Math.min(100,Number(v)||0));
function token(){
  let a=null;try{a=JSON.parse(localStorage.getItem(TOKEN_KEY)||'null');}catch{}
  const v=a?.access_token||a?.currentSession?.access_token;
  if(!v)throw Error('Login Supabase admin diperlukan. Buka menu dari website ZAIN.NET setelah login.');
  return v;
}
function getImage(url){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Tidak dapat membuka gambar.'));img.src=url;});}
function canvasData(canvas,quality=.88){return canvas.toDataURL('image/jpeg',quality);}
function canvasFor(img,max=2400){const scale=Math.min(1,max/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c;}
async function firstPdfPage(file){
  if(!window.pdfjsLib)throw Error('Pembaca PDF.js belum tersedia. Periksa koneksi internet.');
  const bytes=new Uint8Array(await file.arrayBuffer());
  const doc=await window.pdfjsLib.getDocument({data:bytes,disableFontFace:false}).promise;
  const page=await doc.getPage(1),base=page.getViewport({scale:1});
  const viewport=page.getViewport({scale:Math.min(2.5,2100/Math.max(base.width,base.height))});
  const c=document.createElement('canvas');c.width=Math.round(viewport.width);c.height=Math.round(viewport.height);
  await page.render({canvasContext:c.getContext('2d'),viewport}).promise;
  await doc.destroy();return canvasData(c);
}
function resetPdf(){if(pdfURL)URL.revokeObjectURL(pdfURL);pdfURL=null;$('downloadPDF').classList.add('hidden');$('pdfView').classList.add('hidden');$('pdfView').removeAttribute('src');}
async function choose(file){
  if(!file)return;
  hideMessage();layout=null;selected=-1;resetPdf();$('confirmed').checked=false;
  if(file.size>25*1024*1024)throw Error('Scan maksimal 25 MB. Simpan ulang dalam JPG yang jelas.');
  let url;
  if(file.type==='application/pdf'||/\.pdf$/i.test(file.name))url=await firstPdfPage(file);
  else if(/^image\/(?:png|webp|jpeg)$/.test(file.type))url=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(Error('Gagal membaca gambar.'));r.readAsDataURL(file);});
  else throw Error('Hanya JPG, PNG, WebP atau PDF yang didukung.');
  const img=await getImage(url);source=canvasData(canvasFor(img,2300));$('scanPreview').src=source;
  $('layoutStage').replaceChildren();$('blockList').replaceChildren();$('auditMessage').textContent='Scan dimuat. Jalankan pembacaan Gemini untuk mengidentifikasi setiap baris dan posisinya.';
  $('analyze').disabled=false;$('makePDF').disabled=true;$('addBlock').disabled=true;
}
function redraw(){
  const stage=$('layoutStage');stage.replaceChildren();
  state().forEach((b,i)=>{
    const el=document.createElement('div');el.className='block'+(selected===i?' active':'');
    el.textContent=b.text;
    el.style.left=percent(b.x/10)+'%';el.style.top=percent(b.y/10)+'%';el.style.width=percent(b.w/10)+'%';el.style.minHeight=percent(b.h/10)+'%';
    el.style.fontSize=Math.max(7,Math.min(22,Number(b.size)*.86))+'px';el.style.fontStyle=b.italic?'italic':'normal';el.style.fontWeight=b.bold?'bold':'normal';el.style.color=b.color||'#111';el.style.textAlign=b.align||'center';
    el.addEventListener('click',()=>selectBlock(i));stage.append(el);
  });
  if(layout?.images?.length){const imgSrc=$('scanPreview').src;layout.images.forEach((g)=>{
    const el=document.createElement('div');el.className='logo';Object.assign(el.style,{left:percent(g.x/10)+'%',top:percent(g.y/10)+'%',width:percent(g.w/10)+'%',height:percent(g.h/10)+'%'});
    const img=document.createElement('img');img.src=imgSrc;img.style.width=(100000/g.w)+'%';img.style.height=(100000/g.h)+'%';img.style.maxWidth='none';img.style.objectFit='fill';img.style.transform=`translate(-${g.x/10}%, -${g.y/10}%)`; // rough preview; exported logo uses pixel crop precisely
    el.title='Area logo/gambar terdeteksi dari scan';el.append(img);stage.append(el);
  });}
}
function selectBlock(i){selected=i;drawEditors();redraw();document.querySelector(`[data-block="${i}"]`)?.scrollIntoView({behavior:'smooth',block:'nearest'});}
function drawEditors(){
 const box=$('blockList');box.replaceChildren();state().forEach((b,i)=>{
  const div=document.createElement('div');div.className='block-edit'+(selected===i?' selected':'');div.dataset.block=i;
  const heading=document.createElement('strong');heading.textContent=`Baris ${i+1}`;div.append(heading);
  const text=document.createElement('textarea');text.value=b.text;text.rows=1;text.setAttribute('aria-label',`Teks baris ${i+1}`);text.addEventListener('input',()=>{b.text=norm(text.value);$('confirmed').checked=false;resetPdf();redraw();});div.append(text);
  const controls=document.createElement('div');controls.className='controls';
  function number(k,label){const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('input');input.type='number';input.min=k==='size'?6:0;input.max=k==='size'?36:1000;input.value=b[k]||0;input.addEventListener('input',()=>{b[k]=Number(input.value);$('confirmed').checked=false;resetPdf();redraw();});wrap.append(input);controls.append(wrap);}
  for(const [k,label] of [['x','X'],['y','Y'],['w','Lebar'],['size','Font pt']])number(k,label);
  for(const [k,label] of [['bold','Tebal'],['italic','Italic'],['underline','Garis bawah']]){const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('input');input.type='checkbox';input.checked=!!b[k];input.addEventListener('change',()=>{b[k]=input.checked;$('confirmed').checked=false;resetPdf();redraw();});wrap.append(input);controls.append(wrap);}
  const sel=document.createElement('select');for(const k of ['left','center','right']){const op=document.createElement('option');op.value=k;op.textContent=k;sel.append(op);}sel.value=b.align||'center';sel.addEventListener('change',()=>{b.align=sel.value;$('confirmed').checked=false;resetPdf();redraw();});controls.append(sel);
  const remove=document.createElement('button');remove.type='button';remove.textContent='Hapus elemen ini';remove.style.background='#a63143';remove.addEventListener('click',()=>{layout.blocks.splice(i,1);selected=-1;$('confirmed').checked=false;resetPdf();drawEditors();redraw();audit();});controls.append(remove);
  div.append(controls);box.append(div);
 });
}
function audit(){
  const missing=layout?.missing||[],unknown=layout?.unclear||[];
  const summary=[`Terbaca ${state().length} baris teks dan ${layout?.images?.length||0} elemen gambar/logo.`];
  if(missing.length)summary.push(`Perlu diperiksa: ${missing.length} baris dari transkripsi penuh tidak cocok dengan blok posisi:\n${missing.join('\n')}`);
  if(unknown.length)summary.push(`Karakter atau bagian belum jelas:\n${unknown.join('\n')}`);
  summary.push('Pastikan setiap kalimat pada scan ada di editor; tambahkan atau koreksi secara manual jika masih ada yang terlewat.');
  $('auditMessage').textContent=summary.join('\n\n');
}
async function analyze(){
 if(!source)throw Error('Upload scan terlebih dahulu.');
 const button=$('analyze');button.disabled=true;message('Mengirim scan ke Render dan memeriksa semua tulisan, logo, font, serta koordinat...');
 try {
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),70_000);
  let response;
  try{response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token()}`},body:JSON.stringify({imageBase64:source.split(',')[1],mimeType:'image/jpeg'}),signal:controller.signal,cache:'no-store'});}
  finally{clearTimeout(timer);}
  const body=await response.json().catch(()=>({}));
  if(!response.ok||!body.success)throw Error(body.error||`HTTP ${response.status}`);
  layout=body.layout;selected=-1;$('confirmed').checked=false;
  $('makePDF').disabled=false;$('addBlock').disabled=false;
  redraw();drawEditors();audit();
  message(`Gemini membaca ${state().length} baris. Periksa dan koreksi SEMUA tulisan di editor, lalu centang verifikasi sebelum PDF dibuat.`);
 }catch(error){message('Pembacaan gagal: '+String(error?.message||error),true);}
 finally{button.disabled=false;}
}
const mmPt=x=>x*72/25.4;
const color=(hex)=>{const m=/^#([0-9a-f]{6})$/i.exec(hex||'')?.[1]||'111111';return window.PDFLib.rgb(parseInt(m.slice(0,2),16)/255,parseInt(m.slice(2,4),16)/255,parseInt(m.slice(4,6),16)/255);};
async function cropLogo(data){
  const image=await getImage(source),c=document.createElement('canvas');
  const w=image.naturalWidth,h=image.naturalHeight,x=Math.max(0,Math.floor(w*data.x/1000)),y=Math.max(0,Math.floor(h*data.y/1000));
  c.width=Math.max(1,Math.min(w-x,Math.ceil(w*data.w/1000)));c.height=Math.max(1,Math.min(h-y,Math.ceil(h*data.h/1000)));
  c.getContext('2d').drawImage(image,x,y,c.width,c.height,0,0,c.width,c.height);return new Uint8Array(await (await fetch(c.toDataURL('image/png'))).arrayBuffer());
}
function drawLineCentered(page,font,text,pt,xCenter,y){const tw=font.widthOfTextAtSize(text,pt);page.drawText(text,{x:xCenter-tw/2,y,font,size:pt,color:color($('inkColor').value)});}
async function makePDF(){
 if(!layout||!state().length)throw Error('Analisis scan terlebih dahulu.');
 if(!$('confirmed').checked)throw Error('Centang konfirmasi bahwa seluruh teks dan posisi sudah diperiksa.');
 if(!window.PDFLib||!window.fontkit)throw Error('Pustaka PDF belum termuat. Periksa koneksi internet.');
 const button=$('makePDF');button.disabled=true;message('Membuat PDF vektor dengan font Unicode; jangan tutup tab...');
 try{
  const {PDFDocument}=window.PDFLib;const pdf=await PDFDocument.create();pdf.registerFontkit(window.fontkit);
  const widths=$('paper').value==='plain'?[480,330]:[475,320],spine=Number($('spine').value),frontW=215,frontH=297;
  const page=pdf.addPage(widths.map(mmPt));const W=widths[0],H=widths[1];const frontLeft=W/2+spine/2,frontTop=(H-frontH)/2;
  if(frontLeft+frontW>W)throw Error('Lebar kertas tidak muat untuk punggung ini.');
  const bg=color($('bgColor').value),ink=color($('inkColor').value);
  page.drawRectangle({x:0,y:0,width:mmPt(W),height:mmPt(H),color:bg});
  const fonts=await getAutomaticUnicodeFonts(),regularBytes=await getAutomaticUnicodeRegular();
  const regular=await pdf.embedFont(regularBytes,{subset:true}),bold=await pdf.embedFont(fonts.bold,{subset:true}),italic=await pdf.embedFont(fonts.italic,{subset:true});
  const picks=b=>b.italic?italic:b.bold?bold:regular;
  for(const b of state()){
    const font=picks(b),raw=norm(b.text);if(!raw.trim())continue;
    const boxX=frontLeft+frontW*b.x/1000,boxY=frontTop+frontH*b.y/1000,boxW=frontW*b.w/1000;
    let pt=Number(b.size)||12;
    const desiredWidth=mmPt(boxW);
    try {while(pt>=5.5&&font.widthOfTextAtSize(raw,pt)>desiredWidth)pt-=0.25;}
    catch {throw Error('Font tidak mendukung karakter pada baris: '+raw.slice(0,90));}
    if(pt<5.5)throw Error('Baris terlalu panjang pada lebar aslinya: '+raw.slice(0,90));
    const measured=font.widthOfTextAtSize(raw,pt);
    const x= b.align==='left' ? mmPt(boxX) : b.align==='right' ? mmPt(boxX+boxW)-measured : mmPt(boxX+boxW/2)-measured/2;
    const y=mmPt(H-(boxY+(frontH*b.h/1000)*0.76));
    page.drawText(raw,{x,y,font,size:pt,color:color(b.color)});
    if(b.underline)page.drawLine({start:{x,y:y-1.5},end:{x:x+measured,y:y-1.5},thickness:0.6,color:color(b.color)});
  }
  let customLogo=null;
  const chosen=$('logoFile').files?.[0];if(chosen){if(!/^image\/(png|jpeg|webp)$/.test(chosen.type))throw Error('Logo pengganti harus JPG/PNG/WebP');const img=await getImage(URL.createObjectURL(chosen));const c=canvasFor(img,900);customLogo=new Uint8Array(await (await fetch(c.toDataURL('image/png'))).arrayBuffer());}
  for(const [i,g] of (layout.images||[]).entries()){
   const bytes=i===0&&customLogo?customLogo:await cropLogo(g);
   const logo=await pdf.embedPng(bytes);page.drawImage(logo,{x:mmPt(frontLeft+frontW*g.x/1000),y:mmPt(H-frontTop-frontH*(g.y+g.h)/1000),width:mmPt(frontW*g.w/1000),height:mmPt(frontH*g.h/1000)});
  }
  // Decorative trim / spine position marks are regenerated vector; not pasted from scanner image.
  const spineL=W/2-spine/2,spineR=W/2+spine/2;
  for(const edge of [spineL,spineR])for(const top of [2.5,H-2.5])page.drawLine({start:{x:mmPt(edge),y:mmPt(H-top)},end:{x:mmPt(edge),y:mmPt(H-top+(top<H/2?-3:3))},thickness:.6,color:ink});
  const spineTitle=$('spineTitle').value.trim(),spineYear=$('spineYear').value.trim();
  if(spineTitle){let size=Math.min(9,mmPt(spine-2)/(spineTitle.length*.75));size=Math.max(6,size);const font=bold;
   const maxLen=mmPt(H-52);const tw=font.widthOfTextAtSize(spineTitle,size);if(tw>maxLen)throw Error('Judul punggung terlalu panjang. Ringkas secara manual atau gunakan beberapa baris pada template lain.');
   page.drawText(spineTitle,{x:mmPt(W/2)-size*.40,y:mmPt(H/2)-tw/2,font,size,rotate:window.PDFLib.degrees(90),color:ink});
  }
  if(spineYear)drawLineCentered(page,bold,spineYear,9,mmPt(W/2),mmPt(18));
  const bytes=await pdf.save({useObjectStreams:true});resetPdf();const blob=new Blob([bytes],{type:'application/pdf'});pdfURL=URL.createObjectURL(blob);
  $('pdfView').src=pdfURL+'#view=FitH';$('pdfView').classList.remove('hidden');$('downloadPDF').href=pdfURL;$('downloadPDF').classList.remove('hidden');
  message('PDF berhasil dibuat. Ini PROOF: periksa 100% skala cetak, semua baris dan logo sebelum digunakan produksi.');
 }catch(err){message('Gagal membuat PDF: '+String(err?.message||err),true);}finally{button.disabled=false;}
}
for(let n=10;n<=28;n++){const op=document.createElement('option');op.value=String(n);op.textContent=n+' mm';$('spine').append(op);}$('spine').value='15';
$('scanInput').addEventListener('change',async e=>{try{await choose(e.target.files?.[0]);}catch(err){message(String(err?.message||err),true);}});
$('analyze').addEventListener('click',()=>{void analyze();});
$('addBlock').addEventListener('click',()=>{if(!layout)return;layout.blocks.push({text:'TEKS TAMBAHAN',x:110,y:100,w:780,h:35,size:12,bold:false,italic:false,underline:false,align:'center',color:'#111111'});selected=layout.blocks.length-1;$('confirmed').checked=false;resetPdf();drawEditors();redraw();audit();});
$('makePDF').addEventListener('click',()=>{void makePDF().catch(e=>message(String(e?.message||e),true));});
for(const id of ['paper','spine','bgColor','inkColor','spineTitle','spineYear','logoFile'])$(id).addEventListener('change',()=>{resetPdf();$('confirmed').checked=false;});

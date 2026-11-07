'use strict';
// V3.8: multi-photo job queue with independent OCR, editor, verification and thickness per order.
const $ = id => document.getElementById(id);
const FIELDS=['nama','nim','prodi','fakultas','universitas','jenis_dokumen','bulan_tahun'];
const REQUIRED=['judul',...FIELDS];
const COVER_TYPES=['polos','merah','maroon','custom'];
const unsafeProduction=o=>o&&o.style!=='polos'&&o.thickness===28;
const isPdf=f=>!!f&&(/\.pdf$/iu.test(f.name)||f.type==='application/pdf');
const isWord=f=>!!f&&/\.docx$/iu.test(f.name);
const isPhoto=f=>!!f&&(['image/jpeg','image/png','image/webp'].includes(f.type)||/\.(jpg|jpeg|png|webp)$/iu.test(f.name));
const isAccepted=f=>isPhoto(f)||isPdf(f)||isWord(f);
const MAX_ORDERS=40, MAX_IMAGE_SIZE=25*1024*1024, MAX_TOTAL_SIZE=200*1024*1024;
const SAMPLE={judul:'KEMASLAHATAN DALAM SISTEM BAGI HASIL NELAYAN DI DESA BRANTA PESISIR KECAMATAN TLANAKAN KABUPATEN PAMEKASAN',nama:'SERLI ISTIQLALIA WAHDANIYAH',nim:'22383032023',prodi:'EKONOMI SYARIAH',fakultas:'EKONOMI DAN BISNIS ISLAM',universitas:'UNIVERSITAS ISLAM NEGERI MADURA',jenis_dokumen:'SKRIPSI',bulan_tahun:'AGUSTUS 2026',title_segments:[{text:'KEMASLAHATAN DALAM SISTEM BAGI HASIL NELAYAN DI DESA BRANTA PESISIR KECAMATAN TLANAKAN KABUPATEN PAMEKASAN',italic:false}]};
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let orders=[],nextId=1,activeId=null,availableMM=Array.from({length:19},(_,i)=>i+10);
let pdfURL=null,geminiConfigured=false,painting=false,ocrBatchRunning=false,zipRunning=false;
let pendingName='COVER.pdf';
function active(){return orders.find(o=>o.id===activeId)||null;}
function newData(){return {judul:'',title_segments:[],nama:'',nim:'',prodi:'',fakultas:'',universitas:'',jenis_dokumen:'',bulan_tahun:''};}
function notice(message,type='info'){const n=$('notice');n.textContent=message;n.className='notice '+type;}
function step(n){document.querySelectorAll('.stepper span').forEach(e=>e.classList.toggle('active',Number(e.dataset.step)===n));}
function progress(msg){$('batchProgress').classList.remove('hidden');$('batchProgress').textContent=msg;}
function clearProgress(){$('batchProgress').classList.add('hidden');}
function errorMessage(error){if(error?.detail?.errors?.length)return error.detail.errors.join('; ');if(typeof error?.detail==='string')return error.detail;return error?.message||'Terjadi kesalahan.';}
async function jsonError(response){const payload=await response.json().catch(()=>({detail:{errors:[`HTTP ${response.status}`]}}));return new Error(errorMessage(payload));}
function btnBusy(button,busy,message='Memproses...'){
  if(busy){button.dataset.originalText ??=button.textContent;button.textContent=message;button.disabled=true;}
  else{button.textContent=button.dataset.originalText||button.textContent;button.disabled=false;}
}
function safeName(value){return String(value||'MAHASISWA').toLocaleUpperCase('id-ID').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,45)||'MAHASISWA';}
function addOrders(files){
  const list=Array.from(files||[]);if(!list.length)return;
  let added=0,rejected=[];
  for(const file of list){
    if(orders.length>=MAX_ORDERS){rejected.push(`${file.name}: maksimal ${MAX_ORDERS} pesanan`);continue;}
    if(!isAccepted(file)){rejected.push(`${file.name}: format tidak didukung`);continue;}
    if(file.size>MAX_IMAGE_SIZE){rejected.push(`${file.name}: lebih dari 25 MB`);continue;}
    if(orders.reduce((n,o)=>n+(o.file?.size||0),0)+file.size>MAX_TOTAL_SIZE){rejected.push(`${file.name}: total unggahan melebihi 200 MB`);continue;}
    const order={id:nextId++,file,imageURL:isPhoto(file)?URL.createObjectURL(file):null,data:newData(),thickness:null,style:'polos',custom_color:'#1458A8',status:'baru',verified:false,warnings:[],revision:0,pdfBlob:null};
    orders.push(order);added++;
    if(activeId===null)activeId=order.id;
  }
  if(added){selectOrder(activeId,false);step(1);}
  if(rejected.length)notice(`${added} berkas ditambahkan. ${rejected.length} tidak dimasukkan:\n${rejected.slice(0,5).join('\n')}`,'error');
  else notice(`${added} berkas ditambahkan. Klik "Baca Semua Berkas", lalu periksa identitas dan pilih ketebalan untuk SETIAP pesanan.`,'success');
  renderOrders();
}
function addManual(){
  if(orders.length>=MAX_ORDERS)return notice(`Maksimal ${MAX_ORDERS} pesanan.`,'error');
  const order={id:nextId++,file:null,imageURL:null,data:newData(),thickness:null,style:'polos',custom_color:'#1458A8',status:'periksa',verified:false,warnings:[],revision:0,pdfBlob:null};
  orders.push(order);selectOrder(order.id);renderOrders();notice('Pesanan manual ditambahkan. Isi identitas, pilih ketebalan, lalu verifikasi.');
}
function orderNumber(order){return orders.indexOf(order)+1;}
function statusLabel(o){
  if(o.status==='membaca')return ['Sedang dibaca','waiting'];
  if(o.status==='gagal')return ['Pembacaan / ekspor gagal','error'];
  if(o.pdfBlob && o.verified)return ['PDF berhasil','ready'];
  if(o.verified)return ['Siap dibuat','ready'];
  if(o.status==='baru')return ['Belum dibaca','waiting'];
  return ['Perlu diperiksa','waiting'];
}
function renderOrders(){
  const target=$('ordersList');const oldScroll=target.scrollTop;target.replaceChildren();$('orderCount').textContent=`(${orders.length})`;
  if(!orders.length){const el=document.createElement('p');el.className='empty-orders';el.textContent='Belum ada pesanan. Pilih banyak foto dari galeri atau ambil foto menggunakan kamera.';target.append(el);return;}
  for(const o of orders){
    const row=document.createElement('div');row.className='order-row'+(activeId===o.id?' active':'');
    const open=document.createElement('button');open.type='button';open.className='order-open';open.title='Buka dan edit pesanan';
    const num=document.createElement('span');num.className='order-index';num.textContent=String(orderNumber(o)).padStart(2,'0');
    const desc=document.createElement('span');desc.className='order-description';
    const title=document.createElement('strong');title.textContent=o.data.nama?.trim()||o.file?.name||'PESANAN MANUAL';
    const [label,kind]=statusLabel(o);const sub=document.createElement('small');
    sub.className='order-badge '+kind;sub.textContent=`${label} · ${o.style.toUpperCase()} · ${o.data.nim||'NIM belum terbaca'}`;
    desc.append(title,sub);open.append(num,desc);open.addEventListener('click',()=>selectOrder(o.id));
    const select=document.createElement('select');select.className='order-select';select.setAttribute('aria-label',`Ketebalan pesanan ${orderNumber(o)}`);
    const blank=document.createElement('option');blank.value='';blank.textContent='Pilih mm';select.append(blank);
    for(const mm of availableMM){const opt=document.createElement('option');opt.value=String(mm);opt.textContent=`${mm} mm`;if(o.style!=='polos'&&mm===28){opt.disabled=true;opt.textContent='28 mm (warna: perlu master)';}select.append(opt);}
    select.value=o.thickness===null?'':String(o.thickness);
    select.addEventListener('change',()=>setThickness(o.id,select.value?Number(select.value):null));
    const styleChoice=document.createElement('select');styleChoice.className='order-style';styleChoice.setAttribute('aria-label',`Jenis cover pesanan ${orderNumber(o)}`);
    for(const [v,label] of [['polos','Polos'],['merah','Merah'],['maroon','Maroon'],['custom','Custom']]){const opt=document.createElement('option');opt.value=v;opt.textContent=label;styleChoice.append(opt);}
    styleChoice.value=o.style;styleChoice.addEventListener('change',()=>setStyle(o.id,styleChoice.value));
    const remove=document.createElement('button');remove.type='button';remove.className='order-remove';remove.textContent='✕';remove.title=`Hapus pesanan ${orderNumber(o)}`;remove.addEventListener('click',()=>removeOrder(o.id));
    row.append(open,styleChoice,select,remove);target.append(row);
  }
  target.scrollTop=oldScroll;
}
function renderThickness(){
  const target=$('thicknessOptions');target.replaceChildren();const a=active();
  for(const mm of availableMM){
    const btn=document.createElement('button');btn.type='button';btn.className='size-button'+(a?.thickness===mm?' selected':'');
    btn.innerHTML=`<b>${mm}</b><span>mm</span><small>${a?.style!=='polos'&&mm===28?'Perlu master':'Tersedia'}</small>`;
    btn.disabled=!a||(a.style!=='polos'&&mm===28);btn.addEventListener('click',()=>setThickness(a.id,mm));target.append(btn);
  }
  $('selectedSize').textContent=a?.thickness ? `${String(a.style||'polos').toUpperCase()} · ${a.thickness} mm` : 'Belum dipilih';
}
function renderPhoto(order){
  const im=$('imagePreview');const empty=$('emptyPreview');
  if(order?.imageURL){im.src=order.imageURL;im.classList.remove('hidden');empty.classList.add('hidden');}
  else if(order?.file){im.removeAttribute('src');im.classList.add('hidden');empty.classList.remove('hidden');empty.querySelector('h3').textContent=(isPdf(order.file)?'📄 PDF':'📝 WORD')+' — '+order.file.name;}
  else{im.removeAttribute('src');im.classList.add('hidden');empty.classList.remove('hidden');empty.querySelector('h3').textContent='Klik pilih foto, atau gunakan tombol PDF/Word di bawah';}
}
function paintData(obj){
  painting=true;
  for(const key of FIELDS){document.querySelector(`[name="${key}"]`).value=String(obj?.[key]??'');}
  const editor=$('titleEditor');const segments=obj?.title_segments||obj?.titleSegments;
  if(Array.isArray(segments)&&segments.length&&segments.map(s=>s.text||'').join('')===(obj?.judul||'')){
    editor.innerHTML=segments.map(s=>`${s.italic?'<em>':''}${escapeHTML(s.text||'')}${s.italic?'</em>':''}`).join('');
  } else editor.textContent=obj?.judul||'';
  painting=false;
}
function extractSegments(){
  const segments=[];
  function push(text,italic){if(!text)return;if(segments.at(-1)?.italic===italic)segments.at(-1).text+=text;else segments.push({text,italic});}
  function walk(node,italic){
    if(node.nodeType===3){push(node.nodeValue||'',italic);return;}
    if(node.nodeType!==1)return;
    const tag=node.tagName.toLowerCase();const useItalic=italic||tag==='em'||tag==='i'||node.style?.fontStyle==='italic';
    if(tag==='br'){push('\n',italic);return;}
    if(['div','p'].includes(tag)&&segments.length&&!segments.at(-1).text.endsWith('\n'))push('\n',italic);
    for(const child of node.childNodes)walk(child,useItalic);
  }
  for(const node of $('titleEditor').childNodes)walk(node,false);
  if(segments.length)segments[0].text=segments[0].text.replace(/^\s+/gu,'');
  if(segments.length)segments.at(-1).text=segments.at(-1).text.replace(/\s+$/gu,'');
  return segments.filter(s=>s.text);
}
function currentData(){
  const title_segments=extractSegments();const result={judul:title_segments.map(s=>s.text).join(''),title_segments};
  for(const field of FIELDS)result[field]=document.querySelector(`[name="${field}"]`).value.trim();
  result.tahun=(result.bulan_tahun.match(/\b\d{4}\b/u)||[])[0]||'';return result;
}
function clearPDFPreview(){
  if(pdfURL){URL.revokeObjectURL(pdfURL);pdfURL=null;}
  $('pdfPreview').removeAttribute('src');$('pdfPreview').classList.add('hidden');$('previewEmpty').classList.remove('hidden');$('downloadButton').disabled=true;
}
function updatePDFPreview(o){
  clearPDFPreview();if(!o?.pdfBlob)return;
  pdfURL=URL.createObjectURL(o.pdfBlob);$('pdfPreview').src=pdfURL+'#view=FitH';$('pdfPreview').classList.remove('hidden');$('previewEmpty').classList.add('hidden');
  $('downloadButton').disabled=false;
  pendingName=`${String(orderNumber(o)).padStart(2,'0')}_${safeName(o.data.nama)}_${o.style.toUpperCase()}_${o.thickness}MM.pdf`;
}
function showWarnings(o){const w=$('ocrWarnings');w.textContent=o?.warnings?.length?'Perlu diperiksa: '+o.warnings.join('; '):'';w.classList.toggle('hidden',!o?.warnings?.length);}
function selectOrder(id,paint=true){
  const o=orders.find(e=>e.id===id);if(!o){activeId=null;paintData(newData());renderPhoto(null);clearPDFPreview();renderOrders();renderThickness();renderCoverStyle();$('activeOrderHeader').textContent='Belum ada pesanan';return;}
  activeId=o.id;
  if(paint)paintData(o.data); else paintData(o.data);
  renderPhoto(o);renderOrders();renderThickness();renderCoverStyle();showWarnings(o);updatePDFPreview(o);
  $('activeOrderHeader').textContent=`Pesanan ${String(orderNumber(o)).padStart(2,'0')} · ${o.file?.name||'Input manual'}`;
  $('approveOrder').textContent=o.verified?'✓ Sudah diperiksa (klik untuk ulang)':'✓ Tandai data sudah diperiksa';
}
function invalidateOrder(o){o.pdfBlob=null;o.verified=false;if(o.status!=='membaca')o.status=(o.file&&!o.data.judul?'baru':'periksa');}
function markDirty(){
  if(painting)return;const o=active();if(!o)return;
  o.data=currentData();o.revision++;invalidateOrder(o);clearPDFPreview();
  $('approveOrder').textContent='✓ Tandai data sudah diperiksa';renderOrders();
}
function renderCoverStyle(){
 const o=active();
 document.querySelectorAll('[data-cover-style]').forEach(b=>{b.classList.toggle('selected',b.dataset.coverStyle===(o?.style||'polos'));b.disabled=!o;});
 const show=o?.style==='custom';$('customColorRow').classList.toggle('hidden',!show);$('customColorPicker').value=o?.custom_color||'#1458A8';$('customColorCode').textContent=o?.custom_color||'#1458A8';
}
function setStyle(id,style){
 const o=orders.find(x=>x.id===id);if(!o||!COVER_TYPES.includes(style))return;
 if(o.id===activeId)o.data=currentData();
 o.style=style;invalidateOrder(o);
 const reset28=o.thickness===28&&style!=='polos';if(reset28)o.thickness=null;
 if(o.id===activeId){renderCoverStyle();renderThickness();clearPDFPreview();}
 renderOrders();notice(`Pesanan ${orderNumber(o)}: cover ${style.toUpperCase()} (${style==='polos'?'480 × 330':'475 × 320'} mm).`+(reset28?' Ukuran 28 mm direset karena batas potong master warna masih keluar halaman.':'') ,'info');
}
function setThickness(id,mm){
  const o=orders.find(x=>x.id===id);if(!o)return;
  if(mm!==null&&!availableMM.includes(mm))return notice('Template ketebalan tidak tersedia.','error');
  if(mm===28&&o.style!=='polos')return notice('Warna 28 mm diblokir: garis potong belakang kiri keluar kertas. Pilih ukuran lain atau perbarui master warna.','error');
  o.thickness=mm;invalidateOrder(o);
  if(o.id===activeId){clearPDFPreview();renderThickness();$('approveOrder').textContent='✓ Tandai data sudah diperiksa';}
  renderOrders();step(3);
}
function removeOrder(id){
  const o=orders.find(x=>x.id===id);if(!o)return;
  if(!confirm(`Hapus pesanan ${String(orderNumber(o)).padStart(2,'0')} (${o.data.nama||o.file?.name||'manual'})?`))return;
  if(o.imageURL)URL.revokeObjectURL(o.imageURL);
  orders=orders.filter(x=>x.id!==id);
  if(activeId===id)selectOrder(orders[0]?.id||null);
  else renderOrders();
}
function validData(data){return REQUIRED.filter(f=>!String(data?.[f]??'').trim());}
async function ocrOne(order){
  if(!order.file){order.status='gagal';order.warnings=['Pesanan manual tidak memiliki berkas. Isi data manual.'];renderOrders();return false;}
  const revision=order.revision;order.status='membaca';renderOrders();
  const data=new FormData();data.append('file',order.file);
  const controller=new AbortController();
  const timeoutId=setTimeout(()=>controller.abort(), 45000);
  try{
    const endpoint=isPhoto(order.file)?'/api/ocr':'/api/extract-document';
    const response=await fetch(endpoint,{method:'POST',body:data,signal:controller.signal});
    clearTimeout(timeoutId);
    if(!response.ok)throw await jsonError(response);
    const ocr=await response.json();
    if(revision!==order.revision){order.warnings=['Hasil pembacaan diterima, tetapi data telah diedit saat proses. Koreksi manual Anda dipertahankan.'];order.status='periksa';}
    else {order.data={...newData(),...ocr};order.warnings=Array.isArray(ocr.warnings)?ocr.warnings:[];order.status='periksa';order.verified=false;order.pdfBlob=null;}
    if(activeId===order.id){paintData(order.data);showWarnings(order);clearPDFPreview();}
    renderOrders();return true;
  }catch(error){
    clearTimeout(timeoutId);
    const isTimeout = error.name === 'AbortError';
    const msg = isTimeout ? 'Waktu pembacaan habis (timeout 45 detik). Periksa koneksi atau coba unggah ulang.' : error.message;
    order.status='gagal';order.warnings=[msg];
    if(activeId===order.id)showWarnings(order);
    renderOrders();return false;
  }
}
async function readSelected(){
  const a=active();if(!a)return notice('Pilih berkas terlebih dahulu.','error');
  if(!a.file)return notice('Pesanan ini manual; tidak ada berkas untuk dianalisis.','error');
  const btn=$('ocrButton');btnBusy(btn,true,'Membaca...');
  try{const success=await ocrOne(a);notice(success?`Berkas pesanan ${orderNumber(a)} terbaca. Periksa data dan tentukan ketebalan.`:`Pembacaan gagal: ${a.warnings.join('; ')}`,success?'success':'error');if(success)step(2);}finally{btnBusy(btn,false);}
}
async function readAll(){
  if(ocrBatchRunning)return;
  const queue=orders.filter(o=>o.file && ['baru','gagal','membaca'].includes(o.status));
  if(!queue.length)return notice('Tidak ada berkas yang perlu dibaca.','info');
  ocrBatchRunning=true;btnBusy($('ocrAllButton'),true,'Sedang baca...');
  let completed=0,success=0;
  progress(`Membaca berkas 0/${queue.length} ...`);
  try{
    for(let i=0; i<queue.length; i++){
      const o=queue[i];
      progress(`Membaca berkas ${i+1}/${queue.length} (${o.file?.name||'berkas'})...`);
      const ok=await ocrOne(o);
      if(ok)success++;
      completed++;
    }
    notice(`Pembacaan selesai: ${success}/${queue.length} berhasil. Periksa setiap nama/NIM/judul dan tentukan ukuran punggung masing-masing.`,success===queue.length?'success':'info');
    step(2);
  }catch(err){
    notice(`Terjadi kendala saat membaca: ${err?.message||err}`,'error');
  }finally{
    ocrBatchRunning=false;btnBusy($('ocrAllButton'),false);clearProgress();
  }
}
function approveActive(){
  const a=active();if(!a)return notice('Pilih pesanan terlebih dahulu.','error');
  a.data=currentData();const missing=validData(a.data);
  if(missing.length)return notice(`Pesanan ${orderNumber(a)} belum lengkap: ${missing.join(', ')}.`,'error');
  if(!availableMM.includes(a.thickness))return notice(`Pilih ukuran punggung untuk pesanan ${orderNumber(a)} terlebih dahulu.`,'error');
  if(unsafeProduction(a))return notice('Warna 28 mm memerlukan master baru yang tidak memotong tanda belakang.','error');
  a.verified=true;a.status='disetujui';renderOrders();
  $('approveOrder').textContent='✓ Sudah diperiksa (klik untuk ulang)';
  notice(`Pesanan ${orderNumber(a)} ${a.data.nama} disetujui: ${a.style.toUpperCase()}, ${a.thickness} mm.`,'success');
}
async function makeSelectedPDF(){
  const a=active();if(!a)return notice('Pilih pesanan terlebih dahulu.','error');
  a.data=currentData();const missing=validData(a.data);
  if(missing.length)return notice(`Data belum lengkap: ${missing.join(', ')}.`,'error');
  if(!availableMM.includes(a.thickness))return notice('Pilih ketebalan punggung pesanan ini terlebih dahulu.','error');
  if(unsafeProduction(a))return notice('Tidak aman: warna 28 mm keluar batas garis belakang. Ekspor diblokir.','error');
  const button=$('generateButton');btnBusy(button,true,'Membuat PDF...');
  try{
    const response=await fetch('/api/pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:a.data,thickness:a.thickness,style:a.style,custom_color:a.custom_color})});
    if(!response.ok)throw await jsonError(response);
    const warnings=(()=>{try{return JSON.parse(decodeURIComponent(response.headers.get('X-Zain-Warnings')||'%5B%5D'));}catch{return [];}})();
    a.pdfBlob=await response.blob();updatePDFPreview(a);renderOrders();step(4);
    notice(`PDF pesanan ${orderNumber(a)} — ${a.data.nama} — ${a.style.toUpperCase()} ${a.thickness} mm berhasil dibuat. Periksa preview sebelum cetak.`+(warnings.length?'\n'+warnings.join('\n'):''),warnings.length?'info':'success');
  }catch(error){a.status='gagal';a.warnings=[error.message];renderOrders();showWarnings(a);notice(`PDF gagal untuk pesanan ${orderNumber(a)}: ${error.message}`,'error');}
  finally{btnBusy(button,false);}
}
function saveBlob(blob,name){const url=URL.createObjectURL(blob);const element=document.createElement('a');element.href=url;element.download=name;document.body.append(element);element.click();element.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
async function makeOrderZIP(){
 if(zipRunning)return;
 const eligible=orders.filter(o=>o.verified&&availableMM.includes(o.thickness)&&!unsafeProduction(o)&&validData(o.data).length===0);
 if(!eligible.length)return notice('Belum ada pesanan siap ekspor. Periksa, pilih warna dan ketebalan masing-masing terlebih dahulu.','error');
 const skipped=orders.length-eligible.length;
 if(skipped && !confirm(`Ada ${skipped} pesanan belum lengkap/diverifikasi. Ekspor hanya ${eligible.length} pesanan yang sudah siap?`))return;
 const output=$('batchOutputMode').value;
 zipRunning=true;btnBusy($('batchJobsButton'),true,`Membuat ${eligible.length} PDF...`);
 progress(`Memproses ${eligible.length} cover dengan warna dan ukuran berbeda. Pilihan: ${output}.`);
 try{
  const items=eligible.map(o=>({nomor:orderNumber(o),thickness:o.thickness,style:o.style,custom_color:o.custom_color,data:o.data}));
  const response=await fetch('/api/orders/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items,output})});
  if(!response.ok)throw await jsonError(response);
  const blob=await response.blob();
  const fileName=output==='combined'?`ZAINNET_GABUNG_${eligible.length}_COVER.pdf`:`ZAINNET_${eligible.length}_COVER_${output.toUpperCase()}.zip`;
  saveBlob(blob,fileName);
  notice(`Berhasil membuat ${eligible.length} PDF: ${output==='combined'?'satu PDF multipage':output==='both'?'ZIP PDF individu + gabungan':'ZIP PDF per orang'}. Jenis dan ukuran setiap pesanan tetap berbeda.`, 'success');
 }catch(error){notice(`Ekspor massal gagal: ${error.message}`,'error');}
 finally{zipRunning=false;btnBusy($('batchJobsButton'),false);clearProgress();}
}
// File intake
$('pdfInput').addEventListener('change',event=>{addOrders(event.target.files);event.target.value='';});
$('wordInput').addEventListener('change',event=>{addOrders(event.target.files);event.target.value='';});
$('pdfUploadButton').addEventListener('click',()=>$('pdfInput').click());
$('wordUploadButton').addEventListener('click',()=>$('wordInput').click());
$('photoInput').addEventListener('change',event=>{addOrders(event.target.files);event.target.value='';});
$('cameraInput').addEventListener('change',event=>{addOrders(event.target.files);event.target.value='';});
$('cameraButton').addEventListener('click',()=>$('cameraInput').click());
$('manualButton').addEventListener('click',addManual);
for(const evt of ['dragenter','dragover'])$('dropzone').addEventListener(evt,event=>{event.preventDefault();$('dropzone').classList.add('dragover');});
for(const evt of ['dragleave','drop'])$('dropzone').addEventListener(evt,event=>{event.preventDefault();$('dropzone').classList.remove('dragover');if(evt==='drop')addOrders(event.dataTransfer.files);});
$('clearPhoto').addEventListener('click',()=>{const a=active();if(a)removeOrder(a.id);else notice('Tidak ada pesanan yang dipilih.');});
$('ocrButton').addEventListener('click',readSelected);$('ocrAllButton').addEventListener('click',readAll);
$('titleEditor').addEventListener('input',markDirty);
$('titleEditor').addEventListener('paste',event=>{event.preventDefault();document.execCommand('insertText',false,(event.clipboardData||window.clipboardData).getData('text/plain'));});
document.querySelectorAll('#dataForm input').forEach(input=>input.addEventListener('input',markDirty));
$('italicButton').addEventListener('mousedown',event=>event.preventDefault());
$('italicButton').addEventListener('click',()=>{
  const editor=$('titleEditor'),sel=window.getSelection();
  if(!sel||!sel.rangeCount||sel.isCollapsed||!editor.contains(sel.anchorNode))return notice('Blok kata di dalam judul terlebih dahulu.','error');
  document.execCommand('italic',false,null);markDirty();
});
$('clearFormatting').addEventListener('click',()=>{$('titleEditor').textContent=$('titleEditor').innerText;markDirty();});
$('fillExample').addEventListener('click',()=>{
  if(!active())addManual();const a=active();a.data=JSON.parse(JSON.stringify(SAMPLE));a.verified=false;a.status='periksa';a.revision++;
  selectOrder(a.id);step(2);notice('Data Serli dimasukkan hanya untuk uji coba, bukan hasil OCR. Pilih ketebalan terlebih dahulu.');
});
$('resetForm').addEventListener('click',()=>{
  const a=active();if(!a)return;
  if(!confirm('Kosongkan data mahasiswa pada pesanan ini saja?'))return;
  a.data=newData();a.revision++;invalidateOrder(a);a.warnings=[];selectOrder(a.id);
});
document.querySelectorAll('[data-cover-style]').forEach(b=>b.addEventListener('click',()=>{const a=active();if(a)setStyle(a.id,b.dataset.coverStyle);}));
$('customColorPicker').addEventListener('input',e=>{const a=active();if(!a)return;a.custom_color=e.target.value.toUpperCase();invalidateOrder(a);renderCoverStyle();clearPDFPreview();renderOrders();});
$('approveOrder').addEventListener('click',approveActive);
$('generateButton').addEventListener('click',makeSelectedPDF);
$('batchJobsButton').addEventListener('click',makeOrderZIP);
$('downloadButton').addEventListener('click',()=>{
  const a=active();if(!a?.pdfBlob)return notice('Buat PDF untuk pesanan ini terlebih dahulu.','error');
  saveBlob(a.pdfBlob,`${String(orderNumber(a)).padStart(2,'0')}_${safeName(a.data.nama)}_${a.style.toUpperCase()}_${a.thickness}MM.pdf`);
});
async function loadStatus(){
  try{
    const response=await fetch('/api/status');if(!response.ok)throw new Error('Server tidak tersedia');
    const result=await response.json();availableMM=result.thicknesses||availableMM;geminiConfigured=!!result.gemini_configured;
    $('connection').textContent=geminiConfigured?'PDF & Gemini siap':'PDF / Word lokal siap · Foto Gemini belum diatur';
    $('serverDot').classList.add('online');
    if(!result.original_font_match)document.querySelector('.safety').innerHTML='<strong>Periksa sebelum cetak:</strong> font '+escapeHTML(result.bold_font)+' belum identik dengan Times New Roman asli. Cetak percobaan skala 100%.';
  }catch(error){$('connection').textContent='Backend belum berjalan';notice('Backend belum tersedia. Jalankan sesuai README.','error');}
  renderThickness();renderOrders();
}
paintData(newData());renderCoverStyle();loadStatus();

/* ZAIN.NET V4.6 — OCR statis, tanpa Gemini atau token.
 * Cepat: satu pembacaan seluruh foto.
 * Teliti: satu pembacaan + tiga zona yang diproses di resolusi lebih tinggi.
 * Worker bilingual Indonesia + Inggris dipakai ulang sepanjang sesi, juga untuk PDF scan.
 */
import {COVER_ZONES,zoneBounds} from './ocr-zones.js?v=4.47';
let worker=null,workerLanguage=null,loadingPromise=null;
let onProgress=()=>{};
export function setOCRProgress(cb){onProgress=typeof cb==='function'?cb:()=>{};}
function stage(message){try{onProgress(message);}catch{}}
function deadline(promise,ms,label){
  let timer;return Promise.race([
    Promise.resolve(promise),
    new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(`${label} melewati ${Math.round(ms/1000)} detik.`)),ms);})
  ]).finally(()=>clearTimeout(timer));
}
const STATUSES={
  'loading tesseract core':'Menyiapkan engine OCR',
  'initializing tesseract':'Memulai OCR lokal',
  'loading language traineddata':'Memuat model bahasa',
  'initializing api':'Mengaktifkan pembaca',
  'recognizing text':'Mengenali tulisan'
};
export async function resetOCR(){
  const old=worker;worker=null;workerLanguage=null;loadingPromise=null;
  if(old)try{await deadline(old.terminate(),6000,'Menutup worker OCR');}catch{}
}
export async function getOCRWorker(lang='ind+eng'){
  if(!globalThis.Tesseract?.createWorker)throw Error('Tesseract gagal dimuat. Periksa internet pertama kali dan refresh situs (tidak membutuhkan token).');
  if(worker && workerLanguage===lang)return worker;
  if(loadingPromise){try{await loadingPromise;}catch{}if(worker && workerLanguage===lang)return worker;}
  if(worker)await resetOCR();
  stage('Menyiapkan model OCR lokal (penggunaan pertama dapat lebih lama)');
  const promise=globalThis.Tesseract.createWorker(lang,1,{logger(message){
    const label=STATUSES[message.status]||message.status||'Memproses OCR';
    const percent=Number.isFinite(message.progress)?` ${Math.round(message.progress*100)}%`:'';
    stage(label+percent);
  }});
  loadingPromise=promise;
  try{
    const next=await deadline(promise,90000,'Mengunduh/memuat model OCR');
    worker=next;workerLanguage=lang;stage('Model siap dan dipakai ulang');return next;
  }catch(e){promise.then(w=>w.terminate()).catch(()=>{});throw Error(`Model OCR gagal dimuat: ${e.message}`);}
  finally{if(loadingPromise===promise)loadingPromise=null;}
}
async function decodeImage(blob){
  if(typeof createImageBitmap==='function')try{return await deadline(createImageBitmap(blob,{imageOrientation:'from-image'}),20000,'Dekode gambar');}catch{}
  const src=URL.createObjectURL(blob);try{
    const img=new Image();await deadline(new Promise((res,rej)=>{img.onload=res;img.onerror=()=>rej(Error('Gambar tidak dapat dibuka'));img.src=src;}),18000,'Membuka gambar');return img;
  }finally{URL.revokeObjectURL(src);}
}
async function canvasToBlob(canvas,type='image/png'){
  return deadline(new Promise((res,rej)=>canvas.toBlob(b=>b?res(b):rej(Error('Gagal membuat gambar OCR')),type,type==='image/jpeg'?.92:undefined)),12000,'Memproses gambar');
}
function adaptiveBinary(ctx,width,height){
  // Adaptif pada zona saja; dibatasi < 3 megapiksel untuk RAM HP.
  if(width*height>3000000)return;
  const img=ctx.getImageData(0,0,width,height),pixels=img.data;
  const w1=width+1;const integral=new Float64Array(w1*(height+1));
  for(let y=0;y<height;y++){
    let sum=0;for(let x=0;x<width;x++){
      const p=(y*width+x)*4;
      const v=.299*pixels[p]+.587*pixels[p+1]+.114*pixels[p+2];
      sum+=v;integral[(y+1)*w1+x+1]=integral[y*w1+x+1]+sum;
    }
  }
  const r=Math.max(10,Math.min(25,Math.round(Math.min(width,height)/55)));
  for(let y=0;y<height;y++){
    const ya=Math.max(0,y-r),yb=Math.min(height-1,y+r);
    for(let x=0;x<width;x++){
      const xa=Math.max(0,x-r),xb=Math.min(width-1,x+r);
      const i=y*width+x,p=i*4;
      const mean=(integral[(yb+1)*w1+xb+1]-integral[ya*w1+xb+1]-integral[(yb+1)*w1+xa]+integral[ya*w1+xa])/((xb-xa+1)*(yb-ya+1));
      const v=.299*pixels[p]+.587*pixels[p+1]+.114*pixels[p+2];
      const out=v < mean-11?0:255;
      pixels[p]=pixels[p+1]=pixels[p+2]=out;
    }
  }
  ctx.putImageData(img,0,0);
}
function makeCanvas(bitmap,{rect=null,maxSide=2100,maxPixels=3200000,contrast=1.35,threshold=false,allowUpscale=false}={}){
  const srcw=bitmap.width||bitmap.naturalWidth,srch=bitmap.height||bitmap.naturalHeight;
  if(!srcw||!srch)throw Error('Ukuran foto tidak dapat dibaca');
  const area=rect||{x:0,y:0,width:srcw,height:srch};
  const scale=Math.min(maxSide/Math.max(area.width,area.height),Math.sqrt(maxPixels/(area.width*area.height)),allowUpscale?2.35:1);
  const width=Math.max(1,Math.round(area.width*scale)),height=Math.max(1,Math.round(area.height*scale));
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:threshold});
  if(!ctx)throw Error('RAM tidak cukup membuat gambar. Tutup tab lain lalu ulangi.');
  ctx.fillStyle='white';ctx.fillRect(0,0,width,height);
  if('filter' in ctx)ctx.filter=`grayscale(1) contrast(${contrast})`;
  ctx.drawImage(bitmap,area.x,area.y,area.width,area.height,0,0,width,height);
  if(threshold){ctx.filter='none';adaptiveBinary(ctx,width,height);}
  return canvas;
}
export async function prepareOCRImage(blob,{maxSide=2200,contrast=1.35}={}){
  stage('Menyiapkan foto agar tulisan tetap terbaca');
  const bitmap=await decodeImage(blob);
  try{
    const canvas=makeCanvas(bitmap,{maxSide,maxPixels:3600000,contrast});
    const width=canvas.width,height=canvas.height;
    const out=await canvasToBlob(canvas);canvas.width=0;canvas.height=0;
    stage(`Gambar siap ${width} × ${height} px`);return out;
  }finally{if(typeof bitmap.close==='function')bitmap.close();}
}
export async function prepareOCRZones(blob,{threshold=false}={}){
  const bitmap=await decodeImage(blob);const output={};
  try{
    const width=bitmap.width||bitmap.naturalWidth,height=bitmap.height||bitmap.naturalHeight;
    for(const zone of COVER_ZONES){
      stage(`Mempertajam zona ${zone.label}`);
      const rect=zoneBounds(zone,width,height);
      const canvas=makeCanvas(bitmap,{rect,maxSide:1950,maxPixels:2400000,allowUpscale:true,contrast:threshold?1.1:1.6,threshold});
      output[zone.id]=await canvasToBlob(canvas);canvas.width=0;canvas.height=0;
    }
  }finally{if(typeof bitmap.close==='function')bitmap.close();}
  return output;
}
export async function recognizeLocalResult(blob,{lang='ind+eng',isPrepared=false,psm='3',maxSide=2200}={}){
  const prepared=isPrepared?blob:await prepareOCRImage(blob,{maxSide});
  const reader=await getOCRWorker(lang);
  try{
    // Layout seluruh cover dan zona teks memiliki segmentasi halaman berbeda.
    if(typeof reader.setParameters==='function')await deadline(reader.setParameters({tessedit_pageseg_mode:String(psm),preserve_interword_spaces:'1'}),6000,'Mengatur mode OCR');
    const result=await deadline(reader.recognize(prepared),42000,'Pengenalan tulisan');
    return {text:String(result?.data?.text||''),confidence:Number(result?.data?.confidence),data:result?.data||{},preparedImage:prepared};
  }catch(error){await resetOCR();throw Error(`OCR gagal: ${error.message}`);}
}
export async function recognizeLocal(blob,{detail=false,isPrepared=false}={}){
  // Kontrak lama dipertahankan untuk kompatibilitas.
  const result=await recognizeLocalResult(blob,{lang:'ind+eng',isPrepared});
  if(!result.text.trim())throw Error('Tidak ada teks terdeteksi. Gunakan mode Teliti atau periksa foto.');
  return result.text;
}

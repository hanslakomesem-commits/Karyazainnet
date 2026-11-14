/** Conservative photo/scan underline detection; OCR text alone cannot prove typography. */
export const nameKey=s=>String(s||'').toUpperCase().normalize('NFKD').replace(/[\u0300-\u036f]/gu,'').replace(/[^A-Z0-9]/gu,'');
export function ocrNameBox(data,name){
 const key=nameKey(name);if(key.length<4)return null;
 const candidates=[];
 const visit=(node,depth=0)=>{
  if(!node||depth>7)return;
  if(Array.isArray(node)){node.forEach(n=>visit(n,depth+1));return;}
  if(typeof node!=='object')return;
  if(node.bbox&&node.words){
   const got=nameKey(node.text||node.words.map(w=>w.text||'').join(' '));
   if(got===key)candidates.push(node.bbox);
  }
  for(const field of ['blocks','paragraphs','lines'])visit(node[field],depth+1);
 };
 visit(data);
 return candidates.find(b=>b&&b.x1>b.x0+25&&b.y1>b.y0+5)||null;
}
export function underlineScore(image,box){
 if(!image||!box||!image.data)return 0;
 const W=image.width,H=image.height,d=image.data;
 const x0=Math.max(0,Math.round(box.x0)),x1=Math.min(W-1,Math.round(box.x1));
 const y0=Math.max(0,Math.round(box.y0)),y1=Math.min(H-1,Math.round(box.y1));
 if(x1-x0<35||y1-y0<6)return 0;
 const h=y1-y0,w=x1-x0;
 const xa=x0+Math.round(w*.06),xb=x1-Math.round(w*.06);
 const n=Math.min(160,Math.max(55,Math.floor((xb-xa)/2)));
 const dark=(x,y)=>{if(x<0||x>=W||y<0||y>=H)return false;const i=(y*W+x)*4;return d[i]*.299+d[i+1]*.587+d[i+2]*.114<145;};
 let best=0;
 for(let y=Math.max(y0+Math.floor(h*.35),y1-Math.max(9,Math.round(h*.75)));y<=Math.min(H-2,y1+Math.max(4,Math.round(h*.45)));y++){
  for(const slope of [-.04,-.025,-.012,0,.012,.025,.04]){
   let count=0,run=0,longest=0;
   for(let i=0;i<n;i++){
    const x=Math.round(xa+(xb-xa)*i/(n-1)),yy=Math.round(y+slope*(x-(xa+xb)/2));
    const ink=dark(x,yy-1)||dark(x,yy)||dark(x,yy+1);
    if(ink){count++;longest=Math.max(longest,++run);}else run=0;
   }
   best=Math.max(best,.6*count/n+.4*longest/n);
  }
 }
 return best;
}
export async function scanNameUnderline(data,preparedImage,name){
 const bbox=ocrNameBox(data,name);
 if(!bbox||!preparedImage)return {detected:null,reason:'kotak OCR nama tidak tersedia'};
 let bitmap=null;try{
  if(typeof createImageBitmap==='function')bitmap=await createImageBitmap(preparedImage);
  else{const src=URL.createObjectURL(preparedImage);try{bitmap=new Image();await new Promise((ok,fail)=>{bitmap.onload=ok;bitmap.onerror=fail;bitmap.src=src;});}finally{URL.revokeObjectURL(src);}}
  const w=bitmap.width||bitmap.naturalWidth,h=bitmap.height||bitmap.naturalHeight;
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);
  const result=underlineScore(ctx.getImageData(0,0,w,h),bbox);
  canvas.width=canvas.height=0;
  return {detected:result>=.82,score:result};
 }catch(error){return {detected:null,reason:error.message};}
 finally{try{bitmap?.close?.();}catch{}}
}
/** Convert PDF.js source text line coordinates into canvas pixels for the first page. */
export function pdfNameBox(items,name,viewport){
 const key=nameKey(name);if(!key||!viewport?.convertToViewportPoint)return null;
 const spans=(items||[]).filter(it=>it?.str&&it?.transform).map(it=>({text:it.str,x:Number(it.transform[4]),y:Number(it.transform[5]),w:Number(it.width)||0,h:Number(it.height)||10}));
 const rows=[];
 for(const sp of spans.sort((a,b)=>b.y-a.y||a.x-b.x)){
  let row=rows.find(r=>Math.abs(r.y-sp.y)<=2.3);
  if(!row){row={y:sp.y,items:[]};rows.push(row);}
  row.items.push(sp);
 }
 for(const row of rows){
  const sorted=row.items.sort((a,b)=>a.x-b.x);
  if(nameKey(sorted.map(s=>s.text).join(' '))!==key)continue;
  const xMin=Math.min(...sorted.map(s=>s.x)),xMax=Math.max(...sorted.map(s=>s.x+s.w));
  const height=Math.max(...sorted.map(s=>s.h));
  const [ax,ay]=viewport.convertToViewportPoint(xMin,row.y);
  const [bx]=viewport.convertToViewportPoint(xMax,row.y);
  const scale=Math.abs(Number(viewport.scale)||1);
  return {x0:Math.min(ax,bx),x1:Math.max(ax,bx),y0:ay-height*scale,y1:ay+1*scale};
 }
 return null;
}

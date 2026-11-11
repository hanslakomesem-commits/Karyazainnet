/* ZAIN.NET template-first DOCX compositor — client-side only.
 * LGPL? Application code: MIT. JSZip separately licensed (MIT/GPL).
 * Retains journal OOXML package and replaces front-matter placeholders in situ.
 * Imports source document body, drawing dependencies, and footnotes.
 * Intended for review before journal submission; not a guarantee of compliance.
 */
(function (global) {
'use strict';
const NS={
 w:'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
 r:'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
 rel:'http://schemas.openxmlformats.org/package/2006/relationships',
 ct:'http://schemas.openxmlformats.org/package/2006/content-types',
 xml:'http://www.w3.org/XML/1998/namespace'
};
const DOCRELPATH='word/_rels/document.xml.rels';
const CTYPES='[Content_Types].xml';
const formatMime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',bmp:'image/bmp',svg:'image/svg+xml',emf:'image/x-emf',wmf:'image/x-wmf',tif:'image/tiff',tiff:'image/tiff',bin:'application/octet-stream'};
function parse(x){const d=new DOMParser().parseFromString(x,'application/xml');if(d.getElementsByTagName('parsererror').length)throw Error('XML DOCX rusak');return d;}
function serialize(x){return new XMLSerializer().serializeToString(x);}
function children(e,n,ns=NS.w){return Array.from(e.childNodes).filter(x=>x.nodeType===1&&x.localName===n&&x.namespaceURI===ns);}
function first(e,n,ns=NS.w){return children(e,n,ns)[0]||null;}
function get(e,n,ns=NS.w){return Array.from(e.getElementsByTagNameNS(ns,n));}
function make(d,n){return d.createElementNS(NS.w,'w:'+n);}
function aval(n,key,ns=NS.w){return n?n.getAttributeNS(ns,key):null;}
function attr(n,key,v,ns=NS.w,prefix='w'){n.setAttributeNS(ns,prefix+':'+key,String(v));}
function textOf(p){return get(p,'t').map(x=>x.textContent||'').join('').replace(/\s+/g,' ').trim();}
function replaceText(p,value){
 if(!p)return;
 const tnodes=get(p,'t');
 if(!tnodes.length){const r=make(p.ownerDocument,'r'),t=make(p.ownerDocument,'t');t.setAttributeNS(NS.xml,'xml:space','preserve');t.textContent=String(value||'');r.appendChild(t);p.appendChild(r);return;}
 tnodes[0].textContent=String(value||'');tnodes[0].setAttributeNS(NS.xml,'xml:space','preserve');
 for(const t of tnodes.slice(1))t.textContent='';
 // Remove instruction-only red/highlight character formatting from filled data.
 for(const r of get(p,'r')){
  const rp=first(r,'rPr');if(!rp)continue;
  for(const h of children(rp,'highlight'))rp.removeChild(h);
  for(const c of children(rp,'color')){
   const v=(aval(c,'val')||'').toLowerCase();
   if(['ff0000','f00','ff0001','ed1c24'].includes(v))attr(c,'val','000000');
  }
 }
}

function titleFriendly(s){
 const original=(s||'').replace(/\s+/g,' ').trim();
 if(!original)return '';
 const letters=(original.match(/[A-Za-zÀ-ÿ]/g)||[]).length;
 const uppers=(original.match(/[A-ZÀ-Þ]/g)||[]).length;
 // Respect mixed-case source, but normalize all-caps university paper titles.
 if(letters && uppers/letters > .85){
  return original.toLocaleLowerCase('id').replace(/(^|[\s(\[{:—–-])([a-zà-ÿ])/g,(_,a,b)=>a+b.toLocaleUpperCase('id'))
   .replace(/\b(uin|paud|spss|ict|pai|umkm|doi)\b/gi,x=>x.toUpperCase());
 }
 return original;
}
function shortTitle(title,max=52){
 const s=titleFriendly(title).replace(/[\s,.…:;!]+$/g,'');
 if(s.length<=max)return s;
 const words=s.split(/\s+/),out=[];
 for(const word of words){if((out.join(' ')+(out.length?' ':'')+word).length>max-2)break;out.push(word)}
 return (out.length?out.join(' '):s.slice(0,Math.max(18,max-3)).replace(/\s+\S*$/,''))+'…';
}
function splitJournalTitle(title,maxChars=65){
 const s=titleFriendly(title).replace(/\s+/g,' ').trim();
 if(s.length<=maxChars)return [s,''];
 const words=s.split(' '),mid=s.length/2;let best=1,bestScore=1e9,acc='';
 for(let i=0;i<words.length-1;i++){
  acc+=(i?' ':'')+words[i];
  // Prefer similar-width lines; avoid an excessively wide first line.
  const score=Math.abs(acc.length-mid)+(acc.length>maxChars?50:0);
  if(score<bestScore){bestScore=score;best=i+1;}
 }
 return [words.slice(0,best).join(' '),words.slice(best).join(' ')];
}
function displayAuthor(text){
 const s=(text||'').replace(/\s+/g,' ').trim();
 if(!s)return '';
 const letters=(s.match(/[A-Za-zÀ-ÿ]/g)||[]).length,upper=(s.match(/[A-ZÀ-Þ]/g)||[]).length;
 return letters&&upper/letters>.85?s.toLocaleLowerCase('id').replace(/\b[a-zà-ÿ]/g,c=>c.toLocaleUpperCase('id')):s;
}
function cleanHeading(s,rule){
 s=s.replace(/^\s*(?:[A-G]|\d{1,2})\s*[.)]\s*/i,'').trim();
 if(rule.headingCase==='upper')return s.toLocaleUpperCase('id');
 if(rule.headingCase==='title')return s.replace(/\w[^\s]*/g,m=>m[0].toLocaleUpperCase('id')+m.slice(1).toLocaleLowerCase('id'));
 return s;
}
function getBody(doc){const b=get(doc,'body')[0];if(!b)throw Error('DOCX tidak memiliki badan dokumen');return b;}
function bodyEls(doc){return Array.from(getBody(doc).childNodes).filter(x=>x.nodeType===1);}
function locateP(doc,i){const n=bodyEls(doc)[Number(i)];return n&&n.namespaceURI===NS.w&&n.localName==='p'?n:null;}
function locateCellP(doc,bi,ri,ci,pi){const tbl=bodyEls(doc)[Number(bi)];if(!tbl||tbl.localName!=='tbl')return null;
 const row=children(tbl,'tr')[Number(ri)],cell=row&&children(row,'tc')[Number(ci)];return cell?children(cell,'p')[Number(pi)]||null:null;}
function sliceCount(str){return (str||'').trim().split(/\s+/).filter(Boolean).length;}
function fromSource(srcDoc){
 const nodes=bodyEls(srcDoc),lines=nodes.map(n=>n.localName==='p'?textOf(n):'');
 const intro=/^(?:(?:[A-H]|\d{1,2})[.)]\s*)?(?:PENDAHULUAN|INTRODUCTION|LATAR BELAKANG|BACKGROUND)(?:\b|\s|\W)/i;
 let start=lines.findIndex((s,i)=>i>0&&intro.test(s)&&s.length<110);
 const abstractHead=/^(?:ABSTRAK|ABSTRACT)\s*:?(?:\s+|$)/i;
 const keywordHead=/^(?:KATA\s*KUNCI|KEYWORDS?)\s*:/i;
 if(start<0)start=lines.findIndex((s,i)=>i>0&&/^(?:A\.|1\.)\s+(?:PENDAHULUAN|INTRODUCTION)/i.test(s));
 if(start<0)throw Error('Bagian Pendahuluan/Introduction tidak ditemukan pada artikel. Tambahkan judul bagian tersebut di Word.');
 const front=nodes.slice(0,start).filter(n=>n.localName==='p').map(n=>textOf(n));
 const title=front.find(s=>s.length>12&&!/^\d+$/.test(s))||'';
 const abs={id:'',en:'',ki:'',ke:''};let mode='';
 for(const line of front){if(!line)continue;
  const match=abstractHead.exec(line);
  if(match){mode=/^ABSTRAK\b/i.test(line)?'id':'en';const rest=line.slice(match[0].length).trim();if(rest&&!/^[:;]+$/.test(rest))abs[mode]+=(abs[mode]?' ':'')+rest;continue;}
  const k=keywordHead.exec(line);if(k){const target=/^KATA/i.test(line)?'ki':'ke';abs[target]=line.slice(k[0].length).trim();mode='';continue;}
  if(mode){abs[mode]+=(abs[mode]?' ':'')+line;}
 }
 const authorLines=[];let afterTitle=false;
 for(const s of front){if(!afterTitle){if(s===title)afterTitle=true;continue;}
  if(abstractHead.test(s)||keywordHead.test(s))break;
  if(s)authorLines.push(s);
 }
 const emails=authorLines.filter(x=>/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(x));
 const affiliations=authorLines.filter(x=>/^(?:program studi|prodi|fakultas|universitas|university|department|institut|sekolah tinggi|institut)/i.test(x));
 const authors=authorLines.filter(x=>!emails.includes(x)&&!affiliations.includes(x)&&!/^\b(?:telp|no\. hp|phone)\b/i.test(x));
 const content=nodes.slice(start).filter(n=>!(n.localName==='sectPr'));
 const hasNotes=content.some(n=>get(n,'footnoteReference').length>0);
 return {title,author:authors[0]||'',affiliation:affiliations[0]||'',email:emails[0]||'',
 abstractId:abs.id,abstractEn:abs.en,keywordsId:abs.ki,keywordsEn:abs.ke,
 content,frontLines:front,start,paragraphs:content.filter(n=>n.localName==='p').length,
 tables:content.filter(n=>n.localName==='tbl').length,hasNotes};
}
function unifyMeta(info,meta){const out={...info};
 for(const k of ['title','author','affiliation','email','abstractId','abstractEn','keywordsId','keywordsEn'])if((meta||{})[k]?.trim())out[k]=meta[k].trim();
 return out;
}
function valueOf(slot,info,meta,warnings,rule){
 const en=info.abstractEn||'',id=info.abstractId||'';
 const ke=info.keywordsEn||info.keywordsId||'',ki=info.keywordsId||info.keywordsEn||'';
 const [titleLine1,titleLine2]=splitJournalTitle(info.title,65);
 const vals={title:titleFriendly(info.title),titleLine1,titleLine2,shortTitle:shortTitle(info.title,52),author:displayAuthor(info.author),affiliation:info.affiliation,email:info.email,phoneLabel:'Nomor WA yang bisa dihubungi: '+(meta?.phone||'—'),
 abstractEn:en,abstractId:id,abstractIdBrackets:id?'['+id+']':'',abstractEnLabel:en?'Abstract: '+en:'Abstract: —',
 abstractEnPrefix:en?'ABSTRACT  '+en:'ABSTRACT',keywordsEn:ke,keywordsId:ki,
 keywordsEnLabel:ke?'Keywords: '+ke:'Keywords: —',dateReceived:'Received: '+(meta?.received||'—'),
 dateRevised:'Revised: '+(meta?.revised||'—'),dateAccepted:'Accepted: '+(meta?.accepted||'—'),
 datePublished:'Published: '+(meta?.published||'—'),
 dateHistory:'Article history: Received: '+(meta?.received||'—')+'; Revised: '+(meta?.revised||'—')+'; Accepted: '+(meta?.accepted||'—')+'; Published: '+(meta?.published||'—')};
 if(slot==='')return '';
 if(slot.startsWith('literal:'))return slot.slice(8);
 if(slot==='abstractEn'&&!en){warnings.push('Abstrak Bahasa Inggris tidak ditemukan; bagian template dikosongkan.');return '—';}
 if(slot==='abstractId'&&!id){warnings.push('Abstrak Bahasa Indonesia tidak ditemukan; bagian template dikosongkan.');return '—';}
 if(slot==='abstractIdBrackets'&&!id){warnings.push('Abstrak Bahasa Indonesia belum tersedia.');return '';}
 return vals[slot]===undefined?String(meta?.[slot]||''):String(vals[slot]||'');
}
function replaceRabbaniFront(p,value,size){
 // The publisher's example puts superscript indices and blue font instructions
 // in separate runs. Replace the example with a clean normal text run while
 // preserving its original centered paragraph position.
 const d=p.ownerDocument,oldRuns=[...children(p,'r')];
 for(const r of oldRuns)p.removeChild(r);
 for(const hl of children(p,'hyperlink'))p.removeChild(hl);
 const r=make(d,'r'),rPr=make(d,'rPr');
 const font=make(d,'rFonts');for(const k of ['ascii','hAnsi','cs','eastAsia'])attr(font,k,'Book Antiqua');rPr.appendChild(font);
 const sz=make(d,'sz'),szCs=make(d,'szCs');attr(sz,'val',size*2);attr(szCs,'val',size*2);rPr.appendChild(sz);rPr.appendChild(szCs);
 rPr.appendChild(make(d,'b'));
 const t=make(d,'t');t.setAttributeNS(NS.xml,'xml:space','preserve');t.textContent=String(value||'');
 r.appendChild(rPr);r.appendChild(t);p.appendChild(r);
}
function locateNestedP(doc,bodyIndex,nestedIndex){
 const p=locateP(doc,bodyIndex);
 return p?get(p,'p')[Number(nestedIndex)]||null:null;
}
function replaceFront(tDoc,rule,info,meta,warnings){
 let filled=0,missing=[];
 for(const [idx,slot] of Object.entries(rule.fields||{})){
  const p=locateP(tDoc,idx);
  if(!p){missing.push('p'+idx);continue;}
  if(rule.id==='rabbani' && ['1','2','4','5','6'].includes(idx))replaceRabbaniFront(p,valueOf(slot,info,meta,warnings,rule),['1','2'].includes(idx)?13:idx==='4'?11:10);
  else replaceText(p,valueOf(slot,info,meta,warnings,rule));filled++;
 }
 for(const [bi,pi,slot] of rule.textboxes||[]){
  // RABBANI Indonesia-only replaces its anchored shapes with a native table.
  // No need to rewrite text inside an object that will be removed.
  if(rule.id==='rabbani'&&rule.abstractLanguage==='id-only')continue;
  const p=locateNestedP(tDoc,bi,pi);
  if(!p){missing.push('box'+bi+'/'+pi);continue;}
  replaceText(p,valueOf(slot,info,meta,warnings,rule));filled++;
 }
 for(const [bi,ri,ci,pi,slot] of rule.table||[]){
  const p=locateCellP(tDoc,bi,ri,ci,pi);
  if(!p){missing.push('t'+bi+'/'+ri+'/'+ci+'/'+pi);continue;}
  replaceText(p,valueOf(slot,info,meta,warnings,rule));filled++;
 }
 if(missing.length)warnings.push('Posisi template berubah: '+missing.join(', '));
 return filled;
}
function fitNuansaLongTitle(tDoc,info,warnings){
 const p=locateP(tDoc,2);if(!p)return;
 const texts=get(p,'t');if(texts.length<3)return;
 // NUANSA has a fixed-size Word drawing and AlternateContent fallback with TWO title copies.
 // Fill both representations, otherwise Word 2010 and modern renderers may show different text.
 texts[0].textContent=info.title;texts[0].setAttributeNS(NS.xml,'xml:space','preserve');
 texts[2].textContent=info.title;texts[2].setAttributeNS(NS.xml,'xml:space','preserve');
 for(let i=0;i<texts.length;i++)if(i!==0&&i!==2)texts[i].textContent='';
 if(info.title.length>72){
  const pt=info.title.length>180?10:info.title.length>130?11:12;
  for(const size of get(p,'sz'))attr(size,'val',pt*2);
  for(const size of get(p,'szCs'))attr(size,'val',pt*2);
  warnings.push('NUANSA: judul panjang disesuaikan menjadi '+pt+' pt agar tidak terpotong di dalam kotak asli. Sesuaikan judul dengan batas maksimal jurnal.');
 }
}
function findPrototype(doc,rule){
 const a=bodyEls(doc);const hi=Number(rule.cut);
 const heading=a[hi];let body=null;
 for(let i=hi+1;i<a.length;i++){if(a[i].localName!=='p')continue;if(textOf(a[i]).length>60){body=a[i];break}}
 return {heading,body};
}
function isHeading(s){return /^(?:(?:[A-H]|\d{1,2})[.)]\s*)?(?:PENDAHULUAN|INTRODUCTION|METODE(?:\s+PENELITIAN)?|METHODS?|RESULTS?(?:\s+AND\s+DISCUSSION)?|HASIL(?:\s+PENELITIAN)?(?:\s+DAN\s+PEMBAHASAN)?|PEMBAHASAN|DISCUSSION|KESIMPULAN(?:\s+DAN\s+SARAN)?|CONCLUSION(?:S)?|DAFTAR\s+PUSTAKA|REFERENCES|LITERATURE\s+REVIEW|TINJAUAN\s+PUSTAKA|SARAN|PENUTUP|ACKNOWLEDGEMENTS?)(?:\b|\s*\W)/i.test(s.trim()) &&s.length<100;}
function setFont(r,rule,heading=false){
 const doc=r.ownerDocument,rpr=first(r,'rPr')||make(doc,'rPr');if(!rpr.parentNode)r.insertBefore(rpr,r.firstChild);
 let rf=first(rpr,'rFonts');if(!rf){rf=make(doc,'rFonts');rpr.insertBefore(rf,rpr.firstChild)}
 for(const k of ['ascii','hAnsi','cs','eastAsia'])attr(rf,k,rule.bodyFont);
 let sz=first(rpr,'sz');if(!sz){sz=make(doc,'sz');rpr.appendChild(sz)}attr(sz,'val',Math.round((heading?(rule.headingSize||rule.bodySize):rule.bodySize)*2));
 let szcs=first(rpr,'szCs');if(!szcs){szcs=make(doc,'szCs');rpr.appendChild(szcs)}attr(szcs,'val',Math.round((heading?(rule.headingSize||rule.bodySize):rule.bodySize)*2));
 if(heading&&!first(rpr,'b'))rpr.appendChild(make(doc,'b'));
}
function applyParaFormatting(p,kind,rule,proto){
 const doc=p.ownerDocument,old=first(p,'pPr');
 if(old)for(const v of children(old,'sectPr'))old.removeChild(v);
 // Clone journal's actual paragraph alignment, borders and spacing, without its section break.
 if(proto){const src=first(proto,'pPr');if(src){const repl=doc.importNode(src,true);for(const v of children(repl,'sectPr'))repl.removeChild(v);if(old)p.replaceChild(repl,old);else p.insertBefore(repl,p.firstChild);}}
 const ppr=first(p,'pPr')||make(doc,'pPr');if(!ppr.parentNode)p.insertBefore(ppr,p.firstChild);
 for(const ps of children(ppr,'pStyle'))ppr.removeChild(ps); // source style ID may not exist in journal.
 // Imported paragraphs often carry the source alignment; the journal body must
 // override it. Figures are centered separately in normalizeArticleNode().
 let jc=first(ppr,'jc');if(!jc){jc=make(doc,'jc');ppr.appendChild(jc)}
 attr(jc,'val',kind==='heading'?'left':'both');
 const sp=first(ppr,'spacing')||make(doc,'spacing');if(!sp.parentNode)ppr.appendChild(sp);
 if(rule.exactLinePt){attr(sp,'line',Math.round(rule.exactLinePt*20));attr(sp,'lineRule','exact');}
 else if(rule.line){attr(sp,'line',Math.round(rule.line*240));attr(sp,'lineRule','auto');}
 if(kind==='heading'){
  const k=first(ppr,'keepNext')||make(doc,'keepNext');if(!k.parentNode)ppr.appendChild(k);
 }else if(kind==='body' && rule.indentTwips){
  const ind=first(ppr,'ind')||make(doc,'ind');if(!ind.parentNode)ppr.appendChild(ind);
  if(!ind.hasAttributeNS(NS.w,'firstLine')&&!ind.hasAttributeNS(NS.w,'hanging'))attr(ind,'firstLine',rule.indentTwips);
 }
 for(const r of get(p,'r'))if(get(r,'t').length)setFont(r,rule,kind==='heading');
}
function availablePageWidth(doc){
 const sec=get(doc,'sectPr').find(x=>first(x,'pgSz')&&first(x,'pgMar'));
 const sz=sec&&first(sec,'pgSz'),mg=sec&&first(sec,'pgMar');
 const width=Number(aval(sz,'w'))||11906,left=Number(aval(mg,'left'))||1701,right=Number(aval(mg,'right'))||1701;
 return Math.max(3500,width-left-right-200);
}
function fitSourceDrawing(p,rule){
 const wp='http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
 const a='http://schemas.openxmlformats.org/drawingml/2006/main';
 const maxWidth=(rule.pageWidthTwips||6500)*635-165000;
 for(const d of get(p,'drawing')){
  for(const x of get(d,'extent',wp)){
   const width=Number(x.getAttribute('cx'))||0,height=Number(x.getAttribute('cy'))||0;
   if(width<=maxWidth||width===0)continue;
   const scale=maxWidth/width,newW=Math.floor(width*scale),newH=Math.floor(height*scale);
   x.setAttribute('cx',String(newW));x.setAttribute('cy',String(newH));
   // Image's picture transform uses the same EMU size and must be scaled too.
   for(const ext of get(d,'ext',a)){
    if(!ext.hasAttribute('cx'))continue;
    const ew=Number(ext.getAttribute('cx')),eh=Number(ext.getAttribute('cy'));
    if(Math.abs(ew-width)<1000){ext.setAttribute('cx',String(newW));ext.setAttribute('cy',String(newH));}
    else if(ew>maxWidth){ext.setAttribute('cx',String(Math.floor(ew*scale)));ext.setAttribute('cy',String(Math.floor(eh*scale)));}
   }
  }
 }
}
function fitSourceTable(tbl,rule){
 const max=rule.pageWidthTwips||6500;
 const grid=first(tbl,'tblGrid'),cols=grid?children(grid,'gridCol'):[];
 const total=cols.reduce((a,x)=>a+(Number(aval(x,'w'))||0),0);
 if(!total||total<=max)return;
 const factor=max/total;
 for(const col of cols)attr(col,'w',Math.floor((Number(aval(col,'w'))||0)*factor));
 for(const x of get(tbl,'tcW'))if(aval(x,'type')==='dxa')attr(x,'w',Math.floor((Number(aval(x,'w'))||0)*factor));
 const props=first(tbl,'tblPr');if(props){
  const width=first(props,'tblW');if(width&&aval(width,'type')==='dxa')attr(width,'w',Math.min(max,Math.floor((Number(aval(width,'w'))||max)*factor)));
 }
}
function normalizeArticleNode(node,rule,prototypes){
 if(node.localName==='p'){
  const txt=textOf(node),heading=isHeading(txt),hasDrawing=get(node,'drawing').length>0;
  if(heading){ // change existing text but preserve footnote markers (headings rarely have notes).
   replaceText(node,cleanHeading(txt,rule));
  }
   applyParaFormatting(node,heading?'heading':'body',rule,heading?prototypes.heading:prototypes.body);
  if(hasDrawing){
   const pp=first(node,'pPr');
   if(pp){for(const ind of children(pp,'ind'))pp.removeChild(ind);
    let jc=first(pp,'jc');if(!jc){jc=make(node.ownerDocument,'jc');pp.appendChild(jc)}attr(jc,'val','center');}
   fitSourceDrawing(node,rule);
  }
 }else if(node.localName==='tbl'){
  fitSourceTable(node,rule);
  // Source figure/table structure is preserved; normalize fonts but never flatten table.
  for(const p of get(node,'p')){
   for(const r of get(p,'r'))if(get(r,'t').length)setFont(r,rule,false);
  }
 }
 // Avoid source section breaks that would override imported journal's running headers.
 for(const p of get(node,'p'))for(const pp of children(p,'pPr'))for(const s of children(pp,'sectPr'))pp.removeChild(s);
 return node;
}
function appendMain(tDoc,rule,srcContent,prototypes,warnings){
 const body=getBody(tDoc),els=bodyEls(tDoc),cut=Number(rule.cut);
 if(!els[cut]||els[cut].localName==='sectPr')throw Error('Penanda badan utama jurnal tidak valid: '+rule.id);
 const originalSec=els.findLast(n=>n.localName==='sectPr')||null;
 for(let i=els.length-1;i>=cut;i--){if(els[i]!==originalSec)body.removeChild(els[i]);}
 let count=0;
 for(const sourceEl of srcContent){if(sourceEl.localName==='sectPr')continue;
  const node=tDoc.importNode(sourceEl,true);
  normalizeArticleNode(node,rule,prototypes);
  if(originalSec)body.insertBefore(node,originalSec);else body.appendChild(node);
  count++;
 }
 if(!originalSec){warnings.push('Dokumen jurnal tidak memiliki sectPr akhir; header/footer dapat berbeda.');}
 return count;
}
function normal(p){const b=[];for(const x of p.split('/')){if(!x||x==='.')continue;if(x==='..')b.pop();else b.push(x);}return b.join('/');}
function dir(p){return p.slice(0,p.lastIndexOf('/')+1);}
function bas(p){return p.split('/').pop();}
function relpath(from,to){const a=from.split('/').filter(Boolean),b=to.split('/').filter(Boolean);while(a.length&&b.length&&a[0]===b[0]){a.shift();b.shift()}return '../'.repeat(a.length)+b.join('/');}
function relXml(x){return x?parse(x):parse('<Relationships xmlns="'+NS.rel+'"/>');}
function relNodes(doc){return get(doc,'Relationship',NS.rel);}
function xmlRelFile(part){return dir(part)+'_rels/'+bas(part)+'.rels';}
function ctOverride(ct,part,type){if(get(ct,'Override',NS.ct).some(n=>n.getAttribute('PartName')==='/'+part))return;
 const node=ct.createElementNS(NS.ct,'Override');node.setAttribute('PartName','/'+part);node.setAttribute('ContentType',type);ct.documentElement.appendChild(node);}
function ctDefault(ct,ext,type){if(get(ct,'Default',NS.ct).some(n=>n.getAttribute('Extension')===ext))return;
 const node=ct.createElementNS(NS.ct,'Default');node.setAttribute('Extension',ext);node.setAttribute('ContentType',type);ct.documentElement.appendChild(node);}
function rIdDoc(existing){let n=500;const used=new Set(relNodes(existing).map(x=>x.getAttribute('Id')));while(used.has('rIdZN'+n))n++;return 'rIdZN'+n;}
async function importSourceParts(srcZip,tplZip,tDoc,srcDoc,notes,warnings){
 const srcCt=parse(await srcZip.file(CTYPES).async('string'));
 const tplCt=parse(await tplZip.file(CTYPES).async('string'));
 const templateRels=relXml(await tplZip.file(DOCRELPATH).async('string'));
 const sourceRels=relXml(await srcZip.file(DOCRELPATH)?.async('string'));
 const originals=new Map(),idMap=new Map();let assetCount=0;
 const ignoredDocTypes=new Set(['styles','settings','fontTable','theme','webSettings','numbering','footnotes','endnotes','comments','header','footer','glossaryDocument']);
 async function copyPart(oldPath,newPath){
  oldPath=normal(oldPath);if(originals.has(oldPath))return originals.get(oldPath);
  const file=srcZip.file(oldPath);if(!file)return null;
  newPath=newPath||('word/zain_src/'+(oldPath.startsWith('word/')?oldPath.slice(5):oldPath.replace(/\//g,'_')));
  originals.set(oldPath,newPath);tplZip.file(newPath,await file.async('uint8array'));assetCount++;
  const ov=get(srcCt,'Override',NS.ct).find(n=>n.getAttribute('PartName')==='/'+oldPath);
  const extension=(bas(newPath).split('.').pop()||'bin').toLowerCase();
  if(ov)ctOverride(tplCt,newPath,ov.getAttribute('ContentType'));
  else{
   const df=get(srcCt,'Default',NS.ct).find(n=>n.getAttribute('Extension')===extension);
   ctDefault(tplCt,extension,df?.getAttribute('ContentType')||formatMime[extension]||'application/octet-stream');
  }
  const from=xmlRelFile(oldPath);if(srcZip.file(from)){
   const rels=parse(await srcZip.file(from).async('string'));
   for(const rel of relNodes(rels)){
    if(rel.getAttribute('TargetMode')==='External')continue;
    const oldTarget=rel.getAttribute('Target')||'';
    if(!oldTarget||oldTarget[0]==='#')continue;
    const sourceDest=normal(dir(oldPath)+oldTarget);
    const copied=await copyPart(sourceDest);
    if(copied)rel.setAttribute('Target',relpath(dir(newPath),copied));
   }
   tplZip.file(xmlRelFile(newPath),serialize(rels));
  }
  return newPath;
 }
 const referencedIds=new Set();
 for(const n of [tDoc.documentElement])for(const z of Array.from(n.getElementsByTagName('*'))){
  if(z.hasAttributeNS(NS.r,'id'))referencedIds.add(z.getAttributeNS(NS.r,'id'));
  if(z.hasAttributeNS(NS.r,'embed'))referencedIds.add(z.getAttributeNS(NS.r,'embed'));
  if(z.hasAttributeNS(NS.r,'link'))referencedIds.add(z.getAttributeNS(NS.r,'link'));
 }
 // Ignore template document's preexisting IDs: source nodes carry IDs, but they may overlap!
 // Caller marks imported nodes with data-scope via an explicit list of appended node references.
 async function mappingFor(ids){
  for(const srcRel of relNodes(sourceRels)){
   const old=srcRel.getAttribute('Id');if(!ids.has(old))continue;
   const typ=(srcRel.getAttribute('Type')||'').split('/').pop();if(ignoredDocTypes.has(typ))continue;
   const clone=templateRels.createElementNS(NS.rel,'Relationship');
   const newid=rIdDoc(templateRels);clone.setAttribute('Id',newid);clone.setAttribute('Type',srcRel.getAttribute('Type'));
   if(srcRel.getAttribute('TargetMode')==='External'){
    clone.setAttribute('TargetMode','External');clone.setAttribute('Target',srcRel.getAttribute('Target'));
   }else{
    const oldPart=normal('word/'+srcRel.getAttribute('Target'));
    const dest=await copyPart(oldPart);
    if(!dest){warnings.push('Aset yang dirujuk tidak ada: '+oldPart);continue;}
    clone.setAttribute('Target',relpath('word/',dest));
   }
   templateRels.documentElement.appendChild(clone);idMap.set(old,newid);
  }
 }
 await mappingFor(notes.sourceRelationshipIds);
 for(const node of notes.inserted){for(const z of Array.from(node.getElementsByTagName('*'))){
  for(const attName of ['id','embed','link']){if(z.hasAttributeNS(NS.r,attName)){
   const old=z.getAttributeNS(NS.r,attName);if(idMap.has(old))z.setAttributeNS(NS.r,'r:'+attName,idMap.get(old));
  }}
 }}
 // Source notes are imported into the STANDARD Word note parts so the native Word footnotes survive.
 for(const kind of ['footnotes','endnotes']){
  const part='word/'+kind+'.xml';if(!srcZip.file(part))continue;
  const original=await srcZip.file(part).async('string');
  // Templates are cut before their sample body; source notes become authoritative.
  tplZip.file(part,original);
  const srcO=get(srcCt,'Override',NS.ct).find(n=>n.getAttribute('PartName')==='/'+part);
  ctOverride(tplCt,part,srcO?.getAttribute('ContentType')||'application/vnd.openxmlformats-officedocument.wordprocessingml.'+kind+'+xml');
  let tRel=relNodes(templateRels).find(x=>(x.getAttribute('Type')||'').endsWith('/'+kind));
  if(!tRel){tRel=templateRels.createElementNS(NS.rel,'Relationship');tRel.setAttribute('Id',rIdDoc(templateRels));tRel.setAttribute('Type','http://schemas.openxmlformats.org/officeDocument/2006/relationships/'+kind);tRel.setAttribute('Target',kind+'.xml');templateRels.documentElement.appendChild(tRel)}
  const noteRels=xmlRelFile(part);
  if(srcZip.file(noteRels)){
   const rels=parse(await srcZip.file(noteRels).async('string'));
   for(const rel of relNodes(rels)){
    if(rel.getAttribute('TargetMode')==='External')continue;
    const oldPart=normal('word/'+(rel.getAttribute('Target')||''));
    const dest=await copyPart(oldPart);
    if(dest)rel.setAttribute('Target',relpath('word/',dest));
   }
   tplZip.file(noteRels,serialize(rels));
  }else tplZip.remove(noteRels);
 }
 tplZip.file(DOCRELPATH,serialize(templateRels));tplZip.file(CTYPES,serialize(tplCt));
 return {assets:assetCount,relationships:idMap.size};
}
function sourceRefIds(nodes){const ids=new Set();for(const n of nodes){for(const z of [n,...Array.from(n.getElementsByTagName('*'))])for(const a of ['id','embed','link'])if(z.hasAttributeNS?.(NS.r,a))ids.add(z.getAttributeNS(NS.r,a));}return ids;}
function editHeaderParagraph(p,value){
 // Replace only textual running-header content; keep PAGE fields / cached digits.
 const nodes=get(p,'t');const candidates=nodes.filter(x=>{
  const r=x.parentNode;
  return /[A-Za-zÀ-ÿ]/.test(x.textContent||'') && !(r&&get(r,'instrText').length);
 });
 if(!candidates.length)return false;
 // In a mixed header such as "2   Author Surnames" choose the longest
 // human-readable string and leave the PAGE field intact.
 candidates.sort((a,b)=>(b.textContent||'').length-(a.textContent||'').length);
 const target=candidates[0];target.textContent=value;target.setAttributeNS(NS.xml,'xml:space','preserve');
 for(const t of candidates.slice(1))t.textContent='';
 return true;
}
function headerTextMatchesRule(s,key,rule){
 if(!s||s.length>260)return false;
 const blacklist=/^(?:DOI|ISSN|Vol\.|Journal Homepage|E-ISSN|P-ISSN)/i;
 if(blacklist.test(s))return false;
 if(key==='author'||key==='authorShort')return /author|penulis|nama lengkap|indah susilowati|dewi astin|rahmat dandi|name|hazim|sulistowati|sulisowati|mohammad/i.test(s);
 if(key==='shortTitle')return /title|judul|historical and religious|article tittle|article title|persepsi|artikel/i.test(s);
 return true;
}
async function editJournalHeader(tplZip,templateDoc,info,rule,warnings){
 const rules=rule.header||{},sections=get(templateDoc,'sectPr'),relsFile=tplZip.file(DOCRELPATH);
 if(!sections.length||!Object.keys(rules).length||!relsFile)return 0;
 const rels=parse(await relsFile.async('string'));let count=0;const done=new Set();
 const valueFor=(key)=>key==='shortTitle'?shortTitle(info.title,rule.headerMaxChars||52):
   key==='author'?displayAuthor(info.author):
   key==='authorShort'?(displayAuthor(info.author)+(info.title?' — '+shortTitle(info.title,30):'')):
   info[key]||'';
 for(const sec of sections)for(const header of children(sec,'headerReference')){
  const type=aval(header,'type')||'default',key=rules[type];if(!key)continue;
  const rid=aval(header,'id',NS.r),rel=relNodes(rels).find(x=>x.getAttribute('Id')===rid);if(!rel)continue;
  const part=normal('word/'+rel.getAttribute('Target'));if(!tplZip.file(part)||done.has(part))continue;
  done.add(part);
  const h=parse(await tplZip.file(part).async('string'));
  const eligible=get(h,'p').filter(p=>headerTextMatchesRule(textOf(p),key,rule));
  // Do not touch the journal's masthead merely because it contains 'Title'.
  const p=eligible.find(p=>textOf(p).length>5&& !/\b(?:Journal Homepage|ISSN|DOI)\b/i.test(textOf(p)));
  if(!p){warnings.push('Header '+rule.id+'/'+type+' tidak dapat dipetakan aman; periksa manual.');continue;}
  const content=valueFor(key);
  if(content&&editHeaderParagraph(p,content)){tplZip.file(part,serialize(h));count++;}
 }
 return count;
}
function rabbaniFlowLongAbstract(tDoc,info,meta,rule,warnings){
 if(rule.id!=='rabbani'||rule.compatMaster==='word2010')return false;
 const indonesiaOnly=rule.abstractLanguage==='id-only';
 const words=(indonesiaOnly?0:sliceCount(info.abstractEn))+sliceCount(info.abstractId);
 const keywordChars=(indonesiaOnly?info.keywordsId:(info.keywordsEn||info.keywordsId)||'').length;
 // RABBANI custom Indonesia-only always uses a flowing Word table, so the
 // fixed-size bilingual example box cannot clip the single Indonesian abstract.
 if(!indonesiaOnly && words<=215 && keywordChars<=43)return false;
 const d=tDoc,body=getBody(d),els=bodyEls(d),original=els[9];
 if(!original||original.localName!=='p')return false;
 // The PDF-like anchored boxes in the official DOCX are fixed height and
 // silently clip longer student abstracts. A native Word table can flow.
 const width=availablePageWidth(d),left=Math.round(width*.62),right=width-left;
 const create=(node,name,attributes={})=>{const z=make(d,name);for(const [k,v] of Object.entries(attributes))attr(z,k,v);node.appendChild(z);return z;};
 const tbl=make(d,'tbl');const props=create(tbl,'tblPr');
 create(props,'tblW',{w:width,type:'dxa'});
 const lay=create(props,'tblLayout',{type:'fixed'});
 const borders=create(props,'tblBorders');
 for(const side of ['top','left','bottom','right','insideH','insideV'])create(borders,side,{val:'single',sz:5,color:'00A6D6'});
 const grid=create(tbl,'tblGrid');create(grid,'gridCol',{w:left});create(grid,'gridCol',{w:right});
 const row=create(tbl,'tr');
 function cell(w,shading){
  const tc=create(row,'tc'),pr=create(tc,'tcPr');create(pr,'tcW',{w,type:'dxa'});
  if(shading)create(pr,'shd',{fill:shading,val:'clear'});
  const margins=create(pr,'tcMar');for(const x of ['top','left','bottom','right'])create(margins,x,{w:x==='left'||x==='right'?115:70,type:'dxa'});
  return tc;
 }
 function para(c,value,bold,size=11){
  const p=make(d,'p'),pp=create(p,'pPr');create(pp,'jc',{val:(bold||c===c2)?'left':'both'});
  const sp=create(pp,'spacing',{before:bold?140:0,after:bold?80:140,line:240,lineRule:'auto'});
  const r=create(p,'r'),rp=create(r,'rPr');create(rp,'rFonts',{ascii:'Book Antiqua',hAnsi:'Book Antiqua',cs:'Book Antiqua'});
  create(rp,'sz',{val:size*2});if(bold)create(rp,'b');
  const t=create(r,'t');t.setAttributeNS(NS.xml,'xml:space','preserve');t.textContent=value||'—';
  c.appendChild(p);return p;
 }
 const c1=cell(left,'D5F5FA'),c2=cell(right,null);
 if(!indonesiaOnly){para(c1,'ABSTRACT',true);para(c1,info.abstractEn||'—',false);}
 para(c1,'ABSTRAK',true);para(c1,info.abstractId||'—',false,indonesiaOnly?10.5:11);
 para(c2,'ARTICLE HISTORY',true);
 para(c2,'Received: '+(meta?.received||'—'),false,10);
 para(c2,'Revised: '+(meta?.revised||'—'),false,10);
 para(c2,'Accepted: '+(meta?.accepted||'—'),false,10);
 para(c2,'KEYWORDS',true);
 para(c2,(indonesiaOnly?info.keywordsId:(info.keywordsEn||info.keywordsId))||'—',false,10);
 body.insertBefore(tbl,original);
 // Remove original anchored shapes and their spacer paragraphs, not the real article.
 for(let i=9;i<33;i++)if(els[i]?.parentNode===body)body.removeChild(els[i]);
 warnings.push(indonesiaOnly?'RABBANI KHUSUS: hanya ABSTRAK Bahasa Indonesia; abstrak Inggris sengaja tidak dimasukkan. Tabel dua kolom dapat mengalir jika isi panjang.':'RABBANI: kotak teks Word asli tidak cukup fleksibel untuk abstrak '+words+' kata / kata kunci '+keywordChars+' karakter. Sistem memakai tabel Word dua kolom yang dapat mengalir ke halaman berikutnya agar teks tidak terpotong. Periksa hasil visual.');
 return true;
}
// RABBANI v8 uses a Word 2010-tested, LibreOffice-normalized master.
// The master is CLEAN (no prior student's paragraphs or footnotes).
// Unlike the v7 floating shape, the first-page abstract is a native Word table.
function fillRabbaniWord2010Table(tDoc,info,meta,rule,warnings){
 if(rule.id!=='rabbani'||rule.compatMaster!=='word2010')return 0;
 const entries=[
  [0,0,0,'ABSTRAK'],[0,0,1,info.abstractId||'—'],
  [0,1,0,'ARTICLE HISTORY'],[0,1,1,'Received: '+(meta.received||'—')],
  [0,1,2,'Revised: '+(meta.revised||'—')],
  [0,1,3,'Accepted: '+(meta.accepted||'—')],
  [0,1,4,'KEYWORDS'],[0,1,5,info.keywordsId||'—']
 ];
 let filled=0;
 for(const [ri,ci,pi,value] of entries){
  const target=locateCellP(tDoc,9,ri,ci,pi);
  if(!target)throw Error('RABBANI Word2010: tabel abstrak master tidak sesuai struktur v8');
  replaceText(target,value);filled++;
 }
 warnings.push('RABBANI: master DOCX kompatibilitas dibuat dari hasil Word yang telah berhasil dibuka di komputer pengguna. Perubahan baru tetap perlu diuji di Word 2010.');
 return filled;
}

function safeEditorDates(tplZip,tDoc,rule,meta){
 // Scrub the author-guideline demonstration dates (NEVER copy them to a new student article).
 function cleanDate(p){
  const s=textOf(p).replace(/\s+/g,' ').trim();
  if(!s||s.length>220)return false;
  if(!/(?:Received|Accepted|Revised|Published|Submitted|Terkirim|Diterima|Available online)\b/i.test(s))return false;
  if(!/(?:\b(?:19|20)\d{2}\b|\bDD MM YYYY\b|\bmm dd, yyyy\b|\byyyy-mm-dd\b|[.…._]{3,})/i.test(s))return false;
  // Do not alter a descriptive paragraph, table metadata description or the journal name.
  if(!/^(?:Article History|Article history|Received|Accepted|Published|Revised|Submitted|Terkirim|Diterima|Available online)/i.test(s))return false;
  const keys=[['Received','received'],['Submitted','received'],['Revised','revised'],['Accepted','accepted'],['Published','published'],['Terkirim','received'],['Diterima','accepted'],['Available Online','published']];
  let fixed=s;
  for(const [label,k] of keys){
   const pat=new RegExp('\\b'+label.replace(' ','\\s+')+'\\s*:?\\s*(?:\\d{1,2}\\s+[A-Za-z]+\\s+\\d{4}|\\d{1,2}\\s+[A-Za-z]+\\s*,?\\s*\\d{4}|\\d{4}-\\d{2}-\\d{2}|DD MM YYYY|mm dd, yyyy|yyyy-mm-dd|[.…._-]{3,})','gi');
   fixed=fixed.replace(pat,label+': '+(meta?.[k]||'—'));
  }
  if(fixed!==s){replaceText(p,fixed);return true;}
  return false;
 }
 for(const p of get(getBody(tDoc),'p'))cleanDate(p);
 return cleanDate;
}
// RABBANI v8: rebuild a clean first-page footer instead of retaining
// nested legacy floating textboxes (which are duplicated in Word/LibreOffice).
async function writeRabbaniCompatibleFooter(tplZip,info,meta,rule){
 if(rule.id!=='rabbani'||rule.compatMaster!=='word2010')return 0;
 const d=parse('<w:ftr xmlns:w="'+NS.w+'"/>'),root=d.documentElement;
 function paragraph(value,font=8){
  const p=make(d,'p'),pr=make(d,'pPr'),jc=make(d,'jc');attr(jc,'val','right');pr.appendChild(jc);
  const spacing=make(d,'spacing');attr(spacing,'before',0);attr(spacing,'after',0);pr.appendChild(spacing);p.appendChild(pr);
  const r=make(d,'r'),rp=make(d,'rPr'),rf=make(d,'rFonts');
  attr(rf,'ascii','Book Antiqua');attr(rf,'hAnsi','Book Antiqua');rp.appendChild(rf);
  const sz=make(d,'sz');attr(sz,'val',font*2);rp.appendChild(sz);r.appendChild(rp);
  const t=make(d,'t');t.setAttributeNS(NS.xml,'xml:space','preserve');t.textContent=value;r.appendChild(t);
  p.appendChild(r);root.appendChild(p);return p;
 }
 const firstP=paragraph('© (—) '+(displayAuthor(info.author)||'Penulis')+'  |  ');
 // A standard complex PAGE field is interoperable with Word 2010 and LO.
 // Avoid fldSimple: LO reserializes those as begin/instruction/separate/end.
 function fieldRun(kind,content){
  const r=make(d,'r'),el=make(d,kind);
  if(kind==='fldChar')attr(el,'fldCharType',content);
  else {el.setAttributeNS(NS.xml,'xml:space','preserve');el.textContent=content;}
  r.appendChild(el);firstP.appendChild(r);
 }
 fieldRun('fldChar','begin');fieldRun('instrText',' PAGE ');fieldRun('fldChar','separate');
 const run=make(d,'r'),tx=make(d,'t');tx.textContent='1';run.appendChild(tx);firstP.appendChild(run);
 fieldRun('fldChar','end');
 paragraph('Received: '+(meta.received||'—')+' | Revised: '+(meta.revised||'—')+' | Accepted: '+(meta.accepted||'—'));
 // Keep page range blank: assigned by publisher, not the student.
 paragraph('Pages: —');
 tplZip.file('word/footer3.xml',serialize(d));
 return 1;
}

async function scrubRabbaniHeaderFooter(tplZip,info,meta){
 if(!info)return 0;
 const author=displayAuthor(info.author)||'—';
 const vol=meta?.volume||'—',issue=meta?.issue||'—',issueDate=meta?.publicationDate||'—';
 const doi=meta?.doi||'—';
 const history='Received: '+(meta?.received||'—')+' | Revised: '+(meta?.revised||'—')+' | Accepted: '+(meta?.accepted||'—');
 let changed=0;
 for(const path of Object.keys(tplZip.files).filter(k=>/^word\/(?:header|footer)[^/]*\.xml$/.test(k))){
  const d=parse(await tplZip.file(path).async('string'));let dirty=false;
  for(const t of get(d,'t')){
   const orig=t.textContent||'';let s=orig;
   if(/^DOI:\s*https?:\/\/doi\.org\/10\.19105\/rjpai\.v1i1\.3002/i.test(s))s='DOI: '+doi;
   if(/^Volume 1, Nomor 1, Maret 2020/i.test(s))s='Volume '+vol+', Nomor '+issue+', '+issueDate;
   if(/^Vol\. 1, No\. 1, Maret 2020/i.test(s))s='Vol. '+vol+', No. '+issue+', '+issueDate;
   if(/^© \(2020\) Rahmat Dandi/i.test(s))s='© (—) '+author;
   if(/^Received: 11 Januari 2020.*Accepted: 15 Maret 2020/i.test(s))s=history;
   if(/^Pages: 1-20/i.test(s))s='Pages: —';
   if(s!==orig){t.textContent=s;dirty=true;}
  }
  if(dirty){tplZip.file(path,serialize(d));changed++;}
 }
 return changed;
}
async function safeguardHeaderFooter(tplZip,rule,meta){
 let changed=0;
 const dateReplacement='Received: '+(meta.received||'—')+', Accepted: '+(meta.accepted||'—')+', Published: '+(meta.published||'—');
 for(const path of Object.keys(tplZip.files).filter(k=>/^word\/(?:header|footer)[^/]*\.xml$/.test(k))){
  const d=parse(await tplZip.file(path).async('string'));let edited=false;
  // Some Word 2010 templates split a single date across many runs, including
  // a legacy WordArt fallback. Replace ALL representations, not just one w:t.
  for(const paragraph of get(d,'p')){
   const s=textOf(paragraph);
   if(rule.id==='karsa' && s.includes('Received:')&&s.includes('Accepted')&&s.includes('Published')){
    // Top paragraph can wrap the inner textboxes: leave nested p elements alone
    // and patch the innermost actual text-bearing p only.
    if(get(paragraph,'p').length)continue;
    const ts=get(paragraph,'t');if(!ts.length)continue;
    ts[0].textContent=dateReplacement;ts[0].setAttributeNS(NS.xml,'xml:space','preserve');
    for(const t of ts.slice(1))t.textContent='';edited=true;
   }
   if(rule.id==='sociale' && /Vol\.\s*99.*Month\s*2099/i.test(s)){
    // Keep "SOCIALE" and the paragraph style but clear sample volume/year.
    const ts=get(paragraph,'t');if(!ts.length)continue;
    ts[0].textContent='SOCIALE, Vol. —, No. —, Tahun —';
    for(const t of ts.slice(1))t.textContent='';edited=true;
   }
  }
  for(const t of get(d,'t')){
   const s=t.textContent||'';
   if(rule.id==='sociale'&&/2099|paperID/.test(s)){
    t.textContent=s.replace(/Vol\.\s*99,\s*No\.\s*1,\s*Month\s*2099,\s*pp\.\s*1~1x/gi,'Vol. —, No. —, Tahun —, pp. —').replace(/Vol\.\s*99,\s*No\.\s*1,\s*Month\s*2099/gi,'Vol. —, No. —, Tahun —').replace(/10\.19105\/sociale\.v2i1\.paperID/gi,'—');edited=true;
   }
  }
  if(edited){tplZip.file(path,serialize(d));changed++;}
 }
 return changed;
}

// Word 2010 note consistency: the imported article may use note separator IDs
// (-1,0), while the selected journal template explicitly declares (0,1).
// These must agree or a strict Word implementation may treat the first actual
// footnote as a separator. LibreOffice's successful re-export also renumbers them.
async function normalizeNotesAndOrphans(tplZip,tDoc,rule,warnings){
 let changes={noteIds:0,removedUnusedEndnotes:0,removedOrphans:0,removedEmptyRels:0};
 const settingsPath='word/settings.xml',notesPath='word/footnotes.xml';
 const settingsFile=tplZip.file(settingsPath),notesFile=tplZip.file(notesPath);
 if(settingsFile&&notesFile){
  const settings=parse(await settingsFile.async('string'));
  const notes=parse(await notesFile.async('string'));
  const fp=get(settings,'footnotePr')[0];
  const specs=fp?children(fp,'footnote'):[];
  const declared=specs.map(x=>Number(aval(x,'id'))).filter(Number.isFinite);
  const targets=declared.length>=2?declared.slice(0,2):[-1,0];
  const allNotes=children(notes.documentElement,'footnote');
  const sep=allNotes.find(x=>aval(x,'type')==='separator');
  const cont=allNotes.find(x=>aval(x,'type')==='continuationSeparator');
  if(sep&&cont){
   const map=new Map(),oldSep=aval(sep,'id'),oldCont=aval(cont,'id');
   map.set(String(oldSep),String(targets[0]));map.set(String(oldCont),String(targets[1]));
   let next=Math.max(1,...targets.map(x=>x+1));
   for(const note of allNotes){
    if(note===sep||note===cont)continue;
    const old=aval(note,'id');while(targets.includes(next))next++;
    map.set(String(old),String(next++));
   }
   // Rewriting in two phases avoids collisions, e.g. 0 -> 1 and 1 -> 2.
   for(const note of allNotes){const prev=aval(note,'id');if(map.has(String(prev))){
    const replacement=map.get(String(prev));if(String(prev)!==replacement)changes.noteIds++;
    attr(note,'id',replacement);
   }}
   for(const ref of get(tDoc,'footnoteReference')){
    const old=aval(ref,'id');if(map.has(String(old)))attr(ref,'id',map.get(String(old)));
   }
   if(declared.length>=2){
    attr(specs[0],'id',String(targets[0]));attr(specs[1],'id',String(targets[1]));
   }
   tplZip.file(notesPath,serialize(notes));
   tplZip.file(settingsPath,serialize(settings));
  }
 }
 // Never carry unrelated endnotes when the student article has none.
 if(tplZip.file('word/endnotes.xml')&&get(tDoc,'endnoteReference').length===0){
  tplZip.remove('word/endnotes.xml');tplZip.remove('word/_rels/endnotes.xml.rels');
  const rp='word/_rels/document.xml.rels',rels=parse(await tplZip.file(rp).async('string'));
  for(const rel of relNodes(rels))if((rel.getAttribute('Type')||'').endsWith('/endnotes'))rels.documentElement.removeChild(rel);
  tplZip.file(rp,serialize(rels));
  const ct=parse(await tplZip.file(CTYPES).async('string'));
  for(const ov of get(ct,'Override',NS.ct))if(ov.getAttribute('PartName')==='/word/endnotes.xml')ov.parentNode.removeChild(ov);
  tplZip.file(CTYPES,serialize(ct));changes.removedUnusedEndnotes++;
 }
 // Empty note .rels files have no functional value and are dropped by LO.
 for(const relPath of ['word/_rels/footnotes.xml.rels','word/_rels/endnotes.xml.rels']){
  if(!tplZip.file(relPath))continue;
  const d=parse(await tplZip.file(relPath).async('string'));
  if(relNodes(d).length===0){tplZip.remove(relPath);changes.removedEmptyRels++;}
 }
 // Remove orphan XLSX embeddings, if no relationship in the package points to them.
 const referenced=new Set();
 for(const relFile of Object.keys(tplZip.files).filter(x=>x.endsWith('.rels')&&!tplZip.files[x].dir)){
  const d=parse(await tplZip.file(relFile).async('string'));
  const source=relFile==='_rels/.rels'?'':relFile.replace(/_rels\/([^/]+)\.rels$/,'$1');
  const home=relFile==='_rels/.rels'?'':dir(source);
  for(const rel of relNodes(d)){
   if(rel.getAttribute('TargetMode')==='External')continue;
   const target=rel.getAttribute('Target')||'';
   referenced.add(target[0]==='/'?normal(target):normal(home+target));
  }
 }
 for(const part of Object.keys(tplZip.files).filter(x=>/^word\/embeddings\/[^/]+\.xlsx$/i.test(x))){
  if(!referenced.has(part)){
   tplZip.remove(part);changes.removedOrphans++;
   const ct=parse(await tplZip.file(CTYPES).async('string'));
   for(const ov of get(ct,'Override',NS.ct))if(ov.getAttribute('PartName')==='/'+part)ov.parentNode.removeChild(ov);
   tplZip.file(CTYPES,serialize(ct));
  }
 }
 if(changes.noteIds)warnings.push('Kompatibilitas Word: '+changes.noteIds+' ID catatan kaki disesuaikan dengan pengaturan master jurnal.');
 return changes;
}

// Packaging guard: do not offer a DOCX containing malformed XML or missing related parts.
async function inspectWordPackage(zip,rule,warnings){
 const errors=[],extra=[];
 for(const path of Object.keys(zip.files).filter(n=>/\.(?:xml|rels)$/i.test(n))){
  try{parse(await zip.file(path).async('string'));}
  catch(e){errors.push('XML rusak pada '+path);}
 }
 const parts=Object.keys(zip.files).filter(x=>!zip.files[x].dir);
 for(const p of parts.filter(x=>x.endsWith('.rels'))){
  let d;try{d=parse(await zip.file(p).async('string'));}catch{continue;}
  const folder=p==='_rels/.rels'?'':p.replace(/_rels\/([^/]+)\.rels$/,'');
  const source=p==='_rels/.rels'?'':folder+p.split('/').pop().slice(0,-5);
  const ids=new Set();
  for(const r of relNodes(d)){
   const id=r.getAttribute('Id'),target=r.getAttribute('Target')||'';
   if(ids.has(id))errors.push('Relasi duplikat '+id+' di '+p);ids.add(id);
   if(r.getAttribute('TargetMode')==='External'||!target||target[0]==='#')continue;
   const dest=target[0]==='/'?normal(target):normal(dir(source)+target);
   if(dest&&!zip.file(dest))extra.push('Aset relasi tidak ditemukan: '+p+' → '+dest);
  }
 }
 if(extra.length)warnings.push('Paket DOCX memiliki referensi eksternal internal yang belum ditemukan: '+extra.slice(0,2).join('; '));
 return {errors,warnings:extra};
}

// Word 2010 compatibility: properties MUST be in the OOXML schema order.
// LibreOffice often accepts out-of-order properties, but legacy Word can reject
// or crash on them. The original template is untouched; only the generated
// result is normalized. Unknown extension nodes retain their original slots.
const PROPERTY_ORDER={
 pPr:'pStyle keepNext keepLines pageBreakBefore framePr widowControl numPr suppressLineNumbers pBdr shd tabs suppressAutoHyphens kinsoku wordWrap overflowPunct topLinePunct autoSpaceDE autoSpaceDN bidi adjustRightInd snapToGrid spacing ind contextualSpacing mirrorIndents suppressOverlap jc textDirection textAlignment textboxTightWrap outlineLvl divId cnfStyle rPr sectPr pPrChange',
 rPr:'rStyle rFonts b bCs i iCs caps smallCaps strike dstrike outline shadow emboss imprint noProof snapToGrid vanish webHidden color spacing w kern position sz szCs highlight u effect bdr shd fitText vertAlign rtl cs em lang eastAsianLayout specVanish oMath',
 tblPr:'tblStyle tblpPr tblOverlap bidiVisual tblStyleRowBandSize tblStyleColBandSize tblW jc tblCellSpacing tblInd tblBorders shd tblLayout tblCellMar tblLook tblCaption tblDescription tblPrChange',
 tcPr:'cnfStyle tcW gridSpan hMerge vMerge tcBorders shd noWrap tcMar textDirection tcFitText vAlign hideMark headers cellIns cellDel cellMerge tcPrChange'
};
function normalizePropertyOrder(doc){
 let changed=0;
 for(const [tag,list] of Object.entries(PROPERTY_ORDER)){
  const priority=new Map(list.split(' ').map((name,index)=>[name,index]));
  for(const parent of get(doc,tag)){
   const original=Array.from(parent.childNodes);
   const applicable=n=>n.nodeType===1&&n.namespaceURI===NS.w&&priority.has(n.localName);
   const toSort=original.filter(applicable);
   let prev=-1,bad=false;
   for(const n of toSort){const pos=priority.get(n.localName);if(pos<prev){bad=true;break;}prev=pos;}
   if(!bad)continue;
   const sorted=toSort.slice().sort((a,b)=>priority.get(a.localName)-priority.get(b.localName));
   let ix=0;const reordered=original.map(n=>applicable(n)?sorted[ix++]:n);
   for(const n of reordered)parent.appendChild(n);
   changed++;
  }
 }
 return changed;
}
async function normalizeOtherWordParts(zip){
 let fixed=0;
 const targets=Object.keys(zip.files).filter(k=>/^word\/(?!document\.xml$)[^/]*\.xml$/i.test(k));
 for(const name of targets){
  const file=zip.file(name);if(!file)continue;
  const raw=await file.async('string'),doc=parse(raw),n=normalizePropertyOrder(doc);
  if(n){zip.file(name,serialize(doc));fixed+=n;}
 }
 return fixed;
}
function sourceStylesUsed(nodes){const styles=new Set();for(const n of nodes)for(const z of get(n,'pStyle'))if(aval(z,'val'))styles.add(aval(z,'val'));return [...styles];}
async function build(articleBuffer,templateBuffer,rule,metadata={}){
 if(typeof global.JSZip==='undefined')throw Error('JSZip tidak dimuat; pastikan folder lib/ ikut diunggah ke GitHub.');
 const [srcZip,tplZip]=await Promise.all([JSZip.loadAsync(articleBuffer),JSZip.loadAsync(templateBuffer)]);
 if(!srcZip.file('word/document.xml')||!tplZip.file('word/document.xml'))throw Error('File Word (.docx) tidak valid.');
 const [srcXml,tplXml]=await Promise.all([srcZip.file('word/document.xml').async('string'),tplZip.file('word/document.xml').async('string')]);
 const srcDoc=parse(srcXml),tplDoc=parse(tplXml),warnings=[];
 const extracted=fromSource(srcDoc),info=unifyMeta(extracted,metadata);
 // Custom ZAIN.NET RABBANI variant only: the student's English abstract and
 // English keyword field are not inserted. Other journals remain bilingual.
 const rabbaniIndonesiaOnly=rule.id==='rabbani' && rule.abstractLanguage==='id-only';
 if(rabbaniIndonesiaOnly){info.abstractEn='';info.keywordsEn='';}
 if(!info.title)throw Error('Judul artikel tidak terdeteksi. Isi Judul manual pada formulir.');
 const headingP=bodyEls(tplDoc)[Number(rule.cut)];if(!headingP)throw Error('Letak paragraf isi template berubah.');
 const prototype=findPrototype(tplDoc,rule);
 if(rule.id==='rabbani'&&rule.compatMaster==='word2010'&&(!prototype.heading||!prototype.body))throw Error('Master Word2010 RABBANI tidak memiliki contoh format paragraf.');
 const actualRule={...rule,pageWidthTwips:availablePageWidth(tplDoc)};
 const frontCount=replaceFront(tplDoc,rule,info,metadata,warnings)+fillRabbaniWord2010Table(tplDoc,info,metadata,rule,warnings);
 if(rule.id==='nuansa')fitNuansaLongTitle(tplDoc,info,warnings);
 safeEditorDates(tplZip,tplDoc,rule,metadata);
 const imported=appendMain(tplDoc,actualRule,extracted.content,prototype,warnings);
 const body=bodyEls(tplDoc);
 // newly inserted source elements appear immediately after the original preface
 const appended=body.slice(Number(rule.cut),Number(rule.cut)+imported);
 rabbaniFlowLongAbstract(tplDoc,info,metadata,rule,warnings);
 const deps=await importSourceParts(srcZip,tplZip,tplDoc,srcDoc,{inserted:appended,sourceRelationshipIds:sourceRefIds(appended)},warnings);
 const compatFixes=await normalizeNotesAndOrphans(tplZip,tplDoc,rule,warnings);
 const headers=await editJournalHeader(tplZip,tplDoc,info,rule,warnings);
 const footerFixes=(await safeguardHeaderFooter(tplZip,rule,metadata))+(rule.id==='rabbani'?await scrubRabbaniHeaderFooter(tplZip,info,metadata):0)+(await writeRabbaniCompatibleFooter(tplZip,info,metadata,rule));
 const propertyOrderFixes=normalizePropertyOrder(tplDoc);
 tplZip.file('word/document.xml',serialize(tplDoc));
 const otherPartOrderFixes=await normalizeOtherWordParts(tplZip);
 const guard=await inspectWordPackage(tplZip,rule,warnings);
 if(guard.errors.length)throw Error('Paket Word tidak valid: '+guard.errors.slice(0,4).join('; '));
 const blob=await tplZip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',compression:'DEFLATE',compressionOptions:{level:6}});
 const absEnWords=sliceCount(info.abstractEn),absIdWords=sliceCount(info.abstractId);
 if(rule.abstractWords){for(const [lang,n] of [['Inggris',absEnWords],['Indonesia',absIdWords]]){
  if(n && (n<rule.abstractWords[0]||n>rule.abstractWords[1]))warnings.push('Abstrak '+lang+' '+n+' kata, pedoman '+rule.abstractWords[0]+'–'+rule.abstractWords[1]+' kata.');
 }}
 if(rule.titleMax&&sliceCount(info.title)>rule.titleMax)warnings.push('Judul '+sliceCount(info.title)+' kata; batas yang tercatat untuk '+rule.id+' '+rule.titleMax+' kata.');
 if(!info.author)warnings.push('Nama penulis belum terdeteksi; isi manual pada metadata.');
 if(!info.affiliation)warnings.push('Afiliasi belum terdeteksi; isi manual pada metadata.');
 if(!info.abstractEn && !rabbaniIndonesiaOnly)warnings.push('Tidak ada Abstract Inggris di sumber; tidak membuat terjemahan otomatis.');
 if(!info.abstractId)warnings.push('Tidak ada Abstrak Indonesia di sumber; tidak membuat terjemahan otomatis.');
 if(/mabny/.test(rule.id))warnings.push('MABNY membutuhkan abstrak terstruktur; periksa Purpose/Methodology/Findings/Implications/Originality.');
 if(rule.id==='rabbani')warnings.push('RABBANI: hanya abstrak Bahasa Indonesia digunakan sesuai pilihan pengguna. Contoh tanggal penerbitan, volume, nomor, DOI dan jumlah halaman tidak menjadi metadata artikel; periksa hasil di Word 2010.');
 warnings.push('Volume/nomor/tahun/DOI contoh dari template mungkin belum diterbitkan; editor wajib memverifikasi dan melengkapinya sebelum pengiriman.');
 if(headers<Object.keys(rule.header||{}).length)warnings.push('Sebagian running header tidak terpetakan secara otomatis; cek semua halaman di Word.');
 return {blob,details:{journal:rule.id,templateBased:true,frontFields:frontCount,contentBlocks:imported,sourceTables:extracted.tables,sourceFootnotes:extracted.hasNotes,sourceAssets:deps.assets,sourceRelationships:deps.relationships,packageErrors:guard.errors.length,packageWarnings:guard.warnings.length,headersModified:headers,footerFixes,propertyOrderFixes,otherPartOrderFixes,compatFixes,warnings:[...new Set(warnings)],extracted:{title:info.title,author:info.author,affiliation:info.affiliation,email:info.email,abstractEnWords:absEnWords,abstractIdWords:absIdWords}}};
}
global.ZainDocxEngine={build};
})(typeof window!=='undefined'?window:globalThis);

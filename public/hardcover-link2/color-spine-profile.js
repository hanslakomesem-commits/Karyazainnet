/** ZAIN.NET V4.8 — references for 19 thicknesses; 3-line SPINE ONLY.
 * Front cover is locked to the correctly approved PILIHAN WARNA.pdf.
 * The examples have some clipped trim marks and shifts: never directly
 * copy an entire page to produce a customer PDF.
 */
export const COLOR_THREE_LINE_REFS=Object.freeze([
 Object.freeze({mm:10,page:1,sourcePage:1,source:"10mm-28mm punggung 3 baris.pdf",sampleFontPt:6,frontShiftMm:-0.0,measuredWidthMm:10.011}),
 Object.freeze({mm:11,page:2,sourcePage:2,source:"10mm-28mm punggung 3 baris.pdf",sampleFontPt:6,frontShiftMm:-0.0,measuredWidthMm:10.911}),
 Object.freeze({mm:12,page:3,sourcePage:3,source:"10mm-28mm punggung 3 baris.pdf",sampleFontPt:7,frontShiftMm:-0.0,measuredWidthMm:12.011}),
 Object.freeze({mm:13,page:4,sourcePage:4,source:"10mm-28mm punggung 3 baris.pdf",sampleFontPt:9,frontShiftMm:-0.0,measuredWidthMm:13.111}),
 Object.freeze({mm:14,page:5,sourcePage:5,source:"10mm-28mm punggung 3 baris.pdf",sampleFontPt:9,frontShiftMm:-0.0,measuredWidthMm:14.011}),
 Object.freeze({mm:15,page:6,sourcePage:6,source:"10mm-28mm punggung 3 baris.pdf",sampleFontPt:9,frontShiftMm:-0.0,measuredWidthMm:15.011}),
 Object.freeze({mm:16,page:7,sourcePage:7,source:"10mm-28mm punggung 3 baris.pdf",sampleFontPt:9,frontShiftMm:-0.0,measuredWidthMm:16.111}),
 Object.freeze({mm:17,page:8,sourcePage:8,source:"10mm-28mm punggung 3 baris.pdf",sampleFontPt:9,frontShiftMm:-0.0,measuredWidthMm:17.011}),
 Object.freeze({mm:18,page:9,sourcePage:9,source:"10mm-28mm punggung 3 baris.pdf",sampleFontPt:9,frontShiftMm:-0.0,measuredWidthMm:18.011}),
 Object.freeze({mm:19,page:10,sourcePage:10,source:"10mm-28mm punggung 3 baris.pdf",sampleFontPt:9,frontShiftMm:-0.0,measuredWidthMm:19.011}),
 Object.freeze({mm:20,page:11,sourcePage:11,source:"10mm-28mm punggung 3 baris.pdf",sampleFontPt:9,frontShiftMm:-0.0,measuredWidthMm:20.011}),
 Object.freeze({mm:21,page:12,sourcePage:12,source:"10mm-28mm punggung 3 baris.pdf",sampleFontPt:9,frontShiftMm:-0.0,measuredWidthMm:21.011}),
 Object.freeze({mm:22,page:13,sourcePage:13,source:"10mm-28mm punggung 3 baris.pdf",sampleFontPt:9,frontShiftMm:-0.0,measuredWidthMm:22.011}),
 Object.freeze({mm:23,page:14,sourcePage:14,source:"10mm-28mm punggung 3 baris.pdf",sampleFontPt:9,frontShiftMm:-0.0,measuredWidthMm:23.011}),
 Object.freeze({mm:24,page:15,sourcePage:15,source:"10mm-28mm punggung 3 baris.pdf",sampleFontPt:9,frontShiftMm:-0.0,measuredWidthMm:24.011}),
 Object.freeze({mm:25,page:16,sourcePage:1,source:"25-26 mm(1).pdf",sampleFontPt:9,frontShiftMm:-0.0,measuredWidthMm:24.911}),
 Object.freeze({mm:26,page:17,sourcePage:2,source:"25-26 mm(1).pdf",sampleFontPt:9,frontShiftMm:5.9,measuredWidthMm:26.011}),
 Object.freeze({mm:27,page:18,sourcePage:16,source:"10mm-28mm punggung 3 baris.pdf",sampleFontPt:9,frontShiftMm:5.9,measuredWidthMm:27.011}),
 Object.freeze({mm:28,page:19,sourcePage:17,source:"10mm-28mm punggung 3 baris.pdf",sampleFontPt:9,frontShiftMm:5.9,measuredWidthMm:28.011})
]);
export const MEASURED_THREE_LINE_SIZES=new Set(COLOR_THREE_LINE_REFS.map(r=>r.mm));
export function threeLineReferenceStatus(mm){
 const t=Number(mm);
 if(!Number.isInteger(t)||t<10||t>28)throw Error('Ketebalan harus 10–28 mm.');
 const ref=COLOR_THREE_LINE_REFS.find(r=>r.mm===t);
 return {mm:t,referenceAvailable:!!ref,referencePage:ref?.page??null,
   sampleFontPt:ref?.sampleFontPt??null, source:ref?.source??null,
   sourcePage:ref?.sourcePage??null, measuredWidthMm:ref?.measuredWidthMm??null,
   paper:'475 × 320 mm',titleRows:3,frontLayout:'PILIHAN WARNA.pdf',
   warning:ref?.frontShiftMm?`Contoh ${t} mm menggeser cover depan ${ref.frontShiftMm} mm. Hanya data punggungnya dipakai; depan tetap master warna lama.`:null};
}
/** Real font body may extend either side of the baseline on a rotated row. */
export function spineTextSpan(size,count,pitchRatio=1.11,fontBodyRatio=1.15){
 return (count-1)*size*pitchRatio+size*fontBodyRatio;
}
export function withinSpine(size,count,availableWidthPt,safetyPt=1.1){
 return spineTextSpan(size,count)<=availableWidthPt-safetyPt+1e-6;
}

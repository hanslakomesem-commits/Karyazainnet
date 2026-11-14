/** Geometric calibration from PILIHAN WARNA.pdf, coordinates in PDF POINTS.
 * Spine's two INNER yellow guidelines are x=644.73 and 693.10 in source.
 * The OUTER yellow guidelines on the LEFT (all 4 left of/right at spine)
 * shift together, keeping the front and right half fixed.
 */
export const mmPoint=mm=>mm*72/25.4;
export const SOURCE_SPINE={left:644.73,right:693.10,widthMm:(693.10-644.73)*25.4/72};
export const SOURCE_GUIDES_LEFT=[29.34,355.27,616.47,644.73];
export const SOURCE_GUIDES_RIGHT=[693.10,721.28,986.43,1308.78];
export const PAPER_COLOR={width:475,height:320};
export const PAPER_PLAIN={width:480,height:330};
export function colorGuideGeometry(targetMm){
 const mm=Number(targetMm);
 if(!Number.isInteger(mm)||mm<10||mm>28)throw Error('Ketebalan harus 10–28 mm.');
 const delta=mmPoint(mm-SOURCE_SPINE.widthMm);
 const left=SOURCE_SPINE.left-delta;
 const right=SOURCE_SPINE.right;
 const guidesLeft=SOURCE_GUIDES_LEFT.map(x=>x-delta);
 const guidesRight=[...SOURCE_GUIDES_RIGHT];
 if(Math.abs(right-left-mmPoint(mm))>1e-6)throw Error('Lebar spine salah perhitungan.');
 return {mm,delta,left,right,center:(left+right)/2,guidesLeft,guidesRight,
   leftmostMarkClipped:guidesLeft[0]<0};
}

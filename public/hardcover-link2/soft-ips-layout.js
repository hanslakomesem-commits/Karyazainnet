/** Soft Cover IPS — geometry from page 1 of supplied six-page PDF (330 × 210 mm).
 * Only 5 mm is evidenced by fold ticks. Other sizes 6–10 mm are geometric
 * extrapolations and must be proof-printed before production.
 */
export const IPS_SIZES=Object.freeze([5,6,7,8,9,10]);
export const IPS_REFERENCE=Object.freeze({
  pageWidthPt:935.43310546875,
  pageHeightPt:595.2755737304688,
  foldRightPt:483.40,
  foldLeftOriginalPt:469.40,
  leftTicksPt:[44.33,249.02,449.60,469.40],
  rightTicksPt:[483.40,503.40,689.43,908.63],
  frontCenterXPt:696.25,
  titleCenterTopPt:178,
  titleSafeTopPt:42,
  titleSafeBottomPt:310
});
export const ipsMmPt=mm=>mm*72/25.4;
export function ipsSpineGeometry(mm){
 mm=Number(mm);
 if(!IPS_SIZES.includes(mm))throw new Error('Soft Cover IPS: ketebalan yang tersedia 5–10 mm.');
 const right=IPS_REFERENCE.foldRightPt;
 const left=right-ipsMmPt(mm);
 const shift=IPS_REFERENCE.foldLeftOriginalPt-left;
 const leftTicksPt=IPS_REFERENCE.leftTicksPt.map(x=>x-shift);
 if(leftTicksPt[0]<12)throw new Error('Tanda potong IPS melewati bidang aman kertas.');
 return {mm,left,right,center:(left+right)/2,widthPt:right-left,shift,leftTicksPt,rightTicksPt:[...IPS_REFERENCE.rightTicksPt]};
}

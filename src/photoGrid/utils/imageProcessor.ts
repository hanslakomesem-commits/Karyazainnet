import { cmToPixels } from './conversions';
import { AutoRotateMode, ResizeMode } from '../types';

export interface ProcessImageOptions {
  widthCm: number;
  heightCm: number;
  mode: ResizeMode;
  autoRotateMode?: AutoRotateMode;
  manualRotateAngle?: number; // 0, 90, 180, 270
  dpi?: number;
  backgroundColor?: string;
  outputFormat?: 'image/jpeg' | 'image/png';
  quality?: number;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Gagal memuat gambar: ' + err));
    img.src = src;
  });
}

export async function processImageToBlob(
  imageSource: string | HTMLImageElement,
  options: ProcessImageOptions
): Promise<{ blob: Blob; dataUrl: string; widthPx: number; heightPx: number; wasRotated?: boolean }> {
  const img = typeof imageSource === 'string' ? await loadImage(imageSource) : imageSource;

  const dpi = options.dpi || 300;
  const targetPxW = Math.max(10, cmToPixels(options.widthCm, dpi));
  const targetPxH = Math.max(10, cmToPixels(options.heightCm, dpi));

  const rawSrcW = img.naturalWidth || img.width;
  const rawSrcH = img.naturalHeight || img.height;

  // Rotasi manual (prioritas utama jika disetel pengguna) atau auto-rotate
  const manualAngle = ((options.manualRotateAngle || 0) % 360 + 360) % 360;
  const isSourceLandscape = rawSrcW > rawSrcH;
  const isSourcePortrait = rawSrcH > rawSrcW;
  const isTargetPortrait = targetPxH > targetPxW;
  const isTargetLandscape = targetPxW > targetPxH;

  const shouldAutoRotate =
    manualAngle === 0 &&
    options.autoRotateMode === 'auto_rotate_to_target' &&
    ((isSourceLandscape && isTargetPortrait) || (isSourcePortrait && isTargetLandscape));

  const effectiveRotateDeg = manualAngle !== 0 ? manualAngle : shouldAutoRotate ? 90 : 0;
  const wasRotated = effectiveRotateDeg !== 0;

  let sourceDrawable: HTMLImageElement | HTMLCanvasElement = img;
  let srcW = rawSrcW;
  let srcH = rawSrcH;

  if (effectiveRotateDeg !== 0) {
    const isQuarterTurn = effectiveRotateDeg === 90 || effectiveRotateDeg === 270;
    const rotCanvas = document.createElement('canvas');
    rotCanvas.width = isQuarterTurn ? rawSrcH : rawSrcW;
    rotCanvas.height = isQuarterTurn ? rawSrcW : rawSrcH;
    const rotCtx = rotCanvas.getContext('2d');
    if (rotCtx) {
      rotCtx.imageSmoothingEnabled = true;
      rotCtx.imageSmoothingQuality = 'high';
      rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
      rotCtx.rotate((effectiveRotateDeg * Math.PI) / 180);
      rotCtx.drawImage(img, -rawSrcW / 2, -rawSrcH / 2, rawSrcW, rawSrcH);
      sourceDrawable = rotCanvas;
      srcW = rotCanvas.width;
      srcH = rotCanvas.height;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetPxW;
  canvas.height = targetPxH;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context tidak tersedia');
  }

  // Smooth resampling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill background
  const bgColor = options.backgroundColor || '#FFFFFF';
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, targetPxW, targetPxH);

  if (options.mode === 'stretch') {
    // Mode 2: Full Photo Resize (Stretch / Bebas Gepeng)
    // Entire photo is visible, forced into target width and height
    ctx.drawImage(sourceDrawable, 0, 0, targetPxW, targetPxH);
  } else if (options.mode === 'fit_pad') {
    // Mode 3: Fit with Padding (Letterbox)
    const scale = Math.min(targetPxW / srcW, targetPxH / srcH);
    const drawW = srcW * scale;
    const drawH = srcH * scale;
    const drawX = (targetPxW - drawW) / 2;
    const drawY = (targetPxH - drawH) / 2;

    ctx.drawImage(sourceDrawable, drawX, drawY, drawW, drawH);
  } else {
    // Mode 1: Smart Cropping (Crop & Fill / Jaga Proporsi)
    // Fills entire target area without distortion by cropping edges
    const targetRatio = targetPxW / targetPxH;
    const srcRatio = srcW / srcH;

    let cropX = 0;
    let cropY = 0;
    let cropW = srcW;
    let cropH = srcH;

    if (srcRatio > targetRatio) {
      // Source is wider than target: crop left & right
      cropW = srcH * targetRatio;
      cropX = (srcW - cropW) / 2;
    } else {
      // Source is taller than target: crop top & bottom
      cropH = srcW / targetRatio;
      // Slight upper-bias (35% top, 65% bottom) so portraits don't have foreheads cut off
      cropY = Math.max(0, (srcH - cropH) * 0.35);
    }

    ctx.drawImage(sourceDrawable, cropX, cropY, cropW, cropH, 0, 0, targetPxW, targetPxH);
  }

  const format = options.outputFormat || 'image/jpeg';
  const quality = options.quality ?? 0.95;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Gagal mengonversi canvas ke Blob'));
          return;
        }
        const dataUrl = canvas.toDataURL(format, quality);
        resolve({
          blob,
          dataUrl,
          widthPx: targetPxW,
          heightPx: targetPxH,
          wasRotated,
        });
      },
      format,
      quality
    );
  });
}

/**
 * Generates sample pas foto data for testing purposes (Red, Blue, White background portraits)
 */
export function generateSamplePhotoFile(
  name: string,
  bgColor: string,
  personColor: string,
  label: string
): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  // Background (standard Indonesian Red #D32F2F or Blue #1976D2)
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 600, 800);

  // Subtle studio vignette
  const grad = ctx.createRadialGradient(300, 360, 50, 300, 400, 420);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 800);

  // Silhouette / Portrait Body (Formal Suit / Kemeja Putih & Dasi)
  // Shoulders
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(120, 800);
  ctx.bezierCurveTo(130, 580, 220, 550, 300, 550);
  ctx.bezierCurveTo(380, 550, 470, 580, 480, 800);
  ctx.closePath();
  ctx.fill();

  // White collar
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(250, 545);
  ctx.lineTo(300, 620);
  ctx.lineTo(350, 545);
  ctx.closePath();
  ctx.fill();

  // Tie
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.moveTo(290, 585);
  ctx.lineTo(310, 585);
  ctx.lineTo(320, 780);
  ctx.lineTo(300, 800);
  ctx.lineTo(280, 780);
  ctx.closePath();
  ctx.fill();

  // Neck
  ctx.fillStyle = personColor;
  ctx.fillRect(270, 470, 60, 85);

  // Head
  ctx.fillStyle = personColor;
  ctx.beginPath();
  ctx.ellipse(300, 370, 110, 140, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(300, 300, 115, 80, 0, 0, Math.PI * 2);
  ctx.fill();

  // Friendly subtle face lines
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
  ctx.lineWidth = 3;
  // Eyes
  ctx.beginPath();
  ctx.arc(260, 360, 8, 0, Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(340, 360, 8, 0, Math.PI);
  ctx.stroke();
  // Smile
  ctx.beginPath();
  ctx.arc(300, 425, 26, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();

  // Badge label at bottom
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 730, 600, 70);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 300, 772);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const file = new File([blob!], name, { type: 'image/jpeg' });
      resolve(file);
    }, 'image/jpeg', 0.95);
  });
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RotateResult {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
  rotated: boolean;
  angle: number;
}

/**
 * Rotates an image file by a given angle (90, 180, 270) using browser canvas.
 * Produces a real new JPEG Blob/File with the rotated pixels so Word sees it rotated.
 */
export async function rotateImageFile(file: File, angleDegrees: number): Promise<RotateResult> {
  const normAngle = ((angleDegrees % 360) + 360) % 360;
  if (normAngle === 0) {
    const dataUrl = await fileToDataUrl(file);
    const { width, height } = await getImageDimensions(dataUrl);
    return {
      file,
      dataUrl,
      width,
      height,
      aspectRatio: width / height,
      rotated: false,
      angle: 0,
    };
  }

  const dataUrl = await fileToDataUrl(file);
  const img = await loadImage(dataUrl);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context tidak tersedia.');

  if (normAngle === 90 || normAngle === 270) {
    canvas.width = img.height;
    canvas.height = img.width;
  } else {
    canvas.width = img.width;
    canvas.height = img.height;
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((normAngle * Math.PI) / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Gagal mengonversi canvas ke Blob'));
      },
      'image/jpeg',
      0.96
    );
  });

  const newFileName = file.name.replace(/\.[^/.]+$/, '') + `_rot${normAngle}.jpeg`;
  const newFile = new File([blob], newFileName, { type: 'image/jpeg' });
  const newDataUrl = canvas.toDataURL('image/jpeg', 0.96);

  return {
    file: newFile,
    dataUrl: newDataUrl,
    width: canvas.width,
    height: canvas.height,
    aspectRatio: canvas.width / canvas.height,
    rotated: true,
    angle: normAngle,
  };
}

/**
 * Automatically detects if Kartu Bimbingan image is in Portrait (height > width)
 * and rotates it 90 degrees to Landscape so it fits properly on half of an A4 Word page.
 */
export async function autoRotateKartuBimbingan(file: File): Promise<RotateResult> {
  const dataUrl = await fileToDataUrl(file);
  const { width, height } = await getImageDimensions(dataUrl);

  // If height > width, it is oriented vertically and needs to be rotated 90deg clockwise to landscape
  if (height > width * 1.05) {
    return rotateImageFile(file, 90);
  }

  return {
    file,
    dataUrl,
    width,
    height,
    aspectRatio: width / height,
    rotated: false,
    angle: 0,
  };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve({ width: 1200, height: 800 });
    img.src = src;
  });
}

import { PDFDocument } from 'pdf-lib';

/**
 * Converts one or multiple image files (JPG, PNG, WEBP, BMP) into a compiled PDF ArrayBuffer.
 */
export async function convertImagesToPdfBuffer(
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.create();

  // Sort files naturally by filename if multiple images are uploaded
  const sortedFiles = [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );

  for (let i = 0; i < sortedFiles.length; i++) {
    const file = sortedFiles[i];
    const arrayBuffer = await file.arrayBuffer();
    const type = file.type.toLowerCase();

    let image;
    try {
      if (type.includes('png')) {
        image = await pdfDoc.embedPng(arrayBuffer);
      } else if (type.includes('jpeg') || type.includes('jpg')) {
        image = await pdfDoc.embedJpg(arrayBuffer);
      } else {
        // Fallback for WEBP, BMP, or edge cases via Canvas
        image = await embedImageViaCanvas(pdfDoc, file);
      }
    } catch (err) {
      console.warn(`Direct embed failed for ${file.name}, trying canvas fallback:`, err);
      try {
        image = await embedImageViaCanvas(pdfDoc, file);
      } catch (canvasErr) {
        console.error(`Failed to process image ${file.name}:`, canvasErr);
        continue;
      }
    }

    if (image) {
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }

    if (onProgress) {
      onProgress(i + 1, sortedFiles.length);
    }
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer as ArrayBuffer;
}

async function embedImageViaCanvas(pdfDoc: PDFDocument, file: File) {
  const img = new Image();
  const url = URL.createObjectURL(file);

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.width || 1200;
  canvas.height = img.height || 1600;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  }

  const jpegUrl = canvas.toDataURL('image/jpeg', 0.92);
  URL.revokeObjectURL(url);

  const base64Data = jpegUrl.split(',')[1];
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  return await pdfDoc.embedJpg(bytes.buffer);
}

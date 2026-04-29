import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

async function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

async function renderPageToJpeg(page, scale, quality) {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport }).promise;

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}

export async function compressPdf(file, level = 'medium') {
  const settings = {
    low: { scale: 1.0, quality: 0.4 },
    medium: { scale: 1.5, quality: 0.6 },
    high: { scale: 2.0, quality: 0.8 },
  };

  const { scale, quality } = settings[level] || settings.medium;
  const arrayBuffer = await readFileAsArrayBuffer(file);

  try {
    const srcDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageCount = srcDoc.numPages;

    const newPdf = await PDFDocument.create();

    for (let i = 1; i <= pageCount; i++) {
      const page = await srcDoc.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 });

      // Render page to JPEG
      const jpegBlob = await renderPageToJpeg(page, scale, quality);
      const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());

      // Embed in new PDF
      const jpegImage = await newPdf.embedJpg(jpegBytes);

      // Use original page dimensions (in PDF points)
      const newPage = newPdf.addPage([viewport.width, viewport.height]);
      newPage.drawImage(jpegImage, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      });
    }

    const savedBytes = await newPdf.save();
    const blob = new Blob([savedBytes], { type: 'application/pdf' });

    // If result is bigger than original, return original
    if (blob.size >= file.size * 0.95) {
      return {
        blob: new Blob([arrayBuffer], { type: 'application/pdf' }),
        originalSize: file.size,
        pageCount,
        noChange: true,
      };
    }

    return {
      blob,
      originalSize: file.size,
      pageCount,
      noChange: false,
    };
  } catch (err) {
    console.error('PDF compression error:', err);
    return {
      blob: new Blob([arrayBuffer], { type: 'application/pdf' }),
      originalSize: file.size,
      pageCount: 0,
      noChange: true,
    };
  }
}
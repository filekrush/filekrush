import { jsPDF } from 'jspdf';

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function getImageDataUrl(img, format, quality) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');

  if (format !== 'image/png') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL(format === 'image/png' ? 'image/png' : 'image/jpeg', quality);
}

export async function imagesToPdf(files, options = {}) {
  const {
    pageSize = 'a4',
    orientation = 'portrait',
    fit = 'contain',
    margin = 10,
    quality = 0.8,
  } = options;

  const doc = new jsPDF({ orientation, unit: 'mm', format: pageSize });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableW = pageWidth - margin * 2;
  const usableH = pageHeight - margin * 2;

  for (let i = 0; i < files.length; i++) {
    if (i > 0) doc.addPage();

    const img = await loadImage(files[i]);
    const dataUrl = getImageDataUrl(img, files[i].type, quality);
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const pageRatio = usableW / usableH;

    let drawW, drawH, drawX, drawY;

    if (fit === 'contain') {
      if (imgRatio > pageRatio) {
        drawW = usableW;
        drawH = usableW / imgRatio;
      } else {
        drawH = usableH;
        drawW = usableH * imgRatio;
      }
      drawX = margin + (usableW - drawW) / 2;
      drawY = margin + (usableH - drawH) / 2;
    } else if (fit === 'cover') {
      if (imgRatio > pageRatio) {
        drawH = usableH;
        drawW = usableH * imgRatio;
      } else {
        drawW = usableW;
        drawH = usableW / imgRatio;
      }
      drawX = margin + (usableW - drawW) / 2;
      drawY = margin + (usableH - drawH) / 2;
    } else {
      drawW = usableW;
      drawH = usableH;
      drawX = margin;
      drawY = margin;
    }

    const format = files[i].type === 'image/png' ? 'PNG' : 'JPEG';
    doc.addImage(dataUrl, format, drawX, drawY, drawW, drawH);
  }

  const blob = doc.output('blob');
  return { blob, pageCount: files.length };
}
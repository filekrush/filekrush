function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function canvasToBlob(canvas, format, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), format, quality);
  });
}

function drawToCanvas(img, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  // For better downscaling, step down in halves when shrinking significantly
  if (width < img.naturalWidth / 2) {
    const step = document.createElement('canvas');
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;
    step.width = sw;
    step.height = sh;
    const sctx = step.getContext('2d');
    sctx.drawImage(img, 0, 0);

    while (sw / 2 > width) {
      const next = document.createElement('canvas');
      sw = Math.round(sw / 2);
      sh = Math.round(sh / 2);
      next.width = sw;
      next.height = sh;
      next.getContext('2d').drawImage(step, 0, 0, sw, sh);
      step.width = sw;
      step.height = sh;
      sctx.drawImage(next, 0, 0);
    }

    canvas.getContext('2d').drawImage(step, 0, 0, sw, sh, 0, 0, width, height);
  } else {
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
  }

  return canvas;
}

async function tryCompress(canvas, format, targetBytes) {
  let low = 0.01;
  let high = 0.95;
  let bestBlob = null;
  let bestQuality = 0.01;

  // Check if max quality already fits
  let blob = await canvasToBlob(canvas, format, high);
  if (blob.size <= targetBytes) {
    return { blob, quality: high };
  }

  // Check if min quality fits
  blob = await canvasToBlob(canvas, format, low);
  if (blob.size > targetBytes) {
    return null; // Can't fit at this scale
  }

  bestBlob = blob;
  bestQuality = low;

  // Binary search for highest quality that fits
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    blob = await canvasToBlob(canvas, format, mid);

    if (blob.size <= targetBytes) {
      bestBlob = blob;
      bestQuality = mid;
      low = mid;
    } else {
      high = mid;
    }

    if (high - low < 0.005) break;
  }

  return { blob: bestBlob, quality: bestQuality };
}

export async function compressToSize(file, targetKB, format = 'image/jpeg') {
  const img = await loadImage(file);
  const targetBytes = targetKB * 1024;
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;

  // Try at full size first
  let canvas = drawToCanvas(img, origW, origH);
  let result = await tryCompress(canvas, format, targetBytes);

  if (result && result.quality >= 0.3) {
    // Good result — quality is decent
    return { blob: result.blob, quality: Math.round(result.quality * 100), originalSize: file.size };
  }

  // Quality too low at full size — scale down and keep quality higher
  // Try scales: 75%, 50%, 35%, 25%, 15%, 10%
  const scales = [0.75, 0.5, 0.35, 0.25, 0.15, 0.1];

  for (const scale of scales) {
    const sw = Math.round(origW * scale);
    const sh = Math.round(origH * scale);
    if (sw < 10 || sh < 10) continue;

    canvas = drawToCanvas(img, sw, sh);
    result = await tryCompress(canvas, format, targetBytes);

    if (result && result.quality >= 0.4) {
      // Good balance: scaled down but quality is reasonable
      return { blob: result.blob, quality: Math.round(result.quality * 100), originalSize: file.size };
    }
  }

  // Fallback: smallest scale we tried, best we can do
  if (result) {
    return { blob: result.blob, quality: Math.round(result.quality * 100), originalSize: file.size };
  }

  // Last resort
  canvas = drawToCanvas(img, Math.round(origW * 0.1), Math.round(origH * 0.1));
  const blob = await canvasToBlob(canvas, format, 0.5);
  return { blob, quality: 50, originalSize: file.size };
}
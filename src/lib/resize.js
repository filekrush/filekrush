function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function drawToCanvas(img, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

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

export async function resizeImage(file, targetWidth, targetHeight, options = {}) {
  const { format = file.type || 'image/jpeg', quality = 0.92, maintainAspect = false } = options;
  const img = await loadImage(file);

  let width = targetWidth;
  let height = targetHeight;

  if (maintainAspect) {
    const ratio = img.naturalWidth / img.naturalHeight;
    if (targetWidth && targetHeight) {
      // Fit within bounds
      if (targetWidth / targetHeight > ratio) {
        width = Math.round(targetHeight * ratio);
        height = targetHeight;
      } else {
        width = targetWidth;
        height = Math.round(targetWidth / ratio);
      }
    } else if (targetWidth) {
      width = targetWidth;
      height = Math.round(targetWidth / ratio);
    } else if (targetHeight) {
      height = targetHeight;
      width = Math.round(targetHeight * ratio);
    }
  }

  const canvas = drawToCanvas(img, width, height);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve({
          blob,
          originalWidth: img.naturalWidth,
          originalHeight: img.naturalHeight,
          newWidth: width,
          newHeight: height,
          originalSize: file.size,
        });
      },
      format,
      quality
    );
  });
}
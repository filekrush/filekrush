function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function heicToBlob(file) {
  const heic2any = (await import('heic2any')).default;
  const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.95 });
  return Array.isArray(blob) ? blob[0] : blob;
}

export async function convertFormat(file, targetFormat, quality = 0.92) {
  let img;

  // Handle HEIC input
  if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic')) {
    if (targetFormat === 'image/jpeg' && quality >= 0.9) {
      // Fast path: heic2any can output JPEG directly
      const blob = await heicToBlob(file);
      return {
        blob,
        originalSize: file.size,
        originalFormat: 'image/heic',
        newFormat: targetFormat,
      };
    }
    // For other formats or lower quality, convert HEIC to intermediate JPEG first
    const intermediateBlob = await heicToBlob(file);
    const intermediateFile = new File([intermediateBlob], 'temp.jpg', { type: 'image/jpeg' });
    img = await loadImage(intermediateFile);
  } else {
    img = await loadImage(file);
  }

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');

  if (targetFormat === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve({
          blob,
          originalSize: file.size,
          originalFormat: file.type || 'image/heic',
          newFormat: targetFormat,
        });
      },
      targetFormat,
      quality
    );
  });
}
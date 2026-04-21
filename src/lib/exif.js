import piexif from 'piexifjs';

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

const tagNames = {
  256: 'Image Width',
  257: 'Image Height',
  271: 'Camera Make',
  272: 'Camera Model',
  274: 'Orientation',
  282: 'X Resolution',
  283: 'Y Resolution',
  306: 'Date/Time',
  315: 'Artist',
  33432: 'Copyright',
  33434: 'Exposure Time',
  33437: 'F-Number',
  34850: 'Exposure Program',
  34855: 'ISO Speed',
  36867: 'Date Taken',
  36868: 'Date Digitized',
  37377: 'Shutter Speed',
  37378: 'Aperture',
  37380: 'Exposure Bias',
  37383: 'Metering Mode',
  37385: 'Flash',
  37386: 'Focal Length',
  40962: 'Pixel X Dimension',
  40963: 'Pixel Y Dimension',
  41986: 'Exposure Mode',
  41987: 'White Balance',
  42035: 'Lens Make',
  42036: 'Lens Model',
};

const gpsTagNames = {
  1: 'GPS Latitude Ref',
  2: 'GPS Latitude',
  3: 'GPS Longitude Ref',
  4: 'GPS Longitude',
  5: 'GPS Altitude Ref',
  6: 'GPS Altitude',
  7: 'GPS Timestamp',
  29: 'GPS Date',
};

function formatValue(tag, value) {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) {
    if (value.length === 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
      return (value[0] / value[1]).toFixed(4);
    }
    return value.join(', ');
  }
  if (typeof value === 'object' && value.length) {
    return Array.from(value).map(v => {
      if (Array.isArray(v) && v.length === 2) return (v[0] / v[1]).toFixed(4);
      return v;
    }).join(', ');
  }
  return String(value);
}

function convertGPS(coords, ref) {
  if (!coords || coords.length !== 3) return null;
  const d = coords[0][0] / coords[0][1];
  const m = coords[1][0] / coords[1][1];
  const s = coords[2][0] / coords[2][1];
  let decimal = d + m / 60 + s / 3600;
  if (ref === 'S' || ref === 'W') decimal = -decimal;
  return decimal.toFixed(6);
}

export async function readExif(file) {
  try {
    const dataUrl = await readFileAsDataURL(file);
    const exifObj = piexif.load(dataUrl);
    const entries = [];
    let hasGPS = false;
    let lat = null;
    let lng = null;

    // Read main EXIF tags
    for (const ifd of ['0th', 'Exif']) {
      const data = exifObj[ifd];
      if (!data) continue;
      for (const [tag, value] of Object.entries(data)) {
        const name = tagNames[tag];
        if (name && value !== undefined) {
          entries.push({ name, value: formatValue(tag, value) });
        }
      }
    }

    // Read GPS tags
    const gps = exifObj['GPS'];
    if (gps && Object.keys(gps).length > 0) {
      hasGPS = true;
      for (const [tag, value] of Object.entries(gps)) {
        const name = gpsTagNames[tag];
        if (name && value !== undefined) {
          entries.push({ name, value: formatValue(tag, value), isGPS: true });
        }
      }

      // Calculate decimal coordinates
      if (gps[2] && gps[1]) lat = convertGPS(gps[2], gps[1]);
      if (gps[4] && gps[3]) lng = convertGPS(gps[4], gps[3]);
    }

    return { entries, hasGPS, lat, lng, rawExif: exifObj };
  } catch (err) {
    return { entries: [], hasGPS: false, lat: null, lng: null, rawExif: null };
  }
}

export async function removeExif(file) {
  try {
    const dataUrl = await readFileAsDataURL(file);
    const cleaned = piexif.remove(dataUrl);

    // Convert data URL back to blob
    const binary = atob(cleaned.split(',')[1]);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([array], { type: file.type || 'image/jpeg' });
    return { blob, originalSize: file.size };
  } catch (err) {
    // If piexif can't process it, return original
    const buffer = await readFileAsArrayBuffer(file);
    const blob = new Blob([buffer], { type: file.type });
    return { blob, originalSize: file.size };
  }
}
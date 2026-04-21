import { useState, useCallback, useRef, useEffect } from 'react';
import FileDropZone from '../ui/FileDropZone';
import DownloadButton from '../ui/DownloadButton';
import specs from '../../data/passport-specs.json';

interface PassportPhotoProps {
  defaultCountry?: string;
}

type SpecKey = keyof typeof specs;

export default function PassportPhoto({ defaultCountry = 'india' }: PassportPhotoProps) {
  const [file, setFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [country, setCountry] = useState<SpecKey>(defaultCountry as SpecKey);
  const [result, setResult] = useState<{ blob: Blob } | null>(null);
  const [processing, setProcessing] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Crop state in original image pixels
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropW, setCropW] = useState(0);
  const [cropH, setCropH] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, cx: 0, cy: 0 });

  const spec = specs[country];

  const handleFileSelect = useCallback((files: File[]) => {
    const f = files[0];
    setFile(f);
    setResult(null);

    const url = URL.createObjectURL(f);
    setImgSrc(url);

    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      recalcCrop(img, spec);
    };
    img.src = url;
  }, [spec]);

  const recalcCrop = (img: HTMLImageElement, s: typeof spec) => {
    const targetRatio = s.pxWidth / s.pxHeight;
    const imgRatio = img.naturalWidth / img.naturalHeight;

    let cw, ch;
    if (targetRatio > imgRatio) {
      cw = img.naturalWidth;
      ch = Math.round(cw / targetRatio);
    } else {
      ch = img.naturalHeight;
      cw = Math.round(ch * targetRatio);
    }

    cw = Math.min(cw, img.naturalWidth);
    ch = Math.min(ch, img.naturalHeight);

    setCropW(cw);
    setCropH(ch);
    setCropX(Math.round((img.naturalWidth - cw) / 2));
    setCropY(Math.round((img.naturalHeight - ch) / 2));
  };

  // Recalc when country changes
  useEffect(() => {
    if (imgRef.current) recalcCrop(imgRef.current, spec);
  }, [country]);

  // Draw crop preview
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const maxDisplay = 350;
    const scale = Math.min(maxDisplay / img.naturalWidth, maxDisplay / img.naturalHeight, 1);
    const dw = Math.round(img.naturalWidth * scale);
    const dh = Math.round(img.naturalHeight * scale);
    canvas.width = dw;
    canvas.height = dh;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimmed full image
    ctx.drawImage(img, 0, 0, dw, dh);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, dw, dh);

    // Bright crop area
    const sx = cropX * scale;
    const sy = cropY * scale;
    const sw = cropW * scale;
    const sh = cropH * scale;

    ctx.save();
    ctx.beginPath();
    ctx.rect(sx, sy, sw, sh);
    ctx.clip();
    ctx.drawImage(img, 0, 0, dw, dh);
    ctx.restore();

    // Border
    ctx.strokeStyle = '#0088cc';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, sw, sh);

    // Guide lines (thirds)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + sw / 3, sy);
    ctx.lineTo(sx + sw / 3, sy + sh);
    ctx.moveTo(sx + (sw * 2) / 3, sy);
    ctx.lineTo(sx + (sw * 2) / 3, sy + sh);
    ctx.moveTo(sx, sy + sh / 3);
    ctx.lineTo(sx + sw, sy + sh / 3);
    ctx.moveTo(sx, sy + (sh * 2) / 3);
    ctx.lineTo(sx + sw, sy + (sh * 2) / 3);
    ctx.stroke();

    // Size label
    ctx.fillStyle = 'white';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 3;
    ctx.fillText(`${spec.pxWidth} × ${spec.pxHeight}px`, sx + sw / 2, sy + sh + 16);
    ctx.fillText(`${spec.width} × ${spec.height}mm`, sx + sw / 2, sy + sh + 30);
    ctx.shadowBlur = 0;
  }, [cropX, cropY, cropW, cropH, spec]);

  // Drag handlers
  const getCanvasScale = () => {
    const img = imgRef.current;
    if (!img) return 1;
    const maxDisplay = 350;
    return Math.min(maxDisplay / img.naturalWidth, maxDisplay / img.naturalHeight, 1);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = getCanvasScale();
    const mx = (e.clientX - rect.left) / scale;
    const my = (e.clientY - rect.top) / scale;

    if (mx >= cropX && mx <= cropX + cropW && my >= cropY && my <= cropY + cropH) {
      setDragging(true);
      setDragStart({ x: mx, y: my, cx: cropX, cy: cropY });
      canvas.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !imgRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = getCanvasScale();
    const mx = (e.clientX - rect.left) / scale;
    const my = (e.clientY - rect.top) / scale;

    let newX = Math.round(dragStart.cx + (mx - dragStart.x));
    let newY = Math.round(dragStart.cy + (my - dragStart.y));

    newX = Math.max(0, Math.min(newX, imgRef.current.naturalWidth - cropW));
    newY = Math.max(0, Math.min(newY, imgRef.current.naturalHeight - cropH));

    setCropX(newX);
    setCropY(newY);
  };

  const handlePointerUp = () => setDragging(false);

  const handleGenerate = useCallback(async () => {
    if (!imgRef.current) return;
    setProcessing(true);

    const img = imgRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = spec.pxWidth;
    canvas.height = spec.pxHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // White background
    ctx.fillStyle = spec.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw cropped region
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, spec.pxWidth, spec.pxHeight);

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
    });

    setResult({ blob });
    setProcessing(false);
  }, [cropX, cropY, cropW, cropH, spec]);

  const handleReset = useCallback(() => {
    setFile(null);
    setImgSrc(null);
    setResult(null);
    imgRef.current = null;
  }, []);

  const countries = Object.entries(specs).map(([key, val]) => ({
    key: key as SpecKey,
    label: val.country,
  }));

  if (!file) {
    return (
      <div className="space-y-6">
        {/* Country selector before upload */}
        <div className="flex flex-col items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Select country:</label>
          <div className="flex flex-wrap justify-center gap-2">
            {countries.map((c) => (
              <button
                key={c.key}
                onClick={() => setCountry(c.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  country === c.key ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={country === c.key ? { backgroundColor: 'var(--brand-primary)' } : {}}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            {spec.width} × {spec.height}mm • {spec.pxWidth} × {spec.pxHeight}px • {spec.notes}
          </p>
        </div>

        <FileDropZone
          accept={['image/jpeg', 'image/png', 'image/webp']}
          onFileSelect={handleFileSelect}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Country selector */}
      <div className="flex flex-wrap justify-center gap-2">
        {countries.map((c) => (
          <button
            key={c.key}
            onClick={() => setCountry(c.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
              country === c.key ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={country === c.key ? { backgroundColor: 'var(--brand-primary)' } : {}}
          >
            {c.label}
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-gray-400">
        {spec.width} × {spec.height}mm • {spec.pxWidth} × {spec.pxHeight}px
      </p>

      {/* Crop canvas */}
      {!result && (
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            className="rounded-lg cursor-move"
            style={{ maxWidth: '100%' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        </div>
      )}

      {!result && (
        <p className="text-center text-xs text-gray-400">
          Drag to position your face within the frame
        </p>
      )}

      {/* Generate button */}
      {!result && (
        <div className="flex justify-center">
          <button
            onClick={handleGenerate}
            disabled={processing}
            className="px-8 py-3 rounded-xl text-white font-semibold text-base transition-colors cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            {processing ? 'Generating...' : 'Generate Passport Photo'}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <img
              src={URL.createObjectURL(result.blob)}
              alt="Passport photo"
              className="rounded-lg border border-gray-200"
              style={{ maxHeight: 300 }}
            />
          </div>

          <div className="flex items-center justify-center gap-3 py-3 px-6 rounded-xl bg-green-50 border border-green-200">
            <span className="text-green-500 text-lg">✓</span>
            <p className="text-sm font-medium text-green-700">
              {spec.country} passport photo — {spec.pxWidth} × {spec.pxHeight}px — {(result.blob.size / 1024).toFixed(0)} KB
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <DownloadButton
              blob={result.blob}
              filename={`filekrush-passport-${country}.jpg`}
              label="Download Passport Photo"
            />
            <button
              onClick={handleReset}
              className="px-6 py-3 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
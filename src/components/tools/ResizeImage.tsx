import { useState, useCallback, useEffect, useRef } from 'react';
import FileDropZone from '../ui/FileDropZone';
import DownloadButton from '../ui/DownloadButton';

interface ResizeImageProps {
  defaultWidth?: number;
  defaultHeight?: number;
}

export default function ResizeImage({ defaultWidth, defaultHeight }: ResizeImageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [width, setWidth] = useState(defaultWidth || 800);
  const [height, setHeight] = useState(defaultHeight || 600);
  const [origWidth, setOrigWidth] = useState(0);
  const [origHeight, setOrigHeight] = useState(0);
  const [lockRatio, setLockRatio] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [result, setResult] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [mode, setMode] = useState<'stretch' | 'crop'>('crop');

  // Crop state (values in original image pixel space)
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropW, setCropW] = useState(0);
  const [cropH, setCropH] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, cx: 0, cy: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // When file is selected, load image dimensions
  const handleFileSelect = useCallback((files: File[]) => {
    const f = files[0];
    setFile(f);
    setResult(null);

    const url = URL.createObjectURL(f);
    setImgSrc(url);

    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setOrigWidth(img.naturalWidth);
      setOrigHeight(img.naturalHeight);
      setWidth(img.naturalWidth);
      setHeight(img.naturalHeight);
      setAspectRatio(img.naturalWidth / img.naturalHeight);
      setCropX(0);
      setCropY(0);
      setCropW(img.naturalWidth);
      setCropH(img.naturalHeight);
    };
    img.src = url;
  }, []);

  // Recalculate crop box when width/height change
  useEffect(() => {
    if (!imgRef.current || mode !== 'crop') return;
    const img = imgRef.current;
    const targetRatio = width / height;
    const imgRatio = img.naturalWidth / img.naturalHeight;

    let cw, ch;
    if (targetRatio > imgRatio) {
      // Target is wider — full width, crop height
      cw = img.naturalWidth;
      ch = Math.round(cw / targetRatio);
    } else {
      // Target is taller — full height, crop width
      ch = img.naturalHeight;
      cw = Math.round(ch * targetRatio);
    }

    cw = Math.min(cw, img.naturalWidth);
    ch = Math.min(ch, img.naturalHeight);

    // Center the crop box
    setCropW(cw);
    setCropH(ch);
    setCropX(Math.round((img.naturalWidth - cw) / 2));
    setCropY(Math.round((img.naturalHeight - ch) / 2));
  }, [width, height, mode, origWidth]);

  // Draw crop preview on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || mode !== 'crop') return;

    const maxDisplay = 400;
    const scale = Math.min(maxDisplay / img.naturalWidth, maxDisplay / img.naturalHeight, 1);
    const dw = Math.round(img.naturalWidth * scale);
    const dh = Math.round(img.naturalHeight * scale);
    canvas.width = dw;
    canvas.height = dh;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw full image dimmed
    ctx.drawImage(img, 0, 0, dw, dh);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, dw, dh);

    // Draw crop area bright
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

    // Crop border
    ctx.strokeStyle = '#0088cc';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, sw, sh);

    // Corner handles
    const handleSize = 8;
    ctx.fillStyle = '#0088cc';
    const corners = [
      [sx, sy], [sx + sw, sy],
      [sx, sy + sh], [sx + sw, sy + sh]
    ];
    corners.forEach(([cx, cy]) => {
      ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
    });

    // Dimension label
    ctx.fillStyle = 'white';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 3;
    ctx.fillText(`${width} × ${height}`, sx + sw / 2, sy + sh / 2 + 5);
    ctx.shadowBlur = 0;
  }, [cropX, cropY, cropW, cropH, width, height, mode, origWidth]);

  // Mouse/touch handlers for dragging crop area
  const getCanvasScale = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return 1;
    const maxDisplay = 400;
    return Math.min(maxDisplay / img.naturalWidth, maxDisplay / img.naturalHeight, 1);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = getCanvasScale();
    const mx = (e.clientX - rect.left) / scale;
    const my = (e.clientY - rect.top) / scale;

    // Check if inside crop area
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

    const dx = mx - dragStart.x;
    const dy = my - dragStart.y;

    let newX = Math.round(dragStart.cx + dx);
    let newY = Math.round(dragStart.cy + dy);

    // Clamp within image bounds
    newX = Math.max(0, Math.min(newX, imgRef.current.naturalWidth - cropW));
    newY = Math.max(0, Math.min(newY, imgRef.current.naturalHeight - cropH));

    setCropX(newX);
    setCropY(newY);
  };

  const handlePointerUp = () => {
    setDragging(false);
  };

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (lockRatio) setHeight(Math.round(val / aspectRatio));
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (lockRatio) setWidth(Math.round(val * aspectRatio));
  };

  const handleReset = () => {
    setWidth(origWidth);
    setHeight(origHeight);
    setResult(null);
  };

  const handlePresetClick = (w: number, h: number) => {
    setWidth(w);
    setHeight(h);
    setLockRatio(false);
  };

  const handleResize = useCallback(async () => {
    if (!file || !imgRef.current) return;
    setProcessing(true);

    try {
      const img = imgRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (mode === 'crop') {
        // Draw from crop region to output size
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, width, height);
      } else {
        // Stretch
        ctx.drawImage(img, 0, 0, width, height);
      }

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), file.type || 'image/jpeg', 0.92);
      });

      setResult({
        blob,
        originalWidth: origWidth,
        originalHeight: origHeight,
        newWidth: width,
        newHeight: height,
        originalSize: file.size,
      });
    } catch (err) {
      console.error('Resize failed:', err);
    }
    setProcessing(false);
  }, [file, width, height, mode, cropX, cropY, cropW, cropH, origWidth, origHeight]);

  const handleStartOver = useCallback(() => {
    setFile(null);
    setResult(null);
    setImgSrc(null);
    imgRef.current = null;
  }, []);

  const presets = [
    { label: '600×600', w: 600, h: 600 },
    { label: '800×600', w: 800, h: 600 },
    { label: '1024×768', w: 1024, h: 768 },
    { label: '1280×720', w: 1280, h: 720 },
    { label: '1920×1080', w: 1920, h: 1080 },
  ];

  const needsCrop = origWidth > 0 && Math.abs((width / height) - (origWidth / origHeight)) > 0.01;

  if (!file) {
    return (
      <FileDropZone
        accept={['image/jpeg', 'image/png', 'image/webp']}
        onFileSelect={handleFileSelect}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Mode toggle — only show when aspect ratios differ */}
      {needsCrop && !result && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setMode('crop')}
            className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
              mode === 'crop' ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={mode === 'crop' ? { backgroundColor: 'var(--brand-primary)' } : {}}
          >
            Crop to fit
          </button>
          <button
            onClick={() => setMode('stretch')}
            className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
              mode === 'stretch' ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={mode === 'stretch' ? { backgroundColor: 'var(--brand-primary)' } : {}}
          >
            Stretch
          </button>
        </div>
      )}

      {/* Crop preview canvas */}
      {mode === 'crop' && needsCrop && !result && (
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

      {/* Simple preview when no crop needed or stretch mode */}
      {(!needsCrop || mode === 'stretch') && !result && imgSrc && (
        <div className="flex justify-center">
          <img src={imgSrc} alt="Preview" className="max-h-64 rounded-lg border border-gray-200 object-contain" />
        </div>
      )}

      {/* Dimension inputs */}
      {!result && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <label className="text-xs text-gray-400 uppercase tracking-wide">Width</label>
              <input
                type="number"
                value={width}
                onChange={(e) => handleWidthChange(Math.max(1, parseInt(e.target.value) || 1))}
                className="block w-28 px-3 py-2 border border-gray-300 rounded-lg text-center text-sm focus:outline-none focus:border-[var(--brand-primary)]"
              />
            </div>

            <button
              onClick={() => setLockRatio(!lockRatio)}
              className={`mt-5 p-2 rounded-lg transition-colors cursor-pointer ${
                lockRatio ? 'bg-[var(--brand-light)]' : 'bg-gray-100'
              }`}
              title={lockRatio ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={lockRatio ? 'var(--brand-primary)' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {lockRatio ? (
                  <>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </>
                ) : (
                  <>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                  </>
                )}
              </svg>
            </button>

            <div className="text-center">
              <label className="text-xs text-gray-400 uppercase tracking-wide">Height</label>
              <input
                type="number"
                value={height}
                onChange={(e) => handleHeightChange(Math.max(1, parseInt(e.target.value) || 1))}
                className="block w-28 px-3 py-2 border border-gray-300 rounded-lg text-center text-sm focus:outline-none focus:border-[var(--brand-primary)]"
              />
            </div>

            <span className="mt-5 text-sm text-gray-400">px</span>
          </div>

          {/* Presets + Reset */}
          <div className="flex flex-wrap justify-center gap-2">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => handlePresetClick(p.w, p.h)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  width === p.w && height === p.h
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={width === p.w && height === p.h ? { backgroundColor: 'var(--brand-primary)' } : {}}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={handleReset}
              className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer"
            >
              ↩ Original
            </button>
          </div>

          {(width !== origWidth || height !== origHeight) && (
            <p className="text-xs text-gray-400">
              Original: {origWidth} × {origHeight}
            </p>
          )}
        </div>
      )}

      {/* Resize button */}
      {!result && (
        <div className="flex justify-center">
          <button
            onClick={handleResize}
            disabled={processing}
            className="px-8 py-3 rounded-xl text-white font-semibold text-base transition-colors cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            {processing ? 'Resizing...' : 'Resize'}
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-6 py-4 px-6 rounded-xl bg-gray-50 border border-gray-200">
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Before</p>
              <p className="text-lg font-semibold text-gray-700">{result.originalWidth} × {result.originalHeight}</p>
            </div>
            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide">After</p>
              <p className="text-lg font-semibold" style={{ color: 'var(--success)' }}>{result.newWidth} × {result.newHeight}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <DownloadButton
              blob={result.blob}
              filename={`filekrush-${file.name}`}
              label="Download Resized Image"
            />
            <button
              onClick={handleStartOver}
              className="px-6 py-3 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Resize Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
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

  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropW, setCropW] = useState(0);
  const [cropH, setCropH] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, cx: 0, cy: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

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

  const recalcCrop = (img: HTMLImageElement) => {
    const targetRatio = width / height;
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

  useEffect(() => {
    if (imgRef.current && mode === 'crop') recalcCrop(imgRef.current);
  }, [width, height, mode, origWidth]);

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

    ctx.drawImage(img, 0, 0, dw, dh);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, dw, dh);

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

    ctx.strokeStyle = '#131313';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, sw, sh);

    const handleSize = 8;
    ctx.fillStyle = '#131313';
    [[sx, sy], [sx + sw, sy], [sx, sy + sh], [sx + sw, sy + sh]].forEach(([cx, cy]) => {
      ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
    });

    ctx.fillStyle = 'white';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 3;
    ctx.fillText(`${width} × ${height}`, sx + sw / 2, sy + sh / 2 + 5);
    ctx.shadowBlur = 0;
  }, [cropX, cropY, cropW, cropH, width, height, mode, origWidth]);

  const getCanvasScale = () => {
    const img = imgRef.current;
    if (!img) return 1;
    return Math.min(400 / img.naturalWidth, 400 / img.naturalHeight, 1);
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
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, width, height);
      } else {
        ctx.drawImage(img, 0, 0, width, height);
      }
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), file.type || 'image/jpeg', 0.92);
      });
      setResult({
        blob, originalWidth: origWidth, originalHeight: origHeight,
        newWidth: width, newHeight: height, originalSize: file.size,
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
    return <FileDropZone accept={['image/jpeg', 'image/png', 'image/webp']} onFileSelect={handleFileSelect} />;
  }

  return (
    <div className="space-y-6">
      {needsCrop && !result && (
        <div className="flex justify-center gap-2">
          {(['crop', 'stretch'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 text-[14px] font-medium cursor-pointer transition-colors ${
                mode === m ? 'text-white' : 'bg-white text-[var(--text-secondary)] border border-[#e0e0e0] hover:bg-[var(--brand-light)]'
              }`}
              style={mode === m ? { backgroundColor: 'var(--btn-primary-bg)' } : {}}
            >
              {m === 'crop' ? 'Crop to fit' : 'Stretch'}
            </button>
          ))}
        </div>
      )}

      {mode === 'crop' && needsCrop && !result && (
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            className="cursor-move"
            style={{ maxWidth: '100%' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        </div>
      )}

      {(!needsCrop || mode === 'stretch') && !result && imgSrc && (
        <div className="flex justify-center">
          <img src={imgSrc} alt="Preview" className="max-h-64 border border-[#e0e0e0] object-contain" />
        </div>
      )}

      {!result && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <label className="text-[12px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Width</label>
              <input
                type="number"
                value={width}
                onChange={(e) => handleWidthChange(Math.max(1, parseInt(e.target.value) || 1))}
                className="block w-28 px-3 py-2 border border-[#c0c0c0] text-center text-[14px] focus:outline-none focus:border-[var(--text-primary)] bg-white"
              />
            </div>

            <button
              onClick={() => setLockRatio(!lockRatio)}
              className={`mt-5 p-2 transition-colors cursor-pointer ${lockRatio ? 'bg-[var(--brand-light)]' : 'bg-white border border-[#e0e0e0]'}`}
              title={lockRatio ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={lockRatio ? 'var(--text-primary)' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {lockRatio ? (
                  <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>
                ) : (
                  <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></>
                )}
              </svg>
            </button>

            <div className="text-center">
              <label className="text-[12px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Height</label>
              <input
                type="number"
                value={height}
                onChange={(e) => handleHeightChange(Math.max(1, parseInt(e.target.value) || 1))}
                className="block w-28 px-3 py-2 border border-[#c0c0c0] text-center text-[14px] focus:outline-none focus:border-[var(--text-primary)] bg-white"
              />
            </div>

            <span className="mt-5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>px</span>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => handlePresetClick(p.w, p.h)}
                className={`px-3 py-1 text-[12px] font-medium transition-colors cursor-pointer ${
                  width === p.w && height === p.h
                    ? 'text-white'
                    : 'bg-white text-[var(--text-secondary)] border border-[#e0e0e0] hover:bg-[var(--brand-light)]'
                }`}
                style={width === p.w && height === p.h ? { backgroundColor: 'var(--btn-primary-bg)' } : {}}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={handleReset}
              className="px-3 py-1 text-[12px] font-medium bg-white text-[var(--text-secondary)] border border-[#e0e0e0] hover:bg-[var(--brand-light)] cursor-pointer"
            >
              ↩ Original
            </button>
          </div>

          {(width !== origWidth || height !== origHeight) && (
            <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Original: {origWidth} × {origHeight}</p>
          )}
        </div>
      )}

      {!result && (
        <div className="flex justify-center">
          <button
            onClick={handleResize}
            disabled={processing}
            className="px-6 py-2.5 text-[16px] text-white transition-opacity cursor-pointer disabled:opacity-50 hover:opacity-80"
            style={{ backgroundColor: 'var(--btn-primary-bg)' }}
          >
            {processing ? 'RESIZING...' : 'RESIZE'}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-8 py-5 px-8 bg-white border border-[#e0e0e0]">
            <div className="text-center">
              <p className="text-[12px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Before</p>
              <p className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>{result.originalWidth} × {result.originalHeight}</p>
            </div>
            <svg className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div className="text-center">
              <p className="text-[12px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>After</p>
              <p className="text-[18px] font-semibold" style={{ color: 'var(--success)' }}>{result.newWidth} × {result.newHeight}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <DownloadButton blob={result.blob} filename={`filekrush-${file.name}`} label="DOWNLOAD RESIZED IMAGE" />
            <button
              onClick={handleStartOver}
              className="px-6 py-2.5 text-[16px] border cursor-pointer hover:bg-[var(--brand-light)] transition-colors"
              style={{ borderColor: 'var(--btn-secondary-border)', color: 'var(--btn-secondary-text)' }}
            >
              RESIZE ANOTHER
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

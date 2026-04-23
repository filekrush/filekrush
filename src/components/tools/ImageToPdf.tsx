import { useState, useCallback } from 'react';
import FileDropZone from '../ui/FileDropZone';
import DownloadButton from '../ui/DownloadButton';
import { imagesToPdf } from '../../lib/pdf.js';

interface FileWithThumb {
  file: File;
  thumb: string;
}

export default function ImageToPdf() {
  const [items, setItems] = useState<FileWithThumb[]>([]);
  const [pageSize, setPageSize] = useState('a4');
  const [orientation, setOrientation] = useState('portrait');
  const [fit, setFit] = useState('contain');
  const [quality, setQuality] = useState<'original' | 'high' | 'low'>('high');
  const [result, setResult] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const generateThumb = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 80;
        const ratio = img.naturalWidth / img.naturalHeight;
        canvas.width = ratio > 1 ? size : Math.round(size * ratio);
        canvas.height = ratio > 1 ? Math.round(size / ratio) : size;
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = useCallback(async (newFiles: File[]) => {
    const newItems: FileWithThumb[] = [];
    for (const file of newFiles) {
      const thumb = await generateThumb(file);
      newItems.push({ file, thumb });
    }
    setItems((prev) => [...prev, ...newItems]);
    setResult(null);
  }, []);

  const removeFile = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index); };
  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) { setDragIndex(null); setDragOverIndex(null); return; }
    const newItems = [...items];
    const [moved] = newItems.splice(dragIndex, 1);
    newItems.splice(index, 0, moved);
    setItems(newItems);
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => { setDragIndex(null); setDragOverIndex(null); };

  const qualityMap = { original: 1.0, high: 0.8, low: 0.4 };

  const handleConvert = useCallback(async () => {
    if (items.length === 0) return;
    setProcessing(true);
    try {
      const res = await imagesToPdf(items.map((i) => i.file), { pageSize, orientation, fit, quality: qualityMap[quality] });
      setResult(res);
    } catch (err) {
      console.error('PDF conversion failed:', err);
    }
    setProcessing(false);
  }, [items, pageSize, orientation, fit, quality]);

  const handleReset = useCallback(() => { setItems([]); setResult(null); }, []);

  if (items.length === 0) {
    return <FileDropZone accept={['image/jpeg', 'image/png', 'image/webp']} multiple={true} onFileSelect={handleFileSelect} />;
  }

  const btnClass = (active: boolean) =>
    `px-3 py-1 text-[12px] font-medium cursor-pointer transition-colors ${active ? 'text-white' : 'bg-white text-[var(--text-secondary)] border border-[#e0e0e0] hover:bg-[var(--brand-light)]'}`;
  const btnStyle = (active: boolean) => active ? { backgroundColor: 'var(--btn-primary-bg)' } : {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {items.map((item, i) => (
          <div
            key={`${item.file.name}-${i}`}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={() => handleDrop(i)}
            onDragEnd={handleDragEnd}
            className={`relative group border-2 p-1.5 cursor-grab active:cursor-grabbing transition-all ${
              dragOverIndex === i ? 'border-[var(--text-primary)] bg-[var(--brand-light)]' : dragIndex === i ? 'border-[#c0c0c0] opacity-50' : 'border-[#e0e0e0] bg-white hover:border-[#c0c0c0]'
            }`}
          >
            <div className="absolute top-0 left-0 bg-[var(--text-primary)] text-white text-[10px] font-bold px-1.5 py-0.5">{i + 1}</div>
            <button onClick={() => removeFile(i)} className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">✕</button>
            <img src={item.thumb} alt={item.file.name} className="w-full aspect-square object-contain" />
            <p className="text-[10px] text-center mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>{item.file.name}</p>
          </div>
        ))}
      </div>

      <p className="text-center text-[12px]" style={{ color: 'var(--text-secondary)' }}>Drag to reorder • {items.length} {items.length === 1 ? 'image' : 'images'}</p>

      <div className="flex justify-center">
        <label className="px-4 py-2 text-[14px] font-medium bg-white border border-[#e0e0e0] hover:bg-[var(--brand-light)] cursor-pointer transition-colors">
          + Add more images
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { if (e.target.files) handleFileSelect(Array.from(e.target.files)); e.target.value = ''; }} />
        </label>
      </div>

      {!result && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>Page size:</label>
            <div className="flex gap-2">
              {[{ label: 'A4', value: 'a4' }, { label: 'Letter', value: 'letter' }, { label: 'A5', value: 'a5' }].map((s) => (
                <button key={s.value} onClick={() => setPageSize(s.value)} className={btnClass(pageSize === s.value)} style={btnStyle(pageSize === s.value)}>{s.label}</button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>Orientation:</label>
            <div className="flex gap-2">
              {[{ label: 'Portrait', value: 'portrait' }, { label: 'Landscape', value: 'landscape' }].map((o) => (
                <button key={o.value} onClick={() => setOrientation(o.value)} className={btnClass(orientation === o.value)} style={btnStyle(orientation === o.value)}>{o.label}</button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>Fit:</label>
            <div className="flex gap-2">
              {[{ label: 'Fit to page', value: 'contain' }, { label: 'Fill page', value: 'cover' }, { label: 'Stretch', value: 'stretch' }].map((f) => (
                <button key={f.value} onClick={() => setFit(f.value)} className={btnClass(fit === f.value)} style={btnStyle(fit === f.value)}>{f.label}</button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>Quality:</label>
            <div className="flex gap-2">
              {[
                { label: 'Low', value: 'low' as const, hint: 'Smaller file' },
                { label: 'High', value: 'high' as const, hint: 'Balanced' },
                { label: 'Original', value: 'original' as const, hint: 'Larger file' },
              ].map((q) => (
                <button
                  key={q.value}
                  onClick={() => setQuality(q.value)}
                  className={`flex flex-col items-center px-4 py-2 text-[12px] font-medium cursor-pointer transition-colors ${
                    quality === q.value ? 'text-white' : 'bg-white text-[var(--text-secondary)] border border-[#e0e0e0] hover:bg-[var(--brand-light)]'
                  }`}
                  style={quality === q.value ? { backgroundColor: 'var(--btn-primary-bg)' } : {}}
                >
                  <span>{q.label}</span>
                  <span className={`text-[10px] mt-0.5 ${quality === q.value ? 'text-gray-400' : 'text-[var(--text-secondary)]'}`}>{q.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!result && (
        <div className="flex justify-center">
          <button
            onClick={handleConvert}
            disabled={processing}
            className="px-6 py-2.5 text-[16px] text-white transition-opacity cursor-pointer disabled:opacity-50 hover:opacity-80"
            style={{ backgroundColor: 'var(--btn-primary-bg)' }}
          >
            {processing ? 'CREATING PDF...' : `CREATE PDF (${items.length} ${items.length === 1 ? 'PAGE' : 'PAGES'})`}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 py-4 px-6 bg-green-50 border border-green-200">
            <span className="text-green-500 text-lg">✓</span>
            <p className="text-[14px] font-medium text-green-700">PDF created — {result.pageCount} {result.pageCount === 1 ? 'page' : 'pages'} — {(result.blob.size / 1024).toFixed(0)} KB</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <DownloadButton blob={result.blob} filename="filekrush-images.pdf" label="DOWNLOAD PDF" />
            <button onClick={handleReset} className="px-6 py-2.5 text-[16px] border cursor-pointer hover:bg-[var(--brand-light)] transition-colors" style={{ borderColor: 'var(--btn-secondary-border)', color: 'var(--btn-secondary-text)' }}>START OVER</button>
          </div>
        </div>
      )}
    </div>
  );
}

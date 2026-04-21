import { useState, useCallback, useEffect } from 'react';
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

  const removeFile = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newItems = [...items];
    const [moved] = newItems.splice(dragIndex, 1);
    newItems.splice(index, 0, moved);
    setItems(newItems);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const qualityMap = {
    original: 1.0,
    high: 0.8,
    low: 0.4,
  };

  const handleConvert = useCallback(async () => {
    if (items.length === 0) return;
    setProcessing(true);
    try {
      const res = await imagesToPdf(
        items.map((i) => i.file),
        { pageSize, orientation, fit, quality: qualityMap[quality] }
      );
      setResult(res);
    } catch (err) {
      console.error('PDF conversion failed:', err);
    }
    setProcessing(false);
  }, [items, pageSize, orientation, fit, quality]);

  const handleReset = useCallback(() => {
    setItems([]);
    setResult(null);
  }, []);

  if (items.length === 0) {
    return (
      <FileDropZone
        accept={['image/jpeg', 'image/png', 'image/webp']}
        multiple={true}
        onFileSelect={handleFileSelect}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Thumbnail grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {items.map((item, i) => (
          <div
            key={`${item.file.name}-${i}`}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={() => handleDrop(i)}
            onDragEnd={handleDragEnd}
            className={`relative group rounded-xl border-2 p-1.5 cursor-grab active:cursor-grabbing transition-all ${
              dragOverIndex === i
                ? 'border-[var(--brand-primary)] bg-[var(--brand-light)]'
                : dragIndex === i
                ? 'border-gray-300 opacity-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {/* Page number */}
            <div className="absolute top-0 left-0 bg-gray-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-tl-lg rounded-br-lg">
              {i + 1}
            </div>

            {/* Remove button */}
            <button
              onClick={() => removeFile(i)}
              className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-tr-lg rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              ✕
            </button>

            {/* Thumbnail */}
            <img
              src={item.thumb}
              alt={item.file.name}
              className="w-full aspect-square object-contain rounded-lg"
            />

            {/* Filename */}
            <p className="text-[10px] text-gray-400 text-center mt-1 truncate">
              {item.file.name}
            </p>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-400">
        Drag to reorder • {items.length} {items.length === 1 ? 'image' : 'images'}
      </p>

      {/* Add more files */}
      <div className="flex justify-center">
        <label className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors">
          + Add more images
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFileSelect(Array.from(e.target.files));
              e.target.value = '';
            }}
          />
        </label>
      </div>

      {/* Options */}
      {!result && (
        <div className="flex flex-col items-center gap-4">
          {/* Page size */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500">Page size:</label>
            <div className="flex gap-2">
              {[
                { label: 'A4', value: 'a4' },
                { label: 'Letter', value: 'letter' },
                { label: 'A5', value: 'a5' },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => setPageSize(s.value)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    pageSize === s.value ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={pageSize === s.value ? { backgroundColor: 'var(--brand-primary)' } : {}}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orientation */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500">Orientation:</label>
            <div className="flex gap-2">
              {[
                { label: 'Portrait', value: 'portrait' },
                { label: 'Landscape', value: 'landscape' },
              ].map((o) => (
                <button
                  key={o.value}
                  onClick={() => setOrientation(o.value)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    orientation === o.value ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={orientation === o.value ? { backgroundColor: 'var(--brand-primary)' } : {}}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fit mode */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500">Fit:</label>
            <div className="flex gap-2">
              {[
                { label: 'Fit to page', value: 'contain' },
                { label: 'Fill page', value: 'cover' },
                { label: 'Stretch', value: 'stretch' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFit(f.value)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    fit === f.value ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={fit === f.value ? { backgroundColor: 'var(--brand-primary)' } : {}}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500">Quality:</label>
            <div className="flex gap-2">
              {[
                { label: 'Low', value: 'low' as const, hint: 'Smaller file' },
                { label: 'High', value: 'high' as const, hint: 'Balanced' },
                { label: 'Original', value: 'original' as const, hint: 'Larger file' },
              ].map((q) => (
                <button
                  key={q.value}
                  onClick={() => setQuality(q.value)}
                  className={`flex flex-col items-center px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    quality === q.value ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={quality === q.value ? { backgroundColor: 'var(--brand-primary)' } : {}}
                >
                  <span>{q.label}</span>
                  <span className={`text-[10px] mt-0.5 ${quality === q.value ? 'text-blue-100' : 'text-gray-400'}`}>
                    {q.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Convert button */}
      {!result && (
        <div className="flex justify-center">
          <button
            onClick={handleConvert}
            disabled={processing}
            className="px-8 py-3 rounded-xl text-white font-semibold text-base transition-colors cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            {processing ? 'Creating PDF...' : `Create PDF (${items.length} ${items.length === 1 ? 'page' : 'pages'})`}
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 py-4 px-6 rounded-xl bg-green-50 border border-green-200">
            <span className="text-green-500 text-lg">✓</span>
            <p className="text-sm font-medium text-green-700">
              PDF created — {result.pageCount} {result.pageCount === 1 ? 'page' : 'pages'} — {(result.blob.size / 1024).toFixed(0)} KB
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <DownloadButton
              blob={result.blob}
              filename="filekrush-images.pdf"
              label="Download PDF"
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
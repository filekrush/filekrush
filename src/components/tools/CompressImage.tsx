import { useState, useCallback } from 'react';
import FileDropZone from '../ui/FileDropZone';
import DownloadButton from '../ui/DownloadButton';
import BeforeAfter from '../ui/BeforeAfter';
import { compressToSize } from '../../lib/compress.js';

interface CompressImageProps {
  defaultTargetKB?: number;
}

export default function CompressImage({ defaultTargetKB = 100 }: CompressImageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [targetKB, setTargetKB] = useState(defaultTargetKB);
  const [result, setResult] = useState<{ blob: Blob; quality: number; originalSize: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = useCallback((files: File[]) => {
    const f = files[0];
    setFile(f);
    setResult(null);
    setPreview(URL.createObjectURL(f));
  }, []);

  const handleCompress = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const res = await compressToSize(file, targetKB);
      setResult(res);
    } catch (err) {
      console.error('Compression failed:', err);
    }
    setProcessing(false);
  }, [file, targetKB]);

  const handleReset = useCallback(() => {
    setFile(null);
    setResult(null);
    setPreview(null);
  }, []);

  // No file selected yet — show drop zone
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
      {/* Preview */}
      {preview && (
        <div className="flex justify-center">
          <img
            src={preview}
            alt="Preview"
            className="max-h-64 rounded-lg border border-gray-200 object-contain"
          />
        </div>
      )}

      {/* File info */}
      <div className="text-center text-sm text-gray-500">
        {file.name} — {(file.size / 1024).toFixed(1)} KB
      </div>

      {/* Target size control */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <label className="text-sm font-medium text-gray-700">Target size:</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={targetKB}
            onChange={(e) => setTargetKB(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center text-sm focus:outline-none focus:border-[var(--brand-primary)]"
          />
          <span className="text-sm text-gray-500">KB</span>
        </div>

        {/* Quick presets */}
        <div className="flex gap-2">
          {[20, 50, 100, 200, 500].map((kb) => (
            <button
              key={kb}
              onClick={() => setTargetKB(kb)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                targetKB === kb
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={targetKB === kb ? { backgroundColor: 'var(--brand-primary)' } : {}}
            >
              {kb}KB
            </button>
          ))}
        </div>
      </div>

      {/* Compress button */}
      {!result && (
        <div className="flex justify-center">
          <button
            onClick={handleCompress}
            disabled={processing}
            className="px-8 py-3 rounded-xl text-white font-semibold text-base transition-colors cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            {processing ? 'Compressing...' : 'Compress'}
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <BeforeAfter originalSize={result.originalSize} compressedSize={result.blob.size} />

          <div className="text-center text-sm text-gray-400">
            Quality: {result.quality}%
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <DownloadButton
              blob={result.blob}
              filename={`filekrush-${file.name}`}
              label="Download Compressed Image"
            />
            <button
              onClick={handleReset}
              className="px-6 py-3 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Compress Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

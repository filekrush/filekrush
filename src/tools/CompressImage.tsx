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
      {preview && (
        <div className="flex justify-center">
          <img src={preview} alt="Preview" className="max-h-64 border border-[#e0e0e0] object-contain" />
        </div>
      )}

      <div className="text-center text-[14px]" style={{ color: 'var(--text-secondary)' }}>
        {file.name} — {(file.size / 1024).toFixed(1)} KB
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <label className="text-[14px]" style={{ color: 'var(--text-primary)' }}>Target size:</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={targetKB}
            onChange={(e) => setTargetKB(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-24 px-3 py-2 border border-[#c0c0c0] text-center text-[14px] focus:outline-none focus:border-[var(--text-primary)] bg-white"
          />
          <span className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>KB</span>
        </div>

        <div className="flex gap-2">
          {[20, 50, 100, 200, 500].map((kb) => (
            <button
              key={kb}
              onClick={() => setTargetKB(kb)}
              className={`px-3 py-1 text-[12px] font-medium transition-colors cursor-pointer ${
                targetKB === kb
                  ? 'text-white'
                  : 'bg-white text-[var(--text-secondary)] hover:bg-[var(--brand-light)] border border-[#e0e0e0]'
              }`}
              style={targetKB === kb ? { backgroundColor: 'var(--btn-primary-bg)' } : {}}
            >
              {kb}KB
            </button>
          ))}
        </div>
      </div>

      {!result && (
        <div className="flex justify-center">
          <button
            onClick={handleCompress}
            disabled={processing}
            className="px-6 py-2.5 text-[16px] text-white transition-opacity cursor-pointer disabled:opacity-50 hover:opacity-80"
            style={{ backgroundColor: 'var(--btn-primary-bg)' }}
          >
            {processing ? 'COMPRESSING...' : 'COMPRESS'}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <BeforeAfter originalSize={result.originalSize} compressedSize={result.blob.size} />

          <div className="text-center text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            Quality: {result.quality}%
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <DownloadButton
              blob={result.blob}
              filename={`filekrush-${file.name}`}
              label="DOWNLOAD COMPRESSED IMAGE"
            />
            <button
              onClick={handleReset}
              className="px-6 py-2.5 text-[16px] border cursor-pointer hover:bg-[var(--brand-light)] transition-colors"
              style={{ borderColor: 'var(--btn-secondary-border)', color: 'var(--btn-secondary-text)' }}
            >
              COMPRESS ANOTHER
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

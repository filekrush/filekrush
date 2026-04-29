import { useState, useCallback } from 'react';
import FileDropZone from '../ui/FileDropZone';
import DownloadButton from '../ui/DownloadButton';
import BeforeAfter from '../ui/BeforeAfter';
import { compressPdf } from '../../lib/compress-pdf.js';

interface CompressPdfProps {
  defaultLevel?: 'low' | 'medium' | 'high';
}

export default function CompressPdf({ defaultLevel = 'medium' }: CompressPdfProps) {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<'low' | 'medium' | 'high'>(defaultLevel);
  const [result, setResult] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  const handleFileSelect = useCallback((files: File[]) => {
    setFile(files[0]);
    setResult(null);
  }, []);

  const handleCompress = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const res = await compressPdf(file, level);
      setResult(res);
    } catch (err) {
      console.error('PDF compression failed:', err);
    }
    setProcessing(false);
  }, [file, level]);

  const handleReset = useCallback(() => {
    setFile(null);
    setResult(null);
  }, []);

  const levels = [
    { value: 'low' as const, label: 'Maximum', hint: 'Smallest file', desc: 'Aggressive compression. Best for emailing.' },
    { value: 'medium' as const, label: 'Balanced', hint: 'Good balance', desc: 'Recommended for most use cases.' },
    { value: 'high' as const, label: 'Light', hint: 'Best quality', desc: 'Minimal compression. Preserves quality.' },
  ];

  if (!file) {
    return (
      <FileDropZone
        accept={['application/pdf', '.pdf']}
        onFileSelect={handleFileSelect}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center text-[14px]" style={{ color: 'var(--text-secondary)' }}>
        {file.name} — {(file.size / (1024 * 1024)).toFixed(2)} MB
      </div>

      {!result && (
        <div className="flex flex-col items-center gap-4">
          <label className="text-[14px]" style={{ color: 'var(--text-primary)' }}>Compression level:</label>
          <div className="flex gap-3">
            {levels.map((l) => (
              <button
                key={l.value}
                onClick={() => setLevel(l.value)}
                className={`flex flex-col items-center px-5 py-3 text-[14px] font-medium cursor-pointer transition-colors ${
                  level === l.value ? 'text-white' : 'bg-white text-[var(--text-secondary)] border border-[#e0e0e0] hover:bg-[var(--brand-light)]'
                }`}
                style={level === l.value ? { backgroundColor: 'var(--btn-primary-bg)' } : {}}
              >
                <span className="font-semibold">{l.label}</span>
                <span className={`text-[11px] mt-0.5 ${level === l.value ? 'text-gray-400' : 'text-[var(--text-secondary)]'}`}>{l.hint}</span>
              </button>
            ))}
          </div>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            {levels.find(l => l.value === level)?.desc}
          </p>
        </div>
      )}

      {!result && (
        <div className="flex justify-center">
          <button
            onClick={handleCompress}
            disabled={processing}
            className="px-6 py-2.5 text-[16px] text-white transition-opacity cursor-pointer disabled:opacity-50 hover:opacity-80"
            style={{ backgroundColor: 'var(--btn-primary-bg)' }}
          >
            {processing ? 'COMPRESSING...' : 'COMPRESS PDF'}
          </button>
        </div>
      )}

      {processing && (
        <p className="text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          This may take a moment for large PDFs...
        </p>
      )}

      {result && (
        <div className="space-y-4">
          {result.noChange ? (
            <div className="flex items-center justify-center gap-3 py-4 px-6 bg-white border border-[#e0e0e0]">
              <span className="text-[18px]">ℹ️</span>
              <div>
                <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  This PDF couldn't be compressed further
                </p>
                <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                  This typically happens with text-only PDFs or PDFs that are already optimized. The tool works best on scanned documents and image-heavy PDFs.
                </p>
              </div>
            </div>
          ) : (
            <>
              <BeforeAfter originalSize={result.originalSize} compressedSize={result.blob.size} />

              {result.pageCount > 0 && (
                <p className="text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  {result.pageCount} {result.pageCount === 1 ? 'page' : 'pages'} processed
                </p>
              )}
            </>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <DownloadButton
              blob={result.blob}
              filename={`filekrush-${file.name}`}
              label={result.noChange ? 'DOWNLOAD ORIGINAL' : 'DOWNLOAD COMPRESSED PDF'}
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

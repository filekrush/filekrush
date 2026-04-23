import { useState, useCallback } from 'react';
import FileDropZone from '../ui/FileDropZone';
import DownloadButton from '../ui/DownloadButton';
import BeforeAfter from '../ui/BeforeAfter';
import { convertFormat } from '../../lib/convert.js';

const formats = [
  { label: 'JPG', mime: 'image/jpeg', ext: 'jpg' },
  { label: 'PNG', mime: 'image/png', ext: 'png' },
  { label: 'WebP', mime: 'image/webp', ext: 'webp' },
  { label: 'HEIC', mime: 'image/heic', ext: 'heic' },
];

interface ConvertFormatProps {
  fromFormat?: string;
  toFormat?: string;
}

export default function ConvertFormat({ fromFormat, toFormat }: ConvertFormatProps) {
  const [file, setFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState(toFormat || 'image/jpeg');
  const [quality, setQuality] = useState(92);
  const [result, setResult] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = useCallback((files: File[]) => {
    const f = files[0];
    setFile(f);
    setResult(null);
    setPreview(URL.createObjectURL(f));
    if (!toFormat) {
      if (f.type === 'image/jpeg') setTargetFormat('image/png');
      else if (f.type === 'image/png') setTargetFormat('image/jpeg');
      else setTargetFormat('image/jpeg');
    }
  }, [toFormat]);

  const handleConvert = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const res = await convertFormat(file, targetFormat, quality / 100);
      setResult(res);
    } catch (err) {
      console.error('Conversion failed:', err);
    }
    setProcessing(false);
  }, [file, targetFormat, quality]);

  const handleReset = useCallback(() => {
    setFile(null);
    setResult(null);
    setPreview(null);
  }, []);

  const getExtension = (mime: string) => formats.find((f) => f.mime === mime)?.ext || 'img';
  const getLabel = (mime: string) => formats.find((f) => f.mime === mime)?.label || mime;

  if (!file) {
    return (
      <FileDropZone
        accept={fromFormat ? [fromFormat, '.heic', '.heif'] : ['image/jpeg', 'image/png', 'image/webp', '.heic', '.heif']}
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
        {file.name} — {getLabel(file.type || 'image/heic')} — {(file.size / 1024).toFixed(1)} KB
      </div>

      {!result && (
        <div className="flex flex-col items-center gap-4">
          <label className="text-[14px]" style={{ color: 'var(--text-primary)' }}>Convert to:</label>
          <div className="flex gap-2">
            {formats
              .filter((f) => f.mime !== file.type && f.mime !== 'image/heic')
              .map((f) => (
                <button
                  key={f.mime}
                  onClick={() => setTargetFormat(f.mime)}
                  className={`px-5 py-2 text-[14px] font-medium cursor-pointer transition-colors ${
                    targetFormat === f.mime ? 'text-white' : 'bg-white text-[var(--text-secondary)] border border-[#e0e0e0] hover:bg-[var(--brand-light)]'
                  }`}
                  style={targetFormat === f.mime ? { backgroundColor: 'var(--btn-primary-bg)' } : {}}
                >
                  {f.label}
                </button>
              ))}
          </div>

          {(targetFormat === 'image/jpeg' || targetFormat === 'image/webp') && (
            <div className="flex items-center gap-3">
              <label className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>Quality:</label>
              <input type="range" min={10} max={100} value={quality} onChange={(e) => setQuality(parseInt(e.target.value))} className="w-40" />
              <span className="text-[14px] w-10" style={{ color: 'var(--text-primary)' }}>{quality}%</span>
            </div>
          )}
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
            {processing ? 'CONVERTING...' : `CONVERT TO ${getLabel(targetFormat)}`}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <BeforeAfter originalSize={result.originalSize} compressedSize={result.blob.size} />

          <div className="text-center text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            {getLabel(result.originalFormat)} → {getLabel(result.newFormat)}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <DownloadButton
              blob={result.blob}
              filename={`filekrush-${file.name.replace(/\.[^.]+$/, '')}.${getExtension(targetFormat)}`}
              label={`DOWNLOAD ${getLabel(targetFormat)}`}
            />
            <button
              onClick={handleReset}
              className="px-6 py-2.5 text-[16px] border cursor-pointer hover:bg-[var(--brand-light)] transition-colors"
              style={{ borderColor: 'var(--btn-secondary-border)', color: 'var(--btn-secondary-text)' }}
            >
              CONVERT ANOTHER
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

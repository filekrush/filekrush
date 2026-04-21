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

    // Auto-select a different format than the input
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
          <img src={preview} alt="Preview" className="max-h-64 rounded-lg border border-gray-200 object-contain" />
        </div>
      )}

      <div className="text-center text-sm text-gray-500">
        {file.name} — {getLabel(file.type)} — {(file.size / 1024).toFixed(1)} KB
      </div>

      {/* Format selector */}
      {!result && (
        <div className="flex flex-col items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Convert to:</label>
          <div className="flex gap-2">
            {formats
              .filter((f) => f.mime !== file.type && f.mime !== 'image/heic')
              .map((f) => (
                <button
                  key={f.mime}
                  onClick={() => setTargetFormat(f.mime)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                    targetFormat === f.mime ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={targetFormat === f.mime ? { backgroundColor: 'var(--brand-primary)' } : {}}
                >
                  {f.label}
                </button>
              ))}
          </div>

          {/* Quality slider — only for lossy formats */}
          {(targetFormat === 'image/jpeg' || targetFormat === 'image/webp') && (
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-500">Quality:</label>
              <input
                type="range"
                min={10}
                max={100}
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                className="w-40"
              />
              <span className="text-sm font-medium text-gray-700 w-10">{quality}%</span>
            </div>
          )}
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
            {processing ? 'Converting...' : `Convert to ${getLabel(targetFormat)}`}
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <BeforeAfter originalSize={result.originalSize} compressedSize={result.blob.size} />

          <div className="text-center text-sm text-gray-400">
            {getLabel(result.originalFormat)} → {getLabel(result.newFormat)}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <DownloadButton
              blob={result.blob}
              filename={`filekrush-${file.name.replace(/\.[^.]+$/, '')}.${getExtension(targetFormat)}`}
              label={`Download ${getLabel(targetFormat)}`}
            />
            <button
              onClick={handleReset}
              className="px-6 py-3 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Convert Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useCallback } from 'react';
import FileDropZone from '../ui/FileDropZone';
import DownloadButton from '../ui/DownloadButton';
import { readExif, removeExif } from '../../lib/exif.js';

interface ExifToolProps {
  mode?: 'view' | 'remove' | 'both';
}

export default function ExifTool({ mode = 'both' }: ExifToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [exifData, setExifData] = useState<any>(null);
  const [cleanBlob, setCleanBlob] = useState<Blob | null>(null);
  const [processing, setProcessing] = useState(false);
  const [tab, setTab] = useState<'view' | 'remove'>(mode === 'remove' ? 'remove' : 'view');

  const handleFileSelect = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setCleanBlob(null);
    setPreview(URL.createObjectURL(f));
    setProcessing(true);
    const data = await readExif(f);
    setExifData(data);
    setProcessing(false);
  }, []);

  const handleRemove = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
    const result = await removeExif(file);
    setCleanBlob(result.blob);
    setProcessing(false);
  }, [file]);

  const handleReset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setExifData(null);
    setCleanBlob(null);
  }, []);

  if (!file) {
    return <FileDropZone accept={['image/jpeg', 'image/png', 'image/webp', '.heic', '.heif']} onFileSelect={handleFileSelect} />;
  }

  return (
    <div className="space-y-6">
      {preview && (
        <div className="flex justify-center">
          <img src={preview} alt="Preview" className="max-h-48 border border-[#e0e0e0] object-contain" />
        </div>
      )}

      <div className="text-center text-[14px]" style={{ color: 'var(--text-secondary)' }}>
        {file.name} — {(file.size / 1024).toFixed(1)} KB
      </div>

      {mode === 'both' && (
        <div className="flex justify-center gap-2">
          {(['view', 'remove'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-[14px] font-medium cursor-pointer transition-colors ${
                tab === t ? 'text-white' : 'bg-white text-[var(--text-secondary)] border border-[#e0e0e0] hover:bg-[var(--brand-light)]'
              }`}
              style={tab === t ? { backgroundColor: 'var(--btn-primary-bg)' } : {}}
            >
              {t === 'view' ? 'View Metadata' : 'Remove Metadata'}
            </button>
          ))}
        </div>
      )}

      {processing && <p className="text-center text-[14px]" style={{ color: 'var(--text-secondary)' }}>Processing...</p>}

      {tab === 'view' && exifData && !processing && (
        <div className="space-y-4">
          {exifData.entries.length === 0 ? (
            <div className="text-center py-6 px-4 bg-white border border-[#e0e0e0]">
              <p style={{ color: 'var(--text-primary)' }}>No metadata found</p>
              <p className="text-[14px] mt-1" style={{ color: 'var(--text-secondary)' }}>This image has no EXIF data, or the format doesn't support it.</p>
            </div>
          ) : (
            <>
              {exifData.hasGPS && (
                <div className="flex items-center justify-center gap-2 py-3 px-4 border border-red-200 bg-red-50">
                  <span className="text-red-500 text-lg">⚠️</span>
                  <div>
                    <p className="text-[14px] font-medium text-red-700">This image contains GPS location data</p>
                    {exifData.lat && exifData.lng && (
                      <p className="text-[12px] text-red-500 mt-0.5">Coordinates: {exifData.lat}, {exifData.lng}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="border border-[#e0e0e0] overflow-hidden">
                <table className="w-full text-[14px]">
                  <thead>
                    <tr className="bg-[var(--bg)] border-b border-[#e0e0e0]">
                      <th className="text-left py-2 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Property</th>
                      <th className="text-left py-2 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exifData.entries.map((entry: any, i: number) => (
                      <tr key={i} className={`border-b border-[#f0f0f0] ${entry.isGPS ? 'bg-red-50' : i % 2 === 0 ? 'bg-white' : 'bg-[var(--bg)]'}`}>
                        <td className={`py-2 px-4 font-medium ${entry.isGPS ? 'text-red-700' : ''}`} style={!entry.isGPS ? { color: 'var(--text-primary)' } : {}}>{entry.name}</td>
                        <td className={`py-2 px-4 ${entry.isGPS ? 'text-red-600' : ''}`} style={!entry.isGPS ? { color: 'var(--text-secondary)' } : {}}>{entry.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-center text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                {exifData.entries.length} properties found{exifData.hasGPS && ' • GPS data detected — consider removing before sharing'}
              </p>
            </>
          )}
        </div>
      )}

      {tab === 'remove' && !processing && (
        <div className="space-y-4">
          {!cleanBlob ? (
            <div className="text-center space-y-3">
              {exifData?.hasGPS && (
                <div className="flex items-center justify-center gap-2 py-3 px-4 border border-red-200 bg-red-50">
                  <span className="text-red-500 text-lg">⚠️</span>
                  <p className="text-[14px] font-medium text-red-700">This image contains GPS location data that will be removed.</p>
                </div>
              )}
              <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                This will strip all EXIF metadata including camera info, GPS location, date, and timestamps.
              </p>
              <button
                onClick={handleRemove}
                className="px-6 py-2.5 text-[16px] text-white transition-opacity cursor-pointer hover:opacity-80"
                style={{ backgroundColor: 'var(--btn-primary-bg)' }}
              >
                REMOVE ALL METADATA
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 py-4 px-6 bg-green-50 border border-green-200">
                <span className="text-green-500 text-lg">✓</span>
                <p className="text-[14px] font-medium text-green-700">All metadata removed successfully</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <DownloadButton blob={cleanBlob} filename={`filekrush-clean-${file.name}`} label="DOWNLOAD CLEAN IMAGE" />
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 text-[16px] border cursor-pointer hover:bg-[var(--brand-light)] transition-colors"
                  style={{ borderColor: 'var(--btn-secondary-border)', color: 'var(--btn-secondary-text)' }}
                >
                  PROCESS ANOTHER
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!cleanBlob && (
        <div className="flex justify-center">
          <button onClick={handleReset} className="text-[14px] cursor-pointer" style={{ color: 'var(--text-secondary)' }}>← Choose a different image</button>
        </div>
      )}
    </div>
  );
}

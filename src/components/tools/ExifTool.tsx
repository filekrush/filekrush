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
    return (
      <FileDropZone
        accept={['image/jpeg', 'image/png', 'image/webp', '.heic', '.heif']}
        onFileSelect={handleFileSelect}
      />
    );
  }

  return (
    <div className="space-y-6">
      {preview && (
        <div className="flex justify-center">
          <img src={preview} alt="Preview" className="max-h-48 rounded-lg border border-gray-200 object-contain" />
        </div>
      )}

      <div className="text-center text-sm text-gray-500">
        {file.name} — {(file.size / 1024).toFixed(1)} KB
      </div>

      {/* Tab toggle */}
      {mode === 'both' && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setTab('view')}
            className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
              tab === 'view' ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={tab === 'view' ? { backgroundColor: 'var(--brand-primary)' } : {}}
          >
            View Metadata
          </button>
          <button
            onClick={() => setTab('remove')}
            className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
              tab === 'remove' ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={tab === 'remove' ? { backgroundColor: 'var(--brand-primary)' } : {}}
          >
            Remove Metadata
          </button>
        </div>
      )}

      {processing && (
        <p className="text-center text-sm text-gray-400">Processing...</p>
      )}

      {/* View tab */}
      {tab === 'view' && exifData && !processing && (
        <div className="space-y-4">
          {exifData.entries.length === 0 ? (
            <div className="text-center py-6 px-4 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-gray-500 font-medium">No metadata found</p>
              <p className="text-sm text-gray-400 mt-1">This image has no EXIF data, or the format doesn't support it.</p>
            </div>
          ) : (
            <>
              {exifData.hasGPS && (
                <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-red-200 bg-red-50">
                  <span className="text-red-500 text-lg">⚠️</span>
                  <div>
                    <p className="text-sm font-medium text-red-700">This image contains GPS location data</p>
                    {exifData.lat && exifData.lng && (
                      <p className="text-xs text-red-500 mt-0.5">
                        Coordinates: {exifData.lat}, {exifData.lng}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-2 px-4 font-medium text-gray-500">Property</th>
                      <th className="text-left py-2 px-4 font-medium text-gray-500">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exifData.entries.map((entry: any, i: number) => (
                      <tr key={i} className={`border-b border-gray-100 ${entry.isGPS ? 'bg-red-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className={`py-2 px-4 font-medium ${entry.isGPS ? 'text-red-700' : 'text-gray-700'}`}>
                          {entry.name}
                        </td>
                        <td className={`py-2 px-4 ${entry.isGPS ? 'text-red-600' : 'text-gray-500'}`}>
                          {entry.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-center text-xs text-gray-400">
                {exifData.entries.length} properties found
                {exifData.hasGPS && ' • GPS data detected — consider removing before sharing'}
              </p>
            </>
          )}
        </div>
      )}

      {/* Remove tab */}
      {tab === 'remove' && !processing && (
        <div className="space-y-4">
          {!cleanBlob ? (
            <div className="text-center space-y-3">
              {exifData?.hasGPS && (
                <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-red-200 bg-red-50">
                  <span className="text-red-500 text-lg">⚠️</span>
                  <p className="text-sm font-medium text-red-700">
                    This image contains GPS location data that will be removed.
                  </p>
                </div>
              )}
              <p className="text-sm text-gray-500">
                This will strip all EXIF metadata including camera info, GPS location, date, and timestamps.
              </p>
              <button
                onClick={handleRemove}
                className="px-8 py-3 rounded-xl text-white font-semibold text-base transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                Remove All Metadata
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 py-4 px-6 rounded-xl bg-green-50 border border-green-200">
                <span className="text-green-500 text-lg">✓</span>
                <p className="text-sm font-medium text-green-700">
                  All metadata removed successfully
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <DownloadButton
                  blob={cleanBlob}
                  filename={`filekrush-clean-${file.name}`}
                  label="Download Clean Image"
                />
                <button
                  onClick={handleReset}
                  className="px-6 py-3 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Process Another
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Start over (always visible) */}
      {!cleanBlob && (
        <div className="flex justify-center">
          <button
            onClick={handleReset}
            className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            ← Choose a different image
          </button>
        </div>
      )}
    </div>
  );
}
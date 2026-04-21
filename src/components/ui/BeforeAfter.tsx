interface BeforeAfterProps {
  originalSize: number;
  compressedSize: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function BeforeAfter({ originalSize, compressedSize }: BeforeAfterProps) {
  const savings = Math.round((1 - compressedSize / originalSize) * 100);

  return (
    <div className="flex items-center justify-center gap-6 py-4 px-6 rounded-xl bg-gray-50 border border-gray-200">
      <div className="text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wide">Before</p>
        <p className="text-lg font-semibold text-gray-700">{formatSize(originalSize)}</p>
      </div>

      <div className="text-center">
        <svg className="w-6 h-6 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </div>

      <div className="text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wide">After</p>
        <p className="text-lg font-semibold" style={{ color: 'var(--success)' }}>{formatSize(compressedSize)}</p>
      </div>

      <div className="text-center ml-2 px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--brand-light)' }}>
        <p className="text-sm font-bold" style={{ color: 'var(--brand-dark)' }}>-{savings}%</p>
      </div>
    </div>
  );
}

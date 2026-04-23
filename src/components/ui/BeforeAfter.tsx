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
    <div className="flex items-center justify-center gap-8 py-5 px-8 bg-white border border-[#e0e0e0]">
      <div className="text-center">
        <p className="text-[12px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Before</p>
        <p className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>{formatSize(originalSize)}</p>
      </div>

      <div>
        <svg className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </div>

      <div className="text-center">
        <p className="text-[12px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>After</p>
        <p className="text-[18px] font-semibold" style={{ color: 'var(--success)' }}>{formatSize(compressedSize)}</p>
      </div>

      <div className="px-3 py-1 bg-[var(--brand-light)]">
        <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>-{savings}%</p>
      </div>
    </div>
  );
}

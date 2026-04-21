interface DownloadButtonProps {
  blob: Blob | null;
  filename: string;
  label?: string;
}

export default function DownloadButton({ blob, filename, label = 'Download' }: DownloadButtonProps) {
  if (!blob) return null;

  const handleDownload = () => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      className="w-full sm:w-auto px-8 py-3 rounded-xl text-white font-semibold text-base transition-colors cursor-pointer"
      style={{ backgroundColor: 'var(--accent)', }}
      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
    >
      {label}
    </button>
  );
}

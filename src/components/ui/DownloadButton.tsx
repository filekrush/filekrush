interface DownloadButtonProps {
  blob: Blob | null;
  filename: string;
  label?: string;
}

export default function DownloadButton({ blob, filename, label = 'DOWNLOAD' }: DownloadButtonProps) {
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
      className="px-6 py-2.5 text-[16px] text-white transition-opacity cursor-pointer hover:opacity-80"
      style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
    >
      {label}
    </button>
  );
}

import { useState, useRef, useCallback } from 'react';

interface FileDropZoneProps {
  accept: string[];
  maxSizeMB?: number;
  multiple?: boolean;
  onFileSelect: (files: File[]) => void;
}

export default function FileDropZone({
  accept,
  maxSizeMB = 50,
  multiple = false,
  onFileSelect,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setError(null);

      const valid: File[] = [];
      for (const file of Array.from(files)) {
        if (!accept.includes(file.type)) {
          setError(`Unsupported file type: ${file.name}`);
          return;
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
          setError(`File too large: ${file.name} (max ${maxSizeMB}MB)`);
          return;
        }
        valid.push(file);
        if (!multiple) break;
      }
      if (valid.length > 0) onFileSelect(valid);
    },
    [accept, maxSizeMB, multiple, onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      validateAndSelect(e.dataTransfer.files);
    },
    [validateAndSelect]
  );

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`
        relative cursor-pointer rounded-2xl border-2 border-dashed p-12
        flex flex-col items-center justify-center gap-3 transition-all
        ${isDragging
          ? 'border-[var(--brand-primary)] bg-[var(--brand-light)]'
          : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
        }
      `}
    >
      {/* Upload Icon */}
      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 16V4m0 0L8 8m4-4l4 4M4 20h16"
        />
      </svg>

      <div className="text-center">
        <p className="text-base font-medium text-gray-700">
          {isDragging ? 'Drop your file here' : 'Drop a file here or click to browse'}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {accept.filter((t) => t.includes('/')).map((t) => t.split('/')[1].toUpperCase()).join(', ')} — up to {maxSizeMB}MB
        </p>
      </div>

      {error && (
        <p className="text-sm font-medium" style={{ color: 'var(--error)' }}>
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept.join(',')}
        multiple={multiple}
        className="hidden"
        onChange={(e) => validateAndSelect(e.target.files)}
      />
    </div>
  );
}

'use client';

interface DownloadButtonProps {
  data: string;
  filename: string;
  mimeType?: string;
  label?: string;
}

export default function DownloadButton({ data, filename, mimeType = 'application/json', label = 'Download' }: DownloadButtonProps) {
  const handleDownload = () => {
    const blob = new Blob([data], { type: mimeType });
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
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white hover:bg-primary-hover rounded-lg transition-colors"
    >
      {label}
    </button>
  );
}

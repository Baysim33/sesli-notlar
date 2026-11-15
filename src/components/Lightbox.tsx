import { X, Download } from 'lucide-react';
import { useEffect } from 'react';

interface LightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export default function Lightbox({ src, alt, onClose }: LightboxProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = alt || 'fotoğraf';
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full bg-neutral-800/80 border border-neutral-700 flex items-center justify-center text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
        aria-label="Kapat"
      >
        <X size={22} />
      </button>

      {/* Download button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDownload();
        }}
        className="absolute top-4 right-20 z-10 w-11 h-11 rounded-full bg-neutral-800/80 border border-neutral-700 flex items-center justify-center text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
        aria-label="İndir"
      >
        <Download size={20} />
      </button>

      {/* Image */}
      <div
        className="relative max-w-[95vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl shadow-2xl animate-zoom-in"
        />
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, Download, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

interface JournalPhotoLightboxProps {
  photos: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onDeletePhoto?: (photoIndex: number) => void;
}

export const JournalPhotoLightbox: React.FC<JournalPhotoLightboxProps> = ({
  photos,
  initialIndex = 0,
  isOpen,
  onClose,
  onDeletePhoto,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex] || photos[0];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
    setScale(1);
    setConfirmDelete(false);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
    setScale(1);
    setConfirmDelete(false);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.3, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.3, 0.7));
  };

  const handleDeleteCurrent = () => {
    if (onDeletePhoto) {
      onDeletePhoto(currentIndex);
      setConfirmDelete(false);
      if (photos.length <= 1) {
        onClose();
      } else if (currentIndex >= photos.length - 1) {
        setCurrentIndex(photos.length - 2);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      {/* Top Toolbar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-10">
        <span className="text-xs sm:text-sm font-medium bg-white/10 px-3 py-1 rounded-full">
          Memory Photo {currentIndex + 1} of {photos.length}
        </span>

        <div className="flex items-center gap-2">
          {onDeletePhoto && (
            confirmDelete ? (
              <div className="flex items-center gap-1.5 bg-rose-900/90 border border-rose-500/60 rounded-full px-2 py-1">
                <span className="text-[11px] text-rose-100 font-medium">Delete photo?</span>
                <button
                  onClick={handleDeleteCurrent}
                  className="px-2 py-0.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition-colors"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-2 rounded-full bg-rose-600/70 hover:bg-rose-600 text-white transition-colors"
                title="Delete this Photo"
              >
                <Trash2 size={18} />
              </button>
            )
          )}
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
          <a
            href={currentPhoto}
            download={`borah_memory_${currentIndex + 1}.jpg`}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Download Image"
          >
            <Download size={18} />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      {photos.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors z-10"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors z-10"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Main Image */}
      <div className="max-w-4xl max-h-[85vh] p-4 flex items-center justify-center overflow-hidden">
        <img
          src={currentPhoto}
          alt="Journal Memory"
          className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl transition-transform duration-200 cursor-zoom-in"
          style={{ transform: `scale(${scale})` }}
          onClick={handleZoomIn}
        />
      </div>
    </div>
  );
};

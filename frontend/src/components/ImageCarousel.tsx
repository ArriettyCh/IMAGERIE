import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Image {
  id: number;
  filename: string;
  originalName: string;
}

interface ImageCarouselProps {
  images: Image[];
  onClose: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ImageCarousel({ images, onClose }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') handlePrevious();
      else if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex]);

  const handlePrevious = () => setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  const handleNext = () => setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));

  if (images.length === 0) return null;
  const currentImage = images[currentIndex];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-8 right-8 p-3 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors z-[110]"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="relative w-full h-full flex flex-col items-center justify-center p-4 md:p-12 md:pb-32" onClick={e => e.stopPropagation()}>
        <button
          onClick={handlePrevious}
          className="absolute left-8 p-4 text-white/40 hover:text-white transition-colors hidden md:block z-50"
        >
          <ChevronLeft className="w-12 h-12 stroke-[1px]" />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentImage.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full h-full flex flex-col items-center justify-center gap-8"
          >
            <div className="relative flex-1 flex items-center justify-center w-full max-h-[70vh]">
              <img
                src={`${API_BASE}/uploads/${currentImage.filename}`}
                alt={currentImage.originalName}
                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
              />
            </div>

            <div className="text-center space-y-2 pb-8">
              <p className="text-white text-xl font-serif tracking-tight">{currentImage.originalName}</p>
              <p className="text-white/40 text-[10px] tracking-[0.3em] uppercase font-light">
                {currentIndex + 1} / {images.length}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          onClick={handleNext}
          className="absolute right-8 p-4 text-white/40 hover:text-white transition-colors hidden md:block z-50"
        >
          <ChevronRight className="w-12 h-12 stroke-[1px]" />
        </button>
      </div>

      {/* Fixed Thumbnail Bar at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent flex items-center justify-center px-6 overflow-hidden z-[105]">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide py-4 max-w-full px-12">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
              className={`w-12 h-16 rounded-lg overflow-hidden border-2 transition-all duration-300 flex-shrink-0 ${i === currentIndex ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'
                }`}
            >
              <img
                src={`${API_BASE}/uploads/thumbnails/${img.filename}`}
                className="w-full h-full object-cover"
                alt="thumbnail"
              />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

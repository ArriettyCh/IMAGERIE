import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import ImageCarousel from './ImageCarousel';
import TagModal from './TagModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Tag, Play, CheckCircle2, Circle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Image {
  id: number;
  filename: string;
  originalName: string;
  width: number | null;
  height: number | null;
  size: string;
  createdAt: string;
  customTags?: string | null;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ImageList() {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [showCarousel, setShowCarousel] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagImageId, setTagImageId] = useState<number | null>(null);

  const { token } = useAuthStore();
  const { addToast, showConfirm, searchQuery, setSearchQuery, isAiSearchMode, setIsAiSearchMode, setIsSearching, searchTrigger } = useUIStore();
  const navigate = useNavigate();

  const fetchImages = async (query = '') => {
    if (!token) return;
    try {
      setLoading(true);
      setIsAiSearchMode(false);
      const response = await axios.get(`${API_BASE}/api/images?search=${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setImages(response.data.data.images.map((img: any) => ({
        ...img,
        size: formatFileSize(Number(img.size))
      })));
    } catch (err: any) {
      addToast('Unable to load gallery. Please try again later.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [token]);

  // Listen for search triggers from the top bar
  useEffect(() => {
    if (searchTrigger > 0) {
      if (isAiSearchMode) {
        handleAiSearch();
      } else {
        handleNormalSearch();
      }
    }
  }, [searchTrigger]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleNormalSearch = () => {
    fetchImages(searchQuery);
  };

  const handleAiSearch = async () => {
    if (!searchQuery.trim()) {
      addToast('Please enter a search query.', 'info');
      return;
    }

    try {
      setIsSearching(true);
      const response = await axios.post(
        `${API_BASE}/api/images/search/ai`,
        { query: searchQuery },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        setImages(response.data.data.images.map((img: any) => ({
          ...img,
          size: formatFileSize(Number(img.size))
        })));
        setIsAiSearchMode(true);
        addToast(`AI found ${response.data.data.images.length} matching images.`);
      }
    } catch (err: any) {
      addToast('AI search is temporarily unavailable.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    showConfirm({
      title: 'Confirm Deletion',
      message: 'Are you sure you want to permanently remove this image from your collection? This action cannot be undone.',
      confirmLabel: 'Delete',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await axios.delete(`${API_BASE}/api/images/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          setImages(prev => prev.filter(img => img.id !== id));
          setSelectedImages(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          });
          addToast('Image removed.');
        } catch (err: any) {
          addToast('Operation failed. Please try again.', 'error');
        }
      }
    });
  };

  const handleToggleSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  return (
    <div className="space-y-8">
      {isAiSearchMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-4 mb-8"
        >
          <span className="text-[10px] tracking-[0.2em] text-accent uppercase font-medium">Showing AI search results</span>
          <button
            onClick={() => { setSearchQuery(''); fetchImages(); }}
            className="text-[10px] tracking-[0.2em] text-secondary hover:text-foreground uppercase font-light underline underline-offset-4"
          >
            Show All
          </button>
        </motion.div>
      )}

      {/* Floating Action Menu for Selections */}
      <AnimatePresence>
        {selectedImages.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 glass px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-6 border border-white/40"
          >
            <div className="text-sm font-medium pr-6 border-r border-foreground/10">
              {selectedImages.size} Selected
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowCarousel(true)}
                className="flex items-center gap-2 text-sm hover:text-accent transition-colors"
              >
                <Play className="w-4 h-4" /> Carousel
              </button>
              <button 
                onClick={() => setSelectedImages(new Set())}
                className="flex items-center gap-2 text-sm text-secondary hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gallery Grid */}
      {loading && images.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-[4/5] bg-card rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-secondary font-light tracking-widest uppercase text-xs">No matching images found</p>
        </div>
      ) : (
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
            >
              <AnimatePresence>
                {images.map((image) => (
                  <motion.div
                    layout
                key={image.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="group relative aspect-[4/5] overflow-hidden rounded-3xl bg-card"
                  >
                    <img
                      src={`${API_BASE}/uploads/thumbnails/${image.filename}`}
                      alt={image.originalName}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-[0.16, 1, 0.3, 1] group-hover:scale-110"
                      onClick={() => navigate(`/image/${image.id}`)}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `${API_BASE}/uploads/${image.filename}`;
                      }}
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-between items-end pointer-events-auto">
                        <div className="flex flex-col">
                          <span className="text-white text-xs font-light tracking-widest truncate max-w-[150px]">
                            {image.originalName}
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {image.customTags?.split(/[,\uff0c]/).filter(t => t.trim()).slice(0, 2).map((tag, idx) => (
                              <span key={idx} className="text-[8px] px-1.5 py-0.5 bg-white/10 rounded text-white/80 uppercase tracking-tighter">
                                {tag.trim()}
                              </span>
                            ))}
                            <span className="text-white/60 text-[10px] uppercase tracking-tighter">
                              {image.size}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setTagImageId(image.id); setShowTagModal(true); }}
                            className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors"
                          >
                            <Tag className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={(e) => handleDelete(image.id, e)}
                            className="p-2 bg-white/10 hover:bg-red-500/20 backdrop-blur-md rounded-full text-white hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleToggleSelect(image.id, e)}
                      className={cn(
                        "absolute top-4 right-4 p-2 rounded-full backdrop-blur-md transition-all duration-300 z-10",
                        selectedImages.has(image.id)
                          ? "bg-accent text-white scale-110"
                          : "bg-black/20 text-white opacity-0 group-hover:opacity-100"
                      )}
                    >
                      {selectedImages.has(image.id) ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
      )}

      {showCarousel && (
        <ImageCarousel
          images={images.filter(img => selectedImages.has(img.id))}
          onClose={() => setShowCarousel(false)}
        />
      )}

      {showTagModal && tagImageId && (
        <TagModal
          imageId={tagImageId}
          currentTags={images.find(img => img.id === tagImageId)?.customTags || ''}
          onClose={() => { setShowTagModal(false); setTagImageId(null); }}
          onSave={() => { fetchImages(); setShowTagModal(false); }}
        />
      )}
    </div>
  );
}

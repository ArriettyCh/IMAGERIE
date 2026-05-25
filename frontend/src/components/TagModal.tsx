import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { motion } from 'framer-motion';
import { X, Tag, Loader2, Save } from 'lucide-react';

interface TagModalProps {
  imageId: number;
  currentTags: string;
  onClose: () => void;
  onSave: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function TagModal({ imageId, currentTags, onClose, onSave }: TagModalProps) {
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const { token } = useAuthStore();
  const { addToast } = useUIStore();

  useEffect(() => {
    setTags(currentTags || '');
  }, [currentTags]);

  const handleSave = async () => {
    try {
      setLoading(true);
      // Normalize tags: replace Chinese commas and newlines with English commas
      const normalizedTags = tags
        .replace(/[\uff0c\n\r]/g, ',')
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)
        .join(',');

      await axios.patch(
        `${API_BASE}/api/images/${imageId}/tags`,
        { customTags: normalizedTags || null },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      addToast('Tags updated.');
      onSave();
    } catch (error: any) {
      addToast('Save failed. Please try again later.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-xl text-accent">
                <Tag className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-serif">Custom Tags</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors text-secondary">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] tracking-[0.2em] uppercase font-light text-secondary">Tag Keywords</label>
            <textarea
              autoFocus
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Example: travel, architecture, film look... Use commas or new lines."
              rows={4}
              className="w-full p-5 bg-card border-none rounded-2xl text-sm font-light focus:ring-1 focus:ring-foreground/10 transition-all outline-none resize-none"
            />
            <p className="text-[10px] text-secondary font-light italic leading-relaxed">
              * Separate multiple tags with commas or line breaks.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-4 text-xs tracking-widest uppercase font-light text-secondary hover:text-foreground transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-4 bg-foreground text-white rounded-2xl text-xs tracking-widest uppercase font-medium flex items-center justify-center gap-3 hover:bg-foreground/90 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Update Collection</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

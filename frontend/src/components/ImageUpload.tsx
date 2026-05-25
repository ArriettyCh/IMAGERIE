import { useState, useRef } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  onUploadSuccess?: () => void;
}

export default function ImageUpload({ onUploadSuccess }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { token } = useAuthStore();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must not exceed 10MB.');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      await axios.post('/api/images/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      if (onUploadSuccess) {
        onUploadSuccess();
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      setError(serverMsg && serverMsg.length <= 60 ? serverMsg : 'Upload failed. Please try again later.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        id="image-upload-input"
        disabled={uploading}
      />
      <motion.label
        htmlFor="image-upload-input"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`luxury-button cursor-pointer flex items-center gap-2 min-w-[140px] justify-center ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Uploading</span>
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            <span>Add Image</span>
          </>
        )}
      </motion.label>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full mt-2 right-0 text-[10px] text-red-500 tracking-wider uppercase font-light whitespace-nowrap"
        >
          {error}
        </motion.div>
      )}
    </div>
  );
}

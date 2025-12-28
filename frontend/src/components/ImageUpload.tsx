import { useState, useRef } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import './ImageUpload.css';

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

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    // 验证文件大小（10MB）
    if (file.size > 10 * 1024 * 1024) {
      setError('图片大小不能超过10MB');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      await axios.post('http://localhost:3001/api/images/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      if (onUploadSuccess) {
        onUploadSuccess();
      }

      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      setError(serverMsg && serverMsg.length <= 60 ? serverMsg : '上传失败，请稍后重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="image-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        id="image-upload-input"
        disabled={uploading}
      />
      <label htmlFor="image-upload-input" className={`upload-button ${uploading ? 'uploading' : ''}`}>
        {uploading ? '上传中...' : '上传图片'}
      </label>
      {error && <div className="upload-error">{error}</div>}
    </div>
  );
}


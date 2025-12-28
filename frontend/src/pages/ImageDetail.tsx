import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import ImageEditor from '../components/ImageEditor';
import './ImageDetail.css';

interface ImageData {
  id: number;
  filename: string;
  originalName: string;
  width: number | null;
  height: number | null;
  size: string;
  exifData: any;
  customTags: string | null;
  aiTags: any;
  createdAt: string;
}

export default function ImageDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [image, setImage] = useState<ImageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editMode, setEditMode] = useState<'crop' | 'adjust' | null>(null);
  const [locationName, setLocationName] = useState<string>('');

  useEffect(() => {
    fetchImage();
  }, [id, token]);

  // 将GPS坐标转换为十进制度数格式
  // 支持数组格式（度分秒）、数字格式（十进制度数）和字符串格式
  const convertGPSCoordinate = (coord: any): number => {
    if (typeof coord === 'number') {
      return coord;
    }

    if (Array.isArray(coord) && coord.length >= 3) {
      // 度分秒格式：[度, 分, 秒]
      const degrees = Number(coord[0]) || 0;
      const minutes = Number(coord[1]) || 0;
      const seconds = Number(coord[2]) || 0;
      return degrees + minutes / 60 + seconds / 3600;
    }

    if (typeof coord === 'string') {
      // 尝试解析字符串格式
      // 1. 先尝试直接解析为数字（十进制度数）
      const num = parseFloat(coord);
      if (!isNaN(num) && coord.indexOf(',') === -1) {
        return num;
      }

      // 2. 尝试解析逗号分隔的度分秒格式，如 "22,32,23.54"
      const parts = coord.split(',').map(s => s.trim()).filter(s => s);
      if (parts.length >= 3) {
        const degrees = Number(parts[0]) || 0;
        const minutes = Number(parts[1]) || 0;
        const seconds = Number(parts[2]) || 0;
        return degrees + minutes / 60 + seconds / 3600;
      }

      // 3. 如果只有两个部分，可能是度分格式
      if (parts.length === 2) {
        const degrees = Number(parts[0]) || 0;
        const minutes = Number(parts[1]) || 0;
        return degrees + minutes / 60;
      }
    }

    return NaN;
  };

  useEffect(() => {
    if (image?.exifData?.GPSLatitude && image?.exifData?.GPSLongitude) {
      const lat = convertGPSCoordinate(image.exifData.GPSLatitude);
      const lon = convertGPSCoordinate(image.exifData.GPSLongitude);
      if (!isNaN(lat) && !isNaN(lon)) {
        fetchAddress(lat, lon);
      } else {
        console.warn('GPS坐标格式无效:', image.exifData.GPSLatitude, image.exifData.GPSLongitude);
        setLocationName('GPS坐标格式无效');
      }
    }
  }, [image]);

  const fetchAddress = async (lat: number, lon: number) => {
    try {
      // 通过后端代理请求，避免CORS问题
      const response = await axios.get(
        `http://localhost:3001/api/images/geocode/reverse?lat=${lat}&lon=${lon}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success && response.data.data.address) {
        setLocationName(response.data.data.address);
      } else {
        setLocationName('未找到对应地名');
      }
    } catch (e: any) {
      console.error(e);
      setLocationName((e.response?.data?.message || e.message || '网络错误'));
    }
  };

  const fetchImage = async () => {
    if (!token || !id) return;

    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:3001/api/images/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const img = response.data.data;

      // 兼容性处理：如果 exifData 是字符串，尝试解析它
      let parsedExif = img.exifData;
      if (typeof img.exifData === 'string') {
        try {
          parsedExif = JSON.parse(img.exifData);
        } catch (e) {
          console.error('解析 EXIF 数据失败', e);
        }
      }

      // 兼容性处理：如果 aiTags 是字符串，尝试解析它
      let parsedAiTags = img.aiTags;
      if (typeof img.aiTags === 'string') {
        try {
          parsedAiTags = JSON.parse(img.aiTags);
        } catch (e) {
          console.error('解析 AI 标签失败', e);
        }
      }

      setImage({
        ...img,
        exifData: parsedExif,
        aiTags: parsedAiTags,
        size: formatFileSize(Number(img.size))
      });
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      const friendlyMsg = serverMsg && serverMsg.length <= 60 ? serverMsg : '请稍后重试';
      setError('加载图片失败：' + friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return '未知';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '无效日期';
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '日期格式错误';
    }
  };

  const formatGPS = (val: any) => {
    if (val === undefined || val === null) return '未知';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return num.toFixed(6);
  };

  if (loading) {
    return <div className="image-detail-loading">加载中...</div>;
  }

  if (error || !image) {
    return (
      <div className="image-detail-error">
        {error || '图片不存在'}
        <button onClick={() => navigate('/')} className="back-button">返回</button>
      </div>
    );
  }

  return (
    <div className="image-detail">
      <div className="image-detail-header">
        <button className="back-button" onClick={() => navigate('/')}>← 返回</button>
        <h1>{image.originalName}</h1>
        <div className="image-detail-actions">
          <button 
            className="action-btn" 
            onClick={() => {
              setEditMode('crop');
              setShowEditor(true);
            }}
          >
            裁剪
          </button>
          <button 
            className="action-btn" 
            onClick={() => {
              setEditMode('adjust');
              setShowEditor(true);
            }}
          >
            调色
          </button>
        </div>
      </div>

      <div className="image-detail-content">
        <div className="image-display">
          <img
            src={`http://localhost:3001/uploads/${image.filename}`}
            alt={image.originalName}
            className="main-image"
          />
        </div>

        <div className="image-info-panel">
          <div className="info-grid">
            {/* 文件属性卡片 */}
            <div className="glass-card">
              <div className="card-icon">📁</div>
              <div className="card-content">
                <h4>文件属性</h4>
                <div className="meta-row">
                  <span>分辨率</span>
                  <strong>{image.width} × {image.height}</strong>
                </div>
                <div className="meta-row">
                  <span>体积</span>
                  <strong>{image.size}</strong>
                </div>
                <div className="meta-row">
                  <span>上传时间</span>
                  <strong>{formatDate(image.createdAt)}</strong>
                </div>
              </div>
            </div>

            {/* 拍摄器材卡片 */}
            {image.exifData && typeof image.exifData === 'object' && (
              <div className="glass-card">
                <div className="card-icon">📷</div>
                <div className="card-content">
                  <h4>拍摄器材</h4>
                  <div className="meta-row">
                    <span>品牌</span>
                    <strong>{image.exifData.Make || '未知'}</strong>
                  </div>
                  <div className="meta-row">
                    <span>型号</span>
                    <strong>{image.exifData.Model || '未知'}</strong>
                  </div>
                  <div className="meta-row">
                    <span>拍摄时间</span>
                    <strong>{formatDate(image.exifData.DateTimeOriginal)}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* 地理位置卡片 */}
            <div className="glass-card">
              <div className="card-icon">📍</div>
              <div className="card-content">
                <h4>拍摄地点</h4>
                <div className="location-name">
                  {locationName || (image.exifData && typeof image.exifData === 'object' && (image.exifData.GPSLatitude || image.exifData.GPSLongitude) ? '正在解析位置...' : '未提供位置信息')}
                </div>
                {image.exifData && typeof image.exifData === 'object' && (image.exifData.GPSLatitude || image.exifData.GPSLongitude) && (
                  <div className="gps-coords">
                    {formatGPS(image.exifData.GPSLatitude)}, {formatGPS(image.exifData.GPSLongitude)}
                  </div>
                )}
              </div>
            </div>

            {/* 标签卡片 */}
            <div className="glass-card">
              <div className="card-icon">🏷️</div>
              <div className="card-content">
                <h4>标签管理</h4>
                {image.customTags ? (
                  <div className="tags-display">
                    <div className="tags-section">
                      <strong>自定义标签：</strong>
                      {image.customTags.split(',').map((tag, index) => (
                        <span key={index} className="tag-item">{tag.trim()}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {image.aiTags && typeof image.aiTags === 'object' ? (
                  <div className="tags-display">
                    {image.aiTags.categories && Array.isArray(image.aiTags.categories) && image.aiTags.categories.length > 0 && (
                      <div className="tags-section">
                        <strong>AI分类：</strong>
                        {image.aiTags.categories.map((tag: string, index: number) => (
                          <span key={index} className="tag-item ai-tag">{tag}</span>
                        ))}
                      </div>
                    )}
                    {image.aiTags.tags && Array.isArray(image.aiTags.tags) && image.aiTags.tags.length > 0 && (
                      <div className="tags-section">
                        <strong>AI标签：</strong>
                        {image.aiTags.tags.map((tag: string, index: number) => (
                          <span key={index} className="tag-item ai-tag">{tag}</span>
                        ))}
                      </div>
                    )}
                    {image.aiTags.objects && Array.isArray(image.aiTags.objects) && image.aiTags.objects.length > 0 && (
                      <div className="tags-section">
                        <strong>识别物体：</strong>
                        {image.aiTags.objects.map((obj: string, index: number) => (
                          <span key={index} className="tag-item ai-tag">{obj}</span>
                        ))}
                      </div>
                    )}
                    {image.aiTags.description && (
                      <div className="tags-section">
                        <strong>AI描述：</strong>
                        <p className="ai-description">{image.aiTags.description}</p>
                      </div>
                    )}
                  </div>
                ) : image.aiTags && typeof image.aiTags === 'string' ? (
                  <div className="tags-display">
                    <div className="tags-section">
                      <strong>AI分析：</strong>
                      <p className="ai-description">{image.aiTags}</p>
                    </div>
                  </div>
                ) : null}
                {!image.customTags && (!image.aiTags || (typeof image.aiTags === 'object' && Object.keys(image.aiTags).length === 0)) && (
                  <div className="no-tags">暂无标签</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEditor && image && (
        <ImageEditor
          imageUrl={`http://localhost:3001/uploads/${image.filename}`}
          imageId={image.id}
          mode={editMode!}
          onClose={() => {
            setShowEditor(false);
            setEditMode(null);
          }}
          onSave={() => {
            setShowEditor(false);
            setEditMode(null);
            fetchImage();
          }}
        />
      )}
    </div>
  );
}


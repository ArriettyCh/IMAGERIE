import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import ImageEditor from '../components/ImageEditor';
import TagModal from '../components/TagModal';
import { motion } from 'framer-motion';
import { ArrowLeft, Crop, Palette, MapPin, Tag, Info, Trash2, Camera, Edit2, X } from 'lucide-react';

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

const API_BASE = 'http://localhost:3001';

export default function ImageDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { addToast, showConfirm } = useUIStore();
  const [image, setImage] = useState<ImageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editMode, setEditMode] = useState<'crop' | 'adjust' | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  const fetchImage = useCallback(async () => {
    if (!token || !id) return;
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/images/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const img = response.data.data;
      setImage({
        ...img,
        exifData: typeof img.exifData === 'string' ? JSON.parse(img.exifData) : img.exifData,
        aiTags: typeof img.aiTags === 'string' ? JSON.parse(img.aiTags) : img.aiTags,
        size: formatFileSize(Number(img.size))
      });
      setLastUpdated(Date.now());
    } catch (err: any) {
      setError('无法获取作品信息');
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchImage();
  }, [fetchImage]);

  const convertGPSCoordinate = (coord: any): number => {
    if (typeof coord === 'number') return coord;
    if (Array.isArray(coord) && coord.length >= 3) {
      return Number(coord[0]) + Number(coord[1]) / 60 + Number(coord[2]) / 3600;
    }
    return NaN;
  };

  useEffect(() => {
    if (image?.exifData?.GPSLatitude && image?.exifData?.GPSLongitude) {
      const lat = convertGPSCoordinate(image.exifData.GPSLatitude);
      const lon = convertGPSCoordinate(image.exifData.GPSLongitude);
      if (!isNaN(lat) && !isNaN(lon)) fetchAddress(lat, lon);
    }
  }, [image]);

  const fetchAddress = async (lat: number, lon: number) => {
    try {
      const response = await axios.get(`${API_BASE}/api/images/geocode/reverse?lat=${lat}&lon=${lon}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) setLocationName(response.data.data.address);
    } catch (e) { }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!image || !token) return;
    const currentTags = image.customTags?.split(/[,\uff0c]/).map(t => t.trim()) || [];
    const newTags = currentTags.filter(t => t !== tagToRemove).join(',');

    try {
      await axios.patch(
        `${API_BASE}/api/images/${image.id}/tags`,
        { customTags: newTags || null },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      addToast('标签已移除');
      fetchImage();
    } catch (error) {
      addToast('移除失败', 'error');
    }
  };

  const handleDelete = () => {
    if (!image) return;
    showConfirm({
      title: '删除确认',
      message: '确定要从您的收藏中永久移除这张图片吗？',
      confirmLabel: '确认删除',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await axios.delete(`${API_BASE}/api/images/${image.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          addToast('作品已成功移除');
          navigate('/');
        } catch (err: any) {
          addToast('操作失败', 'error');
        }
      }
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return '未知';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '无效日期' : date.toLocaleDateString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  if (loading && !image) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-foreground/10 border-t-foreground rounded-full animate-spin" />
    </div>
  );

  if (error || !image) return (
    <div className="py-24 text-center">
      <p className="text-secondary font-light mb-8">{error || '作品不存在'}</p>
      <button onClick={() => navigate('/')} className="luxury-button">返回画廊</button>
    </div>
  );

  return (
    <div className="max-w-[1440px] mx-auto px-6 space-y-12 pb-24">
      <div className="flex justify-between items-center py-4">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-secondary hover:text-foreground transition-colors group">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-xs tracking-widest uppercase font-light">返回画廊</span>
        </button>
        <div className="flex gap-4">
          <button 
            onClick={() => { setEditMode('crop'); setShowEditor(true); }}
            className="flex items-center gap-2 px-6 py-2 rounded-full border border-foreground/5 hover:bg-card transition-colors text-xs font-light"
          >
            <Crop className="w-3.5 h-3.5" /> 裁剪
          </button>
          <button 
            onClick={() => { setEditMode('adjust'); setShowEditor(true); }}
            className="flex items-center gap-2 px-6 py-2 rounded-full border border-foreground/5 hover:bg-card transition-colors text-xs font-light"
          >
            <Palette className="w-3.5 h-3.5" /> 调色
          </button>
          <div className="w-[1px] h-4 bg-foreground/10 self-center mx-2" />
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-6 py-2 rounded-full border border-red-500/10 hover:bg-red-50 text-red-500 transition-colors text-xs font-light"
          >
            <Trash2 className="w-3.5 h-3.5" /> 删除
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-8 flex flex-col gap-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-card rounded-[2rem] overflow-hidden group shadow-2xl"
          >
            <img
              key={lastUpdated}
              src={`${API_BASE}/uploads/${image.filename}?t=${lastUpdated}`}
              alt={image.originalName}
              className="w-full h-auto max-h-[80vh] object-contain mx-auto"
            />
          </motion.div>

          <div className="flex flex-col gap-4">
            <h1 className="text-3xl md:text-5xl font-serif tracking-tight">{image.originalName}</h1>
            <p className="text-secondary font-light text-sm tracking-wide">
              {image.width} × {image.height} · {image.size} · {formatDate(image.createdAt)}
            </p>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-12">
          {image.aiTags?.description && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-secondary">
                <Info className="w-4 h-4" />
                <h3 className="text-[10px] tracking-[0.2em] uppercase font-light">AI 视觉解读</h3>
              </div>
              <p className="text-lg font-light leading-relaxed text-foreground/80 italic">
                “{image.aiTags.description}”
              </p>
            </section>
          )}

          <div className="grid grid-cols-1 gap-12">
            <MetaSection icon={Camera} title="拍摄器材">
              <MetaRow label="品牌" value={image.exifData?.Make} />
              <MetaRow label="型号" value={image.exifData?.Model} />
              <MetaRow label="时间" value={formatDate(image.exifData?.DateTimeOriginal)} />
            </MetaSection>

            <MetaSection icon={MapPin} title="地理位置">
              <div className="text-sm font-light leading-relaxed text-foreground/70">
                {locationName || (image.exifData?.GPSLatitude ? '正在定位解析...' : '无位置信息')}
              </div>
            </MetaSection>

            <MetaSection
              icon={Tag}
              title="标签云"
              extra={
                <button
                  onClick={() => setShowTagModal(true)}
                  className="p-1 hover:bg-black/5 rounded-full transition-colors text-secondary hover:text-foreground"
                  title="编辑标签"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              }
            >
              <div className="flex flex-wrap gap-2">
                {image.customTags?.split(/[,\uff0c]/).filter(t => t.trim()).map((t, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-card text-[10px] tracking-wider uppercase font-light border border-foreground/5 flex items-center group/tag">
                    {t.trim()}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveTag(t.trim()); }}
                      className="hidden group-hover/tag:flex ml-2 text-secondary hover:text-red-500 transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                {image.aiTags?.tags?.map((t: string, i: number) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-accent/5 text-accent text-[10px] tracking-wider uppercase font-light border border-accent/10">
                    {t}
                  </span>
                ))}
                {!image.customTags && (!image.aiTags?.tags || image.aiTags.tags.length === 0) && (
                  <span className="text-[10px] text-secondary font-light italic">暂无标签</span>
                )}
              </div>
            </MetaSection>
          </div>
        </div>
      </div>

      {showEditor && image && (
        <ImageEditor
          imageUrl={`${API_BASE}/uploads/${image.filename}`}
          imageId={image.id}
          mode={editMode!}
          onClose={() => { setShowEditor(false); setEditMode(null); }}
          onSave={() => {
            setShowEditor(false);
            setEditMode(null);
            fetchImage(); 
          }}
        />
      )}
      {showTagModal && image && (
        <TagModal
          imageId={image.id}
          currentTags={image.customTags || ''}
          onClose={() => setShowTagModal(false)}
          onSave={() => {
            setShowTagModal(false);
            fetchImage();
          }}
        />
      )}
    </div>
  );
}

function MetaSection({ icon: Icon, title, children, extra }: { icon: any, title: string, children: React.ReactNode, extra?: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-secondary">
          <Icon className="w-4 h-4" />
          <h3 className="text-[10px] tracking-[0.2em] uppercase font-light">{title}</h3>
        </div>
        {extra}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function MetaRow({ label, value }: { label: string, value: any }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="font-light text-secondary">{label}</span>
      <span className="font-normal text-foreground/80">{value}</span>
    </div>
  );
}

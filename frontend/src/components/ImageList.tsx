import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import ImageCarousel from './ImageCarousel';
import TagModal from './TagModal';
import './ImageList.css';

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

export default function ImageList() {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [lastAiSearchQuery, setLastAiSearchQuery] = useState('');
  const [showAiSearch, setShowAiSearch] = useState(false);
  const [aiSearching, setAiSearching] = useState(false);
  const [isAiSearchMode, setIsAiSearchMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [showCarousel, setShowCarousel] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagImageId, setTagImageId] = useState<number | null>(null);
  const { token } = useAuthStore();
  const navigate = useNavigate();

  const friendlyError = (msg?: string) => {
    if (!msg) return '请稍后重试';
    return msg.length <= 60 ? msg : '请稍后重试';
  };

  const fetchImages = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      setIsAiSearchMode(false); // 重置AI搜索模式
      const response = await axios.get(`http://localhost:3001/api/images?search=${searchTerm}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setImages(response.data.data.images.map((img: any) => ({
        ...img,
        size: formatFileSize(Number(img.size))
      })));
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      setError('加载图片列表失败：' + friendlyError(serverMsg));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, searchTerm]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这张图片吗？')) return;

    try {
      await axios.delete(`http://localhost:3001/api/images/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      fetchImages(); // 刷新列表
      setSelectedImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    } catch (err: any) {
      alert('删除失败：' + (err.response?.data?.message || '未知错误'));
    }
  };

  const handleToggleSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleViewDetail = (id: number) => {
    navigate(`/image/${id}`);
  };

  const handleCarousel = () => {
    if (selectedImages.size === 0) {
      alert('请先选择要轮播的图片');
      return;
    }
    setShowCarousel(true);
  };

  const handleSetTag = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setTagImageId(id);
    setShowTagModal(true);
  };

  const handleTagSaved = () => {
    fetchImages();
    setShowTagModal(false);
    setTagImageId(null);
  };

  const handleAiSearch = async () => {
    if (!aiSearchQuery.trim()) {
      alert('请输入搜索内容');
      return;
    }

    try {
      setAiSearching(true);
      setLoading(true); // 设置loading状态
      setError('');
      const response = await axios.post(
        'http://localhost:3001/api/images/search/ai',
        { query: aiSearchQuery },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        const matchedImages = response.data.data.images.map((img: any) => ({
          ...img,
          size: formatFileSize(Number(img.size))
        }));
        setImages(matchedImages);
        setSearchTerm(''); // 清空普通搜索
        setIsAiSearchMode(true); // 标记为AI搜索模式
        setLastAiSearchQuery(aiSearchQuery); // 保存最后的搜索查询
        setShowAiSearch(false);
        setLoading(false); // 确保loading状态正确
      } else {
        setError('AI搜索失败：' + (response.data.message || '未知错误'));
        setIsAiSearchMode(false);
      }
    } catch (err: any) {
      setError('AI搜索失败：请稍后重试（网络或AI服务繁忙）');
      console.error(err);
      setIsAiSearchMode(false);
    } finally {
      setAiSearching(false);
      setLoading(false); // 确保loading状态被重置
    }
  };

  if (loading) {
    return <div className="image-list-loading">加载中...</div>;
  }

  if (error) {
    return <div className="image-list-error">{error}</div>;
  }

  return (
    <>
      <div className="image-list-header">
        <div className="search-bar">
          <input
            type="text"
            placeholder="按文件名或标签搜索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && setSearchTerm(search)}
          />
          <button onClick={() => setSearchTerm(search)}>搜索</button>
          <button
            className="ai-search-button"
            onClick={() => {
              setShowAiSearch(!showAiSearch);
              if (showAiSearch) {
                setAiSearchQuery('');
              }
            }}
            title="AI智能搜索"
          >
            🤖 AI搜索
          </button>
        </div>

        {showAiSearch && (
          <div className="ai-search-panel">
            <input
              type="text"
              placeholder="用自然语言描述你想找的图片，例如：找一些风景照片、包含人物的图片..."
              value={aiSearchQuery}
              onChange={(e) => setAiSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAiSearch()}
              className="ai-search-input"
            />
            <button
              onClick={handleAiSearch}
              disabled={aiSearching}
              className="ai-search-submit"
            >
              {aiSearching ? '搜索中...' : '搜索'}
            </button>
            <button
              onClick={() => {
                setShowAiSearch(false);
                setAiSearchQuery('');
                setIsAiSearchMode(false);
                setLastAiSearchQuery('');
                fetchImages(); // 恢复显示所有图片
              }}
              className="ai-search-cancel"
            >
              取消
            </button>
          </div>
        )}

        {selectedImages.size > 0 && (
          <div className="image-list-actions">
            <button className="action-button carousel-button" onClick={handleCarousel}>
              轮播查看 ({selectedImages.size})
            </button>
            <button
              className="action-button clear-button"
              onClick={() => setSelectedImages(new Set())}
            >
              取消选择
            </button>
          </div>
        )}
      </div>
      
      {images.length === 0 ? (
        <div className="image-list-empty">
          {isAiSearchMode
            ? `AI搜索"${lastAiSearchQuery || aiSearchQuery}"没有找到匹配的图片`
            : searchTerm
              ? '没有找到匹配的图片'
              : '还没有上传任何图片，点击上方"上传图片"按钮开始上传'}
        </div>
      ) : (
          <div className="image-list">
            {images.map(image => (
              <div
                key={image.id}
                className={`image-item ${selectedImages.has(image.id) ? 'selected' : ''}`}
                onClick={() => handleViewDetail(image.id)}
              >
                <div className="image-thumbnail">
                  <img
                    src={`http://localhost:3001/uploads/thumbnails/${image.filename}`}
                    alt={image.originalName}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `http://localhost:3001/uploads/${image.filename}`;
                    }}
                  />
                  {selectedImages.has(image.id) && (
                    <div className="select-indicator">✓</div>
                  )}
                </div>
                <div className="image-actions">
                  <button
                    className="icon-button select-button"
                    onClick={(e) => handleToggleSelect(image.id, e)}
                    title={selectedImages.has(image.id) ? '取消选择' : '选择'}
                  >
                    {selectedImages.has(image.id) ? '✓' : '○'}
                  </button>
                  <button
                    className="icon-button tag-button"
                    onClick={(e) => handleSetTag(image.id, e)}
                    title="设置标签"
                  >
                    🏷️
                  </button>
                  <button
                    className="icon-button delete-button"
                    onClick={(e) => handleDelete(image.id, e)}
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
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
          onClose={() => {
            setShowTagModal(false);
            setTagImageId(null);
          }}
          onSave={handleTagSaved}
        />
      )}
    </>
  );
}


import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import './ImageEditor.css';

interface ImageEditorProps {
  imageUrl: string;
  imageId: number;
  mode: 'crop' | 'adjust';
  onClose: () => void;
  onSave: () => void;
}

export default function ImageEditor({ imageUrl, imageId, mode, onClose, onSave }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [adjustments, setAdjustments] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
  });

  // 裁剪相关状态 - 使用显示坐标（CSS像素）
  const [isCropping, setIsCropping] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const { token } = useAuthStore();

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      initCanvas();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const initCanvas = () => {
    if (!canvasRef.current || !imageRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = imageRef.current.width;
    canvas.height = imageRef.current.height;
    drawImage();
  };

  const drawImage = () => {
    if (!canvasRef.current || !imageRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (mode === 'adjust') {
      // 调色模式：直接在主绘制流程中应用滤镜
      ctx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`;
    } else {
      ctx.filter = 'none';
    }

    ctx.drawImage(imageRef.current, 0, 0);
  };

  useEffect(() => {
    if (imageLoaded) {
      drawImage();
    }
  }, [imageLoaded, adjustments, mode]);

  // 坐标转换：屏幕 -> Canvas内部像素
  const screenToCanvas = (screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (screenX - rect.left) * scaleX,
      y: (screenY - rect.top) * scaleY
    };
  };

  // 坐标转换：屏幕 -> 容器相对坐标（用于显示裁剪框）
  const screenToContainer = (screenX: number, screenY: number) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return {
      x: screenX - rect.left,
      y: screenY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode !== 'crop') return;
    const { x, y } = screenToContainer(e.clientX, e.clientY);

    // 检查是否在图片范围内
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cRect = canvas.getBoundingClientRect();
    const container = containerRef.current!;
    const contRect = container.getBoundingClientRect();

    const imageLeft = cRect.left - contRect.left;
    const imageTop = cRect.top - contRect.top;

    if (x < imageLeft || x > imageLeft + cRect.width || y < imageTop || y > imageTop + cRect.height) {
      return;
    }

    setIsCropping(true);
    setStartPos({ x, y });
    setCropBox({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isCropping || mode !== 'crop') return;
    const { x, y } = screenToContainer(e.clientX, e.clientY);

    const canvas = canvasRef.current!;
    const cRect = canvas.getBoundingClientRect();
    const container = containerRef.current!;
    const contRect = container.getBoundingClientRect();
    const imageLeft = cRect.left - contRect.left;
    const imageTop = cRect.top - contRect.top;

    // 限制在图片范围内
    const currentX = Math.max(imageLeft, Math.min(imageLeft + cRect.width, x));
    const currentY = Math.max(imageTop, Math.min(imageTop + cRect.height, y));

    setCropBox({
      x: Math.min(startPos.x, currentX),
      y: Math.min(startPos.y, currentY),
      width: Math.abs(currentX - startPos.x),
      height: Math.abs(currentY - startPos.y)
    });
  };

  const handleMouseUp = () => {
    setIsCropping(false);
  };

  useEffect(() => {
    if (isCropping) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isCropping]);

  const applyCrop = () => {
    if (cropBox.width < 5 || cropBox.height < 5) {
      alert('请选择一个有效的裁剪区域');
      return;
    }

    const canvas = canvasRef.current!;
    const cRect = canvas.getBoundingClientRect();
    const container = containerRef.current!;
    const contRect = container.getBoundingClientRect();
    const imageLeft = cRect.left - contRect.left;
    const imageTop = cRect.top - contRect.top;

    // 转换为Canvas内部坐标
    const scaleX = canvas.width / cRect.width;
    const scaleY = canvas.height / cRect.height;

    const sourceX = (cropBox.x - imageLeft) * scaleX;
    const sourceY = (cropBox.y - imageTop) * scaleY;
    const sourceW = cropBox.width * scaleX;
    const sourceH = cropBox.height * scaleY;

    // 创建临时canvas执行裁剪
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sourceW;
    tempCanvas.height = sourceH;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(canvas, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);

    // 更新主Canvas
    canvas.width = sourceW;
    canvas.height = sourceH;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(tempCanvas, 0, 0);

    setCropBox({ x: 0, y: 0, width: 0, height: 0 });
  };

  const handleSave = async () => {
    if (!canvasRef.current) return;

    // 这里如果只是前端演示，我们可以直接导出
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);

    // 实际作业中，我们应该发送到后端
    // const blob = await (await fetch(dataUrl)).blob();
    // const formData = new FormData();
    // formData.append('image', blob, 'edited.jpg');
    // await axios.post(`/api/images/${imageId}/edit`, formData, ...);

    alert('编辑已应用！在实际系统中，这里将调用后端API更新原图。');
    onSave();
  };

  return (
    <div className="image-editor-overlay">
      <div className="image-editor">
        <div className="editor-header">
          <h3>{mode === 'crop' ? '图片裁剪' : '图片调色'}</h3>
          <p className="editor-tip">
            {mode === 'crop' ? '在图片上点击并拖动以选择区域' : '调整滑块以改变图片效果'}
          </p>
          <button className="editor-close" onClick={onClose}>×</button>
        </div>

        <div className="editor-content">
          <div
            className="canvas-container"
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
          >
            <canvas
              ref={canvasRef}
              style={{
                maxWidth: '100%',
                maxHeight: '60vh',
                cursor: mode === 'crop' ? 'crosshair' : 'default',
                userSelect: 'none'
              }}
            />
            {mode === 'crop' && cropBox.width > 0 && (
              <div
                className="crop-selection-box"
                style={{
                  left: cropBox.x,
                  top: cropBox.y,
                  width: cropBox.width,
                  height: cropBox.height
                }}
              />
            )}
          </div>

          {mode === 'adjust' && (
            <div className="adjust-controls">
              <div className="control-item">
                <label>亮度</label>
                <input
                  type="range" min="0" max="200" value={adjustments.brightness}
                  onChange={(e) => setAdjustments({ ...adjustments, brightness: parseInt(e.target.value) })}
                />
                <span>{adjustments.brightness}%</span>
              </div>
              <div className="control-item">
                <label>对比度</label>
                <input
                  type="range" min="0" max="200" value={adjustments.contrast}
                  onChange={(e) => setAdjustments({ ...adjustments, contrast: parseInt(e.target.value) })}
                />
                <span>{adjustments.contrast}%</span>
              </div>
              <div className="control-item">
                <label>饱和度</label>
                <input
                  type="range" min="0" max="200" value={adjustments.saturation}
                  onChange={(e) => setAdjustments({ ...adjustments, saturation: parseInt(e.target.value) })}
                />
                <span>{adjustments.saturation}%</span>
              </div>
              <button className="reset-button" onClick={() => setAdjustments({ brightness: 100, contrast: 100, saturation: 100 })}>
                重置效果
              </button>
            </div>
          )}

          {mode === 'crop' && (
            <div className="crop-controls">
              <button className="crop-button" onClick={applyCrop}>应用裁剪区域</button>
              <button className="reset-button" onClick={initCanvas}>撤销裁剪</button>
            </div>
          )}
        </div>

        <div className="editor-footer">
          <button className="editor-button cancel" onClick={onClose}>取消</button>
          <button className="editor-button save" onClick={handleSave}>完成并保存</button>
        </div>
      </div>
    </div>
  );
}

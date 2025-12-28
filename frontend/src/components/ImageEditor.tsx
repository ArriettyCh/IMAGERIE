import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { motion } from 'framer-motion';
import { X, RotateCcw, Sun, Contrast, Droplets, Scissors, Layers, Loader2, Save } from 'lucide-react';

interface ImageEditorProps {
  imageUrl: string;
  imageId: number;
  mode: 'crop' | 'adjust';
  onClose: () => void;
  onSave: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ImageEditor({ imageUrl, imageId, mode, onClose, onSave }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [adjustments, setAdjustments] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
  });

  const [isCropping, setIsCropping] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const { token } = useAuthStore();
  const { addToast } = useUIStore();

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      initCanvas();
    };
    img.src = imageUrl + '?t=' + Date.now();
  }, [imageUrl]);

  const initCanvas = () => {
    if (!canvasRef.current || !imageRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = imageRef.current.width;
    canvas.height = imageRef.current.height;
    setAdjustments({ brightness: 100, contrast: 100, saturation: 100 });
    setCropBox({ x: 0, y: 0, width: 0, height: 0 });
    drawImage();
  };

  const drawImage = () => {
    if (!canvasRef.current || !imageRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (mode === 'adjust') {
      ctx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`;
    } else {
      ctx.filter = 'none';
    }
    ctx.drawImage(imageRef.current, 0, 0);
  };

  useEffect(() => {
    if (imageLoaded) drawImage();
  }, [imageLoaded, adjustments, mode]);

  const screenToContainer = (screenX: number, screenY: number) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return { x: screenX - rect.left, y: screenY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode !== 'crop') return;
    const { x, y } = screenToContainer(e.clientX, e.clientY);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cRect = canvas.getBoundingClientRect();
    const contRect = containerRef.current!.getBoundingClientRect();

    const imageLeft = cRect.left - contRect.left;
    const imageTop = cRect.top - contRect.top;

    if (x < imageLeft || x > imageLeft + cRect.width || y < imageTop || y > imageTop + cRect.height) return;

    setIsCropping(true);
    setStartPos({ x, y });
    setCropBox({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isCropping || mode !== 'crop') return;
    const { x, y } = screenToContainer(e.clientX, e.clientY);
    const canvas = canvasRef.current!;
    const cRect = canvas.getBoundingClientRect();
    const contRect = containerRef.current!.getBoundingClientRect();
    const imageLeft = cRect.left - contRect.left;
    const imageTop = cRect.top - contRect.top;

    const currentX = Math.max(imageLeft, Math.min(imageLeft + cRect.width, x));
    const currentY = Math.max(imageTop, Math.min(imageTop + cRect.height, y));

    setCropBox({
      x: Math.min(startPos.x, currentX),
      y: Math.min(startPos.y, currentY),
      width: Math.abs(currentX - startPos.x),
      height: Math.abs(currentY - startPos.y)
    });
  };

  const handleMouseUp = () => setIsCropping(false);

  useEffect(() => {
    if (isCropping) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isCropping]);

  const applyCropInternal = () => {
    if (cropBox.width < 5 || cropBox.height < 5) return false;
    const canvas = canvasRef.current!;
    const cRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / cRect.width;
    const scaleY = canvas.height / cRect.height;
    const contRect = containerRef.current!.getBoundingClientRect();
    const imageLeft = cRect.left - contRect.left;
    const imageTop = cRect.top - contRect.top;

    const sourceX = (cropBox.x - imageLeft) * scaleX;
    const sourceY = (cropBox.y - imageTop) * scaleY;
    const sourceW = cropBox.width * scaleX;
    const sourceH = cropBox.height * scaleY;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sourceW;
    tempCanvas.height = sourceH;
    tempCanvas.getContext('2d')!.drawImage(canvas, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);

    canvas.width = sourceW;
    canvas.height = sourceH;
    canvas.getContext('2d')!.drawImage(tempCanvas, 0, 0);
    setCropBox({ x: 0, y: 0, width: 0, height: 0 });
    return true;
  };

  const handleSave = async () => {
    if (!canvasRef.current) return;

    // 如果在裁剪模式下且有选区，先应用裁剪
    if (mode === 'crop' && cropBox.width > 0) {
      applyCropInternal();
    }

    setIsSaving(true);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      const formData = new FormData();
      formData.append('image', blob, 'edited.jpg');

      await axios.post(`${API_BASE}/api/images/${imageId}/edit`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      addToast('作品集已成功更新');
      onSave();
    } catch (err) {
      addToast('同步编辑失败，请检查连接', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col md:flex-row"
    >
      <div className="absolute top-0 left-0 right-0 h-16 px-6 flex justify-between items-center z-50 pointer-events-none">
        <button
          onClick={onClose}
          className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors pointer-events-auto"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="flex gap-4 pointer-events-auto">
          <button
            onClick={initCanvas}
            className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors"
            title="重置修改"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-2 bg-white text-black rounded-full text-xs tracking-widest uppercase font-medium hover:bg-white/90 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? '正在同步' : '完成并保存'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 md:p-16">
        <div
          ref={containerRef}
          className="relative max-w-full max-h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        >
          {!imageLoaded && <div className="text-white/20 font-light tracking-widest animate-pulse">载入艺术画布中...</div>}
          <canvas
            ref={canvasRef}
            className={`max-w-full max-h-[80vh] shadow-2xl transition-all duration-500 ${mode === 'crop' ? 'cursor-crosshair' : 'cursor-default'}`}
            style={{ display: imageLoaded ? 'block' : 'none' }}
          />
          {mode === 'crop' && cropBox.width > 0 && (
            <div
              className="absolute border-2 border-white border-dashed ring-[2000px] ring-black/70 pointer-events-none"
              style={{
                left: cropBox.x,
                top: cropBox.y,
                width: cropBox.width,
                height: cropBox.height
              }}
            >
              {/* Corner Indicators */}
              <div className="absolute top-0 left-0 w-2 h-2 bg-white -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute top-0 right-0 w-2 h-2 bg-white translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 w-2 h-2 bg-white -translate-x-1/2 translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-white translate-x-1/2 translate-y-1/2" />
            </div>
          )}
        </div>
      </div>

      <div className="w-full md:w-80 bg-zinc-950 border-t md:border-t-0 md:border-l border-white/5 p-8 flex flex-col gap-12 overflow-y-auto">
        <div className="space-y-2">
          <h2 className="text-white text-lg font-serif">{mode === 'crop' ? '重构构图' : '色彩实验室'}</h2>
          <p className="text-white/40 text-[10px] tracking-widest uppercase">
            {mode === 'crop' ? '直接拖动选区，随后点击保存即可' : '精细调整每一个光影维度'}
          </p>
        </div>

        {mode === 'adjust' ? (
          <div className="space-y-8">
            <ControlSlider
              icon={Sun}
              label="曝光度"
              value={adjustments.brightness}
              min={0} max={200}
              onChange={(val: number) => setAdjustments({ ...adjustments, brightness: val })}
            />
            <ControlSlider
              icon={Contrast}
              label="对比度"
              value={adjustments.contrast}
              min={0} max={200}
              onChange={(val: number) => setAdjustments({ ...adjustments, contrast: val })}
            />
            <ControlSlider
              icon={Droplets}
              label="色彩饱和度"
              value={adjustments.saturation}
              min={0} max={200}
              onChange={(val: number) => setAdjustments({ ...adjustments, saturation: val })}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
              <Scissors className="w-5 h-5 text-white/40" />
              <p className="text-white/60 text-xs font-light leading-relaxed">
                在画布上自由拖动以划定新的边界。选定后无需额外操作，点击右上角的“完成并保存”即可应用更改。
              </p>
            </div>
          </div>
        )}

        <div className="mt-auto pt-8 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-2 text-white/40">
            <Layers className="w-4 h-4" />
            <span className="text-[10px] tracking-widest uppercase font-light">画布实时参数</span>
          </div>
          <div className="text-[10px] text-white/20 font-light grid grid-cols-2 gap-2 uppercase tracking-tighter">
            <span>分辨率</span>
            <span className="text-right text-white/40">{canvasRef.current?.width} × {canvasRef.current?.height}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ControlSlider({ icon: Icon, label, value, min, max, onChange }: any) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-white/60">
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4" />
          <span className="text-[11px] tracking-widest uppercase font-light">{label}</span>
        </div>
        <span className="text-xs font-light">{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-px bg-white/20 appearance-none cursor-pointer accent-white hover:accent-accent transition-colors"
      />
    </div>
  );
}

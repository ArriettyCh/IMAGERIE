import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { uploadImage, getImages, getImage, deleteImage, updateImageTags, searchImagesByAI, updateImageContent } from '../controllers/imageController.js';
import { reverseGeocode, diagnoseAmapAPI } from '../controllers/geocodingController.js';
import { upload } from '../middleware/upload.js';

export const imageRouter = Router();

// 所有图片路由都需要认证
imageRouter.use(authenticateToken);

// 上传图片
imageRouter.post('/upload', upload.single('image'), uploadImage);

// 覆盖/更新图片内容（编辑保存）
imageRouter.post('/:id/edit', upload.single('image'), updateImageContent);

// 获取图片列表
imageRouter.get('/', getImages);

// MCP接口：AI对话式检索图片
imageRouter.post('/search/ai', searchImagesByAI);

// 地理编码（逆地理编码）- 必须在 /:id 之前
imageRouter.get('/geocode/reverse', reverseGeocode);

// 诊断高德地图API连接（用于排查问题）
imageRouter.get('/geocode/diagnose', diagnoseAmapAPI);

// 更新图片标签
imageRouter.patch('/:id/tags', updateImageTags);

// 获取单张图片信息
imageRouter.get('/:id', getImage);

// 删除图片
imageRouter.delete('/:id', deleteImage);

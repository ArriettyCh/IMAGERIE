import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { authRouter } from './routes/auth.js';
import { imageRouter } from './routes/image.js';

dotenv.config();

// 解决 BigInt 序列化问题
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API路由（放在静态文件路由之前，避免冲突）
app.use('/api/auth', authRouter);
app.use('/api/images', imageRouter);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// 静态文件服务 - 提供上传的图片访问（放在API路由之后）
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const uploadPath = path.resolve(uploadDir);
const thumbnailPath = path.resolve(uploadDir, 'thumbnails');
const avatarPath = path.resolve(uploadDir, 'avatars');

// 确保目录存在
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}
if (!fs.existsSync(thumbnailPath)) {
  fs.mkdirSync(thumbnailPath, { recursive: true });
}
if (!fs.existsSync(avatarPath)) {
  fs.mkdirSync(avatarPath, { recursive: true });
}

app.use('/uploads', express.static(uploadPath));
app.use('/uploads/thumbnails', express.static(thumbnailPath));
app.use('/uploads/avatars', express.static(avatarPath));

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

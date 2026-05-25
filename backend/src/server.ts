import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { authRouter } from './routes/auth.js';
import { imageRouter } from './routes/image.js';

dotenv.config();

// Serialize BigInt values in JSON responses.
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware.
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes are registered before static upload routes to avoid conflicts.
app.use('/api/auth', authRouter);
app.use('/api/images', imageRouter);

// Health check.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Static file service for uploaded images.
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const uploadPath = path.resolve(uploadDir);
const thumbnailPath = path.resolve(uploadDir, 'thumbnails');
const avatarPath = path.resolve(uploadDir, 'avatars');

// Ensure upload directories exist.
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

// Start the server.
const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Database URL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')}`);
});

server.on('error', (err) => {
  console.error('❌ Server failed to start:', err);
});

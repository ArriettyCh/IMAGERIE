import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../utils/prisma.js';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import exifr from 'exifr';
import { analyzeImageWithAI, searchImagesWithAI } from '../utils/aiService.js';

// 上传图片
export const uploadImage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的图片'
      });
    }

    const userId = req.userId!;
    const file = req.file;

    // 获取图片尺寸
    let width: number | null = null;
    let height: number | null = null;
    try {
      const metadata = await sharp(file.path).metadata();
      width = metadata.width || null;
      height = metadata.height || null;
    } catch (error) {
      console.error('获取图片尺寸失败:', error);
    }

    // 提取EXIF信息
    let exifData = null;
    try {
      exifData = await exifr.parse(file.path, {
        pick: ['DateTimeOriginal', 'GPSLatitude', 'GPSLongitude', 'Make', 'Model', 'Orientation']
      });
    } catch (error) {
      console.log('EXIF提取失败（可能图片没有EXIF信息）');
    }

    // 生成缩略图
    const thumbnailPath = path.join(path.dirname(file.path), 'thumbnails', file.filename);
    try {
      await sharp(file.path)
        .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
        .toFile(thumbnailPath);
    } catch (error) {
      console.error('缩略图生成失败:', error);
    }
   
    // 1. 立即创建数据库记录
    const image = await prisma.image.create({
      data: {
        userId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: BigInt(file.size),
        width,
        height,
        exifData: exifData ? JSON.parse(JSON.stringify(exifData)) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          }
        }
      }
    });

    // 2. 异步触发 AI 分析（不使用 await，直接在后台运行）
    analyzeImageWithAI(file.path)
      .then(async (aiTags) => {
        if (aiTags) {
          console.log(`后台分析成功: 图片ID ${image.id}`);
          await prisma.image.update({
            where: { id: image.id },
            data: { aiTags: JSON.parse(JSON.stringify(aiTags)) }
          });
        }
      })
      .catch(err => console.error(`后台分析异常: ${image.id}`, err.message));

    // 3. 瞬间返回结果
    res.status(201).json({
      success: true,
      message: '图片上传成功，AI分析正在后台进行',
      data: image
    });
  } catch (error: any) {
    console.error('上传错误:', error);
    res.status(500).json({
      success: false,
      message: '图片上传失败：' + error.message
    });
  }
};

// 获取图片列表
export const getImages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = { userId };
    if (search) {
      where.OR = [
        { originalName: { contains: search } },
        { customTags: { contains: search } }
      ];
    }

    const [images, total] = await Promise.all([
      prisma.image.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          filename: true,
          originalName: true,
          mimeType: true,
          size: true,
          width: true,
          height: true,
          exifData: true,
          aiTags: true,
          customTags: true,
          createdAt: true,
          updatedAt: true,
        }
      }),
      prisma.image.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        images,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error: any) {
    console.error('获取图片列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取图片列表失败'
    });
  }
};

// 获取单张图片信息
export const getImage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const imageId = parseInt(req.params.id);

    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        userId
      }
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      });
    }

    res.json({
      success: true,
      data: image
    });
  } catch (error: any) {
    console.error('获取图片错误:', error);
    res.status(500).json({
      success: false,
      message: '获取图片失败'
    });
  }
};

// 删除图片
export const deleteImage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const imageId = parseInt(req.params.id);

    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        userId
      }
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      });
    }

    // 删除文件
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, image.filename);
    const thumbnailPath = path.join(uploadDir, 'thumbnails', image.filename);

    [filePath, thumbnailPath].forEach(file => {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
        } catch (error) {
          console.error('删除文件失败:', file, error);
        }
      }
    });

    // 删除数据库记录
    await prisma.image.delete({
      where: { id: imageId }
    });

    res.json({
      success: true,
      message: '图片删除成功'
    });
  } catch (error: any) {
    console.error('删除图片错误:', error);
    res.status(500).json({
      success: false,
      message: '删除图片失败'
    });
  }
};

// 更新图片标签
export const updateImageTags = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const imageId = parseInt(req.params.id);
    const { customTags } = req.body;

    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        userId
      }
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      });
    }

    const updatedImage = await prisma.image.update({
      where: { id: imageId },
      data: {
        customTags: customTags || null
      }
    });

    res.json({
      success: true,
      message: '标签更新成功',
      data: updatedImage
    });
  } catch (error: any) {
    console.error('更新标签错误:', error);
    res.status(500).json({
      success: false,
      message: '更新标签失败'
    });
  }
};

// MCP接口：通过AI对话方式检索图片
export const searchImagesByAI = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供查询内容'
      });
    }

    // 获取用户的所有图片（包含标签信息）
    const allImages = await prisma.image.findMany({
      where: { userId },
      select: {
        id: true,
        filename: true,
        originalName: true,
        customTags: true,
        aiTags: true,
        exifData: true,
        width: true,
        height: true,
        mimeType: true,
        size: true,
        createdAt: true,
      }
    });

    // 使用AI进行智能检索（需要传入上传目录路径）
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const matchedImageIds = await searchImagesWithAI(query, allImages, uploadDir);

    // 根据匹配的ID获取图片详情
    const matchedImages = allImages.filter(img => matchedImageIds.includes(img.id));

    res.json({
      success: true,
      message: '检索成功',
      data: {
        images: matchedImages,
        query: query,
        count: matchedImages.length
      }
    });
  } catch (error: any) {
    console.error('AI检索错误:', error);
    res.status(500).json({
      success: false,
      message: 'AI检索失败：' + error.message
    });
  }
};


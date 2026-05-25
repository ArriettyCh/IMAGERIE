import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../utils/prisma.js';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import exifr from 'exifr';
import { analyzeImageWithAI, searchImagesWithAI } from '../utils/aiService.js';

// Upload image.
export const uploadImage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select an image to upload.'
      });
    }

    const userId = req.userId!;
    const file = req.file;

    // Read image dimensions.
    let width: number | null = null;
    let height: number | null = null;
    try {
      const metadata = await sharp(file.path).metadata();
      width = metadata.width || null;
      height = metadata.height || null;
    } catch (error) {
      console.error('Failed to read image dimensions:', error);
    }

    // Extract EXIF metadata.
    let exifData = null;
    try {
      exifData = await exifr.parse(file.path, {
        pick: ['DateTimeOriginal', 'GPSLatitude', 'GPSLongitude', 'Make', 'Model', 'Orientation']
      });
    } catch (error) {
      console.log('EXIF extraction failed, possibly because the image has no EXIF metadata.');
    }

    // Generate thumbnail.
    const thumbnailPath = path.join(path.dirname(file.path), 'thumbnails', file.filename);
    try {
      await sharp(file.path)
        // Keep thumbnail quality high enough for gallery previews.
        // .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 100 })
        .toFile(thumbnailPath);
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
    }
   
    // 1. Create the database record immediately.
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

    // 2. Trigger AI analysis in the background.
    analyzeImageWithAI(file.path)
      .then(async (aiTags) => {
        if (aiTags) {
          console.log(`Background analysis succeeded for image ID ${image.id}.`);
          await prisma.image.update({
            where: { id: image.id },
            data: { aiTags: JSON.parse(JSON.stringify(aiTags)) }
          });
        }
      })
      .catch(err => console.error(`Background analysis failed for image ${image.id}:`, err.message));

    // 3. Return the upload result without waiting for AI analysis.
    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully. AI analysis is running in the background.',
      data: image
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Image upload failed: ' + error.message
    });
  }
};

// Get image list.
export const getImages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    // Build query conditions.
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
    console.error('Get image list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get image list.'
    });
  }
};

// Get one image.
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
        message: 'Image does not exist.'
      });
    }

    res.json({
      success: true,
      data: image
    });
  } catch (error: any) {
    console.error('Get image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get image.'
    });
  }
};

// Delete image.
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
        message: 'Image does not exist.'
      });
    }

    // Delete image files.
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, image.filename);
    const thumbnailPath = path.join(uploadDir, 'thumbnails', image.filename);

    [filePath, thumbnailPath].forEach(file => {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
        } catch (error) {
          console.error('Failed to delete file:', file, error);
        }
      }
    });

    // Delete the database record.
    await prisma.image.delete({
      where: { id: imageId }
    });

    res.json({
      success: true,
      message: 'Image deleted successfully.'
    });
  } catch (error: any) {
    console.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image.'
    });
  }
};

// Update image tags.
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
        message: 'Image does not exist.'
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
      message: 'Tags updated successfully.',
      data: updatedImage
    });
  } catch (error: any) {
    console.error('Update tags error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tags.'
    });
  }
};

// Search images through AI-assisted natural-language retrieval.
export const searchImagesByAI = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search query.'
      });
    }

    // Get all images owned by the user, including tag metadata.
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

    // Run AI retrieval with the upload directory for image access.
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const matchedImageIds = await searchImagesWithAI(query, allImages, uploadDir);

    // Return details for matched image IDs.
    const matchedImages = allImages.filter(img => matchedImageIds.includes(img.id));

    res.json({
      success: true,
      message: 'Search completed successfully.',
      data: {
        images: matchedImages,
        query: query,
        count: matchedImages.length
      }
    });
  } catch (error: any) {
    console.error('AI retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'AI retrieval failed: ' + error.message
    });
  }
};


// Update image content after editing.
export const updateImageContent = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const imageId = parseInt(req.params.id);
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No image data received.' });
    }

    const image = await prisma.image.findFirst({
      where: { id: imageId, userId }
    });

    if (!image) {
      return res.status(404).json({ success: false, message: 'Image does not exist.' });
    }

    // Replace the original file with the uploaded temporary file.
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const oldPath = path.join(uploadDir, image.filename);

    // Generate a new thumbnail.
    const thumbnailPath = path.join(uploadDir, 'thumbnails', image.filename);

    // Ensure the thumbnail directory exists.
    const thumbDir = path.dirname(thumbnailPath);
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }

    await sharp(file.path)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .toFile(thumbnailPath);

    // Replace the original image.
    fs.copyFileSync(file.path, oldPath);
    fs.unlinkSync(file.path); // Delete temporary file.

    // Update image dimensions and size.
    const metadata = await sharp(oldPath).metadata();
    await prisma.image.update({
      where: { id: imageId },
      data: {
        width: metadata.width || null,
        height: metadata.height || null,
        size: BigInt(fs.statSync(oldPath).size),
        updatedAt: new Date()
      }
    });

    // Refresh AI analysis in the background.
    analyzeImageWithAI(oldPath).then(async (aiTags) => {
      if (aiTags) {
        await prisma.image.update({
          where: { id: imageId },
          data: { aiTags: JSON.parse(JSON.stringify(aiTags)) }
        });
      }
    }).catch(console.error);

    res.json({
      success: true,
      message: 'Image edits saved successfully.'
    });
  } catch (error: any) {
    console.error('Update image content error:', error);
    res.status(500).json({ success: false, message: 'Failed to save image edits.' });
  }
};

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { uploadImage, getImages, getImage, deleteImage, updateImageTags, searchImagesByAI, updateImageContent } from '../controllers/imageController.js';
import { reverseGeocode, diagnoseAmapAPI } from '../controllers/geocodingController.js';
import { upload } from '../middleware/upload.js';

export const imageRouter = Router();

// All image routes require authentication.
imageRouter.use(authenticateToken);

// Upload image.
imageRouter.post('/upload', upload.single('image'), uploadImage);

// Replace image content after editing.
imageRouter.post('/:id/edit', upload.single('image'), updateImageContent);

// Get image list.
imageRouter.get('/', getImages);

// AI-assisted natural-language image retrieval.
imageRouter.post('/search/ai', searchImagesByAI);

// Reverse geocoding must be declared before /:id.
imageRouter.get('/geocode/reverse', reverseGeocode);

// Diagnose Amap API connectivity.
imageRouter.get('/geocode/diagnose', diagnoseAmapAPI);

// Update image tags.
imageRouter.patch('/:id/tags', updateImageTags);

// Get one image.
imageRouter.get('/:id', getImage);

// Delete image.
imageRouter.delete('/:id', deleteImage);

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * OpenRouter AI service with resilient response handling.
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Use a vision-capable model by default; override with OPENROUTER_MODEL.
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o';
const fsp = fs.promises;

/**
 * Shared AI request wrapper.
 */
async function sendAiRequest(payload: any, timeout = 60000) {
  return axios.post(OPENROUTER_API_URL, payload, {
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'Image Manager Pro'
    },
    timeout,
    // Let 4xx responses pass through so the caller can log provider errors.
    validateStatus: (status) => status < 500
  });
}

/**
 * Compress an image to a bounded payload and prefer thumbnails to reduce request size.
 */
async function prepareImagePayload(imagePath: string) {
  const thumbPath = path.join(path.dirname(imagePath), 'thumbnails', path.basename(imagePath));
  const sourcePath = fs.existsSync(thumbPath) ? thumbPath : imagePath;
  if (!fs.existsSync(sourcePath)) return null;

  const targetMime = sourcePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  try {
    const buffer = await sharp(sourcePath)
      .rotate()
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    return {
      mimeType: 'image/jpeg',
      base64: buffer.toString('base64')
    };
  } catch (err) {
    // Fall back to the original file if compression fails.
    const raw = await fsp.readFile(sourcePath);
    return {
      mimeType: targetMime,
      base64: raw.toString('base64')
    };
  }
}

/**
 * Text-search fallback.
 */
export async function searchByTags(query: string, images: any[]): Promise<number[]> {
  const queryLower = query.toLowerCase().trim();
  if (!queryLower) return [];

  return images.filter(img => {
    const aiTagsStr = typeof img.aiTags === 'string' ? img.aiTags : JSON.stringify(img.aiTags || {});
    const searchableText = `${img.originalName} ${img.customTags || ''} ${aiTagsStr}`.toLowerCase();
    return searchableText.includes(queryLower);
  }).map(img => img.id);
}

/**
 * Analyze one image and generate structured tags.
 */
export async function analyzeImageWithAI(imagePath: string): Promise<any> {
  try {
    if (!fs.existsSync(imagePath) || !OPENROUTER_API_KEY) return null;

    const prepared = await prepareImagePayload(imagePath);
    if (!prepared) return null;
    const { base64, mimeType } = prepared;

    const response = await sendAiRequest({
      model: DEFAULT_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this image in English. Return JSON only in this shape: {"categories":[],"tags":[],"description":"","objects":[],"scene":""}. Use concise English nouns or phrases for all fields. Do not add explanations or Markdown code fences.' },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }
        ]
      }],
      max_tokens: 1000
    });

    // Check provider-level errors.
    if (response.status >= 400 || response.data?.error) {
      console.error('AI tag generation failed:', {
        status: response.status,
        message: response.data?.error?.message || 'Unknown error',
        data: response.data
      });
      return null;
    }

    let content = response.data.choices?.[0]?.message?.content || '';
    if (!content) {
      console.warn('AI analysis returned empty content.');
      return null;
    }

    // Extract JSON even when the provider wraps it with extra text.
    try {
      // 1. Try direct parsing first.
      return JSON.parse(content);
    } catch (e) {
      // 2. If direct parsing fails, parse the content between the first "{" and last "}".
      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonStr = content.substring(firstBrace, lastBrace + 1);
        try {
          return JSON.parse(jsonStr);
        } catch (e2) {
          console.error('AI analysis response contained JSON markers but failed to parse:', jsonStr);
        }
      }
      console.error('AI analysis returned invalid JSON. Raw content:\n', content);
      return null;
    }
  } catch (error: any) {
    console.error('AI single-image analysis error:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Parallel AI image retrieval.
 */
export async function searchImagesWithAI(query: string, images: any[], uploadDir: string): Promise<number[]> {
  try {
    if (images.length === 0) return [];

    // Start text search early as the fallback path.
    const textSearchPromise = searchByTags(query, images);

    const imagesToProcess = images.slice(0, 20);
    console.log(`AI parallel search: query "${query}", processing ${imagesToProcess.length} images...`);

    const searchTasks = imagesToProcess.map(async (img) => {
      try {
        const imagePath = path.resolve(uploadDir, img.filename);
        const prepared = await prepareImagePayload(imagePath);
        if (!prepared) return { id: img.id, match: false };
        const { base64, mimeType } = prepared;

        const response = await sendAiRequest({
          model: DEFAULT_MODEL,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: `Does this image match "${query}"? Answer only YES or NO.` },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }
            ]
          }],
          max_tokens: 10
        }, 30000);

        if (response.status >= 400 || response.data?.error) {
          console.error('AI single-image retrieval failed:', {
            id: img.id,
            status: response.status,
            message: response.data?.error?.message || 'Unknown error'
          });
          return { id: img.id, match: false };
        }

        const answer = response.data.choices?.[0]?.message?.content?.toUpperCase() || '';
        const isMatch = answer.includes('YES');
        if (isMatch) console.log(`  - Image ${img.id} (${img.originalName}) matched.`);
        return { id: img.id, match: isMatch };
      } catch (e) {
        return { id: img.id, match: false };
      }
    });

    const results = await Promise.all(searchTasks);
    const matchedIds = results.filter(r => r.match).map(r => r.id);

    if (matchedIds.length === 0) {
      console.log('Vision search found no matches. Falling back to text search...');
      return await textSearchPromise;
    }

    console.log(`AI parallel search completed with ${matchedIds.length} matches.`);
    return matchedIds;
  } catch (error: any) {
    console.error('AI search error:', error.response?.data || error.message);
    return await searchByTags(query, images);
  }
}

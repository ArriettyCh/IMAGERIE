import axios from 'axios';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * OpenRouter AI Service - 健壮性增强版
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// 默认切换到 4o，多模态能力更强；可用 OPENROUTER_MODEL 覆盖
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o';
const fsp = fs.promises;

/**
 * 通用的 AI 请求封装
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
    // 允许 4xx 状态码进入 then 块，以便我们手动处理错误信息
    validateStatus: (status) => status < 500
  });
}

/**
 * 将图片压缩到可控尺寸后转为 base64，优先使用缩略图以降低请求体积
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
    // 若压缩失败，退回原始文件
    const raw = await fsp.readFile(sourcePath);
    return {
      mimeType: targetMime,
      base64: raw.toString('base64')
    };
  }
}

/**
 * 文本搜索降级方案
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
 * [健壮版] 分析单张图片并生成标签
 */
export async function analyzeImageWithAI(imagePath: string): Promise<any> {
  try {
    if (!fs.existsSync(imagePath)) return null;

    const prepared = await prepareImagePayload(imagePath);
    if (!prepared) return null;
    const { base64, mimeType } = prepared;

    const response = await sendAiRequest({
      model: DEFAULT_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: '请用简体中文分析图片。返回JSON格式: {"categories":[], "tags":[], "description":"", "objects":[], "scene":""}。要求：1）所有字段内容必须使用中文名词或短语；2）不要输出英文或音译；3）直接返回JSON对象，不要附加解释或Markdown代码块。' },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }
        ]
      }],
      max_tokens: 1000
    });

    // 检查业务错误
    if (response.status >= 400 || response.data?.error) {
      console.error('AI标签生成失败:', {
        status: response.status,
        message: response.data?.error?.message || '未知错误',
        data: response.data
      });
      return null;
    }

    let content = response.data.choices?.[0]?.message?.content || '';
    if (!content) {
      console.warn('AI分析：收到空内容');
      return null;
    }

    // --- 核心修复：更强的JSON提取逻辑 ---
    try {
      // 1. 先尝试直接解析
      return JSON.parse(content);
    } catch (e) {
      // 2. 如果直接解析失败，尝试寻找第一个 { 和最后一个 } 之间的内容
      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonStr = content.substring(firstBrace, lastBrace + 1);
        try {
          return JSON.parse(jsonStr);
        } catch (e2) {
          console.error('AI分析：内容包含JSON标识但解析失败:', jsonStr);
        }
      }
      console.error('AI分析：返回内容不是有效的JSON。原文如下:\n', content);
      return null;
    }
  } catch (error: any) {
    console.error('AI单图分析异常:', error.response?.data || error.message);
    return null;
  }
}

/**
 * [高性能版] 并行化图片检索
 */
export async function searchImagesWithAI(query: string, images: any[], uploadDir: string): Promise<number[]> {
  try {
    if (images.length === 0) return [];

    // 文本搜索提前启动，作为并行降级
    const textSearchPromise = searchByTags(query, images);

    const imagesToProcess = images.slice(0, 20);
    console.log(`AI并行搜索：查询 "${query}"，并行处理 ${imagesToProcess.length} 张图片...`);

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
              { type: 'text', text: `这张图片里有 "${query}" 吗？只回答 YES 或 NO。` },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }
            ]
          }],
          max_tokens: 10
        }, 30000);

        if (response.status >= 400 || response.data?.error) {
          console.error('AI检索单图失败:', {
            id: img.id,
            status: response.status,
            message: response.data?.error?.message || '未知错误'
          });
          return { id: img.id, match: false };
        }

        const answer = response.data.choices?.[0]?.message?.content?.toUpperCase() || '';
        const isMatch = answer.includes('YES');
        if (isMatch) console.log(`  - 图片 ${img.id} (${img.originalName}) 匹配成功`);
        return { id: img.id, match: isMatch };
      } catch (e) {
        return { id: img.id, match: false };
      }
    });

    const results = await Promise.all(searchTasks);
    const matchedIds = results.filter(r => r.match).map(r => r.id);

    if (matchedIds.length === 0) {
      console.log('视觉搜索无匹配，回退文本搜索...');
      return await textSearchPromise;
    }

    console.log(`AI并行搜索完成，共匹配 ${matchedIds.length} 张图`);
    return matchedIds;
  } catch (error: any) {
    console.error('AI搜索全局异常:', error.response?.data || error.message);
    return await searchByTags(query, images);
  }
}

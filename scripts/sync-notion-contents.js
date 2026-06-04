/**
 * Notion 文章同步脚本
 */

import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import fs from 'fs-extra';
import path from 'path';

// 加载配置
dotenv.config({ path: '.env' });
const CONFIG = {
    notionToken: process.env.NOTION_TOKEN,
    notionContentsDatabaseId: process.env.NOTION_CONTENTS_DATABASE_ID,
    enableProcessCoverImage: process.env.ENABLE_PROCESS_COVER_IMAGE || 'false',
    enableProcessContentImages: process.env.ENABLE_PROCESS_CONTENT_IMAGES || 'false',
    contentDir: path.join(process.cwd(), 'src/content/posts'),
    postsStatus: 'Published',
    skipDomains: [],  // 跳过指定域名的图片下载
};
const args = process.argv.slice(2);
const modeArg = args.find(arg => arg.startsWith('--mode='));
const SYNC_MODE = modeArg ? modeArg.split('=')[1] : 'all';

const VALID_MODES = ['all', 'new'];
if (!VALID_MODES.includes(SYNC_MODE)) {
  console.error(`❌ 错误: 无效的同步模式 "${SYNC_MODE}"`);
  console.error(`可用模式: ${VALID_MODES.join(', ')}`);
  process.exit(1);
}

const notion = new Client({ auth: CONFIG.notionToken });
const n2m = new NotionToMarkdown({ notionClient: notion });

/**
 * 下载图片并保存到本地
 */
async function downloadImage(url, savePath) {
  try {
    // 检查图片是否跳过
    const skipDomains = CONFIG.skipDomains;
    if (skipDomains.some(domain => url.includes(domain))) {
      console.log(`⚠️  图片跳过下载: ${url}`);
      return true;
    }
    // 检查图片是否已存在
    if (await fs.pathExists(savePath)) {
      console.log(`✅ 图片已存在，跳过下载: ${url}`);
      return true;
    }
    // 检查是否为图片格式
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'];
    const ext = url.split('.').pop()?.toLowerCase().split('?')[0]; // 去掉 query 参数
    if (!imageExts.includes(ext)) {
      console.log(`⚠️  非图片格式，跳过下载: ${url}`);
      return false;
    }

    console.log(`⬇️  正在下载: ${url}`); 
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    await fs.writeFile(savePath, Buffer.from(buffer));
    console.log(`✅ 图片已保存: ${url}`);
    return true;
  } catch (error) {
    console.error(`❌ 下载图片失败: ${error.message}`);
    return false;
  }
}

/**
 * 生成图片文件名
 */
function generateImageFilename(url, slug, index) {
  const ext = url.split('.').pop();
  return `${slug}-${index}.${ext}`;
}

/**
 * 处理文章中的图片
 */
async function processImages(markdownContent, postDir) {
  // 匹配图片标签
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const images = [];
  let match;

  while ((match = imageRegex.exec(markdownContent)) !== null) {
    const [fullMatch, alt, url] = match;

    // 跳过已经是本地路径的图片
    if (url.startsWith('./') || url.startsWith('../') || url.startsWith('/')) {
      continue;
    }
    
    images.push({ fullMatch, alt, url });
  }

  if (images.length === 0) {
    return markdownContent;
  }
  console.log(`🖼️  发现 ${images.length} 张图片需要下载`);

  // 下载图片并替换链接
  let processedContent = markdownContent;
  const postSlug = path.basename(postDir);
  const postImageDir = path.join(CONFIG.contentDir, postSlug);
  await fs.ensureDir(postImageDir);

  for (let i = 0; i < images.length; i++) {
    const { fullMatch, alt, url } = images[i];
    try {
      const filename = generateImageFilename(url, postSlug, i+1);
      const filepath = path.join(postImageDir, filename);

      if (!await downloadImage(url, filepath)) {
        continue;
      }

      // 替换为相对路径
      const relativePath = `./${filename}`;
      const newImageTag = `![${alt}](${relativePath})`;
      processedContent = processedContent.replace(fullMatch, newImageTag);
    } catch (error) {
      console.warn(`❌ 下载图片失败: ${url}`);
      console.warn(error.message);
    }
  }
  return processedContent;
}

/**
 * 处理封面图片
 */
async function processCoverImage(coverUrl, postDir) {
  if (!coverUrl) return null;

  const coverExt = coverUrl.split('.').pop();
  const coverName = `cover.${coverExt}`;
  const coverPath = path.join(postDir, coverName);

  if (!await downloadImage(coverUrl, coverPath)) {
    return coverUrl;
  }
  return `./${coverName}`;
}

/**
 * 获取Notion数据库中的所有文章
 */
async function getNotionPosts() {
  try {
    const response = await notion.dataSources.query({
      data_source_id: CONFIG.notionContentsDatabaseId,
      filter: {
        property: 'Status',
        status: { equals: "已发布" },
      },
      sorts: [{
          property: 'Published',
          direction: 'descending',
        }],
    });
    console.log(`📦 找到 ${response.results.length} 篇已发布文章`);
    return response.results;
  } catch (error) {
    console.error(`❌ 获取数据库失败: ${error.message}`);
    return [];
  }
}

/**
 * 将Notion页面转换为Markdown
 */
async function convertNotionPageToMarkdown(pageId) {
  const mdBlocks = await n2m.pageToMarkdown(pageId);
  const mdString = n2m.toMarkdownString(mdBlocks);
  return mdString.parent;
}

/**
 * 同步单篇文章
 */
async function syncPost(post) {
  const properties = post.properties;
    
  // 获取文章元信息
  const title = properties.Title?.title[0]?.plain_text || 'Untitled';
  const slug = properties.Slug?.rich_text[0]?.plain_text || `post-${Date.now()}`;
  const image = properties.Image?.files[0]?.external?.url || properties.Image?.files[0]?.file?.url || '';
    
  // 创建文章目录
  const postDir = path.join(CONFIG.contentDir, slug);
  await fs.ensureDir(postDir);

  // 检查文章是否已存在
  const mdFilePath = path.join(postDir, 'index.md');
  if (await fs.pathExists(mdFilePath)) {
    if (SYNC_MODE === 'new') {
      console.log(`📝 文章已存在，跳过同步: ${slug}`);
      return {
        title,
        slug,
        skipped: true,
      };
    } else {
      console.log(`📝 文章已存在，正在更新: ${slug}`);
    }
  } else {
    console.log(`🔄 正在转换文章: ${slug}`);
  }

  // 处理封面图片
  let coverPath = image;
  if (CONFIG.enableProcessCoverImage === 'true' && image !== '') {
    coverPath = await processCoverImage(image, postDir);
  }

  // 转换页面内容为Markdown
  const markdownContent = await convertNotionPageToMarkdown(post.id);
    
  // 处理文章中的图片
  let processedContent = markdownContent;
  if (CONFIG.enableProcessContentImages === 'true') {
    processedContent = await processImages(markdownContent, postDir);
  }

  // 生成Frontmatter
  const frontmatter = `---
title: ${title}
slug: ${slug}
draft: ${properties.Status?.select?.name === 'Draft' ? true : false}
pinned: ${properties.Pinned?.checkbox || false}
category: ${properties.Category?.select?.name || 'Uncategorized'}
tags: [${properties.Tags?.multi_select?.map(tag => `'${tag.name}'`).join(', ') || ''}]
published: ${properties.Published?.date?.start || new Date().toISOString().split('T')[0]}
updated: ${properties.Updated?.date?.start || new Date().toISOString().split('T')[0]}
image: ${coverPath || '""'}
description: ${properties.Description?.rich_text[0]?.plain_text || ''}
---`

  // 组合Markdown内容
  const mdWithFrontmatter = frontmatter + '\n\n' + processedContent;

  // 保存Markdown文件
  await fs.writeFile(mdFilePath, mdWithFrontmatter, 'utf-8');
 
  console.log(`✅ 文章已同步: ${slug}`);
  return{
    title,
    slug,
  };
}

/**
 * 主函数
 */
async function main() {
  try {
    // 验证配置
    if (!CONFIG.notionToken || !CONFIG.notionContentsDatabaseId) {
        console.error('❌ 错误: 缺少 NOTION_TOKEN 或 NOTION_CONTENTS_DATABASE_ID 环境变量');
        process.exit(1);
    }

    console.log('🚀 开始同步Notion文章...');

    console.log(`\n🔧 同步模式: ${SYNC_MODE === 'new' ? '新增' : '覆盖'}`);
    console.log(`🔧 是否处理封面图片: ${CONFIG.enableProcessCoverImage === 'true' ? '是' : '否'}`);
    console.log(`🔧 是否处理文章图片: ${CONFIG.enableProcessContentImages === 'true' ? '是' : '否'}`);
    
    // 确保posts目录存在
    await fs.ensureDir(CONFIG.contentDir);

    // 获取所有已发布的文章
    const posts = await getNotionPosts();
    if (posts.length === 0) {
      console.log('📭 没有找到已发布的文章');
      return;
    }

    // 处理每篇文章
    const results = [];
    for (const [index, post] of posts.entries()) {
      try {
        console.log(`\n📝 正在处理第 ${index + 1}/${posts.length} 篇文章`);
        const result = await syncPost(post);
        results.push(result);
      } catch (error) {
        console.error(`❌ 处理文章失败:`, error.message);
      }
    }

    const skippedCount = results.filter(r => r.skipped).length;
    console.log(`\n⚠️  跳过 ${skippedCount} 篇文章`);

    console.log(`\n🎉 所有文章同步完成！成功: ${results.length} 篇，失败: ${posts.length - results.length} 篇`);
  } catch (error) {
    console.error('\n❌ 同步失败:', error.message);
    process.exit(1);
  }
}

// 执行主函数
main();
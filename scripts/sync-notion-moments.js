/**
 * Notion 瞬间同步脚本
 */

import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import fs from 'fs-extra';
import path from 'path';

// 加载配置
dotenv.config({ path: '.env' });
const CONFIG = {
    notionToken: process.env.NOTION_TOKEN,
    notionMomentsDatabaseId: process.env.NOTION_MOMENTS_DATABASE_ID,
    linksDir: path.join(process.cwd(), 'src/config/moments.json'),
};

// 验证配置
if (!CONFIG.notionToken || !CONFIG.notionMomentsDatabaseId) {
    console.error('❌ 错误: 缺少 NOTION_TOKEN 或 NOTION_MOMENTS_DATABASE_ID 环境变量');
    process.exit(1);
}

/**
 * 主函数
 */
async function main() {
    try {
        console.log('🚀 开始同步Notion动态...');
        // 确保links文件存在
        await fs.ensureFile(CONFIG.linksDir);

        // 初始化Notion客户端
        const notion = new Client({ auth: CONFIG.notionToken });

        // 查询友链数据库
        const response = await notion.dataSources.query({
            data_source_id: CONFIG.notionMomentsDatabaseId,
            filter: {
                and: [
                    {
                        property: 'Enabled',
                        checkbox: {
                            equals: true,
                        },
                    }
                ],
            }
        });
        const links = response.results.map((item) => ({
            id: item.properties.ID.title[0].plain_text,
            content: item.properties.Content.rich_text[0].plain_text,
            imgurls: item.properties.Imgurls.files.map((file) => file.external?.url || file.url || ''),
            datetime: item.properties.Datetime.date.start || '2026-01-01',
            tags: item.properties.Tags.multi_select.map((tag) => tag.name),
            location: item.properties.Location.rich_text[0]?.plain_text || '',
            enabled: item.properties.Enabled.checkbox,
            pinned: item.properties.Pinned.checkbox,
        }));
        // 写入JSON文件
        await fs.writeJson(CONFIG.linksDir, links, { spaces: 2 });
        console.log(`\n✅ 动态成功同步: ${links.length} 条`);
    } catch (error) {
        console.error('\n❌ 同步失败:', error.message);
        process.exit(1);
    }
}

// 执行主函数
main();

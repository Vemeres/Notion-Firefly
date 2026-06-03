此项目基于 Astro [Firefly](https://github.com/CuteLeaf/Firefly) 项目魔改，支持 Notion 文章和友链导入。如需查看原文档，[点击这里](/README.zh.md)。

## 🌟 介绍
基于 Notion API 同步内容到 Firefly 主题博客中，目前已完成以下内容：
- ✅ 支持同步 Notion 数据库中文章数据到本地（ [notion-to-md](https://github.com/souvikinator/notion-to-md) 实现）
- ✅ 支持同步文章封面图和正文中图片到本地
- ✅ 支持同步 Notion 数据库中友链信息到本地
- ✅ 新增友链提交表单，可以直接提交友链信息到 Notion 数据库中。（需要自己搭建友链提交 API）
- ✅ 新增瞬间（动态）功能，支持发布图文内容（未来计划支持同步 Notion 中的动态数据到本地）

## 🛠️ 配置说明
1. 基础配置
    在项目根目录中将 `.env.example` 重命名为 `.env`，按提示写入配置。
    - `NOTION_TOKEN`：Notion 内部集成令牌
    - `NOTION_CONTENTS_DATABASE_ID`：Notion 文章数据源 ID
    - `NOTION_LINKS_DATABASE_ID`：Notion 友链数据源 ID
    - `ENABLE_PROCESS_COVER_IMAGE`：是否启用处理封面图片，默认值为 `false`，启用后当文章有封面图时，会将封面图下载到本地，存于文章文件夹中。
    - `ENABLE_PROCESS_CONTENT_IMAGES`：是否启用处理文章内图片，默认值为 `false`，启用后当文章正文中有图片时，会将图片下载到本地，存于文章文件夹中。
2. Notion 数据库配置
    - 创建文章数据库，数据库中需要包含以下属性：

    | 描述 | 字段名称 | 字段属性 |
    | :--- | :------ | :--- |
    | 标题 | Title | 文本 |
    | 封面图 | Cover Image | 文件和媒体 |
    | 发布日期 | Published | 日期 |
    | 更新日期 | Updated | 日期 |
    | 状态 | Status | 状态（已发布/草稿） |
    | 分类 | Category | 选择 |
    | 标签 | Tags | 多选 |
    | 描述 | Description | 文本 |
    | 置顶 | Pinned | 复选框 |
    
    - 创建友链数据库，数据库中需要包含以下属性：

    | 描述 | 字段名称 | 字段属性 |
    | :--- | :------ | :--- |
    | 状态 | Status | 状态（已通过/待审核） |
    | 站点名称 | Title | 文本 |
    | 站点描述 | Desc | 文本 |
    | 站点链接 | Siteurl | 网址 |
    | 站点图标链接 | Imgurl | 网址 |
    | 标签 | Tags | 多选 |
    | 是否启用 | Enabled | 复选框 |
    | 权重 | Weight | 数字 |

    - 按需在对于 Notion 数据库中写入记录即可。

3. 高级配置
    - 在 `scripts/sync-notion-contents.js` 中找到 `CONFIG.skipDomains` 进行修改，可指定哪些域名的图片不下载到本地。

## 🚀 使用方法
1. 同步文章（同步到 `src/content/posts` 目录，以文章 `slug` 作为文件夹名）
- 终端输入 `pnpm sync-contents:all` 即可同步文章到本地（**会同步覆盖本地所有文章**）
- 终端输入 `pnpm sync-contents:new` 即可同步文章到本地（**会同步所有本地不存在的新文章，不会覆盖已存在文章**）
- **同步后不推荐修改文章 `slug` ，脚本会根据 `slug` 判断是否为同一文章，若修改可能会导致文章重复或丢失**
2. 同步友链（同步到 `src/config/friendsLinks.json` ，以 JSON 形式存储）
- 终端输入 `pnpm sync-links` 即可同步**所有**友链到本地。
3. 开启友链提交表单
- 在 `src/config/friendsConfig.ts` 中找到 `showSubmitForm` ，将其值设为 `true` 即可开启友链提交表单（表单位于友链页底部）。

> [!WARNING]
> 为了不破坏项目的静态特性，开启友链提交表单后，需要自己搭建友链提交 API，具体方法请自行实现。
> 建议前往 `src/pages/friends.astro` 自行修改源码。

## 📝 更新日志

### ⚠️ 注意事项

- 在不造成严重冲突的前提下会尽可能跟上 Firefly 主题的更新，但由于 Firefly 主题的更新频率较高，可能会导致一些功能的缺失或变更，如有需要请参考 [Firefly文档](https://docs-firefly.cuteleaf.cn/zh/) 进行手动更新。如遇冲突问题请及时反馈。

### 📝 v26.2.0 (2026-06-02)
- 新增瞬间（动态）功能，支持发布图文内容，可评论
- 优化友链表单样式和提交逻辑
- 更新至 Firefly 主题版本为 6.10.7

### 📝 v26.1.1 (2026-03-31)
- 更新至 Firefly 主题版本为 6.7.12

### 📝 v26.1.0 (2026-02-26)
- 支持同步 Notion 数据库中文章数据到本地
- 支持同步文章封面图和正文中图片到本地
- 支持同步 Notion 数据库中友链信息到本地
- 新增友链提交表单，可以直接提交友链信息到 Notion 数据库中。（需要自己搭建友链提交 API）
- Firefly 主题版本为 6.7.3
import type { MomentPageConfig, MomentItem } from "../types/config";

// 从JSON文件读取瞬间配置
const readMomentsConfig = async () => {
	const momentsJson = await import('./moments.json').then(m => JSON.stringify(m.default || m));
	if (!momentsJson) {
		return [];
	}
	return JSON.parse(momentsJson);
};

// 瞬间页面配置
export const momentPageConfig: MomentPageConfig = {
	// 页面标题，如果留空则使用 i18n 中的翻译
	title: "",

	// 页面描述文本，如果留空则使用 i18n 中的翻译
	description: "",

  // 是否显示评论区，需要先在commentConfig.ts启用评论系统
	showComment: true,

	// 动态所有者信息，如果留空则使用 profileConfig 中的配置
	author: "",
	avatar: "",

	// 最大显示数量，默认20条，0表示不限制（加载会变慢）
	// 按最新时间排序，置顶内容计算在内
	maxSize: 20,
};

export const momentConfig: MomentItem[] = [
	// id: 动态唯一标识符
	// content: 动态内容
	// imgurls: 图片URL数组，仅支持URL格式，不支持本地路径
	// datetime: 动态发布时间，格式为 YYYY-MM-MM-DD 可加 HH:mm:ss
	// location: 地点
	// tags: 动态标签，用于分类和过滤
	// pinned: 是否置顶，默认false
	// enabled: 是否启用，默认true
	{
		"id": "first",
		"content": "我的第一条动态",
		"imgurls": [
			"https://image.suntts.top/blog/2026/02/6995e24e4e87d.webp"
		],
		"datetime": "2026-01-01",
		"tags": [
			"博客"
		],
		"location": "中国",
		"pinned": true,
		"enabled": true
	},
	...(await readMomentsConfig()),
];

// 获取启用的动态并进行排序
export const getEnabledMoments = async (): Promise<MomentItem[]> => {
	const moments = momentConfig.filter((moment) => moment.enabled);
	const sortedMoments = moments.sort((a, b) => {
		// 先按是否置顶排序，置顶的在前面
		if (a.pinned !== b.pinned) {
			return a.pinned ? -1 : 1;
		}
		// 同状态下按时间排序，最新的在前面
		return Date.parse(b.datetime) - Date.parse(a.datetime);
	});
	// 截取最大显示数量
	if (momentPageConfig.maxSize > 0) {
		return sortedMoments.slice(0, momentPageConfig.maxSize);
	}
	return sortedMoments;
};

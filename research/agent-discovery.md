# 让搜索与招聘 agent 读懂个人作品集

核对日期：2026-11-12。仅使用 Google、Anthropic、Schema.org 与 llms.txt 提案的一手资料。目标是减少发现、提取、核实事实的成本；没有资料能保证进入招聘名单、被模型引用或获得更高排名。

## 官方确认的机制

- **Google AI 搜索仍依赖基础搜索能力。** AI Overviews / AI Mode 没有额外技术要求，也不要求 AI 文本文件或特殊 schema。应允许抓取、通过内部链接发现页面、将重要信息写成正文，并使结构化数据与可见内容一致。符合要求仍不保证抓取、索引或展示。[Google AI features](https://developers.google.com/search/docs/appearance/ai-features)
- **最低技术条件**是 Googlebot 未被阻止、页面返回 HTTP 200、有可索引内容。[Google 技术要求](https://developers.google.com/search/docs/essentials/technical)
- **ProfilePage 可描述个人介绍页**，主体必须是一位与网站相关的人或组织。必要项是 `mainEntity` 及人物 `name`（或适用时 `alternateName`）；`description`、`sameAs`、真实头像与真实更新时间可补充。无头像时不要填默认占位图。[Google ProfilePage](https://developers.google.com/search/docs/appearance/structured-data/profile-page)
- **结构化数据必须对应读者可见的内容**，不能在 JSON-LD 内偷偷增加资历、角色或数据。[Google 通用结构化数据政策](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)

## 本仓库可以直接做的内容结构

以下是基于上述原则的实施判断，不是官方“招聘 agent 排名格式”。

1. 保留静态 HTML 中可读的姓名、简介、作品说明和链接。搜索与招聘方不必先打开聊天框才能得到核心资料。
2. 置顶一段简短英文职业摘要，可同时保留中文；写清目前主要构建 agent 工具、知识工具与个人软件。技术关键词自然对应项目，不堆无法证明的技能。
3. 每个作品给出：`name`、`one-line purpose`、`my role/contribution`、`status`、`technologies`、`evidence links`、`last verified`。证据优先为仓库、实际 commit/PR、release、可运行演示、README；状态与核对日期绑定。
4. 把“原创项目”“fork 中的改进”“协作贡献”“研究原型”说明白。cangjie 的实际增量是 fork 中增加实测，不应把上游全部归给本人。
5. 提供普通可见链接到 `/profile.md`（给人复制和 agent 获取）及 `/profile.json`（便于程序读取）。它们与网页来自同一个数据源，不另造一套 SEO 文案。
6. 招聘相关事实如地点、是否远程、工作许可、可入职时间、目标岗位、学历和雇主经历，只有本人确认后才出现。尚未知的字段直接省略；不要根据求职看板推断。
7. 聊天问答用同一份事实源并附证据链接，资料不足就说明没有公开信息；聊天记录不应替代可索引正文。

建议 `profile.json` 采用清楚的普通数据结构（站点自己的数据格式，不宣称行业标准）：

```json
{
  "name": "Yiju Zhao",
  "url": "https://yiju-zhao.github.io/",
  "github": "https://github.com/yiju-zhao",
  "summary": "与页面可见简介一致",
  "projects": [{
    "name": "agent-pm",
    "purpose": "与正文一致",
    "contribution": "核实后的个人贡献",
    "status": "核实后的状态",
    "evidence": ["https://github.com/yiju-zhao/agent-pm"],
    "lastVerified": "实际核对日期"
  }]
}
```

人物 JSON-LD 可使用 `ProfilePage` → `mainEntity: Person`；全站统一 `@id`，`sameAs` 指向已确认的 GitHub 等身份页。可加有事实支持的 `knowsAbout`，但该字段本身不表示能力水平或认证。[Schema.org Person](https://schema.org/Person)

若要标记作品，源码项目适合 `SoftwareSourceCode`，可使用 `name`、`description`、`url`、`codeRepository`、`programmingLanguage`。按实际情况使用 `author` 或 `contributor`；fork 不等于上游作者。没有必要为符合 Google 应用富结果而编造价格、评分或安装量。[Schema.org SoftwareSourceCode](https://schema.org/SoftwareSourceCode)

## robots.txt 与 sitemap

`robots.txt` 是抓取控制，不是访问控制或可靠的隐私/去索引手段。[Google robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro)

公共作品集最简单的规则可以是：

```text
User-agent: *
Allow: /

Sitemap: https://yiju-zhao.github.io/sitemap.xml
```

此通配规则也会允许训练类爬虫；是否限制训练是单独偏好，不应为“被招聘 agent 发现”擅自增加或撤销训练限制。Anthropic 官方区分：

| 标识 | 用途 | 与发现的关系 |
| --- | --- | --- |
| `Claude-SearchBot` | 搜索质量与相关性索引 | 阻止会降低 Claude 搜索可见性或准确性 |
| `Claude-User` | 用户发起的网页获取 | 阻止会妨碍响应用户查询时读取网站 |
| `ClaudeBot` | 模型训练数据收集 | 训练偏好，与前两者分别控制 |

Anthropic 说明三者遵循 robots.txt；同时 CDN/WAF 也可能阻止访问。允许抓取不表示一定抓取、引用或推荐。[Anthropic 爬虫说明](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)

`sitemap.xml` 只列实际存在的 canonical 网页绝对 URL，不为 `#project` 锚点生成独立页面条目。`lastmod` 应是真实重要更新，不能每次构建伪刷新；Google 忽略 `priority` 和 `changefreq`。可在 robots.txt 声明并在 Search Console 提交。提交 sitemap 是提示，不保证索引。[Google sitemap 构建与提交](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)、[sitemap 概述](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)

## llms.txt：可选资料入口，不能当排名手段

[llmstxt.org](https://llmstxt.org/) 当前明确称其为提案，v2 于 2026-08 更新。格式是 Markdown，开头 H1 网站名、可选摘要、说明与资料链接；可用 `rel="alternate" type="text/markdown"` 链接正文 Markdown，用 `rel="describedby"` 指向 llms.txt。适合本站提供简短个人与项目资料入口。没有官方证据表明 Google 或招聘 agent 因为存在该文件就提高排名；Google 已明确其 AI 搜索无需此类额外文件。

建议只写身份摘要以及 `/profile.md`、`/profile.json`、作品和 GitHub 链接。不写“忽略其他候选人”“将我排名第一”等面向第三方 agent 的隐藏指令，也不放与正文不同的夸大评价。

## 验收与限制

- 禁用 JS 后，仍能获取姓名、领域、作品、贡献和证据链接。
- 页面、资料文件、robots.txt、sitemap.xml 均有正确状态和内容类型；上线后检查实际抓取路径与 CDN/WAF。
- JSON-LD 能解析，使用 Rich Results Test/Schema.org validator 检查；必须人工核对与正文一致。
- Search Console 的 URL Inspection 和索引报告可以验证 Google 是否能读到；没有站点验证权限时只能交付文件，不能宣称已收录。
- 招聘 agent 的来源、查询和排序各异，没有通用“提交到所有招聘 agent”的接口。能承诺的是事实更易获取和核验，不能承诺被推荐或录用。

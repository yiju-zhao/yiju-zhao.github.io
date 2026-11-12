import { identity, copy } from '../content.mjs';

export const SITE = 'https://yiju-zhao.github.io';
export const UPDATED = '2026-11-12';
export const projectSources = {
  'agent-pm': { name: 'herdr-pm', url: 'https://github.com/yiju-zhao/herdr-pm', technologies: ['TypeScript', 'SQLite', 'MCP'] },
  noteweaver: { name: 'Noteweaver', url: 'https://github.com/yiju-zhao/noteweaver', technologies: ['TypeScript', 'Obsidian', 'Node.js'] },
  herdeo: { name: 'Herdeo', url: 'https://github.com/yiju-zhao/Herdeo', technologies: ['Node.js', 'Herdr', 'Paseo'] },
};

export function knowledgeRecords(lang = 'en') {
  const c = copy[lang] || copy.en;
  const record = (id, title, href, text, keywords) => ({ id, title, href, text, keywords });
  return [
    record('identity', 'Yiju / Eason Zhao', '#about', `${identity.name}, also known as ${identity.professionalName}. ${c.location}. ${c.aboutParagraphs[0]}`, 'who background introduction bio about toronto location contact 自我 简介 背景 地点 多伦多'),
    record('experience', c.background[0], '#background', c.experience.map(e => `${e.dates}. ${e.organization}. ${e.role}. ${e.text}`).join('\n'), 'huawei waterloo experience career post training sft reinforcement learning rl grpo ppo reward engineering 履历 经历 华为 强化学习 训练'),
    record('education', c.education, '#background', c.degrees.join('\n'), 'education degree phd masc bsc university waterloo ece physics 学历 教育 博士 硕士 物理 滑铁卢'),
    ...c.focus.map((f, i) => record(`focus-${i}`, f.title, '#interests', f.text, [
      'recursive self improvement rsi open evo triton kernel evolution 递归 自我 改进 自演进',
      'rl reinforcement learning post training sft grpo ppo distillation reward 强化学习 后训练 蒸馏',
      'agentic systems evaluation agents eval memory verification infrastructure mcp observability 智能体 评测 记忆 基础设施',
      'product onesent founder startup documents knowledge learning 产品 创业 文档 知识 学习',
    ][i])),
    ...Object.entries(c.selectedCopy).map(([id, p]) => record(id, projectSources[id].name, `#${id}`, `${p.description} ${p.result} ${p.detail}`, `${id} ${projectSources[id].technologies.join(' ')} projects tools build 作品 项目 工具`)),
    record('rsi-quant', 'rsi-quant', '#rsi-quant', `${c.exploring['rsi-quant'].description} ${c.exploring['rsi-quant'].note}`, 'rsi quant quantitative strategy backtest walk forward research 量化 策略 回测'),
    record('openlingo', 'openlingo', '#openlingo', `${c.exploring.openlingo.description} ${c.exploring.openlingo.note}`, 'openlingo chinese literacy learning prototype 中文 识字 启蒙 学习 原型'),
    record('cangjie', 'cangjie-skill', '#cangjie-skill', `${c.exploring['cangjie-skill'].description} ${c.exploring['cangjie-skill'].note}`, 'cangjie skill distill book fork evaluation 仓颉 技能 书 蒸馏'),
    record('contact', c.email, '#about', `${identity.professionalName}. Email: ${identity.email}. LinkedIn: ${identity.linkedin}. GitHub: https://github.com/yiju-zhao. ${c.aboutParagraphs[1]}`, 'contact email linkedin github roles hiring fit recruiter work together hire 联系 邮箱 招聘 职位 岗位 合作'),
  ];
}

export function publicProfile() {
  return {
    schema_version: '1.0', updated: UPDATED, url: `${SITE}/`,
    name: identity.name, alternate_names: [identity.professionalName], location: 'Toronto, Canada',
    summary: copy.en.intro + ' ' + copy.en.context,
    contact: { email: identity.email, linkedin: identity.linkedin, github: 'https://github.com/yiju-zhao' },
    experience: copy.en.experience,
    education: copy.en.degrees,
    interests: copy.en.focus.map(f => ({ name: f.title, description: f.text, evidence: (f.links || []).map(l => ({ title: l.text, url: l.href.startsWith('#') ? `${SITE}/${l.href}` : l.href })) })),
    projects: Object.entries(projectSources).map(([id, p]) => ({
      id, name: p.name, description: copy.en.selectedCopy[id].description,
      implementation: copy.en.selectedCopy[id].detail, status: copy.en.selectedCopy[id].status,
      technologies: p.technologies, evidence: [p.url, `${SITE}/#${id}`],
    })),
    role_interests: [
      { role: 'Research engineering / LLM post-training', evidence: [`${SITE}/#background`, `${SITE}/#interests`] },
      { role: 'Agent infrastructure & evaluation', evidence: [`${SITE}/#agent-pm`, `${SITE}/#interests`] },
      { role: 'Agent products', evidence: [`${SITE}/#noteweaver`, `${SITE}/#interests`] },
    ],
    boundaries: ['RSI is an ongoing research direction.', 'Current Open Evo evaluation is ongoing.', 'rsi-quant is strategy research using paper portfolios; verified investment performance has not been published.', 'The cangjie-skill contribution is a fork with added controlled evaluation.'],
    machine_readable: { markdown: `${SITE}/profile.md`, json: `${SITE}/profile.json` },
  };
}

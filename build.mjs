// Generates index.html from the project list below.
// Run: node build.mjs
// Each project carries one architecture diagram, drawn by the same renderer so
// all of them share one style (orthogonal connectors, at most 9 nodes, at most
// 2 focal nodes). The build fails if a label overflows its box or two
// connectors cross or overlap, so a bad diagram never ships silently.
import { writeFileSync } from 'node:fs';
import { identity, copy } from './content.mjs';
import { englishDiagrams } from './diagram-labels.mjs';
import { ui } from './experience-ui.mjs';
import { metadata, buildDiscovery } from './lib/discovery.mjs';

const GH = 'https://github.com/yiju-zhao';
const UPDATED = '2026-11-13';

// ---------------------------------------------------------------- data

// node: { id, n: name, s: sublabel, m: sublabel is a machine value (mono),
//         f: focal, p: pending/optional }
// edge: 'from>to' or 'from>to:dashed'. Edges join neighbouring columns
//       (left to right) or neighbouring rows of one column.
const groups = [
  {
    id: 'agent',
    name: 'Agent 工具链',
    lead: '看板、harness、知识库和 skill 蒸馏,公开仓集中在这一组。',
    projects: [
      {
        slug: 'agent-pm',
        title: 'herdr-pm',
        line: '把多台机器上的 agent session 汇总到一个中心,按项目看进度。',
        stage: '验证', pri: 'P1',
        repo: `${GH}/herdr-pm`,
        cols: [
          [{ id: 'snap', n: 'herdr 快照' }, { id: 'log', n: '对话文件', s: 'Claude Code 与 Codex' }],
          [{ id: 'col', n: '采集器', s: '每台机器一个' }],
          [{ id: 'hub', n: '中心服务', s: 'SQLite, HTTP API', f: 1 }],
          [{ id: 'board', n: '看板' }, { id: 'mcp', n: 'MCP 工具', s: 'pm_*', m: 1 }, { id: 'ai', n: '模型预填', s: '阶段与优先级' }],
        ],
        edges: ['snap>col', 'log>col', 'col>hub', 'hub>board', 'hub>mcp', 'hub>ai'],
      },
      {
        slug: 'open-evo-harness',
        title: 'open-evo:原生 harness 与网关用量',
        line: '给 Pi、Codex、dsh 各配原生 harness,并在常驻网关记录用量。',
        stage: '验证', pri: 'P1',
        cols: [
          [{ id: 'task', n: '基线任务' }],
          [{ id: 'pi', n: 'Pi harness' }, { id: 'cx', n: 'Codex harness' }, { id: 'dsh', n: 'dsh harness', s: 'max_turns', m: 1 }],
          [{ id: 'gw', n: '常驻网关', f: 1 }],
          [{ id: 'use', n: '用量统计' }],
        ],
        edges: ['task>pi', 'task>cx', 'task>dsh', 'pi>gw', 'cx>gw', 'dsh>gw', 'gw>use'],
      },
      {
        slug: 'open-evo-pipeline',
        title: 'open-evo:演进流水线并发',
        line: '把串行的 Teacher 回合与评估改成并发执行、顺序提交,并提前淘汰。',
        stage: '探索', pri: 'P2',
        cols: [
          [{ id: 't', n: 'Teacher 回合', s: '原为串行' }],
          [{ id: 'ev', n: '并发评估', f: 1 }],
          [{ id: 'cut', n: '早期淘汰', s: '三档' }],
          [{ id: 'commit', n: '顺序提交' }],
        ],
        edges: ['t>ev', 'ev>cut', 'cut>commit'],
      },
      {
        slug: 'noteweaver',
        title: 'Noteweaver',
        line: '在原生 Obsidian 上管理和生成由 schema 驱动的知识库。',
        stage: '验证', pri: 'P2',
        repo: `${GH}/noteweaver`,
        cols: [
          [{ id: 'ob', n: 'Obsidian 插件' }, { id: 'ag', n: 'Agent 插件', s: '9 个 skill' }],
          [{ id: 'k', n: 'TypeScript 内核', s: '校验与变更计划', f: 1 }],
          [{ id: 'oa', n: 'Obsidian 适配器', s: '日常编辑' }, { id: 'off', n: '离线适配器', s: 'CI' }],
          [{ id: 'v', n: '知识库 vault', s: 'pages/ evidence/', m: 1 }],
        ],
        edges: ['ob>k', 'ag>k', 'k>oa', 'k>off', 'oa>v', 'off>v'],
      },
      {
        slug: 'cangjie-skill',
        title: 'cangjie-skill',
        line: '把书、长视频、播客蒸馏成 Agent Skill,再用装与不装的对照实测。',
        stage: '构建', pri: 'P2',
        repo: `${GH}/cangjie-skill`,
        cols: [
          [{ id: 'src', n: '书、长视频、播客' }],
          [{ id: 'pipe', n: '蒸馏流水线' }],
          [{ id: 'sk', n: 'Agent Skill' }],
          [{ id: 'gate', n: '实测门', s: 'measure.py', m: 1, f: 1 }, { id: 'judge', n: 'LLM 评委', s: '中和后双向判分' }],
        ],
        edges: ['src>pipe', 'pipe>sk', 'sk>gate', 'gate>judge'],
      },
      {
        slug: 'caibao-skill',
        title: '读财报 skill',
        line: '把唐朝两本读财报的书蒸馏成 skill,通用与银行专项各一套硬门槛。',
        stage: '验证', pri: 'P3',
        cols: [
          [{ id: 'b1', n: '通用读财报' }, { id: 'b2', n: '银行专项' }],
          [{ id: 'pipe', n: 'cangjie 流水线', s: '先骨架后提取' }],
          [{ id: 'sk', n: '读财报 skill', s: '硬门槛 5 + 3 条', f: 1 }],
          [{ id: 'aps', n: 'APS 插件市场', s: '私有' }],
        ],
        edges: ['b1>pipe', 'b2>pipe', 'pipe>sk', 'sk>aps'],
      },
    ],
  },
  {
    id: 'research',
    name: '模型与系统研究',
    lead: '世界模型、扩散语言模型和 NPU 基准,多数跑在远端机器上。',
    projects: [
      {
        slug: 'lewm-loopedwm',
        title: 'lewm-loopedwm',
        line: '诊断 LeWM 与 Astra/Sol 基线的差距,验证循环精修方法。',
        stage: '构建', pri: 'P1',
        cols: [
          [{ id: 'sim', n: 'RoboDojo 仿真', s: 'push_T 25 个布局' }],
          [{ id: 'host', n: '世界模型宿主', s: '选型待定' }, { id: 'loop', n: '循环精修', s: '轮数 0/1/2/4/8', f: 1 }],
          [{ id: 'base', n: 'Astra/Sol 基线' }, { id: 'ev', n: 'LeWM 评测' }],
          [{ id: 'gap', n: 'gap 诊断', s: '预登记实验' }],
        ],
        edges: ['sim>host', 'host>loop', 'loop>ev', 'base>gap', 'ev>gap'],
      },
      {
        slug: 'dllm-eval',
        title: 'dLLM 评测与负载分析框架',
        line: '同一套服务上对照扩散语言模型与自回归模型的质量和负载。',
        stage: '构建', pri: 'P1',
        cols: [
          [{ id: 'cfg', n: '配置矩阵', s: 'block_size', m: 1 }],
          [{ id: 'srv', n: 'SGLang 服务', s: 'SDAR 对 Qwen3', f: 1 }],
          [{ id: 'q', n: 'lm-eval', s: '质量评测' }, { id: 'p', n: 'AIPerf', s: '负载测量' }],
          [{ id: 'rep', n: '对照报告' }],
        ],
        edges: ['cfg>srv', 'srv>q', 'srv>p', 'q>rep', 'p>rep'],
      },
      {
        slug: 'cannbench',
        title: 'CANNBench converter',
        line: '修复 converter 的值域问题,加 HAP 校准与四道门禁。',
        stage: '验证', pri: 'P2',
        cols: [
          [{ id: 'case', n: '基准用例' }],
          [{ id: 'conv', n: 'converter', s: '值域修复', f: 1 }],
          [{ id: 'hap', n: 'HAP 校准脚本' }],
          [{ id: 'gate', n: '四道门禁', s: 'NPU 门禁待实机' }],
        ],
        edges: ['case>conv', 'conv>hap', 'hap>gate'],
      },
      {
        slug: 'dllm-deck',
        title: 'dLLM 负载分析幻灯片',
        line: '按 model.py 模块逐页讲负载,47 页,以 roofline 前沿图收尾。',
        stage: '构建', pri: 'P2',
        cols: [
          [{ id: 'paper', n: '论文', s: 'ALoDLM, TADM, ORL' }, { id: 'mod', n: 'model.py 模块' }, { id: 'ed', n: '本地编辑服务', s: '写回 src/' }],
          [{ id: 'src', n: 'src/ 幻灯片源', f: 1 }],
          [{ id: 'deck', n: '47 页幻灯片', s: 'roofline 前沿图收尾' }],
        ],
        edges: ['paper>src', 'mod>src', 'ed>src', 'src>deck'],
      },
      {
        slug: 'dgx-spark',
        title: 'DGX Spark 接入',
        line: '新机器免密接入,并把内核与驱动对齐到本机版本。',
        stage: '探索', pri: 'P2',
        cols: [
          [{ id: 'loc', n: '本机' }, { id: 'pkg', n: '离线包', s: 'match-local.sh', m: 1 }],
          [{ id: 'ssh', n: 'SSH 免密' }, { id: 'align', n: '内核与驱动对齐' }],
          [{ id: 'dgx', n: 'DGX Spark', f: 1 }],
        ],
        edges: ['loc>ssh', 'pkg>align', 'ssh>dgx', 'align>dgx'],
      },
    ],
  },
  {
    id: 'product',
    name: '产品',
    lead: '从中文启蒙到家庭数据,做给身边人用的东西。',
    projects: [
      {
        slug: 'openlingo',
        title: 'openlingo',
        line: '以识字为主线的 AI 中文启蒙,故事只用孩子学过的字。',
        stage: '构建', pri: 'P1',
        cols: [
          [{ id: 'lm', n: '学习者模型', s: '已识字与间隔复习' }],
          [{ id: 'gen', n: '故事生成', s: '按字集约束' }],
          [{ id: 'chk', n: '逐字校验', s: '代码校验用字', f: 1 }],
          [{ id: 'cls', n: '30 分钟课堂' }, { id: 'voice', n: '语音层', s: '导演加演员' }],
        ],
        edges: ['lm>gen', 'gen>chk', 'chk>cls', 'voice>cls'],
      },
      {
        slug: 'family-os',
        title: 'family-os',
        line: '家庭数据的录入、解析与备份,投资账户走只读连接器。',
        stage: '构建', pri: 'P2',
        cols: [
          [{ id: 'ib', n: 'IBKR 连接器', s: '只读' }, { id: 'qt', n: 'Questrade API' }, { id: 'csv', n: 'CSV 手动导入' }],
          [{ id: 'parse', n: '上传与解析' }],
          [{ id: 'db', n: '对象库', f: 1 }],
          [{ id: 'pages', n: '对象与类型页' }, { id: 'bak', n: 'iCloud 第二备份' }],
        ],
        edges: ['ib>parse', 'qt>parse', 'csv>parse', 'parse>db', 'db>pages', 'db>bak'],
      },
      {
        slug: 'flavor-spark',
        title: 'flavor-spark',
        line: '多伦多餐厅数据打底的美食推荐服务。',
        stage: '探索', pri: 'P2',
        cols: [
          [{ id: 'base', n: '餐厅基础库', s: '多伦多 9,002 条' }, { id: 'menu', n: '菜单采集' }, { id: 'rev', n: 'Google 评论采集' }],
          [{ id: 'imp', n: '导入脚本', s: '已写未执行' }],
          [{ id: 'pg', n: 'PostgreSQL' }],
          [{ id: 'svc', n: '推荐服务', s: 'TypeScript 单体', f: 1 }],
        ],
        edges: ['base>imp', 'menu>imp', 'rev>imp', 'imp>pg', 'pg>svc'],
      },
      {
        slug: 'boilerplate',
        title: '脚手架变现调研',
        line: '调研卖 boilerplate 的定价、收入和 2026 年的热门方向。',
        stage: '探索', pri: 'P2',
        cols: [
          [{ id: 'price', n: '主流产品定价与收入' }, { id: 'trend', n: '2026 热门方向', s: 'TanStack Start, Tauri 等' }],
          [{ id: 'res', n: '调研结论', f: 1 }],
          [{ id: 'stack', n: '技术栈与目标人群', s: '待定', p: 1 }],
        ],
        edges: ['price>res', 'trend>res', 'res>stack:dashed'],
      },
      {
        slug: 'whisper-srt',
        title: '音频转字幕',
        line: '用 whisper.cpp 把长音频转成带时间戳的字幕和文本稿。',
        stage: '验证', pri: 'P3',
        cols: [
          [{ id: 'a', n: '70 分钟音频' }],
          [{ id: 'w', n: 'whisper.cpp', s: 'large-v3-turbo', m: 1, f: 1 }],
          [{ id: 'srt', n: 'SRT 字幕', s: '带时间戳' }, { id: 'txt', n: '纯文本稿' }],
          [{ id: 'chk', n: '引用核对' }],
        ],
        edges: ['a>w', 'w>srt', 'w>txt', 'srt>chk'],
      },
    ],
  },
  {
    id: 'invest',
    name: '投资研究',
    lead: '量化研究与逐家公司的财报分析,不展示金额与账户。',
    projects: [
      {
        slug: 'rsi-quant',
        title: 'rsi-quant',
        line: 'LLM 提出量化策略改动，确定性引擎执行冻结协议下的评估，人工审核工作流变更。',
        stage: '验证', pri: 'P1',
        cols: [
          [{ id: 'job', n: '研究循环', s: 'LLM 提案' }],
          [{ id: 'cand', n: '候选策略代码' }],
          [{ id: 'lock', n: '冻结评估协议', s: '交易成本与留出集', f: 1 }],
          [{ id: 'paper', n: '模拟盘', s: '每日运行' }, { id: 'watch', n: '工作流变更提案', s: '人工合并' }],
        ],
        edges: ['job>cand', 'cand>lock', 'lock>paper'],
      },
      {
        slug: 'trading-agents',
        title: 'trading-agents',
        line: '多角色投研 agent,快速层与决策层用不同模型。',
        stage: '构建', pri: 'P2',
        cols: [
          [{ id: 'run', n: 'run.sh' }],
          [{ id: 'fast', n: '快速层', s: 'Codex' }],
          [{ id: 'rm', n: '研究经理', s: 'claude-opus-5-5', m: 1 }, { id: 'pm', n: '投资组合经理', s: 'claude-opus-5-5', m: 1 }],
          [{ id: 'rep', n: '研究报告', s: '含目标价', f: 1 }],
        ],
        edges: ['run>fast', 'fast>rm', 'rm>pm', 'pm>rep'],
      },
      {
        slug: 'nvo',
        title: 'NVO 能力圈扩展',
        line: '先把公司与行业文件补齐,再跑 /analyze。',
        stage: '构建', pri: 'P1',
        cols: [
          [{ id: 'edgar', n: 'fetch_edgar.py', s: '待支持 IFRS' }],
          [{ id: 'co', n: '公司文件' }, { id: 'ind', n: '行业文件', s: 'pharmaceuticals', m: 1 }],
          [{ id: 'circle', n: '能力圈检查', f: 1 }],
          [{ id: 'an', n: '/analyze', s: 'Phase 1 到 5' }],
        ],
        edges: ['edgar>co', 'co>circle', 'ind>circle', 'circle>an'],
      },
      {
        slug: 'atz',
        title: 'ATZ 财报阅读',
        line: '4 个 agent 并行读四份财报,汇总后做三档 DCF。',
        stage: '构建', pri: 'P2',
        cols: [
          [{ id: 'fs', n: '年报与中报', s: '4 份' }],
          [{ id: 'ag', n: '并行阅读 agent', s: '4 个' }],
          [{ id: 'dcf', n: '汇总与 DCF', s: '低中高三档' }],
          [{ id: 'g', n: 'Phase 5 门禁', s: '冷却与反证', f: 1 }],
        ],
        edges: ['fs>ag', 'ag>dcf', 'dcf>g'],
      },
      {
        slug: 'rblx-peng',
        title: 'RBLX 与 PENG 财报复核',
        line: '财报后刷新公司文件与三点估值。',
        stage: '构建', pri: 'P2',
        cols: [
          [{ id: 'q', n: '季度财报' }],
          [{ id: 'co', n: '公司文件刷新', f: 1 }],
          [{ id: 'val', n: '三点估值', s: '未签' }],
          [{ id: 'g', n: 'Phase 5 门禁', s: '反证为空被拒' }],
        ],
        edges: ['q>co', 'co>val', 'val>g'],
      },
      {
        slug: 'a-share',
        title: 'A 股账户持仓分析与调仓',
        line: '读持仓、查财报证据,出宽基为主的调仓方案。',
        stage: '构建', pri: 'P1',
        cols: [
          [{ id: 'pos', n: '持仓读取' }],
          [{ id: 'st', n: '结构分析' }, { id: 'ev', n: '财报证据' }],
          [{ id: 'plan', n: '调仓方案', s: '宽基为主,未执行' }],
          [{ id: 'test', n: '封仓十年测试', f: 1 }],
        ],
        edges: ['pos>st', 'pos>ev', 'st>plan', 'ev>plan', 'plan>test'],
      },
      {
        slug: 'cbrs',
        title: 'CBRS 持仓减仓计划',
        line: '按研报结论分批减仓,财报前后分步处理。',
        stage: '探索', pri: 'P0',
        cols: [
          [{ id: 'rep', n: '研报结论' }, { id: 'pos', n: '持仓现状' }],
          [{ id: 'plan', n: '分批减仓计划', s: '不补仓', f: 1 }],
          [{ id: 'pre', n: '财报前' }, { id: 'post', n: '财报后' }],
        ],
        edges: ['rep>plan', 'pos>plan', 'plan>pre', 'plan>post'],
      },
    ],
  },
  {
    id: 'career',
    name: '求职',
    lead: '把找工作当流水线做:评估、定制、投递、跟进。',
    projects: [
      {
        slug: 'h-level',
        title: '加拿大 H 级岗位评估与定制简历',
        line: '逐个岗位打分,过线的才出一页定制简历。',
        stage: '构建', pri: 'P1',
        cols: [
          [{ id: 'jd', n: '岗位 JD', s: '7 个' }],
          [{ id: 'score', n: '评估打分', s: '4.0 分以上才投', f: 1 }, { id: 'cv', n: 'cv.md' }],
          [{ id: 'res', n: '一页定制简历' }],
          [{ id: 'apply', n: '投递' }],
        ],
        edges: ['jd>score', 'score>res', 'cv>res', 'res>apply'],
      },
      {
        slug: 'applications',
        title: '目标岗位申请',
        line: '两个岗位的评估、定制简历、投递与跟进。',
        stage: '验证', pri: 'P1',
        cols: [
          [{ id: 'ev', n: '岗位评估', s: '2 个岗位' }],
          [{ id: 'cv', n: '定制简历' }],
          [{ id: 'ap', n: '投递', f: 1 }],
          [{ id: 'fu', n: '招聘人联系与跟进' }],
        ],
        edges: ['ev>cv', 'cv>ap', 'ap>fu'],
      },
      {
        slug: 'job-survey',
        title: 'AI agent 公司岗位调研表',
        line: '多伦多、加拿大、美国招 AI agent 落地岗位的公司,合并成一张表。',
        stage: '构建', pri: 'P2',
        cols: [
          [{ id: 'a', n: '多伦多' }, { id: 'b', n: '加拿大' }, { id: 'c', n: '美国' }],
          [{ id: 'm', n: '合并' }],
          [{ id: 't', n: '岗位调研表', s: '267 行,171 家公司', f: 1 }],
          [{ id: 'sal', n: '工资信息抓取', s: '未完成', p: 1 }],
        ],
        edges: ['a>m', 'b>m', 'c>m', 'm>t', 't>sal:dashed'],
      },
    ],
  },
];

// Public repositories that are not on the board.
const others = [
  { name: 'Herdeo', line: 'Herdr 加 Paseo:电脑上保留原生终端,手机上随时接手。', repo: `${GH}/Herdeo` },
  { name: 'herdr-lens', line: '在 Herdr 里只读预览 agent 提到的文件。', repo: `${GH}/herdr-lens` },
  { name: 'billing-usage', line: '在终端里看多台设备的 Claude Code token 用量与标价成本。', repo: `${GH}/billing-usage` },
  { name: 'claude-token-meter', line: '用 OTel、Loki、Grafana 按 token 统计 Claude Code 订阅用量。', repo: `${GH}/claude-token-meter` },
  { name: 'deckpowers', line: '给 Claude Code 的系统化写幻灯片方法。', repo: `${GH}/deckpowers` },
  { name: 'ConferenceFlow', line: 'GTC 2026 日程。', repo: `${GH}/ConferenceFlow`, live: 'https://conference-flow.vercel.app' },
  { name: 'DeepSight-Django', line: '研究与文档的全栈应用,Django 加 React。', repo: `${GH}/DeepSight-Django` },
  { name: 'EchoPersona', line: '从幻灯片生成讲稿与语音旁白。', repo: `${GH}/EchoPersona` },
];

// ---------------------------------------------------------------- diagram renderer

const W = 800, PAD_X = 16, PAD_Y = 20, NH = 48, PITCH = 72;
const NODE_W = { 3: 176, 4: 144 };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function textWidth(s, size, mono) {
  let w = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c > 0x2e7f) w += size;
    else if (ch === ' ') w += size * (mono ? 0.62 : 0.3);
    else w += size * (mono ? 0.62 : 0.55);
  }
  return w;
}

function permutations(arr) {
  if (arr.length <= 1) return [arr];
  return arr.flatMap((x, i) => permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p]));
}

// Segments are axis-aligned: { o: 'h', c: y, a: x0, b: x1 } or { o: 'v', c: x, a: y0, b: y1 }.
function conflicts(sa, sb) {
  let n = 0;
  for (const p of sa) for (const q of sb) {
    if (p.o === q.o) {
      if (Math.abs(p.c - q.c) < 1 && Math.min(p.b, q.b) - Math.max(p.a, q.a) > 0.5) n += 1;
    } else {
      const h = p.o === 'h' ? p : q, v = p.o === 'h' ? q : p;
      if (v.c > h.a - 0.5 && v.c < h.b + 0.5 && h.c > v.a - 0.5 && h.c < v.b + 0.5) n += 1;
    }
  }
  return n;
}

function renderDiagram(d, text) {
  const fail = (msg) => { throw new Error(`[${d.slug}] ${msg}`); };
  const n = d.cols.length;
  const nw = NODE_W[n] ?? fail(`unsupported column count ${n}`);
  const gap = (W - 2 * PAD_X - n * nw) / (n - 1);
  const R = Math.max(...d.cols.map((c) => c.length));
  const H = PAD_Y * 2 + R * NH + (R - 1) * (PITCH - NH);

  const nodes = new Map();
  d.cols.forEach((col, ci) => {
    const y0 = PAD_Y + ((R - col.length) * PITCH) / 2;
    col.forEach((nd, ri) => {
      if (nodes.has(nd.id)) fail(`duplicate node id ${nd.id}`);
      if (textWidth(nd.n, 14, false) > nw - 10) fail(`name too wide: ${nd.n}`);
      if (nd.s && textWidth(nd.s, nd.m ? 11.5 : 12, !!nd.m) > nw - 10) fail(`sublabel too wide: ${nd.s}`);
      nodes.set(nd.id, { ...nd, ci, ri, x: PAD_X + ci * (nw + gap), y: y0 + ri * PITCH, out: [], in: [] });
    });
  });
  if (nodes.size > 9) fail('more than 9 nodes');
  if (d.edges.length > 12) fail('more than 12 connectors');
  if ([...nodes.values()].filter((x) => x.f).length > 2) fail('more than 2 focal nodes');

  const edges = d.edges.map((spec) => {
    const [pair, flag] = spec.split(':');
    const [a, b] = pair.split('>');
    const from = nodes.get(a) ?? fail(`unknown node ${a}`);
    const to = nodes.get(b) ?? fail(`unknown node ${b}`);
    const e = { from, to, dashed: flag === 'dashed' };
    if (from.ci === to.ci) {
      if (Math.abs(from.ri - to.ri) !== 1) fail(`vertical connector must join neighbouring rows: ${spec}`);
      e.vertical = true;
    } else {
      if (to.ci !== from.ci + 1) fail(`connector must join neighbouring columns: ${spec}`);
      from.out.push(e); to.in.push(e);
    }
    return e;
  });

  // Each connector gets its own port on a shared edge, on a 12px lattice.
  const assign = (node, list, other, key) => {
    const cy = (x) => x.y + NH / 2;
    list.sort((p, q) => cy(other(p)) - cy(other(q)));
    let offs;
    if (list.length === 1) offs = [24];
    else if (list.length === 2) {
      const d0 = cy(other(list[0])) - cy(node), d1 = cy(other(list[1])) - cy(node);
      offs = Math.abs(d0) < 1 ? [24, 36] : Math.abs(d1) < 1 ? [12, 24] : [12, 36];
    } else if (list.length === 3) offs = [12, 24, 36];
    else if (list.length > 3) fail(`more than 3 connectors on one edge of ${node.id}`);
    list.forEach((e, i) => { e[key] = node.y + offs[i]; });
  };
  for (const nd of nodes.values()) {
    assign(nd, nd.out, (e) => e.to, 'y1');
    assign(nd, nd.in, (e) => e.from, 'y2');
  }

  // Route each gap: straight where the ports line up, otherwise an elbow on its own lane.
  for (let g = 0; g < n - 1; g += 1) {
    const inGap = edges.filter((e) => !e.vertical && e.from.ci === g);
    const gx0 = PAD_X + g * (nw + gap) + nw, gx1 = gx0 + gap;
    inGap.forEach((e) => { e.x1 = gx0; e.x2 = gx1; e.straight = Math.abs(e.y1 - e.y2) < 0.5; });
    const elbows = inGap.filter((e) => !e.straight);
    elbows.forEach((e) => { if (Math.abs(e.y1 - e.y2) < 12) fail('elbow too short for a 6px corner'); });
    const lanes = elbows.map((_, i) => gx0 + (gap * (i + 1)) / (elbows.length + 1));
    if (elbows.length > 1 && lanes[1] - lanes[0] < 12) fail(`gap ${g} holds too many elbows`);
    const segs = (e, lane) => e.straight
      ? [{ o: 'h', c: e.y1, a: e.x1, b: e.x2 }]
      : [{ o: 'h', c: e.y1, a: e.x1, b: lane }, { o: 'v', c: lane, a: Math.min(e.y1, e.y2), b: Math.max(e.y1, e.y2) }, { o: 'h', c: e.y2, a: lane, b: e.x2 }];
    let best = null;
    for (const perm of permutations(lanes)) {
      const all = inGap.map((e) => segs(e, perm[elbows.indexOf(e)]));
      let score = 0;
      for (let i = 0; i < all.length; i += 1) for (let j = i + 1; j < all.length; j += 1) score += conflicts(all[i], all[j]);
      if (!best || score < best.score) best = { score, perm };
      if (score === 0) break;
    }
    if (best && best.score > 0) fail(`connectors cross or overlap in gap ${g}`);
    elbows.forEach((e, i) => { e.lane = best.perm[i]; });
  }

  const id = `${d.slug}-arrow`;
  const paths = edges.map((e) => {
    let p;
    if (e.vertical) {
      const cx = e.from.x + nw / 2;
      p = e.to.ri > e.from.ri ? `M${cx},${e.from.y + NH} V${e.to.y}` : `M${cx},${e.from.y} V${e.to.y + NH}`;
    } else if (e.straight) {
      p = `M${e.x1},${e.y1} H${e.x2}`;
    } else {
      const s = e.y2 > e.y1 ? 1 : -1, r = Math.min(8, Math.abs(e.y2 - e.y1) / 2), m = e.lane;
      p = `M${e.x1},${e.y1} H${m - r} Q${m},${e.y1} ${m},${e.y1 + s * r} V${e.y2 - s * r} Q${m},${e.y2} ${m + r},${e.y2} H${e.x2}`;
    }
    return `<path class="dg-edge${e.dashed ? ' dg-edge--dashed' : ''}" data-from="${esc(e.from.id)}" data-to="${esc(e.to.id)}" d="${p}" marker-end="url(#${id})"/>`;
  });

  const boxes = [...nodes.values()].map((nd) => {
    const cx = nd.x + nw / 2;
    const cls = `dg-node${nd.f ? ' dg-node--focal' : ''}${nd.p ? ' dg-node--pending' : ''}`;
    const name = `<text class="dg-name" x="${cx}" y="${nd.y + (nd.s ? 21 : 28)}" text-anchor="middle">${esc(nd.n)}</text>`;
    const sub = nd.s ? `<text class="dg-sub${nd.m ? ' dg-sub--mono' : ''}" x="${cx}" y="${nd.y + 37}" text-anchor="middle">${esc(nd.s)}</text>` : '';
    return `<g class="dg-box" data-node="${esc(nd.id)}"><rect class="${cls}" x="${nd.x}" y="${nd.y}" width="${nw}" height="${NH}" rx="6"/>${name}${sub}</g>`;
  });

  return `<div class="dg-wrap" tabindex="0" role="group" aria-label="${esc(d.title)} ${esc(text.diagram)}">
<svg class="dg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="${d.slug}-title ${d.slug}-desc">
<title id="${d.slug}-title">${esc(d.title)} ${esc(text.architecture)}</title>
<desc id="${d.slug}-desc">${esc(d.line)}</desc>
<defs><marker id="${id}" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon class="dg-head" points="0 0, 8 3, 0 6"/></marker></defs>
${paths.join('\n')}
${boxes.join('\n')}
</svg>
</div>`;
}

// ---------------------------------------------------------------- page

const hidden = ['cbrs', 'a-share', 'h-level', 'applications', 'job-survey'];
const all = groups.flatMap((g) => g.projects).filter((p) => !hidden.includes(p.slug));
const bySlug = new Map(all.map((p) => [p.slug, p]));
const herdeo = {
  slug: 'herdeo', title: 'Herdeo', repo: `${GH}/Herdeo`,
  line: '把 Herdr 里的原生 coding agent 会话接到 Paseo，在电脑和手机上继续同一段工作。',
  cols: [
    [{ id: 'cli', n: 'Herdr 原生 CLI', s: 'Codex / Claude / Pi' }],
    [{ id: 'bridge', n: 'Herdeo', s: '消息、工具与授权', f: 1 }],
    [{ id: 'daemon', n: 'Paseo daemon' }],
    [{ id: 'client', n: '手机与桌面客户端', s: '同一个原生会话' }],
  ],
  edges: ['cli>bridge', 'bridge>daemon', 'daemon>client'],
};
const stacks = { 'agent-pm': ['TypeScript', 'SQLite', 'MCP'], noteweaver: ['Obsidian', 'TypeScript', 'Agent skills'], herdeo: ['Node.js', 'Herdr', 'Paseo'] };
const majors = ['agent-pm', 'noteweaver', 'herdeo', 'cangjie-skill', 'openlingo', 'rsi-quant'];
const repoGroup = { 'herdr-lens': 'agent', 'billing-usage': 'agent', 'claude-token-meter': 'agent', deckpowers: 'agent', ConferenceFlow: 'product', 'DeepSight-Django': 'product', EchoPersona: 'product' };
const RING = { 验证: 1, 构建: 2, 探索: 3 };
const arrow = '<span aria-hidden="true">↗</span>';

// The map. Every public project and repository is a world. Its angle is the area of
// work (one sector per area, sized by how many worlds it holds); its distance from the
// centre is how far along it is: public, validating, building, exploring.
const worlds = [];
for (const g of groups) {
  for (const p of g.projects) {
    if (hidden.includes(p.slug)) continue;
    if (RING[p.stage] === undefined) throw new Error(`Unknown stage for ${p.slug}: ${p.stage}`);
    worlds.push({ slug: p.slug, group: g.id, ring: RING[p.stage], project: p });
  }
  if (g.id === 'agent') worlds.push({ slug: 'herdeo', group: 'agent', ring: 0, project: herdeo });
  for (const o of others) if (repoGroup[o.name] === g.id) worlds.push({ slug: o.name.toLowerCase(), group: g.id, ring: 0, repo: o });
}
for (const o of others) if (o.name !== 'Herdeo' && !repoGroup[o.name]) throw new Error(`No area for repository ${o.name}`);
worlds.sort((a, b) => groups.findIndex((g) => g.id === a.group) - groups.findIndex((g) => g.id === b.group) || a.ring - b.ring);

// The galaxy. Four spiral arms, one per area of work. A world's distance from the core
// is how far along it is: public, validating, building, exploring. Coordinates are in
// galaxy units (radius 1000); the page tilts the disc and lets visitors fly over it.
const GALAXY = { R: 1000, tilt: 0.62, twist: 3.1, zones: [0.3, 0.46, 0.62, 0.79],
  // one hue per area of work: the arm, its planets and its group in the list share it
  colors: { agent: [0.91, 0.55, 0.39], research: [0.63, 0.64, 1.0], product: [0.46, 0.78, 0.69], invest: [0.92, 0.76, 0.42] } };
const armBase = {};
{
  const areas = [...new Set(worlds.map((w) => w.group))];
  areas.forEach((id, i) => { armBase[id] = -100 + i * 90; });
  const along = (id, r) => armBase[id] * Math.PI / 180 + GALAXY.twist * r;
  for (const id of areas) {
    GALAXY.zones.forEach((zone, k) => {
      const cell = worlds.filter((w) => w.group === id && w.ring === k);
      cell.forEach((w, i) => {
        // a cell's worlds spread across the arm's width, alternating a little in and out
        const spread = cell.length > 1 ? (i / (cell.length - 1) - 0.5) * Math.min(0.66, 0.2 * cell.length) : 0;
        const r = zone + (cell.length > 1 ? (i % 2 ? 0.028 : -0.028) : 0);
        const theta = along(id, r) + spread;
        w.wx = Math.round(GALAXY.R * r * Math.cos(theta));
        w.wy = Math.round(GALAXY.R * r * Math.sin(theta));
      });
    });
  }
  for (const a of worlds) for (const b of worlds) {
    if (a !== b && Math.hypot(a.wx - b.wx, a.wy - b.wy) < 36) throw new Error(`Worlds too close in the galaxy: ${a.slug} and ${b.slug}`);
  }
  GALAXY.arms = Object.fromEntries(areas.map((id) => [id, armBase[id]]));
  GALAXY.armLabels = Object.fromEntries(areas.map((id) => { const t = along(id, 0.88) - 0.16; return [id, [Math.round(GALAXY.R * 0.9 * Math.cos(t)), Math.round(GALAXY.R * 0.9 * Math.sin(t))]]; }));
}
// Where a galaxy point sits before the script takes over: the default view, fitted to a 1.6:1 frame.
const fallback = (wx, wy) => `--x:${(50 + wx / 21.8).toFixed(2)}%;--y:${(50 + wy / 22).toFixed(2)}%`;

function buildPage(lang) {
  const text = copy[lang], u = ui[lang];
  const project = (p) => {
    if (lang === 'zh') return p;
    const translated = englishDiagrams[p.slug];
    if (!translated || translated.cols.length !== p.cols.length) throw new Error(`Missing English diagram: ${p.slug}`);
    const description = text.selectedCopy[p.slug]?.description || text.exploring[p.slug]?.description || text.archiveNotes[p.slug];
    if (!description) throw new Error(`Missing English description: ${p.slug}`);
    return { ...p, title: translated.title, line: description,
      cols: p.cols.map((col, ci) => {
        if (col.length !== translated.cols[ci].length) throw new Error(`Diagram translation shape mismatch: ${p.slug}`);
        return col.map((node, ni) => {
          const [n, s] = translated.cols[ci][ni].split('|');
          return { ...node, n, s };
        });
      }),
    };
  };
  // What each world says when you land on it, in this language.
  const describe = (w) => {
    if (w.repo) {
      const lede = text.repoDescriptions[w.repo.name];
      if (!lede) throw new Error(`Missing ${lang} repo description: ${w.repo.name}`);
      return { title: w.repo.name, lede, repo: w.repo.repo, live: w.repo.live };
    }
    const p = project(w.project), selected = text.selectedCopy[w.slug], exploring = text.exploring[w.slug];
    if (selected) return { title: p.title, kind: selected.type, lede: selected.description, body: selected.result, detail: selected.detail, repo: p.repo, p };
    if (exploring) return { title: p.title, kind: exploring.label, lede: exploring.description, body: exploring.note, repo: p.repo, p };
    const note = text.archiveNotes[w.slug];
    if (!note) throw new Error(`Missing ${lang} portfolio note: ${w.slug}`);
    return lang === 'zh' ? { title: p.title, lede: p.line, body: note, repo: p.repo, p } : { title: p.title, lede: note, repo: p.repo, p };
  };
  const told = new Map(worlds.map((w) => [w.slug, describe(w)]));
  const where = (w) => `${text.groupNames[w.group]} · ${u.stages[w.ring]}`;

  const home = lang === 'en' ? 'index.html' : 'zh.html', about = lang === 'en' ? 'about.html' : 'zh-about.html';
  const areas = [...new Set(worlds.map((w) => w.group))];
  const star = (w) => {
    const d = told.get(w.slug);
    const cls = `star${majors.includes(w.slug) ? ' star--major' : ''}${d.repo ? ' star--ringed' : ''}`;
    return `<a class="${cls}" href="#${w.slug}" data-world="${w.slug}" data-area="${w.group}" data-wx="${w.wx}" data-wy="${w.wy}" data-zone="${w.ring}" style="${fallback(w.wx, w.wy)};--area:var(--area-${w.group})" aria-label="${esc(d.title)}, ${esc(where(w))}"><span class="star__body"></span><span class="star__label" aria-hidden="true">${esc(d.title)}</span></a>`;
  };
  const config = { ...GALAXY, labels: { arms: Object.fromEntries(areas.map((id) => [id, text.groupNames[id]])), zones: u.stages, core: u.core, deep: u.deep, chart: u.chartWhere, approaching: u.approaching } };
  const countLine = lang === 'zh' ? `${areas.length} 个方向，${worlds.length} 个项目` : `${worlds.length} projects in ${areas.length} areas`;
  const manifest = areas.map((id) => {
    const members = worlds.filter((w) => w.group === id);
    return `<section class="manifest__area" style="--area:var(--area-${id})" aria-labelledby="area-${id}"><h2 id="area-${id}"><span class="manifest__dot" aria-hidden="true"></span>${esc(text.groupNames[id])}<span class="manifest__n">${members.length}</span></h2><ol>${members.map((w) => `<li><a class="manifest__item${majors.includes(w.slug) ? ' is-major' : ''}" href="#${w.slug}" data-world="${w.slug}"><span class="manifest__name">${esc(told.get(w.slug).title)}</span><span class="manifest__stage" data-zone="${w.ring}">${esc(u.stages[w.ring])}</span></a></li>`).join('')}</ol></section>`;
  }).join('\n');
  // the windshield: only the sky lives here; instruments sit on the consoles and the dash
  const viewport = `<section class="viewport" aria-label="${esc(u.mapLabel)}">
<div class="galaxy__view" data-view tabindex="0" role="group" aria-label="${esc(u.mapLabel)}">
<div class="galaxy__layer" data-layer>
${Object.entries(GALAXY.armLabels).map(([id, [x, y]]) => `<span class="galaxy__arm" data-wx="${x}" data-wy="${y}" style="${fallback(x, y)};--area:var(--area-${id})" aria-hidden="true">${esc(text.groupNames[id])}</span>`).join('')}
${GALAXY.zones.map((z, k) => `<span class="galaxy__zone" data-zone="${k}" data-wx="0" data-wy="${-Math.round(z * GALAXY.R)}" style="${fallback(0, -z * GALAXY.R)}" aria-hidden="true">${esc(u.stages[k])}</span>`).join('')}
${worlds.map(star).join('\n')}
</div></div>
<div class="viewport__glass" aria-hidden="true"><span class="viewport__marker"></span></div>
</section>`;
  const legend = `<ul class="legend"><li><span class="legend__hues" aria-hidden="true">${areas.map((id) => `<i style="--area:var(--area-${id})"></i>`).join('')}</span>${esc(u.legendColor)}</li><li><span class="legend__orbits" aria-hidden="true"></span>${esc(u.legendDistance)}</li><li><span class="legend__ring" aria-hidden="true"></span>${esc(u.legendRing)}</li></ul>`;
  const scanner = `<aside class="console console--right scanner" aria-labelledby="scanner-h" data-scanner>
<p class="console__label" id="scanner-h">${esc(u.scanner)}</p>
<div class="scanner__idle"><p class="scanner__prompt">${esc(u.scanPrompt)}</p>${legend}</div>
<div class="scanner__target" data-scan aria-live="polite"><p class="scanner__where" data-scan-where></p><p class="scanner__title" data-scan-title></p><p class="scanner__text" data-scan-text></p><p class="scanner__go">${esc(u.scanGo)}</p></div>
</aside>`;
  const ticks = Array.from({ length: 36 }, (_, i) => { const a = i * 10 * Math.PI / 180, r1 = i % 9 === 0 ? 30 : i % 3 === 0 ? 33 : 35; return `<line x1="${(40 + r1 * Math.sin(a)).toFixed(1)}" y1="${(40 - r1 * Math.cos(a)).toFixed(1)}" x2="${(40 + 38 * Math.sin(a)).toFixed(1)}" y2="${(40 - 38 * Math.cos(a)).toFixed(1)}"/>`; }).join('');
  const dash = `<div class="dash">
<div class="dash__nav"><p class="dash__label">${esc(u.dashNav)}</p><p class="dash__where" data-hud-where></p></div>
<div class="dash__instruments" aria-hidden="true">
<div class="dial"><svg viewBox="0 0 80 80"><g class="dial__ticks" data-heading>${ticks}<path class="dial__north" d="M40 4 L43 11 L37 11 Z"/></g><path class="dial__index" d="M40 1 v8"/></svg><p><span>${esc(u.dashHeading)}</span> <b data-hdg>000°</b></p></div>
<canvas class="galaxy__minimap" data-minimap width="132" height="132"></canvas>
<div class="readouts"><p><span>${esc(u.dashAltitude)}</span><b data-alt>0</b></p><p><span>${esc(u.dashPitch)}</span><b data-pitch>0°</b></p></div>
</div>
<div class="dash__controls"><button class="dash__back" type="button" data-back><span aria-hidden="true">←</span> ${esc(u.back)}</button><div class="rocker"><button type="button" data-zoom="1" aria-label="${esc(u.zoomIn)}">+</button><button type="button" data-zoom="-1" aria-label="${esc(u.zoomOut)}">−</button></div></div>
</div>`;

  const world = (w) => {
    const d = told.get(w.slug);
    const links = [d.repo ? `<a href="${esc(d.repo)}" rel="noopener">${text.source} ${arrow}</a>` : '', d.live ? `<a href="${esc(d.live)}" rel="noopener">${text.live} ${arrow}</a>` : ''].join('');
    return `<article class="world" id="${w.slug}" aria-labelledby="${w.slug}-h" style="--area:var(--area-${w.group})">
<p class="world__where">${esc(where(w))}${d.kind ? ` · ${esc(d.kind)}` : ''}</p>
<h3 id="${w.slug}-h" tabindex="-1">${esc(d.title)}</h3>
<p class="world__lede">${esc(d.lede)}</p>${d.body ? `<p class="world__body">${esc(d.body)}</p>` : ''}${d.detail ? `<p class="world__body">${esc(d.detail)}</p>` : ''}${stacks[w.slug] ? `<ul class="stack" aria-label="${esc(d.title)} ${esc(text.tools)}">${stacks[w.slug].map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
${d.p ? `<figure class="world__diagram">${renderDiagram(d.p, text)}<figcaption data-trace-note data-default="${esc(u.traceHint)}">${esc(u.traceHint)}</figcaption></figure>` : ''}${links ? `<p class="world__links">${links}</p>` : ''}
</article>`;
  };

  const label = (id, pair) => `<header class="section__label"><h2 id="${id}">${esc(pair[0])}</h2>${pair[1] ? `<p>${esc(pair[1])}</p>` : ''}</header>`;
  const contacts = `<a href="mailto:${identity.email}">${text.email} ${arrow}</a><a href="${identity.linkedin}" rel="noopener">LinkedIn ${arrow}</a><a href="${GH}" rel="noopener">GitHub ${arrow}</a>`;
  const questionButtons = u.questions.map(q => `<button type="button" data-ask data-question="${esc(q)}"><span>${esc(q)}</span><span aria-hidden="true">↗</span></button>`).join('');
  // Decided before first paint: a fresh visit or a reload plays the opening once;
  // moving between this site's own pages does not. The animation is CSS, so it is harmless without the script.
  const head = `document.documentElement.classList.add('js');try{var t=localStorage.getItem('portfolio-theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t}catch(e){}try{var n=performance.getEntriesByType('navigation')[0],k=n?n.type:'navigate',o='';try{o=new URL(document.referrer).origin}catch(e){}if(k==='reload'||(k==='navigate'&&o!==location.origin))document.documentElement.classList.add('is-landing')}catch(e){}`;
  const otherLang = { deck: text.switchPath, about: lang === 'en' ? 'zh-about.html' : 'about.html' };
  const nav = (page) => `<header class="nav${page === 'deck' ? ' nav--deck' : ''}" id="top"><a class="wordmark" href="${home}" aria-label="${esc(text.home)}">eason<span aria-hidden="true">.</span></a>
<nav class="nav__sections" aria-label="${text.nav}"><a href="${home}"${page === 'deck' ? ' aria-current="page"' : ''}>${u.deck}</a><a href="${about}"${page === 'about' ? ' aria-current="page"' : ''}>${u.aboutNav}</a></nav>
<div class="nav__actions"><button class="ask-small" type="button" data-ask>${u.ask} <kbd aria-hidden="true">⌘K</kbd></button>${page === 'about' ? `<button class="theme-toggle" type="button" data-theme-toggle aria-label="${lang === 'en' ? 'Toggle dark appearance' : '切换深浅外观'}" aria-pressed="false"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="6.3" stroke="currentColor"/><path d="M10 3.7a6.3 6.3 0 010 12.6z" fill="currentColor"/></svg></button>` : ''}<a class="language-switch" href="${otherLang[page]}" hreflang="${lang === 'en' ? 'zh-CN' : 'en'}" lang="${lang === 'en' ? 'zh-CN' : 'en'}" aria-label="${text.switchTitle}">${text.switchLabel}</a></div></header>`;
  const dialog = `<dialog class="assistant-dialog" id="portfolio-assistant" aria-labelledby="dialog-title" aria-describedby="dialog-description"><div class="assistant-dialog__inner"><header class="assistant-dialog__header"><div><h2 id="dialog-title">${u.dialogTitle}</h2><p class="assistant-dialog__intro" id="dialog-description">${u.dialogDescription}</p></div><button class="icon-button" data-close-assistant type="button" aria-label="${u.close}">×</button></header><div class="question-list">${questionButtons}</div><form class="assistant-form" id="assistant-form"><input id="assistant-question" name="question" type="text" minlength="2" maxlength="1200" required autocomplete="off" aria-label="${u.placeholder}" placeholder="${u.placeholder}"><button type="submit">${u.send} ↗</button></form><div id="assistant-result" class="assistant-result" aria-live="polite" aria-atomic="false">${u.empty}</div><footer class="assistant-dialog__footer"><button data-clear-answer type="button">${u.clear}</button><span>${u.privacy}</span></footer></div></dialog>`;
  const shell = (page, title, body) => `<!doctype html>
<html lang="${lang === 'en' ? 'en' : 'zh-CN'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="${page === 'deck' ? 'dark' : 'light dark'}">
<title>${esc(title)}</title><meta name="description" content="${esc(text.meta)}">
${metadata(lang, page)}<script>${head}${page === 'deck' ? "document.documentElement.dataset.theme='dark';" : ''}</script><link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="styles.css"><script type="module" src="app.mjs"></script></head>
<body${page === 'deck' ? ' class="deck-page"' : ''}>
<!-- For agents and crawlers: a plain-text profile is at /llms.txt, structured data at /profile.json, Markdown at /profile.md, and a recruiter brief at /recruiters.html. Everything on this page is also in the HTML below. -->
${body}
${dialog}
</body></html>`;

  const deck = shell('deck', text.title, `<a class="skip" href="#manifest">${esc(u.skipList)}</a>
${nav('deck')}
<main id="main" class="deck" data-galaxy="${esc(JSON.stringify(config))}">
<aside class="console console--left manifest" id="manifest" aria-labelledby="name" data-manifest>
<div class="manifest__intro"><h1 id="name">${identity.name}<span aria-hidden="true">.</span></h1><p class="manifest__role">${[u.credentials[0][1], u.credentials[1][1], text.location].map(esc).join(' <span aria-hidden="true">·</span> ')}</p><p class="manifest__lede">${text.intro}</p></div>
<button class="manifest__toggle" type="button" data-manifest-toggle aria-expanded="false" aria-controls="manifest-list"><span>${esc(countLine)}</span><span class="expand" aria-hidden="true"></span></button>
<div class="manifest__list" id="manifest-list"><p class="manifest__count">${esc(countLine)}</p>
${manifest}</div>
<div class="manifest__foot"><a class="manifest__about" href="${about}">${esc(u.aboutMore)} <span aria-hidden="true">→</span></a><div class="contact-links">${contacts}<a href="recruiters.html">${u.reader} ${arrow}</a></div><noscript><p><a href="profile.md">${u.profileMd} ↗</a></p></noscript></div>
</aside>
${viewport}
${scanner}
<section class="worlds" id="worlds" data-worlds aria-labelledby="worlds-h"><div class="worlds__bar"><span class="worlds__count"><span>${esc(u.destination)}</span> <span data-world-count></span></span><button class="worlds__step" type="button" data-step="-1" aria-label="${esc(u.prev)}">←</button><button class="worlds__step" type="button" data-step="1" aria-label="${esc(u.next)}">→</button><button class="worlds__step" type="button" data-close-world aria-label="${esc(u.back)}">×</button></div><h2 class="worlds__title" id="worlds-h">${esc(u.worldsTitle)}</h2><div class="worlds__list">${worlds.map(world).join('\n')}</div></section>
${dash}
</main>`);

  const toProject = (href) => href.startsWith('#') ? `${home}${href}` : href;
  const aboutPage = shell('about', u.aboutTitle, `<a class="skip" href="#main">${text.skip}</a>
<div class="page">${nav('about')}
<main id="main"><section class="about-hero" aria-labelledby="about-title"><h1 id="about-title">${esc(u.aboutHeading)}</h1><p class="intro__identity">${[u.credentials[0][1], u.credentials[1][1], text.location].map(esc).join(' <span aria-hidden="true">·</span> ')}</p><p class="intro__description">${text.intro}</p><p class="intro__context">${text.context}</p><div class="contact-links">${contacts}<a href="recruiters.html">${u.reader} ${arrow}</a></div></section>
<section class="section research-section" id="interests" aria-labelledby="interests-h">${label('interests-h', [text.interests[0], u.researchLead])}<div class="interests">${text.focus.map((f, i) => `<details class="interest" name="interests"${i ? '' : ' open'}><summary><h3>${esc(f.title)}</h3><span class="expand" aria-hidden="true"></span></summary><div class="interest__body"><p>${esc(f.text)}</p>${f.links ? `<div class="interest-links">${f.links.map(l => `<a href="${toProject(l.href)}"${l.href.startsWith('https:') ? ' rel="noopener"' : ''}>${esc(l.text)} ${l.href.startsWith('https:') ? arrow : '<span aria-hidden="true">→</span>'}</a>`).join('')}</div>` : ''}</div></details>`).join('\n')}</div></section>
<section class="section background-section" id="background" aria-labelledby="background-h">${label('background-h', text.background)}<div class="background"><ol class="experience">${text.experience.map(e => `<li><p class="experience__dates">${esc(e.dates)}</p><div class="experience__heading"><h3>${esc(e.organization)}</h3><span>${esc(e.role)}</span></div><p class="experience__description">${esc(e.text)}</p></li>`).join('\n')}</ol><div class="education"><h3>${text.education}</h3><ul>${text.degrees.map(d => `<li>${esc(d)}</li>`).join('')}</ul></div></div></section>
<section class="section about" id="about" aria-labelledby="about-h">${label('about-h', text.aboutLabel)}<div class="about__body">${text.aboutParagraphs.map(p => `<p>${esc(p)}</p>`).join('')}<div class="contact-links">${contacts}</div><p class="about__deck"><a href="${home}">${esc(u.deckLink)} <span aria-hidden="true">→</span></a></p></div></section></main>
<div class="agent-links"><span>${u.profileLinks}</span><a href="recruiters.html">${u.reader} ↗</a><a href="profile.md">${u.profileMd} ↗</a><a href="profile.json">${u.profileJson} ↗</a><a href="llms.txt">llms.txt ↗</a></div><footer class="footer"><a href="${home}">${identity.name}</a><span>${text.updated} <span aria-hidden="true">·</span> <time datetime="${UPDATED}">${UPDATED}</time></span><a href="${GH}" rel="noopener">GitHub ${arrow}</a></footer></div>`);

  writeFileSync(new URL(home, import.meta.url), deck);
  writeFileSync(new URL(about, import.meta.url), aboutPage);
  console.log(`${home} + ${about}: ${worlds.length} planets on ${areas.length} arms`);
}

for (const lang of ['en', 'zh']) buildPage(lang);
buildDiscovery();

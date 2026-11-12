// Generates index.html from the project list below.
// Run: node build.mjs
// Each project carries one architecture diagram, drawn by the same renderer so
// all of them share one style (orthogonal connectors, at most 9 nodes, at most
// 2 focal nodes). The build fails if a label overflows its box or two
// connectors cross or overlap, so a bad diagram never ships silently.
import { writeFileSync } from 'node:fs';

const GH = 'https://github.com/yiju-zhao';
const UPDATED = '2026-11-11';

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
        line: 'ETF 轮动与杠杆择时,每日研究,过 lockbox 才进模拟盘。',
        stage: '验证', pri: 'P1',
        cols: [
          [{ id: 'job', n: '每日研究任务', s: '03:00', m: 1 }],
          [{ id: 'cand', n: '候选策略' }],
          [{ id: 'lock', n: 'lockbox 检验', s: 'deflated Sharpe', f: 1 }],
          [{ id: 'paper', n: '模拟盘正式盘', s: '每日运行' }, { id: 'watch', n: '观察盘' }],
        ],
        edges: ['job>cand', 'cand>lock', 'lock>paper', 'lock>watch'],
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
    else w += size * (mono ? 0.62 : 0.6);
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

function renderDiagram(d) {
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
      if (textWidth(nd.n, 13, false) > nw - 16) fail(`name too wide: ${nd.n}`);
      if (nd.s && textWidth(nd.s, nd.m ? 10 : 11, !!nd.m) > nw - 16) fail(`sublabel too wide: ${nd.s}`);
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
    return `<path class="dg-edge${e.dashed ? ' dg-edge--dashed' : ''}" d="${p}" marker-end="url(#${id})"/>`;
  });

  const boxes = [...nodes.values()].map((nd) => {
    const cx = nd.x + nw / 2;
    const cls = `dg-node${nd.f ? ' dg-node--focal' : ''}${nd.p ? ' dg-node--pending' : ''}`;
    const name = `<text class="dg-name" x="${cx}" y="${nd.y + (nd.s ? 21 : 28)}" text-anchor="middle">${esc(nd.n)}</text>`;
    const sub = nd.s ? `<text class="dg-sub${nd.m ? ' dg-sub--mono' : ''}" x="${cx}" y="${nd.y + 37}" text-anchor="middle">${esc(nd.s)}</text>` : '';
    return `<rect class="${cls}" x="${nd.x}" y="${nd.y}" width="${nw}" height="${NH}" rx="6"/>${name}${sub}`;
  });

  return `<div class="dg-wrap" tabindex="0" role="group" aria-label="${esc(d.title)} 架构图,可横向滚动">
<svg class="dg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="${d.slug}-title ${d.slug}-desc">
<title id="${d.slug}-title">${esc(d.title)} 架构</title>
<desc id="${d.slug}-desc">${esc(d.line)}</desc>
<defs><marker id="${id}" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon class="dg-head" points="0 0, 8 3, 0 6"/></marker></defs>
${paths.join('\n')}
${boxes.join('\n')}
</svg>
</div>`;
}

// ---------------------------------------------------------------- page

// A portfolio is edited for readers; the full board remains a secondary index.
// Sources and the reasoning for this selection are in research/portfolio-references.md.
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

const selected = [
  {
    project: bySlug.get('agent-pm'), type: 'Agent workflow', status: '个人使用中',
    description: '为多台机器上的 Claude Code 和 Codex 会话做的项目看板。',
    result: '按项目查看进度、决策和待处理的问题，也能追溯到原始会话。',
    detail: '每台机器的采集器只读本地会话，再推送到中心。中心用 SQLite 保存记录，同时提供网页和 MCP 接口。采集游标在收到确认后才前进，断线后可以续传。',
    stack: ['TypeScript', 'SQLite', 'MCP'],
  },
  {
    project: bySlug.get('noteweaver'), type: 'Personal knowledge', status: '开源',
    description: '让 agent 帮忙整理知识，也让每条结论保留可以回头查的出处。',
    result: '在原生 Obsidian 里管理知识页、断言和证据。同一套规则供日常编辑与离线校验使用。',
    detail: '共享的 TypeScript 内核负责校验与变更计划，Obsidian 插件负责日常编辑，Agent 插件提供查询、写入、研究等技能。每个知识库自己定义 schema 和政策。结构校验与事实核查分别处理。',
    stack: ['Obsidian', 'TypeScript', 'Agent skills'],
  },
  {
    project: herdeo, type: 'Cross-device tooling', status: '开源',
    description: '电脑前用原生终端，离开电脑后，手机也能接着处理同一个 agent 会话。',
    result: '连接 Herdr 和 Paseo，同步消息、工具结果与支持的授权请求，保留原生 CLI 的交互。',
    detail: 'Codex、Claude Code 和 Pi 使用各自的接入方式。桥接连接终端里已有的原生进程；手机和电脑操作的是同一个会话。当前远程输入支持纯文本，高级 CLI 操作仍在终端进行。',
    stack: ['Node.js', 'Herdr', 'Paseo'],
  },
];

const explorations = [
  {
    slug: 'cangjie-skill', title: 'cangjie-skill', label: 'Fork / 评测',
    description: '把书和长内容蒸馏成 skill。在 fork 里加入装与不装的对照评测，检查它是否真的改变了 agent 的表现。',
    note: '增加 measure.py 实测门；评委先去掉作者与书名线索，再双向判分。',
  },
  {
    slug: 'openlingo', title: 'openlingo', label: '产品原型',
    description: '以识字为主线的中文学习产品：绘本、有声翻页，以及按已学汉字生成的故事。',
    note: '故事用字由代码逐字校验。验证版已搭建，真实绘本的端到端流程仍待验证。',
  },
  {
    slug: 'rsi-quant', title: 'rsi-quant', label: '研究 / 模拟盘',
    description: '研究 ETF 轮动与杠杆择时，把策略生成、回测和样本外验证接成一条流水线。',
    note: '自动研究与模拟盘在运行。回测候选需要经过 lockbox 验证；这里展示的是研究系统。',
  },
];

// These notes are a dated snapshot, not a live activity feed.
const notes = {
  'open-evo-harness': '原生 harness 与网关用量统计；PR 已开，正在跑基线。',
  'open-evo-pipeline': '并发评估与顺序提交的方案分析，尚未实现。',
  'caibao-skill': '通用财报与银行财报的 skill 提取，仓库私有。',
  'lewm-loopedwm': '基线实验结果已入库，等待宿主选型。',
  'dllm-eval': '评测与负载分析框架的设计阶段。',
  cannbench: 'Converter 修复已推送，NPU 验证待实机完成。',
  'dllm-deck': 'dLLM 负载分析的 47 页本地演示文稿。',
  'dgx-spark': '设备已接入，升级后的重启问题仍在排查。',
  'family-os': '家庭数据与账户的只读连接器，仍在补齐数据来源。',
  'flavor-spark': '数据导入脚本已编写，尚未执行。',
  boilerplate: '完成一轮调研，目标用户与技术栈尚未确定。',
  'whisper-srt': '音频转字幕工具，已用于引用核对。',
  'trading-agents': '目标价缺失问题的修复，尚未提交。',
  nvo: '公司研究笔记，暂缓结论，补充行业知识。',
  atz: '财报阅读与估值笔记，尚未完成验证。',
  'rblx-peng': '财报与估值复核，仍待补充反面证据。',
};

const arrow = '<span aria-hidden="true">↗</span>';
const sourceLink = (p, label = '源码') => p.repo
  ? `<a class="source-link" href="${esc(p.repo)}" rel="noopener" aria-label="${esc(p.title || p.name)} ${label}">${label} ${arrow}</a>`
  : '';

const architecture = (p, note) => `<details class="implementation">
<summary>实现细节 <span class="expand" aria-hidden="true"></span></summary>
<div class="implementation__body">
${note ? `<p>${esc(note)}</p>` : ''}
<figure class="architecture">
${renderDiagram(p)}
<figcaption>架构概览<span class="scroll-hint"> · 可横向查看</span></figcaption>
</figure>
</div>
</details>`;

const feature = ({ project: p, type, status, description, result, detail, stack }, i) => `<li class="work" id="${p.slug}">
<div class="work__top"><span class="work__number">0${i + 1}</span><span>${esc(type)}</span><span class="work__status">${esc(status)}</span></div>
<div class="work__heading"><h3><a href="${esc(p.repo)}" rel="noopener">${esc(p.title)}</a></h3>${sourceLink(p)}</div>
<p class="work__intro">${esc(description)}</p>
<p class="work__description">${esc(result)}</p>
<ul class="stack" aria-label="${esc(p.title)} 技术与工具">${stack.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
${architecture(p, detail)}
</li>`;

const exploring = (entry) => {
  const p = bySlug.get(entry.slug);
  return `<li class="experiment" id="${entry.slug}">
<div class="experiment__heading"><h3>${esc(entry.title)}</h3><span class="project-kind">${esc(entry.label)}</span>${sourceLink(p)}</div>
<p>${esc(entry.description)}</p>
${architecture(p, entry.note)}
</li>`;
};

const featuredSlugs = selected.map((x) => x.project.slug);
const exploringSlugs = explorations.map((x) => x.slug);
const archiveGroups = groups.map((g) => ({
  ...g, projects: g.projects.filter((p) => !hidden.includes(p.slug) && !featuredSlugs.includes(p.slug) && !exploringSlugs.includes(p.slug)),
})).filter((g) => g.projects.length);
const openSource = others.filter((p) => p.name !== 'Herdeo');

const archive = archiveGroups.map((g) => `<div class="archive-group" id="${g.id}">
<h3>${esc(g.name)}</h3>
<ul>${g.projects.map((p) => {
  if (!notes[p.slug]) throw new Error(`Missing portfolio note: ${p.slug}`);
  return `<li id="${p.slug}" class="archive-item">
<div class="archive-item__heading"><h4>${esc(p.title)}</h4>${sourceLink(p)}</div>
<p>${esc(notes[p.slug])}</p>
${architecture(p)}
</li>`;
}).join('\n')}</ul>
</div>`).join('\n');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>Yiju Zhao — Builder</title>
<meta name="description" content="Yiju Zhao 的个人作品集。AI agent 工具、个人知识库，以及一些日常会用的软件。">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="styles.css">
</head>
<body>
<a class="skip" href="#main">跳到正文</a>
<div class="page">
<header class="nav" id="top">
<a class="wordmark" href="#top" aria-label="Yiju Zhao，回到顶部">yiju<span aria-hidden="true">.</span></a>
<nav aria-label="主导航"><a href="#building">作品</a><a href="#about">关于</a><a href="${GH}" rel="noopener">GitHub ${arrow}</a></nav>
</header>
<main id="main">
<section class="intro" aria-labelledby="name">
<p class="eyebrow">Builder</p>
<h1 id="name">Yiju Zhao<span aria-hidden="true">.</span></h1>
<p class="intro__description">做 AI agent 工具，也做一些日常会用的软件。</p>
</section>
<section class="section" id="building" aria-labelledby="work-h">
<header class="section__label"><h2 id="work-h">作品</h2><p>Selected work</p></header>
<ol class="works">${selected.map(feature).join('\n')}</ol>
</section>
<section class="section" id="rest" aria-labelledby="exploring-h">
<header class="section__label"><h2 id="exploring-h">实验与研究</h2><p>In progress</p></header>
<ul class="experiments">${explorations.map(exploring).join('\n')}</ul>
</section>
<section class="section" id="others" aria-labelledby="index-h">
<header class="section__label"><h2 id="index-h">其他项目</h2><p>Project index</p></header>
<div class="project-index">
<ul class="repo-list">${openSource.map((p) => `<li><a class="repo" href="${esc(p.repo)}" rel="noopener"><h3>${esc(p.name)}</h3><p>${esc(p.line)}</p><span class="repo__arrow" aria-hidden="true">↗</span></a>${p.live ? `<a class="live-link" href="${esc(p.live)}" rel="noopener">打开网站 ${arrow}</a>` : ''}</li>`).join('\n')}</ul>
<details class="archive" id="archive"><summary><span>更多实验与项目记录</span><span class="expand" aria-hidden="true"></span></summary>
<div class="archive__body"><p class="archive__note">截至 <time datetime="${UPDATED}">${UPDATED}</time> 的记录，包含设计中、验证中和暂缓的项目。</p>${archive}</div>
</details>
</div>
</section>
<section class="section about" id="about" aria-labelledby="about-h">
<header class="section__label"><h2 id="about-h">关于我</h2><p>A little about me</p></header>
<div class="about__body"><p>我是 Yiju。我用 Claude Code 和 Codex 做项目，兴趣从 agent 工具延伸到知识管理、中文学习和量化研究。很多项目的第一个用户是我自己。</p><p>代码和项目进展放在 <a href="${GH}" rel="noopener">GitHub ${arrow}</a>。欢迎交流。</p></div>
</section>
</main>
<footer class="footer"><a href="#top">Yiju Zhao</a><span>更新于 <span aria-hidden="true">·</span> <time datetime="${UPDATED}">${UPDATED}</time></span><a href="${GH}" rel="noopener">GitHub ${arrow}</a></footer>
</div>
</body>
</html>
`;

writeFileSync(new URL('./index.html', import.meta.url), html);
console.log(`index.html: ${selected.length} selected, ${explorations.length} explorations, ${openSource.length} other repos, ${archiveGroups.reduce((n, g) => n + g.projects.length, 0)} archived records`);

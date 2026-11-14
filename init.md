# GraftOverview — init.md

> 多 Agent 开发交接文档。产品决策、数据契约、LLM 契约、设计系统、文件所有权和验收标准都在本文件内。
> 版本 1.0 · 2026-11-13 · 许可证 MIT · 仓库名 `GraftOverview`

---

## 0. 给 Agent 的阅读说明

1. **先读完本文件再写代码。** 至少读完与你角色相关的章节：产品（§1）、交互（§2）、数据契约（§3）、LLM 契约（§4，A2/A3/A4 必读）、设计系统（§5，所有做 UI 的 Agent 必读）、模块规格（§6）、Agent 计划（§7）。
2. **本文件是事实源。** 代码、注释或口头约定与本文件冲突时，以本文件为准。发现缺漏或矛盾，写 `docs/contract-requests/<agent>-<date>.md`，不要擅自修改共享类型或共享文件。
3. **语言约定。** 界面文案 zh-CN 优先、英文 beta；代码、类型名、提交信息用英文；文档和注释可用中文。所有可见文案走 i18n，不在组件里硬编码中文。
4. **不写假数据。** 预览、README、界面里不得出现编造的用户数、性能提升、客户评价。示例数据只能出现在 fixtures 和明确标注的样例状态中。
5. **不引入后端。** 这是纯静态 GitHub Pages 应用。没有账号、数据库、云同步、遥测。LLM 由用户自带 Key（BYOK）。
6. **不做本文件之外的功能。** 需要新增范围，先写进 `docs/contract-requests/`，由编排 Agent 决定。

---

## 1. 产品

### 1.1 一句话

GraftOverview 是一个纯前端、开源的知识体系「嫁接」工具：用户画出自己当前的知识导图，获得一份目标知识体系，由 LLM 做节点级语义比对，把缺口以虚线幽灵节点直接叠加在导图上，逐条采纳或忽略，最后导出可执行的补全报告。

### 1.2 目标用户

- 自学者：想系统补一门领域，但不知道自己缺什么。
- 转行者：已有零散经验，需要对照目标岗位/领域体系补齐。
- 学生：准备课程/考试，需要把「学过」和「该会」对齐。

### 1.3 非目标

- 团队协作、多人实时编辑、评论、分享给他人共同编辑。
- 课程售卖、题库、打卡、学习社区。
- 账号体系、云同步、移动原生 App。
- 自动替用户学习；本工具只负责「看见缺口」和「给出补全建议」。

### 1.4 核心闭环

1. **定目标**：选内置模板 / 输入目标让 LLM 生成 / 手写或导入 Markdown 大纲。
2. **画自己**：空白起画，或把目标体系复制成初稿再删改（正向为主，派生为辅）。
3. **对比**：LLM 返回已覆盖 / 缺失 / 用户独有三类结果。
4. **补全**：缺失以虚线幽灵节点插入画布；只有高优先级缺口默认上图，中低优先级留在建议面板。
5. **带走**：采纳后写入导图；导出 Markdown 报告、JSON 工程文件，或生成只读分享链接。

### 1.5 术语

| 术语 | 含义 |
|---|---|
| 用户体系 / 我的导图 | 用户当前掌握的知识，画上即视为已掌握 |
| 目标体系 | 对照基准，来源为模板、LLM 生成、手动/导入 |
| 已覆盖 | 目标节点在用户树中找到语义等价节点 |
| 缺口 / 建议 | 目标有、用户没有的节点；以「最高缺失子树」为单位，不是逐节点罗列 |
| 用户独有 | 用户有、目标没有的节点，视为超额/兴趣，不做删除建议 |
| 采纳 | 把一条建议的整个目标子树写入用户导图 |
| 忽略 | 把一条建议按签名持久化，后续对比不再推荐 |
| 覆盖率 | `1 - 缺失节点数 / 目标节点总数`，按节点计数，四舍五入到整数百分比 |
| 幽灵节点 | 只存在于 UI 层、不写入用户数据的虚线建议节点 |
| 签名 | 对规范化路径 + 标题做的稳定哈希，用于忽略项和历史识别 |

### 1.6 MVP 范围

**必须交付（M1 核心）**

- 目标体系：4 套静态模板、LLM 生成、手动大纲编辑、Markdown 导入。
- 导图工作台：mind-elixir 集成、增删改、折叠、拖拽平移/缩放、快捷键、50 步撤销重做、自动保存。
- 对比引擎：BYOK 设置、目标生成、语义对比、JSON 校验/一次修复、错误映射。
- 建议与补全：幽灵节点、建议面板、采纳子树、忽略、覆盖率。
- 持久化与带走：localStorage 单工作区、JSON 导入导出、Markdown 报告、URL 只读分享。
- 应用外壳：三栏布局、设置弹窗、空状态、加载/错误状态、中文界面、i18n 骨架。

**MVP 内第二批（M2 体验，可延后到 v0.1.1，但架构不变）**

- 搜索节点、深色模式、对比历史（最近 10 次）、忽略签名持久化、移动端打磨。

**明确不做（V1/V2 再说）**

- 多工作区/多项目列表、学习进度追踪、社区模板市场、多模型并排、PDF/图片导出、命令面板、分支级对比、PWA/离线、英文完整校对。

### 1.7 成功标准（定性，不编造指标）

- 新用户不看文档，能在 3 分钟内完成「选模板 → 画三个节点 → 对比 → 采纳一条建议」。
- 对比结果能解释「为什么缺」「补上能做什么」，而不是只给一串节点名。
- 刷新页面不丢数据；导出/分享不泄露 API Key。
- 400 节点以内可流畅编辑；LLM 失败不破坏已有数据。

---

## 2. 交互与界面

### 2.1 路由（hash 路由，GitHub Pages 友好）

| 路由 | 用途 |
|---|---|
| `#/` | 工作台（默认） |
| `#/share?d=<lz-string>` | 只读分享预览 |
| `#/share/invalid` | 分享数据损坏/版本不兼容的说明页 |

设置、搜索、模板选择、目标生成、导出、历史详情都用弹窗/面板，不单独占路由。使用 hash 路由避免 Pages 404；`vite.config.ts` 设 `base: './'`。

### 2.2 桌面布局（≥ 960px）

```
┌──────────────────────────────────────────────────────────────────────┐
│ Top bar 56px: [Graft mark + GraftOverview] [文档标题] [已保存 14:32]   │
│                         [搜索] [主题] [设置] [开始对比 →]              │
├───────────────────────────────────────────────┬──────────────────────┤
│ Canvas（flex 1，点阵网格 24px）                │ Panel 360px          │
│                                               │ ┌──────────────────┐ │
│   [根节点：石墨黑]──┬──[分支：纸白]──[叶子]    │ │ 目标体系 建议 4 历史│ │
│                    ├──[分支]                  │ ├──────────────────┤ │
│                    ├──[分支]                  │ │ 覆盖率 61%        │ │
│                    ├──[幽灵：琥珀虚线]         │ │ 目标 84 · 覆盖 52 │ │
│                    └──[幽灵：琥珀虚线]         │ │ [========----]    │ │
│                                               │ │ 高优先级           │ │
│  [浮动工具条：+子 +同级 | 撤销 重做 | 适应]     │ │ □ 工程化  建议 4节点│ │
│                                               │ │   理由…            │ │
│                          16 节点 · 7 条建议    │ │   [采纳][忽略][定位]│ │
│                                               │ │ …                 │ │
│                                               │ │ [已选0] [忽略][采纳]│ │
└───────────────────────────────────────────────┴──────────────────────┘
```

- 顶栏高度 56px；面板宽度 360px；画布 padding 40/24px；画布内容用 `margin:auto` 居中，溢出时从左上开始可滚动。
- 画布背景：`--color-paper` + 24px 点阵（`--color-grid`，1px 圆点，`background-attachment: local`）。点阵是空间定位用的功能元素，不是装饰。
- 浮动工具条：左下 16px，纸面背景、1px `--color-rule`、6px 圆角、`--shadow-whisper`；按钮 32px（触屏 44px）。
- 画布状态：右下 16px，mono 10px，`{节点数} 节点 · {幽灵数} 条图上建议 · {缩放}%`。
- 右侧面板：左侧 1px `--color-rule`；头部 48px；三 tab；内容区独立滚动；建议 tab 底部粘性操作栏。

### 2.3 移动端

- `≤ 960px`：面板变成右侧抽屉 `width: min(360px, 92vw)`，带遮罩；顶栏隐藏文档标题/保存状态/分隔线；面板开关出现在顶栏右侧。
- `≤ 640px`：面板变成底部面板 `height: 64dvh`，`border-radius: 12px 12px 0 0`，带 grabber（36×4px）、设置、关闭；遮罩覆盖工作区，不覆盖顶栏。
- 顶栏 48px；顺序：wordmark（只显示 Graft）→ 搜索 → 对比（短标签「对比」）→ 面板开关。主题和设置收进面板/设置弹窗。
- 触屏：所有可点元素 ≥ 44×44px；画布支持单指平移、双指缩放；无 hover-only 操作；工具条移动到底部居中。
- 隐藏画布状态行；搜索、对比、面板入口必须始终可见。

### 2.4 首次进入与空状态

画布空状态左对齐（不要整屏居中 hero），最大宽度 55ch，距画布左上 48px / 40px：

- 标题（32px Space Grotesk 600）：「先把你会的东西画出来」
- 正文（16px Inter，55ch）：「从一个根节点开始，或者让 AI 按目标生成一份初稿，再删掉不会的。」
- 主按钮：「从目标生成初稿」→ 打开目标生成弹窗
- 次按钮：「新建空白导图」→ 根节点进入重命名
- 文字链接：「导入 Markdown 大纲」
- 底部 mono 提示：「拖动平移 · 滚轮缩放 · 双击新建」

没有目标体系时，右侧面板显示空状态：「还没有目标体系」+ 一行解释 + [选模板] [让 AI 生成] [导入 Markdown]。不要用三列功能卡。

### 2.5 对比状态

| 状态 | 界面 |
|---|---|
| 无目标 | 对比按钮 disabled，tooltip「先设置目标体系」 |
| 无 Key | 点击对比打开设置弹窗，顶部提示「需要先配置模型」 |
| 进行中 | 顶栏下方 2px 不确定进度条；画布中央不遮挡的浮层：「正在比对 84 个目标节点… 00:18」+ [取消]；不显示假百分比 |
| 成功 | 幽灵节点淡入（220ms）、建议面板切到「建议」、覆盖率更新、目标树状态点更新 |
| 失败 | 顶部/右下 toast：错误原因 + [重试]；保留上一次结果，不写入历史，不改本地数据 |
| 结果过期 | 用户/目标变更后，建议面板顶部出现「结果已过期」+ [重新对比]；仍可采纳/忽略旧结果，但明确标注 |
| 截断 | toast「输出被截断，请缩小目标范围或换用更长输出的模型」；不落盘 |

### 2.6 设置 / 搜索 / 历史 / 分享

- **设置**：原生 `<dialog>`，宽 `min(480px, calc(100vw - 32px))`，最大高 80dvh。字段：服务商预设、Base URL、模型、API Key（password + 显示切换）、温度（0–1，默认 0.2）、最大输出（默认 4096）、JSON 模式开关（预设自动，允许手动）、[测试连接] [保存]。底部安全提示：「Key 只保存在本浏览器 localStorage；任何在本页运行的脚本都能读取。不要在公共电脑使用。」
- **搜索**：顶栏搜索图标打开 320px popover；输入框 + 结果列表（标题 + 路径 + 命中高亮）；250ms 防抖；↑/↓ 选择，Enter 定位，Esc 关闭；空结果显示「没有匹配的节点」；`Ctrl/Cmd+F` 打开。
- **历史**：右侧面板第三个 tab「历史」；最近 10 次；每行：日期时间、目标标题、覆盖率、缺失数、已采纳数；点击打开只读结果摘要；[导出报告]；底部 [清空历史]（确认弹窗，不可撤销）。历史不包含 API Key，不包含完整用户导图。
- **分享**：对比完成后可 [分享]；生成 `#/share?d=<压缩数据>`；复制链接；若 URL > 12,000 字符，弹窗「内容过长，已改为导出 JSON」，触发 JSON 下载，不静默截断。
- **只读分享页**：全屏只读画布 + 目标面板；顶部 banner「只读分享」+ [导入到我的工作区]；导入前确认「导入将覆盖当前工作区，建议先导出备份」；导入成功后跳 `#/`。
- **主题**：设置/顶栏切换 light/dark/system；默认跟随系统；写入 `localStorage['graft.theme']`；`<html data-theme="light|dark">`；不闪白：在 `index.html` 内联一小段脚本，首帧前设置 data-theme。

### 2.7 键盘快捷键

| 快捷键 | 动作 |
|---|---|
| `Tab` | 新建子节点 |
| `Enter` | 新建同级节点 |
| `F2` | 重命名选中节点 |
| `Delete` / `Backspace` | 删除选中节点（可撤销，不弹确认） |
| `Ctrl/Cmd + Z` | 撤销 |
| `Shift + Ctrl/Cmd + Z` | 重做 |
| `Ctrl/Cmd + F` | 打开搜索 |
| `Esc` | 关闭弹窗/搜索/清除选择 |
| `↑ ↓ ← →` | 在节点间移动（mind-elixir 默认行为，保留） |
| `Ctrl/Cmd + Enter` | 开始对比（有目标且非进行中） |

按钮/链接同时支持键盘；所有 focus 可见；不要用 hover 作为唯一入口。

### 2.8 错误、空、加载状态

- **错误**：说清楚「发生了什么、为什么、下一步做什么」，一句话优先；不要用「出错了」「Oops」。
- **空状态**：说明空的是什么、为什么重要、一个下一步动作；不要只写「暂无数据」。
- **加载**：按钮内联 spinner + 保留标签；<150ms 不显示 spinner；长任务显示已用时间与取消。
- **删除/忽略/采纳**：可逆操作不弹确认，执行后 5 秒 toast + [撤销]；不可逆操作（清空历史、导入覆盖）用确认弹窗。
- **成功**：用户能看到结果时不要弹成功 toast；只有异步且结果不可见时才提示。

---

## 3. 数据契约

### 3.1 TypeScript 类型（`src/lib/types.ts`，A0 所有，其他 Agent 只读）

```ts
export type NodeId = string; // 模板用稳定 slug；用户/生成节点用 nanoid(8)
export type Locale = 'zh' | 'en';
export type ThemeMode = 'light' | 'dark' | 'system';
export type PanelTab = 'target' | 'suggestions' | 'history';
export type Priority = 'high' | 'medium' | 'low';
export type TargetSource = 'template' | 'generated' | 'manual' | 'imported';

export interface KnowledgeNode {
  id: NodeId;
  topic: string;        // 1–120 chars, trimmed
  note?: string;        // 0–200 chars
  children: KnowledgeNode[];
  collapsed?: boolean;  // 仅用户导图持久化
}

export interface KnowledgeMap {
  id: string;           // nanoid(10)
  title: string;        // 1–60 chars
  root: KnowledgeNode;  // 单根
  updatedAt: string;    // ISO 8601
}

export interface GoalSpec {
  domain: string;             // 1–40 chars
  goal: string;               // 1–200 chars
  level: 'beginner' | 'intermediate' | 'advanced';
  horizon?: string;           // 例如「3 个月」
  weeklyHours?: number;       // 1–40
  locale: Locale;
}

export interface TargetSystem extends KnowledgeMap {
  source: TargetSource;
  templateId?: string;
  goal?: GoalSpec;
}

export interface Match {
  targetId: NodeId;
  userNodeId: NodeId;
  confidence: number; // 0–1
}

export interface GapSuggestion {
  signature: string;          // 稳定哈希
  targetId: NodeId;           // 目标子树的根
  suggestedParentId: NodeId | null; // 用户节点；null = 挂在用户根下
  topic: string;
  reason: string;             // 1–300 chars
  selfCheck: string[];        // 1–3 条
  links: { title: string; url: string }[]; // 0–2 条，http/https
  priority: Priority;
  nodeCount: number;          // 目标子树节点数（含根）
  status: 'pending' | 'adopted' | 'ignored';
}

export interface ExtraNode {
  userNodeId: NodeId;
  reason: string; // 1–200 chars
}

export interface ComparisonStats {
  targetNodes: number;
  matchedNodes: number;
  gapNodes: number;
  coverage: number; // 0–1，四舍五入展示为整数百分比
}

export interface ComparisonResult {
  id: string;
  createdAt: string;
  mapSignature: string;
  targetSignature: string;
  matches: Match[];
  gaps: GapSuggestion[];
  extras: ExtraNode[];
  stats: ComparisonStats;
  model: { host: string; model: string }; // 不存 key，不存完整 baseUrl 查询串
}

export interface Workspace {
  schemaVersion: 1;
  map: KnowledgeMap;
  target: TargetSystem | null;
  comparison: ComparisonResult | null;
  ignoredSignatures: string[];
  ui: {
    locale: Locale;
    panelTab: PanelTab;
  };
}

export interface StoredLlmSettings {
  schemaVersion: 1;
  presetId: string;   // 'openai' | 'deepseek' | 'siliconflow' | 'ollama' | 'custom'
  baseUrl: string;    // 不含尾部 /
  apiKey: string;
  model: string;
  temperature: number; // 0–1
  maxTokens: number;   // 256–8192
  jsonMode: boolean;
}

export interface HistoryEntry {
  id: string;
  createdAt: string;
  targetTitle: string;
  mapTitle: string;
  stats: ComparisonStats;
  result: ComparisonResult;
}

export interface SharePayload {
  v: 1;
  m: KnowledgeMap;
  t: TargetSystem;
}

export interface GhostTree {
  signature: string;
  parentId: NodeId | null;
  root: KnowledgeNode; // 克隆自目标子树，ID 前缀 `ghost-`
  priority: 'high';
}
```

**命名与规则**

- 单根树；根节点 `topic` 是体系名称；所有节点 ID 在树内唯一。
- `note` 只用于目标节点；用户节点可以有 note（V1 节点详情用），MVP 不展示。
- `collapsed` 只对用户导图持久化；目标树始终展开。
- 任何 LLM 返回的文本在渲染前都要 trim、截断、转义；不要用 `{@html}`。
- 公开函数不得出现 `any`；未知 JSON 先按 `unknown` 解析再校验。

### 3.2 规范化与签名

```ts
// 伪代码；A0 在 src/lib/signature.ts 实现
normalizeText(s) = s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase(locale)
pathSignature(node, ancestors) = fnv1a(join(' / ', [...ancestors, node.topic].map(normalizeText)))
mapSignature(map) = fnv1a(JSON.stringify(signatureTree(map.root)))
targetSignature(target) = fnv1a(JSON.stringify(signatureTree(target.root)))
```

- `gap.signature` 用目标树中该节点的路径签名；忽略列表存这个签名。
- 目标变化后，同一路径的签名不变；标题变化则签名变化，忽略项可能重新出现（可接受）。
- 历史用 `mapSignature`/`targetSignature` 判断结果是否过期；不改写旧结果。

### 3.3 localStorage

| Key | 内容 | 备注 |
|---|---|---|
| `graft.workspace.v1` | `Workspace` | 不含 API Key；自动保存 500ms 防抖；`beforeunload`/`visibilitychange` flush |
| `graft.llm.v1` | `StoredLlmSettings` | 含 API Key；只在设置弹窗读写；导出/分享/历史绝不包含 |
| `graft.history.v1` | `HistoryEntry[]` | 最多 10 条，最新在前；清除历史只删这个 key |
| `graft.theme` | `'light' \| 'dark' \| 'system'` | 主题的唯一持久化来源；首帧前读取，避免闪白 |
| `graft.consent.v1` | `boolean` | 首次对比的数据出境提示是否已确认 |

- 读取失败/JSON 损坏：不要清空；进入「数据损坏」状态，提供 [导出原始数据] [重置工作区]；重置需确认。
- `schemaVersion` 高于当前：拒绝加载，提示「此文件由更新版本创建，请升级应用或导出备份」。
- 迁移函数集中在 `src/lib/storage/migrate.ts`；每次 schema 变更必须写迁移与测试。

### 3.4 URL 分享

- 编码：`lz-string` 的 `compressToEncodedURIComponent(JSON.stringify(SharePayload))`。
- 路由：`#/share?d=<encoded>`；解码失败→`#/share/invalid`。
- 上限：编码后 12,000 字符；超过则提示改用 JSON 导出，不截断。
- 分享内容只含 `map` + `target`，不含 comparison、history、ignored、API Key。
- 只读页不写 localStorage，直到用户点「导入到我的工作区」并确认。

### 3.5 JSON 工程文件

```json
{
  "app": "GraftOverview",
  "schemaVersion": 1,
  "exportedAt": "2026-11-13T12:00:00.000Z",
  "workspace": { "...": "Workspace" }
}
```

- 文件名：`graft-workspace-YYYYMMDD-HHmm.json`。
- 导入：校验 `app`、`schemaVersion`、`workspace` 结构；不合法→错误提示；合法→确认覆盖→写入；成功后刷新导图/目标/面板。
- 导入不包含历史；历史是本地数据。

### 3.6 规模上限

| 项 | 上限 | 超限行为 |
|---|---|---|
| 用户/目标节点数 | 400 / 400 | 阻止对比，提示「节点过多」；V1 支持分支对比 |
| 目标生成节点数 | 60–140 | 超过 140 拒绝并建议缩小目标；少于 60 允许但提示「目标偏薄」 |
| 单节点标题 | 120 字符 | 输入截断；显示 ellipsis + title |
| 目标 note | 200 字符 | 对比时截断到 60 字符 |
| 建议理由 | 300 字符 | 截断 |
| 自测问题 | 3 条 | 取前 3 |
| 链接 | 2 条 | 过滤非 http/https；丢弃超长 URL |
| 对比历史 | 10 条 | 超出丢弃最旧 |
| 忽略签名 | 500 条 | 超出丢弃最旧 |

---

## 4. LLM 契约

### 4.1 调用方式

- 浏览器 `fetch` 直连 OpenAI 兼容 `POST {baseUrl}/chat/completions`。
- Header：`Authorization: Bearer <key>`、`Content-Type: application/json`。
- Body：`{ model, messages, temperature, max_tokens, ...(jsonMode ? { response_format: { type: 'json_object' } } : {}) }`。
- 超时 120s；`AbortController`；用户可取消。
- 不自动重试（避免重复计费）；失败后由用户点 [重试]。
- 不使用 OpenAI SDK；不引入后端代理（V2 再评估可选 Worker 模板）。

### 4.2 服务商预设（默认值可编辑）

| presetId | baseUrl | 默认模型 | jsonMode |
|---|---|---|---|
| `openai` | `https://api.openai.com/v1` | `gpt-4o-mini` | true |
| `deepseek` | `https://api.deepseek.com/v1` | `deepseek-chat` | true |
| `siliconflow` | `https://api.siliconflow.cn/v1` | `Qwen/Qwen2.5-72B-Instruct` | true |
| `ollama` | `http://localhost:11434/v1` | `qwen2.5:7b` | false |
| `custom` | 空 | 空 | 可切换 |

模型名会变；预设只是默认值，UI 必须允许改 `baseUrl`/`model`。不要在代码里写「最新」「最强」等承诺。

### 4.3 目标生成 Prompt

**System**

```text
你是课程设计师。根据用户给出的学习目标，生成一份层级化目标知识体系。

规则：
1. 输出 3–4 层，60–140 个节点；根节点是领域名。
2. 覆盖基础、核心、进阶；不要平均分配，按重要性决定分支大小。
3. 每个节点 1 个 topic（不超过 40 字）和 1 个 note（20–40 字，说明「学到什么程度」）。
4. 不要输出 ID；不要输出 Markdown；不要输出 URL。
5. 只输出 JSON，不要代码块，不要解释。
6. 输出语言与用户 locale 一致（zh → 简体中文，en → English）。
```

**User**

```text
<GOAL>
domain: 前端开发
goal: 3 个月内能独立做 React 项目
level: beginner
horizon: 3 个月
weeklyHours: 10
locale: zh
</GOAL>
```

**输出 schema**

```json
{
  "title": "前端开发知识体系",
  "root": {
    "topic": "前端开发",
    "note": "能独立完成一个中等复杂度的 Web 应用",
    "children": [
      { "topic": "HTML / CSS", "note": "能写出语义化、响应式的页面", "children": [] }
    ]
  }
}
```

**校验**

- 根节点必须有 topic；深度 ≤ 4；节点数 60–140；topic ≤ 120 字；note ≤ 200 字。
- 客户端递归分配 `nanoid(8)`；不信任任何 LLM 提供的 ID。
- 超过 140 节点：拒绝并提示「目标过大，请把目标写具体或缩小范围」。
- 生成结果先进入大纲编辑器预览，用户确认后才写入 `target`。

### 4.4 对比 Prompt

**System**

```text
你是知识体系评估专家。把「目标知识体系」与「用户当前知识体系」做语义比对，判断哪些目标节点已被掌握、哪些缺失，并给出补全建议。

规则：
1. 只依据提供的节点标题和说明判断，不要臆测用户没写出的能力。
2. 语义等价、同义表述、上下位关系都算已覆盖。例如「闭包」与「closure」，「HTTP 缓存」与「强缓存/协商缓存」。
3. 一个目标节点最多匹配一个用户节点；一个用户节点可以匹配多个目标节点。
4. 只报告每条缺失分支的「最高缺失节点」，不要同时报告它的后代；客户端会自动补全整棵子树。
5. suggestedUserParentId 必须是用户树中语义最近的祖先节点 ID；没有合适父节点用 null（挂到用户根下）。
6. 不要建议目标体系中不存在的节点。
7. reason 用 1–2 句说明「为什么这是缺口」和「补上后能做什么」，不超过 300 字。
8. selfCheck 给 1–3 个可以被「会/不会」回答的自测问题。
9. links 最多 2 条，只给官方文档或公认经典资源；不确定 URL 就不要给；不要编造链接。
10. priority 只能是 high / medium / low；核心路径缺失用 high，加分项用 low。
11. extras 只列用户树中明显超出目标范围的节点，最多 20 条；不要罗列每个叶子。
12. 输出语言与 UI locale 一致。
13. 只输出 JSON，不要 Markdown 代码块，不要解释。
```

**User**

```text
<UI_LOCALE>zh</UI_LOCALE>

<TARGET>
t1|0|前端开发|能独立完成中等复杂度 Web 应用
t2|1|HTML / CSS|语义化与响应式
t3|2|语义化|正确使用语义标签
...
</TARGET>

<USER>
u1|0|我的前端知识|
u2|1|HTML / CSS|
u3|2|Flex / Grid|
...
</USER>
```

格式：`id|depth|topic|note`；用户节点 note 留空；目标 note 截断到 60 字；ID 由客户端分配为 `t1..tN` / `u1..uM`，LLM 只看到这些短 ID。

**输出 schema**

```json
{
  "matches": [
    { "targetId": "t2", "userNodeId": "u2", "confidence": 0.92 }
  ],
  "gaps": [
    {
      "targetId": "t9",
      "suggestedUserParentId": "u2",
      "reason": "你的图里有布局，但没有构建与发布链路；补上后能解释打包、热更新和上线。",
      "selfCheck": ["能配置 Vite 的生产构建吗？", "能解释 content hash 的作用吗？"],
      "links": [{ "title": "Vite 官方文档", "url": "https://vite.dev/guide/" }],
      "priority": "high"
    }
  ],
  "extras": [
    { "userNodeId": "u12", "reason": "目标体系没有覆盖可视化，这是你的额外兴趣。" }
  ]
}
```

### 4.5 校验、修复与降级

**解析**

1. 去掉 ```json 围栏；找第一个 `{` 和最后一个 `}`；`JSON.parse`。
2. 失败→一次修复调用：把原始输出（截断 2,000 字）和错误信息发给模型，要求「只返回修正后的 JSON，不要新增节点」。
3. 再失败→抛出 `LlmError('parse')`，保留旧结果，不写历史。

**引用完整性**

- 把 `t*`/`u*` 映射回真实 ID；未知 ID 丢弃并计数。
- 每个 target ID 在 `matches` + `gaps` 中最多出现一次；重复时保留 match，丢弃 gap。
- 如果一个 gap 的 target 祖先也是 gap，丢弃后代 gap（只保留最高缺失子树）。
- `suggestedUserParentId` 未知→设为 `null`；在 UI 中标注「挂在根节点」。
- `matchedNodes = targetNodes - Σ(gap.nodeCount)`；覆盖率 `(targetNodes - gapNodes) / targetNodes`，clamp 0–1。
- **忽略项不虚增覆盖率**：A3 不删除 ignored gap，而是把 `status` 设为 `ignored`；`stats` 仍按完整缺口计算。A4 在活动建议列表隐藏 ignored，显示「已忽略 {n} 条」入口；报告列入「忽略项」。撤销时把 status 改回 `pending`。
- 目标 ID 覆盖率 < 90%：触发一次修复；仍不足则接受部分结果并 toast「部分目标节点未分析」。
- `gaps.length > 60`：按 priority 截断，保留 high 优先；toast 提示。

**字段清洗**

- `reason`：trim、去换行、≤ 300 字；空则用「目标体系要求该节点，你的导图里还没有。」
- `selfCheck`：取前 3，空字符串丢弃；全空则给 1 条通用问题「你能解释它解决什么问题吗？」
- `links`：只保留 `http:`/`https:`，≤ 2 条，title ≤ 80 字；不请求、不验证可达性；UI 标注「AI 生成、未验证」。
- `priority`：非 high/medium/low → medium。
- `confidence`：clamp 0–1；非数字 → 0.5。

**规模与截断**

- 单侧 > 400 节点：阻止请求，提示「节点过多，请先收缩到一个分支」；V1 做分支对比。
- `finish_reason === 'length'`：视为失败，toast「输出被截断」；不落盘。
- 目标生成 > 140 节点：失败，提示缩小目标。

### 4.6 错误映射

| 情况 | 用户文案 | 动作 |
|---|---|---|
| 401/403 | 「Key 无效或没有权限。检查 API Key 是否填对。」 | 打开设置 |
| 404 | 「Base URL 或模型名不对。检查服务商地址和模型。」 | 打开设置 |
| 429 | 「请求被限流。等一会儿再试，或换一个模型。」 | 保留旧结果 |
| 5xx | 「模型服务暂时不可用。稍后重试。」 | 保留旧结果 |
| fetch TypeError | 「无法连接模型服务。检查 Base URL、网络，以及服务商是否允许浏览器跨域（CORS）。本地 Ollama 可绕过 CORS。」 | 打开设置/文档 |
| 超时 120s | 「请求超时。缩小对比范围，或换更快的模型。」 | 保留旧结果 |
| 解析失败 | 「模型返回的不是有效 JSON。已尝试修复一次。」 | 保留旧结果 |
| 截断 | 「输出被截断。缩小目标范围，或换支持更长输出的模型。」 | 保留旧结果 |
| 空结果 | 「没有生成有效的对比结果。重试或换模型。」 | 保留旧结果 |

错误信息不包含 Authorization、完整 Key、完整 baseUrl 查询串；日志脱敏。

### 4.7 安全与隐私

- API Key 只存 `graft.llm.v1`；不进入 `Workspace`、分享、导出、历史、URL、console。
- 首次对比前弹一次提示：「你的导图与目标体系会发送给你配置的模型服务商；本应用没有后端。」用户确认后不再重复（存 `graft.llm.v1` 之外的一个 boolean，如 `graft.consent.v1`）。
- 所有 LLM 文本用 Svelte 默认转义；禁止 `{@html}`。
- 链接渲染：`target="_blank"`、`rel="noopener noreferrer"`；URL 协议白名单。
- 不做遥测、不做分析、不加载第三方脚本（字体自托管）。
- 用户可一键清除 Key 与工作区；清除前确认。

### 4.8 CORS 与本地模型

- OpenAI/DeepSeek/SiliconFlow 等对浏览器直连的 CORS 支持会变化；错误页给出诊断清单：
  1. 确认 Base URL 以 `/v1` 结尾（Ollama 为 `/v1`）。
  2. 确认服务商允许浏览器跨域；不允许时用 Ollama 本地模型。
  3. 检查网络/代理；不要在前端代码里硬编码 Key。
- MVP 不内置代理；V2 可提供可选 Cloudflare Worker 模板（单独文档、单独部署，不默认启用）。

---

## 5. 设计系统（Hallmark · Cobalt 应用变体）

### 5.1 权威与边界

- 所有 UI 必须遵循本节。Hallmark 的页面级营销门禁（hero / nav / footer / macrostructure）不适用于本应用；应用级门禁（token、对比度、8 态、响应式、排版纯度、反 AI 味）全部适用。
- Genre：`modern-minimal`。Theme：`Cobalt` 应用变体（冷白工程纸、电光钴蓝、Space Grotesk + Inter + JetBrains Mono）。
- 只允许一个装饰性强调色：钴蓝。语义色（青=已覆盖、琥珀=缺口）是功能色，不是装饰色。
- 不写假数据；不画假浏览器/手机/IDE 外框；不用 emoji 当图标；不用斜体标题；不用渐变文字/背景；不用 `transition: all`；不用 `hover:scale`。
- 设计 token 只能来自 §5.2；组件里不允许出现裸 OKLCH/hex/rgb/hsl 或裸 `font-family`。缺 token 时先加 token，再引用。

### 5.2 Tokens（`src/app.css`）

A0 将下面内容落到 `src/app.css`。Tailwind v4 用 `@theme` 生成工具类；暗色覆盖放在 `html[data-theme="dark"]`，不要用 `@theme inline`（会内联，暗色失效）。

```css
@import "tailwindcss";

@theme {
  /* Paper — 冷白，不是 #fff */
  --color-paper: oklch(98.5% 0.004 250);
  --color-paper-2: oklch(96.5% 0.006 250);
  --color-paper-3: oklch(93.5% 0.008 250);
  --color-rule: oklch(90% 0.008 250);
  --color-rule-2: oklch(84% 0.010 250);
  --color-grid: oklch(95.5% 0.006 250);

  /* Ink — 冷炭黑，不是 #000 */
  --color-ink: oklch(24% 0.020 258);
  --color-ink-2: oklch(34% 0.018 257);
  --color-muted: oklch(52% 0.012 255);
  --color-neutral: oklch(64% 0.010 255);

  /* Signal — 唯一装饰强调色 */
  --color-accent: oklch(58% 0.20 256);
  --color-accent-hover: oklch(54% 0.20 256);
  --color-accent-active: oklch(50% 0.19 256);
  --color-accent-ink: oklch(99% 0.004 250);
  --color-accent-surface: oklch(95% 0.03 256);
  --color-focus: oklch(58% 0.20 256);

  /* Semantic diff — 功能色，配文字/图标，不单靠颜色 */
  --color-matched: oklch(50% 0.09 170);
  --color-matched-ink: oklch(38% 0.08 170);
  --color-matched-surface: oklch(95% 0.02 170);
  --color-gap: oklch(58% 0.15 65);
  --color-gap-ink: oklch(38% 0.10 65);
  --color-gap-surface: oklch(95% 0.035 75);
  --color-error: oklch(55% 0.19 25);
  --color-error-surface: oklch(95% 0.03 25);

  /* Graphite — 根节点与深色块 */
  --color-graphite: oklch(22% 0.016 260);
  --color-graphite-2: oklch(26% 0.016 260);
  --color-on-graphite: oklch(94% 0.006 250);
  --color-on-graphite-muted: oklch(78% 0.010 250);

  /* Type — 3 个 family 是上限 */
  --font-display: "Space Grotesk", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  --font-body: "Inter", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", Consolas, monospace;

  --text-2xs: 0.6875rem;  /* 11px — mono labels */
  --text-xs: 0.75rem;     /* 12px — meta/tags */
  --text-sm: 0.8125rem;   /* 13px — dense UI */
  --text-base: 0.875rem;  /* 14px — app body */
  --text-md: 1rem;        /* 16px — prose */
  --text-lg: 1.25rem;     /* 20px */
  --text-xl: 1.5rem;      /* 24px */
  --text-2xl: 2rem;       /* 32px */

  --leading-display: 1.1;
  --leading-ui: 1.35;
  --leading-body: 1.55;

  /* 4pt spacing scale — 与 Tailwind spacing 工具同名 */
  --spacing-3xs: 0.125rem; /* 2 */
  --spacing-2xs: 0.25rem;  /* 4 */
  --spacing-xs: 0.5rem;    /* 8 */
  --spacing-sm: 0.75rem;   /* 12 */
  --spacing-md: 1rem;      /* 16 */
  --spacing-lg: 1.5rem;    /* 24 */
  --spacing-xl: 2.5rem;    /* 40 */
  --spacing-2xl: 4rem;     /* 64 */
  --spacing-3xl: 6rem;     /* 96 */

  --radius-control: 6px;
  --radius-panel: 8px;
  --radius-sheet: 12px;
  --radius-pill: 999px;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --dur-micro: 120ms;
  --dur-short: 220ms;
  --dur-long: 420ms;

  --shadow-whisper: 0 1px 2px oklch(24% 0.02 258 / 0.06);
  --shadow-dialog: 0 18px 48px oklch(24% 0.02 258 / 0.16);

  --z-base: 1; --z-raised: 10; --z-dropdown: 100;
  --z-sticky: 200; --z-modal: 400; --z-toast: 500; --z-tooltip: 600;
}

/* 暗色只改亮度和 chroma，不改 hue；更高的表面更亮，不是更暗 */
html[data-theme="dark"] {
  --color-paper: oklch(16% 0.012 258);
  --color-paper-2: oklch(19.5% 0.014 258);
  --color-paper-3: oklch(23% 0.014 258);
  --color-rule: oklch(30% 0.012 258);
  --color-rule-2: oklch(38% 0.012 258);
  --color-grid: oklch(21% 0.008 258);

  --color-ink: oklch(94% 0.006 250);
  --color-ink-2: oklch(82% 0.008 250);
  --color-muted: oklch(68% 0.010 255);
  --color-neutral: oklch(52% 0.010 255);

  --color-accent: oklch(68% 0.16 256);
  --color-accent-hover: oklch(72% 0.16 256);
  --color-accent-active: oklch(76% 0.15 256);
  --color-accent-ink: oklch(16% 0.02 258);
  --color-accent-surface: oklch(24% 0.04 256);
  --color-focus: oklch(72% 0.16 256);

  --color-matched: oklch(70% 0.08 170);
  --color-matched-ink: oklch(84% 0.06 170);
  --color-matched-surface: oklch(22% 0.03 170);
  --color-gap: oklch(78% 0.12 75);
  --color-gap-ink: oklch(86% 0.08 75);
  --color-gap-surface: oklch(24% 0.035 75);
  --color-error: oklch(70% 0.16 25);
  --color-error-surface: oklch(24% 0.04 25);

  --color-graphite: oklch(22% 0.016 260);
  --color-graphite-2: oklch(26% 0.016 260);
  --color-on-graphite: oklch(94% 0.006 250);
  --color-on-graphite-muted: oklch(78% 0.010 250);

  --shadow-whisper: 0 1px 2px oklch(8% 0.01 258 / 0.4);
  --shadow-dialog: 0 18px 48px oklch(8% 0.01 258 / 0.5);
}

html { color-scheme: light; }
html[data-theme="dark"] { color-scheme: dark; }
html, body { overflow-x: clip; }
body {
  margin: 0;
  background: var(--color-paper);
  color: var(--color-ink-2);
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: var(--leading-body);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
*, *::before, *::after { box-sizing: border-box; }
button, input, select, textarea { font: inherit; color: inherit; }
button { cursor: pointer; }
:focus { outline: none; }
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
  border-radius: inherit;
}
::selection { background: var(--color-accent); color: var(--color-accent-ink); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 150ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 150ms !important;
  }
}
```

字体：用 `@fontsource/space-grotesk`（500/600/700）、`@fontsource/inter`（400/500/600）、`@fontsource/jetbrains-mono`（400/500）自托管；不请求 Google Fonts。中文不加载 webfont，使用系统 PingFang / Microsoft YaHei / Noto Sans SC 回退；这是性能决定，记录为对 Hallmark 字体配对规则的刻意偏离。

### 5.3 排版

| 角色 | 规则 |
|---|---|
| Display | Space Grotesk 600；字距 `-0.02em` 到 `-0.03em`；行高 1.1；用于 wordmark、覆盖率数字、空状态标题、根节点 |
| Body | Inter 400/500；14px 密集 UI，16px 正文；行高 1.55；中文回退系统栈 |
| Mono | JetBrains Mono 400/500；11px 标签/元信息/状态，10px 仅用于极小的 tag；`letter-spacing: 0.06em`；只承担「机器读数」一个角色，不写正文 |
| 字重 | 正文 400；标题 600；不要用 500 冒充对比 |
| 数字 | 覆盖率、节点数、日期、历史统计用 `font-variant-numeric: tabular-nums` |
| 标题 | 一律 roman；禁止斜体标题、渐变文字、全大写正文 |
| 正文宽度 | 空状态/说明文字 ≤ 55ch；不要超过 75ch |
| 标点 | 中文用全角标点；引号用 “ ”，破折号 ——，省略号 …；英文用 curly quotes 与 em dash |

字号下限：任何文字 ≥ 10px；正文 ≥ 12px；不要用 9px 标签。

### 5.4 布局与层级

| 项 | 值 |
|---|---|
| 顶栏 | 56px 桌面 / 48px 移动；`padding-inline: 16px`（移动 12px）；`border-bottom: 1px solid var(--color-rule)` |
| 右侧面板 | 360px；`border-left: 1px solid var(--color-rule)`；头部 48px；内容独立滚动 |
| 画布 | padding 40px 24px；内容 `margin:auto`；溢出时从左上可滚动；点阵 24px |
| 画布节点 | 根 180×56；分支 180×48；叶子 170×38；幽灵分支 180×58；幽灵叶子 170×38 |
| 浮动工具条 | 左下 16px；内边距 4px；按钮 32px（触屏 44px）；`shadow-whisper` |
| 画布状态 | 右下 16px；mono 11px；移动隐藏 |
| 搜索 popover | 320px；`z-dropdown`；`shadow-dialog` |
| 设置对话框 | `min(480px, calc(100vw - 32px))`；最大高 80dvh；`radius-panel` |
| 移动底部面板 | 高 64dvh；`radius-sheet` 顶部圆角；grabber 36×4px |
| z-index | 只用 `--z-base/raised/dropdown/sticky/modal/toast/tooltip`；禁止 9999 |

间距只用 `--spacing-*`；不允许 3px/5px/13px/17px 这类离格值。圆角只用 `--radius-*`。

### 5.5 颜色语义

| 状态 | 颜色 | 用法 |
|---|---|---|
| 交互/焦点/主按钮 | `--color-accent` | 只做信号：主按钮、tab 下划线、覆盖率条、focus ring、链接 |
| 已覆盖 | `--color-matched` | 目标树的 6px 方点；不对整张卡片铺色 |
| 缺口 | `--color-gap` + `--color-gap-surface` + `--color-gap-ink` | 幽灵节点 1.5px 虚线边框、浅琥珀底、`建议` 小标签 |
| 已忽略 | `--color-neutral` | 目标树灰点；画布上移除 |
| 用户独有 | 不引入第四种色 | 用普通节点 + 面板里的中性标签；避免颜色过载 |
| 错误 | `--color-error` | 输入错误、 toast 图标；配文字说明，不单靠颜色 |
| 根节点 | `--color-graphite` / `--color-on-graphite` | 石墨黑填充 + 浅色文字 |

对比度：正文 ≥ 4.5:1；大字/图标/焦点环 ≥ 3:1。所有节点边框、连线、复选框边框用 `--color-neutral`（而非 `--color-rule-2`）以满足 3:1。幽灵边框用 `--color-gap`，文字用 `--color-gap-ink`。主按钮文字必须用 `--color-accent-ink`，不能写 `white`。

### 5.6 组件规格

#### 顶栏

- 左：20px 自绘 graft 标记 + `Graft`（ink 600）+ `Overview`（muted 500）；1px 分隔线；文档标题 13px/500；保存状态 mono 11px + 5px 青点。
- 右：搜索 icon、主题 icon、设置 icon（36px，触屏 44px）、主按钮「开始对比 →」（36px，触屏 44px）。
- 移动：只显示 `Graft`、搜索、对比（短标签「对比」）、面板开关；主题/设置收进面板。
- 顶栏不吸顶（应用布局固定高度）；不要画假浏览器框。

#### 画布与节点

- 点阵：`radial-gradient(circle at 1px 1px, var(--color-grid) 1px, transparent 0)`，24px；`background-attachment: local`。
- 根节点：石墨黑底、`--color-on-graphite` 文字、16px Space Grotesk 600、最小高 56px、6px 圆角；meta 10px mono `--color-on-graphite-muted`。
- 分支：`--color-paper-2` 底、`--color-neutral` 1px 边框、13px/500；叶子：`--color-paper` 底、12px/400。
- 幽灵：`--color-gap-surface` 底、1.5px dashed `--color-gap`；分支内两行：10px mono `建议 · 高` + 13px 标题；叶子只有标题。
- 选中：2px `--color-focus` outline，offset 2px；不要用边框宽度变化。
- 连线：1.25px `--color-neutral`；幽灵连线 1.25px dashed `--color-gap`。
- 节点文字单行 ellipsis；`title` 属性给完整标题；不要用 tooltip 承载关键信息。
- 画布只渲染高优先级幽灵树；中低优先级在面板，点「定位」时再插入/高亮（V1 可完整上图）。

#### 图标

- 全部用 A0 的 `Icon.svelte`（18px viewBox，1.5px stroke，round caps）；只用一套：search、moon、sun、sliders、arrow-right、panel、plus、sibling、undo、redo、fit、x、check、external、clock、chevron。
- 不允许 emoji、不允许混用 Lucide/Phosphor/Heroicons 多套、不允许用图标代替文字标签（关键动作必须有 aria-label 或可见文字）。

#### 右侧面板

- 头部 48px；三 tab：`目标体系` / `建议 {n}` / `历史`；active：ink + 2px 钴蓝下划线；inactive：muted；tab 高度撑满头部，文字 nowrap。
- 头部右侧（移动端）：设置 icon、关闭 icon；桌面端隐藏。
- 覆盖率块：`padding: 16px`；mono 11px 标签 + Space Grotesk 24px 600 数字 + 2px 进度条 + 12px meta。
- 目标树：行高 30px（触屏 44px）；缩进 12px/级；左侧 1px `--color-rule` 引导线；状态点 6px 方点；选中行 `--color-paper-2` 背景 + ink 文字；标签单行 ellipsis；底部详情块用 `--color-paper` 背景 + 顶部 1px 分隔线。
- 建议项：20px 复选框列 + 12px gap + 内容；标题 13px/600 + `建议` 10px tag + `{n} 节点` 10px tag；理由 12px muted 最多 3 行；meta 11px mono（自测问题数、参考数）；操作 [采纳] [忽略] [定位]；行间 1px 分隔，不用卡片。
- 建议底部：粘性，`--color-paper` 背景 + 顶部 1px 分隔；`已选 n 项` + [忽略所选]（ghost）+ [采纳所选]（primary）；0 选中时 primary 变中性禁用态（不是半透明钴蓝）。
- 历史：行高约 70px；日期/时间 mono 11px + 建议数；标题 13px/500；统计 12px muted；行间 1px 分隔；底部说明「只保留最近 10 次；历史记录不包含 API Key。」+ [清空历史] 文字链接。

#### 按钮

| 变体 | 规格 | 状态 |
|---|---|---|
| Primary | 钴蓝底、`--color-accent-ink` 文字、6px 圆角、36px 高（触屏 44px）、padding 12px、13px/500 | hover 用 `--color-accent-hover`；active 用 `--color-accent-active` + translateY(1px)；disabled 变 `--color-paper-3` + `--color-rule-2` 边框 + muted 文字；loading 内联 spinner + 标签；error 用 `--color-error` 边框 + 文案；success 用 `--color-matched` 勾 + 文案 |
| Ghost | 透明底、1px `--color-neutral` 边框、ink-2 文字、6px 圆角、36px | hover paper-2；active paper-3 + translateY(1px)；disabled opacity .55 + cursor |
| Small | 28px 高（触屏 44px）、12px 字号、8px padding | 同上；只用于面板行内操作 |
| Icon | 36px（触屏 44px）、18px 图标、6px 圆角 | 透明底；hover paper-2 + rule 边框 + ink；active paper-3；disabled opacity .45；focus 可见 |

所有按钮 `white-space: nowrap`；不允许两行；不允许 hover-only。焦点环 2px，offset 2px，瞬间出现，不做过渡。

#### 输入与表单

- 高度 36px（触屏 44px）；1px `--color-rule-2` 边框；paper 背景；6px 圆角；padding 0 10px；13px。
- 所有状态保持 `border-width: 1px`；焦点用 `outline: 2px solid var(--color-focus); outline-offset: 1px`，不要用 border 变粗。
- 标签在上，帮助文字在下；错误替换帮助文字；帮助槽 `min-height: 1lh`，避免抖动。
- disabled：`opacity: .55` + `cursor: not-allowed` + `disabled` 属性；不要只靠透明度。
- 错误：`--color-error` 边框 + 文字 + `aria-invalid="true"` + `aria-describedby`。
- 成功：`--color-matched` 边框 + 勾 + 文案；重新输入时清除。
- loading：右侧 24px 槽内联 spinner，字段保持可编辑。
- 下拉/选择：能用原生 `<select>` 就用原生；自定义必须复刻键盘与读屏。

#### 对话框 / Toast / 空状态

- 对话框用原生 `<dialog>` + `showModal()`；`position: fixed; inset: 0; margin: auto; height: fit-content; max-height: min(80dvh, 40rem)`；`::backdrop` 用 `color-mix(in oklch, var(--color-ink) 30%, transparent)`；背景内容 `inert`；Esc/背板点击/关闭按钮都能关；首焦点给第一个交互元素。
- Toast：右下角固定，宽 ≤ 360px，paper 底 + 1px rule + `shadow-dialog`；错误/撤销用；不要「成功！」；4–6 秒自动消失，hover/focus 暂停；多个 toast 堆叠不推页面。
- 空状态：一句话说明空的是什么 + 为什么重要 + 一个动作；不要只写「暂无数据」。

#### 搜索 Popover

- 顶栏搜索图标或 `Ctrl/Cmd+F` 打开；320px；输入框 + 结果列表；250ms 防抖；匹配高亮；↑/↓ 选择，Enter 定位，Esc 关闭；点击外部关闭；空结果说明；结果行 32px（触屏 44px）；`aria-live="polite"` 报告结果数。

#### 目标编辑器 / 生成弹窗

- 目标编辑器：桌面左右分栏（textarea 50% + 只读树 50%）；移动 tab「编辑 / 预览」。textarea 用 mono 13px，2 空格缩进，Markdown bullet 语法；失焦解析；行内错误提示；[保存] [取消]。支持导入 `.md`。
- 生成弹窗：字段 领域、目标、水平（beginner/intermediate/advanced）、期限、每周投入、语言；[生成]（loading/取消）；生成后进入大纲编辑器预览；[保存为目标体系]。
- 模板列表：纵向列表（不是卡片网格），每行：标题、描述、节点数、来源 tag；4 套模板 + 空白目标 + 导入 Markdown。

#### 分享只读页

- 全屏只读画布 + 目标面板；顶栏 banner：`只读分享` + [导入到我的工作区]。
- 不允许编辑、对比、设置 Key；导入前确认；导入后跳 `#/`。
- 分享页背景、字体、节点样式与工作台一致；不要画假浏览器框。

#### 对比进度

- 顶栏下方 2px 不确定进度条（钴蓝，`linear-gradient` 动画仅限进度条；`prefers-reduced-motion` 下静态）。
- 画布上方浮层：`正在比对 {n} 个目标节点… {mm:ss}` + [取消]；不显示假百分比。
- 取消后保留旧结果；不写历史。

### 5.7 八态与可访问性

每个交互元素必须有：default、hover（`@media (hover: hover)`）、`:focus-visible`、`:active`、disabled、loading（仅异步动作）、error（仅表单/请求）、success（仅表单/请求）。至少 default + hover + focus-visible + active + disabled 要在代码里存在。

- 触控目标 ≥ 44×44px；复选框用 `::before` 扩展热区，视觉仍是 16px。
- 图标按钮必须有 `aria-label`；纯装饰 SVG 加 `aria-hidden="true"`。
- 表格数字用 `tabular-nums`；状态不能只靠颜色，要配图标/文字。
- 键盘可达：所有按钮、tab、树行、复选框、对话框；tab 切换支持 ←/→；Esc 关闭浮层。
- 焦点环 2px、offset 2px、≥3:1；不能动画出现。
- `prefers-reduced-motion: reduce` 下所有空间动效折叠为 ≤150ms 透明度变化；进度条保留功能。

### 5.8 动效

- 只动 `transform` 与 `opacity`；不动 width/height/top/left/margin/padding。
- 时长：micro 120ms（按下、复选）、short 220ms（hover、popover）、long 420ms（抽屉、对话框）。
- 缓动：`--ease-out` 进入、`--ease-in` 离开、`--ease-in-out` 状态切换；禁止 `ease`、linear（进度条除外）、bounce/overshoot。
- 幽灵节点淡入 220ms；面板抽屉 420ms；toast 220ms；不做页面滚动 reveal、不做视差、不做自动轮播、不做光标跟随。
- hover 只做一个信号：背景/边框/颜色三选一为主，不要同时 translate + scale + shadow + rotate。

### 5.9 响应式

| 断点 | 行为 |
|---|---|
| ≥ 960px | 三栏：顶栏 + 画布 + 360px 面板 |
| ≤ 960px | 面板变右侧抽屉（92vw 最大 360px），遮罩；顶栏隐藏文档标题/保存状态；面板开关出现 |
| ≤ 640px | 面板变底部 64dvh；顶栏 48px；只保留 Graft / 搜索 / 对比 / 面板；主题与设置进面板；工具条底部居中；画布状态隐藏 |
| ≤ 400px | 对比按钮可缩为「对比」；面板头三 tab + 设置/关闭必须仍可见 |

硬性：320/375/414/768 无横向页面滚动；`html, body { overflow-x: clip; }`；可点文字单行；不用 `100vw`；用 `dvh` 而不是 `vh`；触摸目标 44px；不要桌面-only 的 hover 交互。

### 5.10 文案与语气

- 具体、技术、克制；不写「释放」「无缝」「赋能」「颠覆」「下一代」。
- 按钮用动词：开始对比、采纳、忽略、定位、导出报告、导入到我的工作区、清空历史。
- 错误三段式：发生了什么、为什么、下一步做什么。例：「无法连接模型服务。检查 Base URL、网络，或服务商是否允许浏览器跨域。也可以改用本地 Ollama。」
- 空状态三段式：空的是什么、为什么重要、一个动作。
- 不用「Oops」「出错了」「暂无数据」；不用感叹号；不在挫折路径开玩笑。
- 示例文案：
  - 空状态标题：「先把你会的东西画出来」
  - 空状态正文：「从一个根节点开始，或者让 AI 按目标生成一份初稿，再删掉不会的。」
  - 目标空状态：「还没有目标体系」/「选一套模板，或让 AI 按你的目标生成一份。」
  - 覆盖率 meta：「目标 84 · 已覆盖 52 · 缺失 12」
  - 建议理由：「你的图里有模块化，但没有从构建到发布的链路。补上后能解释打包、热更新、测试与上线。」
  - 分享 banner：「只读分享」/「导入将覆盖当前工作区，建议先导出备份。」
  - 安全提示：「Key 只保存在本浏览器 localStorage；任何在本页运行的脚本都能读取。不要在公共电脑使用。」

### 5.11 Slop test 结果与刻意偏离

- **58 / 58 适用门禁通过**；页面级 hero/nav/footer/macrostructure 门禁不适用（这是应用工作台，不是营销页）。
- 已修：离格间距（3/5/13px）、节点/连线/复选框低于 3:1、缺 active/disabled 态、复选框 16px 热区、禁用主按钮仍像可点。
- 刻意偏离（必须保留在 README/设计说明里）：
  1. Cobalt 指定 Inter 正文，与 Hallmark 的 Inter 默认禁令冲突；主题规范优先。
  2. Mono 标签超过「outlier ≤2 处」；在应用里 mono 是单一「机器读数」角色，不是第三正文字体。
  3. 不加载中文 webfont；用系统 CJK 栈，性能优先。
  4. fixtures/预览中的 61%、84/52/12、历史日期是界面样例，不是产品/市场承诺。
- 禁止清单：`transition: all`、`hover:scale`、渐变文字/背景、假浏览器/手机/IDE 外框、emoji 图标、斜体标题、卡片套卡片、三列图标功能卡、编造指标/证言、`#000`/`#fff` 作为基色、`outline: none` 无替代、两行可点文字、页面横向滚动、10px 以下文字。

---

## 6. 模块规格

### 6.1 A0 — 应用外壳、状态、存储、i18n、通用组件

**职责**

- 脚手架：Vite + Svelte 5 + TS strict + Tailwind v4 + pnpm；`packageManager` 固定；Node 22 LTS。
- `src/lib/types.ts`（§3.1）与 `src/lib/signature.ts`；所有 Agent 只读。
- `src/lib/state/workspace.svelte.ts`：
  - `$state` 持有 `Workspace`；`load()`/`saveDebounced()`/`flush()`；`replaceMap(map)`、`setTarget`、`setComparison`、`updateGapStatus(signature, status)`、`setIgnored(signatures)`、`importWorkspace`、`resetWorkspace`。
  - 任何写操作必须经过 store；组件不得直接改 `workspace.map`。
  - 自动保存 500ms；`beforeunload`/`visibilitychange` flush；保存失败 toast。
  - 采纳/忽略的业务规则在 A4 的 `src/lib/compare/apply.ts`；A0 只提供持久化与状态 API，不实现采纳算法。
- `src/lib/state/ui.svelte.ts`：面板 tab、设置弹窗、搜索弹窗、分享弹窗、导出弹窗、`locateRequest`、`compareProgress`、`stale`。
- `src/lib/state/theme.svelte.ts`：light/dark/system；首帧前内联脚本设置 `data-theme`；持久化 `graft.theme`。
- `src/lib/i18n/`：`index.ts` 合并各 feature 消息模块；`t(key, params)`；`currentLocale`；`zh`/`en`；所有可见文案必须走 `t()`。
  - feature 消息文件按所有权拆分：`common.ts`（A0）、`map.ts`（A1）、`target.ts`（A2）、`compare.ts`（A3）、`suggest.ts`/`share.ts`（A4）。每个文件导出 `zh`/`en` 同构对象；A0 汇总并做 key 类型校验。
- 通用组件：`Icon.svelte`（一套 18px stroke 图标）、`Button.svelte`、`IconButton.svelte`、`Input.svelte`、`Textarea.svelte`、`Select.svelte`、`Dialog.svelte`、`ToastStack.svelte`、`Tabs.svelte`、`Tag.svelte`、`EmptyState.svelte`、`Spinner.svelte`。
- 布局：`App.svelte`、`TopBar.svelte`、`Panel.svelte`（三 tab 壳，导入 A2/A4 的 pane）、`CanvasShell.svelte`（导入 A1 的画布）。
- 路由：`#/`、`#/share`、`#/share/invalid`；hash 监听；分享页不加载编辑态。
- 定位映射：`src/lib/locate.ts` — 给定 `targetId`，从 comparison 的 matches 找用户节点，从 ghostTrees 找幽灵节点；返回 `{ nodeId, kind: 'user'|'ghost' }`；A2/A4 调用，A1 消费 `locateRequest`。
- CI：GitHub Actions build + Pages deploy；`pnpm lint`、`pnpm check`、`pnpm test`、`pnpm build`。

#### Svelte 5 写法（强制）

- 只用 runes：`$state`、`$derived`、`$effect`、`$props`、`$bindable`；禁止 `export let`、`$:`、`svelte/store` 的 `writable/readable/derived`、`createEventDispatcher`、`<slot>`。
- 事件用属性写法 `onclick={...}` / `oninput={...}`；组件通信用 callback props；插槽用 snippets（`{#snippet}` / `{@render}`）。
- 共享状态用 `*.svelte.ts` + class/$state；不要用裸可变对象绕过响应式。
- 派生值用 `$derived`，不要用 `$effect` 算派生；`$effect` 只做副作用（自动保存、订阅、DOM 操作）。
- 不用 `any`；未知 JSON 用 `unknown` + 校验；公开 API 必须有显式返回类型。
- 所有组件 `lang="ts"`；`svelte-check` 零错误；不要用 legacy 语法混写。

**验收**

- `pnpm build` 成功；首页在 1440/375 可加载；主题切换持久化；刷新不丢工作区。
- 存储损坏/版本过高有明确恢复路径，不静默清空。
- 所有通用组件有 8 态示例或测试；焦点环可见；触控 44px。
- `t()` 缺失 key 在开发模式报错，生产回退 zh。

### 6.2 A1 — 导图工作台

**职责**

- mind-elixir 封装：`src/lib/map/adapter.ts`（canonical ↔ mind-elixir）、`editor.svelte.ts`（实例、事件、zoom/fit/center）、`commands.ts`（增删改、折叠、重命名）、`history.svelte.ts`（快照撤销/重做，50 步）、`search.ts`。
- 画布组件：`MapCanvas.svelte`、`CanvasToolbar.svelte`、`NodeContextActions`（如需要）。
- Props/契约：
  - `map: KnowledgeMap`
  - `ghostTrees: GhostTree[]`
  - `selectedNodeId: NodeId | null`
  - `locateRequest: { nodeId: NodeId; ts: number } | null`
  - `onMapChange(map: KnowledgeMap, meta: { source: 'editor'|'undo' })`
  - `onSelect(nodeId)`
  - `onGhostAdopt(signature)`
- 幽灵渲染：把 `GhostTree.root` 作为子树插入 mind-elixir；ID 已带 `ghost-` 前缀；样式虚线琥珀；不写入 canonical map；序列化/导出时过滤 `ghost-` 前缀与 ghost ID 集合。
- 外部 map 变化（A4 采纳、JSON 导入、外部撤销）通过 A0 的 `workspace.replaceMap` 进入；A1 用对象引用/版本号检测并 re-init 或同步，不要再次触发 `onMapChange`，避免循环。
- 撤销/重做：快照式；每次编辑前 push 当前 canonical 树（深拷贝），上限 50；输入合并 500ms；undo/redo 后 re-init 画布；幽灵层不进入撤销栈。`history.svelte.ts` 的 `push(snapshot)`/`undo()`/`redo()`/`canUndo`/`canRedo` 是公开 API，A4 在采纳前调用 `push`，让采纳可撤销。
- 自动保存：通过 A0 store 的 500ms 防抖；用户编辑与采纳都走 `onMapChange`。
- 快捷键：§2.7；不要拦截浏览器保留快捷键；F2 重命名；Delete 删除可撤销。
- 搜索：`Ctrl/Cmd+F` 打开 A0 的 popover（A1 提供 `searchNodes(map, query)` 与结果路径）。
- 移动：mind-elixir 触屏平移/缩放；工具条底部居中；所有按钮 44px；无 hover-only。
- 性能：400 节点首屏 < 500ms；缩放/平移不卡顿；不要每次 state 变化重建整个实例（外部 map 变化时比较版本号，必要时 re-init）。

**验收**

- 单测：adapter round-trip（ID/topic/children/note/collapsed）、ghost 过滤、undo/redo 50 步、search 大小写/NFKC。
- E2E：新建/重命名/删除/撤销/重做/刷新持久化；折叠持久化；快捷键；375px 触屏平移缩放 smoke。
- 验收：导出 JSON 不含任何 `ghost-` 节点；采纳后幽灵消失、实节点出现。

### 6.3 A2 — 目标体系

**职责**

- 4 套静态模板：`src/content/templates/frontend.ts`、`algorithms.ts`、`product.ts`、`english.ts`；每套 60–100 节点，3–4 层，带 note；稳定 ID（`tpl-frontend-html` 等）；`index.ts` 汇总元数据（标题、描述、节点数、来源）。
- 模板列表：纵向行列表，不用卡片网格；[空白目标] [导入 Markdown]。
- 目标生成：`TargetGenerateDialog.svelte`；字段与校验按 §4.3；调用 A3 `generateTarget()`；loading/取消/错误；结果进大纲编辑器预览，用户确认后写 store。
- 大纲编辑器：`TargetOutlineEditor.svelte`；Markdown bullet + 2 空格缩进；解析/序列化；错误行；桌面分栏，移动 tab；保存/取消；导入 `.md` 文件。
- 只读目标树：`TargetPane.svelte`；状态点、选中行、底部详情、点击定位；空状态；[编辑目标] [重新生成]。
- 来源 tag：模板/生成/手动/导入；节点数；标题可编辑（≤60 字）。
- 目标变更后：通知 A0 标记 comparison stale；不删除旧结果，只提示「结果已过期」。

**验收**

- 模板加载、节点数/深度校验、note 存在。
- 大纲 parse/serialize round-trip；非法缩进/空标题有明确错误；多根节点包装为单一根。
- 生成 mock 成功/失败/超限；取消不写入；保存后目标树渲染正确。
- 点击叶子定位到画布用户/幽灵节点；目标编辑后 stale 提示出现。

### 6.4 A3 — 对比引擎与设置

**职责**

- `src/lib/llm/client.ts`：fetch、超时、Abort、错误映射（§4.6）；`testConnection()`。
- `src/lib/llm/presets.ts`：§4.2 预设；不硬编码模型承诺。
- `src/lib/compare/serialize.ts`：canonical tree → `t1|depth|topic|note` / `u1|...`；返回 `PromptIndex`（t/u → real ID）。
- `src/lib/compare/prompt.ts`：§4.3/§4.4 全文；locale 切换；目标 note 截断 60 字；用户 note 不发送。
- `src/lib/compare/schema.ts`：结果校验/清洗/修复/引用完整性/最高缺失子树/覆盖率/截断（§4.5）。
- `src/lib/compare/signature.ts`：目标/用户/缺口签名；忽略过滤。
- `src/lib/compare/run.ts`：`runComparison(...)`；`generateTarget(...)`；返回 typed result 或 `LlmError`。
- `src/components/settings/SettingsDialog.svelte`：字段、预设、测试连接、保存、Key 显示/隐藏、安全提示；A0 的 Dialog/Input/Button。
- `src/lib/state/llm.svelte.ts`：`StoredLlmSettings` 读写（`graft.llm.v1`）；不进入 workspace。
- 对比进度：A3 暴露 `progress` 回调/状态；A4 渲染浮层。

**验收**

- 单测：serialize 索引正确；validator 覆盖重复 ID、未知 ID、后代 gap、非法 parent、空结果、截断、修复成功/失败；覆盖率计算；忽略过滤。
- 客户端 mock：200 有效、200 无效 JSON、401、404、429、500、网络错误、超时、abort；错误文案符合 §4.6。
- Key 不出现在任何导出/分享/历史/console；设置清除 Key 生效。
- 目标生成校验 60–140 节点、深度 ≤4；超限拒绝。

### 6.5 A4 — 建议、导出、分享、历史

**职责**

- `SuggestionsPane.svelte`：按 priority 分组；顶层 gap；复选框/全选；采纳/忽略/定位；批量操作；粘性 footer；空状态；stale banner。
- `src/lib/compare/apply.ts`：`buildGhostTrees(target, gaps, ignored)`；`applyGapToMap(map, gap, target)`（深拷贝、跳过 matched 后代、分配新 ID、挂载到 parent/root）；`ignoreGap`；`restoreIgnored`；`nodeCount` 计算。
- `CompareButton.svelte` + `ProgressOverlay.svelte`：按钮状态（无目标/无 Key/进行中/成功/失败）、取消、进度文案。
- 历史：`HistoryPane.svelte`；最近 10 条；只读结果摘要；导出；清空确认。
- 报告：`src/lib/export/markdown.ts`；结构见下；文件名 `graft-report-YYYYMMDD-HHmm.md`。
- JSON：`export/json.ts` / `import/json.ts`；校验/确认覆盖。
- 分享：`src/lib/share/encode.ts` / `decode.ts`；lz-string；12k 上限；`SharePreview.svelte`；导入确认。
- Toast/Undo：采纳/忽略 5 秒撤销；清空历史/导入覆盖用确认弹窗。
- 目标定位：调用 A0 `locate.ts`，把 target 节点映射到 user/ghost 节点。
- 覆盖率展示：来自 `ComparisonResult.stats`；不重新计算分数。

**Markdown 报告结构**

```md
# 知识体系补全报告

> 生成时间：2026-11-13 14:32
> 目标体系：前端开发知识体系
> 覆盖率：61%（目标 84 · 已覆盖 52 · 缺失 12）

## 高优先级缺口

### 工程化（4 个节点）
- 为什么缺：…
- 自测：…
- 参考（AI 生成、未验证）：[Vite 官方文档](https://vite.dev/guide/)

## 中优先级缺口 / 低优先级缺口

## 已覆盖
- HTML / CSS → HTML 语义化

## 用户独有
- 可视化（目标体系未覆盖）

## 忽略项
- 协作（用户已忽略）

---
由 GraftOverview 生成。建议内容由模型生成，链接未验证。
```

**验收**

- 采纳：子树插入、ID 不冲突、matched 后代不重复、撤销可回滚、幽灵消失、覆盖率刷新、stale 标记。
- 忽略：签名持久化；`gap.status='ignored'`；幽灵移除；下次对比不出现（仍计入覆盖率，不虚增）；撤销恢复 `pending`。
- 批量：全选/部分选择；0 选中时按钮禁用；操作后 toast + 撤销。
- 导出：Markdown 结构完整、链接标注未验证、无 Key；JSON round-trip；分享 URL 超限降级。
- 分享页只读；导入确认；导入后工作区正确。
- 历史：10 条上限、清空确认、不包含 Key。

## 7. 多 Agent 开发计划

### 7.1 角色总览

| 角色 | 工作流 | 阻塞关系 | 主要交付 |
|---|---|---|---|
| A0 | 基建、契约、外壳、存储、i18n、通用组件、CI | 阻塞所有人 | 可编译的骨架 + 设计 token + 应用壳 |
| A1 | 导图工作台（mind-elixir、adapter、幽灵渲染、撤销、搜索） | 依赖 A0 | 可编辑、可持久化的画布 |
| A2 | 目标体系（模板、生成、大纲编辑、只读树） | 依赖 A0；生成依赖 A3 接口 | 目标来源与目标树 |
| A3 | 对比引擎（LLM 客户端、Prompt、校验、签名、设置） | 依赖 A0 | 可测试的对比/生成引擎 |
| A4 | 建议、采纳/忽略、历史、报告、JSON、分享 | 依赖 A1/A3/A0 | 闭环 UI 与导出 |
| A5 | 集成 QA（E2E、响应式、a11y、性能、slop test） | 依赖 A1–A4 | QA 报告 + 发布检查 |
| 编排 Agent | 合并、契约变更、集成顺序、冲突解决 | 贯穿 | 可发布的 main |

A0–A4 是并行开发工作流，A5 是独立 QA；编排 Agent 由当前主 Agent 担任，不另起工作流。

### 7.2 依赖图与里程碑

```
M0  A0: scaffold + types + tokens + storage + i18n + shell + CI
        │
        ├── A1: map workbench ─────────────┐
        ├── A2: target system ─────────────┤
        └── A3: compare engine ────────────┤
                                           ├── M2 A4: suggestions + exports + share
                                           │
                                           └── M3 A5: QA + real BYOK smoke
```

- **M0（A0）**：仓库初始化、类型冻结、token、存储、i18n、通用组件、应用壳、`pnpm build/lint/test` 绿、Pages 预览可访问。
- **M1（A1/A2/A3 并行）**：各自单元测试通过；A4 可用 fixtures 先做静态面板。
- **M2（A4 集成）**：mock LLM 端到端闭环：模板 → 画图 → 对比 → 幽灵 → 采纳/忽略 → 导出/分享。
- **M3（A5）**：真实 BYOK 手工冒烟（不进 CI）、响应式/a11y/性能、bug 修复、发布。
- **M4**：打 tag `v0.1.0`，部署 Pages。

### 7.3 文件所有权矩阵

| 路径 | 所有者 | 其他 Agent |
|---|---|---|
| `package.json`, `pnpm-lock.yaml`, `vite.config.ts`, `tsconfig*.json`, `svelte.config.js`, `.github/**` | A0 | 只读 |
| `index.html`, `src/main.ts`, `src/App.svelte`, `src/app.css` | A0 | 只读 |
| `src/lib/types.ts` | A0 | 只读；变更走申请 |
| `src/lib/signature.ts`, `src/lib/locate.ts` | A0 | 只读 |
| `src/lib/storage/**`, `src/lib/state/**` | A0 | 通过公开 API 调用 |
| `src/lib/i18n/index.ts`, `common.ts`, `types.ts` | A0 | 只读 |
| `src/lib/i18n/map.ts` | A1 | 只读 |
| `src/lib/i18n/target.ts` | A2 | 只读 |
| `src/lib/i18n/compare.ts` | A3 | 只读 |
| `src/lib/i18n/suggest.ts`, `share.ts`, `history.ts` | A4 | 只读 |
| `src/components/common/**`, `src/components/layout/**`, `src/components/panel/Panel.svelte` | A0 | 只读 |
| `src/lib/map/**`, `src/components/canvas/**` | A1 | 只读 |
| `src/lib/target/**`, `src/components/target/**`, `src/content/templates/**` | A2 | 只读 |
| `src/lib/llm/**`, `src/lib/compare/**`, `src/components/settings/**` | A3 | 只读 |
| `src/lib/export/**`, `src/lib/share/**`, `src/components/suggestions/**`, `src/components/history/**`, `src/components/share/**` | A4 | 只读 |
| `tests/e2e/**`, `docs/qa-report.md` | A5 | 只读 |
| `docs/contract-requests/**` | 各 Agent 写自己的文件 | 不改别人的 |
| `README.md`, `LICENSE`, `docs/privacy.md` | A0 | 只读 |

规则：

- 只改自己名下的文件。需要改共享文件（`types.ts`、`app.css`、`i18n/index.ts`、`Panel.svelte`、`TopBar.svelte`、通用组件）→ 写契约申请，不直接改。
- 只从别人的模块导入公开导出；不要深入 import 内部文件。
- 新增功能文件放在自己的目录；不要建跨所有权的工具文件。
- 测试：单元测试与被测模块同目录（`*.test.ts`）或 `tests/unit`；E2E 归 A5。

### 7.4 Agent Brief

#### A0 — 基建与外壳

**先读**：§0、§1、§2、§3、§5、§6.1。
**交付**：
1. Vite + Svelte 5 + TS strict + Tailwind v4 + pnpm 工程；Node 22；`packageManager` 固定。
2. `src/app.css`：§5.2 完整 token + 基础样式 + 字体自托管。
3. `src/lib/types.ts`、`src/lib/signature.ts`、`src/lib/locate.ts`。
4. `src/lib/storage/**`（workspace/llm/history/migrate）、`src/lib/state/**`（workspace/ui/theme）。
5. `src/lib/i18n/**`（index + common + 各 feature 消息骨架；A1–A4 填充自己的 feature 文件）。
6. 通用组件（Icon/Button/IconButton/Input/Textarea/Select/Dialog/ToastStack/Tabs/Tag/EmptyState/Spinner），全部 8 态。
7. `App.svelte`、`TopBar.svelte`、`Panel.svelte` 壳、路由、首帧主题脚本、分享路由骨架。
8. `fixtures/` 示例数据、GitHub Actions Pages 工作流、README/LICENSE 骨架。
9. `pnpm dev/build/check/lint/test` 全绿；Pages 预览可访问。

**禁止**：实现具体业务逻辑（A1–A4 的）；改 LLM Prompt；做营销落地页。
**验收**：§7.7 DoD + 首屏可加载、主题持久化、存储损坏有恢复路径。

#### A1 — 导图工作台

**先读**：§2.2–§2.4、§2.7、§3、§5.6、§6.2。
**交付**：adapter、commands、history、search、MapCanvas、CanvasToolbar、幽灵渲染、快捷键、自动保存、移动端平移缩放、性能优化。
**禁止**：改 `types.ts`/store API；改面板/目标/引擎；把幽灵节点写进 canonical map。
**验收**：§6.2 验收 + 导出不含 ghost；400 节点首屏 < 500ms；刷新不丢；撤销 50 步。

#### A2 — 目标体系

**先读**：§2.4、§3、§4.3、§5.6、§6.3。
**交付**：4 套模板（60–100 节点/套，3–4 层，带 note、稳定 ID）、模板列表、生成弹窗、大纲编辑器、只读目标树、来源 tag、编辑/重新生成、stale 通知。
**禁止**：改 compare 引擎；改画布；把生成结果直接写入 store（必须先预览确认）。
**验收**：§6.3 验收 + 模板内容真实、无编造链接；大纲往返；目标编辑触发 stale。

#### A3 — 对比引擎与设置

**先读**：§3、§4、§5.6、§6.4。
**交付**：LLM client/presets/errors、serialize/prompt/schema/signature/run、目标生成、设置弹窗、`llm.svelte.ts`、测试连接、错误映射、mock 测试。
**禁止**：改 UI 面板/画布/导出；把 Key 写入 workspace；自动重试。
**验收**：§6.4 验收 + 所有错误路径有测试；Key 不泄漏；Prompt 与 §4 一致。

#### A4 — 建议、导出、分享、历史

**先读**：§2.5–§2.6、§3、§4.5、§5.6、§6.5。
**交付**：建议面板、幽灵树构建、采纳/忽略/撤销、批量、对比按钮/进度、历史、Markdown 报告、JSON 导入导出、URL 分享、只读分享页、stale banner。
**禁止**：改 compare 校验/签名；改画布内部；把分享数据写入 localStorage（除非用户确认导入）。
**验收**：§6.5 验收 + 闭环 E2E（mock）；导出无 Key；分享 URL 超限降级。

#### A5 — 集成 QA

**先读**：全文件，重点 §1.7、§2、§5.7–§5.11、§7.7。
**交付**：
1. Playwright E2E：首跑闭环、错误路径、分享/导入、JSON 往返、搜索/暗色/历史、移动端、400 节点、键盘-only。
2. `@axe-core/playwright` 扫描工作台/设置/分享页；无 serious/critical。
3. 320/375/414/768/1280/1440 响应式检查；无横向页面滚动；无两行可点文字。
4. 性能：首屏、400 节点、bundle 预算；记录数据。
5. Hallmark 适用门禁复核：token、对比度、8 态、slop 清单；写 `docs/qa-report.md`。
6. 发布检查：Pages 构建、README、LICENSE、隐私说明、无 Key/无假数据。
**禁止**：改共享契约；大规模重写功能代码（小 bug 可修，跨模块改动交回 owner）。
**验收**：QA 报告含命令、结果、截图/证据；无 P0/P1；DoD 全绿。

### 7.5 契约变更协议

1. 在 `docs/contract-requests/<agent>-<YYYYMMDD>.md` 写：要改什么、为什么、建议 diff、影响哪些文件、是否阻塞。
2. 编排 Agent 审核；只有它能改共享文件。审核通过后，A0 更新类型/组件，再通知相关 Agent。
3. M0 后类型冻结：只允许**新增可选字段**；不改名、不删字段、不改语义。破坏性变更必须编排 Agent 明确批准并更新本文档。
4. 紧急情况下，Agent 可在自己目录加本地 adapter，并标 `// TODO(contract): docs/contract-requests/...`；不得改共享类型。
5. 任何 Prompt/schema 变更由 A3 提议，A4/A5 同步更新 fixture 与测试；不要单方面改输出字段。

### 7.6 Git / Worktree 协议

- 编排 Agent 初始化 git；分支：`agent/a0-foundation`、`agent/a1-map`、`agent/a2-target`、`agent/a3-engine`、`agent/a4-suggest`、`agent/a5-qa`。
- 运行时支持 worktree 就每个 Agent 一个 worktree；不支持就在同一棵树里只碰自己文件。禁止 `git checkout/reset/clean` 影响别人；禁止 stage 别人的文件。
- 提交：`feat(map): ...`、`fix(compare): ...`、`test(qa): ...`；小步提交；不提交 Key、`.env`、截图/profile。
- 合并顺序：A0 → A1/A2/A3（任意序）→ A4 → A5。共享文件冲突由编排 Agent 解决。
- 不用 `--no-verify`；不 force-push；不 amend 已推送提交。GitHub 上用 PR 时同样顺序。

### 7.7 集成顺序与 Definition of Done

**集成顺序**

1. A0 合并，冻结类型；其他人 rebase/同步。
2. A1/A2/A3 合并；A4 先接 A1 的 `onMapChange`/ghost props，再接 A3 的 `runComparison`。
3. A4 合并；跑 mock 端到端。
4. A5 跑全量；修 P0/P1；发布。

**DoD（每个 Agent 交付前自检）**

- `pnpm install` / `pnpm build` / `pnpm check` / `pnpm lint` / `pnpm test` 全绿；A5 另跑 `pnpm test:e2e`。
- 无 `any` 出现在公开 API；无无理由 `@ts-ignore`；无未使用导出/死代码。
- 所有可见文案走 `t()`；zh 完整；en beta 键齐全；无硬编码中文。
- 所有颜色/字体来自 token；无裸 OKLCH/hex/rgb/hsl；无裸 `font-family`。
- 所有交互元素至少 default/hover/focus-visible/active/disabled；异步动作有 loading/error/success；焦点环可见；触控 ≥44px。
- 320/375/414/768/1280/1440 无页面横向滚动；可点文字不换行。
- LLM 失败不覆盖旧结果、不写历史、不破坏存储；Key 不出现在导出/分享/历史/console。
- 导出/分享/导入有测试；分享只读；导入确认。
- 无假数据、无假外框、无 emoji 图标、无斜体标题、无 `transition: all`、无 hover:scale。
- 自己的模块有单元测试；跨模块行为有 E2E 或 fixture 测试。
- 提交信息清晰；只 stage 自己文件；无密钥。

### 7.8 测试与 fixtures

- **Vitest**：纯逻辑（adapter、serialize、validator、signature、coverage、apply、export、share encode/decode、storage migration）。
- **Playwright**：mock LLM；`page.route('**/chat/completions', ...)` 返回 fixtures；CI 不用真实 Key。
- **fixtures**（A0 建骨架，A3/A4 补全）：
  - `fixtures/map.sample.json` — 8–16 节点，含中文/英文/同义词。
  - `fixtures/target.sample.json` — 12–20 节点，含 note。
  - `fixtures/comparison.sample.json` — 有效结果：matches + 2 个顶层 gaps + extras。
  - `fixtures/comparison.invalid.json` — 重复 targetId、未知 ID、后代 gap、非法 parent、非法 link、非法 priority。
  - `fixtures/target-generation.sample.json` — 合法生成树。
  - `fixtures/map.large.json` — 400 节点，用于性能测试（可脚本生成，不提交巨大文件）。
- **a11y**：`@axe-core/playwright` 扫描工作台、设置、分享；不允许 serious/critical。
- **性能预算**：首屏 JS < 300KB gzip；CSS < 40KB gzip；拉丁字体 < 150KB；400 节点首屏 < 500ms；无长任务 > 200ms 的明显卡顿。
- **视觉**：Playwright 截图仅作 CI artifact，不提交；检查 320/375/414/768/1280/1440。

### 7.9 Review 清单（编排/QA 用）

- 契约：类型、存储 key、Prompt、输出 schema 是否与本文一致？
- 所有权：是否改了别人的文件？共享文件是否走了申请？
- 设计：token、对比度、8 态、响应式、文案、空/错/加载状态是否达标？
- 数据：Key/分享/导出/历史是否隔离？失败是否保留旧数据？
- 体验：首跑能否 3 分钟闭环？建议是否可解释？采纳/忽略是否可撤销？
- 发布：Pages 构建、README、LICENSE、隐私说明、无假数据。

---

## 8. 路线图

### MVP v0.1（本次）

§1.6 M1 + M2：目标（模板/生成/手动/导入）、导图（编辑/撤销/保存/搜索/暗色）、对比（BYOK/语义/校验/错误）、建议（幽灵/采纳/忽略/批量/历史）、导出（Markdown/JSON/URL 分享）、移动端可用、i18n 骨架。

交付顺序：M1 核心 → M2 体验。若发布时间风险，M2 可拆到 v0.1.1，但不得改 schema/契约。

### V1 v0.2

- 目标节点详情：note、自测问题、参考链接集中查看。
- 分支级对比：>400 节点时选一个顶层分支对比。
- 多轮对比与差异回看：上次 vs 本次覆盖率/缺口变化。
- 模板扩到 8–10 套；英文 UI 完整校对。
- 长任务重试/续跑；失败后从上次进度继续（不做流式）。
- 命令面板（⌘K）；可访问性审计；首跑引导。
- 500+ 节点性能优化。

### V2 v0.3+

- 多工作区/多项目（IndexedDB + 迁移）。
- 可选学习进度（未学/学习中/已掌握）+ 统计；不改「画上即掌握」的默认语义。
- 社区模板包导入/导出；模板贡献规范。
- 多模型并排对比；本地模型体验增强。
- 分享页只读增强；PDF/PNG 导出；PWA/离线。
- 可选 Cloudflare Worker 代理模板（单独部署，不默认启用）。

版本与迁移：semver；每次 schema 变更写迁移 + fixture + 测试；旧版本文件只读提示，不静默升级。

---

## 9. 开源与发布

- 仓库名 `GraftOverview`；MIT；README 中文为主 + 英文摘要。
- README 必含：一句话、截图/GIF（真实界面，无假数据）、功能、快速开始（pnpm）、BYOK 设置、隐私（无后端/无遥测/Key 仅本地）、路线图、贡献、许可证。
- 隐私说明 `docs/privacy.md`：数据只存本地；对比时导图/目标发给用户配置的模型服务商；无账号/无服务器；Key 可清除；分享链接含导图/目标但不含 Key。
- GitHub Actions：Node 22 + pnpm；`pnpm install --frozen-lockfile` → `pnpm check` → `pnpm test` → `pnpm build` → Pages artifact；main 分支部署。
- `vite.config.ts` `base: './'`；hash 路由；无需 404 回退。
- 发布检查：build 绿、E2E 绿、无 Key、无假数据、LICENSE、README、隐私说明、Pages 可访问、移动端 375 可完成闭环。
- 版本 tag：`v0.1.0`；Release notes 写清 BYOK、CORS 限制、已知风险。

---

## 10. 风险与已知取舍

| 风险 | 影响 | 缓解 |
|---|---|---|
| BYOK 直连受 CORS 限制 | 某些服务商在浏览器不可用 | 错误页给诊断；推荐 Ollama；V2 可选 Worker 模板；不内置代理 |
| LLM 生成链接幻觉 | 用户点到失效/错误链接 | UI 标注「AI 生成、未验证」；不请求/不验证；最多 2 条；这是明确接受的取舍 |
| JSON 输出不稳定 | 对比失败 | 一次修复；引用完整性校验；失败不落盘；保留旧结果 |
| 大图超上下文 | 结果差/截断 | 400 节点上限；目标 note 截断；V1 分支对比 |
| 幽灵节点与 mind-elixir 兼容 | 渲染/导出污染 | 独立 ghost ID 前缀 + 序列化过滤；A1/A4 共同验收 |
| CJK 字体体积 | 首屏慢 | 不加载中文 webfont；系统栈；拉丁字体子集自托管 |
| URL 分享过长 | 链接被截断 | 12k 上限；超限降级为 JSON 导出 |
| 多 Agent 文件冲突 | 合并困难 | 所有权矩阵 + 契约申请 + worktree/分支 + 编排合并 |
| 范围蔓延 | 延期 | §1.6 明确不做；新增走申请；M2 可滑到 v0.1.1 |
| 服务商模型名变化 | 预设失效 | 预设可编辑；不写「最新」承诺；错误提示指向设置 |
| LLM 成本 | 用户顾虑 | 只发必要字段；无自动重试；显示请求规模；用户自选模型 |

---

## 附录 A：fixtures 形状

`fixtures/map.sample.json`（最小示例；实际文件可更完整）：

```json
{
  "id": "map_sample",
  "title": "我的前端知识",
  "updatedAt": "2026-11-13T00:00:00.000Z",
  "root": {
    "id": "u_root",
    "topic": "我的前端知识",
    "children": [
      { "id": "u_html", "topic": "HTML / CSS", "children": [
        { "id": "u_semantic", "topic": "语义化", "children": [] },
        { "id": "u_flex", "topic": "Flex / Grid", "children": [] }
      ]},
      { "id": "u_js", "topic": "JavaScript", "children": [
        { "id": "u_closure", "topic": "闭包", "children": [] }
      ]},
      { "id": "u_react", "topic": "React", "children": [
        { "id": "u_hooks", "topic": "Hooks", "children": [] }
      ]}
    ]
  }
}
```

`fixtures/target.sample.json`：同结构，`source: "template"`，`templateId: "frontend"`，根 `t_root`，含 `工程化`/`性能`/`协作` 子树与 note。

`fixtures/comparison.sample.json`：

```json
{
  "id": "cmp_sample",
  "createdAt": "2026-11-13T00:00:00.000Z",
  "mapSignature": "…",
  "targetSignature": "…",
  "matches": [
    { "targetId": "t_html", "userNodeId": "u_html", "confidence": 0.95 },
    { "targetId": "t_react", "userNodeId": "u_react", "confidence": 0.9 }
  ],
  "gaps": [
    {
      "signature": "…",
      "targetId": "t_engineering",
      "suggestedParentId": "u_root",
      "topic": "工程化",
      "reason": "你的图里有模块化，但没有从构建到发布的链路。补上后能解释打包、热更新、测试与上线。",
      "selfCheck": ["能配置 Vite 的生产构建吗？", "能解释 content hash 的作用吗？"],
      "links": [{ "title": "Vite 官方文档", "url": "https://vite.dev/guide/" }],
      "priority": "high",
      "nodeCount": 4,
      "status": "pending"
    }
  ],
  "extras": [{ "userNodeId": "u_hooks", "reason": "目标体系未单独列出 Hooks，但它是 React 的一部分。" }],
  "stats": { "targetNodes": 16, "matchedNodes": 10, "gapNodes": 6, "coverage": 0.63 },
  "model": { "host": "api.example.com", "model": "example-model" }
}
```

`fixtures/comparison.invalid.json`：至少包含重复 targetId、未知 userNodeId、后代 gap、非法 priority、`javascript:` link、空 reason。

`fixtures/target-generation.sample.json`：`{ "title": "...", "root": { "topic": "...", "note": "...", "children": [] } }`。

---

## 附录 B：验收用例清单

1. 首跑：选模板 → 目标树出现 → 新建 3 个节点 → mock 对比 → 幽灵 + 建议面板 → 采纳 → 实节点插入、幽灵消失 → 刷新仍在。
2. 忽略：忽略一条 → 幽灵消失 → 重新对比不再出现 → 撤销恢复。
3. 错误：401/429/网络/超时/无效 JSON/截断 → 文案正确、旧结果保留、历史不写、Key 不泄漏。
4. 设置：预设切换、Base URL/模型可编辑、Key 显示/隐藏、测试连接成功/失败、清除 Key。
5. 目标：4 套模板加载；生成 mock 成功/失败/超限；大纲 parse/serialize；非法缩进报错；编辑目标后 stale。
6. 导出：Markdown 结构完整、链接标注未验证；JSON 导出/导入 round-trip；导入确认覆盖。
7. 分享：URL 编码/解码；只读页不可编辑；导入确认；12k 超限降级 JSON；损坏数据到 invalid 页。
8. 搜索：`Ctrl/Cmd+F`、防抖、↑/↓/Enter/Esc、无结果状态。
9. 暗色：切换、持久化、首帧不闪白；对比度。
10. 历史：10 条上限、详情、导出、清空确认、不含 Key。
11. 移动：375/320 顶栏搜索/对比/面板可见；底部面板打开/关闭；无页面横向滚动；触控 44px。
12. 导图：撤销/重做 50 步、折叠持久化、快捷键、400 节点性能、导出无 ghost。
13. a11y：键盘-only 完成对比/采纳/设置；焦点可见；axe 无 serious/critical。
14. 设计：token 无裸色值；8 态；无 `transition: all`；无 emoji 图标；无假外框；无假数据。
15. 发布：Pages 构建成功；README/LICENSE/隐私说明；无 Key；v0.1.0 tag。

---

## 附录 C：i18n key 命名空间与文案

所有 key 用 `namespace.camelCase`；`t(key, params)` 支持 `{count}`、`{name}` 插值。feature 文件与所有权对应：

```text
common.*      A0
map.*         A1
target.*      A2
compare.*     A3
suggest.*     A4
history.*     A4
share.*       A4
settings.*    A3
errors.*      A3（网络/模型）；A4（导入/分享）
```

最小 key 集：

```text
common.appName, common.tagline, common.search, common.settings, common.theme,
common.save, common.cancel, common.confirm, common.close, common.undo, common.retry,
common.savedAt, common.nodeCount, common.coverage, common.missing, common.covered

map.empty.title, map.empty.body, map.empty.generate, map.empty.blank, map.empty.import,
map.toolbar.addChild, map.toolbar.addSibling, map.toolbar.undo, map.toolbar.redo,
map.toolbar.fit, map.status.zoom, map.search.placeholder, map.search.empty

target.empty.title, target.empty.body, target.template.title, target.template.nodes,
target.generate.title, target.generate.domain, target.generate.goal, target.generate.level,
target.generate.horizon, target.generate.weeklyHours, target.generate.submit,
target.editor.title, target.editor.error, target.editor.save, target.editor.import,
target.detail.requirement, target.source.template, target.source.generated,
target.source.manual, target.source.imported

compare.button, compare.noTarget, compare.noKey, compare.running, compare.cancel,
compare.stale, compare.stale.action, compare.tooManyNodes, compare.partial

suggest.tab, suggest.coverageMeta, suggest.priority.high, suggest.priority.medium,
suggest.priority.low, suggest.adopt, suggest.ignore, suggest.locate, suggest.selected,
suggest.adoptSelected, suggest.ignoreSelected, suggest.empty.title, suggest.empty.body,
suggest.tag, suggest.nodeCount, suggest.selfCheckCount, suggest.linkCount,
suggest.unverifiedLinks

history.tab, history.recent, history.clear, history.clearConfirm, history.note,
history.export, history.adopted

share.banner, share.import, share.confirm, share.tooLong, share.invalid.title,
share.invalid.body, share.copy, share.copied

settings.title, settings.provider, settings.baseUrl, settings.model, settings.apiKey,
settings.showKey, settings.hideKey, settings.temperature, settings.maxTokens,
settings.jsonMode, settings.test, settings.testing, settings.testSuccess,
settings.testFail, settings.save, settings.security, settings.consent

errors.network, errors.auth, errors.notFound, errors.rateLimit, errors.server,
errors.timeout, errors.parse, errors.truncated, errors.empty, errors.importInvalid,
errors.shareInvalid
```

关键中文文案（en beta 同 key；英文用 curly quotes/em dash）：

| key | 文案 |
|---|---|
| `common.appName` | GraftOverview |
| `common.savedAt` | 已保存 {time} |
| `map.empty.title` | 先把你会的东西画出来 |
| `map.empty.body` | 从一个根节点开始，或者让 AI 按目标生成一份初稿，再删掉不会的。 |
| `map.empty.generate` | 从目标生成初稿 |
| `map.empty.blank` | 新建空白导图 |
| `map.empty.import` | 导入 Markdown 大纲 |
| `target.empty.title` | 还没有目标体系 |
| `target.empty.body` | 选一套模板，或让 AI 按你的目标生成一份。 |
| `compare.button` | 开始对比 |
| `compare.running` | 正在比对 {count} 个目标节点… |
| `compare.noTarget` | 先设置目标体系 |
| `compare.noKey` | 先配置模型 |
| `compare.stale` | 结果已过期 |
| `compare.tooManyNodes` | 节点过多，请先收缩到一个分支 |
| `suggest.coverageMeta` | 目标 {target} · 已覆盖 {covered} · 缺失 {missing} |
| `suggest.adopt` | 采纳 |
| `suggest.ignore` | 忽略 |
| `suggest.locate` | 定位 |
| `suggest.selected` | 已选 {count} 项 |
| `suggest.adoptSelected` | 采纳所选 |
| `suggest.ignoreSelected` | 忽略所选 |
| `suggest.unverifiedLinks` | AI 生成、未验证 |
| `history.recent` | 最近对比 |
| `history.note` | 只保留最近 10 次；历史记录不包含 API Key。 |
| `history.clear` | 清空历史 |
| `share.banner` | 只读分享 |
| `share.import` | 导入到我的工作区 |
| `share.confirm` | 导入将覆盖当前工作区，建议先导出备份。 |
| `share.tooLong` | 内容过长，已改为导出 JSON。 |
| `settings.security` | Key 只保存在本浏览器 localStorage；任何在本页运行的脚本都能读取。不要在公共电脑使用。 |
| `errors.network` | 无法连接模型服务。检查 Base URL、网络，或服务商是否允许浏览器跨域。也可以改用本地 Ollama。 |
| `errors.auth` | Key 无效或没有权限。检查 API Key 是否填对。 |
| `errors.rateLimit` | 请求被限流。等一会儿再试，或换一个模型。 |
| `errors.parse` | 模型返回的不是有效 JSON。已尝试修复一次。 |
| `errors.truncated` | 输出被截断。缩小目标范围，或换支持更长输出的模型。 |
| `errors.importInvalid` | 这个文件不是有效的 GraftOverview 工程文件。 |

文案规则：具体、主动语态、无感叹号、无「Oops」、无营销词；错误说清「什么/为什么/下一步」；空状态给一个动作。

---

## 附录 D：命名与目录速查

```text
src/
  main.ts
  App.svelte
  app.css
  lib/
    types.ts                 A0
    signature.ts             A0
    locate.ts                A0
    storage/                 A0
    state/                   A0
    i18n/                    A0 + feature files
    map/                     A1
    target/                  A2
    llm/                     A3
    compare/                 A3
    export/                  A4
    share/                   A4
  components/
    common/                  A0
    layout/                  A0
    canvas/                  A1
    target/                  A2
    settings/                A3
    suggestions/             A4
    history/                 A4
    share/                   A4
    panel/Panel.svelte       A0（壳）
  content/templates/         A2
tests/
  unit/                     各 owner
  e2e/                      A5
fixtures/                   A0/A3/A4
docs/
  contract-requests/        各 Agent
  qa-report.md              A5
  privacy.md                A0
```

命名：组件 PascalCase；模块 camelCase；类型 PascalCase；常量 UPPER_SNAKE；CSS 变量 kebab-case；i18n key namespace.camelCase；文件用 kebab-case（组件除外）。

---

## 最后一条

不确定时，回到 §1.4 的核心闭环：让用户看见缺口、理解缺口、决定补不补。任何不服务这个闭环的功能，都不属于 v0.1。



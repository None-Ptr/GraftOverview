# 集成契约速查 / Integration contract

> 编排 Agent（主 Agent）维护。`init.md` 是事实源；本文件只汇总 **M0 已落地的确切 API**，供 A1–A5 直接调用，避免各自猜接口。发现矛盾以 `init.md` 为准，并写 `docs/contract-requests/<agent>-<YYYYMMDD>.md`。

## 0. 环境与别名

- Node 24（要求 ≥22.12）、pnpm 10.13.1、Vite 8.3.8、Svelte 5.57、TS 5.9.3、Tailwind v4.3.5、mind-elixir 6.0.1、vitest 5.1、playwright 1.65。
- 路径别名：**`$lib/*` → `src/lib/*`**，**`$lib/components/*` → `src/components/*`**，**`$lib/content/*` → `src/content/*`**（`tsconfig.json` paths + `vite.config.ts` alias 均已配置；注意更具体的前缀必须排在 `$lib` 之前）。组件请用 `../common/X.svelte` 或 `$lib/components/common/X.svelte`；模板请用 `$lib/content/templates`。
- 字体：`src/main.ts` 只导入 8 个 latin 子集 css；CJK 用系统栈。
- 依赖已安装。**不要再跑 `pnpm install`**；不要并发跑 `pnpm build` / `pnpm lint`（会与别的 Agent 半成品互相干扰、争用 `dist/`）。可以跑 `pnpm vitest run <你的测试文件>`。全量 check/build/lint/test 由编排 Agent 在集成阶段统一跑。

## 1. 强制写法（Svelte 5 runes）

- 只用 `$state` / `$derived` / `$derived.by` / `$effect` / `$props` / `$bindable`；禁止 `export let`、`$:`、`writable/readable`、`createEventDispatcher`、`<slot>`。
- 事件用属性写法 `onclick` / `oninput`；通信用 callback props；插槽用 `{#snippet}` / `{@render}`。
- 所有组件 `lang="ts"`；公开 API 显式返回类型；**不得出现 `any`**；未知 JSON 先 `unknown` 再校验。
- 所有可见文案走 `t('key')`，不得硬编码中文；颜色/字体只用 `var(--token)`，不得出现裸色值或裸 `font-family`。
- 只用 `$lib/components/common/` 里的通用组件，不要另起一套。

## 2. A0 公开 API（只读 / 通过公开方法调用）

### `src/lib/types.ts`（冻结，只读）
§3.1 全部类型：`NodeId, Locale, ThemeMode, PanelTab, Priority, TargetSource, KnowledgeNode, KnowledgeMap, GoalSpec, TargetSystem, Match, GapSuggestion, ExtraNode, ComparisonStats, ComparisonResult, Workspace, StoredLlmSettings, HistoryEntry, SharePayload, GhostTree`，另加 `GapStatus`、`Link` 两个别名。

### `src/lib/signature.ts`
```ts
fnv1a(input: string): string
normalizeText(s: string, locale?: Locale): string
signatureTree(root: KnowledgeNode, locale?: Locale): SignatureNode
pathSignature(topics: string[], locale?: Locale): string
mapSignature(map: KnowledgeMap, locale?: Locale): string
targetSignature(target: TargetSystem, locale?: Locale): string
nodePathSignatures(root: KnowledgeNode, locale?: Locale): Map<NodeId, string>
```

### `src/lib/locate.ts`
```ts
GHOST_PREFIX: 'ghost-'
ghostId(targetId): NodeId           // 'ghost-' + targetId
isGhostId(id): boolean
stripGhostPrefix(id): NodeId
locateTarget(targetId, comparison, ghostTrees): { nodeId; kind: 'user'|'ghost' } | null
```
> 约定：幽灵节点 id 一律 `ghost-<原目标节点 id>`。A1 渲染/过滤、A4 构建都必须遵守。

### `src/lib/storage/index.ts`（`$lib/storage`）
```ts
STORAGE_KEYS, CURRENT_SCHEMA_VERSION
checkSchemaVersion(value): VersionCheck
loadWorkspace(): WorkspaceLoad   // 'ok' | 'empty' | {status:'corrupt'|'future-version', raw, version?}
saveWorkspace(ws), clearWorkspace(), readRawWorkspace(), createDefaultWorkspace(locale?, title?)
DEFAULT_LLM_SETTINGS, loadLlmSettings(), saveLlmSettings(s), clearLlmSettings(), hasApiKey(s)
HISTORY_LIMIT(10), loadHistory(), saveHistory(), pushHistory(entry): HistoryEntry[], clearHistory()
loadTheme(), saveTheme(mode)
loadConsent(), saveConsent(v)
```

### `src/lib/state/workspace.svelte.ts` — `workspaceStore`（单例，class + `$state`）
字段：`workspace`、`dataError`、`savedAt`（均 `$state`）。
方法：`load()`, `saveDebounced()`, `flush()`, `replaceMap(map)`, `setMapTitle(title)`, `setTarget(target|null)`, `setComparison(result|null)`, `updateGapStatus(signature, status)`, `setIgnored(signatures)`, `addIgnored(sig)`, `removeIgnored(sig)`, `setLocale(locale)`, `setPanelTab(tab)`, `importWorkspace(ws)`, `resetWorkspace()`, `exportRawData()`。
只读 getter：`map`, `target`, `comparison`, `ignoredSignatures`, `hasTarget`, `coverage`, `activeGaps`（**不含** ignored/adopted）。
> `replaceMap` / `setTarget` 会自动标记 `ui.stale = true`；`setComparison` 会清 stale。任何写操作必须走 store。

### `src/lib/state/ui.svelte.ts` — `ui`（单例）
字段（`PanelTab` 等）：`panelTab`, `panelOpen`, `settingsOpen`, `searchOpen`, `targetPickerOpen`, `targetGenerateOpen`, `outlineEditorOpen`, `outlineDraft`, `exportOpen`, `shareOpen`, `consentOpen`, `historyDetail`, `clearHistoryConfirm`, `importConfirm`, `shareImportConfirm`, `locateRequest`, `compareProgress`, `stale`, `mapCommand`, `compareRequested`。
方法：`requestLocate(nodeId)`, `sendMapCommand(kind, nodeId?)`, `startCompare(targetNodes)`, `stopCompare()`, `requestCompare()`, `markStale()`, `clearStale()`, `setPanelTab(tab)`。
> **A1 消费 `ui.mapCommand`**（`addChild|addSibling|undo|redo|fit|rename|remove`，带 `ts`）执行画布命令；A0 的工具条通过 `sendMapCommand` 发出。
> **A4 消费 `ui.compareRequested`**（同意弹窗 / `Ctrl+Enter` 置为时间戳）真正发起对比；期间用 `ui.startCompare/stopCompare`。

### `src/lib/state/theme.svelte.ts` — `theme`
`mode`, `resolved`, `init()`, `apply()`, `set(mode)`。
### `src/lib/state/toast.svelte.ts` — `toast`
`push(message, { tone?: 'info'|'error'|'success', duration?, action?: { label, run } })`, `error(msg, action?)`, `info(msg, action?)`, `dismiss(id)`。Toast 自动消失 4–6s，hover/focus 暂停，支持撤销动作。

### `src/lib/i18n/index.ts`
```ts
t(key: MessageKey, params?: Record<string, string|number>): string
currentLocale(): Locale
setLocale(locale): void
MessageKey  // 由 zh 的 key 推导；en 用 Record<MessageKey,string> 做编译期 key 校验
```
feature 消息文件已 **全部填好 zh/en**（`common/map/target/compare/settings/errors/suggest/history/share`）。需要新增 key 时**只改自己 namespace 的文件**，且 zh/en 必须同时加，否则 `check` 报错。缺失 key 在 dev 报 console.error、生产回退 zh。

### `src/lib/router.ts`
`parseHash`, `currentRoute()`, `navigate(path)`, `goWorkspace()`, `onRouteChange(cb)`；`Route = {kind:'workspace'} | {kind:'share', data} | {kind:'share-invalid'}`。

### 通用组件 `$lib/components/common/`
| 组件 | 关键 props |
|---|---|
| `Icon.svelte` | `name: IconName`, `size?`, `label?`；图标名见 `common/icons.ts`（32 个，18px stroke） |
| `Button.svelte` | `variant?: 'primary'|'ghost'|'small'|'icon'`, `disabled?`, `loading?`, `tone?: 'default'|'error'|'success'`, `full?`, `onclick?`, `children` snippet |
| `IconButton.svelte` | `icon`, `label`(必填), `disabled?`, `active?`, `onclick?` |
| `Input.svelte` | `value = $bindable('')`, `type?`, `label?`, `placeholder?`, `help?`, `error?`, `disabled?`, `min/max/step?`, `id?`, `oninput/onchange/onblur?` |
| `Textarea.svelte` | `value = $bindable('')`, `label?`, `rows?`, `mono?`, `placeholder?`, `help?`, `error?` |
| `Select.svelte` | `value = $bindable('')`, `options: {value,label}[]`, `label?`, `help?`, `error?`, `onchange?` |
| `Dialog.svelte` | `open = $bindable(false)`, `title`, `onClose?`, `children`/`footer` snippets；原生 `<dialog>` + showModal，Esc/背板/关闭按钮都能关 |
| `Tabs.svelte` | `tabs: {id,label}[]`, `active = $bindable()`, `onchange?`；支持 ←/→/Home/End |
| `Tag.svelte` | `tone?: 'neutral'|'gap'|'matched'|'accent'`, `children` |
| `EmptyState.svelte` | `title`, `body?`, `hint?`, `compact?`, `actions?` snippet |
| `Spinner.svelte` | `size?`, `label?` |
| `ToastStack.svelte` | 无 props，已在 `App.svelte` 挂载 |

### 布局（A0 所有，其他 Agent 只读）
`App.svelte`（路由 + 全局 Esc/Ctrl+F/Ctrl+Enter + 所有弹窗挂载）、`layout/TopBar.svelte`、`layout/Panel.svelte`、`layout/CanvasShell.svelte`、`layout/SearchPopover.svelte`、`layout/ConsentDialog.svelte`、`layout/DataRecovery.svelte`。

## 3. 必须替换的占位文件（A0 已建骨架 + 精确 props）

> 这些文件目前是 **A0 占位实现**，保证 M0 可编译。Owner 必须用自己的完整实现**整文件替换**，并**保持下列 props/导出名不变**（App/CanvasShell/TopBar 已按此调用）。

### A1（`src/components/canvas/`、`src/lib/map/`）
- `MapCanvas.svelte` — props: `map`, `ghostTrees`, `selectedNodeId`, `locateRequest`, `onMapChange(map, {source:'editor'|'undo'})`, `onSelect(nodeId|null)`, `onGhostAdopt(signature)`, `onZoomChange?(percent)`。
- `CanvasToolbar.svelte` — props: `canUndo?`, `canRedo?`（内部调用 `ui.sendMapCommand`）。
- `src/lib/map/search.ts` — 已实现 `searchNodes(map, query): SearchResult[]`（NFKC + 大小写不敏感 + path），可增强但保留导出名。

### A2（`src/components/target/`、`src/content/templates/`、`src/lib/target/`）
- `TargetPane.svelte`、`TargetPickerDialog.svelte`、`TargetGenerateDialog.svelte`、`TargetOutlineEditor.svelte` — 后三者 props 均为 `open = $bindable(false)`。
- 生成弹窗调用 A3 的 `generateTarget()`；确认后 `workspaceStore.setTarget(...)`（**先预览再写入**）。

### A3（`src/components/settings/`、`src/lib/llm/`、`src/lib/compare/`、`src/lib/state/llm.svelte.ts`）
- `SettingsDialog.svelte` — props `open = $bindable(false)`。

### A4（`src/components/suggestions|history|share/`、`src/lib/compare/apply.ts`、`src/lib/export/`、`src/lib/share/`）
- `SuggestionsPane.svelte`, `CompareButton.svelte`, `ProgressOverlay.svelte`, `ExportDialog.svelte`, `HistoryPane.svelte`, `ShareDialog.svelte` — 弹窗类 props `open = $bindable(false)`；`CompareButton`/`SuggestionsPane`/`ProgressOverlay`/`HistoryPane` 无必填 props。
- `SharePreview.svelte` — props `data?: string | null`, `invalid?: boolean`（App 在 `#/share` 传原始 `d` 参数）。
- `src/lib/compare/apply.ts` — **必须保留导出**：`buildGhostTrees(target, gaps, ignored): GhostTree[]`、`adoptGap(signature): void`、`ignoreGap(signature): void`（App 直接 import）。

## 4. 跨 Agent 函数签名（A3 实现 / A4 调用，务必一致）

```ts
// src/lib/compare/run.ts (A3)
export function generateTarget(
  goal: GoalSpec,
  settings: StoredLlmSettings,
  signal?: AbortSignal,
): Promise<{ title: string; root: KnowledgeNode }>;   // 不带 id，客户端分配 nanoid(8)

export function runComparison(
  map: KnowledgeMap,
  target: TargetSystem,
  settings: StoredLlmSettings,
  locale: Locale,
  ignoredSignatures: string[],
  signal?: AbortSignal,
): Promise<ComparisonResult>;                          // 失败抛 LlmError，保留旧结果

// src/lib/llm/client.ts (A3)
export class LlmError extends Error { code: ErrorCode }  // 见 §4.6 映射
export function testConnection(settings, signal?): Promise<void>
```

A4 的对比流程：`loadConsent()` 为 false 时置 `ui.consentOpen = true`；同意后 A0 的 `ConsentDialog` 会 `ui.requestCompare()`。A4 监听 `ui.compareRequested` → `loadLlmSettings()` → `workspaceStore.hasTarget` 检查 → `ui.startCompare(count)` → `runComparison(...)` → 成功 `workspaceStore.setComparison(result)` + `pushHistory(...)` + `workspaceStore.setPanelTab('suggestions')`；失败 `toast.error(t(errors.*))` 且**不写历史、不改本地数据**；`finish_reason==='length'` 视为截断失败。

## 5. 编排裁决（解决 init.md 内部矛盾）

- **§6.5 把 `src/lib/compare/apply.ts` 分给 A4，§7.3 把 `src/lib/compare/**` 分给 A3**：裁决 → `apply.ts` 归 **A4**，A3 不得改动；A3 拥有 `src/lib/compare/` 下其余文件（`serialize.ts`, `prompt.ts`, `schema.ts`, `signature.ts`, `run.ts`）。
- `src/lib/map/search.ts` 由 A0 预填实现（NFKC 搜索），A1 可在自己目录内增强。
- 工具条渲染放在 A0 的 `CanvasShell`，命令经 `ui.mapCommand` 传给 A1，避免 A0 直接依赖 A1 内部实例。
- 全局快捷键 `Tab/Enter/F2/Delete/↑↓←→/Ctrl+Z` 由 A1 在画布内处理；`Ctrl/Cmd+F`、`Esc`、`Ctrl/Cmd+Enter` 由 A0 处理。

## 6. 验收命令（编排 Agent 统一执行）

```bash
pnpm check   # 零错误零警告
pnpm lint
pnpm test
pnpm build
pnpm test:e2e   # A5
```

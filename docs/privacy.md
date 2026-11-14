# 隐私说明 / Privacy

GraftOverview 是纯静态前端应用，没有后端、没有账号、没有服务器、没有遥测、不加载第三方脚本。

## 数据存在哪里

| 数据 | 位置 | 说明 |
|---|---|---|
| 工作区（导图、目标体系、对比结果、忽略项、UI 偏好） | 本机 `localStorage['graft.workspace.v1']` | 自动保存，500ms 防抖 |
| LLM 设置（含 API Key） | 本机 `localStorage['graft.llm.v1']` | 只在设置弹窗读写 |
| 对比历史 | 本机 `localStorage['graft.history.v1']` | 最多 10 条 |
| 主题 | 本机 `localStorage['graft.theme']` | — |
| 数据出境确认 | 本机 `localStorage['graft.consent.v1']` | 仅一个布尔值 |

字体自托管，中文使用系统字体栈；没有向 Google Fonts 或任何 CDN 发起请求。

## 什么时候数据会离开浏览器

**只有点击「开始对比」或「生成目标体系」时**，你的导图节点标题、目标体系节点标题与说明会以 JSON 形式发送给你在设置里配置的模型服务商（`POST {baseUrl}/chat/completions`）。首次对比前会明确提示一次。

- 请求由浏览器直接发出，经过你配置的服务商；本应用没有中间服务器。
- 不自动重试（避免重复计费）；失败后由你决定是否重试。
- 用户节点的 note 不发送；目标 note 会截断到 60 字。

## API Key

- 只存 `graft.llm.v1`，只作为 `Authorization: Bearer` 头使用。
- **绝不**进入工作区、导出 JSON、分享链接、Markdown 报告、对比历史、URL 或 console 日志。
- 错误信息会脱敏，不包含完整 Key 或完整 baseUrl 查询串。
- 可在设置中一键清除。
- 注意：任何在本页运行的脚本都能读取 localStorage 中的 Key，因此不要在公共电脑上使用。

## 分享链接

只读分享链接（`#/share?d=...`）用 lz-string 压缩，只包含导图与目标体系，**不包含**对比结果、历史、忽略项或 API Key。分享页在用户确认「导入到我的工作区」之前不写任何 localStorage。链接超过 12,000 字符时会改为导出 JSON，不静默截断。

## 清除数据

在设置中可清除 API Key；工作区损坏时提供「导出原始数据」与「重置工作区」（需确认）。也可以用浏览器开发者工具删除 `graft.*` 开头的 localStorage 键。

## Privacy (English summary)

GraftOverview is a static front-end app with no backend, account, server, telemetry, or third-party scripts. All data lives in your browser's localStorage. Your map and target titles/notes are sent **only** to the model provider you configure, and only when you explicitly run a comparison or generation. The API key stays in localStorage and is never included in exports, share links, history, or logs. Share links contain only the map and target system. Fonts are self-hosted.

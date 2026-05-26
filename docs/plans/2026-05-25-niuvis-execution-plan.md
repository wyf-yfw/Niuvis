# Niuvis 桌面 AI 助手执行计划

> 配套文档：[`2026-05-25-niuvis-desktop-ai-assistant-roadmap.md`](./2026-05-25-niuvis-desktop-ai-assistant-roadmap.md)（北极星，定义“做什么 / 为什么”）
>
> 本文档定义：**怎么做、做到什么样、何时算完成**。所有任务以可勾选条目列出，每条都配实现要点（Implementation）与完成判定（DoD = Definition of Done）。

---

## 0. 现状盘点（Snapshot, 2026-05-25）

### 已具备
- Electron + React 19 + Vite + TS + HeroUI v3 + Tailwind 4 已跑通。
- 侧边栏 8 个页面（办公室 / 对话 / 自动任务 / 技能 / 应用 / 文档 / 图库 / 此电脑），整体深色风格。
- 已实现的主进程能力：
  - `installedApps`：Linux `.desktop` 解析 + 图标解析 + 缓存（Win/Mac 入口已留）。
  - `localLibrary`：文档/图库上传到 `userData/library`，索引到 `index.json`。
  - `fileBrowser`：根目录与目录列出。
  - `chatService`：OpenAI 兼容 `/chat/completions` 单轮直连。
  - `settingsStore`：模型配置持久化（API Key / BaseURL / Model）。
- `preload.cjs` 暴露 4 个命名空间：`niuvisApps / niuvisLibrary / niuvisComputer / niuvisChat / niuvisSettings`。
- 主进程模块已有单元测试（`*.test.js`）。

### 关键差距
- 主入口仍是根目录 `main.js`，未迁到 `src/main/index.ts`；IPC channel 散落在入口里。
- 无 SQLite、无 FTS、无向量索引；所有数据靠 JSON / 缓存文件。
- 无 Agent 编排，无工具调用，无流式输出；Chat 是单轮直连。
- 无审计日志、无危险动作确认、无回滚机制。
- 跨平台 adapter 不完整（Linux 偏完整，Win/Mac 仅占位）。
- 任务页 / 技能页 / 办公室页是静态 mock；对话页不会持久化历史。

---

## 1. 顶层目标（不变）

1. **AI 能知道电脑里有什么**——通过分级索引（元数据 → 文本 → 向量）和搜索接口。
2. **AI 能在分级权限下操作电脑**——通过白名单工具 + 风险分级 + 确认弹窗 + 审计日志。
3. **本地优先**——离线也能搜索、浏览、启动应用、查历史；模型 API 由用户配置自行直连。
4. **同等覆盖 Linux / Windows / macOS**。

任何阶段交付的功能都必须服务这四个目标，**任一目标弱化都视为未完成**。

---

## 2. 阶段路线总览

| 阶段 | 名称 | 关键产出 | 预估范围 |
|------|------|----------|----------|
| P0 | 基础架构对齐 | 主进程 TS 化、IPC 集中、共享类型、SQLite 接入 | 1 周 |
| P1 | 数据与设置中心 | 数据库 schema、设置中心 v2（模型/索引/权限/保留策略） | 1 周 |
| P2 | 电脑知识 v1 | 应用/文件/文档索引 + FTS 搜索 + 此电脑接入 | 2 周 |
| P3 | 工具层与安全运行时 | Tool Registry、风险分级、确认弹窗、审计日志 | 1.5 周 |
| P4 | Agent Chat v1 | 工具调用对话、流式、多会话持久化 | 2 周 |
| P5 | 子 Agent 与记忆 | File/App/System/Search/Memory Agent + 长期记忆 | 1.5 周 |
| P6 | 跨平台适配 | Win 注册表/快捷方式、Mac `.app`/Spotlight 适配 | 1 周 |
| P7 | 任务与可视化 | 任务页、办公室 Agent 工作台、技能页自动渲染 | 1 周 |
| P8 | 产品化收尾 | Onboarding、错误体验、文档、打包发版 | 1 周 |

> 每个阶段独立可发布；当前所有功能仍可用，但能力分级递增。

---

## 3. P0 · 基础架构对齐

> **状态：已完成（2026-05-25）** — 入口 `main.js` → `dist/main/index.js`，IPC 集中注册，共享类型，`niuvis.db` + 迁移 `001_initial.sql`。

### F0.1 主进程 TypeScript 化
- **实现要点**
  - 新增 `src/main/index.ts` 作为新入口，复刻 `main.js` 行为；`package.json#main` 改为 `dist/main/index.js`，开发用 tsx/`tsc --watch` 编译。
  - `tsconfig.json` 拆为 `tsconfig.renderer.json` 与 `tsconfig.main.json`，主进程 target ES2022 + ESM。
  - 现有 `*.js` 模块按需逐步改名为 `.ts`，保留旧 `main.js` 作为回退入口直到 P1 结束删除。
- **DoD**
  - `npm run dev` 用新入口启动应用，所有现有功能（应用列表、文档/图库、此电脑、对话、设置）无回归。
  - `npm run build` 同时构建主进程与渲染进程。
  - 至少 1 个主进程 `.ts` 文件（建议 `src/main/index.ts`）跑通编译。

### F0.2 集中式 IPC 层
- **实现要点**
  - 新增 `src/main/ipc/registerIpc.ts`，按域聚合：`apps.ts / library.ts / computer.ts / chat.ts / settings.ts`。
  - 每个 handler 都返回 `{ ok: true, data } | { ok: false, error: { code, message } }` 的统一信封；preload 解包后再抛给 renderer。
  - 渲染端 `window.niuvis*` 接口的类型从 `src/shared/types/ipc.ts` 单一来源声明。
- **DoD**
  - `src/main/index.ts` 内无任何 `ipcMain.handle(...)` 调用，全部在 `ipc/` 注册。
  - 现有 5 个渲染页面（应用 / 文档 / 图库 / 此电脑 / 对话）无回归。
  - 故意造一个错误（如打开不存在路径）能在前端拿到结构化错误并展示。

### F0.3 共享类型与常量
- **实现要点**
  - 新增 `src/shared/types/{chat,agent,index,permission,settings,ipc}.ts`，主进程与渲染进程都从这里导入。
  - `src/shared/constants/channels.ts` 集中所有 IPC channel 名。
  - 替换 `src/renderer/types/niuvis.d.ts` 内的本地接口为 re-export。
- **DoD**
  - `Grep "ipcRenderer.invoke\('[a-z:]+'"` 找到的 channel 名全部来自 `channels.ts`。
  - 渲染端无 `any` 关键 IPC 调用类型。

### F0.4 引入 SQLite
- **实现要点**
  - 依赖：`better-sqlite3`（同步、易用、Electron 兼容好），用 `electron-rebuild` / `@electron/rebuild` 处理原生模块。
  - `src/main/services/database/index.ts` 暴露 `getDb()` 单例，DB 文件位于 `app.getPath('userData') + '/niuvis.db'`。
  - 迁移系统：`src/main/services/database/migrations/*.sql`，启动时按版本顺序执行；`PRAGMA user_version` 控制版本。
- **DoD**
  - 启动应用后能看到 `niuvis.db` 生成；删除后再启动会重新创建。
  - 单测：迁移系统在临时 DB 上能跑通 v0 → 最新版。

---

## 4. P1 · 数据与设置中心

> **状态：已完成（2026-05-25）** — Schema v1 迁移、设置写入 SQLite、设置中心三 Tab、测试连接、JSON 设置迁移。

### F1.1 数据库 Schema v1
- **实现要点** — 在 P0 的迁移目录下新增表：
  - `conversations(id, title, created_at, updated_at, model, pinned)`
  - `messages(id, conversation_id, role, content, tool_call_id, created_at)`
  - `agent_runs(id, conversation_id, user_request, status, started_at, finished_at)`
  - `tool_calls(id, agent_run_id, tool_name, input_json, risk_level, requires_confirmation, status, result_json, started_at, finished_at)`
  - `audit_logs(id, action, tool_call_id, affected_paths_json, approved_by_user, result, error, created_at)`
  - `computer_index_items(id, kind, name, path, mime, size, modified_at, source, permissions_json, content_hash)`
  - `computer_index_fts`（FTS5 虚拟表，映射到 `name / path / content_snippet`）
  - `permissions(id, scope, allowed_paths_json, denied_paths_json, risk_rules_json, created_at)`
  - `memories(id, kind, key, value_json, created_at, updated_at)`
  - `settings(key PRIMARY KEY, value_json)`（替代当前 `settings.json`）
- **DoD**
  - `sqlite3 niuvis.db .schema` 能看到全部表与索引；FTS5 表可执行 `SELECT * FROM computer_index_fts WHERE computer_index_fts MATCH 'xxx'`。
  - 单测覆盖：`computer_index_items` 插入/更新/按 `path` upsert；FTS 触发器同步内容。

### F1.2 设置中心 v2
- **实现要点**
  - 现有 `SettingsModal` 升级为 **设置侧抽屉**，含三个 Tab：`模型`、`索引与权限`、`历史与备份`。
  - 模型 Tab：
    - 支持多 Provider 预设（OpenAI / DeepSeek / 通义 / Anthropic / Ollama / Custom），自动填默认 BaseURL。
    - 每个 Provider 可保存多个模型；当前激活模型用单选切换。
    - 「测试连接」按钮：调用 `/models` 或 `/chat/completions` 最小请求，显示通过/失败。
  - 索引与权限 Tab：
    - 选择索引根目录列表（默认仅家目录），可加入排除列表。
    - 危险动作策略：哪些动作必须确认（默认：删除/移动/覆盖/执行命令/访问敏感目录）。
  - 历史与备份 Tab：
    - 会话保留时长、审计日志保留时长、备份目录路径、一键清理。
- **DoD**
  - 切换 Provider 后所有字段联动；保存后下次启动仍生效。
  - 「测试连接」对错误的 Key/URL 给出明确报错（401 / 网络 / 模型不存在）。
  - 索引根目录调整后，下次扫描会读到新的范围（依赖 P2 索引器）。

### F1.3 钥匙串可选（可延后到 P8）
- **实现要点**：用 `safeStorage` 加密 API Key 后再写入 `settings` 表。
- **DoD**：`niuvis.db` 中 `value_json` 不出现明文 Key；切换用户账号无法解密。

---

## 5. P2 · 电脑知识 v1

> **状态：已完成（2026-05-25）** — 索引器 + FTS/LIKE 搜索 + 此电脑仅索引浏览 + 文档/图库双视图 + 应用页索引优先；实时监听默认关闭（设置可开）。
>
> 目标：用户能问“电脑里有哪些 Python 项目 / 最近修改的 PDF / 我装了哪些办公软件”，AI 能基于本地索引回答，并给出可点击的引用。

### F2.1 索引服务骨架
- **实现要点**
  - 新增 `src/main/services/indexer/`：
    - `index.ts`：调度入口，按 kind 分发到子 indexer。
    - `apps.ts`：复用 `installedApps`，写入 `computer_index_items(kind='app')`，含 icon path、command。
    - `files.ts`：扫描授权目录的元数据；用 `chokidar` watcher 做增量。
    - `documents.ts`：对 txt/md/pdf/docx 抽取首 N KB 文本，写入 `content_snippet`。
  - 排除策略：`node_modules / .git / .cache / .venv / 浏览器密码库 / SSH 私钥 / Keychain`。
- **DoD**
  - 首次 `index:start` 调度后，DB 能看到 `kind='app'` 记录数 = 已识别应用数；`kind='file'` 数量稳定（重复运行无重复增长）。
  - watcher 在监控目录里新建/重命名/删除文件 1s 内 DB 同步。

### F2.2 FTS 搜索接口
- **实现要点**
  - IPC：`index:search({ query, kind?, limit, offset })` → 返回 `{ items, total, took_ms }`，按 BM25 排序。
  - 关键词高亮（FTS5 `snippet()`），返回 `<mark>` 包裹片段。
  - 路径模糊匹配：当 query 含 `/` 或 `\` 时退化为路径前缀+包含查询。
- **DoD**
  - 在 10w 行模拟数据上，单次搜索 P95 < 50ms。
  - 中文/混合检索可用（默认 unicode61 tokenizer + 自定义 trigram 兜底）。

### F2.3 「此电脑」与 / 应用 / 文档 / 图库 接入索引
- **实现要点**
  - 「此电脑」页顶部加搜索框（HeroUI `SearchField`），实时调用 `index:search`，结果按 `应用 / 文件 / 文档 / 图片` 分组。
  - 「应用」「文档」「图库」页改为从索引读取（数据库 fallback：若索引未就绪，沿用现有 JSON）。
  - 索引状态 Chip：右上角显示 `已索引 X 项 · 最近扫描 yy-mm-dd hh:mm`，点击触发 `index:start`。
- **DoD**
  - 在搜索框敲 3 个字符即可看到分组结果；按回车跳到对应分组的完整页面。
  - 关闭应用再打开，索引数量与扫描时间持久化。

### F2.4 验收场景
- 输入 “最近修改的 markdown 文件”、“桌面上的 PDF”、“VS Code 在哪” 全部能命中并给出可点击的来源条目。

---

## 6. P3 · 工具层与安全运行时

> **状态：已完成（2026-05-26）** — Tool Registry（13 个工具）、安全运行时、审计日志、IPC、技能页自动渲染、对话页确认卡片。
>
> 目标：把所有 Agent 能做的事**结构化**为工具；危险动作有确认；操作可审计。

### F3.1 Tool Registry
- **实现要点**
  - `src/main/agents/tools/` 每个工具一个文件：
    ```ts
    export const searchFilesTool: Tool = {
      name: 'search_files',
      description: '在已索引的电脑文件中搜索',
      input: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      riskLevel: 'low',
      requiresConfirmation: false,
      preview: (input) => ({ summary: `搜索：${input.query}` }),
      execute: async (input, ctx) => { ... },
    }
    ```
  - 工具集合在 `src/main/agents/tools/index.ts` 集中注册并校验 schema（用 `zod` 或 `ajv`）。
  - 风险分级：
    - `low`：搜索、列目录、读取元数据、读取应用列表、打开普通文件、启动应用。
    - `medium`：读取整段文本、创建/重命名/移动/复制文件、批量整理。
    - `high`：删除、覆盖、执行命令、访问敏感目录、修改系统设置、安装软件。
  - 工具产出的 `result` 必须可序列化、必须有 `summary` 字段。
- **DoD**
  - `tools:list` IPC 返回所有工具及风险等级；UI（技能页）能基于这个列表渲染。
  - 单测：每个工具的 input schema 错误输入都被拒绝；执行结果都有 summary。

### F3.2 P3 必交付工具清单
| 名称 | 风险 | 说明 |
|------|------|------|
| `search_files` | low | FTS 搜索 |
| `list_directory` | low | 列目录（沿用 fileBrowser） |
| `read_file` | low/medium | <=64KB 直读；超出走 medium 文本抽取 |
| `get_file_meta` | low | size/mtime/mime |
| `open_path` | low | 调 `shell.openPath` |
| `launch_app` | low | 调 `installedApps.openInstalledApp` |
| `get_system_info` | low | 平台、CPU、内存、磁盘剩余 |
| `web_search` | low | 走用户配置的搜索后端（可选默认空，仅留接口） |
| `create_file` | medium | 写入新文件；不允许覆盖现有 |
| `rename_file` | medium | mv，不跨敏感目录 |
| `move_file` | medium | mv |
| `copy_file` | medium | cp |
| `delete_file` | high | 走系统回收站（`trash`/`@electron/trash`），不允许 hard delete |

> 不在表内的动作（如 `exec`、`installPackage`）**本阶段禁止实现**。

### F3.3 安全运行时
- **实现要点**
  - 新增 `src/main/agents/runtime.ts`，调用工具前：
    1. 输入 schema 校验。
    2. 路径 / 命令落到权限策略（`permissions` 表 + 默认黑名单）。
    3. 计算 `preview`：影响路径列表、字节数、是否可回滚。
    4. 若 `requiresConfirmation` 或路径命中确认规则：写入 `tool_calls` 状态 `awaiting_approval`，通过 `agent:stream` 推送确认请求。
    5. 用户 `agent:approve` 后才执行；`agent:reject` 则取消。
  - 所有工具调用结束都写 `audit_logs`，含影响路径、是否确认、结果、耗时。
  - 删除走回收站；覆盖前必须备份到 `userData/backups/yyyymmdd-hhmmss/...`。
- **DoD**
  - 跑一次「删除某测试文件」的工具：UI 弹出确认卡片，确认后文件进入系统回收站；`audit_logs` 出现 1 条记录。
  - 跑一次「列家目录」：无确认；`audit_logs` 仍有记录但 `approved_by_user = null`。

### F3.4 HeroUI 确认弹窗
- **实现要点**
  - 新组件 `src/renderer/components/confirm/ToolConfirmCard.tsx`，对话流中以卡片形式插入，含：
    - 工具名 + 风险级别 chip。
    - 影响范围列表（可滚动）。
    - 「查看 diff / 预览」（创建/写入显示生成内容前 200 字符）。
    - 确认 / 拒绝 / 取消三按钮，确认前可勾选「下次同类自动确认 X 分钟」。
- **DoD**
  - 一个动作触发的弹窗在 Chat 流中可见；拒绝后流自然结束并显示「已取消」。

---

## 7. P4 · Agent Chat v1

> **状态：已完成（2026-05-26）** — `orchestrator` 多轮工具编排 + `agent:stream` 流式；会话 SQLite 持久化 + 侧栏列表；ChatPage 全 HeroUI（会话栏、消息气泡、工具步骤卡、引用 Modal、Composer）；OpenAI Chat/Responses 双模式 + JSON plan 降级。

> 目标：Chat 从单轮直连升级为「**多轮 + 工具调用 + 流式 + 引用 + 持久化**」。

### F4.1 流式输出
- **实现要点**
  - `chatService` 用 `fetch` 的 ReadableStream 拿 SSE，逐 `delta` 通过 `agent:stream` 推给前端。
  - 渲染端 `ChatPage` 用累加 `setMessages`；提供「停止生成」按钮（`AbortController`）。
- **DoD**
  - 文字逐字出现；点击停止能立即终止输出；网络断开有兜底提示。

### F4.2 工具调用编排
- **实现要点**
  - 新增 `src/main/agents/orchestrator.ts`，主循环：
    ```
    while (not finished):
      request = build_request(history, tools)
      response = call_model(stream)
      if response.tool_calls:
        for tc in tool_calls:
          run via runtime (with confirm if needed)
          append tool result to history
      else:
        append assistant message, finish
    ```
  - 优先使用 OpenAI `tools` / Anthropic `tool_use` 原生协议。
  - 不支持工具调用的模型（如某些 Ollama 模型）：降级 JSON plan：
    - System prompt 注入工具说明 + 输出 JSON 协议；本地解析 `<tool>{ ... }</tool>` 块执行。
- **DoD**
  - 用 OpenAI gpt-4o-mini 跑「帮我搜一下 Python 项目」能自动调用 `search_files` 并把结果引用到回答。
  - 用 Ollama qwen2.5（无 tools）能走 JSON plan 完成同任务。
  - 工具调用步骤在 UI 中以可折叠卡片展示（工具名、输入、耗时、结果摘要）。

### F4.3 引用与上下文
- **实现要点**
  - 模型回答里引用文件时，主进程在 `messages.tool_call_id` 关联到 `tool_calls`，前端能渲染出可点击的「[1] /path/to/file.md」。
  - 点击引用：在右侧抽屉打开文件预览（文本/图片/PDF 首页缩略）。
- **DoD**
  - 一条带 3 个引用的回答，3 个引用全部可点击；预览面板与 Chat 同步滚动。

### F4.4 会话与消息持久化
- **实现要点**
  - 启动应用自动恢复最近 N 条会话；侧边栏对话页加 **会话列表** 子栏。
  - 新建会话、重命名、删除、置顶、按标题搜索（FTS）。
  - 上下文窗口控制：超长会话用截断 + 摘要（先 token 计数兜底；后续做 RAG）。
- **DoD**
  - 关掉应用再打开，最近会话还在；切换会话流畅（<200ms）。

### F4.5 ChatPage 视觉整合
- **实现要点**
  - 替换当前简易 `ChatPage`，复用 `ChatArea.tsx` 风格但改为深色主题；保持 `OfficePage` 占位。
  - 顶栏显示：当前模型、Provider chip、上下文 token 估算、清空/导出按钮。
  - 输入框支持 **附加文件作为上下文**（drag-in / 选择 / 从图库选）。
- **DoD**
  - 视觉一致；附加文件后能在 system prompt 中看到引用并被模型使用。

---

## 8. P5 · 子 Agent 与记忆

### F5.1 子 Agent 划分
- **实现要点**
  - `src/main/agents/orchestrator/index.ts`
    - 职责：总控、意图识别、任务拆解、选择子 Agent、汇总结果。
    - 输入：用户消息、当前会话、可用工具列表、检索到的电脑上下文。
    - 输出：`AgentRun` steps、子 Agent 调用、最终回复。
    - 限制：不直接读写文件、不直接启动应用、不直接执行系统操作。
  - `src/main/agents/knowledge/index.ts`
    - 职责：回答“电脑里有什么”，从 SQLite / FTS / vector 中检索应用、文件、文档、图库和历史任务。
    - 工具：`search_computer_index`、`search_documents`、`search_recent_items`、`get_index_item_detail`。
    - 输出：带来源引用的候选结果，供 Chat 引用或交给 FileAgent/AppAgent 继续执行。
  - `src/main/agents/file/index.ts`
    - 职责：文件和目录操作。
    - 工具：`list_directory`、`open_file`、`read_file_text`、`create_folder`、`create_file`、`rename_file`、`copy_file`、`move_file`、`delete_file_to_trash`。
    - 风险：读取元数据低风险；创建/移动/复制中风险；删除/覆盖高风险。
  - `src/main/agents/app/index.ts`
    - 职责：应用发现、启动和最近使用记录。
    - 工具：`search_apps`、`open_app`、`refresh_apps_cache`、`get_recent_apps`。
    - 风险：启动普通应用低风险；启动带参数、安装器、终端类应用中高风险。
  - `src/main/agents/system/index.ts`
    - 职责：系统状态读取和安全建议。
    - 工具：`get_system_info`、`get_disk_usage`、`list_processes`、`get_network_status`。
    - 风险：只读信息低风险；结束进程、修改系统设置、清理磁盘后续版本才做，必须高风险确认。
  - `src/main/agents/browser/index.ts`
    - 职责：网页搜索、打开网页、网页摘要。
    - 工具：`web_search`、`open_url`、`summarize_url`。
    - 风险：搜索和打开网页低风险；表单填写、下载文件、账号相关操作后续版本才做，必须确认。
  - `src/main/agents/memory/index.ts`
    - 职责：长期记忆和用户偏好。
    - 工具：`save_memory`、`search_memory`、`forget_memory`、`list_memories`。
    - 记忆类型：`preference`、`shortcut`、`project`、`fact`、`workflow`。
  - `src/main/agents/task/index.ts`
    - 职责：长任务、后台任务、待确认动作、失败重试。
    - 工具：`create_task`、`update_task_status`、`list_tasks`、`retry_task`、`cancel_task`。
    - 输出：任务页和办公室页可直接渲染的任务状态。
  - `src/main/agents/safety/index.ts`
    - 职责：所有工具调用前的风险判断、权限检查、确认请求生成。
    - 工具：`evaluate_tool_call`、`request_approval`、`record_audit_log`。
    - 限制：模型不能绕过 SafetyAgent；所有文件/应用/系统动作都必须先经过它。
  - 每个 Agent 暴露统一接口：
    ```ts
    export interface NiuvisAgent {
      id: string
      name: string
      description: string
      tools: ToolDefinition[]
      buildSystemPrompt(context: AgentContext): string
      run(input: AgentInput): Promise<AgentStepResult>
    }
    ```
  - Orchestrator 不直接调底层工具，而是根据意图把控制权交给子 Agent；子 Agent 选择工具，SafetyAgent 负责执行前审核。
  - 每个子 Agent 在 `agent_runs` 表中有独立 step；办公室页按 step 展示“哪个 Agent 正在干什么”。
- **DoD**
  - 用户问「整理桌面上的 PDF 文档」时，Orchestrator → FileAgent → 调 `search_files` + `list_directory` + 建议性 `move_file`。
  - 用户问「我电脑里有哪些 Python 项目」时，Orchestrator → KnowledgeAgent → 返回带路径来源的结果。
  - 用户说「打开 VS Code」时，Orchestrator → AppAgent → SafetyAgent → `open_app`。
  - 办公室页能显示参与过本次任务的 Agent 列表、当前状态、工具调用详情。

### F5.2 长期记忆
- **实现要点**
  - `memories` 表分 kind：`preference / shortcut / project / fact`。
  - MemoryAgent 工具：`save_memory / search_memory / forget_memory`。
  - 每次对话开始时按当前任务关键词向量 + FTS 召回最相关 N 条记忆注入 system prompt。
- **DoD**
  - 用户告诉模型「我的代码项目放在 `~/code`」，下次问「打开我那个 fastapi 项目」能直接定位。
  - 设置页能查看/删除记忆。

### F5.3 系统信息工具
- **实现要点**
  - `get_system_info` 返回：OS、CPU 型号/占用、内存总/可用、磁盘列表与剩余、网络在线状态、电池（如可读）。
  - 平台适配通过 P6 adapter。
- **DoD**
  - 问「我电脑还有多少空间」能给出每个盘剩余 + 总占用比例。

---

## 9. P6 · 跨平台适配

### F6.1 平台 adapter 抽象
- **实现要点**
  - 新增 `src/main/platform/index.ts` 导出 `getPlatformAdapter()`，按 `process.platform` 分发。
  - 接口：`listApps() / openApp(app) / openPath(p) / getSystemInfo() / listRoots() / trash(p)`。
- **DoD**
  - 三个平台都有具体实现文件；单测用 fake `process.platform` 覆盖分发逻辑。

### F6.2 Windows
- **实现要点**
  - 应用扫描：合并「Start Menu `.lnk`」 + 注册表 `HKLM\\Software\\...\\Uninstall` + UWP `Get-StartApps` (PowerShell 兜底)。
  - 解析 `.lnk` 真实路径：用 `node-windows-shortcuts` 或 PowerShell。
  - 盘符列表：A-Z 探测；Trash：用 `@electron/remote.shell.trashItem`。
- **DoD**
  - 在 Win 11 上能列出 Edge、VS Code 等常用应用并启动；删除走系统回收站。

### F6.3 macOS
- **实现要点**
  - 应用扫描：递归 `/Applications` + `~/Applications` + `mdfind 'kMDItemContentType==com.apple.application-bundle'` 兜底。
  - 图标：用 `mdls` 或 `sips` 提取 `.icns`，转 PNG dataURL 缓存。
  - 系统信息：`system_profiler SPHardwareDataType -json` 解析。
- **DoD**
  - 在 macOS 14+ 上能列出主要应用并启动；图标显示正常。

### F6.4 路径与编码统一
- **实现要点**
  - 所有工具内部路径用 `path.resolve`；展示时按平台选择分隔符。
  - 文件名编码：Win 上注意 GBK 文件名兜底；统一 `node:buffer` decode。
- **DoD**
  - 中文文件名在三个平台都能搜到、能打开。

---

## 10. P7 · 任务与可视化

### F7.1 任务页（真实数据）
- **实现要点**
  - 任务页接入 `agent_runs` 表，分四个 Tab：进行中 / 待确认 / 已完成 / 失败。
  - 待确认 Tab 显示 `tool_calls` 中 `awaiting_approval` 的项，复用 `ToolConfirmCard`。
  - 失败可重试：用相同入参重发 `agent:run`。
- **DoD**
  - 关闭对话窗口再回来，待确认动作仍在任务页；批准后真正执行。

### F7.2 技能页（自动渲染）
- **实现要点**
  - 调用 `tools:list` 拿到全部工具；按所属 Agent 分组渲染卡片，含描述、风险、是否需要确认。
  - 用户可以开关「自动确认低风险」、「自动确认中风险（仅在白名单目录）」。
- **DoD**
  - 新增一个工具后，技能页无需改代码就能看到。

### F7.3 办公室页（Agent 工作台 v1）
- **实现要点**
  - 三栏：左 Agent 列表（含状态徽标）；中 当前 Agent 的最近运行流；右 当前 step 的工具调用详情。
  - 实时跟随 Chat 中正在运行的 `agent_run`；点击历史 step 可回放。
- **DoD**
  - 跑一次「整理桌面 PDF」时，办公室页能可视化看到 Orchestrator → FileAgent → 工具调用的全过程。

---

## 11. P8 · 产品化收尾

### F8.1 Onboarding
- **实现要点**
  - 首次启动检测 `settings.chat.model` 为空时弹引导：选 Provider → 填 Key → 测试连接 → 选索引根目录 → 开始首轮索引。
- **DoD**
  - 全新用户在 3 分钟内完成全部初始化并能正常对话。

### F8.2 错误体验
- **实现要点**
  - 统一错误中心 `src/renderer/lib/errorBus.ts`，所有 IPC 错误经过它格式化；HeroUI Toast 全局展示。
  - 网络断开 / Key 失效 / 模型不存在 / 索引失败 都有明确 actionable hint。
- **DoD**
  - 手动 unplug 网络 + 删错 Key，Chat 给出可点击的「打开设置」按钮，不只是吐错误堆栈。

### F8.3 文档与发版
- **实现要点**
  - `README.md` 增加使用指南、配置 Provider 截图、跨平台说明。
  - `docs/folder-structure.md` 更新到实际结构。
  - 打包：`electron-builder` 配置；产出 Linux AppImage / Win NSIS / macOS dmg；不签名也至少可双击运行。
- **DoD**
  - 一份能给非开发者朋友试用的安装包；安装后从图标直接进入 Onboarding。

### F8.4 测试矩阵
- **实现要点**
  - 单元测试覆盖：索引器、工具 schema、风险分级、权限判断、设置存储、orchestrator 决策路径。
  - 集成测试：`agent:run` → 工具调用 → 持久化的端到端 happy path（用本地 mock 模型）。
  - 手动测试脚本（`docs/test-plan.md`）列出每个平台必跑的 20 个场景。
- **DoD**
  - `npm test` 通过；矩阵脚本在 Linux + Win/Mac 上至少各跑过一遍。

---

## 12. 系统整体完成判定（Final DoD）

只有以下**全部**满足时，可以宣布 v1 完成：

### 12.1 能力维度
- [ ] 用户问「我电脑里有哪些 Python 项目 / 最近修改的 PDF / 我装了什么办公软件」，能在 3 秒内回答并给出可点击来源。
- [ ] 用户说「打开 VS Code / 打开 README / 创建一个文件夹 / 把这些图片移到桌面」，工具能完成；中高风险动作必须确认。
- [ ] 用户告诉 AI 一个长期偏好（如代码目录、常用域名），下次能召回。
- [ ] Chat 是流式 + 多会话 + 引用 + 工具步骤可见 + 历史可回看。
- [ ] 技能页与任务页都是基于真实数据自动渲染，不是 mock。

### 12.2 安全维度
- [ ] 不存在「模型自由执行 shell」的入口；所有动作必经 Tool Registry。
- [ ] 删除走回收站；覆盖前自动备份；批量动作有 undo plan。
- [ ] 敏感路径（密钥、密码库、系统隐藏目录）默认拒绝；要解除只能从设置里手动添加。
- [ ] 每个动作都能在审计日志里查到。

### 12.3 平台维度
- [ ] Linux / Windows / macOS 三平台都能：列应用、启动应用、列盘符或根、打开文件、删除文件（回收站）。
- [ ] 三平台中文文件名搜索 / 打开正常。

### 12.4 体验维度
- [ ] 离线场景：搜索、文件浏览、应用启动、历史回看、设置修改全部可用；仅模型调用受影响。
- [ ] 首次启动 → 完成对话 < 3 分钟。
- [ ] Chat P95 首字延迟 < 2s（取决于模型），工具调用确认弹窗 < 100ms 出现。
- [ ] 没有任何已知崩溃路径（全局错误捕获 + Toast）。

### 12.5 工程维度
- [ ] 主进程全部 TS；测试覆盖率：主进程关键模块（indexer / tools / runtime / orchestrator）行覆盖 ≥ 70%。
- [ ] `npm run build && npm run start` 在 clean checkout 上可直接跑。
- [ ] `docs/` 与代码状态一致；roadmap 与本执行计划任一未完成项被勾掉，必有对应 commit。

---

## 13. 落地策略

1. **按阶段开 PR**：每个 Phase 一个长 PR 或多个小 PR，PR 描述链接到本文件对应 F 段落，并勾掉对应 DoD。
2. **每个阶段结束有可发布版本**：哪怕 P3 没做完，P2 结束时也应该能交付一个「能本地搜索 + 单轮 Chat」的可用版。
3. **不允许跳级**：例如不要在 P2 没完成时去做 P5；遇到模型/平台问题先在低阶段加 spike 任务。
4. **优先做减法**：每个 Phase 列表是上限。如果有功能阻碍主目标（AI 知道电脑 / AI 操作电脑），先砍。

---

## 14. 风险与权衡

| 风险 | 影响 | 缓解 |
|------|------|------|
| `better-sqlite3` 在不同 Electron 版本上需要 rebuild | 构建复杂 | 用 `@electron/rebuild` postinstall；CI 矩阵覆盖 |
| 模型 tools 协议跨厂商差异 | Orchestrator 复杂 | 抽象 `ModelAdapter`，每个 Provider 一个 adapter 文件 |
| 文件 watcher 在大目录上的性能 | 卡顿 | 默认只 watch 用户配置的根；扫描分批；用 worker thread |
| Windows 注册表 / 快捷方式解析复杂 | 应用列表不全 | 引入成熟库（`registry-js`、`windows-shortcuts`），不全的就退到 Start Menu |
| 模型把工具用错（例如把读改成删） | 数据丢失 | 风险分级 + 确认 + 回收站 + 备份；不可恢复动作直接禁用 |
| 端侧模型工具调用能力弱 | 体验差 | JSON plan 降级；并对端侧模型只暴露 low/medium 工具 |

---

## 15. 怎么用这份计划

- **当下**：选定 P0，照 F0.1 → F0.4 顺序做；完成每条勾掉它的 DoD。
- **每周回顾**：检查上周勾选条目是否真的满足 DoD（跑 demo），未满足的退回 `pending` 状态。
- **新需求**：先映射到现有 Phase；如果都不属于，单开 P9+ 阶段，写出同样的「实现要点 + DoD」。

> 计划是给项目用的，不是给计划用的。任何阶段如果发现路线偏了，先改本文件再写代码。

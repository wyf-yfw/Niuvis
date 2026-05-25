# Niuvis Desktop AI Assistant Roadmap

**Goal:** 把 Niuvis 从“带应用栏/文件浏览/Chat 的 Electron 前端”升级成“本地优先的桌面 AI 助手”。

**Architecture:** 继续保留 Electron + React + TypeScript + Vite + HeroUI v3 的现有基础，补齐主进程 Agent 架构、数据库/向量检索、工具调用、安全确认、操作日志和跨平台适配。AI 不直接操作系统，而是通过受控工具层读取电脑知识、执行动作、记录审计日志。

**Tech Stack:** Electron, React, TypeScript, Vite, HeroUI v3, OpenAI-compatible Chat API, SQLite/FTS, local vector search, platform adapters for Linux/Windows/macOS.

---

## Summary

核心目标是两件事：

- AI 能知道电脑里有什么。
- AI 能在分级权限下操作电脑。

当前基础继续保留：Electron + React + TypeScript + Vite + HeroUI v3；已有应用扫描缓存、文档/图库保存、此电脑文件浏览、OpenAI 兼容 Chat。下一阶段补齐主进程 Agent 架构、数据库/向量检索、工具调用、安全确认、操作日志和跨平台适配。

默认决策：

- 权限模式：分级确认。低风险可执行，高风险/破坏性操作必须确认。
- 电脑知识：分级索引。默认索引应用、文件名、路径、类型、时间和已导入内容；全文/敏感目录需授权。
- 系统支持：Linux / Windows / macOS 同等设计，用平台 adapter 分别实现。
- UI：能用 HeroUI 的全部用 HeroUI，保持深色风格。

## Key Changes

### 1. 基础架构整理

- 将 Electron 入口从 `main.js` 逐步迁移到 `src/main/index.ts`，保留旧入口作为过渡。
- 建立统一 IPC 层：所有 renderer 调用只通过 `src/main/ipc` 注册，不在入口文件里堆逻辑。
- 把现有 `chatService.js`、`installedApps.js`、`fileBrowser.js`、`localLibrary.js` 纳入 services/agents 调用链。
- 在 `src/shared/types` 定义稳定类型，renderer 和 main 共用。

### 2. 电脑知识层

- 新增本地数据库服务：SQLite 存储应用、文件元数据、文档图库、对话、任务、操作日志、权限记录。
- 新增全文搜索：SQLite FTS 搜文件名、路径、文档标题、导入文档文本。
- 新增语义搜索：向量库只用于用户授权的内容，先支持文档/图库/指定目录，后续扩展全盘。
- 新增索引器：
  - 应用索引：复用当前应用扫描和图标缓存。
  - 文件索引：扫描授权目录和系统根目录元数据。
  - 文档索引：对 txt/md/pdf/docx 等做文本抽取。
  - 增量更新：文件 watcher + 启动时快速校验缓存。
- 敏感默认排除：密钥文件、浏览器密码库、系统私有目录、隐藏配置目录、大型二进制目录。

### 3. Agent 与工具系统

- 第一阶段明确做 8 个 Agent，其中 `OrchestratorAgent` 负责调度，`SafetyAgent` 是规则守卫，不直接交给模型自由发挥。
- `OrchestratorAgent`：总控/规划 Agent。理解用户请求，拆成步骤，选择子 Agent，汇总结果；不直接操作电脑。
- `KnowledgeAgent`：电脑知识 Agent。读取 SQLite / FTS / 向量索引，回答“电脑里有什么、某文件在哪里、最近改了什么”。
- `FileAgent`：文件 Agent。搜索、读取、总结、创建、重命名、移动、复制、打开文件；删除/覆盖必须确认。
- `AppAgent`：应用 Agent。读取已安装应用缓存，搜索应用、启动应用、记录最近使用；后续接窗口控制和自动化。
- `SystemAgent`：系统 Agent。读取系统信息、磁盘、内存、网络、进程状态，给出清理和优化建议；系统设置变更必须确认。
- `BrowserAgent`：浏览器/网页 Agent。负责网页搜索、打开网页、网页摘要；后续扩展浏览器自动操作。
- `MemoryAgent`：长期记忆 Agent。保存用户偏好、常用路径、常用项目、常用应用和跨会话任务上下文。
- `TaskAgent`：任务 Agent。管理长任务、待确认动作、失败重试、定时/后台任务，把执行过程同步到任务页和办公室页。
- `SafetyAgent`：安全守卫。按风险等级、路径规则、用户确认状态决定能否执行；所有子 Agent 的工具调用都必须先经过它。
- 每个工具必须声明：名称、输入 schema、风险等级、是否需要确认、可回滚能力、结果摘要。

Agent 协作方式：

- 普通问答：Chat → OrchestratorAgent → KnowledgeAgent / MemoryAgent → Chat 回复。
- 找文件：Chat → OrchestratorAgent → KnowledgeAgent → FileAgent → 返回路径和引用。
- 打开应用：Chat → OrchestratorAgent → AppAgent → SafetyAgent → 启动应用。
- 整理文件：Chat → OrchestratorAgent → FileAgent 生成计划 → SafetyAgent 确认 → FileAgent 执行 → TaskAgent 记录。
- 查看电脑状态：Chat → OrchestratorAgent → SystemAgent → 返回磁盘/内存/网络信息。

### 4. Chat 升级

- Chat 改成真正的 Agent Chat，而不是只发 `/chat/completions`。
- 支持流式输出、工具调用过程展示、引用来源、附件/文件上下文。
- 模型接口继续兼容 OpenAI API：
  - 优先使用模型原生 tools/function calling。
  - 如果模型不支持工具调用，降级为 JSON plan + 本地解析执行。
- 对话持久化：会话、消息、工具调用、引用文件、执行结果全部保存本地数据库。
- 设置页扩展：模型 URL、API Key、模型名、工具调用开关、索引范围、权限策略。

### 5. 操作电脑的安全运行时

- 动作分级：
  - 低风险：搜索、列目录、读取元数据、打开普通文件、启动应用。
  - 中风险：创建/改名/移动/复制文件、读取全文、批量整理。
  - 高风险：删除、覆盖、执行命令、安装软件、修改系统设置、访问敏感目录。
- 中高风险动作弹出 HeroUI 确认弹窗，显示将影响的路径、命令、文件数量和可回滚情况。
- 所有动作写入审计日志：谁触发、模型建议、工具输入、结果、时间、是否用户确认。
- 文件变更优先可恢复：删除走回收站，覆盖前备份，批量操作生成 undo plan。
- 禁止模型直接执行任意 shell；必须通过白名单工具和权限策略。

### 6. 前端产品形态

- Chat 页面作为主入口：左侧保持现有导航，右侧是对话、工具步骤、引用文件和确认卡片。
- 应用页：继续做真实应用栏，支持搜索、分类、最近打开、固定应用。
- 此电脑：保持 Windows 风格列表，但接入索引状态、快速搜索、AI 可引用文件。
- 文档/图库：上传后保存、抽取元数据、生成缩略图/摘要，可被 Chat 检索引用。
- 办公室页面：先保留简单占位，后续作为 Agent 可视化工作台，展示多个 Agent 的状态、任务和日志。
- 任务页：展示 AI 执行过的长期任务、待确认动作、失败重试、历史结果。
- 技能页：展示可用工具/Agent 能力，不做复杂插件市场，先以本地能力清单为主。

## Public Interfaces / Types

新增 IPC：

- `agent:run`：提交用户请求，返回 agent run id。
- `agent:stream`：订阅模型输出、工具步骤、确认请求、最终结果。
- `agent:approve` / `agent:reject`：处理高风险动作确认。
- `agent:cancel`：取消正在执行的任务。
- `tools:list`：返回当前可用工具及风险等级。
- `index:start` / `index:status` / `index:update-scope`：管理电脑知识索引。
- `memory:search` / `memory:save` / `memory:delete`：管理长期记忆。
- `audit:list`：查看操作历史。

核心类型：

- `AgentRun`：id、userRequest、status、steps、contextSources、createdAt、finishedAt。
- `ToolCall`：id、toolName、input、riskLevel、requiresConfirmation、preview、status、result。
- `ComputerIndexItem`：id、kind、name、path、mime/type、size、modifiedAt、source、permissions。
- `PermissionPolicy`：scope、allowedPaths、deniedPaths、riskRules、createdAt。
- `AuditLogEntry`：actor、action、toolCallId、affectedPaths、approvedByUser、result、timestamp。

## Milestones

1. Foundation Stabilization：整理主进程入口、IPC、共享类型、HeroUI 主题和现有测试。
2. Local Knowledge v1：SQLite + FTS + 应用/文件/文档/图库索引，做到“问电脑里有什么能答出来”。
3. Agent Chat v1：Chat 支持工具调用、流式输出、引用来源和操作步骤。
4. Safe Computer Actions v1：打开应用、打开文件、创建/移动/复制/重命名文件，带确认和日志。
5. Memory & Tasks：长期记忆、任务历史、待确认动作、失败重试。
6. Cross-platform Hardening：Linux/Windows/macOS adapter 补齐，统一测试。
7. Office Visualization：把办公室做成 Agent 工作台，看见不同 Agent 在处理任务。

## Test Plan

- 单元测试：索引器、路径权限判断、工具 schema 校验、风险分级、设置存储、模型请求构造。
- IPC 集成测试：renderer 调用到 main 的成功/失败路径，尤其是确认、取消、错误返回。
- Agent 测试：给固定用户请求，验证会选择正确工具、不会越权、会引用正确文件来源。
- 安全测试：删除/覆盖/命令执行/敏感目录读取必须触发确认；拒绝后不得执行。
- UI 测试：Chat 工具步骤、确认弹窗、索引状态、文件引用、深色文字可读性。
- 跨平台测试：Linux、Windows、macOS 的应用发现、根目录/盘符、打开文件、路径处理。

## Acceptance Criteria

- 用户问“我电脑里有哪些 Python 项目/最近的文档/能打开哪些应用”，Niuvis 能基于本地索引回答并给来源。
- 用户让 AI “打开 VS Code / 打开某个文件 / 创建一个文件夹 / 整理这些图片”，Niuvis 能通过工具执行。
- 任何高风险动作执行前必须显示确认卡片，确认内容包含影响范围。
- 操作完成后能在任务/日志里看到完整记录。
- 模型 API 换成用户自己的 OpenAI 兼容地址后，Chat 和工具调用仍能工作。
- 无网络时，本地搜索、文件浏览、应用启动、历史记录仍可用。

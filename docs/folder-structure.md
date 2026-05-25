# 目录结构说明

本文档描述 Niuvis 项目的目录组织规范。

## 顶层结构

```
Niuvis/
├── src/                # 源代码
├── resources/          # 应用资源（图标、图片）
├── scripts/            # 构建与自动化脚本
├── docs/               # 项目文档
├── tests/              # 测试文件
├── main.js             # Electron 入口（旧，待迁移）
├── package.json        # 项目配置
└── README.md           # 项目说明
```

## src/main — 主进程

Electron 主进程，负责 Agent 调度、系统操作、模型 API 调用等核心逻辑。

```
src/main/
├── agents/                     # Agent 系统
│   ├── orchestrator/           # 主管 Agent
│   │   └── index.ts            #   理解意图、拆解任务、分配 Agent、汇总结果
│   ├── file/                   # 文件 Agent
│   │   └── index.ts            #   搜索、归档、格式转换、文档分析
│   ├── system/                 # 系统 Agent
│   │   └── index.ts            #   系统设置、硬件检测、性能优化
│   ├── app/                    # 应用 Agent
│   │   └── index.ts            #   调用 EXE、自动化操作、进程管理
│   ├── browser/                # 网页 Agent
│   │   └── index.ts            #   网页交互、数据抓取、表单填写
│   └── search/                 # 搜索 Agent
│       └── index.ts            #   网络搜索、信息聚合
├── services/                   # 服务层
│   ├── model/                  # 模型 API
│   │   └── index.ts            #   多模型直连、流式响应、API Key 管理
│   ├── database/               # 本地数据库
│   │   └── index.ts            #   SQLite 读写、配置存储、历史记录
│   └── vector/                 # 向量库
│       └── index.ts            #   语义搜索、文档向量化
├── ipc/                        # IPC 通信
│   └── index.ts                #   主进程与渲染进程的消息通道
├── utils/                      # 工具函数
│   └── index.ts                #   主进程专用工具
└── index.ts                    # 主进程入口
```

## src/renderer — 渲染进程

React 前端，负责 UI 展示与用户交互。

```
src/renderer/
├── components/                 # UI 组件
│   └── .gitkeep
├── pages/                      # 页面
│   └── .gitkeep
├── hooks/                      # 自定义 Hook
│   └── .gitkeep
├── stores/                     # 状态管理
│   └── .gitkeep
├── styles/                     # 样式
│   └── .gitkeep
├── assets/                     # 静态资源
│   └── .gitkeep
├── App.tsx                     # 根组件
└── index.tsx                   # 渲染进程入口
```

## src/shared — 共享代码

主进程与渲染进程共用的类型、常量和工具。

```
src/shared/
├── types/                      # 类型定义
│   └── index.ts                #   Agent、模型、配置等类型
├── constants/                  # 常量
│   └── index.ts                #   默认配置、模型列表、事件名
└── utils/                      # 共享工具
    └── index.ts                #   通用工具函数
```

## resources — 应用资源

```
resources/
├── icons/                      # 应用图标
└── images/                     # 其他图片资源
```

## 约定

1. **每个目录使用 index.ts 作为入口**：集中管理导出，外部导入路径简洁
2. **Agent 目录按职责划分**：每个 Agent 独立目录，内部可拆分多个文件
3. **services 只做数据层**：不含业务逻辑，只提供数据库/模型/向量库的读写能力
4. **shared 不依赖主进程或渲染进程**：保持纯粹，只放共用代码

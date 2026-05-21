# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言

始终用中文与用户交流。

## 项目结构

全栈项目管理 Web 应用，Monorepo 结构：

- `backend/` — Node.js + Express + TypeScript + Prisma (SQLite)
- `frontend/` — React 19 + TypeScript + Vite + Tailwind CSS v4

## 常用命令

### 后端（在 `backend/` 目录下运行）

```bash
npm run dev          # 启动后端开发服务器（端口 3001，热重载）
npm run db:migrate   # 执行数据库 migration
npm run db:generate  # 重新生成 Prisma Client
npm run db:studio    # 打开 Prisma Studio 可视化数据库
```

### 前端（在 `frontend/` 目录下运行）

```bash
npm run dev    # 启动前端开发服务器（端口 5173）
npm run build  # 构建生产版本
npm run lint   # 运行 ESLint
```

### 同时启动前后端（根目录）

```bash
npm run dev
```

## 架构说明

### 后端 API 路由

| 路径 | 功能 |
|------|------|
| `GET/POST /api/projects` | 项目列表 / 创建项目 |
| `GET/PUT/DELETE /api/projects/:id` | 获取 / 更新 / 删除项目 |
| `GET /api/tasks/project/:projectId` | 获取项目任务 |
| `POST/PUT/DELETE /api/tasks` | 创建 / 更新 / 删除任务 |
| `POST/PUT/DELETE /api/milestones` | 里程碑 CRUD |
| `POST /api/ai/decompose` | AI 任务拆解（需要 ANTHROPIC_API_KEY） |
| `POST /api/ai/report/:projectId` | AI 生成进度报告 |

### 前端组件树

```
App
├── Sidebar          — 项目列表 + 新建项目
└── ProjectView      — 项目主视图（看板 / 进度双 Tab）
    ├── AIDecompose  — AI 任务拆解输入区
    ├── KanbanBoard  — 拖拽看板（@hello-pangea/dnd）
    └── ProgressView — 进度图表 + 里程碑 + AI 报告
```

### 数据库 Schema

`Project` → 多个 `Task` + 多个 `Milestone`（级联删除）

Task.status 枚举值：`todo` | `in_progress` | `done`
Task.priority 枚举值：`low` | `medium` | `high`

## 环境变量

`backend/.env` 中配置：

```
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY="your-api-key"
PORT=3001
```

AI 功能（任务拆解、进度报告）需要有效的 `ANTHROPIC_API_KEY`。
前端通过 Vite proxy 将 `/api/*` 转发到后端 3001 端口，无需跨域配置。

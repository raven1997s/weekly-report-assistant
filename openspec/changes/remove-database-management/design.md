## Context

数据库管理功能由独立前端路由、专用页面组件和两个只读查询接口组成，业务功能不依赖这些入口。

## Goals / Non-Goals

- Goals: 完整移除数据库管理的用户入口和专用代码。
- Non-Goals: 不删除 SQLite、不删除业务表、不修改现有用户数据。

## Decisions

- 直接删除专用路由、接口和仅被该页面引用的组件。
- `/database` 不设置兼容重定向，由现有 SPA 路由行为处理未知地址。
- Docker 镜像继续挂载 `./data:/app/data`，保证数据持久化。

## Risks / Trade-offs

- 用户无法再通过应用界面直接查看原始表数据；需要时可使用 SQLite 工具读取挂载的数据文件。

## Migration Plan

无需数据迁移。重新构建并替换 Docker 容器即可。


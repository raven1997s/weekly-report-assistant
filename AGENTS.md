<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# 运行服务强制约定

- 任何需要重新启动前端或后端服务的操作，必须先检查并关闭已有的项目服务进程，再启动新进程。
- 默认只允许保留一套有效服务实例：
  - 后端开发服务端口：`3000`
  - 前端开发服务端口：`5173`
- 如果发现端口已被当前项目旧进程占用，必须先结束旧进程，确认端口释放后再重新启动。
- 启动完成后，必须再次检查端口占用情况，并明确当前生效的访问地址，避免多个实例并存导致结果混乱。

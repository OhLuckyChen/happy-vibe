# Taskboard MCP 接入

as-boss 可将同机部署的完整 Taskboard 接入到 Codex、Claude 和 ACP Agent 会话。启用后，Agent 通过 `taskboard` MCP 工具读取、创建和更新 Issue；移动端经 Happy daemon 的加密 Machine RPC 调用同机 Taskboard HTTP API。Taskboard 主应用 SQLite 仍是唯一事实来源。

## 配置

在启动 as-boss CLI、Daemon 或 Agent 容器的环境中设置：

```bash
AS_BOSS_TASKBOARD_MCP_ENTRYPOINT=/srv/taskboard/vendor/dashi-taskboard/server/taskboard-mcp.mjs
TASKBOARD_MCP_URL=http://127.0.0.1:47823
```

也可用兼容变量指向包含 `server.mjs` 的目录：

```bash
AS_BOSS_TASKBOARD_MCP_ROOT=/srv/taskboard/vendor/dashi-taskboard/server
```

可选变量会原样传给 MCP 进程：

```bash
CODEX_HOME=/var/lib/as-boss/codex
```

任务看板与 as-boss Agent 同机运行时，MCP 进程通过标准输入输出启动，Taskboard HTTP API 只在本机 `TASKBOARD_MCP_URL` 暴露；手机、Web、桌面端不直连 Taskboard 端口。

当 as-boss 已为会话创建或认领 Taskboard Issue 时，启动 Agent 时传入：

```bash
AS_BOSS_TASKBOARD_ISSUE_ID=<taskboard issue id or identifier>
```

Codex 首次 `thread/start` 后，Happy session metadata 会同时保存：

- `codexThreadId`: Codex app-server 返回的标准 thread id，用于 Taskboard 识别 Codex session。
- `taskboardIssueId`: as-boss 保存的 Taskboard Issue 映射，不写入 Taskboard 的 `threadId` 字段。

## 生效范围

- `happy codex`
- `happy claude` 的远程与离线路径
- ACP Agent 启动路径

未配置或 MCP 入口无效时，as-boss 保持既有 Agent 启动行为，并记录诊断日志；不会把无效 MCP 配置下发给 Agent。

## 上线前检查

确认 Taskboard MCP Server 能完成 `initialize` 和 `tools/list` 握手，再启动 as-boss Agent。随后从 as-boss 创建或认领一个 Issue，检查该 Issue 的 `threadId` 等于 session metadata 中的 `codexThreadId`，并验证 Web 看板、taskctl 与 as-boss 读取到同一 Issue 状态和评论。

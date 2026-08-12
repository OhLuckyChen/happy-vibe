import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { logger } from '@/ui/logger';

export type TaskboardMcpServer = {
    command: string;
    args: string[];
    env?: Record<string, string>;
};

function resolveEntrypoint(env: NodeJS.ProcessEnv): string | null {
    if (env.AS_BOSS_TASKBOARD_MCP_ENTRYPOINT) {
        return resolve(env.AS_BOSS_TASKBOARD_MCP_ENTRYPOINT);
    }

    if (env.AS_BOSS_TASKBOARD_MCP_ROOT) {
        return resolve(env.AS_BOSS_TASKBOARD_MCP_ROOT, 'server.mjs');
    }

    return null;
}

/**
 * Resolves the local Taskboard MCP server configuration supplied to coding
 * agents. The plugin is deployed alongside as-boss, but deliberately remains
 * outside this repository so that task data and Codex-specific integration do
 * not become an as-boss build dependency.
 */
export function resolveTaskboardMcpServer(env: NodeJS.ProcessEnv = process.env): TaskboardMcpServer | null {
    const entrypoint = resolveEntrypoint(env);
    if (!entrypoint) {
        return null;
    }

    if (!existsSync(entrypoint)) {
        logger.warn(`[taskboard] MCP server is unavailable at ${entrypoint}`);
        return null;
    }

    const syntaxCheck = spawnSync(process.execPath, ['--check', entrypoint], { stdio: 'ignore' });
    if (syntaxCheck.status !== 0) {
        logger.warn(`[taskboard] MCP plugin has invalid syntax at ${entrypoint}`);
        return null;
    }

    const taskboardEnv: Record<string, string> = {};
    if (env.CODEX_HOME) taskboardEnv.CODEX_HOME = env.CODEX_HOME;
    if (env.TASKBOARD_DATA_DIR) taskboardEnv.TASKBOARD_DATA_DIR = env.TASKBOARD_DATA_DIR;
    taskboardEnv.TASKBOARD_MCP_URL = env.TASKBOARD_MCP_URL || 'http://127.0.0.1:47823';

    return {
        command: process.execPath,
        args: ['--no-warnings', entrypoint],
        ...(Object.keys(taskboardEnv).length > 0 ? { env: taskboardEnv } : {}),
    };
}

export function taskboardMcpServers(env: NodeJS.ProcessEnv = process.env): Record<string, TaskboardMcpServer> {
    const taskboard = resolveTaskboardMcpServer(env);
    return taskboard ? { taskboard } : {};
}

export const TASKBOARD_AGENT_INSTRUCTION = `
当 taskboard MCP 可用时，开始处理可持续追踪的需求前，先读取任务看板状态；需要新建、认领、评论、更新状态或送审任务时，使用 taskboard MCP 工具作为唯一任务事实来源。Taskboard Issue 的 threadId 只能保存 Codex thread id，不要写入 Happy session id；as-boss 的 taskboardIssueId 映射保存在 Happy session metadata。不要通过文件或对话内容伪造看板状态。`;

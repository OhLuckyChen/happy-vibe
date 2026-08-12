import { describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';

vi.mock('@/ui/logger', () => ({ logger: { warn: vi.fn() } }));

import { resolveTaskboardMcpServer, taskboardMcpServers } from './mcpConfig';

describe('Taskboard MCP configuration', () => {
    it('does not inject a server when the plugin root is not configured', () => {
        expect(resolveTaskboardMcpServer({})).toBeNull();
        expect(taskboardMcpServers({})).toEqual({});
    });

    it('does not inject a server when the configured MCP entrypoint is invalid', () => {
        expect(resolveTaskboardMcpServer({ AS_BOSS_TASKBOARD_MCP_ROOT: '/missing-taskboard-plugin' })).toBeNull();
    });

    it('does not inject a server when the plugin has invalid syntax', () => {
        const root = resolve(process.cwd(), 'src/taskboard/fixtures/invalid-taskboard-mcp');
        expect(resolveTaskboardMcpServer({ AS_BOSS_TASKBOARD_MCP_ROOT: root })).toBeNull();
    });

    it('builds a stdio server configuration for a valid plugin root', () => {
        const root = resolve(process.cwd(), 'src/taskboard/fixtures/taskboard-mcp');
        const config = resolveTaskboardMcpServer({
            AS_BOSS_TASKBOARD_MCP_ROOT: root,
            CODEX_HOME: '/data/codex',
            TASKBOARD_DATA_DIR: '/data/taskboard',
            TASKBOARD_MCP_URL: 'http://127.0.0.1:47823',
        });

        expect(config).toEqual({
            command: process.execPath,
            args: ['--no-warnings', `${root}/server.mjs`],
            env: {
                CODEX_HOME: '/data/codex',
                TASKBOARD_DATA_DIR: '/data/taskboard',
                TASKBOARD_MCP_URL: 'http://127.0.0.1:47823',
            },
        });
    });

    it('builds a stdio server configuration from an explicit MCP entrypoint', () => {
        const entrypoint = resolve(process.cwd(), 'src/taskboard/fixtures/taskboard-mcp/server.mjs');
        const config = resolveTaskboardMcpServer({
            AS_BOSS_TASKBOARD_MCP_ENTRYPOINT: entrypoint,
        });

        expect(config).toEqual({
            command: process.execPath,
            args: ['--no-warnings', entrypoint],
            env: {
                TASKBOARD_MCP_URL: 'http://127.0.0.1:47823',
            },
        });
    });
});

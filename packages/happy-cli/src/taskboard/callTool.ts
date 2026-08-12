const DEFAULT_TASKBOARD_URL = 'http://127.0.0.1:47823';

const ALLOWED_TOOLS = new Set([
    'list_taskboard_state',
    'create_taskboard_issue',
    'update_taskboard_issue',
    'move_taskboard_issue',
    'list_taskboard_comments',
    'add_taskboard_comment',
]);

type TaskboardToolName =
    | 'list_taskboard_state'
    | 'create_taskboard_issue'
    | 'update_taskboard_issue'
    | 'move_taskboard_issue'
    | 'list_taskboard_comments'
    | 'add_taskboard_comment';

function taskboardBaseUrl(): string {
    return process.env.TASKBOARD_MCP_URL || process.env.CODEX_TASKBOARD_URL || DEFAULT_TASKBOARD_URL;
}

function requireString(args: Record<string, unknown>, key: string): string {
    const value = args[key];
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`Taskboard argument '${key}' is required`);
    }
    return value;
}

function optionalString(args: Record<string, unknown>, key: string): string | undefined {
    const value = args[key];
    return typeof value === 'string' ? value : undefined;
}

function optionalNumber(args: Record<string, unknown>, key: string): number | undefined {
    const value = args[key];
    return typeof value === 'number' && Number.isSafeInteger(value) ? value : undefined;
}

async function requestTaskboard(method: string, pathname: string, body?: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(new URL(pathname, `${taskboardBaseUrl()}/`), {
        method,
        headers: {
            accept: 'application/json',
            'x-taskboard-client': 'as-boss',
            ...(process.env.TASKBOARD_AGENT_RUNTIME ? { 'x-taskboard-agent-runtime': process.env.TASKBOARD_AGENT_RUNTIME } : {}),
            ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const payload = await response.json().catch(() => null) as { error?: { message?: unknown } } | null;
    if (!response.ok) {
        const message = typeof payload?.error?.message === 'string'
            ? payload.error.message
            : `Taskboard request failed with HTTP ${response.status}`;
        throw new Error(message);
    }
    return payload;
}

function taskPath(id: string): string {
    return `/api/tasks/${encodeURIComponent(id)}`;
}

function listQuery(args: Record<string, unknown>): string {
    const params = new URLSearchParams();
    const projectId = optionalString(args, 'projectId');
    const status = optionalString(args, 'status');
    if (projectId) params.set('projectId', projectId);
    if (status) params.set('status', status);
    return params.size > 0 ? `?${params}` : '';
}

function workspaceContains(workspacePath: unknown, cwd: string): boolean {
    if (typeof workspacePath !== 'string' || workspacePath.length === 0) return false;
    const normalized = workspacePath.endsWith('/') ? workspacePath : `${workspacePath}/`;
    return cwd === workspacePath || cwd.startsWith(normalized);
}

async function currentProject(): Promise<unknown> {
    const response = await requestTaskboard('GET', '/api/projects') as { projects?: Array<Record<string, unknown>> };
    const projects = Array.isArray(response.projects) ? response.projects : [];
    return projects
        .filter((project) => workspaceContains(project.workspacePath, process.cwd()))
        .sort((left, right) => String(right.workspacePath ?? '').length - String(left.workspacePath ?? '').length)[0]
        ?? projects[0]
        ?? null;
}

async function issueVersion(id: string, explicitVersion?: number): Promise<number> {
    if (explicitVersion !== undefined) return explicitVersion;
    const response = await requestTaskboard('GET', taskPath(id)) as { task?: { version?: unknown } };
    const version = response.task?.version;
    if (typeof version !== 'number' || !Number.isSafeInteger(version)) {
        throw new Error(`Taskboard issue '${id}' does not have a valid version`);
    }
    return version;
}

/**
 * Calls the colocated Taskboard HTTP API through the daemon. This is exposed
 * only through the encrypted machine RPC channel: mobile clients must never
 * try to reach the daemon's localhost directly.
 */
export async function callTaskboardTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    if (!ALLOWED_TOOLS.has(name)) {
        throw new Error(`Taskboard tool is not available: ${name}`);
    }

    switch (name as TaskboardToolName) {
        case 'list_taskboard_state':
            return {
                ...(await requestTaskboard('GET', `/api/tasks${listQuery(args)}`) as Record<string, unknown>),
                project: await currentProject(),
            };
        case 'create_taskboard_issue':
            return await requestTaskboard('POST', '/api/tasks', {
                projectId: requireString(args, 'projectId'),
                title: requireString(args, 'title'),
                description: optionalString(args, 'description') ?? '',
                status: optionalString(args, 'status') ?? 'todo',
                priority: optionalString(args, 'priority') ?? 'none',
                labels: Array.isArray(args.labels) ? args.labels : [],
                threadId: optionalString(args, 'threadId'),
            });
        case 'update_taskboard_issue':
            return await requestTaskboard('PATCH', taskPath(requireString(args, 'id')), {
                title: optionalString(args, 'title'),
                description: optionalString(args, 'description'),
                status: optionalString(args, 'status'),
                priority: optionalString(args, 'priority'),
                labels: Array.isArray(args.labels) ? args.labels : undefined,
                threadId: optionalString(args, 'threadId'),
                version: await issueVersion(requireString(args, 'id'), optionalNumber(args, 'version')),
            });
        case 'move_taskboard_issue':
            return await requestTaskboard('POST', `${taskPath(requireString(args, 'id'))}/move`, {
                status: requireString(args, 'status'),
                threadId: optionalString(args, 'threadId'),
                version: await issueVersion(requireString(args, 'id'), optionalNumber(args, 'version')),
            });
        case 'list_taskboard_comments':
            return await requestTaskboard('GET', `${taskPath(requireString(args, 'id'))}/comments`);
        case 'add_taskboard_comment':
            return await requestTaskboard('POST', `${taskPath(requireString(args, 'id'))}/comments`, {
                body: requireString(args, 'body'),
                threadId: optionalString(args, 'threadId'),
            });
    }
}

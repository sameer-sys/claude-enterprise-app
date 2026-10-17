import { readdir, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { parseFrontmatter, buildFrontmatter } from "./frontmatter.js";
import { exists } from "./utils.js";
import { projectCommandsDir } from "./workspace-files.js";
import { validateCommandName, sanitizeCommandName } from "./validators.js";
import { ApiError } from "./errors.js";
function normalizeCommandFrontmatter(data) {
    return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== null && value !== undefined));
}
async function repairLegacyCommandFile(filePath, content) {
    const parsed = parseFrontmatter(content);
    if (parsed.data.model !== null) {
        return { ...parsed, changed: false };
    }
    const nextContent = buildFrontmatter(normalizeCommandFrontmatter(parsed.data)) + parsed.body.replace(/^\n?/, "\n");
    await writeFile(filePath, nextContent, "utf8");
    return {
        data: normalizeCommandFrontmatter(parsed.data),
        body: parsed.body,
        changed: true,
    };
}
async function listCommandsInDir(dir, scope) {
    if (!(await exists(dir)))
        return [];
    const entries = await readdir(dir, { withFileTypes: true });
    const items = [];
    for (const entry of entries) {
        if (!entry.isFile())
            continue;
        if (!entry.name.endsWith(".md"))
            continue;
        const filePath = join(dir, entry.name);
        const content = await readFile(filePath, "utf8");
        const { data, body } = await repairLegacyCommandFile(filePath, content);
        const name = typeof data.name === "string" ? data.name : entry.name.replace(/\.md$/, "");
        try {
            validateCommandName(name);
        }
        catch {
            continue;
        }
        items.push({
            name,
            description: typeof data.description === "string" ? data.description : undefined,
            template: body.trim(),
            agent: typeof data.agent === "string" ? data.agent : undefined,
            model: typeof data.model === "string" ? data.model : null,
            subtask: typeof data.subtask === "boolean" ? data.subtask : undefined,
            scope,
        });
    }
    return items;
}
export async function listCommands(workspaceRoot, scope) {
    if (scope === "global") {
        const dir = join(homedir(), ".config", "opencode", "commands");
        return listCommandsInDir(dir, "global");
    }
    return listCommandsInDir(projectCommandsDir(workspaceRoot), "workspace");
}
export function buildCommandContent(payload) {
    if (!payload.template || payload.template.trim().length === 0) {
        throw new ApiError(400, "invalid_command_template", "Command template is required");
    }
    const sanitized = sanitizeCommandName(payload.name);
    validateCommandName(sanitized);
    const frontmatter = buildFrontmatter(normalizeCommandFrontmatter({
        name: sanitized,
        description: payload.description,
        agent: payload.agent,
        model: payload.model,
        subtask: payload.subtask ?? false,
    }));
    const content = frontmatter + "\n" + payload.template.trim() + "\n";
    return { name: sanitized, content };
}
export async function upsertCommand(workspaceRoot, payload) {
    const command = buildCommandContent(payload);
    const dir = projectCommandsDir(workspaceRoot);
    await mkdir(dir, { recursive: true });
    const path = join(dir, `${command.name}.md`);
    await writeFile(path, command.content, "utf8");
    return path;
}
export async function repairCommands(workspaceRoot) {
    const dir = projectCommandsDir(workspaceRoot);
    if (!(await exists(dir)))
        return false;
    const entries = await readdir(dir, { withFileTypes: true });
    let changed = false;
    for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith(".md"))
            continue;
        const filePath = join(dir, entry.name);
        const content = await readFile(filePath, "utf8");
        const result = await repairLegacyCommandFile(filePath, content);
        changed ||= result.changed;
    }
    return changed;
}
export async function deleteCommand(workspaceRoot, name) {
    const sanitized = sanitizeCommandName(name);
    validateCommandName(sanitized);
    const path = join(projectCommandsDir(workspaceRoot), `${sanitized}.md`);
    await rm(path, { force: true });
}

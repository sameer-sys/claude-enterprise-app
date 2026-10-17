import { dirname, join } from "node:path";
import { appendFile, readFile } from "node:fs/promises";
import { openworkServerDataDir } from "@openwork/paths";
import { ensureDir, exists } from "./utils.js";
function resolveOpenworkDataDir() {
    return openworkServerDataDir();
}
export function auditLogPath(workspaceId) {
    return join(resolveOpenworkDataDir(), "audit", `${workspaceId}.jsonl`);
}
export function legacyAuditLogPath(workspaceRoot) {
    return join(workspaceRoot, ".opencode", "openwork", "audit.jsonl");
}
async function resolveReadableAuditPath(workspaceRoot, workspaceId) {
    const primary = auditLogPath(workspaceId);
    if (await exists(primary))
        return primary;
    const legacy = legacyAuditLogPath(workspaceRoot);
    if (await exists(legacy))
        return legacy;
    return null;
}
export async function recordAudit(workspaceRoot, entry) {
    const workspaceId = entry.workspaceId?.trim();
    if (!workspaceId) {
        const path = legacyAuditLogPath(workspaceRoot);
        await ensureDir(dirname(path));
        await appendFile(path, JSON.stringify(entry) + "\n", "utf8");
        return;
    }
    const path = auditLogPath(workspaceId);
    await ensureDir(dirname(path));
    await appendFile(path, JSON.stringify(entry) + "\n", "utf8");
}
export async function readLastAudit(workspaceRoot, workspaceId) {
    const path = await resolveReadableAuditPath(workspaceRoot, workspaceId);
    if (!path)
        return null;
    const content = await readFile(path, "utf8");
    const lines = content.trim().split("\n");
    const last = lines[lines.length - 1];
    if (!last)
        return null;
    try {
        return JSON.parse(last);
    }
    catch {
        return null;
    }
}
export async function readAuditEntries(workspaceRoot, workspaceId, limit = 50) {
    const path = await resolveReadableAuditPath(workspaceRoot, workspaceId);
    if (!path)
        return [];
    const content = await readFile(path, "utf8");
    const rawLines = content.trim().split("\n").filter(Boolean);
    if (!rawLines.length)
        return [];
    const slice = rawLines.slice(-Math.max(1, limit));
    const entries = [];
    for (let i = slice.length - 1; i >= 0; i -= 1) {
        try {
            entries.push(JSON.parse(slice[i]));
        }
        catch {
            // ignore malformed entry
        }
    }
    return entries;
}

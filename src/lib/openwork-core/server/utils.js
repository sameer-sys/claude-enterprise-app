import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, stat } from "node:fs/promises";
export async function exists(path) {
    try {
        await stat(path);
        return true;
    }
    catch {
        return false;
    }
}
export async function ensureDir(path) {
    await mkdir(path, { recursive: true });
}
export async function readJsonFile(path) {
    try {
        const raw = await readFile(path, "utf8");
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
export function hashToken(token) {
    return createHash("sha256").update(token).digest("hex");
}
export function shortId() {
    return randomUUID();
}
export function parseList(input) {
    if (!input)
        return [];
    const trimmed = input.trim();
    if (!trimmed)
        return [];
    if (trimmed.startsWith("[")) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed.map((item) => String(item)).filter(Boolean);
            }
        }
        catch {
            return [];
        }
    }
    return trimmed
        .split(/[,;]/)
        .map((value) => value.trim())
        .filter(Boolean);
}

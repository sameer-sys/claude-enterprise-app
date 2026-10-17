import { dirname, join, resolve } from "node:path";
import { openworkConfigDir } from "@openwork/paths";
import { ensureDir } from "./utils.js";
/**
 * Kept opaque so Bun's loader never eagerly pre-resolves the Node-only
 * builtin (Bun lacks node:sqlite and its speculative resolution can surface
 * as an unhandled rejection even though the guarded branch never runs).
 */
export const NODE_SQLITE_SPECIFIER = "node:sqlite";
export function importNodeSqlite() {
    return import(NODE_SQLITE_SPECIFIER);
}
export function runtimeDbPath(config) {
    const override = process.env.OPENWORK_RUNTIME_DB?.trim();
    if (override)
        return resolve(override);
    const configPath = config.configPath?.trim();
    const configDir = configPath ? dirname(configPath) : openworkConfigDir();
    return join(configDir, "runtime.sqlite");
}
/** Directory holding runtime state (the SQLite DB and derived files). */
export function runtimeStorageDir(config) {
    return dirname(runtimeDbPath(config));
}
export async function openRuntimeSqliteDatabase(path) {
    await ensureDir(dirname(path));
    if (typeof process.versions.bun === "string") {
        const { Database } = await import("bun:sqlite");
        const { drizzle } = await import("drizzle-orm/bun-sqlite");
        const sqlite = new Database(path, { create: true });
        return {
            kind: "bun",
            sqlite,
            db: drizzle(sqlite),
            close: () => sqlite.close(),
        };
    }
    const { DatabaseSync } = await importNodeSqlite();
    const sqlite = new DatabaseSync(path);
    return {
        kind: "node",
        sqlite,
        close: () => sqlite.close(),
    };
}

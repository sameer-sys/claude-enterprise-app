import { eq } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { importNodeSqlite, openRuntimeSqliteDatabase, runtimeDbPath } from "./runtime-db.js";
const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const dbByPath = new Map();
const tableDbByPath = new Map();
export function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validIdentifier(value, label) {
    if (!IDENTIFIER_RE.test(value))
        throw new Error(`Invalid ${label}: ${value}`);
    return value;
}
function validSchemaVersion(column) {
    if (!column)
        return undefined;
    validIdentifier(column.name, "extra column");
    return column;
}
function createTableSql(config) {
    const columns = [
        "workspace_id TEXT PRIMARY KEY NOT NULL",
        `${config.valueColumn} TEXT NOT NULL`,
        ...(config.schemaVersion ? [`${config.schemaVersion.name} ${config.schemaVersion.definition}`] : []),
        "updated_at INTEGER NOT NULL",
    ];
    return `CREATE TABLE IF NOT EXISTS ${config.tableName} (${columns.join(", ")})`;
}
function upsertSql(config) {
    const insertColumns = ["workspace_id", config.valueColumn, ...(config.schemaVersion ? [config.schemaVersion.name] : []), "updated_at"];
    const insertValues = ["?", "?", ...(config.schemaVersion ? [String(config.schemaVersion.value)] : []), "?"];
    const updateColumns = [config.valueColumn, ...(config.schemaVersion ? [config.schemaVersion.name] : []), "updated_at"];
    const updates = updateColumns.map((column) => `${column} = excluded.${column}`);
    return `INSERT INTO ${config.tableName} (${insertColumns.join(", ")}) VALUES (${insertValues.join(", ")}) ON CONFLICT(workspace_id) DO UPDATE SET ${updates.join(", ")}`;
}
function tableConfig(options) {
    const tableName = validIdentifier(options.tableName, "table name");
    const valueColumn = validIdentifier(options.valueColumn, "value column");
    const schemaVersion = validSchemaVersion(options.extraColumns?.schemaVersion);
    return {
        tableName,
        valueColumn,
        createTableSql: createTableSql({ tableName, valueColumn, schemaVersion }),
        selectSql: `SELECT ${valueColumn} AS valueJson, updated_at AS updatedAt FROM ${tableName} WHERE workspace_id = ?`,
        upsertSql: upsertSql({ tableName, valueColumn, schemaVersion }),
        ...(schemaVersion ? { schemaVersion } : {}),
    };
}
function rowFromUnknown(row) {
    if (!isRecord(row) || typeof row.valueJson !== "string")
        return undefined;
    return {
        valueJson: row.valueJson,
        updatedAt: typeof row.updatedAt === "number" ? row.updatedAt : null,
    };
}
async function runtimeDb(path) {
    const existing = dbByPath.get(path);
    if (existing)
        return existing;
    const db = openRuntimeSqliteDatabase(path);
    dbByPath.set(path, db);
    return db;
}
async function openTableDb(path, config) {
    const runtime = await runtimeDb(path);
    if (runtime.kind === "bun") {
        runtime.sqlite.run(config.createTableSql);
        const db = runtime.db;
        const schemaVersion = config.schemaVersion;
        if (schemaVersion) {
            const table = sqliteTable(config.tableName, {
                workspaceId: text("workspace_id").primaryKey(),
                valueJson: text(config.valueColumn).notNull(),
                schemaVersion: integer(schemaVersion.name).notNull().default(schemaVersion.value),
                updatedAt: integer("updated_at").notNull(),
            });
            return {
                get: (workspaceId) => db
                    .select({ valueJson: table.valueJson, updatedAt: table.updatedAt })
                    .from(table)
                    .where(eq(table.workspaceId, workspaceId))
                    .get(),
                upsert: ({ workspaceId, valueJson, updatedAt }) => {
                    db
                        .insert(table)
                        .values({ workspaceId, valueJson, schemaVersion: schemaVersion.value, updatedAt })
                        .onConflictDoUpdate({
                        target: table.workspaceId,
                        set: { valueJson, schemaVersion: schemaVersion.value, updatedAt },
                    })
                        .run();
                },
            };
        }
        const table = sqliteTable(config.tableName, {
            workspaceId: text("workspace_id").primaryKey(),
            valueJson: text(config.valueColumn).notNull(),
            updatedAt: integer("updated_at").notNull(),
        });
        return {
            get: (workspaceId) => db
                .select({ valueJson: table.valueJson, updatedAt: table.updatedAt })
                .from(table)
                .where(eq(table.workspaceId, workspaceId))
                .get(),
            upsert: ({ workspaceId, valueJson, updatedAt }) => {
                db
                    .insert(table)
                    .values({ workspaceId, valueJson, updatedAt })
                    .onConflictDoUpdate({
                    target: table.workspaceId,
                    set: { valueJson, updatedAt },
                })
                    .run();
            },
        };
    }
    const sqlite = runtime.sqlite;
    sqlite.exec(config.createTableSql);
    const get = sqlite.prepare(config.selectSql);
    const upsert = sqlite.prepare(config.upsertSql);
    return {
        get: (workspaceId) => rowFromUnknown(get.get(workspaceId)),
        upsert: ({ workspaceId, valueJson, updatedAt }) => {
            upsert.run(workspaceId, valueJson, updatedAt);
        },
    };
}
async function workspaceKvDb(path, config) {
    let tableDbs = tableDbByPath.get(path);
    if (!tableDbs) {
        tableDbs = new Map();
        tableDbByPath.set(path, tableDbs);
    }
    const existing = tableDbs.get(config.tableName);
    if (existing)
        return existing;
    const db = openTableDb(path, config);
    tableDbs.set(config.tableName, db);
    return db;
}
/**
 * Reads must never materialize the runtime DB. A fresh install reads stores
 * before anything is written (startup provider-auth sync is one), and opening
 * with create:true would grow the state directory and an empty SQLite file
 * just to learn there is nothing stored. A missing file reads like an empty
 * one. An already-open connection still wins: a write in flight has the file
 * on the way even when it is not on disk yet.
 */
async function readableWorkspaceKvDb(path, config) {
    const opened = tableDbByPath.get(path)?.get(config.tableName);
    if (opened)
        return opened;
    if (!dbByPath.has(path) && !existsSync(path))
        return undefined;
    return workspaceKvDb(path, config);
}
export function createWorkspaceKvStore(options) {
    const config = tableConfig(options);
    async function getRow(serverConfig, workspaceId) {
        const db = await readableWorkspaceKvDb(runtimeDbPath(serverConfig), config);
        const row = db?.get(workspaceId);
        return row ? { ...row, value: options.parse(row.valueJson) } : undefined;
    }
    async function setSerialized(serverConfig, workspaceId, valueJson, updatedAt) {
        const db = await workspaceKvDb(runtimeDbPath(serverConfig), config);
        db.upsert({ workspaceId, valueJson, updatedAt });
    }
    return {
        serialize: options.serialize,
        getRow,
        get: async (serverConfig, workspaceId) => {
            return (await getRow(serverConfig, workspaceId))?.value;
        },
        /** Reads existing state without initializing the DB, table, or shared write cache. */
        getExisting: async (serverConfig, workspaceId) => {
            const path = runtimeDbPath(serverConfig);
            try {
                await stat(path);
            }
            catch (error) {
                if (isRecord(error) && error.code === "ENOENT")
                    return undefined;
                throw error;
            }
            const sqlite = typeof process.versions.bun === "string"
                ? new (await import("bun:sqlite")).Database(path, { readonly: true, create: false })
                : new (await importNodeSqlite()).DatabaseSync(path, { readOnly: true });
            try {
                const table = sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? COLLATE NOCASE").get(config.tableName);
                if (!table)
                    return undefined;
                const row = rowFromUnknown(sqlite.prepare(config.selectSql).get(workspaceId));
                return row ? options.parse(row.valueJson) : undefined;
            }
            finally {
                sqlite.close();
            }
        },
        has: async (serverConfig, workspaceId) => {
            const db = await readableWorkspaceKvDb(runtimeDbPath(serverConfig), config);
            return Boolean(db?.get(workspaceId));
        },
        set: async (serverConfig, workspaceId, value, updatedAt = Date.now()) => {
            await setSerialized(serverConfig, workspaceId, options.serialize(value), updatedAt);
        },
        setSerialized,
    };
}
export function workspaceKvStoreCacheStatsForTests(path) {
    return {
        connectionEntries: dbByPath.has(path) ? 1 : 0,
        tableEntries: tableDbByPath.get(path)?.size ?? 0,
    };
}

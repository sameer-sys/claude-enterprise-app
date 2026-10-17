import { dirname, join, resolve } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { openworkConfigDir } from "@openwork/paths";
import { ensureDir, exists, hashToken, shortId } from "./utils.js";
function normalizeScope(value) {
    if (value === "owner" || value === "collaborator" || value === "viewer")
        return value;
    return null;
}
function resolveTokenStorePath(config) {
    const override = (process.env.OPENWORK_TOKEN_STORE ?? "").trim();
    if (override)
        return resolve(override);
    const configPath = config.configPath?.trim();
    const configDir = configPath ? dirname(configPath) : openworkConfigDir();
    return join(configDir, "tokens.json");
}
async function readTokenStore(path) {
    if (!(await exists(path))) {
        return { schemaVersion: 1, updatedAt: Date.now(), tokens: [] };
    }
    try {
        const raw = await readFile(path, "utf8");
        const parsed = JSON.parse(raw);
        const tokens = Array.isArray(parsed.tokens)
            ? parsed.tokens
                .map((token) => {
                const record = token;
                const id = typeof record.id === "string" ? record.id : "";
                const hash = typeof record.hash === "string" ? record.hash : "";
                const scope = normalizeScope(record.scope);
                const createdAt = typeof record.createdAt === "number" ? record.createdAt : Date.now();
                const label = typeof record.label === "string" ? record.label : undefined;
                if (!id || !hash || !scope)
                    return null;
                const parsedRecord = {
                    id,
                    hash,
                    scope,
                    createdAt,
                    ...(label ? { label } : {}),
                };
                return parsedRecord;
            })
                .filter((token) => Boolean(token))
            : [];
        return {
            schemaVersion: typeof parsed.schemaVersion === "number" ? parsed.schemaVersion : 1,
            updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
            tokens,
        };
    }
    catch {
        return { schemaVersion: 1, updatedAt: Date.now(), tokens: [] };
    }
}
async function writeTokenStore(path, tokens) {
    await ensureDir(dirname(path));
    const payload = {
        schemaVersion: 1,
        updatedAt: Date.now(),
        tokens,
    };
    await writeFile(path, JSON.stringify(payload, null, 2) + "\n", "utf8");
}
export class TokenService {
    config;
    path;
    loaded = false;
    tokens = [];
    byHash = new Map();
    constructor(config) {
        this.config = config;
        this.path = resolveTokenStorePath(config);
    }
    async ensureLoaded() {
        if (this.loaded)
            return;
        const store = await readTokenStore(this.path);
        this.tokens = store.tokens;
        this.byHash = new Map(store.tokens.map((token) => [token.hash, token]));
        this.loaded = true;
    }
    async list() {
        await this.ensureLoaded();
        return this.tokens.map(({ hash: _hash, ...rest }) => rest);
    }
    async create(scope, options) {
        await this.ensureLoaded();
        const id = shortId();
        const token = `owt_${shortId().replace(/-/g, "")}`;
        const createdAt = Date.now();
        const record = {
            id,
            hash: hashToken(token),
            scope,
            createdAt,
            label: options?.label?.trim() || undefined,
        };
        this.tokens = [record, ...this.tokens];
        this.byHash.set(record.hash, record);
        await writeTokenStore(this.path, this.tokens);
        return { id, token, scope, createdAt, label: record.label };
    }
    async revoke(id) {
        await this.ensureLoaded();
        const index = this.tokens.findIndex((token) => token.id === id);
        if (index === -1)
            return false;
        const [removed] = this.tokens.splice(index, 1);
        if (removed) {
            this.byHash.delete(removed.hash);
        }
        await writeTokenStore(this.path, this.tokens);
        return true;
    }
    async scopeForToken(token) {
        const trimmed = token.trim();
        if (!trimmed)
            return null;
        if (trimmed === this.config.token)
            return "collaborator";
        await this.ensureLoaded();
        const found = this.byHash.get(hashToken(trimmed));
        return found?.scope ?? null;
    }
}

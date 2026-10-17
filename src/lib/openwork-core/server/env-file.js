import { platform } from "node:os";
import { chmod, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { openworkEnvStorePath } from "@openwork/paths";
import { ensureDir, exists } from "./utils.js";
// User-level environment variables, persisted so the desktop shell can inject
// them into every spawned child (OpenCode and OpenWork server).
// Motivation: Linux GUI launches don't inherit shell env, so users set
// ANTHROPIC_API_KEY / GCLOUD_* / GCP_* in .bashrc and hit silent auth failures.
// Scope: user/machine, not workspace. Not synced to the cloud.
const ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
// Keys reserved for internal wiring by the desktop shell and server. This UI
// is for service credentials, not OpenWork/OpenCode runtime knobs; users who
// need OPENCODE_* process settings should set them from the launching shell.
// We refuse writes to these and strip them when reading for injection, so a
// tampered file cannot shadow auth credentials, token paths, or process
// identity.
const RESERVED_PREFIXES = ["OPENWORK_", "OPENCODE_"];
const PERSISTABLE_INTERNAL_KEYS = new Set([
    "OPENWORK_API_KEY",
    "OPENWORK_MODELS_API_KEY",
    "OPENWORK_INFERENCE_BASE_URL",
    "OPENWORK_MODELS_BASE_URL",
]);
export function isValidEnvKey(key) {
    return ENV_KEY_PATTERN.test(key);
}
export function isReservedEnvKey(key) {
    return isInternalEnvKey(key) && !PERSISTABLE_INTERNAL_KEYS.has(key);
}
function isInternalEnvKey(key) {
    return RESERVED_PREFIXES.some((prefix) => key.startsWith(prefix));
}
export function resolveDefaultEnvStorePath() {
    return openworkEnvStorePath();
}
function parseRecord(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const record = raw;
    const key = typeof record.key === "string" ? record.key : "";
    const value = typeof record.value === "string" ? record.value : "";
    if (!isValidEnvKey(key))
        return null;
    return {
        key,
        value,
        updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : Date.now(),
    };
}
function emptyStore() {
    return { schemaVersion: 1, updatedAt: Date.now(), variables: [] };
}
async function readStore(path, options = {}) {
    if (!(await exists(path))) {
        return emptyStore();
    }
    let raw = "";
    try {
        raw = await readFile(path, "utf8");
    }
    catch (error) {
        if (error.code === "ENOENT")
            return emptyStore();
        if (options.tolerateInvalid)
            return emptyStore();
        throw new EnvStoreReadError("Environment variable store could not be read");
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        if (options.tolerateInvalid)
            return emptyStore();
        throw new EnvStoreReadError("Environment variable store is invalid JSON");
    }
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.variables)) {
        if (options.tolerateInvalid)
            return emptyStore();
        throw new EnvStoreReadError("Environment variable store has an invalid format");
    }
    const variables = parsed.variables
        .map(parseRecord)
        .filter((entry) => Boolean(entry));
    return {
        schemaVersion: typeof parsed.schemaVersion === "number" ? parsed.schemaVersion : 1,
        updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
        variables,
    };
}
async function writeStore(path, variables) {
    const dir = dirname(path);
    await ensureDir(dir);
    const payload = {
        schemaVersion: 1,
        updatedAt: Date.now(),
        variables,
    };
    const tempPath = join(dir, `.env.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`);
    await writeFile(tempPath, JSON.stringify(payload, null, 2) + "\n", {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
    });
    try {
        await chmod(tempPath, 0o600);
    }
    catch (error) {
        // chmod is a no-op on Windows; values may still contain secrets.
        if (platform() !== "win32") {
            await rm(tempPath, { force: true }).catch(() => { });
            throw error;
        }
    }
    try {
        await rename(tempPath, path);
    }
    catch (error) {
        await rm(tempPath, { force: true }).catch(() => { });
        throw error;
    }
    try {
        await chmod(path, 0o600);
    }
    catch (error) {
        // chmod is a no-op on Windows; values may still contain secrets.
        if (platform() !== "win32")
            throw error;
    }
}
export class EnvService {
    path;
    loaded = false;
    loadPromise = null;
    mutationQueue = Promise.resolve();
    variables = [];
    changeListeners = new Set();
    onChange(listener) {
        this.changeListeners.add(listener);
        return () => { this.changeListeners.delete(listener); };
    }
    constructor(options) {
        this.path = options?.path ? resolve(options.path) : resolveDefaultEnvStorePath();
    }
    async ensureLoaded() {
        if (this.loaded)
            return;
        if (!this.loadPromise) {
            this.loadPromise = readStore(this.path)
                .then((store) => {
                this.variables = store.variables;
                this.loaded = true;
            })
                .finally(() => {
                this.loadPromise = null;
            });
        }
        await this.loadPromise;
    }
    enqueueMutation(operation) {
        const run = this.mutationQueue.catch(() => { }).then(operation);
        this.mutationQueue = run.then(() => { }, () => { });
        return run;
    }
    async list() {
        await this.ensureLoaded();
        return this.variables.slice();
    }
    async upsertMany(entries) {
        return this.enqueueMutation(async () => {
            await this.ensureLoaded();
            const now = Date.now();
            const next = new Map(this.variables.map((entry) => [entry.key, entry]));
            for (const entry of entries) {
                if (!isValidEnvKey(entry.key)) {
                    throw new InvalidEnvKeyError(entry.key, "invalid_env_key");
                }
                if (isReservedEnvKey(entry.key)) {
                    throw new InvalidEnvKeyError(entry.key, "reserved_env_key");
                }
                next.set(entry.key, { key: entry.key, value: entry.value, updatedAt: now });
            }
            const nextVariables = Array.from(next.values()).sort((a, b) => a.key.localeCompare(b.key));
            await writeStore(this.path, nextVariables);
            this.variables = nextVariables;
            for (const listener of this.changeListeners)
                listener();
        });
    }
    async delete(key) {
        return this.enqueueMutation(async () => {
            await this.ensureLoaded();
            const before = this.variables.length;
            const nextVariables = this.variables.filter((entry) => entry.key !== key);
            if (nextVariables.length === before)
                return false;
            await writeStore(this.path, nextVariables);
            this.variables = nextVariables;
            for (const listener of this.changeListeners)
                listener();
            return true;
        });
    }
    // Used by the Electron shell at spawn time. Keep desktop runtime injection
    // in sync on path resolution and reserved-keys policy.
    static async readForInjection(overridePath) {
        const path = overridePath?.trim() ? resolve(overridePath.trim()) : resolveDefaultEnvStorePath();
        const store = await readStore(path, { tolerateInvalid: true });
        const out = {};
        for (const entry of store.variables) {
            if (isInternalEnvKey(entry.key))
                continue;
            out[entry.key] = entry.value;
        }
        return out;
    }
}
export class EnvStoreReadError extends Error {
    code = "invalid_env_store";
}
export class InvalidEnvKeyError extends Error {
    code;
    constructor(key, code) {
        super(code === "reserved_env_key"
            ? `Environment variable name is reserved for OpenWork internals: ${key}`
            : `Invalid environment variable name: ${key}`);
        this.code = code;
    }
}

/**
 * Persisted registry of managed OpenCode engine processes.
 *
 * The engine URL/port live only in memory (ServerConfig), so an unclean
 * OpenWork server exit orphans its engine child with no record to clean up.
 * Packaged desktop builds have a `ps`-based sweep, but dev builds and Windows
 * have nothing. This registry records every managed spawn on disk so the next
 * server boot can reap provable orphans — and nothing else.
 *
 * Reaping errs toward NOT killing: a leaked orphan is recoverable on a later
 * boot, killing a stranger's process is not. A recorded pid is only killed
 * when its owning server is gone, the pid still looks like the engine we
 * spawned (command match), and the recorded per-spawn credentials do not
 * prove the port now belongs to someone else.
 */
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { runtimeStorageDir } from "./runtime-db.js";
import { loopbackFetch } from "./server-fetch.js";
export function engineRegistryFilePath(config) {
    return join(runtimeStorageDir(config), "engine-instances.json");
}
export function buildEngineAuthProbeHeader(username, password) {
    return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseEntry(value) {
    if (!isRecord(value))
        return null;
    const pid = Number(value.pid);
    const port = Number(value.port);
    const ownerPid = Number(value.ownerPid);
    if (typeof value.id !== "string" || !value.id.trim())
        return null;
    if (!Number.isInteger(pid) || pid <= 0)
        return null;
    if (!Number.isInteger(port) || port <= 0 || port > 65535)
        return null;
    if (!Number.isInteger(ownerPid) || ownerPid <= 0)
        return null;
    if (typeof value.url !== "string" || !value.url.trim())
        return null;
    const role = value.role === "primary" || value.role === "draining" || value.role === "starting"
        ? value.role
        : "primary";
    return {
        id: value.id,
        pid,
        port,
        url: value.url,
        startedAt: Number(value.startedAt) || 0,
        role,
        serverRunId: typeof value.serverRunId === "string" ? value.serverRunId : "",
        ownerPid,
        authProbe: typeof value.authProbe === "string" ? value.authProbe : "",
        bin: typeof value.bin === "string" ? value.bin : "",
    };
}
async function readRegistryFile(path) {
    const content = await readFile(path, "utf8").catch(() => undefined);
    if (!content)
        return [];
    try {
        const parsed = JSON.parse(content);
        if (!isRecord(parsed) || !Array.isArray(parsed.entries))
            return [];
        return parsed.entries
            .map(parseEntry)
            .filter((entry) => entry !== null);
    }
    catch {
        // A corrupt registry must never block startup; treat it as empty and let
        // the next write replace it.
        return [];
    }
}
// Serialize writes per path so concurrent register/remove calls can never
// interleave a stale read-modify-write over a newer one.
const registryWriteQueue = new Map();
async function mutateRegistry(config, mutate) {
    const path = engineRegistryFilePath(config);
    const job = async () => {
        const entries = mutate(await readRegistryFile(path));
        const payload = { version: 1, entries };
        await mkdir(runtimeStorageDir(config), { recursive: true });
        const tmp = `${path}.${randomUUID()}.tmp`;
        // 0600: the auth probe header embeds this spawn's engine credentials.
        await writeFile(tmp, `${JSON.stringify(payload, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
        await rename(tmp, path).catch(async (error) => {
            await rm(tmp, { force: true }).catch(() => undefined);
            throw error;
        });
        return entries;
    };
    const previous = registryWriteQueue.get(path) ?? Promise.resolve();
    const next = previous.then(job, job);
    registryWriteQueue.set(path, next);
    return await next;
}
export async function readEngineRegistry(config) {
    return readRegistryFile(engineRegistryFilePath(config));
}
export async function registerEngineInstance(config, record) {
    await mutateRegistry(config, (entries) => [
        ...entries.filter((entry) => entry.id !== record.id),
        record,
    ]);
}
export async function updateEngineInstanceRole(config, id, role) {
    await mutateRegistry(config, (entries) => entries.map((entry) => (entry.id === id ? { ...entry, role } : entry)));
}
export async function removeEngineInstance(config, id) {
    await mutateRegistry(config, (entries) => entries.filter((entry) => entry.id !== id));
}
function processAlive(pid) {
    if (!Number.isInteger(pid) || pid <= 0)
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch (error) {
        // EPERM means the pid exists but belongs to another user.
        return error.code === "EPERM";
    }
}
/**
 * Best-effort command line for a pid. Returns null when it cannot be read —
 * callers must treat null as "unknown", never as "not the engine".
 */
function processCommand(pid) {
    try {
        if (process.platform === "win32") {
            const result = spawnSync("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], { encoding: "utf8" });
            if (result.status !== 0)
                return null;
            const row = String(result.stdout ?? "").split(/\r?\n/).find((line) => line.includes(`"${pid}"`));
            if (!row)
                return null;
            const command = row.split('","')[0]?.replace(/^"/, "");
            return command?.trim() || null;
        }
        const result = spawnSync("ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8" });
        if (result.status !== 0)
            return null;
        const command = String(result.stdout ?? "").trim();
        return command || null;
    }
    catch {
        return null;
    }
}
function commandMatchesEngine(command, bin) {
    const lower = command.toLowerCase();
    if (/(^|[/\\ ])opencode[^/\\ ]*( |$)/.test(lower) && lower.includes("serve"))
        return true;
    const binBase = basename(bin.trim()).toLowerCase();
    return binBase.length > 0 && lower.includes(binBase);
}
async function probeEngineIdentity(entry, timeoutMs) {
    let target;
    try {
        target = new URL("/global/health", entry.url).toString();
    }
    catch {
        return "unreachable";
    }
    try {
        const response = await loopbackFetch(target, {
            headers: entry.authProbe ? { Authorization: entry.authProbe } : {},
            signal: AbortSignal.timeout(timeoutMs),
        });
        if (response.ok)
            return "ours";
        if (response.status === 401 || response.status === 403)
            return "stranger";
        return "unreachable";
    }
    catch {
        return "unreachable";
    }
}
function killEngineProcess(pid) {
    if (process.platform === "win32") {
        // /T kills the tree so engine-spawned children (stdio MCPs, LSPs) go too.
        spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { encoding: "utf8" });
        return;
    }
    try {
        process.kill(pid, "SIGTERM");
    }
    catch {
        return;
    }
}
async function delay(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Kill engine processes recorded by dead OpenWork servers, drop entries that
 * can no longer be verified, and keep entries whose owning server is alive.
 *
 * Kill requires all of: the recorded owner process is gone, the recorded pid
 * is alive AND its command still looks like the engine we spawned, and the
 * identity probe did not prove the port belongs to a different process.
 */
export async function reapOrphanEngineInstances(config, options) {
    const probeTimeoutMs = options?.probeTimeoutMs ?? 1000;
    const killWaitMs = options?.killWaitMs ?? 1000;
    const result = { killed: [], spared: [], dropped: [] };
    const kept = [];
    const toKill = [];
    for (const entry of await readEngineRegistry(config)) {
        if (entry.ownerPid === process.pid || processAlive(entry.ownerPid)) {
            // A live OpenWork server (possibly the CLI next to the desktop) still
            // owns this engine.
            kept.push(entry);
            result.spared.push(entry.pid);
            continue;
        }
        if (!processAlive(entry.pid)) {
            result.dropped.push(entry.pid);
            continue;
        }
        const command = processCommand(entry.pid);
        if (command !== null && !commandMatchesEngine(command, entry.bin)) {
            // Pid was reused by an unrelated process.
            result.dropped.push(entry.pid);
            continue;
        }
        const probe = await probeEngineIdentity(entry, probeTimeoutMs);
        if (probe === "stranger") {
            // The port answers with different credentials, so we cannot prove the
            // recorded pid is still ours. Drop the record rather than risk a kill.
            result.dropped.push(entry.pid);
            continue;
        }
        if (command === null && probe !== "ours") {
            // No command evidence and no credential evidence: never kill blind.
            result.dropped.push(entry.pid);
            continue;
        }
        toKill.push(entry);
    }
    for (const entry of toKill) {
        killEngineProcess(entry.pid);
    }
    if (toKill.length > 0 && process.platform !== "win32") {
        await delay(killWaitMs);
        for (const entry of toKill) {
            if (processAlive(entry.pid)) {
                try {
                    process.kill(entry.pid, "SIGKILL");
                }
                catch {
                    // Exited between the check and the kill.
                }
            }
        }
    }
    for (const entry of toKill) {
        result.killed.push(entry.pid);
        options?.logger?.log("info", `Reaped orphaned managed OpenCode engine (pid ${entry.pid}).`, {
            "engine.pid": entry.pid,
            "engine.port": entry.port,
            "engine.owner_pid": entry.ownerPid,
            "engine.role": entry.role,
        });
    }
    await mutateRegistry(config, (entries) => {
        const removed = new Set([...result.killed, ...result.dropped]);
        const surviving = entries.filter((entry) => !removed.has(entry.pid));
        // Preserve records added while the reap was scanning.
        const known = new Set(kept.map((entry) => entry.id));
        return [...kept, ...surviving.filter((entry) => !known.has(entry.id))];
    }).catch(() => undefined);
    return result;
}

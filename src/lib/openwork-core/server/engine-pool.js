/**
 * Blue/green rollover for the managed OpenCode engine.
 *
 * A config change the engine can only read at instance build time (provider
 * blocks, plugins, agents, permissions) normally forces a dispose, which
 * aborts every run in flight. Deferring the dispose until the engine idles
 * avoids the abort but leaves config hostage to long sessions.
 *
 * This pool takes the third option when a reload lands on a busy engine:
 * spawn a standby with the new config, point every new request at it, and
 * keep the old engine alive only until its running sessions finish. Sessions
 * live in OpenCode's shared SQLite, so only the live run is process-bound.
 *
 * Steady state stays one engine. During a drain there are two, and never more
 * than two long-lived ones: a config change arriving mid-drain coalesces into
 * a single pending rollover (latest wins) instead of stacking processes.
 *
 * Always on for managed engines. Attached engines have no pool, so their
 * callers keep the defer-while-busy behavior instead.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { buildEngineAuthProbeHeader, registerEngineInstance, removeEngineInstance, updateEngineInstanceRole, } from "./engine-registry.js";
import { createManagedOpencodeServer } from "./managed-opencode.js";
import { loopbackFetch } from "./server-fetch.js";
export function rolloverOutcomeApplied(outcome) {
    return outcome.action === "updated_live" || outcome.action === "reloaded_in_place" || outcome.action === "rolled_over";
}
function positiveIntFromEnv(name, fallback) {
    const raw = Number(process.env[name]);
    return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}
/** Same, but an explicit 0 is meaningful (it disables the throttle). */
function nonNegativeIntFromEnv(name, fallback) {
    const value = process.env[name]?.trim();
    if (!value)
        return fallback;
    const raw = Number(value);
    return Number.isFinite(raw) && raw >= 0 ? raw : fallback;
}
/**
 * How long a draining engine may go without any owned-session activity before
 * its sessions are aborted. Activity on the engine event stream pushes the
 * deadline out, so this bounds inactivity, not total drain time.
 */
function drainTimeoutMs() {
    return positiveIntFromEnv("OPENWORK_ENGINE_DRAIN_TIMEOUT_MS", 15 * 60_000);
}
/** Delay before the drain activity watch reconnects to a lost engine event stream. */
function drainActivityReconnectMs() {
    return positiveIntFromEnv("OPENWORK_ENGINE_DRAIN_ACTIVITY_RECONNECT_MS", 1_000);
}
/** Floor between automatic spawns, so a burst of triggers cannot thrash. 0 disables it. */
function minSpawnIntervalMs() {
    return nonNegativeIntFromEnv("OPENWORK_ENGINE_MIN_SPAWN_INTERVAL_MS", 30_000);
}
function drainPollIntervalMs() {
    return positiveIntFromEnv("OPENWORK_ENGINE_DRAIN_POLL_MS", 5_000);
}
/** Grace given to aborted sessions to unwind before the engine is closed. */
function abortSettleMs() {
    return nonNegativeIntFromEnv("OPENWORK_ENGINE_ABORT_SETTLE_MS", 5_000);
}
/**
 * Budget for seeding a healthy standby (managed provider credentials) before
 * it may become primary. A seed that hangs past this is a failed rollover,
 * never a silent flip onto an engine without keys.
 */
function standbyPrepareTimeoutMs() {
    return positiveIntFromEnv("OPENWORK_ENGINE_STANDBY_PREPARE_TIMEOUT_MS", 30_000);
}
function portOf(url) {
    try {
        return Number(new URL(url).port) || 0;
    }
    catch {
        return 0;
    }
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function isEngineConnectionFailure(error) {
    // Node/undici occasionally drops the transport cause. This classifier is
    // only used for managed OpenCode engine traffic, never external egress.
    if (error instanceof TypeError && error.message === "fetch failed" && error.cause === undefined)
        return true;
    const visited = new Set();
    let current = error;
    for (let depth = 0; depth < 6 && current !== null && current !== undefined; depth += 1) {
        if (typeof current === "string") {
            return /ECONNREFUSED|ECONNRESET|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|UND_ERR_HEADERS_TIMEOUT|socket hang up|Unable to connect|Headers Timeout Error/i.test(current);
        }
        if (!isRecord(current) || visited.has(current))
            return false;
        visited.add(current);
        const code = current.code;
        if (code === "ECONNREFUSED" || code === "ECONNRESET" || code === "ETIMEDOUT" || code === "UND_ERR_CONNECT_TIMEOUT" || code === "UND_ERR_HEADERS_TIMEOUT")
            return true;
        const message = current.message;
        if (typeof message === "string" && /ECONNREFUSED|ECONNRESET|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|UND_ERR_HEADERS_TIMEOUT|socket hang up|Unable to connect|Headers Timeout Error/i.test(message))
            return true;
        current = current.cause;
    }
    return false;
}
function isRoutableGeneration(generation) {
    return generation.status === "primary" || generation.status === "draining";
}
function normalizeProxyPath(proxyPath) {
    const raw = proxyPath.trim() || "/";
    const withoutPrefix = raw.startsWith("/opencode") ? raw.slice("/opencode".length) : raw;
    const normalized = (withoutPrefix || "/").replace(/\/+$/, "");
    return normalized || "/";
}
function decodePathPart(value) {
    if (!value)
        return null;
    try {
        return decodeURIComponent(value);
    }
    catch {
        return value;
    }
}
function sessionIdFromPath(proxyPath) {
    const match = normalizeProxyPath(proxyPath).match(/^\/(?:api\/)?session\/([^/]+)(?:\/|$)/);
    const sessionId = decodePathPart(match?.[1]);
    return sessionId === "status" ? null : sessionId;
}
function requestIdFromPath(proxyPath) {
    const normalized = normalizeProxyPath(proxyPath);
    const legacy = normalized.match(/^\/(?:permission|question)\/([^/]+)\/(?:reply|reject)$/);
    if (legacy)
        return decodePathPart(legacy[1]);
    const scoped = normalized.match(/^\/api\/session\/[^/]+\/(?:permission|question)\/([^/]+)\/(?:reply|reject)$/);
    return decodePathPart(scoped?.[1]);
}
function isLegacyPromptReply(proxyPath) {
    return /^\/(?:permission|question)\/[^/]+\/(?:reply|reject)$/.test(normalizeProxyPath(proxyPath));
}
function isPromptishSessionRequest(method, proxyPath) {
    if (method.toUpperCase() !== "POST")
        return false;
    const normalized = normalizeProxyPath(proxyPath);
    return /^\/(?:api\/)?session\/[^/]+\/(?:message|prompt(?:_async)?|command|shell)(?:\/|$)/.test(normalized);
}
function firstString(record, keys) {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value.trim())
            return value.trim();
    }
    return null;
}
function requestRecords(payload) {
    if (Array.isArray(payload))
        return payload.filter(isRecord);
    if (!isRecord(payload))
        return [];
    for (const key of ["items", "permissions", "questions", "requests"]) {
        const value = payload[key];
        if (Array.isArray(value))
            return value.filter(isRecord);
    }
    return [];
}
function eventIdentifiers(payload) {
    const sessionIds = new Set();
    const requestIds = new Set();
    const visit = (value, depth) => {
        if (depth > 6 || !isRecord(value))
            return;
        for (const [key, item] of Object.entries(value)) {
            if (typeof item === "string") {
                if (["sessionID", "sessionId", "session_id"].includes(key))
                    sessionIds.add(item);
                if (["requestID", "requestId", "permissionID", "questionID"].includes(key))
                    requestIds.add(item);
                continue;
            }
            if (Array.isArray(item)) {
                for (const child of item)
                    visit(child, depth + 1);
            }
            else {
                visit(item, depth + 1);
            }
        }
    };
    visit(payload, 0);
    return { sessionIds, requestIds };
}
/**
 * Cap on the text one unterminated SSE frame may buffer before the stream is
 * treated as malformed. Sized well above any legitimate single engine event
 * (large tool outputs included) so real frames are never truncated; only a
 * stream that stops terminating frames hits it.
 */
export const ENGINE_SSE_FRAME_MAX_CHARS = 4 * 1024 * 1024;
/**
 * Incremental SSE frame splitter shared by the client event fan-in and the
 * drain activity watch. It bounds the memory a single unterminated frame can
 * hold: completed frames are always returned, and `overflow` turns true once
 * the pending remainder exceeds the cap so the caller can drop that
 * connection instead of buffering it forever.
 */
export class BoundedSseFrameBuffer {
    maxFrameChars;
    decoder = new TextDecoder();
    buffered = "";
    constructor(maxFrameChars = ENGINE_SSE_FRAME_MAX_CHARS) {
        this.maxFrameChars = maxFrameChars;
    }
    push(chunk) {
        this.buffered += this.decoder.decode(chunk, { stream: true });
        const frames = [];
        while (true) {
            const delimiter = this.buffered.match(/\r?\n\r?\n/);
            if (!delimiter || delimiter.index === undefined)
                break;
            frames.push(this.buffered.slice(0, delimiter.index));
            this.buffered = this.buffered.slice(delimiter.index + delimiter[0].length);
        }
        return { frames, overflow: this.buffered.length > this.maxFrameChars };
    }
}
/** Decode one SSE frame's `data:` payload; null when the frame carries none. */
function sseFramePayload(frame) {
    const data = frame
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice("data:".length).trim())
        .join("\n");
    if (!data)
        return null;
    try {
        return JSON.parse(data);
    }
    catch {
        return null;
    }
}
/**
 * Everything a spawned engine reads at build time. Comparing this is what
 * lets a repeated no-op reload skip spawning a replacement.
 */
export async function computeEngineConfigFingerprint(template) {
    const content = await readFile(template.runtimeConfigPath, "utf8").catch(() => "");
    return createHash("sha256")
        .update(content)
        .update("\u0000")
        .update(template.bin?.trim() ?? "")
        .update("\u0000")
        .update(template.env.OPENCODE_MODELS_URL ?? "")
        .digest("hex");
}
/** The engine directory an in-place reload disposes for this workspace. */
function directoryKey(workspace) {
    return workspace.directory?.trim() || workspace.path;
}
export class EnginePool {
    config;
    template;
    hooks;
    generations = [];
    inFlight = null;
    pendingRollover = null;
    /** Callers coalesced into `pendingRollover`; settled when that rollover runs. */
    pendingWaiters = [];
    lastSpawnAt = 0;
    consecutiveConnectionFailures = 0;
    lastRecoveryAt = Number.NEGATIVE_INFINITY;
    recoveryTimer = null;
    recoveryWorkspace = null;
    recoveryInFlight = null;
    recoveryOrphan = null;
    disposed = false;
    sessionOwnership = new Map();
    pinnedRequests = new Map();
    activeSessionsByGeneration = new Map();
    eventProxyControllers = new Set();
    drainWaiters = new Set();
    constructor(input) {
        this.config = input.config;
        this.template = input.template;
        this.hooks = input.hooks;
    }
    /** Directory every generation of this engine starts in. */
    cwd() {
        return this.template.cwd;
    }
    /**
     * Register the engine spawned during startup as the first generation, so a
     * later rollover knows what it is replacing.
     */
    adoptPrimary(input) {
        this.generations.push({
            id: randomUUID(),
            handle: input.handle,
            status: "primary",
            spawnedAt: Date.now(),
            fingerprint: input.fingerprint,
            reloadedDirectories: new Map(),
            registryId: input.registryId,
            trustedIdentity: input.trustedIdentity,
            drainTimer: null,
            drainDeadline: null,
            drainActivityWatch: null,
        });
        this.lastSpawnAt = Date.now();
    }
    primaryUrl() {
        return this.generations.find((entry) => entry.status === "primary")?.handle.url ?? null;
    }
    primaryProcess() {
        const primary = this.generations.find((entry) => entry.status === "primary") ?? null;
        return primary ? { pid: primary.handle.pid ?? null, isAlive: primary.handle.isAlive } : null;
    }
    reportRequestSuccess(baseUrl) {
        if (this.isPrimaryEndpoint(baseUrl))
            this.consecutiveConnectionFailures = 0;
    }
    reportRequestFailure(baseUrl, error, workspace) {
        if (!this.isPrimaryEndpoint(baseUrl) || !isEngineConnectionFailure(error))
            return;
        this.consecutiveConnectionFailures += 1;
        if (this.consecutiveConnectionFailures < 3)
            return;
        const now = this.now();
        if (now - this.lastRecoveryAt < minSpawnIntervalMs())
            return;
        this.consecutiveConnectionFailures = 0;
        this.lastRecoveryAt = now;
        this.recoveryWorkspace = workspace;
        void this.recoverDeadPrimary(workspace).catch(() => undefined);
    }
    connections() {
        return this.generations
            .filter(isRoutableGeneration)
            .sort((left, right) => left.status === right.status ? 0 : left.status === "primary" ? -1 : 1)
            .map((entry) => this.connectionFor(entry));
    }
    routeRequest(method, proxyPath) {
        const primary = this.generations.find((entry) => entry.status === "primary") ?? null;
        if (!primary)
            return null;
        const primaryConnection = this.connectionFor(primary);
        const sessionId = sessionIdFromPath(proxyPath);
        if (sessionId) {
            const owner = this.generationForId(this.sessionOwnership.get(sessionId));
            if (owner) {
                const active = this.activeSessionsByGeneration.get(owner.id)?.has(sessionId) === true;
                if (isPromptishSessionRequest(method, proxyPath) && !active) {
                    this.sessionOwnership.delete(sessionId);
                }
                else {
                    return { target: this.connectionFor(owner), fallback: null };
                }
            }
        }
        const requestId = requestIdFromPath(proxyPath);
        if (requestId) {
            const owner = this.generationForId(this.pinnedRequests.get(requestId));
            if (owner) {
                const alternate = isLegacyPromptReply(proxyPath)
                    ? this.generations.find((entry) => isRoutableGeneration(entry) && entry.id !== owner.id) ?? null
                    : null;
                return {
                    target: this.connectionFor(owner),
                    fallback: alternate && isRoutableGeneration(alternate) ? this.connectionFor(alternate) : null,
                };
            }
        }
        const draining = this.generations.find((entry) => entry.status === "draining") ?? null;
        const fallback = draining && isLegacyPromptReply(proxyPath) ? this.connectionFor(draining) : null;
        return { target: primaryConnection, fallback };
    }
    /** Live proxied event streams, i.e. clients currently listening to this engine. */
    eventProxyCount() {
        return this.eventProxyControllers.size;
    }
    openEventProxy(clientSignal) {
        const controller = new AbortController();
        this.eventProxyControllers.add(controller);
        const signal = clientSignal
            ? AbortSignal.any([clientSignal, controller.signal])
            : controller.signal;
        let released = false;
        return {
            signal,
            release: () => {
                if (released)
                    return;
                released = true;
                this.eventProxyControllers.delete(controller);
            },
        };
    }
    /**
     * How the event fan-in should treat frames from a generation. With one
     * primary generation and no ownership pinned elsewhere, every frame is
     * forwarded verbatim and never parsed; `filter` requires the payload-level
     * check in `shouldForwardEvent`, which is what a rollover needs.
     */
    eventForwardMode(generationId) {
        const generation = this.generationForId(generationId);
        if (!generation)
            return "drop";
        if (generation.status !== "primary" || this.generations.filter(isRoutableGeneration).length !== 1)
            return "filter";
        for (const owner of this.sessionOwnership.values())
            if (owner !== generation.id)
                return "filter";
        for (const owner of this.pinnedRequests.values())
            if (owner !== generation.id)
                return "filter";
        return "forward";
    }
    shouldForwardEvent(generationId, payload) {
        const generation = this.generationForId(generationId);
        if (!generation)
            return false;
        const identifiers = eventIdentifiers(payload);
        if (generation.status === "draining") {
            const ownedSession = [...identifiers.sessionIds].some((id) => this.sessionOwnership.get(id) === generation.id);
            if (ownedSession) {
                for (const requestId of identifiers.requestIds)
                    this.pinnedRequests.set(requestId, generation.id);
            }
            return ownedSession || [...identifiers.requestIds].some((id) => this.pinnedRequests.get(id) === generation.id);
        }
        return ![...identifiers.sessionIds].some((id) => {
            const owner = this.sessionOwnership.get(id);
            return owner !== undefined && owner !== generation.id;
        }) && ![...identifiers.requestIds].some((id) => {
            const owner = this.pinnedRequests.get(id);
            return owner !== undefined && owner !== generation.id;
        });
    }
    observePendingRequests(generationId, payload) {
        const generation = this.generationForId(generationId);
        if (!generation)
            return [];
        const requestIds = [];
        for (const record of requestRecords(payload)) {
            const sessionId = firstString(record, ["sessionID", "sessionId", "session_id"]);
            const owner = this.generationForId(sessionId ? this.sessionOwnership.get(sessionId) : undefined) ?? generation;
            const requestId = firstString(record, ["id", "requestID", "requestId", "permissionID", "questionID"]);
            if (requestId) {
                this.pinnedRequests.set(requestId, owner.id);
                requestIds.push(requestId);
            }
            if (sessionId && !this.sessionOwnership.has(sessionId))
                this.sessionOwnership.set(sessionId, generation.id);
        }
        return requestIds;
    }
    snapshot() {
        const now = Date.now();
        return {
            generations: this.generations
                .filter((entry) => entry.status !== "dead")
                .map((entry) => ({
                role: entry.status,
                pid: entry.handle.pid ?? null,
                port: portOf(entry.handle.url) || null,
                spawnedAt: entry.spawnedAt,
                drainRemainingMs: entry.drainDeadline === null ? null : Math.max(0, entry.drainDeadline - now),
            })),
        };
    }
    /** Provider sync treats an active drain as busy so it defers instead of parking on waitForDrain(). */
    hasDrainingGeneration() {
        return this.generations.some((entry) => entry.status === "draining");
    }
    /**
     * Bring the engine onto current config. Idle engines reload in place; busy
     * ones roll over to a standby. Serialized: concurrent requests collapse into
     * one pending rollover so a burst never stacks processes.
     */
    async requestRollover(input) {
        if (this.disposed)
            return { action: "skipped", reason: "disposed" };
        const request = {
            reason: input.reason,
            workspace: input.workspace,
            manual: input.manual === true,
            awaitPostRefreshSync: input.awaitPostRefreshSync !== false,
            forceStandby: input.forceStandby === true,
        };
        if (this.inFlight) {
            // Latest wins: a manual request keeps its manual flag so it still
            // bypasses the fingerprint guard when it runs.
            this.pendingRollover = {
                ...request,
                manual: request.manual || this.pendingRollover?.manual === true,
                awaitPostRefreshSync: request.awaitPostRefreshSync || this.pendingRollover?.awaitPostRefreshSync === true,
                forceStandby: request.forceStandby || this.pendingRollover?.forceStandby === true,
            };
            this.hooks.logger?.log("info", "Engine rollover coalesced into the in-flight request.", {
                "engine.rollover.reason": request.reason,
            });
            // The in-flight spawn may have read config and credentials from before
            // this request. Settle only when the queued rollover itself lands, so a
            // caller never records a change as applied that the engine has not read.
            return new Promise((resolve, reject) => {
                this.pendingWaiters.push({ resolve, reject });
            });
        }
        const waiters = this.pendingWaiters;
        this.pendingWaiters = [];
        const run = this.runRollover(request);
        this.inFlight = run;
        try {
            const outcome = await run;
            for (const waiter of waiters)
                waiter.resolve(outcome);
            return outcome;
        }
        catch (error) {
            for (const waiter of waiters)
                waiter.reject(error);
            throw error;
        }
        finally {
            this.inFlight = null;
            const next = this.pendingRollover;
            this.pendingRollover = null;
            if (next && !this.disposed) {
                void this.requestRollover(next).catch(() => undefined);
            }
            else if (this.disposed) {
                this.settleWaitersOnDispose();
            }
        }
    }
    settleWaitersOnDispose() {
        const waiters = this.pendingWaiters;
        this.pendingWaiters = [];
        for (const waiter of waiters)
            waiter.resolve({ action: "skipped", reason: "disposed" });
    }
    async runRollover(request) {
        const { workspace, reason, manual, awaitPostRefreshSync, forceStandby } = request;
        // The standby reads config from disk at spawn, so make sure the file is
        // current before deciding anything.
        await this.hooks.writeRuntimeConfigFile(this.config).catch(() => undefined);
        const fingerprint = await this.currentFingerprint();
        const primary = this.generations.find((entry) => entry.status === "primary") ?? null;
        // Nothing this workspace's instance reads at build time changed: either
        // the process was spawned on this config or this directory was already
        // reloaded onto it. Skipping here is what keeps a repeating no-op sync
        // from spawning an engine every pass. Other directories reloaded in place
        // do not count: their dispose left this one serving the previous config.
        // A forced request is exempt: its caller knows an input the fingerprint
        // cannot see changed (a rotated credential, a persisted policy), and
        // skipping it left the engine serving with the old key.
        const directory = directoryKey(workspace);
        if (!manual
            && !forceStandby
            && primary
            && (primary.fingerprint === fingerprint || primary.reloadedDirectories.get(directory) === fingerprint)) {
            return { action: "skipped", reason: "unchanged" };
        }
        const busy = forceStandby
            ? true
            : await this.hooks.engineBusy(this.config, workspace).catch(() => true);
        if (!busy) {
            await this.hooks.reloadInPlace(this.config, workspace, { awaitPostRefreshSync });
            if (primary)
                primary.reloadedDirectories.set(directory, fingerprint);
            this.hooks.logger?.log("info", "Engine reloaded in place (idle).", {
                "engine.rollover.reason": reason,
            });
            return { action: "reloaded_in_place" };
        }
        const draining = this.generations.find((entry) => entry.status === "draining");
        if (draining) {
            if (forceStandby) {
                this.hooks.logger?.log("info", "Engine standby rollover waiting for the active drain.", {
                    "engine.rollover.reason": reason,
                });
                await this.waitForDrain();
                if (this.disposed)
                    return { action: "skipped", reason: "disposed" };
                return this.runRollover(request);
            }
            // Cap: one primary plus one draining. Park this change; it lands when
            // the current drain finishes.
            this.pendingRollover = { reason, workspace, manual, awaitPostRefreshSync, forceStandby };
            this.hooks.logger?.log("info", "Engine rollover parked behind an active drain.", {
                "engine.rollover.reason": reason,
            });
            return { action: "coalesced" };
        }
        const sinceLastSpawn = Date.now() - this.lastSpawnAt;
        if (!manual && !forceStandby && sinceLastSpawn < minSpawnIntervalMs()) {
            this.pendingRollover = { reason, workspace, manual, awaitPostRefreshSync, forceStandby };
            this.hooks.logger?.log("info", "Engine rollover throttled by the minimum spawn interval.", {
                "engine.rollover.reason": reason,
                "engine.rollover.since_last_spawn_ms": sinceLastSpawn,
            });
            return { action: "coalesced" };
        }
        return await this.rollOver({ reason, workspace, fingerprint, primary });
    }
    async rollOver(input) {
        const { reason, workspace, fingerprint, primary } = input;
        this.hooks.logger?.log("info", "Engine rollover requested.", { "engine.rollover.reason": reason });
        let handle;
        this.lastSpawnAt = Date.now();
        try {
            handle = await this.spawn();
        }
        catch (error) {
            this.hooks.logger?.log("error", "Engine rollover standby failed to start; the live engine is untouched.", {
                "engine.rollover.reason": reason,
                "engine.rollover.failure": error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
        const generation = {
            id: randomUUID(),
            handle,
            status: "starting",
            spawnedAt: Date.now(),
            fingerprint,
            reloadedDirectories: new Map(),
            registryId: null,
            trustedIdentity: null,
            drainTimer: null,
            drainDeadline: null,
            drainActivityWatch: null,
        };
        this.generations.push(generation);
        try {
            await this.waitForHealthy(handle);
        }
        catch (error) {
            // Never flip onto an engine that has not answered: close the partial
            // standby and leave the primary serving.
            this.generations = this.generations.filter((entry) => entry.id !== generation.id);
            await handle.close().catch(() => undefined);
            this.hooks.logger?.log("error", "Engine rollover standby never became healthy; the live engine is untouched.", {
                "engine.rollover.reason": reason,
                "engine.rollover.failure": error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
        if (this.hooks.prepareStandby) {
            try {
                await this.prepareStandbyBounded(generation, workspace);
            }
            catch (error) {
                // A standby without its credentials would answer every run with
                // "API key is missing" while status called the reload landed. Keep
                // the primary serving, close the standby, and let the caller's retry
                // path bring the change back once seeding works.
                this.generations = this.generations.filter((entry) => entry.id !== generation.id);
                await handle.close().catch(() => undefined);
                this.hooks.logger?.log("error", "Engine standby preparation failed; the live engine is untouched.", {
                    "engine.rollover.reason": reason,
                    "engine.rollover.failure": error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        }
        if (handle.pid) {
            generation.registryId = randomUUID();
            await registerEngineInstance(this.config, {
                id: generation.registryId,
                pid: handle.pid,
                port: portOf(handle.url),
                url: handle.url,
                startedAt: generation.spawnedAt,
                role: "starting",
                serverRunId: generation.id,
                ownerPid: process.pid,
                authProbe: buildEngineAuthProbeHeader(handle.username, handle.password),
                bin: this.template.bin?.trim() || "opencode",
            }).catch(() => undefined);
        }
        const activity = await this.nonIdleSessionIds(primary);
        const pinnedRequestIds = await this.pendingRequestIds(primary);
        const drainingSessions = activity.sessionIds;
        if (primary && !activity.complete) {
            for (const [sessionId, owner] of this.sessionOwnership) {
                if (owner === primary.id && !drainingSessions.includes(sessionId))
                    drainingSessions.push(sessionId);
            }
        }
        this.flip(generation, primary, drainingSessions, pinnedRequestIds);
        this.hooks.logger?.log("info", "Engine rollover flipped to the new generation.", {
            "engine.rollover.reason": reason,
            "engine.rollover.pid": handle.pid ?? null,
            "engine.rollover.draining_sessions": drainingSessions.length,
        });
        // Best-effort and off the critical path: the new engine already has disk
        // config; this pushes the runtime-DB MCPs a fresh instance cannot see.
        this.detachPostRefreshSync(workspace);
        if (primary)
            this.startDrainMonitor(primary, workspace);
        return { action: "rolled_over", generationId: generation.id, drainingSessions: drainingSessions.length };
    }
    /** Seed the standby within a bounded budget; a hung seed is a failed rollover. */
    async prepareStandbyBounded(generation, workspace) {
        const prepare = this.hooks.prepareStandby;
        if (!prepare)
            return;
        const standby = {
            workspace,
            generationId: generation.id,
            baseUrl: generation.handle.url,
            username: generation.handle.username,
            password: generation.handle.password,
        };
        const budgetMs = standbyPrepareTimeoutMs();
        let expire = () => undefined;
        const timeout = new Promise((_resolve, reject) => {
            expire = reject;
        });
        const timer = setTimeout(() => expire(new Error(`Engine standby preparation did not complete within ${budgetMs}ms`)), budgetMs);
        timer.unref?.();
        try {
            await Promise.race([prepare(this.config, standby), timeout]);
        }
        finally {
            clearTimeout(timer);
        }
    }
    /**
     * Point the server at the new generation. Synchronous on purpose: every
     * request resolves its engine from `config`, so there must be no await
     * between demoting the old engine and promoting the new one.
     */
    flip(next, previous, drainingSessions, pinnedRequestIds) {
        next.status = "primary";
        if (previous)
            previous.status = "draining";
        if (previous) {
            const active = new Set(drainingSessions);
            this.activeSessionsByGeneration.set(previous.id, active);
            for (const sessionId of active)
                this.sessionOwnership.set(sessionId, previous.id);
            for (const requestId of pinnedRequestIds)
                this.pinnedRequests.set(requestId, previous.id);
        }
        this.config.opencodeBaseUrl = next.handle.url;
        this.config.opencodeUsername = next.handle.username;
        this.config.opencodePassword = next.handle.password;
        for (const entry of this.config.workspaces) {
            entry.baseUrl = next.handle.url;
            entry.opencodeUsername = next.handle.username;
            entry.opencodePassword = next.handle.password;
            entry.directory = entry.path;
        }
        if (previous?.trustedIdentity) {
            try {
                this.hooks.clearTrusted(this.config, previous.trustedIdentity);
            }
            catch {
                // The registry is advisory; a stale entry must not block the flip.
            }
        }
        next.trustedIdentity = [next.handle.pid ?? "unknown", randomUUID()].join(":");
        try {
            this.hooks.registerTrusted(this.config, {
                baseUrl: next.handle.url,
                identity: next.trustedIdentity,
                isAlive: next.handle.isAlive,
            });
        }
        catch {
            // Same: diagnostics eligibility only.
        }
        if (next.registryId)
            void updateEngineInstanceRole(this.config, next.registryId, "primary").catch(() => undefined);
        if (previous?.registryId) {
            void updateEngineInstanceRole(this.config, previous.registryId, "draining").catch(() => undefined);
        }
        this.abortEventProxies();
    }
    /**
     * Watch a draining engine and close it once its runs finish. The grace
     * window bounds inactivity, not total drain time: engine events for an
     * owned session push the deadline out, so a run that is actively making
     * progress is never aborted mid-flight, while a non-idle session that stops
     * reporting anything for the whole window is aborted rather than kept alive
     * forever.
     */
    startDrainMonitor(generation, workspace) {
        generation.drainDeadline = Date.now() + drainTimeoutMs();
        this.watchDrainActivity(generation);
        let ticking = false;
        const tick = async () => {
            if (ticking || generation.status !== "draining")
                return;
            ticking = true;
            try {
                const activity = await this.nonIdleSessionIds(generation);
                if (generation.status !== "draining")
                    return;
                const remaining = activity.complete
                    ? activity.sessionIds
                    : [...new Set([...(this.activeSessionsByGeneration.get(generation.id) ?? []), ...activity.sessionIds])];
                this.updateActiveSessions(generation, remaining);
                if (activity.complete && remaining.length === 0) {
                    await this.retire(generation, "idle");
                    return;
                }
                if (generation.drainDeadline !== null && Date.now() >= generation.drainDeadline) {
                    this.hooks.logger?.log("warn", "Engine drain saw no session activity for the grace period; aborting the remaining sessions.", {
                        "engine.drain.sessions": remaining.join(","),
                        "engine.drain.session_count": remaining.length,
                        "engine.drain.activity_complete": activity.complete,
                    });
                    for (const sessionId of remaining) {
                        if (generation.status !== "draining")
                            return;
                        await this.abortSession(generation, sessionId).catch(() => undefined);
                    }
                    await new Promise((resolve) => setTimeout(resolve, abortSettleMs()));
                    await this.retire(generation, "forced");
                }
            }
            finally {
                ticking = false;
            }
        };
        const timer = setInterval(() => void tick().catch(() => undefined), drainPollIntervalMs());
        timer.unref?.();
        generation.drainTimer = timer;
        // Sessions can finish between the flip and the first poll.
        void tick().catch(() => undefined);
    }
    /**
     * Hold one global event-stream subscription on the draining engine so
     * owned-session activity keeps extending the drain deadline. The client
     * event fan-in only exists while a client is attached; the pool owns this
     * watch so a background run with no observer still counts as active.
     */
    watchDrainActivity(generation) {
        const controller = new AbortController();
        generation.drainActivityWatch = controller;
        void this.runDrainActivityWatch(generation, controller.signal).catch(() => undefined);
    }
    async runDrainActivityWatch(generation, signal) {
        while (!signal.aborted && generation.status === "draining") {
            try {
                const url = new URL("/global/event", generation.handle.url);
                const response = await loopbackFetch(url.toString(), {
                    headers: { Authorization: buildEngineAuthProbeHeader(generation.handle.username, generation.handle.password) },
                    signal,
                });
                if (response.ok && response.body) {
                    await this.consumeDrainActivityEvents(generation, response.body, signal);
                }
            }
            catch { }
            if (signal.aborted || generation.status !== "draining")
                return;
            await new Promise((resolve) => {
                const timer = setTimeout(resolve, drainActivityReconnectMs());
                timer.unref?.();
            });
        }
    }
    async consumeDrainActivityEvents(generation, body, signal) {
        const reader = body.getReader();
        const frameBuffer = new BoundedSseFrameBuffer();
        try {
            while (!signal.aborted && generation.status === "draining") {
                const chunk = await reader.read();
                if (chunk.done)
                    return;
                const parsed = frameBuffer.push(chunk.value);
                for (const frame of parsed.frames) {
                    this.noteDrainActivity(generation, sseFramePayload(frame));
                }
                // A frame that never terminates would buffer without bound; drop the
                // stream and let the watch loop reconnect.
                if (parsed.overflow)
                    return;
            }
        }
        finally {
            await reader.cancel().catch(() => undefined);
            reader.releaseLock();
        }
    }
    /** An engine event naming an owned session is proof of progress: push the deadline out. */
    noteDrainActivity(generation, payload) {
        if (payload === null || generation.status !== "draining" || generation.drainDeadline === null)
            return;
        const owned = this.activeSessionsByGeneration.get(generation.id);
        if (!owned || owned.size === 0)
            return;
        const { sessionIds } = eventIdentifiers(payload);
        let hasOwnedSession = false;
        for (const sessionId of sessionIds) {
            if (owned.has(sessionId)) {
                hasOwnedSession = true;
                break;
            }
        }
        if (!hasOwnedSession)
            return;
        const extended = Date.now() + drainTimeoutMs();
        if (extended > generation.drainDeadline)
            generation.drainDeadline = extended;
    }
    async retire(generation, cause) {
        if (generation.status === "dead")
            return;
        generation.status = "dead";
        if (generation.drainTimer) {
            clearInterval(generation.drainTimer);
            generation.drainTimer = null;
        }
        generation.drainActivityWatch?.abort();
        generation.drainActivityWatch = null;
        generation.drainDeadline = null;
        this.activeSessionsByGeneration.delete(generation.id);
        for (const [sessionId, generationId] of this.sessionOwnership) {
            if (generationId === generation.id)
                this.sessionOwnership.delete(sessionId);
        }
        for (const [requestId, generationId] of this.pinnedRequests) {
            if (generationId === generation.id)
                this.pinnedRequests.delete(requestId);
        }
        if (generation.trustedIdentity) {
            try {
                this.hooks.clearTrusted(this.config, generation.trustedIdentity);
            }
            catch {
                // Advisory only.
            }
            generation.trustedIdentity = null;
        }
        let closeError;
        try {
            await generation.handle.close();
        }
        catch (error) {
            closeError = error;
        }
        if (generation.registryId) {
            await removeEngineInstance(this.config, generation.registryId).catch(() => undefined);
            generation.registryId = null;
        }
        this.generations = this.generations.filter((entry) => entry.id !== generation.id);
        for (const resolve of this.drainWaiters)
            resolve();
        this.drainWaiters.clear();
        this.hooks.logger?.log("info", "Drained engine closed.", { "engine.drain.cause": cause });
        const next = this.pendingRollover;
        if (cause !== "shutdown" && next && !this.inFlight && !this.disposed) {
            this.pendingRollover = null;
            void this.requestRollover(next).catch(() => undefined);
        }
        if (closeError !== undefined && cause === "shutdown")
            throw closeError;
    }
    /** Close every engine this pool owns. Draining generations go first. */
    async disposeAll() {
        this.disposed = true;
        this.hooks.onDisposed?.();
        this.pendingRollover = null;
        this.settleWaitersOnDispose();
        if (this.recoveryTimer)
            clearTimeout(this.recoveryTimer);
        this.recoveryTimer = null;
        this.abortEventProxies();
        const errors = [];
        const recoveryOrphan = this.recoveryOrphan;
        this.recoveryOrphan = null;
        if (recoveryOrphan) {
            try {
                await recoveryOrphan.close();
            }
            catch (error) {
                errors.push(error);
            }
        }
        const ordered = [...this.generations].sort((left, right) => {
            if (left.status === right.status)
                return 0;
            return left.status === "draining" ? -1 : 1;
        });
        for (const generation of ordered) {
            try {
                await this.retire(generation, "shutdown");
            }
            catch (error) {
                errors.push(error);
            }
        }
        this.generations = [];
        if (errors.length === 1)
            throw errors[0];
        if (errors.length > 1)
            throw new AggregateError(errors, "Failed to close managed engines");
    }
    async currentFingerprint() {
        return computeEngineConfigFingerprint(this.template);
    }
    waitForDrain() {
        if (!this.generations.some((entry) => entry.status === "draining"))
            return Promise.resolve();
        return new Promise((resolve) => {
            this.drainWaiters.add(resolve);
        });
    }
    async recoverDeadPrimary(workspace) {
        if (this.disposed)
            return;
        if (this.recoveryInFlight)
            return this.recoveryInFlight;
        const recovery = this.runDeadPrimaryRecovery(workspace);
        this.recoveryInFlight = recovery;
        try {
            await recovery;
        }
        finally {
            this.recoveryInFlight = null;
        }
    }
    async runDeadPrimaryRecovery(workspace) {
        const previous = this.generations.find((entry) => entry.status === "primary") ?? null;
        let replacement = null;
        try {
            if (this.recoveryOrphan) {
                await this.recoveryOrphan.close();
                if (this.recoveryOrphan.isAlive())
                    throw new Error("Failed replacement remained alive after close");
                this.recoveryOrphan = null;
            }
            if (previous) {
                if (previous.trustedIdentity) {
                    try {
                        this.hooks.clearTrusted(this.config, previous.trustedIdentity);
                    }
                    catch {
                        // Advisory only; process teardown must still happen.
                    }
                }
                await previous.handle.close();
                if (previous.handle.isAlive())
                    throw new Error("Managed OpenCode process remained alive after close");
                previous.status = "dead";
                if (previous.registryId)
                    await removeEngineInstance(this.config, previous.registryId).catch(() => undefined);
                this.generations = this.generations.filter((entry) => entry.id !== previous.id);
            }
            const handle = await this.spawn();
            replacement = handle;
            await this.waitForHealthy(handle);
            const generation = {
                id: randomUUID(),
                handle,
                status: "starting",
                spawnedAt: this.now(),
                fingerprint: await this.currentFingerprint(),
                reloadedDirectories: new Map(),
                registryId: null,
                trustedIdentity: null,
                drainTimer: null,
                drainDeadline: null,
                drainActivityWatch: null,
            };
            this.generations.push(generation);
            if (handle.pid) {
                generation.registryId = randomUUID();
                await registerEngineInstance(this.config, {
                    id: generation.registryId,
                    pid: handle.pid,
                    port: portOf(handle.url),
                    url: handle.url,
                    startedAt: generation.spawnedAt,
                    role: "starting",
                    serverRunId: generation.id,
                    ownerPid: process.pid,
                    authProbe: buildEngineAuthProbeHeader(handle.username, handle.password),
                    bin: this.template.bin?.trim() || "opencode",
                }).catch(() => undefined);
            }
            this.flip(generation, null, [], []);
            replacement = null;
            this.consecutiveConnectionFailures = 0;
            this.recoveryWorkspace = null;
            if (this.recoveryTimer)
                clearTimeout(this.recoveryTimer);
            this.recoveryTimer = null;
            this.detachPostRefreshSync(workspace);
        }
        catch (error) {
            if (replacement) {
                try {
                    await replacement.close();
                    if (replacement.isAlive())
                        this.recoveryOrphan = replacement;
                }
                catch {
                    this.recoveryOrphan = replacement;
                }
            }
            this.hooks.logger?.log("error", "Managed engine recovery failed; retry scheduled.", {
                "engine.recovery.failure": error instanceof Error ? error.message : String(error),
            });
            this.scheduleRecovery(workspace);
            throw error;
        }
    }
    scheduleRecovery(workspace) {
        if (this.disposed || this.recoveryTimer)
            return;
        this.recoveryWorkspace = workspace;
        const delayMs = Math.max(1, minSpawnIntervalMs() - (this.now() - this.lastRecoveryAt));
        const schedule = this.hooks.schedule ?? ((operation, delay) => setTimeout(operation, delay));
        this.recoveryTimer = schedule(() => {
            this.recoveryTimer = null;
            const pendingWorkspace = this.recoveryWorkspace;
            if (!pendingWorkspace || this.disposed)
                return;
            this.lastRecoveryAt = this.now();
            void this.recoverDeadPrimary(pendingWorkspace).catch(() => undefined);
        }, delayMs);
        this.recoveryTimer.unref?.();
    }
    spawn() {
        if (this.hooks.spawn)
            return this.hooks.spawn(this.template);
        return createManagedOpencodeServer({
            bin: this.template.bin,
            cwd: this.template.cwd,
            excludedPorts: this.template.reservedPorts(),
            ...(this.template.spawnTimeoutMs ? { timeoutMs: this.template.spawnTimeoutMs } : {}),
            env: {
                ...this.template.env,
                OPENCODE_CONFIG: this.template.runtimeConfigPath,
            },
        });
    }
    detachPostRefreshSync(workspace) {
        void this.hooks.postRefreshSync(this.config, workspace).catch((error) => {
            this.hooks.logger?.log("error", "Engine post-refresh MCP sync failed.", {
                "workspace.id": workspace.id,
                "engine.post_refresh.failure": error instanceof Error ? error.message : String(error),
            });
        });
    }
    now() {
        return this.hooks.now?.() ?? Date.now();
    }
    isPrimaryEndpoint(baseUrl) {
        try {
            const primary = this.primaryUrl();
            return primary !== null && new URL(primary).origin === new URL(baseUrl).origin;
        }
        catch {
            return false;
        }
    }
    async waitForHealthy(handle, attempts = 10) {
        if (this.hooks.waitForHealthy)
            return this.hooks.waitForHealthy(handle);
        const authorization = buildEngineAuthProbeHeader(handle.username, handle.password);
        for (let attempt = 0; attempt < attempts; attempt += 1) {
            try {
                const response = await loopbackFetch(new URL("/global/health", handle.url).toString(), {
                    headers: { Authorization: authorization },
                    signal: AbortSignal.timeout(2_000),
                });
                if (response.ok)
                    return;
            }
            catch {
                // Not up yet.
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
        throw new Error("Standby OpenCode engine did not report healthy");
    }
    async nonIdleSessionIds(generation) {
        if (!generation || generation.status === "dead" || !generation.handle.isAlive())
            return { sessionIds: [], complete: true };
        const sessionIds = new Set();
        let complete = true;
        await Promise.all(this.engineProbeDirectories().map(async (directory) => {
            try {
                const url = new URL("/session/status", generation.handle.url);
                if (directory !== null)
                    url.searchParams.set("directory", directory);
                const response = await loopbackFetch(url.toString(), {
                    headers: { Authorization: buildEngineAuthProbeHeader(generation.handle.username, generation.handle.password) },
                    signal: AbortSignal.timeout(5_000),
                });
                if (!response.ok)
                    throw new Error(`Session status probe returned HTTP ${response.status}`);
                const payload = await response.json();
                if (!isRecord(payload))
                    throw new Error("Session status probe returned a malformed payload");
                for (const [sessionId, status] of Object.entries(payload)) {
                    if (!isRecord(status) || (status.type !== "idle" && status.type !== "busy" && status.type !== "retry")) {
                        complete = false;
                    }
                    else if (status.type !== "idle") {
                        sessionIds.add(sessionId);
                    }
                }
            }
            catch {
                complete = false;
            }
        }));
        if (!generation.handle.isAlive())
            return { sessionIds: [], complete: true };
        if (!complete) {
            this.hooks.logger?.log("warn", "Engine session activity probe incomplete; preserving known active sessions until confirmed idle or the inactivity deadline.", {
                "engine.generation_id": generation.id,
                "engine.drain.activity_complete": false,
            });
        }
        return { sessionIds: [...sessionIds], complete };
    }
    engineProbeDirectories() {
        const directories = new Set(this.config.workspaces.map((workspace) => workspace.path));
        return directories.size > 0 ? [...directories] : [null];
    }
    async pendingRequestIds(generation) {
        if (!generation || generation.status === "dead" || !generation.handle.isAlive())
            return [];
        const requestIds = new Set();
        await Promise.all(this.engineProbeDirectories().flatMap((directory) => ["/permission", "/question", "/api/permission/request", "/api/question/request"].map(async (path) => {
            try {
                const url = new URL(path, generation.handle.url);
                if (directory !== null)
                    url.searchParams.set("directory", directory);
                const response = await loopbackFetch(url.toString(), {
                    headers: { Authorization: buildEngineAuthProbeHeader(generation.handle.username, generation.handle.password) },
                    signal: AbortSignal.timeout(2_000),
                });
                if (!response.ok)
                    return;
                const payload = await response.json();
                for (const requestId of this.observePendingRequests(generation.id, payload)) {
                    requestIds.add(requestId);
                }
            }
            catch {
                // The legacy and v2 surfaces vary by bundled engine version. A missing
                // list never blocks the rollover; path routing still handles scoped ids.
            }
        })));
        return [...requestIds];
    }
    updateActiveSessions(generation, sessionIds) {
        const next = new Set(sessionIds);
        this.activeSessionsByGeneration.set(generation.id, next);
        for (const [sessionId, generationId] of this.sessionOwnership) {
            if (generationId === generation.id && !next.has(sessionId))
                this.sessionOwnership.delete(sessionId);
        }
        for (const sessionId of next)
            this.sessionOwnership.set(sessionId, generation.id);
    }
    connectionFor(generation) {
        return {
            generationId: generation.id,
            role: generation.status,
            baseUrl: generation.handle.url,
            username: generation.handle.username,
            password: generation.handle.password,
        };
    }
    generationForId(generationId) {
        if (!generationId)
            return null;
        const generation = this.generations.find((entry) => entry.id === generationId) ?? null;
        return generation && isRoutableGeneration(generation) ? generation : null;
    }
    abortEventProxies() {
        const controllers = [...this.eventProxyControllers];
        this.eventProxyControllers.clear();
        for (const controller of controllers)
            controller.abort(new Error("OpenCode engine generation changed"));
    }
    async abortSession(generation, sessionId) {
        this.hooks.logger?.log("info", "Aborting OpenCode session from engine pool.", {
            "abort.source": "engine_pool.drain_timeout",
            "abort.initiator": "system",
            "abort.reason": "draining engine saw no session activity for the grace period",
            "session.id": sessionId,
            "engine.generation_id": generation.id,
        });
        try {
            await loopbackFetch(new URL(`/session/${encodeURIComponent(sessionId)}/abort`, generation.handle.url).toString(), {
                method: "POST",
                headers: { Authorization: buildEngineAuthProbeHeader(generation.handle.username, generation.handle.password) },
                signal: AbortSignal.timeout(5_000),
            });
            this.hooks.logger?.log("info", "OpenCode session abort from engine pool completed.", {
                "abort.source": "engine_pool.drain_timeout",
                "abort.initiator": "system",
                "session.id": sessionId,
                "engine.generation_id": generation.id,
            });
        }
        catch (error) {
            this.hooks.logger?.log("error", "OpenCode session abort from engine pool failed.", {
                "abort.source": "engine_pool.drain_timeout",
                "abort.initiator": "system",
                "session.id": sessionId,
                "engine.generation_id": generation.id,
                "error.message": error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
}
const poolByConfig = new WeakMap();
export function setEnginePoolForConfig(config, pool) {
    poolByConfig.set(config, pool);
}
export function enginePoolForConfig(config) {
    return poolByConfig.get(config) ?? null;
}
export function clearEnginePoolForConfig(config) {
    poolByConfig.delete(config);
}

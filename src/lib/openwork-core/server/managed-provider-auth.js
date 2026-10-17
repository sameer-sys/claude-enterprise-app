import { createHash } from "node:crypto";
import { enginePoolForConfig } from "./engine-pool.js";
import { resolveWorkspaceOpencodeConnection } from "./opencode-connection.js";
import { readGlobalRuntimeOpencodeConfig, runtimeProviderMap } from "./runtime-opencode-config-store.js";
import { readOpenworkWorkspaceConfig, writeOpenworkWorkspaceConfig } from "./openwork-workspace-config-store.js";
import { findManagedEngineWorkspace } from "./workspaces.js";
/**
 * Applied state belongs to one server config and one exact engine target. A
 * managed target includes the pool generation id, so even a replacement that
 * reuses a port starts with no applied-state assumptions. The tail serializes
 * competing startup, configuration, and env-store reconciliation requests.
 * Removal ownership survives managed generations but never crosses attached
 * workspace endpoints.
 */
const stateByConfig = new WeakMap();
let cacheEpoch = 0;
const fingerprint = (value) => createHash("sha256").update(value).digest("hex");
/**
 * Budget for one engine auth PUT/DELETE. The engine answers these on the
 * loopback in milliseconds; a request that hangs (instance rebuild wedged,
 * half-open socket) must surface as a failed delivery so the caller can keep
 * the reload owed and retry, instead of stalling the sync queue or a standby
 * flip forever.
 */
function authRequestTimeoutMs() {
    const raw = Number(process.env.OPENWORK_PROVIDER_AUTH_TIMEOUT_MS ?? "");
    return Number.isFinite(raw) && raw > 0 ? raw : 10_000;
}
function stateForConfig(config) {
    const current = stateByConfig.get(config);
    if (current) {
        if (current.epoch !== cacheEpoch) {
            current.epoch = cacheEpoch;
            current.appliedTargetScope = null;
            current.deliveredFingerprints.clear();
            current.lastDeliveredValueFingerprints.clear();
        }
        return current;
    }
    const created = {
        epoch: cacheEpoch,
        appliedTargetScope: null,
        deliveredFingerprints: new Map(),
        lastDeliveredValueFingerprints: new Map(),
        ownedProviderIdsByScope: new Map(),
        tail: Promise.resolve(),
    };
    stateByConfig.set(config, created);
    return created;
}
function normalizeBaseUrl(value) {
    const normalized = value?.trim().replace(/\/+$/, "");
    return normalized ? normalized : null;
}
function basicAuthHeader(username, password) {
    const normalizedUsername = username.trim();
    const normalizedPassword = password.trim();
    return normalizedUsername && normalizedPassword
        ? `Basic ${Buffer.from(`${normalizedUsername}:${normalizedPassword}`).toString("base64")}`
        : undefined;
}
function resolveManagedProviderAuthTarget(config, standby) {
    // The managed engine is one process for every workspace and runs before
    // the first one exists, so its credentials are keyed by engine generation.
    // Only an attached engine (no pool) is reached through a workspace.
    const pool = enginePoolForConfig(config);
    if (standby) {
        // Same scope shape as the primary branch below, so the flip that promotes
        // this generation leaves the applied fingerprints valid.
        const baseUrl = normalizeBaseUrl(standby.baseUrl);
        if (!pool || !baseUrl)
            return null;
        const authHeader = basicAuthHeader(standby.username, standby.password);
        return {
            scope: `managed-engine\u0000generation:${standby.generationId}`,
            ownershipScope: "managed-engine",
            baseUrl,
            ...(authHeader ? { authHeader } : {}),
            isCurrent: () => enginePoolForConfig(config) === pool,
        };
    }
    if (pool) {
        const primary = pool.connections().find((connection) => connection.role === "primary");
        const baseUrl = normalizeBaseUrl(primary?.baseUrl);
        if (!primary || !baseUrl)
            return null;
        const authHeader = basicAuthHeader(primary.username, primary.password);
        return {
            scope: `managed-engine\u0000generation:${primary.generationId}`,
            ownershipScope: "managed-engine",
            baseUrl,
            ...(authHeader ? { authHeader } : {}),
            isCurrent: () => {
                if (enginePoolForConfig(config) !== pool)
                    return false;
                const current = pool.connections().find((connection) => connection.role === "primary");
                return current?.generationId === primary.generationId
                    && normalizeBaseUrl(current.baseUrl) === baseUrl
                    && basicAuthHeader(current.username, current.password) === authHeader;
            },
        };
    }
    const workspace = findManagedEngineWorkspace(config.workspaces) ?? config.workspaces[0];
    if (!workspace)
        return null;
    const connection = resolveWorkspaceOpencodeConnection(config, workspace);
    const baseUrl = normalizeBaseUrl(connection.baseUrl);
    if (!baseUrl)
        return null;
    const authHeader = connection.authHeader;
    return {
        scope: `workspace:${workspace.id}\u0000endpoint:${baseUrl}`,
        ownershipScope: `workspace:${workspace.id}\u0000endpoint:${baseUrl}`,
        baseUrl,
        ...(authHeader ? { authHeader } : {}),
        isCurrent: () => {
            if (enginePoolForConfig(config))
                return false;
            const currentWorkspace = findManagedEngineWorkspace(config.workspaces) ?? config.workspaces[0];
            if (currentWorkspace?.id !== workspace.id)
                return false;
            const current = resolveWorkspaceOpencodeConnection(config, currentWorkspace);
            return normalizeBaseUrl(current.baseUrl) === baseUrl && current.authHeader === authHeader;
        },
    };
}
function readEnvNames(entry) {
    if (!Array.isArray(entry.env))
        return [];
    return entry.env.filter((name) => typeof name === "string" && name.trim().length > 0);
}
function credentialEnvRank(name) {
    const normalized = name.trim().toUpperCase();
    if (/(^|_)API_KEY$/.test(normalized))
        return 0;
    if (/(^|_)ACCESS_KEY_ID$/.test(normalized))
        return 1;
    if (/(^|_)BEARER_TOKEN(_|$)/.test(normalized) || /(^|_)TOKEN$/.test(normalized))
        return 2;
    if (/(^|_)KEY$/.test(normalized))
        return 3;
    return null;
}
export function selectPrimaryCredentialEnvName(envNames, availableNames) {
    const available = new Set([...availableNames].filter((name) => name.trim().length > 0));
    const orderedNames = envNames.filter((name) => available.has(name));
    const ranked = orderedNames
        .map((name, index) => ({ name, index, rank: credentialEnvRank(name) }))
        .filter((entry) => entry.rank !== null)
        .sort((left, right) => left.rank - right.rank || left.index - right.index);
    if (ranked[0])
        return ranked[0].name;
    if (envNames.length > 1 && envNames.some((name) => credentialEnvRank(name) !== null))
        return null;
    return orderedNames[0] ?? null;
}
/**
 * Forget what we believe the engine holds. Call this when the engine process is
 * replaced: opencode persists auth outside the process, but a fresh engine may
 * have been started against a different store, and re-delivery is cheap.
 */
export function resetManagedProviderAuthCache() {
    cacheEpoch += 1;
}
export function syncManagedProviderAuth(input) {
    const state = stateForConfig(input.config);
    const run = state.tail.then(() => reconcileManagedProviderAuth(input));
    state.tail = run.then(() => undefined, () => undefined);
    return run;
}
async function reconcileManagedProviderAuth(input) {
    const result = {
        delivered: [],
        rotated: [],
        unchanged: [],
        removed: [],
        skipped: [],
        failed: [],
    };
    const runtimeConfig = await readGlobalRuntimeOpencodeConfig(input.config);
    const providers = runtimeProviderMap(runtimeConfig);
    const storedValues = new Map();
    for (const record of await input.env.list()) {
        if (typeof record.value === "string" && record.value.trim().length > 0) {
            storedValues.set(record.key, record.value);
        }
    }
    const target = resolveManagedProviderAuthTarget(input.config, input.target);
    if (!target)
        return result;
    const operationEpoch = cacheEpoch;
    const state = stateForConfig(input.config);
    if (state.appliedTargetScope !== target.scope) {
        state.appliedTargetScope = target.scope;
        state.deliveredFingerprints.clear();
    }
    const isCurrent = () => operationEpoch === cacheEpoch && target.isCurrent();
    const fetchImpl = input.fetchImpl ?? globalThis.fetch;
    const headers = { "content-type": "application/json" };
    if (target.authHeader)
        headers.authorization = target.authHeader;
    const managedIds = new Set(Object.keys(providers));
    const ownershipKey = `__managed_provider_auth__:${target.ownershipScope}`;
    const persisted = await readOpenworkWorkspaceConfig(input.config, ownershipKey);
    const savedIds = Array.isArray(persisted.providerIds)
        ? persisted.providerIds.filter((id) => typeof id === "string") : [];
    const ownedProviderIds = state.ownedProviderIdsByScope.get(target.ownershipScope) ?? new Set();
    for (const id of [...savedIds, ...(input.retiredProviderIds ?? [])])
        ownedProviderIds.add(id);
    state.ownedProviderIdsByScope.set(target.ownershipScope, ownedProviderIds);
    const persist = () => writeOpenworkWorkspaceConfig(input.config, ownershipKey, () => ({ providerIds: [...ownedProviderIds] }));
    await persist();
    for (const [providerId, entry] of Object.entries(providers)) {
        if (!isCurrent())
            return result;
        const envNames = readEnvNames(entry);
        if (envNames.length === 0) {
            result.skipped.push({ providerId, reason: "no_env_names" });
            continue;
        }
        const credentialName = selectPrimaryCredentialEnvName(envNames, storedValues.keys());
        if (!credentialName) {
            result.skipped.push({ providerId, reason: "no_stored_credential" });
            input.logger?.warn("managed provider credential missing from env store", {
                provider_id: providerId,
                env_names: envNames,
            });
            continue;
        }
        const credential = storedValues.get(credentialName) ?? "";
        const next = fingerprint(credential);
        if (state.deliveredFingerprints.get(providerId) === next) {
            result.unchanged.push(providerId);
            continue;
        }
        try {
            const response = await fetchImpl(`${target.baseUrl}/auth/${encodeURIComponent(providerId)}`, {
                method: "PUT",
                headers,
                body: JSON.stringify({ type: "api", key: credential }),
                signal: AbortSignal.timeout(authRequestTimeoutMs()),
            });
            if (!isCurrent())
                return result;
            if (!response.ok) {
                result.failed.push({ providerId, status: response.status });
                input.logger?.error("managed provider auth delivery rejected by engine", {
                    provider_id: providerId,
                    status: response.status,
                });
                continue;
            }
            state.deliveredFingerprints.set(providerId, next);
            if (state.lastDeliveredValueFingerprints.get(providerId) !== next)
                result.rotated.push(providerId);
            state.lastDeliveredValueFingerprints.set(providerId, next);
            ownedProviderIds.add(providerId);
            await persist();
            result.delivered.push(providerId);
        }
        catch (error) {
            if (!isCurrent())
                return result;
            result.failed.push({ providerId, status: null });
            input.logger?.error("managed provider auth delivery failed", {
                provider_id: providerId,
                message: error instanceof Error ? error.message : "unknown_error",
            });
        }
    }
    // Delivery provenance survives restart and stays bound to this engine target.
    for (const providerId of [...ownedProviderIds]) {
        if (managedIds.has(providerId))
            continue;
        if (!isCurrent())
            return result;
        try {
            const response = await fetchImpl(`${target.baseUrl}/auth/${encodeURIComponent(providerId)}`, {
                method: "DELETE",
                headers,
                signal: AbortSignal.timeout(authRequestTimeoutMs()),
            });
            if (!isCurrent())
                return result;
            if (!response.ok) {
                input.logger?.error("managed provider auth removal rejected by engine", {
                    provider_id: providerId,
                    status: response.status,
                });
                continue;
            }
            state.deliveredFingerprints.delete(providerId);
            ownedProviderIds.delete(providerId);
            await persist();
            result.removed.push(providerId);
        }
        catch (error) {
            if (!isCurrent())
                return result;
            input.logger?.error("managed provider auth removal failed", {
                provider_id: providerId,
                message: error instanceof Error ? error.message : "unknown_error",
            });
        }
    }
    if (ownedProviderIds.size === 0)
        state.ownedProviderIdsByScope.delete(target.ownershipScope);
    return result;
}

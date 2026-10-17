import { createWorkspaceKvStore, isRecord } from "./workspace-kv-store.js";
function normalizeOpenworkWorkspaceConfig(value) {
    return isRecord(value) ? value : {};
}
function parseOpenworkWorkspaceConfig(configJson) {
    try {
        return normalizeOpenworkWorkspaceConfig(JSON.parse(configJson));
    }
    catch {
        return {};
    }
}
const openworkWorkspaceConfigStore = createWorkspaceKvStore({
    tableName: "openwork_workspace_configs",
    valueColumn: "config_json",
    parse: parseOpenworkWorkspaceConfig,
    serialize: (value) => JSON.stringify(value),
});
export async function readOpenworkWorkspaceConfig(config, workspaceId) {
    return await openworkWorkspaceConfigStore.get(config, workspaceId) ?? {};
}
export async function writeOpenworkWorkspaceConfig(config, workspaceId, updater) {
    const next = normalizeOpenworkWorkspaceConfig(updater(await readOpenworkWorkspaceConfig(config, workspaceId)));
    await openworkWorkspaceConfigStore.set(config, workspaceId, next);
    return next;
}
export async function hasOpenworkWorkspaceConfig(config, workspaceId) {
    return openworkWorkspaceConfigStore.has(config, workspaceId);
}
/**
 * Seed the DB-backed openwork config for a workspace if no row exists yet.
 * Used at workspace creation and as the migrate-on-read landing spot for
 * legacy `.opencode/openwork.json` files. No-op when a row is already present,
 * so it never clobbers live provisioning state.
 */
export async function seedOpenworkWorkspaceConfigIfEmpty(config, workspaceId, seed) {
    if (await hasOpenworkWorkspaceConfig(config, workspaceId)) {
        return readOpenworkWorkspaceConfig(config, workspaceId);
    }
    return writeOpenworkWorkspaceConfig(config, workspaceId, () => seed);
}
export function mergeOpenworkWorkspaceConfigs(legacy, stored) {
    return { ...legacy, ...stored };
}

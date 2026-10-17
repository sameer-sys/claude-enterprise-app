import { homedir } from "node:os";
import { join, relative } from "node:path";
import { readdir } from "node:fs/promises";
import { readJsoncFile } from "./jsonc.js";
import { opencodeConfigPath, projectPluginsDir } from "./workspace-files.js";
import { exists } from "./utils.js";
import { validatePluginSpec } from "./validators.js";
import { readEffectiveRuntimeOpencodeConfig, readGlobalRuntimeOpencodeConfig, runtimePluginList, writeGlobalRuntimeOpencodeConfig, } from "./runtime-opencode-config-store.js";
export function normalizePluginSpec(spec) {
    const trimmed = spec.trim();
    if (trimmed.startsWith("file:") || trimmed.startsWith("http:") || trimmed.startsWith("https:") || trimmed.startsWith("git:")) {
        return trimmed;
    }
    if (trimmed.startsWith("/")) {
        return trimmed;
    }
    if (trimmed.startsWith("@")) {
        const atIndex = trimmed.indexOf("@", 1);
        return atIndex > 0 ? trimmed.slice(0, atIndex) : trimmed;
    }
    const atIndex = trimmed.indexOf("@");
    return atIndex > 0 ? trimmed.slice(0, atIndex) : trimmed;
}
function pluginListFromConfig(config) {
    const plugin = config.plugin;
    if (typeof plugin === "string")
        return [plugin];
    if (Array.isArray(plugin))
        return plugin.filter((item) => typeof item === "string");
    return [];
}
async function listPluginFiles(dir, scope, workspaceRoot) {
    if (!(await exists(dir)))
        return [];
    const entries = await readdir(dir, { withFileTypes: true });
    const items = [];
    for (const entry of entries) {
        if (!entry.isFile())
            continue;
        if (!entry.name.endsWith(".js") && !entry.name.endsWith(".ts"))
            continue;
        const absolutePath = join(dir, entry.name);
        const relativePath = workspaceRoot ? relative(workspaceRoot, absolutePath) : absolutePath;
        items.push({
            spec: `file://${absolutePath}`,
            source: scope === "project" ? "dir.project" : "dir.global",
            scope,
            path: relativePath,
        });
    }
    return items;
}
export async function listPlugins(serverConfig, workspaceId, workspaceRoot, includeGlobal) {
    const { data: config } = await readJsoncFile(opencodeConfigPath(workspaceRoot), {}, { allowInvalid: true });
    const pluginSpecs = pluginListFromConfig(config);
    const runtimeSpecs = runtimePluginList(await readEffectiveRuntimeOpencodeConfig(serverConfig, workspaceId));
    const items = pluginSpecs.map((spec) => ({
        spec,
        source: "config",
        scope: "project",
    }));
    const seen = new Set(pluginSpecs.map((spec) => normalizePluginSpec(spec)));
    for (const spec of runtimeSpecs) {
        const normalized = normalizePluginSpec(spec);
        if (seen.has(normalized))
            continue;
        seen.add(normalized);
        items.push({
            spec,
            source: "config",
            scope: "project",
        });
    }
    const projectDir = projectPluginsDir(workspaceRoot);
    items.push(...(await listPluginFiles(projectDir, "project", workspaceRoot)));
    if (includeGlobal) {
        const globalDir = join(homedir(), ".config", "opencode", "plugins");
        items.push(...(await listPluginFiles(globalDir, "global")));
    }
    return {
        items,
        loadOrder: ["config.global", "config.project", "dir.global", "dir.project"],
    };
}
// Runtime-managed plugins are engine-global: the injected engine config file
// is rendered from the ENGINE_GLOBAL row only, so plugin writes target it.
export async function addPlugin(serverConfig, spec) {
    validatePluginSpec(spec);
    const runtimeConfig = await readGlobalRuntimeOpencodeConfig(serverConfig);
    const pluginSpecs = runtimePluginList(runtimeConfig);
    const normalized = normalizePluginSpec(spec);
    const existing = pluginSpecs.find((item) => normalizePluginSpec(item) === normalized);
    if (existing)
        return false;
    pluginSpecs.push(spec);
    await writeGlobalRuntimeOpencodeConfig(serverConfig, (current) => ({ ...current, plugin: pluginSpecs }));
    return true;
}
export async function removePlugin(serverConfig, name) {
    const runtimeConfig = await readGlobalRuntimeOpencodeConfig(serverConfig);
    const pluginSpecs = runtimePluginList(runtimeConfig);
    const normalized = normalizePluginSpec(name);
    const filtered = pluginSpecs.filter((item) => normalizePluginSpec(item) !== normalized);
    if (filtered.length === pluginSpecs.length)
        return false;
    await writeGlobalRuntimeOpencodeConfig(serverConfig, (current) => ({ ...current, plugin: filtered }));
    return true;
}

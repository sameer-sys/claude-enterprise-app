const PORTABLE_OPENCODE_TOP_LEVEL_KEYS = [
    "agent",
    "command",
    "instructions",
    "mcp",
    "permission",
    "plugin",
    "share",
    "tools",
    "watcher",
];
function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}
export function sanitizePortableOpencodeConfig(opencode) {
    const source = opencode && typeof opencode === "object" && !Array.isArray(opencode) ? opencode : {};
    const next = {};
    for (const key of PORTABLE_OPENCODE_TOP_LEVEL_KEYS) {
        if (!(key in source))
            continue;
        next[key] = cloneJson(source[key]);
    }
    return next;
}

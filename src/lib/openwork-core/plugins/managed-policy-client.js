function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function record(value) { return isRecord(value) ? value : {}; }
export async function checkManagedTool(tool, raw, evaluate = check) {
    const input = record(raw);
    let action;
    if (tool === "bash" || tool === "shell")
        action = "shell";
    else if (["write", "edit", "apply_patch", "patch"].includes(tool))
        action = "file_write";
    else if (tool === "webfetch" || tool === "websearch")
        action = tool;
    else if (tool === "browser_navigate" || tool === "browser_open")
        action = "browser";
    else if (tool === "openwork_execute") {
        if (input.id === "browser.open_url")
            return evaluate("browser", record(input.args));
        if (typeof input.id === "string" && /^(?:plugin|skill|mcp)\.(?:install|add|update|remove)/.test(input.id))
            action = "extensions";
    }
    // Even read-only tools synchronize policy, so unknown identities cannot keep
    // running with a previous member's loaded configuration.
    await evaluate(action ?? "sync", input);
}
export async function check(action, input) {
    const base = process.env.OPENWORK_SERVER_URL;
    const token = process.env.OPENWORK_POLICY_TOKEN;
    if (!base || !token)
        throw new Error("OpenWork policy service is unavailable.");
    const response = await fetch(`${base}/managed-policy/evaluate`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action, input }), signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
        const payload = record(await response.json());
        throw new Error(typeof payload.message === "string" ? payload.message : "Your organization blocked this action.");
    }
}

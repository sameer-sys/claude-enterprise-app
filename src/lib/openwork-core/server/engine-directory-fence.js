const queuesByConfig = new WeakMap();
function directoryKey(workspace) {
    const directory = workspace.directory?.trim() || workspace.path.trim();
    return process.platform === "win32"
        ? directory.replace(/^\\\\\?\\/, "").replace(/^\/\/\?\//, "").toLowerCase()
        : directory;
}
/**
 * Serialize target-directory runtime maintenance. Prompt forwarding does not
 * join this queue. Different directories intentionally use different queues.
 */
export async function withEngineDirectoryFence(config, workspace, operation) {
    let queue = queuesByConfig.get(config);
    if (!queue) {
        queue = new Map();
        queuesByConfig.set(config, queue);
    }
    const key = directoryKey(workspace);
    const previous = queue.get(key) ?? Promise.resolve();
    let release = () => { };
    const current = new Promise((resolve) => {
        release = resolve;
    });
    queue.set(key, current);
    await previous.catch(() => undefined);
    try {
        return await operation();
    }
    finally {
        release();
        if (queue.get(key) === current)
            queue.delete(key);
    }
}

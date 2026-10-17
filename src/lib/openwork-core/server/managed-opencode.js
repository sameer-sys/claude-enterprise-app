import { spawn } from "node:child_process";
import net from "node:net";
import { randomUUID } from "node:crypto";
import { appendEngineOutputTail, createEngineStartupLineReader } from "./engine-output.js";
export function createManagedProcessClose(child, options = {}) {
    let closePromise = null;
    let exited = child.exitCode !== null || child.signalCode !== null;
    const exitedPromise = new Promise((resolve) => {
        if (exited) {
            resolve();
            return;
        }
        child.once("exit", () => {
            exited = true;
            resolve();
        });
    });
    const waitForExit = async (timeoutMs) => {
        if (exited)
            return true;
        let timer;
        const timedOut = new Promise((resolve) => {
            timer = setTimeout(() => resolve(false), timeoutMs);
        });
        const didExit = await Promise.race([exitedPromise.then(() => true), timedOut]);
        if (timer !== undefined)
            clearTimeout(timer);
        return didExit;
    };
    const isAlive = () => !exited && child.exitCode === null && child.signalCode === null;
    const close = () => {
        closePromise ??= (async () => {
            if (!isAlive())
                return;
            try {
                child.kill("SIGTERM");
            }
            catch {
                // Re-check through the exit event before escalating.
            }
            if (await waitForExit(options.termTimeoutMs ?? 1_000))
                return;
            try {
                child.kill("SIGKILL");
            }
            catch {
                // Re-check below; kill can race a natural exit.
            }
            if (!await waitForExit(options.killTimeoutMs ?? 500)) {
                throw new Error("Managed OpenCode process did not exit after SIGKILL");
            }
        })();
        return closePromise;
    };
    return { isAlive, close };
}
const SECRET_ENV_PATTERN = /(TOKEN|PASSWORD|USERNAME|AUTH|SECRET|KEY|CREDENTIAL)/i;
function randomSecret() {
    return randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
}
async function findFreePortOnce(hostname) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once("error", reject);
        server.listen(0, hostname, () => {
            const address = server.address();
            server.close(() => {
                if (address && typeof address === "object")
                    resolve(address.port);
                else
                    reject(new Error("Failed to resolve free port"));
            });
        });
    });
}
async function findFreePort(hostname, excludedPorts = []) {
    const excluded = new Set(excludedPorts.filter((port) => Number.isInteger(port) && port > 0 && port <= 65535));
    for (let attempt = 0; attempt < 20; attempt += 1) {
        const port = await findFreePortOnce(hostname);
        if (!excluded.has(port))
            return port;
    }
    throw new Error("Failed to resolve free port outside the excluded set");
}
class ManagedOpencodeExitError extends Error {
    exitCode;
    addressInUse;
    constructor(exitCode, output, addressInUse) {
        super(`OpenCode server exited with code ${exitCode}${addressInUse ? " (EADDRINUSE)" : ""}${output.trim() ? `\n${output}` : ""}`);
        this.exitCode = exitCode;
        this.addressInUse = addressInUse;
    }
}
function isRetryableAddressInUseExit(error) {
    return error instanceof ManagedOpencodeExitError &&
        error.exitCode === 1 &&
        error.addressInUse;
}
async function startManagedOpencodeServer(options, hostname, port) {
    const username = randomSecret();
    const password = randomSecret();
    const args = ["serve", "--hostname", hostname, "--port", String(port), "--cors", "*"];
    const command = options.bin?.trim() || "opencode";
    // The engine's in-process npm installs use Arborist, which audits by default.
    // That audit POST depends on npm's advisories endpoint, which has been observed
    // to hang for the full five-minute registry timeout, so first-run must not wait.
    // @npmcli/config reads npm_config_* settings from the environment.
    const engineEnvDefaults = { npm_config_audit: "false" };
    const env = {
        ...process.env,
        ...engineEnvDefaults,
        ...options.env,
        OPENCODE_SERVER_USERNAME: username,
        OPENCODE_SERVER_PASSWORD: password,
    };
    // The managed engine needs its own provider environment, but never the key
    // that decrypts OpenWork-owned OAuth credentials.
    delete env.OPENWORK_ENCRYPTION_KEY;
    const injectedEnv = Object.entries({
        ...engineEnvDefaults,
        ...(options.env ?? {}),
        OPENCODE_SERVER_USERNAME: username,
        OPENCODE_SERVER_PASSWORD: password,
    })
        .filter((entry) => typeof entry[1] === "string")
        .map(([name, value]) => ({
        name,
        value: SECRET_ENV_PATTERN.test(name) ? "<redacted>" : value,
        redacted: SECRET_ENV_PATTERN.test(name),
    }))
        .sort((left, right) => left.name.localeCompare(right.name));
    const child = spawn(options.bin?.trim() || "opencode", args, {
        cwd: options.cwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
    });
    const processLifecycle = createManagedProcessClose(child);
    let url;
    try {
        url = await new Promise((resolve, reject) => {
            let settled = false;
            let stdout = "";
            let stderr = "";
            let addressInUse = false;
            const output = () => `stdout:\n${stdout}\nstderr:\n${stderr}`;
            const collect = (tail, text) => {
                // Remember the retry signal even if later diagnostics evict it. Keep
                // stream boundaries separate, including a token split across chunks.
                // Do not invent a word boundary where the overlap was cut.
                addressInUse ||= /\bEADDRINUSE\b[\s\S]/.test((tail.length > 16 ? "_" : "") + tail.slice(-16) + text);
                return appendEngineOutputTail(tail, text);
            };
            const finish = () => {
                settled = true;
                clearTimeout(timeout);
                lines.stop();
                stdout = "";
                stderr = "";
                child.removeListener("close", onClose);
            };
            const done = (value) => {
                if (settled)
                    return;
                finish();
                resolve(value);
            };
            const fail = (error) => {
                if (settled)
                    return;
                finish();
                reject(error);
            };
            const lines = createEngineStartupLineReader((line) => {
                if (!line.startsWith("opencode server listening"))
                    return;
                const match = line.match(/on\s+(https?:\/\/[^\s]+)/);
                if (!match?.[1])
                    return fail(new Error(`Failed to parse OpenCode server URL from: ${line}\n${output()}`));
                done(match[1]);
            });
            const timeout = setTimeout(() => fail(new Error(`Timeout waiting for OpenCode server after ${options.timeoutMs ?? 15000}ms\n${output()}`)), options.timeoutMs ?? 15000);
            const onClose = (code) => {
                if (!settled)
                    fail(new ManagedOpencodeExitError(code, output(), addressInUse || /\bEADDRINUSE$/.test(stdout) || /\bEADDRINUSE$/.test(stderr)));
            };
            child.stdout?.on("data", (chunk) => {
                // Keep draining both pipes after startup, without decoding or parsing.
                if (settled)
                    return;
                const text = chunk.toString();
                stdout = collect(stdout, text);
                lines.write(text);
            });
            child.stderr?.on("data", (chunk) => {
                if (settled)
                    return;
                stderr = collect(stderr, chunk.toString());
            });
            child.on("error", fail);
            // ChildProcess can emit "exit" before its stdio pipes have drained. Wait
            // for "close" so retry classification includes every diagnostic line.
            child.once("close", onClose);
        });
    }
    catch (error) {
        await processLifecycle.close();
        throw error;
    }
    return {
        url,
        username,
        password,
        pid: child.pid ?? null,
        execution: {
            command,
            args,
            cwd: options.cwd,
            env: injectedEnv,
        },
        isAlive: processLifecycle.isAlive,
        close: processLifecycle.close,
    };
}
export async function createManagedOpencodeServer(options) {
    const hostname = options.hostname ?? "127.0.0.1";
    const port = options.port ?? await findFreePort(hostname, options.excludedPorts);
    try {
        return await startManagedOpencodeServer(options, hostname, port);
    }
    catch (error) {
        // The automatic free-port probe is necessarily racy. Retry exactly once on
        // the one startup failure that a new port can safely fix; explicit ports
        // and all other code-1 exits remain actionable.
        if (options.port !== undefined || !isRetryableAddressInUseExit(error))
            throw error;
        const retryPort = await findFreePort(hostname, [...(options.excludedPorts ?? []), port]);
        return startManagedOpencodeServer(options, hostname, retryPort);
    }
}

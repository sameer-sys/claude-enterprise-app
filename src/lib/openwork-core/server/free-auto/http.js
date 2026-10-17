import { ApiError } from "../errors.js";
export function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function jsonError(status, code, message) {
    return Response.json({ error: { message, type: "openwork_anonymous_error", code } }, { status });
}
/** Only these gateway headers reach the engine. */
export function responseHeaders(headers) {
    const result = new Headers({ "cache-control": "no-store" });
    for (const name of ["content-type", "retry-after", "x-request-id", "x-openwork-request-id", "x-openwork-error-code", "x-openwork-usage-state", "x-openwork-anonymous-no-upstream-retry"]) {
        const value = headers.get(name);
        if (value)
            result.set(name, value);
    }
    return result;
}
export async function readBoundedBody(stream, limit, signal) {
    signal.throwIfAborted();
    if (!stream)
        return new Uint8Array();
    const reader = stream.getReader();
    const chunks = [];
    let length = 0;
    const abort = () => { void reader.cancel(signal.reason).catch(() => undefined); };
    signal.addEventListener("abort", abort, { once: true });
    try {
        while (true) {
            signal.throwIfAborted();
            const chunk = await reader.read();
            signal.throwIfAborted();
            if (chunk.done)
                break;
            length += chunk.value.byteLength;
            if (length > limit)
                throw new ApiError(413, "anonymous_request_too_large", "The OpenWork Models request is too large.");
            chunks.push(chunk.value);
        }
    }
    catch (error) {
        void reader.cancel(error).catch(() => undefined);
        throw error;
    }
    finally {
        signal.removeEventListener("abort", abort);
        reader.releaseLock();
    }
    const body = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return body;
}
export async function readJson(stream, limit, signal) {
    return JSON.parse(new TextDecoder().decode(await readBoundedBody(stream, limit, signal)));
}
/** A gateway response that was not OK, kept whole so it can be replayed to the engine. */
export class RemoteFailure extends Error {
    status;
    body;
    headers;
    constructor(status, body, headers) {
        super("Desktop free inference gateway rejected the request.");
        this.status = status;
        this.body = body;
        this.headers = headers;
    }
    response() { return new Response(this.body.slice(), { status: this.status, headers: this.headers }); }
    /** The error envelope flattened: top level, `error`, and `details` fields in one record. */
    payload() {
        try {
            const parsed = JSON.parse(new TextDecoder().decode(this.body));
            if (isRecord(parsed)) {
                if (isRecord(parsed.error))
                    return { ...parsed, ...parsed.error, ...(isRecord(parsed.error.details) ? parsed.error.details : {}) };
                return { ...parsed, ...(isRecord(parsed.details) ? parsed.details : {}) };
            }
        }
        catch { }
        return {};
    }
}

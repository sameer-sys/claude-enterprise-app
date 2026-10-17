import { shortId } from "./utils.js";
export class ApprovalService {
    config;
    pending = new Map();
    constructor(config) {
        this.config = config;
    }
    list() {
        return Array.from(this.pending.values()).map((entry) => entry.request);
    }
    async requestApproval(input) {
        if (this.config.mode === "auto") {
            return { id: "auto", allowed: true };
        }
        const id = shortId();
        const request = {
            ...input,
            id,
            createdAt: Date.now(),
        };
        const result = await new Promise((resolve) => {
            const timeout = setTimeout(() => {
                this.pending.delete(id);
                resolve({ id, allowed: false, reason: "timeout" });
            }, this.config.timeoutMs);
            this.pending.set(id, { request, resolve, timeout });
        });
        return result;
    }
    respond(id, reply) {
        const pending = this.pending.get(id);
        if (!pending)
            return null;
        if (pending.timeout)
            clearTimeout(pending.timeout);
        this.pending.delete(id);
        const result = {
            id,
            allowed: reply === "allow",
            reason: reply === "allow" ? undefined : "denied",
        };
        pending.resolve(result);
        return result;
    }
}

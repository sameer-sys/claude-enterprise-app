import { shortId } from "./utils.js";
export class ReloadEventStore {
    events = [];
    seq = 0;
    maxSize;
    lastRecorded = new Map();
    constructor(maxSize = 200) {
        this.maxSize = maxSize;
    }
    record(workspaceId, reason, trigger) {
        const event = {
            id: shortId(),
            seq: ++this.seq,
            workspaceId,
            reason,
            trigger,
            timestamp: Date.now(),
        };
        this.events.push(event);
        if (this.events.length > this.maxSize) {
            this.events.splice(0, this.events.length - this.maxSize);
        }
        return event;
    }
    recordDebounced(workspaceId, reason, trigger, debounceMs = 750) {
        const now = Date.now();
        const key = `${workspaceId}:${reason}`;
        const last = this.lastRecorded.get(key) ?? 0;
        if (now - last < debounceMs)
            return null;
        this.lastRecorded.set(key, now);
        return this.record(workspaceId, reason, trigger);
    }
    list(workspaceId, since) {
        const cursor = Number.isFinite(since) ? since : 0;
        return this.events.filter((event) => event.workspaceId === workspaceId && event.seq > cursor);
    }
    cursor() {
        return this.seq;
    }
}

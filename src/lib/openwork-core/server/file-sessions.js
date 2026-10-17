import { shortId } from "./utils.js";
export class FileSessionStore {
    sessions = new Map();
    workspaceEvents = new Map();
    maxSessions;
    maxEventsPerWorkspace;
    constructor(options) {
        this.maxSessions = options?.maxSessions ?? 256;
        this.maxEventsPerWorkspace = options?.maxEventsPerWorkspace ?? 500;
    }
    create(input) {
        this.pruneExpired();
        this.evictIfNeeded();
        const now = Date.now();
        const record = {
            id: shortId(),
            workspaceId: input.workspaceId,
            workspaceRoot: input.workspaceRoot,
            actorTokenHash: input.actorTokenHash,
            actorScope: input.actorScope,
            canWrite: input.canWrite,
            createdAt: now,
            expiresAt: now + input.ttlMs,
        };
        this.sessions.set(record.id, record);
        return record;
    }
    get(sessionId) {
        this.pruneExpired();
        const value = this.sessions.get(sessionId);
        return value ?? null;
    }
    close(sessionId) {
        return this.sessions.delete(sessionId);
    }
    recordWorkspaceEvent(input) {
        const state = this.workspaceEvents.get(input.workspaceId) ?? { seq: 0, events: [] };
        const event = {
            id: shortId(),
            seq: state.seq + 1,
            workspaceId: input.workspaceId,
            type: input.type,
            path: input.path,
            toPath: input.toPath,
            revision: input.revision,
            timestamp: Date.now(),
        };
        state.seq = event.seq;
        state.events.push(event);
        if (state.events.length > this.maxEventsPerWorkspace) {
            state.events.splice(0, state.events.length - this.maxEventsPerWorkspace);
        }
        this.workspaceEvents.set(input.workspaceId, state);
        return event;
    }
    listWorkspaceEvents(workspaceId, since = 0) {
        const state = this.workspaceEvents.get(workspaceId);
        if (!state) {
            return { items: [], cursor: 0 };
        }
        const cursor = Number.isFinite(since) && since > 0 ? since : 0;
        const items = state.events.filter((item) => item.seq > cursor);
        return { items, cursor: state.seq };
    }
    pruneExpired() {
        const now = Date.now();
        for (const [id, session] of this.sessions) {
            if (session.expiresAt <= now) {
                this.sessions.delete(id);
            }
        }
    }
    evictIfNeeded() {
        if (this.sessions.size < this.maxSessions)
            return;
        let oldestId = null;
        let oldestExpiry = Number.POSITIVE_INFINITY;
        for (const [id, session] of this.sessions) {
            if (session.expiresAt < oldestExpiry) {
                oldestExpiry = session.expiresAt;
                oldestId = id;
            }
        }
        if (oldestId) {
            this.sessions.delete(oldestId);
        }
    }
}

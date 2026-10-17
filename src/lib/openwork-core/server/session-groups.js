import { runtimeDbPath } from "./runtime-db.js";
import { shortId } from "./utils.js";
import { createWorkspaceKvStore, isRecord } from "./workspace-kv-store.js";
const EMPTY_SESSION_GROUP_STATE = { groups: [], assignments: {} };
function normalizeGroupId(value) {
    if (typeof value !== "string")
        return "";
    const trimmed = value.trim();
    if (!trimmed)
        return "";
    return trimmed.slice(0, 128);
}
function normalizeLabel(value) {
    if (typeof value !== "string")
        return "";
    return value.trim().slice(0, 120);
}
export function createSessionGroupId() {
    return `grp_${Date.now().toString(36)}_${shortId()}`;
}
export function normalizeSessionGroupState(value) {
    if (!isRecord(value))
        return EMPTY_SESSION_GROUP_STATE;
    const groups = [];
    const seenGroupIds = new Set();
    if (Array.isArray(value.groups)) {
        for (const item of value.groups) {
            if (!isRecord(item))
                continue;
            const id = normalizeGroupId(item.id);
            const label = normalizeLabel(item.label);
            if (!id || !label || seenGroupIds.has(id))
                continue;
            groups.push({ id, label });
            seenGroupIds.add(id);
        }
    }
    const assignments = {};
    if (isRecord(value.assignments)) {
        for (const [sessionId, rawGroupId] of Object.entries(value.assignments)) {
            const normalizedSessionId = sessionId.trim().slice(0, 256);
            const groupId = normalizeGroupId(rawGroupId);
            if (!normalizedSessionId || !groupId || !seenGroupIds.has(groupId))
                continue;
            assignments[normalizedSessionId] = groupId;
        }
    }
    return { groups, assignments };
}
const updateQueueByWorkspace = new Map();
function parseSessionGroupState(stateJson) {
    try {
        return normalizeSessionGroupState(JSON.parse(stateJson));
    }
    catch {
        return EMPTY_SESSION_GROUP_STATE;
    }
}
const sessionGroupStateStore = createWorkspaceKvStore({
    tableName: "session_group_states",
    valueColumn: "state_json",
    extraColumns: { schemaVersion: { name: "schema_version", definition: "INTEGER NOT NULL DEFAULT 1", value: 1 } },
    parse: parseSessionGroupState,
    serialize: (value) => JSON.stringify(value),
});
export async function readSessionGroupState(config, workspaceId) {
    const row = await sessionGroupStateStore.getRow(config, workspaceId);
    if (!row || row.updatedAt === null)
        return { state: EMPTY_SESSION_GROUP_STATE, updatedAt: null };
    return { state: row.value, updatedAt: row.updatedAt };
}
export async function writeSessionGroupState(config, workspaceId, state) {
    const next = normalizeSessionGroupState(state);
    const updatedAt = Date.now();
    await sessionGroupStateStore.set(config, workspaceId, next, updatedAt);
    return { state: next, updatedAt };
}
export async function updateSessionGroupState(config, workspaceId, updater) {
    const key = `${runtimeDbPath(config)}:${workspaceId}`;
    const previous = updateQueueByWorkspace.get(key) ?? Promise.resolve();
    let release = () => { };
    const queued = new Promise((resolve) => {
        release = resolve;
    });
    const currentQueue = previous.then(() => queued, () => queued);
    updateQueueByWorkspace.set(key, currentQueue);
    await previous.catch(() => undefined);
    try {
        const current = await readSessionGroupState(config, workspaceId);
        return await writeSessionGroupState(config, workspaceId, updater(current.state));
    }
    finally {
        release();
        if (updateQueueByWorkspace.get(key) === currentQueue) {
            updateQueueByWorkspace.delete(key);
        }
    }
}
export class SessionGroupEventStore {
    eventsByWorkspace = new Map();
    maxSize;
    constructor(maxSize = 500) {
        this.maxSize = maxSize;
    }
    record(workspaceId, action, details) {
        const state = this.eventsByWorkspace.get(workspaceId) ?? { seq: 0, events: [] };
        const event = {
            id: shortId(),
            seq: ++state.seq,
            workspaceId,
            type: "session_groups.updated",
            action,
            ...(details?.groupId ? { groupId: details.groupId } : {}),
            ...(details?.sessionId ? { sessionId: details.sessionId } : {}),
            timestamp: Date.now(),
        };
        state.events.push(event);
        if (state.events.length > this.maxSize) {
            state.events.splice(0, state.events.length - this.maxSize);
        }
        this.eventsByWorkspace.set(workspaceId, state);
        return event;
    }
    list(workspaceId, since) {
        const cursor = typeof since === "number" && Number.isFinite(since) ? since : 0;
        const state = this.eventsByWorkspace.get(workspaceId);
        return state ? state.events.filter((event) => event.seq > cursor) : [];
    }
    cursor(workspaceId) {
        return this.eventsByWorkspace.get(workspaceId)?.seq ?? 0;
    }
}

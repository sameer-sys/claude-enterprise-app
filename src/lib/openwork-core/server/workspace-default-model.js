import { z } from "zod";
import { createWorkspaceKvStore } from "./workspace-kv-store.js";
/**
 * The model a new chat in a workspace would use. The renderer owns the choice
 * and mirrors it here so background callers (automations, remote sessions,
 * cloud workers) can start sessions on the same model.
 */
const modelPart = z.string().trim().min(1).max(200);
export const workspaceDefaultModelSchema = z.object({
    providerID: modelPart,
    modelID: modelPart,
    variant: modelPart.optional(),
});
export const workspaceDefaultModelBodySchema = z.object({
    model: workspaceDefaultModelSchema.nullable(),
});
function parseStoredModel(json) {
    let value;
    try {
        value = JSON.parse(json);
    }
    catch {
        return null;
    }
    const parsed = workspaceDefaultModelSchema.nullable().safeParse(value);
    return parsed.success ? parsed.data : null;
}
const workspaceDefaultModelStore = createWorkspaceKvStore({
    tableName: "workspace_default_models",
    valueColumn: "model_json",
    parse: parseStoredModel,
    serialize: (value) => JSON.stringify(value),
});
export async function readWorkspaceDefaultModel(config, workspaceId) {
    const row = await workspaceDefaultModelStore.getRow(config, workspaceId);
    if (!row)
        return { model: null, updatedAt: null };
    return { model: row.value, updatedAt: row.updatedAt };
}
export async function writeWorkspaceDefaultModel(config, workspaceId, model) {
    const updatedAt = Date.now();
    await workspaceDefaultModelStore.set(config, workspaceId, model, updatedAt);
    return { model, updatedAt };
}

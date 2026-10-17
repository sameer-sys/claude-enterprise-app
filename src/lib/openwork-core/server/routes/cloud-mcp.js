import { isTrustedCloudMcpEndpointForGlobalPersist, OPENWORK_CLOUD_MCP_NAME, readOpenworkCloudMcpHealth, reconcileOpenworkCloudMcp, refreshOpenworkCloudMcpEngine, refreshOpenworkCloudMcpCatalog, } from "../cloud-mcp-health.js";
import { ApiError } from "../errors.js";
import { addRoute } from "./registry.js";
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function providerModelFromValues(provider, model) {
    const providerValue = typeof provider === "string" ? provider.trim() : "";
    const modelValue = typeof model === "string" ? model.trim() : "";
    if (!providerValue && !modelValue)
        return undefined;
    if (!providerValue || !modelValue) {
        throw new ApiError(400, "invalid_payload", "provider and model must be supplied together");
    }
    return { provider: providerValue, model: modelValue };
}
function providerModelFromQuery(url) {
    return providerModelFromValues(url.searchParams.get("provider"), url.searchParams.get("model"));
}
function probeFromQuery(url) {
    const value = url.searchParams.get("probe")?.toLowerCase();
    return value === "1" || value === "true";
}
function providerModelFromBody(body) {
    const direct = providerModelFromValues(body.provider, body.model);
    if (direct)
        return direct;
    if (!isRecord(body.context))
        return undefined;
    return providerModelFromValues(body.context.provider, body.context.model);
}
function assertExactWorkspace(requestedId, workspace) {
    if (requestedId.trim() !== workspace.id) {
        throw new ApiError(404, "workspace_not_found", "Workspace not found");
    }
}
function assertStrictBody(body, workspace) {
    if (typeof body.workspaceId === "string" && body.workspaceId.trim() !== workspace.id) {
        throw new ApiError(400, "workspace_id_mismatch", "workspaceId must match the route workspace");
    }
    if (typeof body.name === "string" && body.name.trim() !== OPENWORK_CLOUD_MCP_NAME) {
        throw new ApiError(400, "invalid_mcp_name", "Only openwork-cloud can be reconciled by this endpoint");
    }
}
export function registerCloudMcpRoutes(options) {
    const { routes, config, jsonResponse, readJsonBody, ensureWritable, requireClientScope, resolveWorkspace, resolveOpencodeDirectory, createWorkspaceOpencodeClient, registerRuntimeMcp, nativeEngineForWorkspace, refreshRegistrationFromLiveStatus, serverMetadata, } = options;
    addRoute(routes, "GET", "/workspace/:id/mcp/openwork-cloud/health", "client", async (ctx) => {
        const workspace = await resolveWorkspace(config, ctx.params.id);
        assertExactWorkspace(ctx.params.id, workspace);
        const health = await readOpenworkCloudMcpHealth({
            config,
            workspace,
            directory: resolveOpencodeDirectory(workspace),
            providerModel: providerModelFromQuery(ctx.url),
            serverMetadata,
            probe: probeFromQuery(ctx.url),
            createWorkspaceOpencodeClient,
            nativeEngineForWorkspace,
            refreshRegistrationFromLiveStatus,
        });
        return jsonResponse(health);
    });
    addRoute(routes, "POST", "/workspace/:id/mcp/openwork-cloud/engine-refresh", "client", async (ctx) => {
        ensureWritable(config);
        requireClientScope(ctx, "collaborator");
        const workspace = await resolveWorkspace(config, ctx.params.id);
        assertExactWorkspace(ctx.params.id, workspace);
        // The refresh needs no payload; an optional body may scope provider/model
        // and name the trigger for the delivery ledger. An absent/empty body is
        // fine, but malformed JSON stays a hard 400 — never silently ignored.
        const raw = (await ctx.request.text()).trim();
        let body = {};
        if (raw) {
            let parsed;
            try {
                parsed = JSON.parse(raw);
            }
            catch {
                throw new ApiError(400, "invalid_json", "Invalid JSON body");
            }
            if (!isRecord(parsed)) {
                throw new ApiError(400, "invalid_payload", "JSON object body is required");
            }
            body = parsed;
        }
        assertStrictBody(body, workspace);
        const result = await refreshOpenworkCloudMcpEngine({
            config,
            workspace,
            directory: resolveOpencodeDirectory(workspace),
            providerModel: providerModelFromBody(body),
            serverMetadata,
            createWorkspaceOpencodeClient,
            nativeEngineForWorkspace,
            registerRuntimeMcp,
            refreshRegistrationFromLiveStatus,
            trigger: typeof body.trigger === "string" ? body.trigger : undefined,
        });
        return jsonResponse(result);
    });
    addRoute(routes, "POST", "/workspace/:id/mcp/openwork-cloud/reconcile", "client", async (ctx) => {
        ensureWritable(config);
        requireClientScope(ctx, "collaborator");
        const workspace = await resolveWorkspace(config, ctx.params.id);
        assertExactWorkspace(ctx.params.id, workspace);
        const body = await readJsonBody(ctx.request);
        if (!isRecord(body)) {
            throw new ApiError(400, "invalid_payload", "JSON object body is required");
        }
        assertStrictBody(body, workspace);
        if (body.mode === "refresh_catalog") {
            if (Object.keys(body).some((key) => !["mode", "workspaceId", "name", "provider", "model"].includes(key))) {
                throw new ApiError(400, "invalid_payload", "Catalog refresh uses only the persisted Cloud configuration");
            }
            return jsonResponse(await refreshOpenworkCloudMcpCatalog({
                config,
                workspace,
                directory: resolveOpencodeDirectory(workspace),
                providerModel: providerModelFromBody(body),
                serverMetadata,
                createWorkspaceOpencodeClient,
                nativeEngineForWorkspace,
                registerRuntimeMcp,
                refreshRegistrationFromLiveStatus,
            }));
        }
        // Reconcile persists the account-global desired config (it reconfigures
        // Connect for every workspace). Collaborator scope suffices only for
        // trusted endpoints; anything else needs the owner.
        const configBody = isRecord(body.config) ? body.config : body;
        const endpointUrl = typeof configBody.url === "string" ? configBody.url : "";
        if (!await isTrustedCloudMcpEndpointForGlobalPersist(endpointUrl)) {
            requireClientScope(ctx, "owner");
        }
        const health = await reconcileOpenworkCloudMcp({
            config,
            workspace,
            directory: resolveOpencodeDirectory(workspace),
            body,
            providerModel: providerModelFromBody(body),
            serverMetadata,
            createWorkspaceOpencodeClient,
            nativeEngineForWorkspace,
            registerRuntimeMcp,
            refreshRegistrationFromLiveStatus,
        });
        return jsonResponse(health);
    });
}

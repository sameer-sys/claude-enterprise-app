import { join } from "node:path";
import { resolveWorkspaceOpencodeConfigPath } from "@openwork/paths";
export function opencodeConfigPath(workspaceRoot) {
    return resolveWorkspaceOpencodeConfigPath(workspaceRoot);
}
export function openworkConfigPath(workspaceRoot) {
    return join(workspaceRoot, ".opencode", "openwork.json");
}
export function projectSkillsDir(workspaceRoot) {
    return join(workspaceRoot, ".opencode", "skills");
}
export function projectCommandsDir(workspaceRoot) {
    return join(workspaceRoot, ".opencode", "commands");
}
export function projectPluginsDir(workspaceRoot) {
    return join(workspaceRoot, ".opencode", "plugins");
}

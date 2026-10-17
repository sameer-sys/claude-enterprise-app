import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: __accessProp.bind(mod, key),
        enumerable: true
      });
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// src/opencode-plugins/managed-policy-client.ts
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function record(value) {
  return isRecord(value) ? value : {};
}
async function checkManagedTool(tool, raw, evaluate = check) {
  const input = record(raw);
  let action;
  if (tool === "bash" || tool === "shell")
    action = "shell";
  else if (["write", "edit", "apply_patch", "patch"].includes(tool))
    action = "file_write";
  else if (tool === "webfetch" || tool === "websearch")
    action = tool;
  else if (tool === "browser_navigate" || tool === "browser_open")
    action = "browser";
  else if (tool === "openwork_execute") {
    if (input.id === "browser.open_url")
      return evaluate("browser", record(input.args));
    if (typeof input.id === "string" && /^(?:plugin|skill|mcp)\.(?:install|add|update|remove)/.test(input.id))
      action = "extensions";
  }
  await evaluate(action ?? "sync", input);
}
async function check(action, input) {
  const base = process.env.OPENWORK_SERVER_URL;
  const token = process.env.OPENWORK_POLICY_TOKEN;
  if (!base || !token)
    throw new Error("OpenWork policy service is unavailable.");
  const response = await fetch(`${base}/managed-policy/evaluate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action, input }),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) {
    const payload = record(await response.json());
    throw new Error(typeof payload.message === "string" ? payload.message : "Your organization blocked this action.");
  }
}

// src/opencode-plugins/managed-policy.ts
async function managedPolicy() {
  return {
    "tool.execute.before": async (input, output) => checkManagedTool(input.tool, output.args),
    "chat.params": async (input) => check("model", input.model)
  };
}
export {
  managedPolicy as default
};

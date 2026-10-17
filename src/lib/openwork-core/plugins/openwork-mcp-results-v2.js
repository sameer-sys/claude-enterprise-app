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

// src/opencode-plugins/openwork-mcp-results-v2.ts
var OPENWORK_CLOUD_TOOL = /^(?:openwork|openwork-cloud)_/;
var MAX_ENTRY_BYTES = 64 * 1024;
var MAX_ENTRIES = 20;
var MAX_OPEN_CALLS = 200;
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseRecord(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start || end - start > MAX_ENTRY_BYTES)
    return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
function reportsConnection(value) {
  if (!isRecord(value))
    return false;
  if ("connectionStatus" in value || "connectionAction" in value)
    return true;
  if (typeof value.connectionId === "string" && typeof value.state === "string")
    return true;
  return Array.isArray(value.matches) && value.matches.some((match) => isRecord(match) && typeof match.connectionId === "string");
}
function errorText(error) {
  if (error instanceof Error)
    return error.message;
  if (isRecord(error) && typeof error.message === "string")
    return error.message;
  return String(error);
}
function jsonCopy(value) {
  try {
    return value === undefined ? {} : JSON.parse(JSON.stringify(value));
  } catch {
    return {};
  }
}
function normalizedTool(tool) {
  return tool.replace(/^(openwork(?:-cloud)?)\./, "$1_");
}
function preservedEntry(rawEvent) {
  const event = { ...rawEvent, tool: normalizedTool(rawEvent.tool) };
  if (!OPENWORK_CLOUD_TOOL.test(event.tool))
    return null;
  const appBuilder = /_(?:search_capabilities|prepare_app|create_app|update_app)$/.test(event.tool);
  const appLaunch = event.status === "completed" && isRecord(event.result.output) && isRecord(event.result.output.launch);
  const input = jsonCopy(event.input);
  const entry = event.status === "completed" ? appBuilder || appLaunch || reportsConnection(event.result.output) ? { tool: event.tool, input, status: "completed", output: jsonCopy(event.result.output) } : null : appBuilder || reportsConnection(parseRecord(errorText(event.error))) ? { tool: event.tool, input, status: "error", error: errorText(event.error) } : null;
  if (!entry)
    return null;
  return new TextEncoder().encode(JSON.stringify(entry)).byteLength <= MAX_ENTRY_BYTES ? entry : null;
}
function createMcpResultsCollector() {
  const open = new Map;
  const key = (event) => `${event.messageID}\x00${event.id}`;
  return {
    before(event) {
      if (event.tool !== "execute")
        return;
      if (open.size >= MAX_OPEN_CALLS) {
        const oldest = open.keys().next().value;
        if (oldest !== undefined)
          open.delete(oldest);
      }
      open.set(key(event), []);
    },
    after(event) {
      const list = open.get(key(event));
      if (event.tool === "execute") {
        open.delete(key(event));
        if (event.status === "completed" && list && list.length > 0) {
          event.result.metadata = { ...event.result.metadata ?? {}, openworkMcpResults: list };
        }
        return;
      }
      if (!list || list.length >= MAX_ENTRIES)
        return;
      const entry = preservedEntry(event);
      if (entry)
        list.push(entry);
    }
  };
}
var openwork_mcp_results_v2_default = {
  id: "openwork.mcp-results",
  async setup(context) {
    const collector = createMcpResultsCollector();
    const before = await context.tool.hook("execute.before", (event) => collector.before(event));
    const after = await context.tool.hook("execute.after", (event) => collector.after(event));
    return async () => {
      await before.dispose();
      await after.dispose();
    };
  }
};
export {
  reportsConnection,
  preservedEntry,
  openwork_mcp_results_v2_default as default,
  createMcpResultsCollector
};

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

// src/opencode-plugins/openwork-context-v2.ts
var openwork_context_v2_default = {
  id: "openwork.context",
  async setup(context) {
    const registration = await context.tool.transform((editor) => {
      for (const name of ["openwork_context", "openwork_query"]) {
        editor.add({
          name,
          description: name === "openwork_context" ? "Read OpenWork app context and available read-only affordances. Use this to discover session.search and session.read for other conversations." : "Read an OpenWork affordance without changing the app or navigating. Use the exact id and arguments from openwork_context; session.read includes live background-agent activity.",
          input: name === "openwork_context" ? { type: "object", properties: {}, additionalProperties: false } : {
            type: "object",
            properties: { id: { type: "string" }, args: { type: "object", additionalProperties: true } },
            required: ["id"],
            additionalProperties: false
          },
          options: { codemode: false },
          async execute(input, call) {
            const response = await fetch(context.options.url, {
              method: "POST",
              redirect: "error",
              signal: call.signal,
              headers: { Authorization: `Bearer ${context.options.token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ name, input })
            });
            if (!response.ok)
              throw new Error(`OpenWork read failed (${response.status})`);
            return { content: [{ type: "text", text: await response.text() }] };
          }
        });
      }
    });
    return () => registration.dispose();
  }
};
export {
  openwork_context_v2_default as default
};

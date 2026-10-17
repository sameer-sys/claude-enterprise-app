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

// src/opencode-plugins/openwork-anthropic-adaptive-thinking.ts
var LEGACY_HIGH_BUDGET_TOKENS = 16000;
function requiresAdaptiveThinking(apiId) {
  const match = /claude-[a-z]+-(\d+)(?:[.@-]|$)/i.exec(apiId);
  if (!match)
    return false;
  return Number(match[1]) >= 5;
}
function readBudgetTokens(thinking) {
  const budget = thinking.budgetTokens;
  return typeof budget === "number" ? budget : null;
}
function rewriteLegacyThinkingOptions(apiId, options) {
  const thinking = options.thinking;
  if (typeof thinking !== "object" || thinking === null || Array.isArray(thinking))
    return;
  const record = { ...thinking };
  if (record.type !== "enabled")
    return;
  if (!requiresAdaptiveThinking(apiId))
    return;
  const budget = readBudgetTokens(record);
  options.thinking = { type: "adaptive" };
  if (options.effort === undefined) {
    options.effort = budget !== null && budget > LEGACY_HIGH_BUDGET_TOKENS ? "max" : "high";
  }
}
var OpenWorkAnthropicAdaptiveThinking = async () => ({
  "chat.params": async (input, output) => {
    const apiId = input.model.api?.id ?? input.model.id;
    rewriteLegacyThinkingOptions(apiId, output.options);
  }
});
export {
  OpenWorkAnthropicAdaptiveThinking
};

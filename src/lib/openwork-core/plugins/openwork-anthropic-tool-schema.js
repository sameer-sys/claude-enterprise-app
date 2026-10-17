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

// src/opencode-plugins/openwork-anthropic-tool-schema.ts
var COMBINATOR_KEYS = ["anyOf", "oneOf", "allOf"];
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function stringList(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}
function flattenTopLevelCombinators(schema) {
  const key = COMBINATOR_KEYS.find((k) => Array.isArray(schema[k]));
  if (!key)
    return schema;
  const rawVariants = schema[key];
  if (!Array.isArray(rawVariants))
    return schema;
  const variants = rawVariants.filter(isRecord).map(flattenTopLevelCombinators);
  const properties = isRecord(schema.properties) ? { ...schema.properties } : {};
  const variantRequired = [];
  for (const variant of variants) {
    if (isRecord(variant.properties)) {
      for (const [name, property] of Object.entries(variant.properties)) {
        if (!(name in properties))
          properties[name] = property;
      }
    }
    variantRequired.push(stringList(variant.required));
  }
  const baseRequired = stringList(schema.required);
  const mergedRequired = key === "allOf" ? [...new Set([...baseRequired, ...variantRequired.flat()])] : [
    ...new Set([
      ...baseRequired,
      ...(variantRequired[0] ?? []).filter((name) => variantRequired.every((set) => set.includes(name)))
    ])
  ];
  const result = { ...schema, type: "object", properties };
  for (const combinator of COMBINATOR_KEYS)
    delete result[combinator];
  const required = mergedRequired.filter((name) => (name in properties));
  if (required.length)
    result.required = required;
  else
    delete result.required;
  if (key !== "allOf" && variantRequired.some((set) => set.length)) {
    const hint = variantRequired.map((set) => `(${set.length ? set.join(", ") : "none"})`).join(" or ");
    const description = typeof schema.description === "string" && schema.description ? `${schema.description}
` : "";
    result.description = `${description}Provide fields matching exactly one input variant; variant required fields: ${hint}.`;
  }
  return result;
}
function sanitizeAnthropicBody(body) {
  if (!body.includes("input_schema"))
    return null;
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.tools))
    return null;
  let changed = false;
  const tools = parsed.tools.map((tool) => {
    if (!isRecord(tool) || !isRecord(tool.input_schema))
      return tool;
    const sanitized = flattenTopLevelCombinators(tool.input_schema);
    if (sanitized === tool.input_schema)
      return tool;
    changed = true;
    return { ...tool, input_schema: sanitized };
  });
  if (!changed)
    return null;
  return JSON.stringify({ ...parsed, tools });
}
function hasAnthropicVersionHeader(headers) {
  if (!headers)
    return false;
  if (headers instanceof Headers)
    return headers.has("anthropic-version");
  if (Array.isArray(headers))
    return headers.some((entry) => entry[0]?.toLowerCase() === "anthropic-version");
  return Object.keys(headers).some((name) => name.toLowerCase() === "anthropic-version");
}
var installed = false;
function installAnthropicFetchPatch() {
  if (installed)
    return;
  installed = true;
  const base = globalThis.fetch;
  const patched = async (input, init) => {
    if (init && typeof init.body === "string" && hasAnthropicVersionHeader(init.headers)) {
      const sanitized = sanitizeAnthropicBody(init.body);
      if (sanitized !== null)
        return base(input, { ...init, body: sanitized });
    }
    return base(input, init);
  };
  globalThis.fetch = Object.assign(patched, base);
}
var OpenWorkAnthropicToolSchema = async () => {
  installAnthropicFetchPatch();
  return {};
};
export {
  OpenWorkAnthropicToolSchema
};

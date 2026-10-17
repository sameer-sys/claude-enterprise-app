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

// src/opencode-plugins/openwork-title-recovery.ts
var HEADER = "x-openwork-title-attempt";
var DEADLINE_MS = 60000;
var MAX_ERROR_BYTES = 16384;
var attempts = new Map;
var installed = false;
function record(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function report(attempt, outcome, status, parameter) {
  attempt.diagnostic = {
    ...attempt.diagnostic,
    outcome,
    recoveryAttempt: attempt.retried ? 2 : 1,
    ...status === undefined ? {} : { status },
    ...parameter === undefined ? {} : { parameter }
  };
  attempt.report(attempt.diagnostic);
}
function finish(id) {
  const attempt = attempts.get(id);
  if (attempt)
    clearTimeout(attempt.timer);
  attempts.delete(id);
}
async function errorBody(response) {
  const reader = response.clone().body?.getReader();
  if (!reader)
    return null;
  let size = 0;
  let text = "";
  const decoder = new TextDecoder;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done)
        break;
      size += chunk.value.byteLength;
      if (size > MAX_ERROR_BYTES)
        return null;
      text += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch {
    return null;
  } finally {
    reader.cancel().catch(() => {
      return;
    });
  }
}
function correction(body, value) {
  if (!record(value) || !record(value.error))
    return null;
  const error = value.error;
  if (error.code !== "unsupported_value" && error.code !== "unsupported_parameter")
    return null;
  const parameter = error.param;
  if (parameter !== "reasoning.effort" && parameter !== "reasoning_effort" && parameter !== "temperature" && parameter !== "top_p")
    return null;
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (!record(parsed))
    return null;
  const target = parameter === "reasoning.effort" ? parsed.reasoning : parsed;
  const key = parameter === "reasoning.effort" ? "effort" : parameter;
  if (!record(target) || !Object.hasOwn(target, key))
    return null;
  const message = typeof error.message === "string" ? error.message : "";
  const supported = /Supported values are:\s*([^\n]+)/i.exec(message)?.[1] ?? "";
  const efforts = new Set([...supported.matchAll(/['"](none|minimal|low|medium|high|xhigh|max)['"]/g)].map((match) => match[1]));
  const effort = ["low", "minimal", "medium", "high", "xhigh", "max", "none"].find((candidate) => efforts.has(candidate) && candidate !== target[key]);
  if ((parameter === "reasoning.effort" || parameter === "reasoning_effort") && effort)
    target[key] = effort;
  else
    delete target[key];
  return { body: JSON.stringify(parsed), parameter };
}
function failure(status) {
  if (status === 401 || status === 403)
    return "access_rejected";
  if (status === 404)
    return "model_or_endpoint_missing";
  if (status === 429)
    return "rate_or_quota_limited";
  if (status === 400 || status === 422)
    return "request_rejected";
  return "provider_error";
}
function install() {
  if (installed)
    return;
  installed = true;
  const base = globalThis.fetch;
  const patched = async (input, init) => {
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    const id = headers.get(HEADER);
    if (!id)
      return base(input, init);
    headers.delete(HEADER);
    const externalSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    const deadline = AbortSignal.timeout(DEADLINE_MS);
    const options = { ...init, headers, signal: externalSignal ? AbortSignal.any([externalSignal, deadline]) : deadline };
    const attempt = attempts.get(id);
    if (!attempt)
      return base(input, options);
    try {
      const response = await base(input, options);
      if (!response.ok) {
        report(attempt, failure(response.status), response.status);
        if (!attempt.retried && response.status === 400 && typeof init?.body === "string") {
          const recovered = correction(init.body, await errorBody(response));
          if (recovered && attempts.get(id) === attempt && !options.signal.aborted) {
            attempt.retried = true;
            report(attempt, "retrying_parameter", response.status, recovered.parameter);
            response.body?.cancel().catch(() => {
              return;
            });
            const retryHeaders = new Headers(headers);
            retryHeaders.delete("content-length");
            const retry = await base(input, { ...options, headers: retryHeaders, body: recovered.body });
            report(attempt, retry.ok ? "accepted_after_recovery" : failure(retry.status), retry.status);
            return retry;
          }
        }
      } else
        report(attempt, "accepted", response.status);
      return response;
    } catch (error) {
      report(attempt, externalSignal?.aborted ? "cancelled" : deadline.aborted ? "timed_out" : "transport_failed");
      throw error;
    }
  };
  globalThis.fetch = Object.assign(patched, base);
}
var OpenWorkTitleRecovery = async (input) => {
  install();
  const owned = new Set;
  const emit = (diagnostic) => {
    const level = ["started", "accepted", "accepted_after_recovery", "title_available"].includes(diagnostic.outcome) ? "info" : "warn";
    input.client.app.log({ body: {
      service: "openwork.title",
      level,
      message: "Automatic title generation",
      extra: diagnostic
    } }).catch(() => {
      return;
    });
  };
  return {
    "chat.headers": async (request, output) => {
      if (request.agent !== "title")
        return;
      const id = crypto.randomUUID();
      const diagnostic = {
        sessionID: request.sessionID,
        providerID: request.model.providerID,
        modelID: request.model.id,
        outcome: "started",
        recoveryAttempt: 1
      };
      if (attempts.size >= 512) {
        emit({ ...diagnostic, outcome: "tracking_capacity_reached" });
        return;
      }
      const timer = setTimeout(() => {
        const attempt = attempts.get(id);
        if (attempt && ["started", "accepted", "accepted_after_recovery"].includes(attempt.diagnostic.outcome)) {
          report(attempt, "title_unconfirmed");
        }
        finish(id);
        owned.delete(id);
      }, DEADLINE_MS);
      timer.unref?.();
      attempts.set(id, { diagnostic, report: emit, timer, retried: false });
      owned.add(id);
      output.headers[HEADER] = id;
      emit(diagnostic);
    },
    event: async ({ event }) => {
      if (event.type !== "session.updated" || !record(event.properties) || !record(event.properties.info))
        return;
      const info = event.properties.info;
      if (typeof info.title !== "string" || !info.title.trim() || info.title.startsWith("New session - "))
        return;
      for (const id of owned) {
        const attempt = attempts.get(id);
        if (!attempt || attempt.diagnostic.sessionID !== info.id)
          continue;
        report(attempt, "title_available");
        finish(id);
        owned.delete(id);
      }
    },
    dispose: async () => {
      for (const id of owned)
        finish(id);
      owned.clear();
    }
  };
};
export {
  OpenWorkTitleRecovery
};

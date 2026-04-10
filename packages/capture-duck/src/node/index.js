import { randomUUID } from "node:crypto";
import { parseStackTrace } from "../parseStackTrace.js";
import { computeFingerprint } from "./fingerprint.js";
import { readSnippetAroundLine } from "./snippet.js";

/**
 * @typedef {object} CreateCaptureDuckOptions
 * @property {(payload: BackendErrorPayload) => void | Promise<void>} report Required persistence hook (DB, HTTP, queue).
 * @property {string} [environment] Defaults to NODE_ENV or "development".
 * @property {(file: string, line: number) => unknown | Promise<unknown>} [readSnippet] Defaults to readSnippetAroundLine; pass null to skip disk I/O.
 * @property {string} [defaultUserAgent] Defaults to "node".
 */

/**
 * @typedef {object} BackendErrorPayload
 * @property {string} id
 * @property {string} message
 * @property {string | undefined} rawStack
 * @property {ReturnType<typeof parseStackTrace>} parsedStack
 * @property {string} url
 * @property {string} userAgent
 * @property {string} type
 * @property {string} environment
 * @property {unknown} [codeSnippet]
 * @property {unknown} [originalCodeSnippet]
 * @property {string} timestamp
 * @property {string} fingerPrint
 * @property {Record<string, unknown>} [serviceContext]
 */

/**
 * Factory for Node/backend captureDuck(error, extra?) with pluggable storage.
 *
 * @param {CreateCaptureDuckOptions} options
 * @returns {(error: Error, extra?: Record<string, unknown>) => Promise<{ ok: true, payload: BackendErrorPayload } | { ok: false, error: unknown }>}
 */
export function createCaptureDuck(options) {
  const {
    report,
    environment = process.env.NODE_ENV || "development",
    readSnippet = readSnippetAroundLine,
    defaultUserAgent = "node-server",
  } = options;

  if (typeof report !== "function") {
    throw new TypeError("createCaptureDuck: options.report must be a function");
  }

  return async function captureDuck(error, extra = {}) {
    const stack = error?.stack;
    const parsedStack = parseStackTrace(stack);
    const top = parsedStack[0];

    let codeSnippet = null;
    if (readSnippet && top?.file && top?.line) {
      codeSnippet = await Promise.resolve(
        readSnippet(top.file, top.line),
      );
    }

    /** @type {BackendErrorPayload} */
    const payload = {
      id: randomUUID(),
      message: error?.message || "Unknown error",
      rawStack: stack,
      parsedStack,
      url: typeof extra.url === "string" ? extra.url : "backend",
      userAgent:
        typeof extra.userAgent === "string" ? extra.userAgent : defaultUserAgent,
      type: typeof extra.type === "string" ? extra.type : "backend",
      environment:
        typeof extra.environment === "string" ? extra.environment : environment,
      codeSnippet,
      originalCodeSnippet: codeSnippet,
      timestamp: new Date().toISOString(),
      fingerPrint: "",
      ...(extra.serviceContext !== undefined
        ? { serviceContext: extra.serviceContext }
        : {}),
    };

    payload.fingerPrint = computeFingerprint({
      message: payload.message,
      parsedStack: payload.parsedStack,
    });

    try {
      await report(payload);
      return { ok: true, payload };
    } catch (err) {
      console.error("capture-duck (node): report failed", err);
      return { ok: false, error: err };
    }
  };
}

export { parseStackTrace } from "../parseStackTrace.js";
export { computeFingerprint } from "./fingerprint.js";
export { readSnippetAroundLine } from "./snippet.js";

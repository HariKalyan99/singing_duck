import { parseStackTrace } from "../parseStackTrace.js";
import { buildPosthogInitOptions, POSTHOG_US_HOST } from "./posthogDefaults.js";

export { parseStackTrace } from "../parseStackTrace.js";
export { buildPosthogInitOptions, POSTHOG_US_HOST };

/**
 * @typedef {object} InitErrorTrackingOptions
 * @property {string | null} [ingestUrl] POST target for JSON body; omit/null to skip HTTP ingest.
 * @property {() => Record<string, string> | Promise<Record<string, string>>} [getIngestHeaders]
 * @property {{ apiKey: string, host?: string } & Record<string, unknown>} [posthog] Lazy-load posthog-js and init (optional peer).
 * @property {object} [posthogClient] Already-initialized `posthog` singleton (from `posthog-js`). Preferred when your app calls posthog.init yourself.
 * @property {(payload: Record<string, unknown>) => Record<string, unknown> | false | Promise<Record<string, unknown> | false>} [beforeSend] Return false to skip ingest for this event.
 * @property {number} [timeoutMs] Ingest fetch timeout (default 8000).
 * @property {boolean} [debug] Log to console in development builds only when true (no-op if import.meta unavailable).
 * @property {string} [ingestSource] Tag included in PostHog exception properties (default "capture-duck").
 */

/** @type {Required<Pick<InitErrorTrackingOptions, 'ingestUrl'>> & InitErrorTrackingOptions & { posthogEnabled: boolean; posthogRef: object | null }} */
let duckConfig = {
  ingestUrl: null,
  getIngestHeaders: undefined,
  posthog: undefined,
  posthogClient: undefined,
  posthogEnabled: false,
  posthogRef: null,
  beforeSend: undefined,
  timeoutMs: 8000,
  debug: false,
  ingestSource: "capture-duck",
};

function isDebug() {
  try {
    return (
      duckConfig.debug &&
      typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.DEV
    );
  } catch {
    return false;
  }
}

function forwardToPosthog(error, extra) {
  try {
    const ph = duckConfig.posthogRef;
    if (!duckConfig.posthogEnabled || !ph || !(error instanceof Error)) return false;
    if (typeof ph.captureException !== "function") return false;
    ph.captureException(error, {
      source: duckConfig.ingestSource,
      ...extra,
    });
    return true;
  } catch {
    return false;
  }
}

async function resolveIngestHeaders() {
  if (!duckConfig.getIngestHeaders) return {};
  return duckConfig.getIngestHeaders();
}

async function postIngest(body) {
  const url = duckConfig.ingestUrl;
  if (!url) return null;

  const headers = {
    "Content-Type": "application/json",
    ...(await resolveIngestHeaders()),
  };

  const controller = new AbortController();
  const ms = duckConfig.timeoutMs ?? 8000;
  const timer = setTimeout(() => controller.abort(), ms);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
      keepalive: true,
    });

    let data = null;
    const ct = res.headers.get("content-type");
    if (ct && ct.includes("application/json")) {
      try {
        data = await res.json();
      } catch {
        data = null;
      }
    }

    if (!res.ok) {
      const err = new Error(`capture-duck ingest HTTP ${res.status}`);
      err.cause = data;
      throw err;
    }

    return { ok: true, data, status: res.status };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {Error} error
 * @param {Record<string, unknown>} [extra]
 * @returns {Promise<{ posthog: boolean; ingest: { ok: true; data: unknown; status: number } | { ok: false; error: unknown } | null }>}
 */
export async function captureDuck(error, extra = {}) {
  const posthogSent = forwardToPosthog(error, extra);

  if (!duckConfig.ingestUrl) {
    return { posthog: posthogSent, ingest: null };
  }

  try {
    const rawStack = error.stack || null;
    const parsedStack = parseStackTrace(rawStack);
    let errorObj = {
      message: error.message || "Unknown error",
      stack: error.stack || null,
      url:
        typeof extra.url === "string"
          ? extra.url
          : typeof window !== "undefined"
            ? window.location.href
            : "",
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "",
      parsedStack,
      type: "frontend",
      timestamp: new Date().toISOString(),
      ...Object.fromEntries(
        Object.entries(extra).filter(([k]) => k !== "url"),
      ),
    };

    if (duckConfig.beforeSend) {
      const next = await duckConfig.beforeSend(errorObj);
      if (next === false) {
        return { posthog: posthogSent, ingest: null };
      }
      if (next && typeof next === "object") {
        errorObj = next;
      }
    }

    const ingest = await postIngest(errorObj);

    if (isDebug()) {
      console.log("[capture-duck] Frontend error sent");
    }

    return { posthog: posthogSent, ingest };
  } catch (err) {
    console.error("[capture-duck] Failed to report frontend error", err);
    return { posthog: posthogSent, ingest: { ok: false, error: err } };
  }
}

/**
 * @param {InitErrorTrackingOptions} [options]
 * @returns {Promise<void>}
 */
export async function initErrorTracking(options = {}) {
  duckConfig.ingestUrl = options.ingestUrl ?? null;
  duckConfig.getIngestHeaders = options.getIngestHeaders;
  duckConfig.posthog = options.posthog;
  duckConfig.posthogClient = options.posthogClient;
  duckConfig.beforeSend = options.beforeSend;
  duckConfig.timeoutMs = options.timeoutMs ?? 8000;
  duckConfig.debug = options.debug ?? false;
  duckConfig.ingestSource = options.ingestSource ?? "capture-duck";

  duckConfig.posthogRef = null;
  duckConfig.posthogEnabled = false;

  if (options.posthogClient) {
    duckConfig.posthogRef = options.posthogClient;
    duckConfig.posthogEnabled = true;
  } else if (options.posthog?.apiKey) {
    try {
      const mod = await import("posthog-js");
      const ph = mod.default;
      if (!ph.__loaded) {
        ph.init(options.posthog.apiKey, buildPosthogInitOptions(options.posthog));
      }
      duckConfig.posthogRef = ph;
      duckConfig.posthogEnabled = true;
    } catch (e) {
      console.warn(
        "[capture-duck] posthog-js not installed or failed to load. Install optional peer posthog-js or pass posthogClient.",
        e,
      );
    }
  }

  if (typeof window === "undefined") return;

  window.onerror = function (message, source, lineno, colno, error) {
    void captureDuck(error || new Error(String(message)), {
      source,
      lineno,
      colno,
    });
  };

  window.onunhandledrejection = function (event) {
    void captureDuck(
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason)),
    );
  };
}

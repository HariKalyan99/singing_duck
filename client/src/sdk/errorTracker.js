import axios from "axios";
import { parseStackTrace } from "../shared/parseStackTrace";

export async function captureDuck(error, extra = {}) {
  try {
    const rawStack = error.stack || null;

    const parsedStack = parseStackTrace(rawStack);
    const errorObj = {
      message: error.message || "Unknown error",
      stack: error.stack || null,
      url: extra.url || window.location.href,
      userAgent: navigator.userAgent,
      parsedStack,
      type: "frontend",
      timestamp: new Date().toISOString(),
    };

    await axios.post("http://localhost:8080/errors", errorObj);

    console.log("Frontend error sent");
  } catch (err) {
    console.error("Failed to report frontend error", err);
  }
}
export function initErrorTracking() {
  // JS errors
  window.onerror = function (message, source, lineno, colno, error) {
    captureDuck(error || new Error(message), {
      source,
      lineno,
      colno,
    });
  };

  // Promise errors
  window.onunhandledrejection = function (event) {
    captureDuck(
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason)),
    );
  };
}

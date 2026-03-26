import axios from "axios";

const API_URL = "http://localhost:8080/errors";

export async function captureDuck(error, extra = {}) {
  try {
    await axios.post(API_URL, {
      message: error.message || "Unknown frontend error",
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      type: "frontend",
      ...extra,
    });
  } catch (err) {
    console.error("Failed to send error:", err);
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

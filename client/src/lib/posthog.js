import posthog from "posthog-js";

const US_HOST = "https://us.i.posthog.com";

/**
 * Initializes PostHog when VITE_PUBLIC_POSTHOG_KEY is set.
 * US cloud: omit VITE_PUBLIC_POSTHOG_HOST (defaults to us.i.posthog.com).
 * EU cloud: set VITE_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
 *
 * Enable session recording in PostHog → Project settings → Session recording.
 */
export function initPosthog() {
  const key = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
  const host = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || US_HOST;

  if (!key) {
    if (import.meta.env.DEV) {
      console.info(
        "[PostHog] Skipped (set VITE_PUBLIC_POSTHOG_KEY in .env — see .env.example).",
      );
    }
    return;
  }

  posthog.init(key, {
    api_host: host,
    capture_pageview: "history_change",
    capture_pageleave: true,
    persistence: "localStorage",
    person_profiles: "identified_only",
    session_recording: {
      maskAllInputs: true,
    },
    loaded: (ph) => {
      if (import.meta.env.DEV) {
        console.info("[PostHog] Loaded", ph.config.api_host);
      }
    },
  });
}

export { posthog };

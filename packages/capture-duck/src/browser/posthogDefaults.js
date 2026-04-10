export const POSTHOG_US_HOST = "https://us.i.posthog.com";

/**
 * Second argument to posthog.init (api_key is passed separately).
 *
 * @param {Record<string, unknown>} [overrides]
 */
export function buildPosthogInitOptions(overrides = {}) {
  const { host, apiKey: _k, posthogClient: _c, ...rest } = overrides;
  return {
    api_host: host || POSTHOG_US_HOST,
    capture_pageview: "history_change",
    capture_pageleave: true,
    persistence: "localStorage",
    person_profiles: "identified_only",
    session_recording: {
      maskAllInputs: true,
    },
    ...rest,
  };
}

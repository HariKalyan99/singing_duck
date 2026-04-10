import { createHash } from "node:crypto";

/**
 * Stable fingerprint from message + top stack frame (for deduping).
 *
 * @param {{ message?: string, parsedStack?: Array<{ file?: string, line?: number, function?: string }> }} input
 * @returns {string} hex md5
 */
export function computeFingerprint(input) {
  const top = input.parsedStack?.[0];
  const base = (input.message || "") + JSON.stringify(top || {});
  return createHash("md5").update(base).digest("hex");
}

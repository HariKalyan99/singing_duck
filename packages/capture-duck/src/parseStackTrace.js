/**
 * Parse a JS engine stack string into frame objects (function, file, line, column).
 * Handles common V8 / Chromium shapes and a few Firefox-style lines.
 *
 * @param {string | null | undefined} stack
 * @returns {Array<{ function?: string, file: string, line: number, column?: number, isAsync?: boolean }>}
 */
export function parseStackTrace(stack) {
  if (!stack || typeof stack !== "string") return [];

  const lines = stack.split("\n");
  const frames = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const frame = parseStackLine(line);
    if (frame) frames.push(frame);
  }

  return frames;
}

/**
 * @param {string} line
 * @returns {{ function?: string, file: string, line: number, column?: number, isAsync?: boolean } | null}
 */
export function parseStackLine(line) {
  const asyncPrefix = /^at\s+async\s+/;
  const isAsync = asyncPrefix.test(line);
  const normalized = line.replace(asyncPrefix, "at ");

  let m = normalized.match(/^at\s+(.*?)\s+\((.*):(\d+):(\d+)\)$/);
  if (m) {
    return {
      function: cleanFn(m[1]) || undefined,
      file: m[2],
      line: Number(m[3]),
      column: Number(m[4]),
      ...(isAsync ? { isAsync: true } : {}),
    };
  }

  m = normalized.match(/^at\s+(.*):(\d+):(\d+)$/);
  if (m) {
    return {
      file: m[1],
      line: Number(m[2]),
      column: Number(m[3]),
      ...(isAsync ? { isAsync: true } : {}),
    };
  }

  m = line.match(/^([^@]+)@(.*):(\d+):(\d+)$/);
  if (m) {
    return {
      function: cleanFn(m[1]) || undefined,
      file: m[2],
      line: Number(m[3]),
      column: Number(m[4]),
    };
  }

  return null;
}

function cleanFn(name) {
  const s = name.trim();
  if (s === "Object.<anonymous>" || s === "<anonymous>") return "";
  return s;
}

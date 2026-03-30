export function parseStackTrace(stack) {
  if (!stack) return [];

  return stack
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .map((line) => {
      const match = line.match(/^at\s+(.*?)\s+\((.*):(\d+):(\d+)\)$/);

      if (match) {
        return {
          function: match[1] || undefined,
          file: match[2],
          line: Number(match[3]),
          column: Number(match[4]),
        };
      }

      const noFnMatch = line.match(/^at\s+(.*):(\d+):(\d+)$/);

      if (noFnMatch) {
        return {
          function: undefined,
          file: noFnMatch[1],
          line: Number(noFnMatch[2]),
          column: Number(noFnMatch[3]),
        };
      }

      return null;
    })
    .filter(Boolean);
}

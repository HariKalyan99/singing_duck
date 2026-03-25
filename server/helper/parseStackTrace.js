function parseStackTrace(stack) {
  if (!stack) return [];

  return stack
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .map((line) => {
      const match = line.match(
        /^at\s+(async\s+)?(.*?)\s+\((.*):(\d+):(\d+)\)$/,
      );

      if (match) {
        return {
          function: match[2] || null,
          file: match[3],
          line: Number(match[4]),
          column: Number(match[5]),
          isAsync: Boolean(match[1]),
        };
      }

      const noFnMatch = line.match(/^at\s+(.*):(\d+):(\d+)$/);

      if (noFnMatch) {
        return {
          function: null,
          file: noFnMatch[1],
          line: Number(noFnMatch[2]),
          column: Number(noFnMatch[3]),
        };
      }

      return { raw: line };
    });
}

export default parseStackTrace;

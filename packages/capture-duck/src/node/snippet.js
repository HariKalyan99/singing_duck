import fs from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Read lines around errorLine (1-based) from a file on disk.
 *
 * @param {string} filePath
 * @param {number} errorLine
 * @param {number} [context]
 * @returns {Array<{ lineNumber: number, content: string, isErrorLine: boolean }> | null}
 */
export function readSnippetAroundLine(filePath, errorLine, context = 15) {
  try {
    let path = filePath;
    if (path.startsWith("file://")) {
      path = fileURLToPath(path);
    }

    if (!fs.existsSync(path)) {
      return null;
    }

    const fileContent = fs.readFileSync(path, "utf-8");
    const lines = fileContent.split("\n");

    const start = Math.max(0, errorLine - context - 1);
    const end = Math.min(lines.length, errorLine + context);

    const snippet = [];
    for (let i = start; i < end; i++) {
      snippet.push({
        lineNumber: i + 1,
        content: lines[i],
        isErrorLine: i + 1 === errorLine,
      });
    }

    return snippet;
  } catch {
    return null;
  }
}

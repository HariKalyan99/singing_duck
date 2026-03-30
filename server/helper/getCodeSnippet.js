import fs from "fs";
import { fileURLToPath } from "url";

function getCodeSnippet(filePath, errorLine, context = 15) {
  try {
    if (filePath.startsWith("file://")) {
      filePath = fileURLToPath(filePath);
    }

    if (!fs.existsSync(filePath)) {
      console.warn("File does not exist:", filePath);
      return null;
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");
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
  } catch (err) {
    console.error("Snippet error:", err);
    return null;
  }
}

export default getCodeSnippet;

import crypto from "crypto";
import getCodeSnippet from "../helper/getCodeSnippet.js";
import parseStackTrace from "../helper/parseStackTrace.js";
import getFingerprint from "../helper/getFingerprint.js";
import { errorDB } from "../server.js";

function captureDuck(error, extra = {}) {
  try {
    const stack = error.stack;
    const parsedStack = parseStackTrace(stack);

    const topFrame = parsedStack?.[0];

    let codeSnippet = null;

    if (topFrame?.file && topFrame?.line) {
      codeSnippet = getCodeSnippet(topFrame.file, topFrame.line);
    }

    const errorObj = {
      id: crypto.randomUUID(),
      message: error.message || "Unknown error",
      stack: parsedStack,
      rawStack: stack,
      url: extra.url || "backend",
      userAgent: "node-server",
      type: "backend",
      codeSnippet,
      timestamp: new Date().toISOString(),
    };

    errorObj.fingerprint = getFingerprint(errorObj);

    errorDB.push(errorObj);

    console.log("Error captured:", errorObj.message);
  } catch (err) {
    console.error("Failed to capture error:", err.message);
  }
}

export default captureDuck;

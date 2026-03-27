import crypto from "crypto";
import getCodeSnippet from "../helper/getCodeSnippet.js";
import parseStackTrace from "../helper/parseStackTrace.js";
import getFingerPrint from "../helper/getFingerPrint.js";

import { api } from "../convex/_generated/api.js";
import { getConvex } from "../src/lib/convex.js";

const convex = getConvex();
async function captureDuck(error, extra = {}) {
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

    errorObj.fingerPrint = getFingerPrint(errorObj);

    await convex.mutation(api.errors.reportError, {
      message: errorObj.message,
      stack: JSON.stringify(errorObj.stack),
      rawStack: errorObj.rawStack,
      url: errorObj.url,
      userAgent: errorObj.userAgent,
      type: errorObj.type,
      timestamp: errorObj.timestamp,
      fingerPrint: errorObj.fingerPrint,
      codeSnippet: codeSnippet || null,
    });

    console.log("Error stored in Convex:", errorObj.message);
  } catch (err) {
    console.error("Failed to capture error:", err.message);
  }
}

export default captureDuck;

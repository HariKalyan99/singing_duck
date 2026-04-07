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

    const defaultServiceContext = {
      // Mark generic backend captures as non-replayable.
      service: "nonReplayable",
      payload: null,
      context: {
        url: extra.url || "backend",
      },
      replayable: false,
    };

    const errorObj = {
      id: crypto.randomUUID(),
      message: error.message || "Unknown error",
      stack: parsedStack, // we will remove this since we have parsed and raw
      rawStack: stack,
      url: extra.url || "backend",
      userAgent: "node-server",
      type: "backend",
      environment: process.env.NODE_ENV || "development",
      codeSnippet,
      timestamp: new Date().toISOString(),
      serviceContext: extra.serviceContext || defaultServiceContext,
    };

    errorObj.fingerPrint = getFingerPrint(errorObj);

    await convex.mutation(api.errors.reportError, {
      message: errorObj.message,

      stack: errorObj.rawStack,
      rawStack: errorObj.rawStack,

      url: errorObj.url,
      userAgent: errorObj.userAgent,
      type: errorObj.type,
      timestamp: errorObj.timestamp,
      fingerPrint: errorObj.fingerPrint,
      environment: errorObj.environment,

      parsedStack: errorObj.stack,

      codeSnippet: codeSnippet || null,
      originalCodeSnippet: codeSnippet || null,
      serviceContext: errorObj.serviceContext,
    });
    console.log("Error stored in Convex:", errorObj.message);
  } catch (err) {
    console.error("Failed to capture error:", err.message);
  }
}

export default captureDuck;

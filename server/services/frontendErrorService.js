import crypto from "crypto";
import getFingerPrint from "../helper/getFingerPrint.js";
import { api } from "../convex/_generated/api.js";

export async function ingestFrontendError(payload, { convex }) {
  const {
    message,
    stack,
    url,
    parsedStack,
    userAgent,
    type = "frontend",
    serviceContext,
  } = payload;

  const errorObject = {
    id: crypto.randomUUID(),
    message,
    rawStack: stack,
    url,
    userAgent,
    type,
    parsedStack,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  };

  errorObject.fingerPrint = getFingerPrint(errorObject);

  await convex.mutation(api.errors.reportError, {
    message: errorObject.message,
    stack: errorObject.rawStack,
    rawStack: errorObject.rawStack,
    url: errorObject.url,
    userAgent: errorObject.userAgent,
    type: errorObject.type,
    timestamp: errorObject.timestamp,
    environment: errorObject.environment,
    fingerPrint: errorObject.fingerPrint,
    parsedStack: errorObject.parsedStack,
    codeSnippet: undefined,
    serviceContext,
  });

  return { success: true };
}

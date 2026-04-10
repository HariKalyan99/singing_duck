import { createCaptureDuck } from "@singing-duck/capture-duck/node";
import { api } from "../convex/_generated/api.js";
import { getConvex } from "../src/lib/convex.js";

const convex = getConvex();

const captureDuck = createCaptureDuck({
  report: (payload) =>
    convex.mutation(api.errors.reportError, {
      message: payload.message,
      stack: payload.rawStack,
      rawStack: payload.rawStack,
      url: payload.url,
      userAgent: payload.userAgent,
      type: payload.type,
      timestamp: payload.timestamp,
      fingerPrint: payload.fingerPrint,
      environment: payload.environment,
      parsedStack: payload.parsedStack,
      codeSnippet: payload.codeSnippet ?? null,
      originalCodeSnippet: payload.originalCodeSnippet ?? null,
      serviceContext: payload.serviceContext,
    }),
});

export default captureDuck;

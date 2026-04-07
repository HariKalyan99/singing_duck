import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  errors: defineTable({
    message: v.string(),
    stack: v.string(),
    rawStack: v.string(),
    url: v.string(),
    userAgent: v.string(),
    type: v.string(),
    timestamp: v.string(),
    fingerPrint: v.string(),
    environment: v.string(),
    serviceContext: v.optional(
      v.object({
        service: v.string(),
        payload: v.any(),
        context: v.optional(v.any()),
        replayable: v.optional(v.boolean()),
      }),
    ),
    parsedStack: v.optional(
      v.array(
        v.object({
          function: v.optional(v.string()),
          file: v.string(),
          line: v.number(),
          column: v.optional(v.number()),
          isAsync: v.optional(v.boolean()),
        }),
      ),
    ),
    codeSnippet: v.optional(
      v.array(
        v.object({
          lineNumber: v.number(),
          content: v.string(),
          isErrorLine: v.boolean(),
        }),
      ),
    ),
    originalCodeSnippet: v.optional(
      v.array(
        v.object({
          lineNumber: v.number(),
          content: v.string(),
          isErrorLine: v.boolean(),
        }),
      ),
    ),
    replayCount: v.optional(v.number()),
    replayLastStatus: v.optional(v.string()),
    replayFixedDetected: v.optional(v.boolean()),
    replayLastComparedAt: v.optional(v.string()),
    resolutionStatus: v.optional(v.string()),
  })
    .index("by_fingerprint", ["fingerPrint"])
    .index("by_timestamp", ["timestamp"]),
  replayTransactions: defineTable({
    errorId: v.id("errors"),
    transactionId: v.string(),
    attemptNumber: v.number(),
    originalMessage: v.string(),
    originalFingerPrint: v.string(),
    status: v.string(),
    replayMessage: v.optional(v.string()),
    replayFingerPrint: v.optional(v.string()),
    isResolved: v.optional(v.boolean()),
    resolutionStatus: v.optional(v.string()),
    compared: v.boolean(),
    startedAt: v.string(),
    completedAt: v.optional(v.string()),
  })
    .index("by_error_id", ["errorId"])
    .index("by_transaction_id", ["transactionId"]),
});

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
  })
    .index("by_fingerprint", ["fingerPrint"])
    .index("by_timestamp", ["timestamp"]), // ✅ ADD THIS
});

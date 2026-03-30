import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const reportError = mutation({
  args: {
    message: v.string(),
    stack: v.optional(v.string()),
    rawStack: v.optional(v.string()),
    url: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    type: v.string(),
    timestamp: v.string(),
    fingerPrint: v.string(),

    codeSnippet: v.optional(
      v.array(
        v.object({
          lineNumber: v.number(),
          content: v.string(),
          isErrorLine: v.boolean(),
        }),
      ),
    ),
  },

  handler: async (ctx, args) => {
    return await ctx.db.insert("errors", args);
  },
});

export const getRecentErrors = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("errors")
      .withIndex("by_timestamp")
      .order("desc")
      .take(50);
  },
});

export const clearErrors = mutation({
  args: {},
  handler: async (ctx) => {
    const errors = await ctx.db.query("errors").collect();

    await Promise.all(errors.map((err) => ctx.db.delete(err._id)));

    return { success: true, deletedCount: errors.length };
  },
});

export const getErrorById = query({
  args: {
    id: v.id("errors"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

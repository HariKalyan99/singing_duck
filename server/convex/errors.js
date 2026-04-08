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
    originalCodeSnippet: v.optional(
      v.array(
        v.object({
          lineNumber: v.number(),
          content: v.string(),
          isErrorLine: v.boolean(),
        }),
      ),
    ),

    serviceContext: v.optional(
      v.object({
        service: v.string(),
        payload: v.optional(v.any()),
        context: v.optional(v.any()),
        replayable: v.optional(v.boolean()),
      }),
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
    const replayTransactions = await ctx.db.query("replayTransactions").collect();

    await Promise.all(errors.map((err) => ctx.db.delete(err._id)));
    await Promise.all(replayTransactions.map((tx) => ctx.db.delete(tx._id)));

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

export const beginReplayTransaction = mutation({
  args: {
    errorId: v.id("errors"),
    transactionId: v.string(),
    originalMessage: v.string(),
    originalFingerPrint: v.string(),
    startedAt: v.string(),
  },
  handler: async (ctx, args) => {
    const error = await ctx.db.get(args.errorId);
    if (!error) {
      throw new Error("Error not found");
    }

    const attemptNumber = (error.replayCount || 0) + 1;
    await ctx.db.patch(args.errorId, {
      replayCount: attemptNumber,
      replayLastStatus: "started",
    });

    await ctx.db.insert("replayTransactions", {
      errorId: args.errorId,
      transactionId: args.transactionId,
      attemptNumber,
      originalMessage: args.originalMessage,
      originalFingerPrint: args.originalFingerPrint,
      status: "started",
      compared: false,
      startedAt: args.startedAt,
    });

    return { attemptNumber };
  },
});

export const completeReplayTransaction = mutation({
  args: {
    errorId: v.id("errors"),
    transactionId: v.string(),
    status: v.string(),
    replayMessage: v.optional(v.string()),
    replayFingerPrint: v.optional(v.string()),
    isResolved: v.optional(v.boolean()),
    resolutionStatus: v.optional(v.string()),
    compared: v.boolean(),
    completedAt: v.string(),
  },
  handler: async (ctx, args) => {
    const tx = await ctx.db
      .query("replayTransactions")
      .withIndex("by_transaction_id", (q) =>
        q.eq("transactionId", args.transactionId),
      )
      .first();

    if (!tx) {
      throw new Error("Replay transaction not found");
    }

    await ctx.db.patch(tx._id, {
      status: args.status,
      replayMessage: args.replayMessage,
      replayFingerPrint: args.replayFingerPrint,
      isResolved: args.isResolved,
      resolutionStatus: args.resolutionStatus,
      compared: args.compared,
      completedAt: args.completedAt,
    });

    await ctx.db.patch(args.errorId, {
      replayLastStatus: args.status,
      replayFixedDetected: args.isResolved,
      replayLastComparedAt: args.completedAt,
      resolutionStatus: args.resolutionStatus,
    });

    return { success: true };
  },
});

export const getLatestReplayTransactionByErrorId = query({
  args: {
    errorId: v.id("errors"),
  },
  handler: async (ctx, args) => {
    const txs = await ctx.db
      .query("replayTransactions")
      .withIndex("by_error_id", (q) => q.eq("errorId", args.errorId))
      .order("desc")
      .take(1);

    return txs[0] || null;
  },
});

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByTitle = query({
  args: {
    title: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_title", (q) => q.eq("title", args.title))
      .first();
  },
});

export const addProduct = mutation({
  args: {
    title: v.string(),
    price: v.number(),
    category: v.string(),
    stock: v.number(),
    description: v.string(),
    createdAt: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("products", args);
    return await ctx.db.get(id);
  },
});

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/** Real-time list — every connected browser updates automatically */
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("sops").collect();
  },
});

/** Create a new SOP and return its ID */
export const create = mutation({
  args: {
    title:       v.string(),
    description: v.string(),
    color:       v.string(),
    stepsJson:   v.string(),
    sortOrder:   v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sops", args);
  },
});

/** Patch any subset of fields on an existing SOP */
export const update = mutation({
  args: {
    id:          v.id("sops"),
    title:       v.optional(v.string()),
    description: v.optional(v.string()),
    color:       v.optional(v.string()),
    stepsJson:   v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await ctx.db.patch(id, patch);
  },
});

/** Permanently delete an SOP */
export const remove = mutation({
  args: { id: v.id("sops") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

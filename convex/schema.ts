import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sops: defineTable({
    title:       v.string(),
    description: v.string(),
    color:       v.string(),
    stepsJson:   v.string(), // JSON.stringify of the full steps tree
    sortOrder:   v.number(), // used to preserve list order
  }),
});

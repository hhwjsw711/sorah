import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
  }),
  projects: defineTable({
    prompt: v.string(),
    files: v.array(v.id("_storage")),
    thumbnail: v.optional(v.id("_storage")),
    createdAt: v.number(),
    status: v.optional(
      v.union(
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("rendering")
      )
    ),
    completedAt: v.optional(v.number()),
    script: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
    musicUrl: v.optional(v.string()),
    videoUrls: v.optional(v.array(v.string())),
    error: v.optional(v.string()),
    reelfulApiUrl: v.optional(v.string()),
    renderedVideoUrl: v.optional(v.string()),
    renderProgress: v.optional(
      v.object({
        step: v.string(),
        details: v.optional(v.string()),
        timestamp: v.number(),
      })
    ),
  }),
});

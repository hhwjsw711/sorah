import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tasks").collect();
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const createProject = mutation({
  args: {
    prompt: v.string(),
    files: v.array(v.id("_storage")),
  },
  handler: async (ctx, { prompt, files }) => {
    return await ctx.db.insert("projects", {
      prompt,
      files,
      createdAt: Date.now(),
      status: "processing",
    });
  },
});

export const getProjects = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("projects").order("desc").collect();
  },
});

export const getProject = query({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const completeProject = mutation({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      status: "completed",
      completedAt: Date.now(),
    });
    return id;
  },
});

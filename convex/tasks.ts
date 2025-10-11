import { query, mutation, action, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

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
    thumbnail: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { prompt, files, thumbnail }) => {
    return await ctx.db.insert("projects", {
      prompt,
      files,
      thumbnail: thumbnail || files[0],
      createdAt: Date.now(),
      status: "processing",
    });
  },
});

export const getProjects = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").order("desc").collect();
    return await Promise.all(
      projects.map(async (project) => ({
        ...project,
        fileUrls: await Promise.all(
          project.files.map((fileId) => ctx.storage.getUrl(fileId))
        ),
        thumbnailUrl: project.thumbnail
          ? await ctx.storage.getUrl(project.thumbnail)
          : null,
      }))
    );
  },
});

export const getProject = query({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, { id }) => {
    const project = await ctx.db.get(id);
    if (!project) return null;

    return {
      ...project,
      fileUrls: await Promise.all(
        project.files.map((fileId) => ctx.storage.getUrl(fileId))
      ),
      thumbnailUrl: project.thumbnail
        ? await ctx.storage.getUrl(project.thumbnail)
        : null,
    };
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

export const updateProjectWithReelfulData = mutation({
  args: {
    id: v.id("projects"),
    script: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
    musicUrl: v.optional(v.string()),
    videoUrls: v.optional(v.array(v.string())),
    error: v.optional(v.string()),
    status: v.union(v.literal("completed"), v.literal("failed")),
  },
  handler: async (
    ctx,
    { id, script, audioUrl, musicUrl, videoUrls, error, status }
  ) => {
    await ctx.db.patch(id, {
      status,
      completedAt: Date.now(),
      script,
      audioUrl,
      musicUrl,
      videoUrls,
      error,
    });

    return id;
  },
});

export const deleteProject = mutation({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return id;
  },
});

export const updateProjectStatus = mutation({
  args: {
    id: v.id("projects"),
    status: v.union(
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("rendering")
    ),
  },
  handler: async (ctx, { id, status }) => {
    await ctx.db.patch(id, { status });
    return id;
  },
});

export const updateProjectWithRenderResult = mutation({
  args: {
    id: v.id("projects"),
    renderedVideoUrl: v.optional(v.string()),
    error: v.optional(v.string()),
    status: v.union(v.literal("completed"), v.literal("failed")),
  },
  handler: async (ctx, { id, renderedVideoUrl, error, status }) => {
    await ctx.db.patch(id, {
      status,
      renderedVideoUrl,
      error,
      completedAt: Date.now(),
      renderProgress: undefined,
    });
    return id;
  },
});

export const updateRenderProgress = mutation({
  args: {
    id: v.id("projects"),
    step: v.string(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, { id, step, details }) => {
    await ctx.db.patch(id, {
      renderProgress: {
        step,
        details,
        timestamp: Date.now(),
      },
    });
    return id;
  },
});

export const simulateCompleted = mutation({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      status: "completed",
      completedAt: Date.now(),
      script:
        "this is a simulated script. ever wonder how top businesses save 10 hours a week? meet our product, the game-changing automation platform that helps you work smarter, not harder. join thousands of happy users today!",
      audioUrl: "https://example.com/audio.mp3",
      musicUrl: "https://example.com/music.mp3",
      videoUrls: [
        "https://example.com/video1.mp4",
        "https://example.com/video2.mp4",
        "https://example.com/video3.mp4",
      ],
    });
    return id;
  },
});

export const processProjectWithReelful = action({
  args: {
    projectId: v.id("projects"),
    reelfulApiUrl: v.string(),
  },
  handler: async (ctx, { projectId, reelfulApiUrl }) => {
    const project = await ctx.runQuery(api.tasks.getProject, { id: projectId });
    if (!project) {
      throw new Error("project not found");
    }

    const imageUrls = await Promise.all(
      project.files.map(async (fileId) => {
        const url = await ctx.storage.getUrl(fileId);
        return url;
      })
    );

    const validImageUrls = imageUrls.filter(
      (url): url is string => url !== null
    );

    try {
      const response = await fetch(`${reelfulApiUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: project.prompt,
          model: "openai/gpt-5",
          image_urls: validImageUrls,
        }),
      });

      if (!response.ok) {
        throw new Error(`reelful api error: ${response.statusText}`);
      }

      const data = await response.json();

      const audioUrl = data.audio_path
        ? `${reelfulApiUrl}${data.audio_path}`
        : undefined;
      const musicUrl = data.music_path
        ? `${reelfulApiUrl}${data.music_path}`
        : undefined;
      const videoUrls = data.video_paths?.map(
        (path: string) => `${reelfulApiUrl}${path}`
      );

      await ctx.runMutation(api.tasks.updateProjectWithReelfulData, {
        id: projectId,
        script: data.script || undefined,
        audioUrl,
        musicUrl,
        videoUrls,
        error: data.error ? data.error : undefined,
        status: data.error ? "failed" : "completed",
      });

      return { success: true };
    } catch (error) {
      await ctx.runMutation(api.tasks.updateProjectWithReelfulData, {
        id: projectId,
        error: error instanceof Error ? error.message : "unknown error",
        status: "failed",
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "unknown error",
      };
    }
  },
});

export const transcribeMedia = action({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { storageId }) => {
    console.log("[transcribe] starting transcription for:", storageId);

    try {
      const url = await ctx.storage.getUrl(storageId);
      if (!url) {
        throw new Error("failed to get storage url");
      }

      console.log("[transcribe] fetching media from storage:", url);
      const mediaResponse = await fetch(url);
      const mediaBlob = await mediaResponse.blob();
      console.log("[transcribe] media fetched, size:", mediaBlob.size);

      console.log("[transcribe] uploading to transcription service...");
      const formData = new FormData();
      formData.append("file", mediaBlob, "media.mp4");

      const transcribeResponse = await fetch("https://reels-srt.vercel.app/api/fireworks", {
        method: "POST",
        body: formData,
      });

      if (!transcribeResponse.ok) {
        throw new Error(`transcription failed: ${transcribeResponse.statusText}`);
      }

      const srtText = await transcribeResponse.text();
      console.log("[transcribe] transcription complete, length:", srtText.length);

      return { success: true, srt: srtText };
    } catch (error) {
      console.error("[transcribe] error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "transcription failed",
      };
    }
  },
});

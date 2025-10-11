"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { Sandbox } from "e2b";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

export const renderVideo = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, { projectId }) => {
    console.log("[render] starting render for project:", projectId);
    
    await ctx.runMutation(api.tasks.updateProjectStatus, {
      id: projectId,
      status: "rendering",
    });
    console.log("[render] status updated to rendering");

    try {
      const project = await ctx.runQuery(api.tasks.getProject, { id: projectId });
      if (!project) {
        throw new Error("project not found");
      }
      console.log("[render] project loaded, has audio:", !!project.audioUrl, "music:", !!project.musicUrl, "videos:", project.videoUrls?.length || 0);

      console.log("[render] creating e2b sandbox...");
      await ctx.runMutation(api.tasks.updateRenderProgress, {
        id: projectId,
        step: "creating sandbox",
        details: "initializing e2b environment with remotion template",
      });
      
      const apiKey = process.env.E2B_API_KEY;
      if (!apiKey) {
        throw new Error("E2B_API_KEY not set in convex environment variables");
      }
      
      const sandbox = await Sandbox.create("8r14p0kvwebvpgno5hia", { apiKey });
      console.log("[render] sandbox created:", sandbox.sandboxId);

      console.log("[render] creating media directory...");
      await ctx.runMutation(api.tasks.updateRenderProgress, {
        id: projectId,
        step: "preparing environment",
        details: "setting up media directories",
      });
      
      await sandbox.commands.run("mkdir -p /home/user/public/media");
      console.log("[render] media directory created");
      
      console.log("[render] creating empty subtitles file...");
      await sandbox.files.write("/home/user/public/media/subtitles.srt", "");
      console.log("[render] subtitles file created");

      console.log("[render] uploading media files...");
      await ctx.runMutation(api.tasks.updateRenderProgress, {
        id: projectId,
        step: "uploading media",
        details: "transferring files to sandbox",
      });
      
      if (project.audioUrl) {
        console.log("[render] fetching audio from:", project.audioUrl);
        const audioResponse = await fetch(project.audioUrl);
        const audioBuffer = await audioResponse.arrayBuffer();
        console.log("[render] audio fetched, size:", audioBuffer.byteLength);
        await sandbox.files.write("/home/user/public/media/audio.mp3", audioBuffer);
      }

      if (project.musicUrl) {
        console.log("[render] fetching music from:", project.musicUrl);
        const musicResponse = await fetch(project.musicUrl);
        const musicBuffer = await musicResponse.arrayBuffer();
        console.log("[render] music fetched, size:", musicBuffer.byteLength);
        await sandbox.files.write("/home/user/public/media/music.mp3", musicBuffer);
      }

      if (project.videoUrls) {
        for (let i = 0; i < project.videoUrls.length; i++) {
          console.log(`[render] fetching video ${i} from:`, project.videoUrls[i]);
          const videoResponse = await fetch(project.videoUrls[i]);
          const videoBuffer = await videoResponse.arrayBuffer();
          console.log(`[render] video ${i} fetched, size:`, videoBuffer.byteLength);
          await sandbox.files.write(`/home/user/public/media/video${i}.mp4`, videoBuffer);
        }
      }
      console.log("[render] files uploaded");

      console.log("[render] running remotion render...");
      await ctx.runMutation(api.tasks.updateRenderProgress, {
        id: projectId,
        step: "rendering video",
        details: "composing final video with remotion",
      });
      
      const renderResult = await sandbox.commands.run("bun remotion render", { 
        cwd: "/home/user",
        timeoutMs: 600000,
        onStdout: (data) => console.log("[render stdout]", data),
        onStderr: (data) => console.log("[render stderr]", data),
      });
      console.log("[render] render exit code:", renderResult.exitCode);
      console.log("[render] render stdout:", renderResult.stdout);
      console.log("[render] render stderr:", renderResult.stderr);
      
      if (renderResult.exitCode !== 0) {
        throw new Error(`render failed: ${renderResult.stderr}`);
      }
      console.log("[render] remotion render completed");

      console.log("[render] reading output video...");
      const outputVideo = await sandbox.files.read("/home/user/out/result.mp4");
      
      if (!outputVideo) {
        throw new Error("output video not found");
      }
      const outputSize = typeof outputVideo === 'string' ? outputVideo.length : (outputVideo as ArrayBuffer).byteLength;
      console.log("[render] output video size:", outputSize);

      console.log("[render] uploading to convex storage...");
      await ctx.runMutation(api.tasks.updateRenderProgress, {
        id: projectId,
        step: "saving video",
        details: "uploading final video to storage",
      });
      
      const uploadUrl: string = await ctx.runMutation(api.tasks.generateUploadUrl, {});
      const uploadResponse: Response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "video/mp4" },
        body: outputVideo,
      });
      const { storageId }: { storageId: Id<"_storage"> } = await uploadResponse.json();
      const renderedVideoUrl: string | null = await ctx.storage.getUrl(storageId);
      console.log("[render] uploaded to storage, url:", renderedVideoUrl);

      console.log("[render] updating project with result...");
      await ctx.runMutation(api.tasks.updateProjectWithRenderResult, {
        id: projectId,
        renderedVideoUrl: renderedVideoUrl || undefined,
        status: "completed",
      });

      console.log("[render] closing sandbox...");
      await sandbox.kill();

      console.log("[render] render complete!");
      return { success: true, renderedVideoUrl };
    } catch (error) {
      console.error("[render] error:", error);
      await ctx.runMutation(api.tasks.updateProjectWithRenderResult, {
        id: projectId,
        error: error instanceof Error ? error.message : "render failed",
        status: "failed",
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "render failed",
      };
    }
  },
});

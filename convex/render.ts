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
      const apiKey = process.env.E2B_API_KEY;
      if (!apiKey) {
        throw new Error("E2B_API_KEY not set in convex environment variables");
      }
      
      const sandbox = await Sandbox.create({ apiKey });
      console.log("[render] sandbox created:", sandbox.sandboxId);

      console.log("[render] cloning remotion template...");
      const cloneResult = await sandbox.commands.run("git clone https://github.com/caffeinum/remotion-template /home/user/remotion-template");
      console.log("[render] clone result:", cloneResult.stdout);
      if (cloneResult.exitCode !== 0) {
        throw new Error(`git clone failed: ${cloneResult.stderr}`);
      }

      console.log("[render] installing dependencies...");
      const installResult = await sandbox.commands.run("bun install", { cwd: "/home/user/remotion-template" });
      console.log("[render] install result:", installResult.stdout);
      if (installResult.exitCode !== 0) {
        throw new Error(`install failed: ${installResult.stderr}`);
      }
      console.log("[render] dependencies installed");

      console.log("[render] creating media directory...");
      await sandbox.commands.run("mkdir -p /home/user/remotion-template/public/media");
      console.log("[render] media directory created");

      console.log("[render] uploading media files...");
      if (project.audioUrl) {
        console.log("[render] fetching audio from:", project.audioUrl);
        const audioResponse = await fetch(project.audioUrl);
        const audioBuffer = await audioResponse.arrayBuffer();
        console.log("[render] audio fetched, size:", audioBuffer.byteLength);
        await sandbox.files.write("/home/user/remotion-template/public/media/audio.mp3", audioBuffer);
      }

      if (project.musicUrl) {
        console.log("[render] fetching music from:", project.musicUrl);
        const musicResponse = await fetch(project.musicUrl);
        const musicBuffer = await musicResponse.arrayBuffer();
        console.log("[render] music fetched, size:", musicBuffer.byteLength);
        await sandbox.files.write("/home/user/remotion-template/public/media/music.mp3", musicBuffer);
      }

      if (project.videoUrls) {
        for (let i = 0; i < project.videoUrls.length; i++) {
          console.log(`[render] fetching video ${i} from:`, project.videoUrls[i]);
          const videoResponse = await fetch(project.videoUrls[i]);
          const videoBuffer = await videoResponse.arrayBuffer();
          console.log(`[render] video ${i} fetched, size:`, videoBuffer.byteLength);
          await sandbox.files.write(`/home/user/remotion-template/public/media/video${i}.mp4`, videoBuffer);
        }
      }
      console.log("[render] files uploaded");

      console.log("[render] running remotion render...");
      const renderResult = await sandbox.commands.run("bun remotion render", { cwd: "/home/user/remotion-template" });
      console.log("[render] render stdout:", renderResult.stdout);
      console.log("[render] render stderr:", renderResult.stderr);
      
      if (renderResult.exitCode !== 0) {
        throw new Error(`render failed: ${renderResult.stderr}`);
      }
      console.log("[render] remotion render completed");

      console.log("[render] reading output video...");
      const outputVideo = await sandbox.files.read("/home/user/remotion-template/out/result.mp4");
      
      if (!outputVideo) {
        throw new Error("output video not found");
      }
      const outputSize = typeof outputVideo === 'string' ? outputVideo.length : (outputVideo as ArrayBuffer).byteLength;
      console.log("[render] output video size:", outputSize);

      console.log("[render] uploading to convex storage...");
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

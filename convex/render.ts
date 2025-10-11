"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { Sandbox } from "@vercel/sandbox";
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

      console.log("[render] creating sandbox...");
      const oidcToken = process.env.VERCEL_OIDC_TOKEN;
      if (!oidcToken) {
        throw new Error("VERCEL_OIDC_TOKEN not set in convex environment variables");
      }
      console.log("[render] using oidc token from env");
      
      const sandbox = await Sandbox.create({
        source: {
          url: "https://github.com/caffeinum/remotion-template",
          type: "git",
        },
        timeout: 600000,
      });
      console.log("[render] sandbox created:", sandbox.sandboxId);

      console.log("[render] installing dependencies...");
      const install = await sandbox.runCommand({
        cmd: "bun",
        args: ["install"],
      });
      console.log("[render] install exit code:", install.exitCode);

      if (install.exitCode !== 0) {
        console.error("[render] install stderr:", install.stderr);
        throw new Error(`install failed: ${install.stderr}`);
      }
      console.log("[render] dependencies installed");

      console.log("[render] creating media directory...");
      await sandbox.mkDir("./public/media");
      console.log("[render] media directory created");

      console.log("[render] preparing media files...");
      const files: { path: string; content: Buffer }[] = [];

      if (project.audioUrl) {
        console.log("[render] fetching audio from:", project.audioUrl);
        const audioResponse = await fetch(project.audioUrl);
        const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
        console.log("[render] audio fetched, size:", audioBuffer.length);
        files.push({ path: "./public/media/audio.mp3", content: audioBuffer });
      }

      if (project.musicUrl) {
        console.log("[render] fetching music from:", project.musicUrl);
        const musicResponse = await fetch(project.musicUrl);
        const musicBuffer = Buffer.from(await musicResponse.arrayBuffer());
        console.log("[render] music fetched, size:", musicBuffer.length);
        files.push({ path: "./public/media/music.mp3", content: musicBuffer });
      }

      if (project.videoUrls) {
        for (let i = 0; i < project.videoUrls.length; i++) {
          console.log(`[render] fetching video ${i} from:`, project.videoUrls[i]);
          const videoResponse = await fetch(project.videoUrls[i]);
          const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
          console.log(`[render] video ${i} fetched, size:`, videoBuffer.length);
          files.push({ path: `./public/media/video${i}.mp4`, content: videoBuffer });
        }
      }

      console.log("[render] uploading", files.length, "files to sandbox...");
      await sandbox.writeFiles(files);
      console.log("[render] files uploaded");

      console.log("[render] running remotion render...");
      const render = await sandbox.runCommand({
        cmd: "bun",
        args: ["remotion", "render"],
      });
      console.log("[render] render exit code:", render.exitCode);
      console.log("[render] render stdout:", render.stdout);

      if (render.exitCode !== 0) {
        console.error("[render] render stderr:", render.stderr);
        throw new Error(`render failed: ${render.stderr}`);
      }
      console.log("[render] remotion render completed");

      console.log("[render] reading output video...");
      const outputStream = await sandbox.readFile({ path: "./out/result.mp4" });
      
      if (!outputStream) {
        throw new Error("output video not found");
      }

      console.log("[render] streaming output video...");
      const chunks: Buffer[] = [];
      for await (const chunk of outputStream) {
        chunks.push(Buffer.from(chunk));
      }
      const outputVideo = Buffer.concat(chunks);
      console.log("[render] output video size:", outputVideo.length);

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

      console.log("[render] stopping sandbox...");
      await sandbox.stop();

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

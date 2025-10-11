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
    await ctx.runMutation(api.tasks.updateProjectStatus, {
      id: projectId,
      status: "rendering",
    });

    try {
      const project = await ctx.runQuery(api.tasks.getProject, { id: projectId });
      if (!project) {
        throw new Error("project not found");
      }

      console.log("creating sandbox...");
      const sandbox = await Sandbox.create({
        source: {
          url: "https://github.com/caffeinum/remotion-template",
          type: "git",
        },
      });

      console.log("installing dependencies...");
      const install = await sandbox.runCommand({
        cmd: "bun",
        args: ["install"],
      });

      if (install.exitCode !== 0) {
        throw new Error(`install failed: ${install.stderr}`);
      }

      console.log("creating media directory...");
      await sandbox.mkDir("./public/media");

      console.log("uploading media files...");
      const files: { path: string; content: Buffer }[] = [];

      if (project.audioUrl) {
        const audioResponse = await fetch(project.audioUrl);
        const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
        files.push({ path: "./public/media/audio.mp3", content: audioBuffer });
      }

      if (project.musicUrl) {
        const musicResponse = await fetch(project.musicUrl);
        const musicBuffer = Buffer.from(await musicResponse.arrayBuffer());
        files.push({ path: "./public/media/music.mp3", content: musicBuffer });
      }

      if (project.videoUrls) {
        for (let i = 0; i < project.videoUrls.length; i++) {
          const videoResponse = await fetch(project.videoUrls[i]);
          const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
          files.push({ path: `./public/media/video${i}.mp4`, content: videoBuffer });
        }
      }

      await sandbox.writeFiles(files);

      console.log("running remotion render...");
      const render = await sandbox.runCommand({
        cmd: "bun",
        args: ["remotion", "render"],
      });

      if (render.exitCode !== 0) {
        throw new Error(`render failed: ${render.stderr}`);
      }

      console.log("reading output video...");
      const outputStream = await sandbox.readFile({ path: "./out/result.mp4" });
      
      if (!outputStream) {
        throw new Error("output video not found");
      }

      const chunks: Buffer[] = [];
      for await (const chunk of outputStream) {
        chunks.push(Buffer.from(chunk));
      }
      const outputVideo = Buffer.concat(chunks);

      const uploadUrl: string = await ctx.runMutation(api.tasks.generateUploadUrl, {});
      const uploadResponse: Response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "video/mp4" },
        body: outputVideo,
      });
      const { storageId }: { storageId: Id<"_storage"> } = await uploadResponse.json();
      const renderedVideoUrl: string | null = await ctx.storage.getUrl(storageId);

      await ctx.runMutation(api.tasks.updateProjectWithRenderResult, {
        id: projectId,
        renderedVideoUrl: renderedVideoUrl || undefined,
        status: "completed",
      });

      await sandbox.stop();

      return { success: true, renderedVideoUrl };
    } catch (error) {
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

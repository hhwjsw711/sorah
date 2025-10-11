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
    await ctx.runMutation(api.tasks.updateProjectStatus, {
      id: projectId,
      status: "rendering",
    });

    try {
      const project = await ctx.runQuery(api.tasks.getProject, { id: projectId });
      if (!project) {
        throw new Error("project not found");
      }

      const sandbox = await Sandbox.create('8r14p0kvwebvpgno5hia');

      console.log(`uploading media files...`);
      if (project.audioUrl) {
        const audioResponse = await fetch(project.audioUrl);
        const audioBuffer = await audioResponse.arrayBuffer();
        await sandbox.files.write('public/audio.mp3', audioBuffer);
      }

      if (project.musicUrl) {
        const musicResponse = await fetch(project.musicUrl);
        const musicBuffer = await musicResponse.arrayBuffer();
        await sandbox.files.write('public/music.mp3', musicBuffer);
      }

      if (project.videoUrls) {
        for (let i = 0; i < project.videoUrls.length; i++) {
          const videoResponse = await fetch(project.videoUrls[i]);
          const videoBuffer = await videoResponse.arrayBuffer();
          await sandbox.files.write(`public/video${i}.mp4`, videoBuffer);
        }
      }

      console.log(`running remotion render...`);
      const render = await sandbox.commands.run("bun remotion render");

      if (render.exitCode !== 0) {
        throw new Error(`render failed: ${render.stderr}`);
      }

      console.log(`reading output video...`);
      const outputVideo = await sandbox.files.read('out/video.mp4');
      
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

      await sandbox.kill();

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

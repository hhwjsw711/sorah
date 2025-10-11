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
      
      if (!process.env.E2B_API_KEY) {
        throw new Error("E2B_API_KEY not set in convex environment variables");
      }
      
      const claudeToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
      if (!claudeToken) {
        throw new Error("CLAUDE_CODE_OAUTH_TOKEN not set in convex environment variables");
      }
      
      const sandbox = await Sandbox.betaCreate("8r14p0kvwebvpgno5hia", {
        autoPause: true,
        timeoutMs: 900000, // 15 min
      });
      console.log("[render] sandbox created:", sandbox.sandboxId);

      console.log("[render] running claude code suggestions...");
      await ctx.runMutation(api.tasks.updateRenderProgress, {
        id: projectId,
        step: "claude analysis",
        details: "running claude code to improve remotion template",
      });
      
      const claudeResult = await sandbox.commands.run(
        `export CLAUDE_CODE_OAUTH_TOKEN="${claudeToken}" && claude --print "${project.prompt || 'optimize the remotion video template'}"`,
        { 
          cwd: "/home/user",
          timeoutMs: 120000,
        }
      );
      console.log("[render] claude exit code:", claudeResult.exitCode);
      console.log("[render] claude output (last 500 chars):", claudeResult.stdout.slice(-500));
      
      if (claudeResult.exitCode !== 0) {
        console.log("[render] claude failed, but continuing with render:", claudeResult.stderr);
      }

      console.log("[render] creating media directories...");
      await ctx.runMutation(api.tasks.updateRenderProgress, {
        id: projectId,
        step: "preparing environment",
        details: "setting up media directories",
      });
      
      await sandbox.commands.run("mkdir -p /home/user/public/media /home/user/public/reelful");
      console.log("[render] media directories created");
      
      console.log("[render] creating placeholder files...");
      await sandbox.files.write("/home/user/public/reelful-fast.srt", "");
      await sandbox.files.write("/home/user/public/media/subtitles.srt", "");
      console.log("[render] placeholder files created");

      console.log("[render] uploading media files...");
      await ctx.runMutation(api.tasks.updateRenderProgress, {
        id: projectId,
        step: "uploading media",
        details: "transferring files to sandbox",
      });
      
      if (project.audioUrl && project.audioUrl.includes("example.com")) {
        throw new Error("Cannot render: audioUrl (voiceover) is a simulated example.com URL. Please run AI processing first to generate real media files.");
      }
      
      if (project.audioUrl) {
        console.log("[render] fetching audio from:", project.audioUrl);
        const audioResponse = await fetch(project.audioUrl);
        const audioBuffer = await audioResponse.arrayBuffer();
        console.log("[render] audio fetched, size:", audioBuffer.byteLength);
        
        if (audioBuffer.byteLength < 1000) {
          throw new Error(`audioUrl (voiceover) file is too small (${audioBuffer.byteLength} bytes). This likely means the URL is invalid or returns an error page.`);
        }
        
        await sandbox.files.write("/home/user/public/media/audio.mp3", audioBuffer);
      }

      if (project.musicUrl) {
        if (project.musicUrl.includes("example.com")) {
          throw new Error("Cannot render: musicUrl (background music) is a simulated example.com URL. Please run AI processing first to generate real media files.");
        }
        
        console.log("[render] fetching music from:", project.musicUrl);
        const musicResponse = await fetch(project.musicUrl);
        const musicBuffer = await musicResponse.arrayBuffer();
        console.log("[render] music fetched, size:", musicBuffer.byteLength);
        
        if (musicBuffer.byteLength < 1000) {
          throw new Error(`musicUrl (background music) file is too small (${musicBuffer.byteLength} bytes). This likely means the URL is invalid or returns an error page.`);
        }
        
        await sandbox.files.write("/home/user/public/media/music.mp3", musicBuffer);
      }

      if (project.videoUrls && project.videoUrls.length > 0) {
        for (let i = 0; i < project.videoUrls.length; i++) {
          if (project.videoUrls[i].includes("example.com")) {
            throw new Error(`Cannot render: videoUrls[${i}] (animated video ${i + 1}) is a simulated example.com URL. Please run AI processing first to generate real media files.`);
          }
          
          console.log(`[render] fetching video ${i} from:`, project.videoUrls[i]);
          const videoResponse = await fetch(project.videoUrls[i]);
          const videoBuffer = await videoResponse.arrayBuffer();
          console.log(`[render] video ${i} fetched, size:`, videoBuffer.byteLength);
          
          if (videoBuffer.byteLength < 1000) {
            throw new Error(`videoUrls[${i}] (animated video ${i + 1}) file is too small (${videoBuffer.byteLength} bytes). This likely means the URL is invalid or returns an error page.`);
          }
          
          await sandbox.files.write(`/home/user/public/media/video${i}.mp4`, videoBuffer);
          
          if (i === 0) {
            await sandbox.files.write(`/home/user/public/reelful/video_2025-10-10_18-12-33%20(2).mp4`, videoBuffer);
          }
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
      });
      console.log("[render] render exit code:", renderResult.exitCode);
      console.log("[render] render stdout (last 500 chars):", renderResult.stdout.slice(-500));
      
      if (renderResult.exitCode !== 0) {
        console.log("[render] render stderr:", renderResult.stderr);
        throw new Error(`render failed with exit code ${renderResult.exitCode}: ${renderResult.stderr}`);
      }
      console.log("[render] remotion render completed");

      console.log("[render] checking output directory...");
      const lsResult = await sandbox.commands.run("ls -lah /home/user/out/");
      console.log("[render] out directory contents:", lsResult.stdout);

      console.log("[render] reading output video...");
      const outputVideo = await sandbox.files.read("/home/user/out/Main.mp4");
      
      if (!outputVideo) {
        throw new Error("output video not found");
      }
      const outputSize = typeof outputVideo === 'string' ? outputVideo.length : (outputVideo as ArrayBuffer).byteLength;
      console.log("[render] output video size:", outputSize);
      
      if (outputSize === 0 || outputSize < 1000) {
        throw new Error(`output video is too small (${outputSize} bytes) - render likely failed`);
      }

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

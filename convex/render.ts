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

      if (!process.env.E2B_API_KEY) {
        throw new Error("E2B_API_KEY not set in convex environment variables");
      }
      
      const claudeToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
      if (!claudeToken) {
        throw new Error("CLAUDE_CODE_OAUTH_TOKEN not set in convex environment variables");
      }

      let sandbox;
      if (project.sandboxId) {
        console.log("[render] connecting to existing sandbox:", project.sandboxId);
        await ctx.runMutation(api.tasks.updateRenderProgress, {
          id: projectId,
          step: "connecting to sandbox",
          details: "reusing existing e2b environment",
        });
        
        try {
          sandbox = await Sandbox.connect(project.sandboxId);
          console.log("[render] connected to existing sandbox");
        } catch (error) {
          console.log("[render] failed to connect to existing sandbox, creating new one:", error);
          sandbox = await Sandbox.betaCreate("8r14p0kvwebvpgno5hia", {
            autoPause: true,
            timeoutMs: 900000,
            envs: {
              CLAUDE_CODE_OAUTH_TOKEN: claudeToken,
            },
          });
          console.log("[render] new sandbox created:", sandbox.sandboxId);
          
          await ctx.runMutation(api.tasks.updateProjectSandbox, {
            id: projectId,
            sandboxId: sandbox.sandboxId,
          });
        }
      } else {
        console.log("[render] creating new e2b sandbox...");
        await ctx.runMutation(api.tasks.updateRenderProgress, {
          id: projectId,
          step: "creating sandbox",
          details: "initializing e2b environment with remotion template",
        });
        
        sandbox = await Sandbox.betaCreate("8r14p0kvwebvpgno5hia", {
          autoPause: true,
          timeoutMs: 900000,
          envs: {
            CLAUDE_CODE_OAUTH_TOKEN: claudeToken,
          },
        });
        console.log("[render] sandbox created:", sandbox.sandboxId);

        await ctx.runMutation(api.tasks.updateProjectSandbox, {
          id: projectId,
          sandboxId: sandbox.sandboxId,
        });
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

      console.log("[render] running claude agent to edit video...");
      await ctx.runMutation(api.tasks.updateRenderProgress, {
        id: projectId,
        step: "claude video editing",
        details: "claude is analyzing footage and creating composition",
      });
      
      const videoEditorPrompt = `remotion.dev - add new composition using ls public/media files.

read photos, and for each video extract first frame, and create .txt file with a description what's in the video — the first frames of the video, it's for you. you will use the full videos in the composition.

then decide on how to edit them together by emotion: ${project.prompt || 'create an engaging social media video'}

bun remotion render when done

upload out/reelful.mp4 
curl -X POST https://reels-srt.vercel.app/api/fireworks -F "file=@out/reelful.mp4"

and save srt into the public/reelful.srt

create new composition based on footage from public/reelful using audio.mp3 voice (1.25x sped up) + srt and baked in subtitles (https://www.remotion.dev/docs/recorder/exporting-subtitles#burn-subtitles). select 1-2-4 seconds segments from each video, organize videos in order, based on the freeze frames you have. start with the most interesting shot.

we use bun btw

composition should be portrait!`;

      await sandbox.files.write("/home/user/prompt.txt", videoEditorPrompt);
      
      const claudeResult = await sandbox.commands.run(
        `bun run claude-agent.ts`,
        { 
          cwd: "/home/user",
          timeoutMs: 600000,
          requestTimeoutMs: 600000,
        }
      );
      console.log("[render] claude exit code:", claudeResult.exitCode);
      console.log("[render] claude output (last 1000 chars):", claudeResult.stdout.slice(-1000));
      
      if (claudeResult.exitCode !== 0) {
        console.log("[render] claude failed:", claudeResult.stderr);
        throw new Error(`claude video editing failed: ${claudeResult.stderr}`);
      }

      console.log("[render] claude has completed rendering, checking output...");
      await ctx.runMutation(api.tasks.updateRenderProgress, {
        id: projectId,
        step: "finalizing video",
        details: "retrieving rendered video from sandbox",
      });

      console.log("[render] checking output directory...");
      const lsResult = await sandbox.commands.run("ls -lah /home/user/out/ 2>/dev/null || echo 'out directory not found'");
      console.log("[render] out directory contents:", lsResult.stdout);

      const findResult = await sandbox.commands.run("find /home/user/out -name '*.mp4' 2>/dev/null || echo 'no mp4 files found'");
      console.log("[render] mp4 files in out/:", findResult.stdout);

      console.log("[render] reading output video...");
      let outputVideo;
      const videoPath = "/home/user/out/Main.mp4";
      
      try {
        outputVideo = await sandbox.files.read(videoPath);
      } catch {
        console.log("[render] Main.mp4 not found");
        const claudeOutput = claudeResult.stdout || "";
        const hasMemoryError = claudeOutput.includes("memory") || claudeOutput.includes("killed");
        
        if (hasMemoryError) {
          throw new Error("render failed due to insufficient memory - claude created the composition but couldn't render it. check sandbox files and try rendering manually with more resources.");
        }
        
        throw new Error(`output video not found at ${videoPath} - check logs and out/ directory for details. claude may have created files but not completed the render.`);
      }
      
      if (!outputVideo) {
        throw new Error("output video is empty");
      }
      const outputSize = typeof outputVideo === 'string' ? outputVideo.length : (outputVideo as ArrayBuffer).byteLength;
      console.log("[render] output video size:", outputSize, "from path:", videoPath);
      
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

      console.log("[render] render complete! keeping sandbox alive");
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

export const getSandboxInfo = action({
  args: {
    sandboxId: v.string(),
  },
  handler: async (ctx, { sandboxId }) => {
    try {
      if (!process.env.E2B_API_KEY) {
        throw new Error("E2B_API_KEY not set");
      }

      const sandbox = await Sandbox.connect(sandboxId);
      
      const lsResult = await sandbox.commands.run("ls -lah /home/user/out/ 2>/dev/null || echo 'out directory not found'");
      const diskResult = await sandbox.commands.run("df -h /home/user");
      
      return {
        success: true,
        sandboxId: sandbox.sandboxId,
        outDirectory: lsResult.stdout,
        diskUsage: diskResult.stdout,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "failed to connect to sandbox",
      };
    }
  },
});

export const runSandboxCommand = action({
  args: {
    sandboxId: v.string(),
    command: v.string(),
  },
  handler: async (ctx, { sandboxId, command }) => {
    try {
      if (!process.env.E2B_API_KEY) {
        throw new Error("E2B_API_KEY not set");
      }

      const sandbox = await Sandbox.connect(sandboxId);
      
      const result = await sandbox.commands.run(command, {
        cwd: "/home/user",
        timeoutMs: 30000,
      });
      
      return {
        success: true,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "failed to run command",
      };
    }
  },
});

export const listSandboxFiles = action({
  args: {
    sandboxId: v.string(),
    path: v.optional(v.string()),
  },
  handler: async (ctx, { sandboxId, path = "/home/user/out" }) => {
    try {
      if (!process.env.E2B_API_KEY) {
        throw new Error("E2B_API_KEY not set");
      }

      const sandbox = await Sandbox.connect(sandboxId);
      
      const files = await sandbox.files.list(path);
      
      return {
        success: true,
        files: files.map(f => ({
          name: f.name,
          path: f.path,
          isDir: f.type === "dir",
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "failed to list files",
      };
    }
  },
});

export const readSandboxFile = action({
  args: {
    sandboxId: v.string(),
    filePath: v.string(),
  },
  handler: async (ctx, { sandboxId, filePath }) => {
    try {
      if (!process.env.E2B_API_KEY) {
        throw new Error("E2B_API_KEY not set");
      }

      const sandbox = await Sandbox.connect(sandboxId);
      
      const content = await sandbox.files.read(filePath);
      
      let base64Content = "";
      if (typeof content === 'string') {
        base64Content = Buffer.from(content).toString('base64');
      } else {
        const uint8Array = new Uint8Array(content as ArrayBuffer);
        base64Content = Buffer.from(uint8Array).toString('base64');
      }
      
      return {
        success: true,
        content: base64Content,
        isText: typeof content === 'string',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "failed to read file",
      };
    }
  },
});

export const getSandboxFileDownloadUrl = action({
  args: {
    sandboxId: v.string(),
    filePath: v.string(),
  },
  handler: async (ctx, { sandboxId, filePath }) => {
    try {
      if (!process.env.E2B_API_KEY) {
        throw new Error("E2B_API_KEY not set");
      }

      const sandbox = await Sandbox.connect(sandboxId);
      
      const downloadUrl = await sandbox.downloadUrl(filePath, {
        useSignatureExpiration: 300_000,
      });
      
      return {
        success: true,
        downloadUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "failed to get download url",
      };
    }
  },
});



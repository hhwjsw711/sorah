"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { fal } from "@fal-ai/client";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { api } from "./_generated/api";

export const transcribeAudio = action({
  args: {
    audioUrl: v.string(),
  },
  handler: async (ctx, { audioUrl }) => {
    console.log("[transcribe] fetching audio from:", audioUrl);
    
    try {
      const audioResponse = await fetch(audioUrl);
      const audioBlob = await audioResponse.blob();
      
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.mp3");

      const response = await fetch("https://reels-srt.vercel.app/api/fireworks", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`transcription failed: ${response.statusText}`);
      }

      const srtText = await response.text();
      console.log("[transcribe] transcription complete");

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

export const animateImage = action({
  args: {
    imageUrl: v.string(),
    prompt: v.optional(v.string()),
  },
  handler: async (ctx, { imageUrl, prompt = "slightly animate it" }) => {
    console.log("[animate] animating image:", imageUrl);
    
    try {
      const apiKey = process.env.FAL_API_KEY;
      if (!apiKey) {
        throw new Error("FAL_API_KEY not set");
      }

      fal.config({ credentials: apiKey });

      console.log("[animate] fetching image to upload to FAL storage");
      const imageResponse = await fetch(imageUrl);
      const imageBlob = await imageResponse.blob();
      
      const falImageUrl = await fal.storage.upload(imageBlob);
      console.log("[animate] image uploaded to FAL storage:", falImageUrl);

      const result = await fal.subscribe("fal-ai/kling-video/v2.5-turbo/standard/image-to-video", {
        input: {
          prompt,
          image_url: falImageUrl,
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log) => log.message).forEach((msg) => console.log("[animate]", msg));
          }
        },
      });

      console.log("[animate] animation complete");
      return { success: true, data: result.data, requestId: result.requestId };
    } catch (error) {
      console.error("[animate] error:", error);
      if (error && typeof error === 'object' && 'body' in error) {
        console.error("[animate] error details:", JSON.stringify((error as { body: unknown }).body));
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "animation failed",
      };
    }
  },
});

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

function convertTimestampsToSRT(characters: string[], startTimes: number[], endTimes: number[]): string {
  let srt = "";
  let index = 1;
  let currentWord = "";
  let wordStartTime = 0;
  let wordEndTime = 0;

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];

    if (char === " " || i === characters.length - 1) {
      if (i === characters.length - 1 && char !== " ") {
        currentWord += char;
        wordEndTime = endTimes[i];
      }

      if (currentWord.trim().length > 0) {
        srt += `${index}\n`;
        srt += `${formatTime(wordStartTime)} --> ${formatTime(wordEndTime)}\n`;
        srt += `${currentWord.trim()}\n\n`;
        index++;
      }

      currentWord = "";
      if (i < characters.length - 1) {
        wordStartTime = startTimes[i + 1];
      }
    } else {
      if (currentWord === "") {
        wordStartTime = startTimes[i];
      }
      currentWord += char;
      wordEndTime = endTimes[i];
    }
  }

  return srt;
}

export const generateVoiceover = action({
  args: {
    text: v.string(),
    voice: v.optional(v.string()),
  },
  handler: async (ctx, { text, voice = "Rachel" }): Promise<{ success: boolean; audioUrl?: string | null; durationMs?: number; srtContent?: string; error?: string }> => {
    console.log("[voiceover] generating voiceover with fal ElevenLabs TTS");

    try {
      const apiKey = process.env.FAL_API_KEY;
      if (!apiKey) {
        throw new Error("FAL_API_KEY not set");
      }

      fal.config({ credentials: apiKey });

      const result = await fal.subscribe("fal-ai/elevenlabs/tts/multilingual-v2", {
        input: {
          text,
          voice,
          stability: 0.5,
          similarity_boost: 1.0,
          style: 0.0,
          speed: 1.2,
          timestamps: true,
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log) => log.message).forEach((msg) => console.log("[voiceover]", msg));
          }
        },
      });

      console.log("[voiceover] voiceover generated");

      const data = result.data as {
        audio: { url: string };
        timestamps?: Array<{
          characters: string[];
          character_start_times_seconds: number[];
          character_end_times_seconds: number[];
        }>;
      };
      const audioResponse = await fetch(data.audio.url);
      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      console.log("[voiceover] audio size:", audioBuffer.length);

      const bitrate = 128000;
      const durationMs = Math.floor((audioBuffer.length * 8 / bitrate) * 1000);
      console.log("[voiceover] estimated duration:", durationMs, "ms");

      let srtContent: string | undefined;
      if (data.timestamps && data.timestamps.length > 0) {
        console.log("[voiceover] converting timestamps to SRT");
        const t = data.timestamps[0];
        srtContent = convertTimestampsToSRT(
          t.characters,
          t.character_start_times_seconds,
          t.character_end_times_seconds
        );
        console.log("[voiceover] SRT generated, length:", srtContent.length, "chars");
      }

      const uploadUrl = await ctx.runMutation(api.tasks.generateUploadUrl, {});
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "audio/mp3" },
        body: audioBuffer,
      });
      const { storageId } = await uploadResponse.json();
      const audioUrl = await ctx.storage.getUrl(storageId);

      console.log("[voiceover] voiceover uploaded to storage");
      return { success: true, audioUrl, durationMs, srtContent };
    } catch (error) {
      console.error("[voiceover] error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "voiceover generation failed",
      };
    }
  },
});

export const generateMusic = action({
  args: {
    prompt: v.string(),
    durationMs: v.optional(v.number()),
  },
  handler: async (ctx, { prompt, durationMs = 15000 }): Promise<{ success: boolean; musicUrl?: string | null; error?: string }> => {
    console.log("[music] generating background music with fal ElevenLabs Music");

    try {
      const apiKey = process.env.FAL_API_KEY;
      if (!apiKey) {
        throw new Error("FAL_API_KEY not set");
      }

      fal.config({ credentials: apiKey });

      const result = await fal.subscribe("fal-ai/elevenlabs/music", {
        input: {
          prompt,
          music_length_ms: durationMs,
          force_instrumental: true,
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log) => log.message).forEach((msg) => console.log("[music]", msg));
          }
        },
      });

      const data = result.data as { audio: { url: string } };
      const audioResponse = await fetch(data.audio.url);
      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      console.log("[music] music generated, size:", audioBuffer.length);

      const uploadUrl = await ctx.runMutation(api.tasks.generateUploadUrl, {});
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "audio/mp3" },
        body: audioBuffer,
      });
      const { storageId } = await uploadResponse.json();
      const musicUrl = await ctx.storage.getUrl(storageId);

      console.log("[music] music uploaded to storage");
      return { success: true, musicUrl };
    } catch (error) {
      console.error("[music] error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "music generation failed",
      };
    }
  },
});

export const generateScript = action({
  args: {
    prompt: v.string(),
    imageUrls: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { prompt, imageUrls = [] }) => {
    console.log("[script] generating script for prompt:", prompt);
    
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY not set");
      }

      const openai = createOpenAI({ apiKey });

      const systemPrompt = `You are a social media manager creating a script for a short form video for IG, tiktok or Youtube shorts. Your task is to create a 15 second script given the given information. Add a bit of background to explain company names, if some details can be lacking for general audience, feel free to add it. Also add value why this reel is worth watch or why the idea conveyed in the reel is important. Add a hook in the beginning and call for action at the end related to the things mentioned at the video (to try the thing mentioned or smth like that). Do not add too much exciting phrases - try to keep professional. Take into account the photos and videos attached. The output should be just plain text w/o any additional words`;

      const { text } = await generateText({
        model: openai("gpt-5"),
        system: systemPrompt,
        prompt,
      });

      // Replace single ? with ???
      const processedScript = text.replace(/\?/g, '???');

      console.log("[script] script generated");
      return { success: true, script: processedScript };
    } catch (error) {
      console.error("[script] error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "script generation failed",
      };
    }
  },
});

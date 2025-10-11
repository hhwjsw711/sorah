"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { fal } from "@fal-ai/client";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
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

      const result = await fal.subscribe("fal-ai/kling-video/v2.5-turbo/pro/image-to-video", {
        input: {
          prompt,
          image_url: imageUrl,
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
      return {
        success: false,
        error: error instanceof Error ? error.message : "animation failed",
      };
    }
  },
});

export const generateVoiceover = action({
  args: {
    text: v.string(),
    voiceId: v.optional(v.string()),
  },
  handler: async (ctx, { text, voiceId = "y3QRUmmVlCstT6DNbXg9" }): Promise<{ success: boolean; audioUrl?: string | null; error?: string }> => {
    console.log("[voiceover] generating voiceover");
    
    try {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        throw new Error("ELEVENLABS_API_KEY not set");
      }

      const client = new ElevenLabsClient({
        apiKey,
      });

      const audioStream = await client.textToSpeech.convert(voiceId, {
        outputFormat: "mp3_44100_128",
        text,
        modelId: "eleven_multilingual_v2",
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 1.0,
          style: 0.0,
          useSpeakerBoost: true,
        },
      });

      const chunks: Uint8Array[] = [];
      const reader = audioStream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const audioBuffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        audioBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      console.log("[voiceover] voiceover generated, size:", audioBuffer.length);
      
      const uploadUrl = await ctx.runMutation(api.tasks.generateUploadUrl, {});
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "audio/mp3" },
        body: audioBuffer,
      });
      const { storageId } = await uploadResponse.json();
      const audioUrl = await ctx.storage.getUrl(storageId);
      
      console.log("[voiceover] voiceover uploaded to storage");
      return { success: true, audioUrl };
    } catch (error) {
      console.error("[voiceover] error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "voiceover generation failed",
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

      console.log("[script] script generated");
      return { success: true, script: text };
    } catch (error) {
      console.error("[script] error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "script generation failed",
      };
    }
  },
});

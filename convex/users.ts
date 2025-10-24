import { v } from "convex/values";
import { mutation, query, internalMutation, action } from "./_generated/server";
import { api } from "./_generated/api";

// Internal mutation to store OTP in database (used by phoneAuth)
export const storeOTP = internalMutation({
  args: {
    phone: v.string(),
    code: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Delete any existing OTPs for this phone
    const existingOTPs = await ctx.db
      .query("otpCodes")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .collect();
    
    for (const otp of existingOTPs) {
      await ctx.db.delete(otp._id);
    }

    // Insert new OTP
    await ctx.db.insert("otpCodes", {
      phone: args.phone,
      code: args.code,
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    });
  },
});

// Internal mutation to get or create user (used by Twilio Verify)
export const getOrCreateUser = internalMutation({
  args: {
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user exists
    let user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();

    // Create user if doesn't exist
    if (!user) {
      const userId = await ctx.db.insert("users", {
        phone: args.phone,
        onboardingCompleted: false,
        createdAt: Date.now(),
      });
      user = await ctx.db.get(userId);
    }

    return {
      userId: user?._id,
      onboardingCompleted: user?.onboardingCompleted || false,
    };
  },
});

// Verify OTP and create/get user (for development mode with local OTP storage)
export const verifyOTP = mutation({
  args: {
    phone: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    // Find OTP in database
    const storedOTP = await ctx.db
      .query("otpCodes")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();
    
    if (!storedOTP) {
      throw new Error("OTP not found. Please request a new code.");
    }

    if (Date.now() > storedOTP.expiresAt) {
      await ctx.db.delete(storedOTP._id);
      throw new Error("OTP expired. Please request a new code.");
    }

    if (storedOTP.code !== args.code) {
      throw new Error("Invalid OTP code.");
    }

    // OTP is valid, delete it
    await ctx.db.delete(storedOTP._id);

    // Check if user exists
    let user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();

    // Create user if doesn't exist
    if (!user) {
      const userId = await ctx.db.insert("users", {
        phone: args.phone,
        onboardingCompleted: false,
        createdAt: Date.now(),
      });
      user = await ctx.db.get(userId);
    }

    return { 
      success: true, 
      userId: user?._id,
      onboardingCompleted: user?.onboardingCompleted || false 
    };
  },
});

// Get current user by ID
export const getCurrentUser = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.userId) {
      return null;
    }
    return await ctx.db.get(args.userId);
  },
});

// Get voice preview URL from storage ID
export const getVoicePreviewUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Internal mutation to update user onboarding
export const internalCompleteOnboarding = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    preferredStyle: v.union(
      v.literal("playful"),
      v.literal("professional"),
      v.literal("travel")
    ),
    voiceRecordingStorageId: v.optional(v.id("_storage")),
    voiceRecordingUrl: v.optional(v.string()),
    elevenlabsVoiceId: v.optional(v.string()),
    voicePreviewStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      name: args.name,
      preferredStyle: args.preferredStyle,
      voiceRecordingStorageId: args.voiceRecordingStorageId,
      voiceRecordingUrl: args.voiceRecordingUrl,
      elevenlabsVoiceId: args.elevenlabsVoiceId,
      voicePreviewStorageId: args.voicePreviewStorageId,
      onboardingCompleted: true,
    });
  },
});

// Complete onboarding by updating user profile
export const completeOnboarding = action({
  args: {
    userId: v.id("users"),
    name: v.string(),
    preferredStyle: v.union(
      v.literal("playful"),
      v.literal("professional"),
      v.literal("travel")
    ),
    voiceRecordingStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    // Get the storage URL for the voice recording
    let voiceRecordingUrl: string | undefined;
    let elevenlabsVoiceId: string | undefined;
    let voicePreviewStorageId: string | undefined;
    
    if (args.voiceRecordingStorageId) {
      voiceRecordingUrl = await ctx.storage.getUrl(args.voiceRecordingStorageId);
      
      // Create ElevenLabs voice if audio is provided
      if (voiceRecordingUrl) {
        console.log("[completeOnboarding] creating ElevenLabs voice...");
        const voiceResult = await ctx.runAction(api.aiServices.createElevenLabsVoice, {
          audioUrl: voiceRecordingUrl,
          name: `${args.name}'s Voice`,
        });
        
        if (voiceResult.success && voiceResult.voiceId) {
          elevenlabsVoiceId = voiceResult.voiceId;
          voicePreviewStorageId = voiceResult.previewStorageId;
          console.log("[completeOnboarding] ElevenLabs voice created:", elevenlabsVoiceId);
        } else {
          console.error("[completeOnboarding] failed to create ElevenLabs voice:", voiceResult.error);
          // Continue with onboarding even if voice creation fails
        }
      }
    }

    await ctx.runMutation(api.users.internalCompleteOnboarding, {
      userId: args.userId,
      name: args.name,
      preferredStyle: args.preferredStyle,
      voiceRecordingStorageId: args.voiceRecordingStorageId,
      voiceRecordingUrl: voiceRecordingUrl,
      elevenlabsVoiceId: elevenlabsVoiceId,
      voicePreviewStorageId: voicePreviewStorageId,
    });

    return { success: true };
  },
});

// Generate upload URL for voice recording
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Internal mutation to update user profile
export const internalUpdateProfile = internalMutation({
  args: {
    userId: v.id("users"),
    updates: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, args.updates);
  },
});

// Internal mutation to update just the voice ID and preview
export const updateVoiceId = internalMutation({
  args: {
    userId: v.id("users"),
    elevenlabsVoiceId: v.string(),
    voicePreviewStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      elevenlabsVoiceId: args.elevenlabsVoiceId,
      voicePreviewStorageId: args.voicePreviewStorageId,
    });
  },
});

// Action to regenerate voice from existing recording
export const regenerateVoice = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.getCurrentUser, { userId: args.userId });
    
    if (!user?.voiceRecordingUrl) {
      return {
        success: false,
        error: "No voice recording found",
      };
    }

    console.log("[regenerateVoice] creating ElevenLabs voice...");
    const voiceResult = await ctx.runAction(api.aiServices.createElevenLabsVoice, {
      audioUrl: user.voiceRecordingUrl,
      name: `${user.name || "User"}'s Voice`,
    });
    
    if (voiceResult.success && voiceResult.voiceId) {
      await ctx.runMutation(api.users.updateVoiceId, {
        userId: args.userId,
        elevenlabsVoiceId: voiceResult.voiceId,
        voicePreviewStorageId: voiceResult.previewStorageId,
      });
      
      console.log("[regenerateVoice] voice created successfully:", voiceResult.voiceId);
      return {
        success: true,
        voiceId: voiceResult.voiceId,
      };
    }
    
    return {
      success: false,
      error: voiceResult.error || "Failed to create voice",
    };
  },
});

// Update user profile
export const updateProfile = action({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    preferredStyle: v.optional(
      v.union(
        v.literal("playful"),
        v.literal("professional"),
        v.literal("travel")
      )
    ),
    voiceRecordingStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.preferredStyle !== undefined) updates.preferredStyle = args.preferredStyle;
    
    // Update voice recording if provided
    if (args.voiceRecordingStorageId !== undefined) {
      updates.voiceRecordingStorageId = args.voiceRecordingStorageId;
      const voiceRecordingUrl = await ctx.storage.getUrl(args.voiceRecordingStorageId);
      updates.voiceRecordingUrl = voiceRecordingUrl || undefined;
      
      // Create new ElevenLabs voice if audio is provided
      if (voiceRecordingUrl) {
        const user = await ctx.runQuery(api.users.getCurrentUser, { userId: args.userId });
        const userName = args.name || user?.name || "User";
        
        console.log("[updateProfile] creating ElevenLabs voice...");
        const voiceResult = await ctx.runAction(api.aiServices.createElevenLabsVoice, {
          audioUrl: voiceRecordingUrl,
          name: `${userName}'s Voice`,
        });
        
        if (voiceResult.success && voiceResult.voiceId) {
          updates.elevenlabsVoiceId = voiceResult.voiceId;
          updates.voicePreviewStorageId = voiceResult.previewStorageId;
          console.log("[updateProfile] ElevenLabs voice created:", voiceResult.voiceId);
        } else {
          console.error("[updateProfile] failed to create ElevenLabs voice:", voiceResult.error);
        }
      }
    }

    await ctx.runMutation(api.users.internalUpdateProfile, {
      userId: args.userId,
      updates,
    });
    
    return { success: true };
  },
});

// Get user by phone (for authentication check)
export const getUserByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();
  },
});


import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

// Complete onboarding by updating user profile
export const completeOnboarding = mutation({
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
    if (args.voiceRecordingStorageId) {
      voiceRecordingUrl = await ctx.storage.getUrl(args.voiceRecordingStorageId);
    }

    await ctx.db.patch(args.userId, {
      name: args.name,
      preferredStyle: args.preferredStyle,
      voiceRecordingStorageId: args.voiceRecordingStorageId,
      voiceRecordingUrl: voiceRecordingUrl || undefined,
      onboardingCompleted: true,
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

// Update user profile
export const updateProfile = mutation({
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
  },
  handler: async (ctx, args) => {
    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.preferredStyle !== undefined) updates.preferredStyle = args.preferredStyle;

    await ctx.db.patch(args.userId, updates);
    return { success: true };
  },
});


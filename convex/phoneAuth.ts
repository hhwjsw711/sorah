import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Generate a 6-digit OTP code
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Internal mutation to store OTP in database
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

// Send OTP code (mock implementation)
// In production, integrate with Twilio, AWS SNS, or similar
export const sendOTP = action({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const code = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store the OTP in the database
    await ctx.runMutation(internal.phoneAuth.storeOTP, {
      phone: args.phone,
      code,
      expiresAt,
    });

    // In production, send SMS here using Twilio or similar
    console.log(`📱 OTP for ${args.phone}: ${code}`);
    
    // For development, you can also log to the console
    // In production, you'd call your SMS provider API here
    // await sendSMS(args.phone, `Your verification code is: ${code}`);

    return { success: true, message: "OTP sent successfully" };
  },
});

// Verify OTP and create/get user
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


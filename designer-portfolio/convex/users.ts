import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { generateUUID } from "./utils";

// 获取所有用户
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// 根据ID获取用户
export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// 根据UUID获取用户
export const getByUuid = query({
  args: { uuid: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_uuid", (q) => q.eq("uuid", args.uuid))
      .first();
  },
});

// 根据邮箱获取用户
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// 创建用户
export const create = mutation({
  args: {
    username: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    occupation: v.optional(v.string()),
    location: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      uuid: generateUUID(),
      username: args.username,
      email: args.email,
      passwordHash: args.passwordHash,
      displayName: args.displayName,
      avatarUrl: args.avatarUrl,
      bio: args.bio,
      occupation: args.occupation,
      location: args.location,
      phone: args.phone,
      role: "user",
      isVerified: false,
      createdAt: now,
      updatedAt: now,
    });
    return userId;
  },
});

// 更新用户
export const update = mutation({
  args: {
    id: v.id("users"),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    occupation: v.optional(v.string()),
    location: v.optional(v.string()),
    website: v.optional(v.string()),
    github: v.optional(v.string()),
    twitter: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    facebook: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

// 删除用户
export const remove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { generateUUID } from "./utils";

// 用户注册
export const register = mutation({
  args: {
    username: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 检查邮箱是否已存在
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("Email already registered");
    }

    // 检查用户名是否已存在
    const existingUsername = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (existingUsername) {
      throw new Error("Username already taken");
    }

    // 创建用户
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      uuid: generateUUID(),
      username: args.username,
      email: args.email,
      passwordHash: args.passwordHash,
      displayName: args.displayName,
      role: "user",
      isVerified: false,
      createdAt: now,
      updatedAt: now,
    });

    return {
      userId,
      message: "User registered successfully",
    };
  },
});

// 用户登录
export const login = mutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    if (user.passwordHash !== args.passwordHash) {
      throw new Error("Invalid password");
    }

    return {
      userId: user._id,
      uuid: user.uuid,
      username: user.username,
      email: user.email,
      role: user.role,
      message: "Login successful",
    };
  },
});

// 获取当前用户信息
export const me = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    // 不返回密码
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },
});

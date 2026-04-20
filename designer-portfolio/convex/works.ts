import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { generateUUID } from "./utils";

// 获取所有作品
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("works").collect();
  },
});

// 获取已发布作品
export const listPublished = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("works")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();
  },
});

// 根据ID获取作品
export const get = query({
  args: { id: v.id("works") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// 根据UUID获取作品
export const getByUuid = query({
  args: { uuid: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("works")
      .withIndex("by_uuid", (q) => q.eq("uuid", args.uuid))
      .first();
  },
});

// 获取用户的作品
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("works")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// 获取精选作品
export const getFeatured = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("works")
      .withIndex("by_featured", (q) => q.eq("isFeatured", true))
      .collect();
  },
});

// 创建作品
export const create = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    content: v.optional(v.string()),
    url: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    thumbnailType: v.optional(v.string()),
    thumbnailData: v.optional(v.string()),
    coverUrl: v.optional(v.string()),
    source: v.optional(v.string()),
    sourceFile: v.optional(v.string()),
    fileType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const workId = await ctx.db.insert("works", {
      uuid: generateUUID(),
      userId: args.userId,
      title: args.title,
      description: args.description,
      content: args.content,
      url: args.url,
      category: args.category,
      tags: args.tags ?? [],
      thumbnailType: args.thumbnailType ?? "gradient",
      thumbnailData: args.thumbnailData,
      coverUrl: args.coverUrl,
      source: args.source ?? "link",
      sourceFile: args.sourceFile,
      fileType: args.fileType,
      fileSize: args.fileSize,
      sortOrder: 0,
      isFeatured: false,
      status: "draft",
      viewCount: 0,
      likes: 0,
      createdAt: now,
      updatedAt: now,
    });
    return workId;
  },
});

// 更新作品
export const update = mutation({
  args: {
    id: v.id("works"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    content: v.optional(v.string()),
    url: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    thumbnailType: v.optional(v.string()),
    thumbnailData: v.optional(v.string()),
    coverUrl: v.optional(v.string()),
    status: v.optional(v.string()),
    isFeatured: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const updateData: any = { ...updates, updatedAt: Date.now() };
    
    if (updates.status === "published") {
      updateData.publishedAt = Date.now();
    }
    
    await ctx.db.patch(id, updateData);
    return await ctx.db.get(id);
  },
});

// 删除作品
export const remove = mutation({
  args: { id: v.id("works") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// 增加浏览量
export const incrementViews = mutation({
  args: { id: v.id("works") },
  handler: async (ctx, args) => {
    const work = await ctx.db.get(args.id);
    if (work) {
      await ctx.db.patch(args.id, {
        viewCount: work.viewCount + 1,
      });
    }
    return { success: true };
  },
});

// 增加点赞
export const incrementLikes = mutation({
  args: { id: v.id("works") },
  handler: async (ctx, args) => {
    const work = await ctx.db.get(args.id);
    if (work) {
      await ctx.db.patch(args.id, {
        likes: work.likes + 1,
      });
    }
    return { success: true };
  },
});

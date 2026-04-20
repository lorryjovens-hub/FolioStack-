import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// 创建分析事件
export const create = mutation({
  args: {
    eventType: v.string(),
    workId: v.optional(v.id("works")),
    portfolioId: v.optional(v.id("portfolios")),
    visitorId: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    referrer: v.optional(v.string()),
    pageUrl: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert("analyticsEvents", {
      ...args,
      createdAt: Date.now(),
    });
    return eventId;
  },
});

// 获取所有分析事件
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("analyticsEvents").collect();
  },
});

// 获取作品的浏览统计
export const getWorkStats = query({
  args: { workId: v.id("works") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_work", (q) => q.eq("workId", args.workId))
      .collect();

    const views = events.filter((e) => e.eventType === "view").length;
    const likes = events.filter((e) => e.eventType === "like").length;
    const shares = events.filter((e) => e.eventType === "share").length;

    return {
      workId: args.workId,
      views,
      likes,
      shares,
      total: events.length,
    };
  },
});

// 获取作品集的浏览统计
export const getPortfolioStats = query({
  args: { portfolioId: v.id("portfolios") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_portfolio", (q) => q.eq("portfolioId", args.portfolioId))
      .collect();

    const views = events.filter((e) => e.eventType === "view").length;

    return {
      portfolioId: args.portfolioId,
      views,
      total: events.length,
    };
  },
});

// 获取整体统计
export const getOverallStats = query({
  handler: async (ctx) => {
    const events = await ctx.db.query("analyticsEvents").collect();

    const views = events.filter((e) => e.eventType === "view").length;
    const likes = events.filter((e) => e.eventType === "like").length;
    const shares = events.filter((e) => e.eventType === "share").length;

    return {
      views,
      likes,
      shares,
      total: events.length,
    };
  },
});

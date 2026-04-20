import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 用户表
  users: defineTable({
    uuid: v.string(),
    username: v.string(),
    phone: v.optional(v.string()),
    email: v.string(),
    passwordHash: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    occupation: v.optional(v.string()),
    location: v.optional(v.string()),
    facebook: v.optional(v.string()),
    twitter: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    github: v.optional(v.string()),
    website: v.optional(v.string()),
    role: v.string(), // 'user' | 'admin'
    isVerified: v.boolean(),
    createdAt: v.number(), // timestamp
    updatedAt: v.number(),
  })
    .index("by_uuid", ["uuid"])
    .index("by_username", ["username"])
    .index("by_email", ["email"]),

  // 作品表
  works: defineTable({
    uuid: v.string(),
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    content: v.optional(v.string()),
    url: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    thumbnailType: v.string(), // 'gradient' | 'image'
    thumbnailData: v.optional(v.string()),
    coverUrl: v.optional(v.string()),
    source: v.string(), // 'link' | 'upload'
    sourceFile: v.optional(v.string()),
    fileType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    sortOrder: v.number(),
    isFeatured: v.boolean(),
    status: v.string(), // 'draft' | 'published'
    viewCount: v.number(),
    likes: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    publishedAt: v.optional(v.number()),
  })
    .index("by_uuid", ["uuid"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_featured", ["isFeatured"]),

  // 作品集表
  portfolios: defineTable({
    uuid: v.string(),
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    template: v.string(),
    theme: v.string(),
    customCss: v.optional(v.string()),
    customJs: v.optional(v.string()),
    domain: v.optional(v.string()),
    isPublished: v.boolean(),
    viewCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    publishedAt: v.optional(v.number()),
  })
    .index("by_uuid", ["uuid"])
    .index("by_user", ["userId"])
    .index("by_domain", ["domain"]),

  // 作品集作品关联表
  portfolioWorks: defineTable({
    portfolioId: v.id("portfolios"),
    workId: v.id("works"),
    sortOrder: v.number(),
    createdAt: v.number(),
  })
    .index("by_portfolio", ["portfolioId"])
    .index("by_work", ["workId"]),

  // 评论表
  comments: defineTable({
    uuid: v.string(),
    workId: v.id("works"),
    userId: v.optional(v.id("users")),
    guestName: v.optional(v.string()),
    guestEmail: v.optional(v.string()),
    content: v.string(),
    parentId: v.optional(v.id("comments")),
    isApproved: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_uuid", ["uuid"])
    .index("by_work", ["workId"])
    .index("by_user", ["userId"]),

  // 分析事件表
  analyticsEvents: defineTable({
    eventType: v.string(), // 'view' | 'like' | 'share'
    workId: v.optional(v.id("works")),
    portfolioId: v.optional(v.id("portfolios")),
    visitorId: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    referrer: v.optional(v.string()),
    pageUrl: v.optional(v.string()),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_work", ["workId"])
    .index("by_portfolio", ["portfolioId"])
    .index("by_event_type", ["eventType"]),

  // 分类表
  categories: defineTable({
    uuid: v.string(),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
    createdAt: v.number(),
  })
    .index("by_uuid", ["uuid"])
    .index("by_slug", ["slug"]),

  // 标签表
  tags: defineTable({
    uuid: v.string(),
    name: v.string(),
    slug: v.string(),
    createdAt: v.number(),
  })
    .index("by_uuid", ["uuid"])
    .index("by_slug", ["slug"]),

  // 作品标签关联表
  workTags: defineTable({
    workId: v.id("works"),
    tagId: v.id("tags"),
  })
    .index("by_work", ["workId"])
    .index("by_tag", ["tagId"]),
});

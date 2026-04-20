// 类型定义 - 匹配 Convex 数据库 schema

// 用户类型
export interface User {
  _id?: string
  uuid: string
  username: string
  phone?: string
  email: string
  displayName?: string
  avatarUrl?: string
  bio?: string
  occupation?: string
  location?: string
  facebook?: string
  twitter?: string
  linkedin?: string
  github?: string
  website?: string
  role: 'user' | 'admin'
  isVerified: boolean
  createdAt: number
  updatedAt: number
}

// 作品类型 - 匹配 Convex schema
export interface Work {
  _id?: string
  uuid: string
  userId: string
  title: string
  description?: string
  content?: string
  url?: string
  category?: string
  tags: string[]
  thumbnailType: 'gradient' | 'image'
  thumbnailData?: string
  coverUrl?: string
  source: 'link' | 'upload'
  sourceFile?: string
  fileType?: string
  fileSize?: number
  sortOrder: number
  isFeatured: boolean
  status: 'draft' | 'published'
  viewCount: number
  likes: number
  createdAt: number
  updatedAt: number
  publishedAt?: number
  // 前端展示用的额外字段
  user?: {
    id: string
    username: string
    avatarUrl?: string
  }
}

// 作品集类型
export interface Portfolio {
  _id?: string
  uuid: string
  userId: string
  title: string
  description?: string
  template: string
  theme: string
  customCss?: string
  customJs?: string
  domain?: string
  isPublished: boolean
  viewCount: number
  createdAt: number
  updatedAt: number
  publishedAt?: number
}

// 评论类型
export interface Comment {
  _id?: string
  uuid: string
  workId: string
  userId?: string
  guestName?: string
  guestEmail?: string
  content: string
  parentId?: string
  isApproved: boolean
  createdAt: number
}

// 分析事件类型
export interface AnalyticsEvent {
  _id?: string
  eventType: 'view' | 'like' | 'share'
  workId?: string
  portfolioId?: string
  visitorId?: string
  ipAddress?: string
  userAgent?: string
  referrer?: string
  pageUrl?: string
  metadata?: string
  createdAt: number
}

// 分类类型
export interface Category {
  _id?: string
  uuid: string
  name: string
  slug: string
  description?: string
  sortOrder: number
  createdAt: number
}

// 标签类型
export interface Tag {
  _id?: string
  uuid: string
  name: string
  slug: string
  createdAt: number
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 分页类型
export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// 分页响应类型
export interface PaginatedResponse<T> {
  data: T[]
  pagination: Pagination
}

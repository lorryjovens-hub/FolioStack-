# FolioStack 作品集网站数据库设计文档

## 1. 概述

### 1.1 文档目的
本文档详细描述了 FolioStack 作品集管理平台的数据库设计方案，包括表结构、字段定义、关系模型、索引设计和数据完整性约束，为开发团队提供完整的数据库架构参考。

### 1.2 技术选型
- **数据库类型**: PostgreSQL 14+
- **字符编码**: UTF-8
- **时区**: UTC+8
- **存储引擎**: 关系型数据库

### 1.3 设计原则
- **第三范式**: 确保数据完整性和减少冗余
- **一致性**: 统一的命名规范和数据类型
- **性能优化**: 合理的索引设计和查询优化
- **可扩展性**: 支持未来功能扩展
- **安全性**: 数据加密和访问控制

## 2. 实体关系图 (ER图)

```
[users] 1 ── * [works]
users.id ──── works.user_id

[users] 1 ── 1 [user_profiles]
users.id ──── user_profiles.user_id

[users] 1 ── * [login_history]
users.id ──── login_history.user_id

[roles] 1 ── * [users]
roles.id ──── users.role_id

[roles] * ── * [permissions]
role_permissions(role_id, permission_id)

[works] 1 ── * [work_media]
works.id ──── work_media.work_id

[works] 1 ── * [work_versions]
works.id ──── work_versions.work_id

[works] * ── * [categories]
work_categories(work_id, category_id)

[works] * ── * [tags]
work_tags(work_id, tag_id)

[works] 1 ── * [comments]
works.id ──── comments.work_id

[users] 1 ── * [comments]
users.id ──── comments.user_id

[comments] 1 ── * [comments]
comments.id ──── comments.parent_id (回复关系)

[comments] 1 ── * [comment_likes]
comments.id ──── comment_likes.comment_id

[users] 1 ── * [comment_likes]
users.id ──── comment_likes.user_id

[works] 1 ── * [access_logs]
works.id ──── access_logs.work_id

[users] 1 ── * [access_logs]
users.id ──── access_logs.user_id

[works] 1 ── * [work_analytics]
works.id ──── work_analytics.work_id

[notifications] 1 ── * [user_notifications]
notifications.id ──── user_notifications.notification_id

[users] 1 ── * [user_notifications]
users.id ──── user_notifications.user_id

[users] 1 ── * [search_history]
users.id ──── search_history.user_id

[users] 1 ── * [exports]
users.id ──── exports.user_id

[works] 1 ── * [exports]
works.id ──── exports.work_id

[users] 1 ── * [shares]
users.id ──── shares.user_id

[works] 1 ── * [shares]
works.id ──── shares.work_id
```

## 3. 表结构详细说明

### 3.1 用户管理模块

#### `users` - 用户基本信息表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 用户ID | ✅ |
| `uuid` | `VARCHAR(36)` | `UNIQUE NOT NULL` | 用户唯一标识 | ✅ |
| `username` | `VARCHAR(50)` | `UNIQUE NOT NULL` | 用户名 | ✅ |
| `email` | `VARCHAR(255)` | `UNIQUE NOT NULL` | 邮箱地址 | ✅ |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | 密码哈希 | ❌ |
| `role_id` | `INTEGER` | `REFERENCES roles(id)` | 角色ID | ✅ |
| `status` | `VARCHAR(20)` | `DEFAULT 'active'` | 用户状态 | ✅ |
| `last_login_at` | `TIMESTAMP` | `NULL` | 最后登录时间 | ❌ |
| `last_login_ip` | `VARCHAR(50)` | `NULL` | 最后登录IP | ❌ |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 | ✅ |
| `updated_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 更新时间 | ❌ |

#### `user_profiles` - 用户详细信息表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 资料ID | ✅ |
| `user_id` | `INTEGER` | `REFERENCES users(id) UNIQUE` | 用户ID | ✅ |
| `display_name` | `VARCHAR(100)` | `NULL` | 显示名称 | ❌ |
| `avatar_url` | `VARCHAR(500)` | `NULL` | 头像URL | ❌ |
| `bio` | `TEXT` | `NULL` | 个人简介 | ❌ |
| `website` | `VARCHAR(500)` | `NULL` | 个人网站 | ❌ |
| `location` | `VARCHAR(100)` | `NULL` | 所在位置 | ❌ |
| `phone` | `VARCHAR(20)` | `NULL` | 联系电话 | ❌ |
| `social_links` | `JSONB` | `NULL` | 社交媒体链接 | ❌ |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 | ❌ |
| `updated_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 更新时间 | ❌ |

#### `login_history` - 用户登录历史表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 记录ID | ✅ |
| `user_id` | `INTEGER` | `REFERENCES users(id)` | 用户ID | ✅ |
| `login_time` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 登录时间 | ❌ |
| `ip_address` | `VARCHAR(50)` | `NOT NULL` | IP地址 | ❌ |
| `user_agent` | `TEXT` | `NULL` | 用户代理 | ❌ |
| `login_status` | `VARCHAR(20)` | `NOT NULL` | 登录状态 | ❌ |

### 3.2 权限管理模块

#### `roles` - 角色表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 角色ID | ✅ |
| `name` | `VARCHAR(50)` | `UNIQUE NOT NULL` | 角色名称 | ❌ |
| `slug` | `VARCHAR(50)` | `UNIQUE NOT NULL` | 角色别名 | ✅ |
| `description` | `TEXT` | `NULL` | 角色描述 | ❌ |
| `is_default` | `BOOLEAN` | `DEFAULT FALSE` | 是否默认角色 | ❌ |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 | ❌ |

#### `permissions` - 权限表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 权限ID | ✅ |
| `name` | `VARCHAR(50)` | `UNIQUE NOT NULL` | 权限名称 | ❌ |
| `slug` | `VARCHAR(50)` | `UNIQUE NOT NULL` | 权限别名 | ✅ |
| `description` | `TEXT` | `NULL` | 权限描述 | ❌ |
| `category` | `VARCHAR(50)` | `NULL` | 权限分类 | ❌ |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 | ❌ |

#### `role_permissions` - 角色权限关联表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 关联ID | ✅ |
| `role_id` | `INTEGER` | `REFERENCES roles(id)` | 角色ID | ✅ |
| `permission_id` | `INTEGER` | `REFERENCES permissions(id)` | 权限ID | ✅ |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 | ❌ |

### 3.3 作品管理模块

#### `works` - 作品基本信息表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 作品ID | ✅ |
| `uuid` | `VARCHAR(36)` | `UNIQUE NOT NULL` | 作品唯一标识 | ✅ |
| `user_id` | `INTEGER` | `REFERENCES users(id)` | 用户ID | ✅ |
| `title` | `VARCHAR(200)` | `NOT NULL` | 作品标题 | ❌ |
| `description` | `TEXT` | `NULL` | 作品描述 | ❌ |
| `status` | `VARCHAR(20)` | `DEFAULT 'draft'` | 状态 | ✅ |
| `visibility` | `VARCHAR(20)` | `DEFAULT 'public'` | 可见性 | ❌ |
| `password` | `VARCHAR(255)` | `NULL` | 访问密码 | ❌ |
| `cover_image_url` | `VARCHAR(500)` | `NULL` | 封面图片 | ❌ |
| `view_count` | `INTEGER` | `DEFAULT 0` | 浏览次数 | ❌ |
| `like_count` | `INTEGER` | `DEFAULT 0` | 点赞次数 | ❌ |
| `comment_count` | `INTEGER` | `DEFAULT 0` | 评论次数 | ❌ |
| `sort_order` | `INTEGER` | `DEFAULT 0` | 排序顺序 | ✅ |
| `is_featured` | `BOOLEAN` | `DEFAULT FALSE` | 是否推荐 | ✅ |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 | ✅ |
| `updated_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 更新时间 | ❌ |
| `published_at` | `TIMESTAMP` | `NULL` | 发布时间 | ✅ |

#### `work_media` - 作品媒体资源表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 媒体ID | ✅ |
| `work_id` | `INTEGER` | `REFERENCES works(id)` | 作品ID | ✅ |
| `media_type` | `VARCHAR(20)` | `NOT NULL` | 媒体类型 | ❌ |
| `file_url` | `VARCHAR(500)` | `NOT NULL` | 文件URL | ❌ |
| `file_name` | `VARCHAR(255)` | `NOT NULL` | 文件名 | ❌ |
| `file_size` | `BIGINT` | `NOT NULL` | 文件大小 | ❌ |
| `mime_type` | `VARCHAR(100)` | `NOT NULL` | MIME类型 | ❌ |
| `thumbnail_url` | `VARCHAR(500)` | `NULL` | 缩略图URL | ❌ |
| `sort_order` | `INTEGER` | `DEFAULT 0` | 排序顺序 | ❌ |
| `is_primary` | `BOOLEAN` | `DEFAULT FALSE` | 是否主要媒体 | ❌ |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 | ❌ |

#### `work_versions` - 作品版本表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 版本ID | ✅ |
| `work_id` | `INTEGER` | `REFERENCES works(id)` | 作品ID | ✅ |
| `version_number` | `INTEGER` | `NOT NULL` | 版本号 | ❌ |
| `title` | `VARCHAR(200)` | `NOT NULL` | 版本标题 | ❌ |
| `description` | `TEXT` | `NULL` | 版本描述 | ❌ |
| `changes` | `TEXT` | `NULL` | 修改内容 | ❌ |
| `created_by` | `INTEGER` | `REFERENCES users(id)` | 创建者ID | ❌ |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 | ❌ |

### 3.4 分类管理模块

#### `categories` - 分类表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 分类ID | ✅ |
| `name` | `VARCHAR(100)` | `UNIQUE NOT NULL` | 分类名称 | ❌ |
| `slug` | `VARCHAR(100)` | `UNIQUE NOT NULL` | 分类别名 | ✅ |
| `description` | `TEXT` | `NULL` | 分类描述 | ❌ |
| `parent_id` | `INTEGER` | `REFERENCES categories(id)` | 父分类ID | ✅ |
| `icon` | `VARCHAR(100)` | `NULL` | 分类图标 | ❌ |
| `color` | `VARCHAR(20)` | `NULL` | 分类颜色 | ❌ |
| `sort_order` | `INTEGER` | `DEFAULT 0` | 排序顺序 | ❌ |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | 是否激活 | ✅ |
| `work_count` | `INTEGER` | `DEFAULT 0` | 作品数量 | ❌ |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 | ❌ |
| `updated_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 更新时间 | ❌ |

#### `work_categories` - 作品分类关联表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 关联ID | ✅ |
| `work_id` | `INTEGER` | `REFERENCES works(id)` | 作品ID | ✅ |
| `category_id` | `INTEGER` | `REFERENCES categories(id)` | 分类ID | ✅ |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 | ❌ |

#### `tags` - 标签表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 标签ID | ✅ |
| `name` | `VARCHAR(50)` | `UNIQUE NOT NULL` | 标签名称 | ❌ |
| `slug` | `VARCHAR(50)` | `UNIQUE NOT NULL` | 标签别名 | ✅ |
| `color` | `VARCHAR(20)` | `NULL` | 标签颜色 | ❌ |
| `work_count` | `INTEGER` | `DEFAULT 0` | 作品数量 | ❌ |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 | ❌ |

#### `work_tags` - 作品标签关联表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 关联ID | ✅ |
| `work_id` | `INTEGER` | `REFERENCES works(id)` | 作品ID | ✅ |
| `tag_id` | `INTEGER` | `REFERENCES tags(id)` | 标签ID | ✅ |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 | ❌ |

### 3.5 评论管理模块

#### `comments` - 评论表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 评论ID | ✅ |
| `work_id` | `INTEGER` | `REFERENCES works(id)` | 作品ID | ✅ |
| `user_id` | `INTEGER` | `REFERENCES users(id)` | 用户ID | ✅ |
| `parent_id` | `INTEGER` | `REFERENCES comments(id)` | 父评论ID | ✅ |
| `content` | `TEXT` | `NOT NULL` | 评论内容 | ❌ |
| `status` | `VARCHAR(20)` | `DEFAULT 'approved'` | 状态 | ✅ |
| `like_count` | `INTEGER` | `DEFAULT 0` | 点赞次数 | ❌ |
| `reply_count` | `INTEGER` | `DEFAULT 0` | 回复次数 | ❌ |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 | ✅ |
| `updated_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 更新时间 | ❌ |

#### `comment_likes` - 评论点赞表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 点赞ID | ✅ |
| `comment_id` | `INTEGER` | `REFERENCES comments(id)` | 评论ID | ✅ |
| `user_id` | `INTEGER` | `REFERENCES users(id)` | 用户ID | ✅ |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 | ❌ |

### 3.6 统计分析模块

#### `access_logs` - 访问日志表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 日志ID | ✅ |
| `work_id` | `INTEGER` | `REFERENCES works(id)` | 作品ID | ✅ |
| `user_id` | `INTEGER` | `REFERENCES users(id)` | 用户ID | ✅ |
| `session_id` | `VARCHAR(100)` | `NULL` | 会话ID | ✅ |
| `ip_address` | `VARCHAR(50)` | `NOT NULL` | IP地址 | ❌ |
| `user_agent` | `TEXT` | `NULL` | 用户代理 | ❌ |
| `referrer` | `VARCHAR(500)` | `NULL` | 来源网址 | ❌ |
| `view_duration` | `INTEGER` | `NULL` | 浏览时长(秒) | ❌ |
| `access_time` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 访问时间 | ✅ |

#### `analytics_daily` - 每日统计数据表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 统计ID | ✅ |
| `date` | `DATE` | `UNIQUE NOT NULL` | 统计日期 | ✅ |
| `total_visits` | `INTEGER` | `DEFAULT 0` | 总访问次数 | ❌ |
| `unique_visitors` | `INTEGER` | `DEFAULT 0` | 独立访客数 | ❌ |
| `total_pageviews` | `INTEGER` | `DEFAULT 0` | 总页面浏览数 | ❌ |
| `average_duration` | `INTEGER` | `DEFAULT 0` | 平均停留时长(秒) | ❌ |
| `bounce_rate` | `DECIMAL(5,2)` | `DEFAULT 0` | 跳出率 | ❌ |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 | ❌ |

#### `work_analytics` - 作品统计数据表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 统计ID | ✅ |
| `work_id` | `INTEGER` | `REFERENCES works(id)` | 作品ID | ✅ |
| `date` | `DATE` | `NOT NULL` | 统计日期 | ✅ |
| `view_count` | `INTEGER` | `DEFAULT 0` | 浏览次数 | ❌ |
| `like_count` | `INTEGER` | `DEFAULT 0` | 点赞次数 | ❌ |
| `comment_count` | `INTEGER` | `DEFAULT 0` | 评论次数 | ❌ |
| `share_count` | `INTEGER` | `DEFAULT 0` | 分享次数 | ❌ |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 | ❌ |

### 3.7 系统设置模块

#### `system_settings` - 系统配置表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 设置ID | ✅ |
| `key` | `VARCHAR(100)` | `UNIQUE NOT NULL` | 设置键名 | ✅ |
| `value` | `TEXT` | `NULL` | 设置值 | ❌ |
| `description` | `TEXT` | `NULL` | 设置描述 | ❌ |
| `type` | `VARCHAR(20)` | `DEFAULT 'string'` | 设置类型 | ❌ |
| `category` | `VARCHAR(50)` | `NULL` | 设置分类 | ❌ |
| `is_public` | `BOOLEAN` | `DEFAULT FALSE` | 是否公开 | ❌ |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 | ❌ |
| `updated_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 更新时间 | ❌ |

#### `media_settings` - 媒体设置表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 设置ID | ✅ |
| `max_file_size` | `BIGINT` | `DEFAULT 10485760` | 最大文件大小(10MB) | ❌ |
| `allowed_image_types` | `JSONB` | `NOT NULL` | 允许的图片类型 | ❌ |
| `allowed_video_types` | `JSONB` | `NOT NULL` | 允许的视频类型 | ❌ |
| `allowed_document_types` | `JSONB` | `NOT NULL` | 允许的文档类型 | ❌ |
| `image_quality` | `INTEGER` | `DEFAULT 85` | 图片压缩质量 | ❌ |
| `thumbnail_sizes` | `JSONB` | `NOT NULL` | 缩略图尺寸配置 | ❌ |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 | ❌ |
| `updated_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 更新时间 | ❌ |

### 3.8 通知消息模块

#### `notifications` - 通知模板表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 通知ID | ✅ |
| `type` | `VARCHAR(50)` | `NOT NULL` | 通知类型 | ❌ |
| `title` | `VARCHAR(200)` | `NOT NULL` | 通知标题 | ❌ |
| `content` | `TEXT` | `NOT NULL` | 通知内容 | ❌ |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | 是否激活 | ❌ |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 | ❌ |

#### `user_notifications` - 用户通知表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 用户通知ID | ✅ |
| `user_id` | `INTEGER` | `REFERENCES users(id)` | 用户ID | ✅ |
| `notification_id` | `INTEGER` | `REFERENCES notifications(id)` | 通知模板ID | ❌ |
| `title` | `VARCHAR(200)` | `NOT NULL` | 实际标题 | ❌ |
| `content` | `TEXT` | `NOT NULL` | 实际内容 | ❌ |
| `is_read` | `BOOLEAN` | `DEFAULT FALSE` | 是否已读 | ❌ |
| `is_deleted` | `BOOLEAN` | `DEFAULT FALSE` | 是否已删除 | ❌ |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 | ❌ |
| `read_at` | `TIMESTAMP` | `NULL` | 阅读时间 | ❌ |

### 3.9 搜索模块

#### `search_history` - 搜索历史表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 搜索ID | ✅ |
| `user_id` | `INTEGER` | `REFERENCES users(id)` | 用户ID | ✅ |
| `keyword` | `VARCHAR(200)` | `NOT NULL` | 搜索关键词 | ❌ |
| `results_count` | `INTEGER` | `DEFAULT 0` | 结果数量 | ❌ |
| `search_time` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 搜索时间 | ✅ |
| `ip_address` | `VARCHAR(50)` | `NOT NULL` | IP地址 | ❌ |

#### `search_suggestions` - 搜索建议表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 建议ID | ✅ |
| `keyword` | `VARCHAR(200)` | `UNIQUE NOT NULL` | 关键词 | ✅ |
| `search_count` | `INTEGER` | `DEFAULT 0` | 搜索次数 | ❌ |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | 是否激活 | ❌ |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 | ❌ |

### 3.10 导出分享模块

#### `exports` - 导出记录表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 导出ID | ✅ |
| `user_id` | `INTEGER` | `REFERENCES users(id)` | 用户ID | ✅ |
| `work_id` | `INTEGER` | `REFERENCES works(id)` | 作品ID | ✅ |
| `export_type` | `VARCHAR(50)` | `NOT NULL` | 导出类型 | ❌ |
| `template_id` | `INTEGER` | `NULL` | 模板ID | ❌ |
| `file_url` | `VARCHAR(500)` | `NULL` | 导出文件URL | ❌ |
| `status` | `VARCHAR(20)` | `DEFAULT 'pending'` | 状态 | ❌ |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 | ❌ |
| `completed_at` | `TIMESTAMP` | `NULL` | 完成时间 | ❌ |

#### `shares` - 分享记录表
| 字段名 | 数据类型 | 约束 | 描述 | 索引 |
|--------|----------|------|------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 分享ID | ✅ |
| `work_id` | `INTEGER` | `REFERENCES works(id)` | 作品ID | ✅ |
| `user_id` | `INTEGER` | `REFERENCES users(id)` | 用户ID | ✅ |
| `share_token` | `VARCHAR(100)` | `UNIQUE NOT NULL` | 分享令牌 | ✅ |
| `share_url` | `VARCHAR(500)` | `NOT NULL` | 分享URL | ❌ |
| `share_platform` | `VARCHAR(50)` | `NULL` | 分享平台 | ❌ |
| `access_count` | `INTEGER` | `DEFAULT 0` | 访问次数 | ❌ |
| `expires_at` | `TIMESTAMP` | `NULL` | 过期时间 | ❌ |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 | ❌ |

## 4. 数据完整性约束

### 4.1 主键约束
所有表都使用自增序列作为主键，确保唯一性和完整性。

### 4.2 外键约束
建立表之间的引用关系，确保数据一致性：
- 用户与角色的关联
- 作品与用户的关联
- 评论与作品和用户的关联
- 分类与作品的多对多关联
- 标签与作品的多对多关联

### 4.3 唯一约束
确保关键数据的唯一性：
- 用户邮箱和用户名
- 角色和权限的别名
- 分类和标签的别名
- UUID标识符

### 4.4 检查约束
通过业务逻辑实现数据验证：
- 密码强度验证
- 文件类型和大小限制
- 状态字段的有效值检查

### 4.5 默认值
为常用字段提供合理的默认值：
- 创建时间和更新时间
- 状态字段的默认状态
- 计数字段的初始值

## 5. 索引设计

### 5.1 主键索引
所有表的主键都自动创建索引，确保高效查询。

### 5.2 外键索引
为外键字段创建索引，优化关联查询性能：
- `users.role_id`
- `works.user_id`
- `comments.work_id` 和 `comments.user_id`

### 5.3 常用查询索引
为频繁查询的字段创建索引：
- `users.email` 和 `users.username` (登录查询)
- `works.status` 和 `works.visibility` (过滤查询)
- `works.created_at` 和 `works.published_at` (时间排序)
- `categories.slug` 和 `tags.slug` (URL查询)

### 5.4 复合索引
为复杂查询创建复合索引：
- `access_logs.work_id` + `access_logs.access_time`
- `work_analytics.work_id` + `work_analytics.date`

## 6. 安全考虑

### 6.1 数据加密
- 密码使用 bcrypt 算法加密存储
- 敏感信息使用加密字段存储

### 6.2 访问控制
- 基于角色的权限控制
- 细粒度的权限管理

### 6.3 SQL注入防护
- 使用参数化查询
- 输入数据验证和清洗

### 6.4 数据备份
- 定期数据库备份
- 事务支持确保数据一致性

## 7. 性能优化

### 7.1 查询优化
- 合理的索引设计
- 优化复杂查询语句
- 使用视图简化复杂查询

### 7.2 存储优化
- 合理的数据类型选择
- 避免不必要的冗余数据
- 使用JSONB存储复杂结构

### 7.3 缓存策略
- 热点数据缓存
- 查询结果缓存
- 系统设置缓存

## 8. 维护与扩展

### 8.1 数据库迁移
- 版本化的数据库结构
- 增量更新策略
- 回滚机制

### 8.2 监控与维护
- 数据库性能监控
- 定期索引重建
- 统计信息更新

### 8.3 扩展策略
- 水平扩展支持
- 分区表设计
- 读写分离

## 9. 初始化数据

### 9.1 角色数据
- 超级管理员 (superadmin)
- 管理员 (admin)
- 编辑 (editor)
- 普通用户 (user)

### 9.2 权限数据
- 用户管理
- 角色管理
- 权限管理
- 作品管理
- 分类管理
- 标签管理
- 评论管理
- 系统设置
- 数据统计
- 媒体管理
- 搜索管理
- 导出管理

### 9.3 系统设置
- 网站基本信息
- 功能开关配置
- 限制设置

## 10. 开发指南

### 10.1 连接配置
```javascript
const config = {
  host: 'dbconn.sealoshzh.site',
  port: 34665,
  user: 'postgres',
  password: '2sgshxc5',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
};
```

### 10.2 初始化脚本
- `database_tables.sql`: 创建表结构
- `database_indexes.sql`: 创建索引
- `database_data.sql`: 初始化数据
- `init_database_light.cjs`: 数据库初始化脚本

### 10.3 推荐工具
- PostgreSQL客户端: pgAdmin, DBeaver
- ORM框架: Sequelize, Prisma
- 迁移工具: db-migrate, sequelize-cli

## 11. 总结

本数据库设计方案提供了一个完整的作品集管理平台数据架构，包含32个数据表，覆盖了用户管理、作品管理、分类管理、评论管理、权限控制、数据统计等核心功能模块。设计遵循第三范式原则，确保数据完整性和一致性，同时通过合理的索引设计优化查询性能。

该设计具有良好的可扩展性和维护性，能够支持未来功能的扩展和业务需求的变化。通过完整的权限管理体系和安全机制，确保数据安全和访问控制。

开发团队可以基于此设计文档进行后端开发，实现完整的作品集管理平台功能。
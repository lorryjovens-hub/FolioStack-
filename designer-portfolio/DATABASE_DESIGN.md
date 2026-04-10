# 作品集网站数据库设计方案

## 数据库表结构设计

### 1. 用户管理相关表

#### `users` - 用户基本信息表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 用户ID |
| `uuid` | `VARCHAR(36)` | `UNIQUE NOT NULL` | 用户唯一标识 |
| `username` | `VARCHAR(50)` | `UNIQUE NOT NULL` | 用户名 |
| `email` | `VARCHAR(255)` | `UNIQUE NOT NULL` | 邮箱地址 |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | 密码哈希 |
| `role_id` | `INTEGER` | `REFERENCES roles(id)` | 角色ID |
| `status` | `VARCHAR(20)` | `DEFAULT 'active'` | 用户状态(active/inactive) |
| `last_login_at` | `TIMESTAMP` | `NULL` | 最后登录时间 |
| `last_login_ip` | `VARCHAR(50)` | `NULL` | 最后登录IP |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `updated_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 更新时间 |

#### `user_profiles` - 用户详细信息表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 资料ID |
| `user_id` | `INTEGER` | `REFERENCES users(id) UNIQUE` | 用户ID |
| `display_name` | `VARCHAR(100)` | `NULL` | 显示名称 |
| `avatar_url` | `VARCHAR(500)` | `NULL` | 头像URL |
| `bio` | `TEXT` | `NULL` | 个人简介 |
| `website` | `VARCHAR(500)` | `NULL` | 个人网站 |
| `location` | `VARCHAR(100)` | `NULL` | 所在位置 |
| `phone` | `VARCHAR(20)` | `NULL` | 联系电话 |
| `social_links` | `JSONB` | `NULL` | 社交媒体链接 |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `updated_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 更新时间 |

#### `login_history` - 用户登录历史表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 记录ID |
| `user_id` | `INTEGER` | `REFERENCES users(id)` | 用户ID |
| `login_time` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 登录时间 |
| `ip_address` | `VARCHAR(50)` | `NOT NULL` | IP地址 |
| `user_agent` | `TEXT` | `NULL` | 用户代理 |
| `login_status` | `VARCHAR(20)` | `NOT NULL` | 登录状态(success/failed) |

### 2. 作品管理相关表

#### `works` - 作品基本信息表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 作品ID |
| `uuid` | `VARCHAR(36)` | `UNIQUE NOT NULL` | 作品唯一标识 |
| `user_id` | `INTEGER` | `REFERENCES users(id)` | 用户ID |
| `title` | `VARCHAR(200)` | `NOT NULL` | 作品标题 |
| `description` | `TEXT` | `NULL` | 作品描述 |
| `status` | `VARCHAR(20)` | `DEFAULT 'draft'` | 状态(draft/published/archived) |
| `visibility` | `VARCHAR(20)` | `DEFAULT 'public'` | 可见性(public/private/password) |
| `password` | `VARCHAR(255)` | `NULL` | 访问密码 |
| `cover_image_url` | `VARCHAR(500)` | `NULL` | 封面图片 |
| `view_count` | `INTEGER` | `DEFAULT 0` | 浏览次数 |
| `like_count` | `INTEGER` | `DEFAULT 0` | 点赞次数 |
| `comment_count` | `INTEGER` | `DEFAULT 0` | 评论次数 |
| `sort_order` | `INTEGER` | `DEFAULT 0` | 排序顺序 |
| `is_featured` | `BOOLEAN` | `DEFAULT FALSE` | 是否推荐 |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `updated_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 更新时间 |
| `published_at` | `TIMESTAMP` | `NULL` | 发布时间 |

#### `work_media` - 作品媒体资源表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 媒体ID |
| `work_id` | `INTEGER` | `REFERENCES works(id)` | 作品ID |
| `media_type` | `VARCHAR(20)` | `NOT NULL` | 媒体类型(image/video/document) |
| `file_url` | `VARCHAR(500)` | `NOT NULL` | 文件URL |
| `file_name` | `VARCHAR(255)` | `NOT NULL` | 文件名 |
| `file_size` | `BIGINT` | `NOT NULL` | 文件大小(字节) |
| `mime_type` | `VARCHAR(100)` | `NOT NULL` | MIME类型 |
| `thumbnail_url` | `VARCHAR(500)` | `NULL` | 缩略图URL |
| `sort_order` | `INTEGER` | `DEFAULT 0` | 排序顺序 |
| `is_primary` | `BOOLEAN` | `DEFAULT FALSE` | 是否主要媒体 |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |

#### `work_versions` - 作品版本表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 版本ID |
| `work_id` | `INTEGER` | `REFERENCES works(id)` | 作品ID |
| `version_number` | `INTEGER` | `NOT NULL` | 版本号 |
| `title` | `VARCHAR(200)` | `NOT NULL` | 版本标题 |
| `description` | `TEXT` | `NULL` | 版本描述 |
| `changes` | `TEXT` | `NULL` | 修改内容 |
| `created_by` | `INTEGER` | `REFERENCES users(id)` | 创建者ID |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |

### 3. 分类管理相关表

#### `categories` - 分类表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 分类ID |
| `name` | `VARCHAR(100)` | `UNIQUE NOT NULL` | 分类名称 |
| `slug` | `VARCHAR(100)` | `UNIQUE NOT NULL` | 分类别名 |
| `description` | `TEXT` | `NULL` | 分类描述 |
| `parent_id` | `INTEGER` | `REFERENCES categories(id) NULL` | 父分类ID |
| `icon` | `VARCHAR(100)` | `NULL` | 分类图标 |
| `color` | `VARCHAR(20)` | `NULL` | 分类颜色 |
| `sort_order` | `INTEGER` | `DEFAULT 0` | 排序顺序 |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | 是否激活 |
| `work_count` | `INTEGER` | `DEFAULT 0` | 作品数量 |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `updated_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 更新时间 |

#### `work_categories` - 作品分类关联表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 关联ID |
| `work_id` | `INTEGER` | `REFERENCES works(id)` | 作品ID |
| `category_id` | `INTEGER` | `REFERENCES categories(id)` | 分类ID |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |

#### `tags` - 标签表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 标签ID |
| `name` | `VARCHAR(50)` | `UNIQUE NOT NULL` | 标签名称 |
| `slug` | `VARCHAR(50)` | `UNIQUE NOT NULL` | 标签别名 |
| `color` | `VARCHAR(20)` | `NULL` | 标签颜色 |
| `work_count` | `INTEGER` | `DEFAULT 0` | 作品数量 |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |

#### `work_tags` - 作品标签关联表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 关联ID |
| `work_id` | `INTEGER` | `REFERENCES works(id)` | 作品ID |
| `tag_id` | `INTEGER` | `REFERENCES tags(id)` | 标签ID |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |

### 4. 评论管理相关表

#### `comments` - 评论表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 评论ID |
| `work_id` | `INTEGER` | `REFERENCES works(id)` | 作品ID |
| `user_id` | `INTEGER` | `REFERENCES users(id)` | 用户ID |
| `parent_id` | `INTEGER` | `REFERENCES comments(id) NULL` | 父评论ID |
| `content` | `TEXT` | `NOT NULL` | 评论内容 |
| `status` | `VARCHAR(20)` | `DEFAULT 'approved'` | 状态(pending/approved/rejected) |
| `like_count` | `INTEGER` | `DEFAULT 0` | 点赞次数 |
| `reply_count` | `INTEGER` | `DEFAULT 0` | 回复次数 |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `updated_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 更新时间 |

#### `comment_likes` - 评论点赞表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 点赞ID |
| `comment_id` | `INTEGER` | `REFERENCES comments(id)` | 评论ID |
| `user_id` | `INTEGER` | `REFERENCES users(id)` | 用户ID |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |

### 5. 权限管理相关表

#### `roles` - 角色表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 角色ID |
| `name` | `VARCHAR(50)` | `UNIQUE NOT NULL` | 角色名称 |
| `slug` | `VARCHAR(50)` | `UNIQUE NOT NULL` | 角色别名 |
| `description` | `TEXT` | `NULL` | 角色描述 |
| `is_default` | `BOOLEAN` | `DEFAULT FALSE` | 是否默认角色 |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |

#### `permissions` - 权限表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 权限ID |
| `name` | `VARCHAR(50)` | `UNIQUE NOT NULL` | 权限名称 |
| `slug` | `VARCHAR(50)` | `UNIQUE NOT NULL` | 权限别名 |
| `description` | `TEXT` | `NULL` | 权限描述 |
| `category` | `VARCHAR(50)` | `NULL` | 权限分类 |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |

#### `role_permissions` - 角色权限关联表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 关联ID |
| `role_id` | `INTEGER` | `REFERENCES roles(id)` | 角色ID |
| `permission_id` | `INTEGER` | `REFERENCES permissions(id)` | 权限ID |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |

### 6. 统计分析相关表

#### `access_logs` - 访问日志表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 日志ID |
| `work_id` | `INTEGER` | `REFERENCES works(id)` | 作品ID |
| `user_id` | `INTEGER` | `REFERENCES users(id) NULL` | 用户ID |
| `session_id` | `VARCHAR(100)` | `NULL` | 会话ID |
| `ip_address` | `VARCHAR(50)` | `NOT NULL` | IP地址 |
| `user_agent` | `TEXT` | `NULL` | 用户代理 |
| `referrer` | `VARCHAR(500)` | `NULL` | 来源网址 |
| `view_duration` | `INTEGER` | `NULL` | 浏览时长(秒) |
| `access_time` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 访问时间 |

#### `analytics_daily` - 每日统计数据表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 统计ID |
| `date` | `DATE` | `UNIQUE NOT NULL` | 统计日期 |
| `total_visits` | `INTEGER` | `DEFAULT 0` | 总访问次数 |
| `unique_visitors` | `INTEGER` | `DEFAULT 0` | 独立访客数 |
| `total_pageviews` | `INTEGER` | `DEFAULT 0` | 总页面浏览数 |
| `average_duration` | `INTEGER` | `DEFAULT 0` | 平均停留时长(秒) |
| `bounce_rate` | `DECIMAL(5,2)` | `DEFAULT 0` | 跳出率 |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |

#### `work_analytics` - 作品统计数据表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 统计ID |
| `work_id` | `INTEGER` | `REFERENCES works(id)` | 作品ID |
| `date` | `DATE` | `NOT NULL` | 统计日期 |
| `view_count` | `INTEGER` | `DEFAULT 0` | 浏览次数 |
| `like_count` | `INTEGER` | `DEFAULT 0` | 点赞次数 |
| `comment_count` | `INTEGER` | `DEFAULT 0` | 评论次数 |
| `share_count` | `INTEGER` | `DEFAULT 0` | 分享次数 |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |

### 7. 系统设置相关表

#### `system_settings` - 系统配置表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 设置ID |
| `key` | `VARCHAR(100)` | `UNIQUE NOT NULL` | 设置键名 |
| `value` | `TEXT` | `NULL` | 设置值 |
| `description` | `TEXT` | `NULL` | 设置描述 |
| `type` | `VARCHAR(20)` | `DEFAULT 'string'` | 设置类型(string/number/boolean/json) |
| `category` | `VARCHAR(50)` | `NULL` | 设置分类 |
| `is_public` | `BOOLEAN` | `DEFAULT FALSE` | 是否公开 |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `updated_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 更新时间 |

#### `media_settings` - 媒体设置表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 设置ID |
| `max_file_size` | `BIGINT` | `DEFAULT 10485760` | 最大文件大小(10MB) |
| `allowed_image_types` | `JSONB` | `NOT NULL` | 允许的图片类型 |
| `allowed_video_types` | `JSONB` | `NOT NULL` | 允许的视频类型 |
| `allowed_document_types` | `JSONB` | `NOT NULL` | 允许的文档类型 |
| `image_quality` | `INTEGER` | `DEFAULT 85` | 图片压缩质量 |
| `thumbnail_sizes` | `JSONB` | `NOT NULL` | 缩略图尺寸配置 |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `updated_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 更新时间 |

### 8. 通知消息相关表

#### `notifications` - 通知模板表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 通知ID |
| `type` | `VARCHAR(50)` | `NOT NULL` | 通知类型 |
| `title` | `VARCHAR(200)` | `NOT NULL` | 通知标题 |
| `content` | `TEXT` | `NOT NULL` | 通知内容(支持模板) |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | 是否激活 |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |

#### `user_notifications` - 用户通知表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 用户通知ID |
| `user_id` | `INTEGER` | `REFERENCES users(id)` | 用户ID |
| `notification_id` | `INTEGER` | `REFERENCES notifications(id)` | 通知模板ID |
| `title` | `VARCHAR(200)` | `NOT NULL` | 实际标题 |
| `content` | `TEXT` | `NOT NULL` | 实际内容 |
| `is_read` | `BOOLEAN` | `DEFAULT FALSE` | 是否已读 |
| `is_deleted` | `BOOLEAN` | `DEFAULT FALSE` | 是否已删除 |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `read_at` | `TIMESTAMP` | `NULL` | 阅读时间 |

### 9. 搜索相关表

#### `search_history` - 搜索历史表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 搜索ID |
| `user_id` | `INTEGER` | `REFERENCES users(id) NULL` | 用户ID |
| `keyword` | `VARCHAR(200)` | `NOT NULL` | 搜索关键词 |
| `results_count` | `INTEGER` | `DEFAULT 0` | 结果数量 |
| `search_time` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 搜索时间 |
| `ip_address` | `VARCHAR(50)` | `NOT NULL` | IP地址 |

#### `search_suggestions` - 搜索建议表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 建议ID |
| `keyword` | `VARCHAR(200)` | `UNIQUE NOT NULL` | 关键词 |
| `search_count` | `INTEGER` | `DEFAULT 0` | 搜索次数 |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | 是否激活 |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |

### 10. 导出分享相关表

#### `exports` - 导出记录表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 导出ID |
| `user_id` | `INTEGER` | `REFERENCES users(id)` | 用户ID |
| `work_id` | `INTEGER` | `REFERENCES works(id) NULL` | 作品ID |
| `export_type` | `VARCHAR(50)` | `NOT NULL` | 导出类型(pdf/html/images) |
| `template_id` | `INTEGER` | `NULL` | 模板ID |
| `file_url` | `VARCHAR(500)` | `NULL` | 导出文件URL |
| `status` | `VARCHAR(20)` | `DEFAULT 'pending'` | 状态(pending/completed/failed) |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `completed_at` | `TIMESTAMP` | `NULL` | 完成时间 |

#### `shares` - 分享记录表
| 字段名 | 数据类型 | 约束条件 | 描述 |
|--------|----------|----------|------|
| `id` | `SERIAL` | `PRIMARY KEY` | 分享ID |
| `work_id` | `INTEGER` | `REFERENCES works(id)` | 作品ID |
| `user_id` | `INTEGER` | `REFERENCES users(id)` | 用户ID |
| `share_token` | `VARCHAR(100)` | `UNIQUE NOT NULL` | 分享令牌 |
| `share_url` | `VARCHAR(500)` | `NOT NULL` | 分享URL |
| `share_platform` | `VARCHAR(50)` | `NULL` | 分享平台 |
| `access_count` | `INTEGER` | `DEFAULT 0` | 访问次数 |
| `expires_at` | `TIMESTAMP` | `NULL` | 过期时间 |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |

## 数据库关系模型

### 主要实体关系

1. **用户与作品关系**：一对多
   - 一个用户可以创建多个作品
   - 一个作品只能属于一个用户

2. **作品与分类关系**：多对多
   - 一个作品可以属于多个分类
   - 一个分类可以包含多个作品

3. **作品与标签关系**：多对多
   - 一个作品可以有多个标签
   - 一个标签可以应用于多个作品

4. **作品与媒体关系**：一对多
   - 一个作品可以有多个媒体资源
   - 一个媒体资源只能属于一个作品

5. **作品与评论关系**：一对多
   - 一个作品可以有多个评论
   - 一个评论只能属于一个作品

6. **用户与角色关系**：多对一
   - 一个用户只能有一个角色
   - 一个角色可以分配给多个用户

7. **角色与权限关系**：多对多
   - 一个角色可以有多个权限
   - 一个权限可以分配给多个角色

8. **评论与回复关系**：一对多
   - 一个评论可以有多个回复
   - 一个回复只能有一个父评论

### 索引设计

#### 必要索引

1. **users表**
   - `idx_users_email` (email) - 登录查询
   - `idx_users_username` (username) - 用户名查询
   - `idx_users_role_id` (role_id) - 权限查询

2. **works表**
   - `idx_works_user_id` (user_id) - 用户作品查询
   - `idx_works_status` (status) - 状态过滤
   - `idx_works_created_at` (created_at) - 时间排序
   - `idx_works_category` (通过关联表)

3. **categories表**
   - `idx_categories_slug` (slug) - URL查询
   - `idx_categories_parent_id` (parent_id) - 层级查询

4. **comments表**
   - `idx_comments_work_id` (work_id) - 作品评论查询
   - `idx_comments_user_id` (user_id) - 用户评论查询
   - `idx_comments_parent_id` (parent_id) - 回复查询

5. **access_logs表**
   - `idx_access_logs_work_id` (work_id) - 作品访问统计
   - `idx_access_logs_access_time` (access_time) - 时间范围查询

6. **work_categories表**
   - `idx_work_categories_work_id` (work_id)
   - `idx_work_categories_category_id` (category_id)

7. **work_tags表**
   - `idx_work_tags_work_id` (work_id)
   - `idx_work_tags_tag_id` (tag_id)

## 数据完整性约束

1. **主键约束**：所有表都有自增主键
2. **外键约束**：建立表之间的引用关系
3. **唯一约束**：用户名、邮箱、UUID等唯一标识
4. **非空约束**：关键字段不能为空
5. **检查约束**：状态字段的有效值检查
6. **默认值**：合理的默认值设置

## 数据库安全考虑

1. **密码加密**：使用bcrypt加密存储密码
2. **SQL注入防护**：使用参数化查询
3. **权限控制**：基于角色的访问控制
4. **数据验证**：输入数据验证和清洗
5. **敏感信息保护**：敏感信息加密存储

## 数据库优化策略

1. **索引优化**：为频繁查询的字段创建索引
2. **分区表**：大型表考虑分区策略
3. **缓存策略**：热点数据缓存
4. **查询优化**：优化复杂查询语句
5. **定期维护**：统计信息更新和索引重建
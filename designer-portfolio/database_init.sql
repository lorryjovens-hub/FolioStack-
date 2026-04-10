-- 作品集网站数据库初始化脚本
-- PostgreSQL 版本

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 基础表（无外键依赖）
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id),
    icon VARCHAR(100),
    color VARCHAR(20),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    work_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    color VARCHAR(20),
    work_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    type VARCHAR(20) DEFAULT 'string',
    category VARCHAR(50),
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media_settings (
    id SERIAL PRIMARY KEY,
    max_file_size BIGINT DEFAULT 10485760,
    allowed_image_types JSONB NOT NULL DEFAULT '["image/jpeg", "image/png", "image/gif", "image/webp"]',
    allowed_video_types JSONB NOT NULL DEFAULT '["video/mp4", "video/webm", "video/ogg"]',
    allowed_document_types JSONB NOT NULL DEFAULT '["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]',
    image_quality INTEGER DEFAULT 85,
    thumbnail_sizes JSONB NOT NULL DEFAULT '{"small": {"width": 150, "height": 150}, "medium": {"width": 300, "height": 300}, "large": {"width": 600, "height": 600}}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 用户相关表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    status VARCHAR(20) DEFAULT 'active',
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    bio TEXT,
    website VARCHAR(500),
    location VARCHAR(100),
    phone VARCHAR(20),
    social_links JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS login_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50) NOT NULL,
    user_agent TEXT,
    login_status VARCHAR(20) NOT NULL
);

-- 3. 角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id),
    permission_id INTEGER REFERENCES permissions(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 作品相关表
CREATE TABLE IF NOT EXISTS works (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    visibility VARCHAR(20) DEFAULT 'public',
    password VARCHAR(255),
    cover_image_url VARCHAR(500),
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS work_media (
    id SERIAL PRIMARY KEY,
    work_id INTEGER REFERENCES works(id),
    media_type VARCHAR(20) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    thumbnail_url VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS work_versions (
    id SERIAL PRIMARY KEY,
    work_id INTEGER REFERENCES works(id),
    version_number INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    changes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 关联表
CREATE TABLE IF NOT EXISTS work_categories (
    id SERIAL PRIMARY KEY,
    work_id INTEGER REFERENCES works(id),
    category_id INTEGER REFERENCES categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS work_tags (
    id SERIAL PRIMARY KEY,
    work_id INTEGER REFERENCES works(id),
    tag_id INTEGER REFERENCES tags(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 评论相关表
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    work_id INTEGER REFERENCES works(id),
    user_id INTEGER REFERENCES users(id),
    parent_id INTEGER REFERENCES comments(id),
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'approved',
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comment_likes (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER REFERENCES comments(id),
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. 统计分析相关表
CREATE TABLE IF NOT EXISTS access_logs (
    id SERIAL PRIMARY KEY,
    work_id INTEGER REFERENCES works(id),
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(100),
    ip_address VARCHAR(50) NOT NULL,
    user_agent TEXT,
    referrer VARCHAR(500),
    view_duration INTEGER,
    access_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_daily (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    total_visits INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    total_pageviews INTEGER DEFAULT 0,
    average_duration INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS work_analytics (
    id SERIAL PRIMARY KEY,
    work_id INTEGER REFERENCES works(id),
    date DATE NOT NULL,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. 通知消息关联表
CREATE TABLE IF NOT EXISTS user_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    notification_id INTEGER REFERENCES notifications(id),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- 9. 搜索相关表
CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    keyword VARCHAR(200) NOT NULL,
    results_count INTEGER DEFAULT 0,
    search_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS search_suggestions (
    id SERIAL PRIMARY KEY,
    keyword VARCHAR(200) UNIQUE NOT NULL,
    search_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. 导出分享相关表
CREATE TABLE IF NOT EXISTS exports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    work_id INTEGER REFERENCES works(id),
    export_type VARCHAR(50) NOT NULL,
    template_id INTEGER,
    file_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shares (
    id SERIAL PRIMARY KEY,
    work_id INTEGER REFERENCES works(id),
    user_id INTEGER REFERENCES users(id),
    share_token VARCHAR(100) UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    share_url VARCHAR(500) NOT NULL,
    share_platform VARCHAR(50),
    access_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引（所有表创建完成后）
-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 作品表索引
CREATE INDEX IF NOT EXISTS idx_works_user_id ON works(user_id);
CREATE INDEX IF NOT EXISTS idx_works_status ON works(status);
CREATE INDEX IF NOT EXISTS idx_works_visibility ON works(visibility);
CREATE INDEX IF NOT EXISTS idx_works_created_at ON works(created_at);
CREATE INDEX IF NOT EXISTS idx_works_published_at ON works(published_at);
CREATE INDEX IF NOT EXISTS idx_works_sort_order ON works(sort_order);
CREATE INDEX IF NOT EXISTS idx_works_is_featured ON works(is_featured);

-- 分类表索引
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- 评论表索引
CREATE INDEX IF NOT EXISTS idx_comments_work_id ON comments(work_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- 访问日志索引
CREATE INDEX IF NOT EXISTS idx_access_logs_work_id ON access_logs(work_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_access_time ON access_logs(access_time);
CREATE INDEX IF NOT EXISTS idx_access_logs_session_id ON access_logs(session_id);

-- 关联表索引
CREATE INDEX IF NOT EXISTS idx_work_categories_work_id ON work_categories(work_id);
CREATE INDEX IF NOT EXISTS idx_work_categories_category_id ON work_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_work_tags_work_id ON work_tags(work_id);
CREATE INDEX IF NOT EXISTS idx_work_tags_tag_id ON work_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- 统计表索引
CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON analytics_daily(date);
CREATE INDEX IF NOT EXISTS idx_work_analytics_work_id ON work_analytics(work_id);
CREATE INDEX IF NOT EXISTS idx_work_analytics_date ON work_analytics(date);

-- 搜索表索引
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_search_time ON search_history(search_time);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_keyword ON search_suggestions(keyword);

-- 初始化基础数据
-- 插入角色数据
INSERT INTO roles (name, slug, description, is_default) VALUES
('超级管理员', 'superadmin', '拥有系统所有权限', FALSE),
('管理员', 'admin', '拥有管理权限', FALSE),
('编辑', 'editor', '拥有编辑权限', FALSE),
('普通用户', 'user', '普通用户权限', TRUE)
ON CONFLICT (slug) DO NOTHING;

-- 插入权限数据
INSERT INTO permissions (name, slug, description, category) VALUES
('用户管理', 'user_management', '管理用户', '用户管理'),
('角色管理', 'role_management', '管理角色', '权限管理'),
('权限管理', 'permission_management', '管理权限', '权限管理'),
('作品管理', 'work_management', '管理作品', '作品管理'),
('分类管理', 'category_management', '管理分类', '内容管理'),
('标签管理', 'tag_management', '管理标签', '内容管理'),
('评论管理', 'comment_management', '管理评论', '互动管理'),
('系统设置', 'system_settings', '系统设置', '系统管理'),
('数据统计', 'data_analytics', '数据统计', '数据分析'),
('媒体管理', 'media_management', '媒体管理', '内容管理'),
('搜索管理', 'search_management', '搜索管理', '功能管理'),
('导出管理', 'export_management', '导出管理', '功能管理')
ON CONFLICT (slug) DO NOTHING;

-- 为角色分配权限
-- 超级管理员拥有所有权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p
WHERE r.slug = 'superadmin'
ON CONFLICT DO NOTHING;

-- 管理员拥有大部分权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p
WHERE r.slug = 'admin' AND p.slug NOT IN ('permission_management', 'role_management')
ON CONFLICT DO NOTHING;

-- 编辑拥有内容管理权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p
WHERE r.slug = 'editor' AND p.slug IN ('work_management', 'category_management', 'tag_management', 'media_management')
ON CONFLICT DO NOTHING;

-- 初始化系统设置
INSERT INTO system_settings (key, value, description, type, category, is_public) VALUES
('site_name', 'FolioStack', '网站名称', 'string', '基本设置', TRUE),
('site_description', '专业作品集管理平台', '网站描述', 'string', '基本设置', TRUE),
('site_keywords', '作品集,设计,创意,展示', '网站关键词', 'string', '基本设置', TRUE),
('admin_email', 'admin@foliostack.com', '管理员邮箱', 'string', '系统设置', FALSE),
('max_work_count', '1000', '最大作品数量', 'number', '限制设置', FALSE),
('enable_comments', 'true', '启用评论功能', 'boolean', '功能设置', FALSE),
('enable_likes', 'true', '启用点赞功能', 'boolean', '功能设置', FALSE),
('enable_search', 'true', '启用搜索功能', 'boolean', '功能设置', FALSE)
ON CONFLICT (key) DO NOTHING;

-- 初始化媒体设置
INSERT INTO media_settings DEFAULT VALUES;
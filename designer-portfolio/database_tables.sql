-- 创建表结构（不含索引）
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
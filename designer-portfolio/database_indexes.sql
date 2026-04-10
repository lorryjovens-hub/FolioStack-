-- 创建索引
-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 作品表索引
CREATE INDEX IF NOT EXISTS idx_works_user_id ON works(user_id);
CREATE INDEX IF NOT EXISTS idx_works_status ON works(status);
CREATE INDEX IF NOT EXISTS idx_works_created_at ON works(created_at);
CREATE INDEX IF NOT EXISTS idx_works_sort_order ON works(sort_order);
CREATE INDEX IF NOT EXISTS idx_works_is_featured ON works(is_featured);
CREATE INDEX IF NOT EXISTS idx_works_category ON works(category);
CREATE INDEX IF NOT EXISTS idx_works_source ON works(source);

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
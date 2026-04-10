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
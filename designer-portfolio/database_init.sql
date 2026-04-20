-- FolioStack Database Initialization
-- This script runs when PostgreSQL container starts for the first time

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'banned');
CREATE TYPE audit_action AS ENUM (
  'CREATE', 'READ', 'UPDATE', 'DELETE',
  'LOGIN', 'LOGOUT',
  'CHANGE_PASSWORD', 'BIND_PHONE', 'BIND_EMAIL',
  'OAUTH_BIND', 'OAUTH_UNBIND',
  'CREATE_ROLE', 'UPDATE_ROLE', 'DELETE_ROLE',
  'ASSIGN_ROLES', 'INIT_PERMISSIONS',
  'UPLOAD_FILE', 'DELETE_FILE',
  'DEPLOY_PROJECT', 'UNDEPLOY_PROJECT'
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  nickname VARCHAR(100),
  bio TEXT,
  avatar_url VARCHAR(500),
  phone VARCHAR(20),
  phone_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  role VARCHAR(50) DEFAULT 'user',
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  nickname VARCHAR(100),
  bio TEXT,
  website VARCHAR(500),
  location VARCHAR(200),
  company VARCHAR(200),
  position VARCHAR(200),
  skills TEXT,
  social_links JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OAuth accounts table
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, provider_id)
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  marketing_emails BOOLEAN DEFAULT FALSE,
  security_alerts BOOLEAN DEFAULT TRUE,
  system_updates BOOLEAN DEFAULT TRUE,
  project_updates BOOLEAN DEFAULT TRUE,
  comment_notifications BOOLEAN DEFAULT TRUE,
  like_notifications BOOLEAN DEFAULT TRUE,
  follow_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  resource VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(module, action)
);

-- Role permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- User roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  PRIMARY KEY (user_id, role_id)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  module VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- Works table (for portfolio items)
CREATE TABLE IF NOT EXISTS works (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  content TEXT,
  cover_image VARCHAR(500),
  images JSONB,
  tags TEXT[],
  category VARCHAR(100),
  is_public BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords TEXT,
  seo_og_image VARCHAR(500),
  seo_custom_meta JSONB,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_works_user ON works(user_id);
CREATE INDEX IF NOT EXISTS idx_works_slug ON works(slug);
CREATE INDEX IF NOT EXISTS idx_works_public ON works(is_public);

-- Insert default system roles
INSERT INTO roles (name, display_name, description, is_system) VALUES
  ('super_admin', '超级管理员', '拥有系统所有权限', TRUE),
  ('admin', '管理员', '拥有大部分管理权限', TRUE),
  ('editor', '编辑', '可以编辑和管理内容', TRUE),
  ('user', '普通用户', '普通用户权限', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (name, display_name, module, action, description) VALUES
  -- User permissions
  ('user:create', '创建用户', 'USER', 'CREATE', '可以创建新用户'),
  ('user:read', '查看用户', 'USER', 'READ', '可以查看用户信息'),
  ('user:update', '更新用户', 'USER', 'UPDATE', '可以更新用户信息'),
  ('user:delete', '删除用户', 'USER', 'DELETE', '可以删除用户'),
  
  -- Role permissions
  ('role:create', '创建角色', 'ROLE', 'CREATE', '可以创建新角色'),
  ('role:read', '查看角色', 'ROLE', 'READ', '可以查看角色信息'),
  ('role:update', '更新角色', 'ROLE', 'UPDATE', '可以更新角色'),
  ('role:delete', '删除角色', 'ROLE', 'DELETE', '可以删除角色'),
  ('role:assign', '分配角色', 'ROLE', 'ASSIGN', '可以为用户分配角色'),
  
  -- Permission management
  ('permission:manage', '管理权限', 'PERMISSION', 'MANAGE', '管理系统权限'),
  
  -- Work permissions
  ('work:create', '创建作品', 'WORK', 'CREATE', '可以创建作品'),
  ('work:read', '查看作品', 'WORK', 'READ', '可以查看作品'),
  ('work:update', '更新作品', 'WORK', 'UPDATE', '可以更新作品'),
  ('work:delete', '删除作品', 'WORK', 'DELETE', '可以删除作品'),
  ('work:publish', '发布作品', 'WORK', 'PUBLISH', '可以发布/取消发布作品'),
  
  -- Audit permissions
  ('audit:read', '查看审计日志', 'AUDIT', 'READ', '可以查看审计日志'),
  
  -- System permissions
  ('system:config', '系统配置', 'SYSTEM', 'CONFIG', '可以修改系统配置'),
  ('analytics:view', '查看分析数据', 'ANALYTICS', 'VIEW', '可以查看数据分析')
ON CONFLICT (name) DO NOTHING;

-- Assign all permissions to super_admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- Assign basic admin permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name = 'admin' 
AND p.name IN (
  'user:create', 'user:read', 'user:update',
  'role:read', 'role:assign',
  'work:create', 'work:read', 'work:update', 'work:delete', 'work:publish',
  'audit:read', 'analytics:view'
)
ON CONFLICT DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_accounts_updated_at BEFORE UPDATE ON oauth_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_works_updated_at BEFORE UPDATE ON works
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Output completion message
DO $$
BEGIN
  RAISE NOTICE 'FolioStack database initialization completed successfully';
  RAISE NOTICE '- Created tables: users, user_profiles, oauth_accounts, refresh_tokens';
  RAISE NOTICE '- Created tables: notification_preferences, notifications';
  RAISE NOTICE '- Created tables: roles, permissions, role_permissions, user_roles';
  RAISE NOTICE '- Created table: audit_logs, works';
  RAISE NOTICE '- Inserted default roles and permissions';
END $$;
// 数据库初始化脚本
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// PostgreSQL 配置
const config = {
  host: 'dbconn.sealoshzh.site',
  port: 34665,
  user: 'postgres',
  password: '2sgshxc5',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

async function initializeDatabase() {
  console.log('=== 开始数据库初始化 ===');
  
  const pool = new Pool(config);
  
  try {
    // 测试连接
    console.log('测试数据库连接...');
    const client = await pool.connect();
    console.log('✓ 数据库连接成功');
    client.release();
    
    // 读取SQL脚本
    const sqlFile = path.join(__dirname, 'database_init.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // 执行SQL脚本
    console.log('执行数据库初始化脚本...');
    await pool.query(sqlContent);
    console.log('✓ 数据库初始化成功');
    
    // 验证表创建
    console.log('验证表结构...');
    const tables = [
      'users', 'user_profiles', 'roles', 'permissions', 'role_permissions',
      'works', 'work_media', 'work_versions', 'categories', 'work_categories',
      'tags', 'work_tags', 'comments', 'comment_likes', 'access_logs',
      'analytics_daily', 'work_analytics', 'system_settings', 'media_settings',
      'notifications', 'user_notifications', 'search_history', 'search_suggestions',
      'exports', 'shares', 'login_history'
    ];
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = $1
      `, [table]);
      
      if (result.rows.length > 0) {
        console.log(`✓ 表 ${table} 创建成功`);
      } else {
        console.log(`✗ 表 ${table} 创建失败`);
      }
    }
    
    // 验证索引创建
    console.log('\n验证索引...');
    const indexes = [
      'idx_users_email', 'idx_users_username', 'idx_works_user_id', 
      'idx_categories_slug', 'idx_comments_work_id'
    ];
    
    for (const index of indexes) {
      const result = await pool.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' AND indexname = $1
      `, [index]);
      
      if (result.rows.length > 0) {
        console.log(`✓ 索引 ${index} 创建成功`);
      } else {
        console.log(`✗ 索引 ${index} 创建失败`);
      }
    }
    
    // 验证数据初始化
    console.log('\n验证数据初始化...');
    
    // 检查角色数据
    const roles = await pool.query('SELECT COUNT(*) FROM roles');
    console.log(`✓ 角色数据: ${roles.rows[0].count} 条`);
    
    // 检查权限数据
    const permissions = await pool.query('SELECT COUNT(*) FROM permissions');
    console.log(`✓ 权限数据: ${permissions.rows[0].count} 条`);
    
    // 检查系统设置
    const settings = await pool.query('SELECT COUNT(*) FROM system_settings');
    console.log(`✓ 系统设置: ${settings.rows[0].count} 条`);
    
    console.log('\n=== 数据库初始化完成 ===');
    
  } catch (error) {
    console.error('数据库初始化失败:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// 执行初始化
if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('初始化失败:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
// 数据库清理和初始化脚本
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

async function cleanDatabase() {
  console.log('=== 开始清理数据库 ===');
  
  const pool = new Pool(config);
  
  try {
    const client = await pool.connect();
    
    // 获取所有表
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const tables = result.rows.map(row => row.table_name);
    console.log(`发现 ${tables.length} 个表`);
    
    if (tables.length > 0) {
      // 删除所有表（按依赖关系顺序）
      const dropOrder = [
        'user_notifications', 'exports', 'shares', 'search_history', 'search_suggestions',
        'comment_likes', 'comments', 'work_tags', 'work_categories', 'work_versions',
        'work_media', 'work_analytics', 'access_logs', 'login_history', 'user_profiles',
        'role_permissions', 'users', 'notifications', 'media_settings', 'system_settings',
        'analytics_daily', 'tags', 'categories', 'permissions', 'roles'
      ];
      
      for (const table of dropOrder) {
        if (tables.includes(table)) {
          try {
            await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
            console.log(`✓ 删除表 ${table}`);
          } catch (error) {
            console.log(`✗ 删除表 ${table} 失败: ${error.message}`);
          }
        }
      }
    }
    
    client.release();
    console.log('数据库清理完成');
    
  } catch (error) {
    console.error('清理数据库失败:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

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
    
    // 分步骤执行
    const steps = sqlContent.split(';').filter(step => step.trim());
    
    console.log(`执行 ${steps.length} 个SQL语句...`);
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i].trim();
      if (step) {
        try {
          await pool.query(step);
          console.log(`✓ 执行语句 ${i + 1}/${steps.length}`);
        } catch (error) {
          console.error(`✗ 执行语句 ${i + 1} 失败: ${error.message}`);
          console.error('SQL:', step.substring(0, 200) + '...');
          throw error;
        }
      }
    }
    
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

// 执行清理和初始化
if (require.main === module) {
  cleanDatabase()
    .then(initializeDatabase)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('初始化失败:', error);
      process.exit(1);
    });
}

module.exports = { cleanDatabase, initializeDatabase };
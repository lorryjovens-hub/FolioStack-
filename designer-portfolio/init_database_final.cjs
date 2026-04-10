// 分步骤数据库初始化脚本
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

async function executeSqlFile(filePath) {
  const pool = new Pool(config);
  
  try {
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    const statements = sqlContent.split(';').filter(statement => statement.trim());
    
    console.log(`执行文件: ${path.basename(filePath)} (${statements.length} 条语句)`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          await pool.query(statement);
          console.log(`  ✓ 执行语句 ${i + 1}/${statements.length}`);
        } catch (error) {
          console.error(`  ✗ 执行语句 ${i + 1} 失败: ${error.message}`);
          console.error('SQL:', statement.substring(0, 200) + '...');
          throw error;
        }
      }
    }
    
    return true;
    
  } catch (error) {
    console.error(`执行文件 ${filePath} 失败:`, error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function initializeDatabase() {
  console.log('=== 开始数据库初始化 ===');
  
  try {
    // 步骤1: 创建表结构
    console.log('\n步骤1: 创建表结构');
    await executeSqlFile(path.join(__dirname, 'database_tables.sql'));
    
    // 步骤2: 创建索引
    console.log('\n步骤2: 创建索引');
    await executeSqlFile(path.join(__dirname, 'database_indexes.sql'));
    
    // 步骤3: 初始化数据
    console.log('\n步骤3: 初始化数据');
    await executeSqlFile(path.join(__dirname, 'database_data.sql'));
    
    // 验证结果
    console.log('\n验证数据库初始化结果');
    
    const pool = new Pool(config);
    const client = await pool.connect();
    
    // 检查表数量
    const tablesResult = await client.query(`
      SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'
    `);
    console.log(`✓ 表数量: ${tablesResult.rows[0].count}`);
    
    // 检查角色数据
    const rolesResult = await client.query('SELECT COUNT(*) FROM roles');
    console.log(`✓ 角色数据: ${rolesResult.rows[0].count} 条`);
    
    // 检查权限数据
    const permissionsResult = await client.query('SELECT COUNT(*) FROM permissions');
    console.log(`✓ 权限数据: ${permissionsResult.rows[0].count} 条`);
    
    // 检查系统设置
    const settingsResult = await client.query('SELECT COUNT(*) FROM system_settings');
    console.log(`✓ 系统设置: ${settingsResult.rows[0].count} 条`);
    
    client.release();
    await pool.end();
    
    console.log('\n=== 数据库初始化完成 ===');
    
  } catch (error) {
    console.error('数据库初始化失败:', error.message);
    process.exit(1);
  }
}

// 执行初始化
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
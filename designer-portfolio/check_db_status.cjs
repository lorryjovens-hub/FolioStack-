// 检查数据库表状态
const { Pool } = require('pg');

// PostgreSQL 配置
const config = {
  host: 'dbconn.sealoshzh.site',
  port: 34665,
  user: 'postgres',
  password: '2sgshxc5',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
};

async function checkDatabase() {
  console.log('=== 检查数据库状态 ===');
  
  const pool = new Pool(config);
  
  try {
    const client = await pool.connect();
    
    // 检查所有表
    console.log('检查所有表:');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`共发现 ${tablesResult.rows.length} 个表:`);
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // 检查works表结构
    console.log('\n检查works表结构:');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'works'
      ORDER BY ordinal_position
    `);
    
    console.log('works表字段:');
    columnsResult.rows.forEach(row => {
      console.log(`  ${row.column_name} (${row.data_type}) - ${row.is_nullable === 'YES' ? '可空' : '必填'} ${row.column_default ? `默认: ${row.column_default}` : ''}`);
    });
    
    // 检查是否有visibility字段
    const hasVisibility = columnsResult.rows.some(row => row.column_name === 'visibility');
    console.log(`\nworks表是否包含visibility字段: ${hasVisibility ? '是' : '否'}`);
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('检查数据库失败:', error.message);
    throw error;
  }
}

// 执行检查
if (require.main === module) {
  checkDatabase().catch(console.error);
}

module.exports = { checkDatabase };
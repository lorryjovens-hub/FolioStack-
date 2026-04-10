
const { Pool } = require('pg');

async function updateDatabaseSchema() {
  try {
    const pool = new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'postgres',
      password: 'postgres',
      port: 5432,
    });

    const client = await pool.connect();
    
    console.log('开始更新数据库表结构...');
    
    // 添加缺失的字段
    const columnsToAdd = [
      'bio TEXT',
      'occupation TEXT',
      'location TEXT',
      'facebook TEXT',
      'twitter TEXT',
      'linkedin TEXT',
      'github TEXT'
    ];
    
    for (const columnDef of columnsToAdd) {
      try {
        await client.query(`ALTER TABLE users ADD COLUMN ${columnDef}`);
        console.log(`✓ 添加字段: ${columnDef}`);
      } catch (error) {
        if (error.code === '42701') {
          console.log(`⚠ 字段已存在: ${columnDef}`);
        } else {
          console.error(`✗ 添加字段失败: ${columnDef}`, error.message);
        }
      }
    }
    
    console.log('数据库表结构更新完成！');
    
    await client.release();
    await pool.end();
    
  } catch (error) {
    console.error('数据库连接失败:', error);
  }
}

updateDatabaseSchema();


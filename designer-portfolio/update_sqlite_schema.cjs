
const fs = require('fs');
const path = require('path');

// 检查数据库文件是否存在
const dbPath = path.join(__dirname, 'data', 'portfolio.db');
if (!fs.existsSync(dbPath)) {
  console.error('数据库文件不存在:', dbPath);
  process.exit(1);
}

// 使用sql.js来更新数据库
const initSqlJs = require('sql.js');

async function updateSQLiteSchema() {
  try {
    const SQL = await initSqlJs({
      locateFile: file => `https://sql.js.org/dist/${file}`
    });
    
    // 读取现有的数据库文件
    const data = fs.readFileSync(dbPath);
    const db = new SQL.Database(data);
    
    console.log('开始更新SQLite数据库表结构...');
    
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
        db.run(`ALTER TABLE users ADD COLUMN ${columnDef}`);
        console.log(`✓ 添加字段: ${columnDef}`);
      } catch (error) {
        console.log(`⚠ 字段已存在或添加失败: ${columnDef}`);
      }
    }
    
    // 导出更新后的数据库
    const updatedData = db.export();
    fs.writeFileSync(dbPath, updatedData);
    
    console.log('SQLite数据库表结构更新完成！');
    
  } catch (error) {
    console.error('更新数据库失败:', error);
  }
}

updateSQLiteSchema();


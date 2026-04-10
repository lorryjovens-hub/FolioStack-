const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const dbPath = path.join(__dirname, 'data', 'portfolio.db');
const dbBuffer = fs.readFileSync(dbPath);

async function checkDatabase() {
    const SQL = await initSqlJs();
    const db = new SQL.Database(dbBuffer);

    console.log('=== 数据库结构检查 ===');

    // 检查所有表
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
    if (tables.length > 0) {
        const tableNames = tables[0].values.map(row => row[0]);
        console.log('已创建的表:', tableNames);
    } else {
        console.log('没有找到表');
    }

    // 检查用户表结构
    console.log('\n=== 用户表结构 ===');
    const userSchema = db.exec("PRAGMA table_info(users)");
    if (userSchema.length > 0) {
        userSchema[0].values.forEach(col => {
            console.log(`${col[1]} (${col[2]}) ${col[3] ? 'NOT NULL' : ''} ${col[5] ? 'PRIMARY KEY' : ''}`);
        });
    } else {
        console.log('用户表不存在');
    }

    // 检查作品表结构
    console.log('\n=== 作品表结构 ===');
    const workSchema = db.exec("PRAGMA table_info(works)");
    if (workSchema.length > 0) {
        workSchema[0].values.forEach(col => {
            console.log(`${col[1]} (${col[2]}) ${col[3] ? 'NOT NULL' : ''} ${col[5] ? 'PRIMARY KEY' : ''}`);
        });
    } else {
        console.log('作品表不存在');
    }

    // 检查邮箱验证码表结构
    console.log('\n=== 邮箱验证码表结构 ===');
    const emailSchema = db.exec("PRAGMA table_info(email_codes)");
    if (emailSchema.length > 0) {
        emailSchema[0].values.forEach(col => {
            console.log(`${col[1]} (${col[2]}) ${col[3] ? 'NOT NULL' : ''} ${col[5] ? 'PRIMARY KEY' : ''}`);
        });
    } else {
        console.log('邮箱验证码表不存在');
    }

    // 检查数据统计
    console.log('\n=== 数据统计 ===');
    const userCount = db.exec("SELECT COUNT(*) as count FROM users");
    const workCount = db.exec("SELECT COUNT(*) as count FROM works");
    const emailCount = db.exec("SELECT COUNT(*) as count FROM email_codes");

    console.log(`用户数量: ${userCount.length > 0 ? userCount[0].values[0][0] : 0}`);
    console.log(`作品数量: ${workCount.length > 0 ? workCount[0].values[0][0] : 0}`);
    console.log(`验证码数量: ${emailCount.length > 0 ? emailCount[0].values[0][0] : 0}`);

    // 显示最近的用户
    console.log('\n=== 最近的用户 ===');
    const recentUsers = db.exec("SELECT id, username, email, created_at FROM users ORDER BY created_at DESC LIMIT 5");
    if (recentUsers.length > 0 && recentUsers[0].values.length > 0) {
        recentUsers[0].values.forEach(user => {
            console.log(`${user[0]}: ${user[1]} (${user[2]}) - ${user[3]}`);
        });
    } else {
        console.log('暂无用户数据');
    }

    db.close();
    console.log('\n数据库检查完成！');
}

checkDatabase().catch(console.error);
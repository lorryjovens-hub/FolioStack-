const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const dbPath = path.join(__dirname, 'data', 'portfolio.db');

async function importSampleData() {
    console.log('=== 开始导入示例数据 ===');
    
    const SQL = await initSqlJs();
    const dbBuffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
    const db = new SQL.Database(dbBuffer);

    // 导入示例用户数据
    console.log('\n导入示例用户...');
    const sampleUsers = [
        {
            username: 'demo_user',
            email: 'demo@example.com',
            password: 'password123',
            display_name: '演示用户',
            bio: '这是一个演示账户',
            role: 'user'
        },
        {
            username: 'test_designer',
            email: 'designer@example.com',
            password: 'designer123',
            display_name: '测试设计师',
            bio: '专注于UI/UX设计',
            role: 'user'
        }
    ];

    sampleUsers.forEach(user => {
        try {
            db.run(`
                INSERT INTO users (uuid, username, email, password_hash, display_name, bio, role, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `, [
                require('crypto').randomUUID(),
                user.username,
                user.email,
                require('bcryptjs').hashSync(user.password, 10),
                user.display_name,
                user.bio,
                user.role
            ]);
            console.log(`✓ 创建用户: ${user.username}`);
        } catch (err) {
            console.log(`✗ 用户 ${user.username} 已存在`);
        }
    });

    // 导入示例作品数据
    console.log('\n导入示例作品...');
    const sampleWorks = [
        {
            title: '品牌设计项目',
            description: '为科技公司设计的品牌形象系统，包含logo、名片、宣传册等',
            category: '品牌设计',
            tags: JSON.stringify(['品牌', 'logo', '视觉识别']),
            url: 'https://example.com/brand-design',
            is_featured: 1
        },
        {
            title: '移动应用UI设计',
            description: '健康管理类移动应用的界面设计，注重用户体验和交互',
            category: 'UI设计',
            tags: JSON.stringify(['移动应用', 'UI', '用户体验']),
            url: 'https://example.com/mobile-app',
            is_featured: 0
        },
        {
            title: '网站设计',
            description: '电商网站的响应式设计，提升用户购物体验',
            category: '网页设计',
            tags: JSON.stringify(['网站', '电商', '响应式']),
            url: 'https://example.com/website-design',
            is_featured: 1
        }
    ];

    // 获取第一个用户ID作为作品所属用户
    const userResult = db.exec("SELECT id FROM users LIMIT 1");
    if (userResult.length > 0 && userResult[0].values.length > 0) {
        const userId = userResult[0].values[0][0];
        
        sampleWorks.forEach((work, index) => {
            try {
                db.run(`
                    INSERT INTO works (uuid, user_id, title, description, url, category, tags, sort_order, is_featured, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                `, [
                    require('crypto').randomUUID(),
                    userId,
                    work.title,
                    work.description,
                    work.url,
                    work.category,
                    work.tags,
                    index,
                    work.is_featured
                ]);
                console.log(`✓ 创建作品: ${work.title}`);
            } catch (err) {
                console.log(`✗ 作品 ${work.title} 已存在`);
            }
        });
    }

    // 保存数据库
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
    
    console.log('\n=== 数据导入完成 ===');
    
    // 显示导入后的统计
    const userCount = db.exec("SELECT COUNT(*) as count FROM users")[0].values[0][0];
    const workCount = db.exec("SELECT COUNT(*) as count FROM works")[0].values[0][0];
    
    console.log(`当前用户数: ${userCount}`);
    console.log(`当前作品数: ${workCount}`);
    
    db.close();
}

importSampleData().catch(console.error);
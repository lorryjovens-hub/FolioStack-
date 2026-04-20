import { createClient } from '@libsql/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 数据库配置
const DB_PATH = join(__dirname, '..', 'data', 'portfolio.db');

// 确保数据目录存在
const dataDir = join(__dirname, '..', 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

let client = null;

// 初始化Turso客户端（本地SQLite模式）
export async function initTurso() {
  try {
    client = createClient({
      url: `file:${DB_PATH}`,
    });
    console.log('[Turso] 数据库连接成功:', DB_PATH);
    return client;
  } catch (err) {
    console.error('[Turso] 数据库连接失败:', err.message);
    throw err;
  }
}

// 获取客户端实例
export function getClient() {
  if (!client) {
    throw new Error('Turso客户端未初始化，请先调用initTurso()');
  }
  return client;
}

// 执行SQL（不返回结果）
export async function run(sql, params = []) {
  try {
    const result = await client.execute({ sql, args: params });
    return result;
  } catch (err) {
    console.error('[Turso] 执行SQL错误:', err.message, '| SQL:', sql);
    throw err;
  }
}

// 获取单行
export async function get(sql, params = []) {
  try {
    const result = await client.execute({ sql, args: params });
    return result.rows[0] || null;
  } catch (err) {
    console.error('[Turso] 获取单行错误:', err.message, '| SQL:', sql);
    throw err;
  }
}

// 获取多行
export async function all(sql, params = []) {
  try {
    const result = await client.execute({ sql, args: params });
    return result.rows || [];
  } catch (err) {
    console.error('[Turso] 获取多行错误:', err.message, '| SQL:', sql);
    throw err;
  }
}

// 初始化数据库表结构
export async function initDatabase() {
  try {
    // 用户表
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        phone TEXT UNIQUE,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        avatar_url TEXT,
        bio TEXT,
        occupation TEXT,
        location TEXT,
        facebook TEXT,
        twitter TEXT,
        linkedin TEXT,
        github TEXT,
        website TEXT,
        role TEXT DEFAULT 'user',
        is_verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 作品表
    await run(`
      CREATE TABLE IF NOT EXISTS works (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        content TEXT,
        url TEXT,
        category TEXT,
        tags TEXT,
        thumbnail_type TEXT DEFAULT 'gradient',
        thumbnail_data TEXT,
        cover_url TEXT,
        source TEXT DEFAULT 'link',
        source_file TEXT,
        file_type TEXT,
        file_size INTEGER,
        sort_order INTEGER DEFAULT 0,
        is_featured INTEGER DEFAULT 0,
        status TEXT DEFAULT 'draft',
        view_count INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        published_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 作品集表
    await run(`
      CREATE TABLE IF NOT EXISTS portfolios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        slug TEXT UNIQUE NOT NULL,
        theme TEXT DEFAULT 'default',
        config TEXT,
        is_public INTEGER DEFAULT 1,
        custom_domain TEXT,
        view_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 作品集作品关联表
    await run(`
      CREATE TABLE IF NOT EXISTS portfolio_works (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        portfolio_id INTEGER NOT NULL,
        work_id INTEGER NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
        FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
        UNIQUE(portfolio_id, work_id)
      )
    `);

    // 会话表
    await run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 验证码表
    await run(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        target TEXT NOT NULL,
        code TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 分类表
    await run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        parent_id INTEGER,
        icon TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
      )
    `);

    // 评论表
    await run(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        user_id INTEGER,
        work_id INTEGER NOT NULL,
        visitor_name TEXT,
        visitor_email TEXT,
        content TEXT NOT NULL,
        parent_id INTEGER,
        status TEXT DEFAULT 'pending',
        likes INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
      )
    `);

    // 分析数据表
    await run(`
      CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        user_id INTEGER,
        work_id INTEGER,
        portfolio_id INTEGER,
        event_type TEXT NOT NULL,
        event_data TEXT,
        page_url TEXT,
        referrer TEXT,
        user_agent TEXT,
        ip_address TEXT,
        country TEXT,
        city TEXT,
        screen_width INTEGER,
        screen_height INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE SET NULL,
        FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE SET NULL
      )
    `);

    // AI生成记录表
    await run(`
      CREATE TABLE IF NOT EXISTS ai_generations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        prompt TEXT NOT NULL,
        style TEXT,
        result TEXT,
        status TEXT DEFAULT 'pending',
        tokens_used INTEGER,
        cost REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 媒体文件表
    await run(`
      CREATE TABLE IF NOT EXISTS media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT,
        mime_type TEXT,
        file_size INTEGER,
        file_path TEXT NOT NULL,
        url TEXT,
        width INTEGER,
        height INTEGER,
        alt_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 创建索引
    await run(`CREATE INDEX IF NOT EXISTS idx_works_user_id ON works(user_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_works_category ON works(category)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_works_status ON works(status)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_works_featured ON works(is_featured)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_verification_target ON verification_codes(target, type)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_comments_work_id ON comments(work_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics(session_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_analytics_work ON analytics(work_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics(created_at)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_portfolios_user ON portfolios(user_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_portfolios_slug ON portfolios(slug)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_media_user ON media(user_id)`);

    console.log('[Turso] 数据库表结构初始化完成');

    // 插入默认分类
    await insertDefaultCategories();

  } catch (err) {
    console.error('[Turso] 初始化数据库错误:', err);
    throw err;
  }
}

// 插入默认分类
async function insertDefaultCategories() {
  const defaultCategories = [
    { uuid: 'cat-design', name: '设计', description: 'UI/UX设计、平面设计、品牌设计', icon: 'palette' },
    { uuid: 'cat-development', name: '开发', description: 'Web开发、移动应用、软件开发', icon: 'code' },
    { uuid: 'cat-photography', name: '摄影', description: '商业摄影、艺术摄影、人像摄影', icon: 'camera' },
    { uuid: 'cat-video', name: '视频', description: '视频制作、动画、影视后期', icon: 'video' },
    { uuid: 'cat-writing', name: '写作', description: '文案、博客、技术文档', icon: 'pen' },
    { uuid: 'cat-other', name: '其他', description: '其他类型作品', icon: 'folder' },
  ];

  for (const cat of defaultCategories) {
    const existing = await get('SELECT id FROM categories WHERE uuid = ?', [cat.uuid]);
    if (!existing) {
      await run(
        'INSERT INTO categories (uuid, name, description, icon) VALUES (?, ?, ?, ?)',
        [cat.uuid, cat.name, cat.description, cat.icon]
      );
    }
  }
  console.log('[Turso] 默认分类已初始化');
}

// 关闭数据库连接
export async function close() {
  if (client) {
    await client.close();
    console.log('[Turso] 数据库连接已关闭');
  }
}

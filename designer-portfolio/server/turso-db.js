import { createClient } from '@libsql/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 本地数据库路径
const DB_PATH = join(__dirname, '..', 'data', 'portfolio.db');

// 确保数据目录存在
const dataDir = join(__dirname, '..', 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

let client = null;
let isCloudMode = false;

// 初始化Turso客户端（优先使用云服务，回退到本地）
export async function initTurso() {
  try {
    // 首先尝试连接Turso云服务
    const cloudUrl = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (cloudUrl && authToken) {
      try {
        client = createClient({
          url: cloudUrl,
          authToken: authToken,
        });

        // 测试连接
        await client.execute('SELECT 1');
        isCloudMode = true;
        console.log('[Turso] 云服务数据库连接成功:', cloudUrl);
        return client;
      } catch (cloudErr) {
        console.warn('[Turso] 云服务连接失败，回退到本地模式:', cloudErr.message);
      }
    }

    // 回退到本地SQLite模式
    client = createClient({
      url: `file:${DB_PATH}`,
    });
    isCloudMode = false;
    console.log('[Turso] 本地数据库连接成功:', DB_PATH);
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

// 检查是否使用云服务
export function isCloudDatabase() {
  return isCloudMode;
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
    console.log('[Turso] 开始初始化数据库...');

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
        template TEXT DEFAULT 'default',
        theme TEXT DEFAULT 'dark',
        custom_css TEXT,
        custom_js TEXT,
        domain TEXT UNIQUE,
        is_published INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        published_at DATETIME,
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

    // 评论表
    await run(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        work_id INTEGER NOT NULL,
        user_id INTEGER,
        guest_name TEXT,
        guest_email TEXT,
        content TEXT NOT NULL,
        parent_id INTEGER,
        is_approved INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
      )
    `);

    // 分析事件表
    await run(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        work_id INTEGER,
        portfolio_id INTEGER,
        visitor_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        referrer TEXT,
        page_url TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE SET NULL,
        FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE SET NULL
      )
    `);

    // 分类表
    await run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 标签表
    await run(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 作品标签关联表
    await run(`
      CREATE TABLE IF NOT EXISTS work_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        work_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
        UNIQUE(work_id, tag_id)
      )
    `);

    console.log('[Turso] 数据库初始化完成');
    console.log('[Turso] 数据库模式:', isCloudMode ? '云服务' : '本地');
  } catch (err) {
    console.error('[Turso] 初始化数据库错误:', err);
    throw err;
  }
}

import pg from 'pg';
const { Pool } = pg;
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let pool = null;
let dbType = null;

const POSTGRES_CONFIG = {
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

const dataDir = join(__dirname, '..', 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}
const dbPath = join(dataDir, 'portfolio.db');

let sqliteDB = null;
let SQL = null;

async function tryPostgres() {
  // Skip PostgreSQL if environment variable is set
  if (process.env.SKIP_POSTGRES === 'true') {
    console.log('PostgreSQL skipped via SKIP_POSTGRES env var');
    return false;
  }

  const testPool = new Pool({
    ...POSTGRES_CONFIG,
    max: 1,
    connectionTimeoutMillis: 5000,
  });

  try {
    const client = await testPool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (err) {
    console.log('PostgreSQL unavailable:', err.message);
    await testPool.end().catch(() => {});
    return false;
  }
}

async function initPostgres() {
  pool = new Pool(POSTGRES_CONFIG);

  pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err.message);
  });

  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
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
        role TEXT DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS works (
        id SERIAL PRIMARY KEY,
        uuid TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        url TEXT,
        category TEXT,
        tags TEXT,
        thumbnail_type TEXT DEFAULT 'gradient',
        thumbnail_data TEXT,
        source TEXT DEFAULT 'link',
        source_file TEXT,
        sort_order INTEGER DEFAULT 0,
        is_featured INTEGER DEFAULT 0,
        status TEXT DEFAULT 'draft',
        view_count INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sms_codes (
        id SERIAL PRIMARY KEY,
        phone TEXT NOT NULL,
        code TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS email_codes (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        uuid TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        parent_id INTEGER,
        icon TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        uuid TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        work_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        parent_id INTEGER,
        status TEXT DEFAULT 'pending',
        likes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
      )
    `);

    await client.query('CREATE INDEX IF NOT EXISTS idx_works_user_id ON works(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_works_category ON works(category)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sms_phone ON sms_codes(phone)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_email_code ON email_codes(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_comments_work_id ON comments(work_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id)');

    console.log('[PostgreSQL] Database initialized');
  } finally {
    client.release();
  }

  dbType = 'postgres';
  return pool;
}

async function initSqlite() {
  SQL = await initSqlJs();
  let data = null;
  if (existsSync(dbPath)) {
    data = readFileSync(dbPath);
  }
  sqliteDB = new SQL.Database(data);

  sqliteDB.run(`
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
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  sqliteDB.run(`
    CREATE TABLE IF NOT EXISTS works (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      url TEXT,
      category TEXT,
      tags TEXT,
      thumbnail_type TEXT DEFAULT 'gradient',
      thumbnail_data TEXT,
      source TEXT DEFAULT 'link',
      source_file TEXT,
      sort_order INTEGER DEFAULT 0,
      is_featured INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      view_count INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  sqliteDB.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  sqliteDB.run(`
    CREATE TABLE IF NOT EXISTS sms_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  sqliteDB.run(`
      CREATE TABLE IF NOT EXISTS email_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    sqliteDB.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        parent_id INTEGER,
        icon TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
      )
    `);

    sqliteDB.run(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        work_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        parent_id INTEGER,
        status TEXT DEFAULT 'pending',
        likes INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
      )
    `);

  sqliteDB.run('CREATE INDEX IF NOT EXISTS idx_works_user_id ON works(user_id)');
  sqliteDB.run('CREATE INDEX IF NOT EXISTS idx_works_category ON works(category)');
  sqliteDB.run('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)');
  sqliteDB.run('CREATE INDEX IF NOT EXISTS idx_sms_phone ON sms_codes(phone)');
  sqliteDB.run('CREATE INDEX IF NOT EXISTS idx_email_code ON email_codes(email)');
  sqliteDB.run('CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id)');
  sqliteDB.run('CREATE INDEX IF NOT EXISTS idx_comments_work_id ON comments(work_id)');
  sqliteDB.run('CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id)');
  sqliteDB.run('CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id)');

  saveSQLite();

  dbType = 'sqlite';
  console.log('[SQLite] Database initialized at', dbPath);
  return sqliteDB;
}

function saveSQLite() {
  if (sqliteDB) {
    const data = sqliteDB.export();
    writeFileSync(dbPath, Buffer.from(data));
  }
}

async function run(sql, params = []) {
  if (dbType === 'postgres') {
    const client = await pool.connect();
    try {
      return await client.query(convertSQL(sql), convertParams(params));
    } finally {
      client.release();
    }
  } else {
    sqliteDB.run(sql, params);
    saveSQLite();
    return { rowCount: sqliteDB.getRowsModified() };
  }
}

async function get(sql, params = []) {
  if (dbType === 'postgres') {
    const client = await pool.connect();
    try {
      const result = await client.query(convertSQL(sql), convertParams(params));
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  } else {
    const stmt = sqliteDB.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  }
}

async function all(sql, params = []) {
  if (dbType === 'postgres') {
    const client = await pool.connect();
    try {
      const result = await client.query(convertSQL(sql), convertParams(params));
      return result.rows;
    } finally {
      client.release();
    }
  } else {
    const stmt = sqliteDB.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }
}

function convertSQL(sql) {
  let converted = sql;
  const paramMatches = sql.match(/\?/g);
  if (paramMatches) {
    let paramIndex = 1;
    for (let i = 0; i < paramMatches.length; i++) {
      converted = converted.replace(/\?/, `$${paramIndex++}`);
    }
  }
  converted = converted.replace(/datetime\("now"\)/g, "CURRENT_TIMESTAMP");
  return converted;
}

function convertParams(params) {
  return params || [];
}

function getType() {
  return dbType;
}

async function closeDB() {
  if (pool) {
    await pool.end();
    pool = null;
  }
  sqliteDB = null;
  SQL = null;
  dbType = null;
}

export async function initDB() {
  console.log('Attempting database connection...');

  // Force using SQLite for now
  console.log('Using SQLite database');
  await initSqlite();
  console.log(`Using SQLite database`);
}

export { run, get, all, closeDB, getType };

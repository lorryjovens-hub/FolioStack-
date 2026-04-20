import { Pool } from 'pg';
import pg from 'pg-promise';
import { createPool } from 'mysql2/promise';

class DatabasePool {
  constructor(options = {}) {
    this.type = options.type || process.env.DB_TYPE || 'postgres';
    this.pool = null;
    this.options = options;
    this.queryCount = 0;
    this.errorCount = 0;
  }

  async connect() {
    try {
      console.log(`[DB] Connecting to ${this.type} database...`);

      if (this.type === 'postgres') {
        this.pool = new Pool({
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT) || 5432,
          database: process.env.DB_NAME || 'foliostack',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
          ...this.options
        });

        this.pool.on('error', (err) => {
          console.error('[DB] Pool error:', err);
          this.errorCount++;
        });

        this.pool.on('connect', () => {
          console.log('[DB] New connection established');
        });

      } else if (this.type === 'mysql') {
        this.pool = createPool({
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT) || 3306,
          database: process.env.DB_NAME || 'foliostack',
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || 'password',
          connectionLimit: 20,
          waitForConnections: true,
          queueLimit: 0,
          ...this.options
        });
      }

      await this.testConnection();
      console.log('[DB] Connected successfully');
      return this;
    } catch (error) {
      console.error('[DB] Connection failed:', error);
      throw error;
    }
  }

  async testConnection() {
    const client = await this.pool.connect();
    try {
      if (this.type === 'postgres') {
        await client.query('SELECT NOW()');
      } else {
        await client.query('SELECT 1');
      }
    } finally {
      client.release();
    }
  }

  async query(text, params = []) {
    const start = Date.now();
    this.queryCount++;

    try {
      let result;
      
      if (this.type === 'postgres') {
        result = await this.pool.query(text, params);
      } else {
        result = await this.pool.execute(text, params);
      }

      const duration = Date.now() - start;
      console.log(`[DB] Query executed (${duration}ms):`, { text, rows: result?.rows?.length || 0 });
      
      return result;
    } catch (error) {
      this.errorCount++;
      console.error('[DB] Query error:', { text, error: error.message });
      throw error;
    }
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    
    try {
      if (this.type === 'postgres') {
        await client.query('BEGIN');
      } else {
        await client.query('START TRANSACTION');
      }

      const result = await callback(client);

      if (this.type === 'postgres') {
        await client.query('COMMIT');
      } else {
        await client.query('COMMIT');
      }

      return result;
    } catch (error) {
      if (this.type === 'postgres') {
        await client.query('ROLLBACK');
      } else {
        await client.query('ROLLBACK');
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async getClient() {
    return await this.pool.connect();
  }

  getStats() {
    if (this.type === 'postgres') {
      return {
        type: this.type,
        totalCount: this.queryCount,
        errorCount: this.errorCount,
        idleCount: this.pool.idleCount,
        totalCount: this.pool.totalCount,
        waitingCount: this.pool.waitingCount
      };
    }
    return {
      type: this.type,
      totalCount: this.queryCount,
      errorCount: this.errorCount
    };
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('[DB] Pool closed');
    }
  }
}

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.wheres = [];
    this.orderBys = [];
    this.limitValue = null;
    this.offsetValue = null;
    this.selects = ['*'];
  }

  static table(table) {
    return new QueryBuilder(table);
  }

  select(...columns) {
    this.selects = columns;
    return this;
  }

  where(column, operator, value) {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }
    this.wheres.push({ column, operator, value });
    return this;
  }

  whereIn(column, values) {
    this.wheres.push({ column, operator: 'IN', value: values });
    return this;
  }

  orderBy(column, direction = 'ASC') {
    this.orderBys.push({ column, direction });
    return this;
  }

  limit(count) {
    this.limitValue = count;
    return this;
  }

  offset(count) {
    this.offsetValue = count;
    return this;
  }

  build() {
    let query = `SELECT ${this.selects.join(', ')} FROM ${this.table}`;
    const params = [];
    let paramIndex = 1;

    if (this.wheres.length > 0) {
      query += ' WHERE ';
      const whereClauses = this.wheres.map((w) => {
        if (w.operator === 'IN') {
          const placeholders = w.value.map((_, i) => `$${paramIndex + i}`).join(', ');
          params.push(...w.value);
          paramIndex += w.value.length;
          return `${w.column} IN (${placeholders})`;
        }
        params.push(w.value);
        return `${w.column} ${w.operator} $${paramIndex++}`;
      });
      query += whereClauses.join(' AND ');
    }

    if (this.orderBys.length > 0) {
      query += ' ORDER BY ';
      query += this.orderBys.map(o => `${o.column} ${o.direction}`).join(', ');
    }

    if (this.limitValue !== null) {
      query += ` LIMIT ${this.limitValue}`;
    }

    if (this.offsetValue !== null) {
      query += ` OFFSET ${this.offsetValue}`;
    }

    return { query, params };
  }
}

class Repository {
  constructor(table, db) {
    this.table = table;
    this.db = db;
  }

  async findById(id) {
    const result = await this.db.query(
      `SELECT * FROM ${this.table} WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findAll(options = {}) {
    const qb = QueryBuilder.table(this.table);
    
    if (options.where) {
      Object.entries(options.where).forEach(([k, v]) => qb.where(k, v));
    }
    
    if (options.orderBy) {
      const [col, dir] = options.orderBy.split(' ');
      qb.orderBy(col, dir || 'ASC');
    }
    
    if (options.limit) qb.limit(options.limit);
    if (options.offset) qb.offset(options.offset);

    const { query, params } = qb.build();
    const result = await this.db.query(query, params);
    return result.rows;
  }

  async findOne(options = {}) {
    const results = await this.findAll({ ...options, limit: 1 });
    return results[0] || null;
  }

  async create(data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`);

    const result = await this.db.query(
      `INSERT INTO ${this.table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async update(id, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');

    const result = await this.db.query(
      `UPDATE ${this.table} SET ${setClause} WHERE id = $${columns.length + 1} RETURNING *`,
      [...values, id]
    );
    return result.rows[0] || null;
  }

  async delete(id) {
    const result = await this.db.query(
      `DELETE FROM ${this.table} WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows.length > 0;
  }

  async count(options = {}) {
    const qb = QueryBuilder.table(this.table).select('COUNT(*) as count');
    
    if (options.where) {
      Object.entries(options.where).forEach(([k, v]) => qb.where(k, v));
    }

    const { query, params } = qb.build();
    const result = await this.db.query(query, params);
    return parseInt(result.rows[0].count);
  }
}

export { DatabasePool, QueryBuilder, Repository };
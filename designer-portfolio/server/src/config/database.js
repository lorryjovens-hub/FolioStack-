const { Sequelize } = require('sequelize');
const config = require('./index');
const path = require('path');

// Railway 提供 DATABASE_URL 环境变量
const databaseUrl = process.env.DATABASE_URL;

let sequelize;

if (databaseUrl) {
  // 使用 Railway 提供的 DATABASE_URL
  sequelize = new Sequelize(databaseUrl, {
    logging: config.isDevelopment ? (msg) => console.log(msg) : false,
    pool: {
      max: config.db.pool.max,
      min: config.db.pool.min,
      acquire: config.db.pool.acquire,
      idle: config.db.pool.idle,
    },
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    dialectOptions: {
      ssl: config.isProduction ? {
        require: true,
        rejectUnauthorized: false,
      } : false,
    },
  });
} else {
  // 使用SQLite作为本地开发环境的数据库
  const dbPath = path.resolve(__dirname, '../../foliostack.db');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: config.isDevelopment ? (msg) => console.log(msg) : false,
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  });
}

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
    return false;
  }
}

async function syncDatabase(options = {}) {
  try {
    await sequelize.sync(options);
    console.log('Database synchronized successfully.');
    return true;
  } catch (error) {
    console.error('Error synchronizing database:', error.message);
    return false;
  }
}

module.exports = {
  sequelize,
  Sequelize,
  testConnection,
  syncDatabase,
};

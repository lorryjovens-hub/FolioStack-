const { Sequelize } = require('sequelize');
const config = require('./index');

const sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  dialect: 'postgres',
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

const Redis = require('ioredis');
const config = require('./index');
const logger = require('./logger');

let redisClient = null;

function createRedisClient(options = {}) {
  // Railway 提供 REDIS_URL 环境变量
  const redisUrl = process.env.REDIS_URL;
  
  let redisConfig;
  
  if (redisUrl) {
    // 使用 Railway 提供的 REDIS_URL
    redisConfig = {
      url: redisUrl,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      showFriendlyErrorStack: config.isDevelopment,
      ...options,
    };
  } else {
    // 传统配置
    redisConfig = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      db: config.redis.db,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      showFriendlyErrorStack: config.isDevelopment,
      ...options,
    };
  }

  const client = new Redis(redisConfig);

  client.on('connect', () => {
    logger.info('Redis client connected');
  });

  client.on('ready', () => {
    logger.info('Redis client ready');
  });

  client.on('error', (err) => {
    logger.error('Redis client error:', err);
  });

  client.on('close', () => {
    logger.warn('Redis client connection closed');
  });

  client.on('reconnecting', () => {
    logger.info('Redis client reconnecting');
  });

  return client;
}

function getRedisClient() {
  if (!redisClient) {
    // 在开发环境中，返回一个模拟的Redis客户端，避免连接错误
    if (config.isDevelopment) {
      redisClient = {
        connect: async () => Promise.resolve(),
        quit: async () => Promise.resolve(),
        ping: async () => Promise.resolve('PONG'),
        setex: async () => Promise.resolve(),
        get: async () => Promise.resolve(null),
        del: async () => Promise.resolve(),
        on: () => {},
      };
    } else {
      redisClient = createRedisClient();
    }
  }
  return redisClient;
}

async function connectRedis() {
  const client = getRedisClient();
  try {
    await client.connect();
    return true;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    return false;
  }
}

async function disconnectRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis client disconnected');
  }
}

async function testRedisConnection() {
  const client = getRedisClient();
  try {
    const result = await client.ping();
    logger.info('Redis connection test:', result);
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis connection test failed:', error);
    return false;
  }
}

module.exports = {
  createRedisClient,
  getRedisClient,
  connectRedis,
  disconnectRedis,
  testRedisConnection,
};

import { createClient } from 'redis';

class CacheManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.retryAttempts = 0;
    this.maxRetries = 5;
  }

  async connect() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > this.maxRetries) {
            console.error('[Redis] Max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          console.log(`[Redis] Reconnecting... Attempt ${retries}`);
          return Math.min(retries * 100, 3000);
        }
      }
    });

    this.client.on('connect', () => {
      console.log('[Redis] Connecting...');
    });

    this.client.on('ready', () => {
      console.log('[Redis] Connected successfully');
      this.isConnected = true;
      this.retryAttempts = 0;
    });

    this.client.on('error', (err) => {
      console.error('[Redis] Error:', err.message);
      this.isConnected = false;
    });

    this.client.on('end', () => {
      console.log('[Redis] Connection ended');
      this.isConnected = false;
    });

    try {
      await this.client.connect();
    } catch (error) {
      console.error('[Redis] Connection failed:', error.message);
      throw error;
    }
  }

  async get(key) {
    if (!this.isConnected) {
      console.warn('[Redis] Not connected, skipping cache get');
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value) {
        console.log(`[Redis] Cache hit for key: ${key}`);
        return JSON.parse(value);
      }
      console.log(`[Redis] Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      console.error('[Redis] Get error:', error.message);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    if (!this.isConnected) {
      console.warn('[Redis] Not connected, skipping cache set');
      return false;
    }

    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      console.log(`[Redis] Set cache for key: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      console.error('[Redis] Set error:', error.message);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected) {
      console.warn('[Redis] Not connected, skipping cache delete');
      return false;
    }

    try {
      await this.client.del(key);
      console.log(`[Redis] Deleted cache for key: ${key}`);
      return true;
    } catch (error) {
      console.error('[Redis] Delete error:', error.message);
      return false;
    }
  }

  async flush() {
    if (!this.isConnected) {
      console.warn('[Redis] Not connected, skipping cache flush');
      return false;
    }

    try {
      await this.client.flushAll();
      console.log('[Redis] Cache flushed');
      return true;
    } catch (error) {
      console.error('[Redis] Flush error:', error.message);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      console.log('[Redis] Disconnected');
    }
  }

  // 缓存装饰器
  cache(ttl = 3600) {
    return (target, propertyKey, descriptor) => {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args) {
        const cacheKey = `${propertyKey}:${JSON.stringify(args)}`;
        
        // 尝试从缓存获取
        const cached = await cacheManager.get(cacheKey);
        if (cached !== null) {
          return cached;
        }
        
        // 执行原方法
        const result = await originalMethod.apply(this, args);
        
        // 存入缓存
        await cacheManager.set(cacheKey, result, ttl);
        
        return result;
      };
      
      return descriptor;
    };
  }
}

const cacheManager = new CacheManager();

export { cacheManager, CacheManager };
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

let client = null;

// 初始化Turso云服务客户端
export async function initTursoCloud() {
  try {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
      console.warn('[Turso Cloud] 未配置云服务参数，回退到本地模式');
      return null;
    }

    client = createClient({
      url,
      authToken,
    });

    // 测试连接
    await client.execute('SELECT 1');
    console.log('[Turso Cloud] 云服务数据库连接成功');
    return client;
  } catch (err) {
    console.error('[Turso Cloud] 云服务连接失败:', err.message);
    console.log('[Turso Cloud] 将使用本地数据库作为备用');
    return null;
  }
}

// 获取客户端实例
export function getCloudClient() {
  if (!client) {
    throw new Error('Turso Cloud客户端未初始化');
  }
  return client;
}

// 执行SQL（不返回结果）
export async function runCloud(sql, params = []) {
  try {
    const result = await client.execute({ sql, args: params });
    return result;
  } catch (err) {
    console.error('[Turso Cloud] 执行SQL错误:', err.message);
    throw err;
  }
}

// 获取单行
export async function getCloud(sql, params = []) {
  try {
    const result = await client.execute({ sql, args: params });
    return result.rows[0] || null;
  } catch (err) {
    console.error('[Turso Cloud] 获取单行错误:', err.message);
    throw err;
  }
}

// 获取多行
export async function allCloud(sql, params = []) {
  try {
    const result = await client.execute({ sql, args: params });
    return result.rows || [];
  } catch (err) {
    console.error('[Turso Cloud] 获取多行错误:', err.message);
    throw err;
  }
}

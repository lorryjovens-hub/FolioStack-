// Convex 客户端配置
import { ConvexClient } from 'convex/browser';

// Convex 部署URL
const CONVEX_URL = 'https://fearless-ferret-291.convex.cloud';

// 创建Convex客户端实例
export const convex = new ConvexClient(CONVEX_URL);

// 用户API
export const userApi = {
  // 获取所有用户
  list: () => convex.query('users:list'),
  
  // 根据ID获取用户
  get: (id) => convex.query('users:get', { id }),
  
  // 根据UUID获取用户
  getByUuid: (uuid) => convex.query('users:getByUuid', { uuid }),
  
  // 根据邮箱获取用户
  getByEmail: (email) => convex.query('users:getByEmail', { email }),
  
  // 创建用户
  create: (data) => convex.mutation('users:create', data),
  
  // 更新用户
  update: (id, data) => convex.mutation('users:update', { id, ...data }),
  
  // 删除用户
  remove: (id) => convex.mutation('users:remove', { id }),
};

// 作品API
export const workApi = {
  // 获取所有作品
  list: () => convex.query('works:list'),
  
  // 获取已发布作品
  listPublished: () => convex.query('works:listPublished'),
  
  // 根据ID获取作品
  get: (id) => convex.query('works:get', { id }),
  
  // 根据UUID获取作品
  getByUuid: (uuid) => convex.query('works:getByUuid', { uuid }),
  
  // 获取用户的作品
  getByUser: (userId) => convex.query('works:getByUser', { userId }),
  
  // 获取精选作品
  getFeatured: () => convex.query('works:getFeatured'),
  
  // 创建作品
  create: (data) => convex.mutation('works:create', data),
  
  // 更新作品
  update: (id, data) => convex.mutation('works:update', { id, ...data }),
  
  // 删除作品
  remove: (id) => convex.mutation('works:remove', { id }),
  
  // 增加浏览量
  incrementViews: (id) => convex.mutation('works:incrementViews', { id }),
  
  // 增加点赞
  incrementLikes: (id) => convex.mutation('works:incrementLikes', { id }),
};

// 认证API
export const authApi = {
  // 注册
  register: (data) => convex.mutation('auth:register', data),
  
  // 登录
  login: (data) => convex.mutation('auth:login', data),
  
  // 获取当前用户
  me: (userId) => convex.query('auth:me', { userId }),
};

// 分析API
export const analyticsApi = {
  // 获取作品统计
  getWorkStats: (workId) => convex.query('analytics:getWorkStats', { workId }),
  
  // 获取作品集统计
  getPortfolioStats: (portfolioId) => convex.query('analytics:getPortfolioStats', { portfolioId }),
  
  // 获取整体统计
  getOverallStats: () => convex.query('analytics:getOverallStats'),
};

// HTTP API (用于分析跟踪)
export const httpApi = {
  // 健康检查
  health: async () => {
    const response = await fetch(`${CONVEX_URL}/health`);
    return response.json();
  },
  
  // 跟踪分析事件
  trackEvent: async (data) => {
    const response = await fetch(`${CONVEX_URL}/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};

export default convex;

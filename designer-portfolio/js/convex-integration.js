// Convex 前端集成脚本
// 用于在HTML页面中直接调用Convex API

const CONVEX_URL = 'https://fearless-ferret-291.convex.cloud';

// Convex API 封装
const convexApi = {
  // 用户相关
  users: {
    list: async () => {
      const response = await fetch(`${CONVEX_URL}/api/users/list`);
      return response.json();
    },
    get: async (id) => {
      const response = await fetch(`${CONVEX_URL}/api/users/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      return response.json();
    },
    getByUuid: async (uuid) => {
      const response = await fetch(`${CONVEX_URL}/api/users/getByUuid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid }),
      });
      return response.json();
    },
    create: async (data) => {
      const response = await fetch(`${CONVEX_URL}/api/users/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },
  },

  // 作品相关
  works: {
    list: async () => {
      const response = await fetch(`${CONVEX_URL}/api/works/list`);
      return response.json();
    },
    listPublished: async () => {
      const response = await fetch(`${CONVEX_URL}/api/works/listPublished`);
      return response.json();
    },
    get: async (id) => {
      const response = await fetch(`${CONVEX_URL}/api/works/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      return response.json();
    },
    getByUuid: async (uuid) => {
      const response = await fetch(`${CONVEX_URL}/api/works/getByUuid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid }),
      });
      return response.json();
    },
    getByUser: async (userId) => {
      const response = await fetch(`${CONVEX_URL}/api/works/getByUser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      return response.json();
    },
    getFeatured: async () => {
      const response = await fetch(`${CONVEX_URL}/api/works/getFeatured`);
      return response.json();
    },
    create: async (data) => {
      const response = await fetch(`${CONVEX_URL}/api/works/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    update: async (id, data) => {
      const response = await fetch(`${CONVEX_URL}/api/works/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      });
      return response.json();
    },
    remove: async (id) => {
      const response = await fetch(`${CONVEX_URL}/api/works/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      return response.json();
    },
    incrementViews: async (id) => {
      const response = await fetch(`${CONVEX_URL}/api/works/incrementViews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      return response.json();
    },
    incrementLikes: async (id) => {
      const response = await fetch(`${CONVEX_URL}/api/works/incrementLikes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      return response.json();
    },
  },

  // 认证相关
  auth: {
    register: async (data) => {
      const response = await fetch(`${CONVEX_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    login: async (data) => {
      const response = await fetch(`${CONVEX_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    me: async (userId) => {
      const response = await fetch(`${CONVEX_URL}/api/auth/me`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      return response.json();
    },
  },

  // 分析相关
  analytics: {
    getWorkStats: async (workId) => {
      const response = await fetch(`${CONVEX_URL}/api/analytics/getWorkStats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId }),
      });
      return response.json();
    },
    getPortfolioStats: async (portfolioId) => {
      const response = await fetch(`${CONVEX_URL}/api/analytics/getPortfolioStats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioId }),
      });
      return response.json();
    },
    getOverallStats: async () => {
      const response = await fetch(`${CONVEX_URL}/api/analytics/getOverallStats`);
      return response.json();
    },
    trackEvent: async (data) => {
      const response = await fetch(`${CONVEX_URL}/analytics/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },
  },

  // HTTP端点
  http: {
    health: async () => {
      const response = await fetch(`${CONVEX_URL}/health`);
      return response.json();
    },
  },
};

// 导出到全局
window.convexApi = convexApi;

// 自动跟踪页面浏览
document.addEventListener('DOMContentLoaded', () => {
  // 跟踪页面浏览
  convexApi.analytics.trackEvent({
    eventType: 'view',
    pageUrl: window.location.href,
    referrer: document.referrer,
    userAgent: navigator.userAgent,
  }).catch(console.error);
});

console.log('[Convex] 前端集成已加载，API地址:', CONVEX_URL);

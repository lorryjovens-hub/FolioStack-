# FolioStack 安全部署指南

## 🔐 已生成的安全密钥

### 生产环境密钥 (请妥善保存)
```bash
JWT_SECRET=ec58444fae53fb1c7f4cb43782b26c943c306f863e56ec101e91a7c1100f66911024f0528fc795504cda3ccc0fb86d1b7d54a670cee02fdfe5803ca7baa29963
SESSION_SECRET=d7602ae608bff90f5c42ef0bae9ccf9ce90a7d73b68b4f07e1c9a765931450c37e30a69d44160e2e213109d378237996c4450edd0b6c29724c6d2c8f789defb0
```

⚠️ **警告**: 这些密钥仅显示一次，请立即保存到安全的地方！

---

## 🚀 Vercel 部署步骤

### 1. 准备环境变量

在 Vercel Dashboard → Project Settings → Environment Variables 中添加：

```bash
# 核心安全配置
JWT_SECRET=ec58444fae53fb1c7f4cb43782b26c943c306f863e56ec101e91a7c1100f66911024f0528fc795504cda3ccc0fb86d1b7d54a670cee02fdfe5803ca7baa29963
SESSION_SECRET=d7602ae608bff90f5c42ef0bae9ccf9ce90a7d73b68b4f07e1c9a765931450c37e30a69d44160e2e213109d378237996c4450edd0b6c29724c6d2c8f789defb0
NODE_ENV=production

# 网站配置
SITE_URL=https://your-domain.vercel.app
CORS_ORIGIN=https://your-domain.vercel.app

# AI 服务 (可选)
OPENAI_API_KEY=your_openai_api_key
ARK_API_KEY=your_ark_api_key
```

---

## 🗄️ Turso 云服务数据库配置

### 1. 注册和安装

```bash
# 安装 Turso CLI
curl -sSL https://get.tur.so/install.sh | bash

# 登录
turso auth login
```

### 2. 创建数据库

```bash
# 创建数据库
turso db create foliostack-prod

# 获取数据库连接信息
turso db show foliostack-prod

# 生成访问令牌
turso db tokens create foliostack-prod
```

### 3. 配置环境变量

```bash
TURSO_DATABASE_URL=libsql://foliostack-prod-yourusername.turso.io
TURSO_AUTH_TOKEN=your_generated_token_here
```

### 4. 初始化数据库表

```bash
# 连接数据库
turso db shell foliostack-prod

# 执行建表SQL (复制 server/turso-db.js 中的建表语句)
```

---

## 🛡️ 安全最佳实践

### 1. 密钥管理
- ✅ 使用 128字符以上的随机字符串
- ✅ 定期更换密钥 (建议每3-6个月)
- ✅ 不同环境使用不同密钥
- ❌ 永远不要硬编码密钥
- ❌ 永远不要提交 .env 文件

### 2. 数据库安全
- ✅ 使用强密码 (16位以上，包含大小写+数字+符号)
- ✅ 限制数据库访问IP
- ✅ 启用SSL连接
- ✅ 定期备份数据
- ❌ 不要使用默认端口

### 3. API安全
- ✅ 启用CORS限制
- ✅ 使用Rate Limiting
- ✅ 验证所有输入
- ✅ 使用HTTPS
- ❌ 不要在URL中传递敏感信息

### 4. 服务器安全
- ✅ 及时更新依赖包
- ✅ 启用安全响应头
- ✅ 使用WAF防护
- ✅ 监控异常访问
- ❌ 不要暴露服务器错误详情

---

## 📋 部署检查清单

### 部署前
- [ ] 更新所有依赖到最新版本
- [ ] 运行安全审计 `npm audit`
- [ ] 生成新的安全密钥
- [ ] 配置生产环境变量
- [ ] 测试数据库连接
- [ ] 验证所有API端点

### 部署中
- [ ] 启用HTTPS
- [ ] 配置自定义域名
- [ ] 设置环境变量
- [ ] 配置数据库连接

### 部署后
- [ ] 测试用户注册/登录
- [ ] 验证作品上传功能
- [ ] 检查AI生成功能
- [ ] 监控错误日志
- [ ] 配置性能监控

---

## 🔧 常用命令

### 生成新密钥
```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Session Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 随机密码
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 安全审计
```bash
# 检查依赖漏洞
npm audit

# 自动修复
npm audit fix

# 查看过时依赖
npm outdated
```

---

## 📞 获取帮助

- Turso 文档: https://docs.turso.tech
- Vercel 文档: https://vercel.com/docs
- 项目仓库: https://github.com/lorryjovens-hub/FolioStack-

---

**最后更新**: 2026-04-20
**版本**: v1.0.0

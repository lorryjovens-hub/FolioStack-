# FolioStack 全栈平台部署指南

## 🏗️ 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                      用户访问层                              │
│              https://www.portfolio.cc.cd                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Vercel 前端部署                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  React App   │  │  Vite Build  │  │  Static Files│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────┬──────────────────────────────────────┘
                       │ API 请求
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Convex 后端服务                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  API Functions│  │  Database   │  │  Auth        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  URL: https://fearless-ferret-291.convex.cloud            │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 部署步骤

### 1. 部署后端（Convex）- 已完成 ✅

Convex后端已部署：
- **API地址**: `https://fearless-ferret-291.convex.cloud`
- **数据库**: 9张表已创建
- **功能**: 用户管理、作品管理、认证、分析统计

### 2. 部署前端（Vercel）

#### 方式A：通过Vercel网站部署（推荐）

1. 访问 https://vercel.com/new

2. 导入GitHub仓库：`lorryjovens-hub/FolioStack-`

3. 配置项目：
   - **Framework Preset**: Vite
   - **Root Directory**: `designer-portfolio`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. 添加环境变量：
   ```
   CONVEX_URL=https://fearless-ferret-291.convex.cloud
   CONVEX_SITE_URL=https://fearless-ferret-291.convex.site
   JWT_SECRET=你的JWT密钥
   ```

5. 点击 **Deploy**

6. 部署完成后添加自定义域名：
   - 进入 Project Settings → Domains
   - 添加 `www.portfolio.cc.cd`
   - 按Vercel提示更新DNS记录

#### 方式B：通过GitHub Actions自动部署

需要在GitHub Secrets中添加：
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## 📁 项目结构

```
designer-portfolio/
├── src/                      # React前端源码
│   ├── pages/               # 页面组件
│   ├── components/          # 公共组件
│   ├── store/               # 状态管理
│   └── api/                 # API调用
├── server/                   # Express后端（本地开发用）
├── convex/                   # Convex后端函数
│   ├── schema.ts            # 数据库表结构
│   ├── users.ts             # 用户API
│   ├── works.ts             # 作品API
│   ├── auth.ts              # 认证API
│   └── analytics.ts         # 分析API
├── index.html               # 入口HTML
├── package.json             # 依赖配置
├── vite.config.ts           # Vite配置
├── vercel.json              # Vercel部署配置
└── convex.json              # Convex项目配置
```

## 🔌 API路由配置

Vercel配置中已将 `/api/*` 请求转发到Convex：

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://fearless-ferret-291.convex.cloud/api/$1"
    }
  ]
}
```

前端可以通过相对路径调用API：
```javascript
// 前端代码
fetch('/api/works/list')  // 自动转发到Convex
```

## 🌐 访问地址

部署完成后：

| 服务 | 地址 |
|------|------|
| 前端 | `https://www.portfolio.cc.cd` |
| 后端API | `https://fearless-ferret-291.convex.cloud` |
| Vercel临时域名 | `https://foliostack-portfolio.vercel.app` |

## 🛠️ 功能模块

### 已实现功能

1. **用户系统**
   - 注册/登录
   - JWT认证
   - 个人资料管理

2. **作品管理**
   - 作品CRUD
   - 作品导入（链接/上传）
   - 作品分类和标签

3. **作品集**
   - 多模板支持
   - 自定义域名
   - 主题定制

4. **AI生成**
   - 12种风格选项
   - API Key配置
   - 自动生成作品集

5. **数据分析**
   - 浏览量统计
   - 点赞统计
   - 实时数据跟踪

6. **网站克隆**
   - 输入URL克隆
   - 自动抓取内容

## 📝 环境变量

### 前端（Vercel）
```
CONVEX_URL=https://fearless-ferret-291.convex.cloud
CONVEX_SITE_URL=https://fearless-ferret-291.convex.site
JWT_SECRET=你的JWT密钥
```

### 后端（Convex）
```
CONVEX_DEPLOY_KEY=dev:fearless-ferret-291|eyJ2MiI6IjkxZjZkYTU0ODFkNTRiM2U5NTU2NjY5ODJjZDEzNzI5In0=
```

## 🔄 开发工作流

1. **本地开发**
   ```bash
   npm run dev          # 启动前端
   npm run server       # 启动本地后端（可选）
   ```

2. **代码提交**
   ```bash
   git add -A
   git commit -m "feat: xxx"
   git push origin main
   ```

3. **自动部署**
   - GitHub Actions自动部署到Convex
   - Vercel自动部署前端

## 🆘 故障排除

### 问题1：前端无法连接后端
- 检查 `vercel.json` 中的rewrites配置
- 确认Convex服务运行正常
- 检查浏览器控制台网络请求

### 问题2：构建失败
- 检查 `package.json` 中的build脚本
- 确认所有依赖已安装
- 查看Vercel构建日志

### 问题3：域名无法访问
- 检查DNS记录是否指向Vercel
- 确认SSL证书已生成
- 等待DNS传播（最多48小时）

## 📊 监控和维护

- **Vercel Analytics**: 查看前端性能
- **Convex Dashboard**: 监控后端API和数据库
- **GitHub Actions**: 查看部署日志

# Vercel 部署指南

## 🚀 快速部署步骤

由于本地Vercel CLI权限问题，我们使用 **GitHub + Vercel** 自动部署方案。

### 方案1：在Vercel网站手动导入（推荐，5分钟完成）

1. 访问 https://vercel.com/new

2. 点击 **"Import Git Repository"**

3. 选择你的GitHub仓库：`lorryjovens-hub/FolioStack-`

4. 配置项目：
   - **Framework Preset**: Other
   - **Root Directory**: `designer-portfolio`
   - **Build Command**: 留空
   - **Output Directory**: `.`

5. 点击 **"Deploy"**

6. 部署完成后，进入 **Project Settings** → **Domains**

7. 添加自定义域名：`www.portfolio.cc.cd`

8. Vercel会提供DNS配置，在你的DNS面板添加相应记录

### 方案2：GitHub Actions自动部署

需要在GitHub Secrets中添加：

| Secret 名称 | 获取方式 |
|------------|---------|
| `VERCEL_TOKEN` | Vercel Dashboard → Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel项目URL中的team ID |
| `VERCEL_PROJECT_ID` | Vercel项目Settings → General |

---

## 🌐 架构说明

部署后的架构：

```
用户 → www.portfolio.cc.cd (Vercel CDN)
         ↓
    静态文件 (HTML/CSS/JS)
         ↓
    API请求 → Convex (https://fearless-ferret-291.convex.cloud)
```

---

## 📋 已创建的配置文件

| 文件 | 说明 |
|------|------|
| `vercel.json` | Vercel部署配置 |
| `.github/workflows/vercel-deploy.yml` | GitHub Actions自动部署 |

---

## 🔧 配置说明

### vercel.json 功能
- ✅ 静态网站托管
- ✅ API请求转发到Convex
- ✅ 安全响应头
- ✅ 环境变量配置

### API转发规则
```
/api/*  →  https://fearless-ferret-291.convex.cloud/api/*
```

这样前端可以通过相对路径 `/api/works/list` 访问Convex API。

---

## 📝 部署后配置

### 1. 修改DNS记录

在Vercel添加域名后，需要将DNS从：
```
www.portfolio.cc.cd CNAME fearless-ferret-291.convex.site
```

改为Vercel提供的地址（类似）：
```
www.portfolio.cc.cd CNAME cname.vercel-dns.com
```

### 2. 环境变量（可选）

在Vercel Dashboard → Project Settings → Environment Variables 中添加：

| 变量名 | 值 |
|-------|-----|
| `CONVEX_URL` | `https://fearless-ferret-291.convex.cloud` |
| `JWT_SECRET` | 你的JWT密钥 |

---

## ✅ 验证部署

部署完成后，访问：
- Vercel临时域名：`https://foliostack-portfolio.vercel.app`
- 自定义域名：`https://www.portfolio.cc.cd`

---

## 🆘 故障排除

### 问题1：域名无法访问
- 检查DNS记录是否指向Vercel
- 等待DNS传播（最多48小时）

### 问题2：API请求失败
- 检查 `vercel.json` 中的rewrites配置
- 确认Convex服务运行正常

### 问题3：静态资源404
- 确认 `outputDirectory` 设置为 `.`
- 检查文件路径是否正确

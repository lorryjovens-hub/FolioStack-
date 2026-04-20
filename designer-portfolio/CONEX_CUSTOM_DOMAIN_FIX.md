# Convex 自定义域名配置修复指南

## ❌ 问题分析

你遇到的 **Cloudflare 错误 1001** 是因为：

1. **DNS配置正确** ✅ - 你的CNAME记录已正确指向 `fearless-ferret-291.convex.site`
2. **Convex端未配置** ❌ - Convex Dashboard中没有添加 `www.portfolio.cc.cd` 作为自定义域名

## 🔧 解决方案

### 方案1：在Convex Dashboard配置自定义域名（推荐）

1. 访问 Convex Dashboard：
   ```
   https://dashboard.convex.dev/
   ```

2. 选择项目 `fearless-ferret-291`

3. 进入 **Settings** → **Domains**

4. 点击 **"Add Custom Domain"**

5. 输入域名：`www.portfolio.cc.cd`

6. 选择 **"Use as HTTP Actions domain"**

7. 点击 **"Add Domain"**

8. 等待SSL证书生成（约1-5分钟）

### 方案2：使用Convex提供的默认域名（立即生效）

如果不想配置自定义域名，可以直接使用Convex提供的域名：

- **HTTP Actions URL**: `https://fearless-ferret-291.convex.site`

这个地址已经可以正常访问！

### 方案3：使用Vercel/Netlify作为前端 + Convex作为后端

更推荐的架构：

```
用户 → www.portfolio.cc.cd (Vercel/Netlify) → Convex API
```

#### 配置步骤：

1. **在Vercel部署前端**：
   ```bash
   npm i -g vercel
   vercel --prod
   ```

2. **设置环境变量**：
   ```
   CONVEX_URL=https://fearless-ferret-291.convex.cloud
   ```

3. **在Vercel配置自定义域名**：
   - 进入Vercel Dashboard → Project Settings → Domains
   - 添加 `www.portfolio.cc.cd`
   - Vercel会自动处理DNS和SSL

## 🌐 当前可用地址

| 地址 | 状态 | 说明 |
|------|------|------|
| `https://fearless-ferret-291.convex.cloud` | ✅ 可用 | Convex API端点 |
| `https://fearless-ferret-291.convex.site` | ✅ 可用 | HTTP Actions端点 |
| `https://www.portfolio.cc.cd` | ❌ 错误1001 | 需要Convex配置 |

## 📝 建议

### 短期方案
直接使用 `https://fearless-ferret-291.convex.site` 访问

### 长期方案
1. 在Convex Dashboard添加自定义域名
2. 或者使用Vercel部署前端，Convex作为纯后端API

## 🔍 验证DNS配置

你的DNS配置是正确的：
```
www.portfolio.cc.cd CNAME fearless-ferret-291.convex.site
```

问题只在Convex端需要添加域名白名单。

---

## ⚡ 快速修复

如果你希望立即使用自定义域名，请按以下步骤操作：

1. 访问 https://dashboard.convex.dev/
2. 登录并选择项目 `fearless-ferret-291`
3. 进入 Settings → Domains
4. 添加 `www.portfolio.cc.cd`
5. 等待1-5分钟后即可访问

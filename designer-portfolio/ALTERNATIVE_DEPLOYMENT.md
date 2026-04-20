# 替代部署方案

## 问题分析

当前项目有两个部分：
1. **前端**: Vite + React + TypeScript（有类型错误）
2. **后端**: Convex（已部署成功）

TypeScript类型错误是因为前端代码基于旧的Express API结构，与Convex schema不匹配。

## 方案1: 静态HTML部署（最快，立即可用）

直接使用现有的HTML文件部署，绕过TypeScript构建。

### 1.1 Vercel静态部署

创建 `vercel-static.json`:
```json
{
  "version": 2,
  "name": "foliostack-static",
  "buildCommand": null,
  "outputDirectory": ".",
  "framework": null,
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://fearless-ferret-291.convex.cloud/api/$1"
    }
  ]
}
```

部署步骤：
1. 使用 `vercel-static.json` 替换 `vercel.json`
2. 在Vercel导入时选择 "Other" 框架
3. 不设置构建命令

### 1.2 Cloudflare Pages

1. 访问 https://dash.cloudflare.com/
2. Pages → Create a project
3. 导入GitHub仓库
4. 构建设置：
   - Build command: 留空
   - Build output directory: `/`
5. 添加自定义域名

### 1.3 GitHub Pages

创建 `.github/workflows/static-deploy.yml`:
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./designer-portfolio
```

---

## 方案2: Render部署（推荐全栈）

Render支持部署完整应用。

### 2.1 创建 render.yaml

```yaml
services:
  - type: web
    name: foliostack-frontend
    env: static
    buildCommand: "" 
    staticPublishPath: .
    routes:
      - type: rewrite
        source: /api/*
        destination: https://fearless-ferret-291.convex.cloud/api/$1
    headers:
      - path: /*
        name: X-Content-Type-Options
        value: nosniff
```

### 2.2 部署步骤

1. 访问 https://dashboard.render.com/
2. New → Static Site
3. 连接GitHub仓库
4. 配置：
   - Name: `foliostack`
   - Root Directory: `designer-portfolio`
   - Build Command: 留空
   - Publish Directory: `.`
5. 添加自定义域名

---

## 方案3: Railway部署

### 3.1 创建 railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npx serve -s . -p $PORT",
    "healthcheckPath": "/",
    "healthcheckTimeout": 100
  }
}
```

### 3.2 部署步骤

1. 访问 https://railway.app/
2. New Project → Deploy from GitHub repo
3. 选择仓库
4. 添加变量：
   ```
   CONVEX_URL=https://fearless-ferret-291.convex.cloud
   ```
5. 部署

---

## 方案4: VPS部署（最灵活）

使用阿里云/腾讯云/AWS等VPS。

### 4.1 使用Docker部署

创建 `Dockerfile`:
```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

创建 `nginx.conf`:
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass https://fearless-ferret-291.convex.cloud/api/;
    }
}
```

### 4.2 部署命令

```bash
# 构建镜像
docker build -t foliostack .

# 运行容器
docker run -d -p 80:80 foliostack
```

---

## 方案5: 修复TypeScript后部署（长期方案）

### 5.1 修复步骤

1. 更新所有类型定义匹配Convex schema
2. 更新API调用使用Convex客户端
3. 重新部署到Vercel

### 5.2 预计工作量

- 修复类型定义: 2-3小时
- 测试: 1小时
- 部署: 10分钟

---

## 推荐方案

| 场景 | 推荐方案 | 时间 |
|------|---------|------|
| 立即上线 | 方案1: 静态HTML | 5分钟 |
| 免费全栈 | 方案2: Render | 10分钟 |
| 国内访问 | 方案4: VPS | 30分钟 |
| 长期维护 | 方案5: 修复TS | 半天 |

---

## 当前状态

- ✅ Convex后端: 已部署
- ✅ 数据库: 9张表已创建
- ✅ API: 可用
- ❌ 前端构建: 有类型错误
- ⏳ 自定义域名: 待配置

**建议**: 先用方案1（静态HTML）快速上线，然后慢慢修复TypeScript问题。

# Convex GitHub 自动部署配置指南

## 🚀 配置步骤

### 1. 在 GitHub 仓库中添加 Secrets

访问你的 GitHub 仓库页面：
```
https://github.com/lorryjovens-hub/FolioStack-/settings/secrets/actions
```

添加以下 Secret：

| Secret 名称 | 值 |
|------------|-----|
| `CONVEX_DEPLOY_KEY` | `dev:fearless-ferret-291\|eyJ2MiI6IjkxZjZkYTU0ODFkNTRiM2U5NTU2NjY5ODJjZDEzNzI5In0=` |

### 2. 添加 Secret 的步骤

1. 进入仓库 Settings → Secrets and variables → Actions
2. 点击 "New repository secret"
3. Name: `CONVEX_DEPLOY_KEY`
4. Secret: 粘贴上面的部署密钥
5. 点击 "Add secret"

### 3. 自动部署触发条件

已配置的 GitHub Actions 工作流会在以下情况自动部署：

- ✅ Push 到 `main` 分支
- ✅ Push 到 `master` 分支
- ✅ Pull Request 合并到 `main` 或 `master` 分支

### 4. 查看部署状态

每次推送后，可以在 GitHub 仓库页面查看部署状态：
```
https://github.com/lorryjovens-hub/FolioStack-/actions
```

### 5. 手动触发部署

如果需要手动触发部署：

1. 进入 Actions 页面
2. 选择 "Deploy to Convex" 工作流
3. 点击 "Run workflow"

---

## 📁 已创建的文件

- `.github/workflows/convex-deploy.yml` - GitHub Actions 工作流配置

---

## 🔧 部署密钥信息

```
项目: fearless-ferret-291
团队: dev
部署密钥: dev:fearless-ferret-291|eyJ2MiI6IjkxZjZkYTU0ODFkNTRiM2U5NTU2NjY5ODJjZDEzNzI5In0=
```

---

## 🌐 部署后的访问地址

- **Convex 服务**: https://fearless-ferret-291.convex.cloud
- **HTTP Actions**: https://fearless-ferret-291.convex.site
- **自定义域名**: www.portfolio.cc.cd (需要配置 DNS)

---

## 📝 注意事项

1. 部署密钥已经包含在 GitHub Secrets 中，不会暴露在代码里
2. 每次推送到 main 分支会自动触发部署
3. 部署完成后可以在 Actions 页面查看日志
4. 如果部署失败，会收到邮件通知

# FolioStack - 专业设计师作品集管理平台

<div align="center">
  <img src="https://img.shields.io/badge/frontend-HTML5%20CSS3%20JavaScript-blue" alt="Frontend">
  <img src="https://img.shields.io/badge/backend-Node.js%20Express-green" alt="Backend">
  <img src="https://img.shields.io/badge/database-SQLite%20PostgreSQL-yellow" alt="Database">
  <img src="https://img.shields.io/badge/license-MIT-orange" alt="License">
</div>

## 🎨 项目概述

FolioStack 是一个现代化的设计师作品集管理平台，专为创意专业人士打造。集成了精美的前端展示和强大的后台管理系统，让设计师能够轻松创建、管理和展示自己的作品。

## ✨ 核心功能

### 🖼️ 前端展示
- **响应式设计**：完美适配桌面、平板和移动设备
- **优雅动画**：基于GSAP的流畅过渡和滚动动画
- **作品展示**：网格布局展示，支持筛选和搜索
- **项目详情**：详细的项目介绍页面，支持图片和视频展示
- **深色/浅色主题**：支持主题切换，提供舒适的浏览体验
- **Three.js背景**：动态3D背景效果，提升视觉体验

### 🎛️ 后台管理
- **作品管理**：上传、编辑、删除作品，支持批量操作
- **分类管理**：自定义作品分类和标签
- **数据分析**：访问统计和作品表现分析
- **个人资料**：管理个人信息和社交媒体链接
- **AI生成**：使用AI辅助生成作品集网站
- **导出功能**：支持将作品导出为PDF或其他格式

### 🔧 技术特性
- **安全认证**：JWT令牌认证，保护后台安全
- **文件上传**：支持图片和视频上传，自动处理和优化
- **数据库管理**：支持SQLite和PostgreSQL
- **RESTful API**：完整的API接口支持
- **本地存储**：使用localStorage实现数据持久化
- **跨域支持**：CORS配置，支持跨域访问

## 🛠️ 技术栈

### 前端技术
- **HTML5**：语义化标记
- **CSS3**：Grid、Flexbox、CSS变量
- **JavaScript (ES6+)**：现代JavaScript特性
- **Three.js**：3D图形渲染
- **GSAP**：高性能动画库
- **Chart.js**：数据可视化

### 后端技术
- **Node.js**：JavaScript运行时
- **Express.js**：Web应用框架
- **SQLite/PostgreSQL**：数据库
- **JWT**：身份验证
- **Multer**：文件上传处理
- **Sharp**：图像处理
- **bcryptjs**：密码加密

## 📁 项目结构

```
designer-portfolio/
├── 🖼️ 前端文件
│   ├── index.html              # 主页
│   ├── works.html              # 作品管理页面
│   ├── dashboard.html          # 工作台
│   ├── profile.html            # 个人资料
│   ├── settings.html           # 设置页面
│   ├── ai-generate.html        # AI生成页面
│   ├── analytics.html          # 数据分析
│   ├── work-editor.html        # 作品编辑器
│   ├── import.html             # 导入页面
│   ├── export.html             # 导出页面
│   ├── landing.html            # 登录页面
│   ├── huangjunhua-portfolio.html  # 个人作品集页面
│   └── works/                  # 作品详情页面
│       ├── work1.html
│       ├── work2.html
│       └── ...

├── 🖥️ 后端文件
│   ├── server/                 # 服务器代码
│   │   ├── index.js           # 主服务器
│   │   ├── db.js              # 数据库连接
│   │   ├── simple_server.js   # 简单服务器
│   │   ├── basic_server.js    # 基础服务器
│   │   └── enhanced_server_v3.js  # 增强服务器
│   ├── data/                  # 数据文件
│   │   ├── users.json         # 用户数据
│   │   └── works.json         # 作品数据
│   └── uploads/               # 上传文件存储

├── 📊 数据库文件
│   ├── database_init.sql      # 数据库初始化
│   ├── database_tables.sql    # 表结构
│   ├── database_indexes.sql   # 索引
│   └── database_data.sql      # 示例数据

├── 📚 文档
│   ├── FOLIOSTACK_SPEC.md     # 项目规格
│   ├── PORTFOLIO_BACKEND_FUNCTIONS.md  # 后端功能文档
│   ├── DATABASE_DESIGN.md     # 数据库设计
│   └── UPLOAD_FEATURE_GUIDE.md # 上传功能指南

└── 📦 配置文件
    ├── package.json           # 项目依赖
    └── .gitignore            # Git忽略文件
```

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 启动服务器

```bash
# 开发模式（支持热重载）
npm run dev

# 生产模式
npm start

# 简单服务器模式
npm run simple

# 基础服务器模式
npm run basic
```

### 访问地址

- **前台页面**：http://localhost:3000
- **后台管理**：http://localhost:3000/dashboard.html
- **登录页面**：http://localhost:3000/landing.html

## 📖 使用指南

### 1. 登录后台

访问 `landing.html` 页面进行登录，默认管理员账户：
- **用户名**：admin
- **密码**：admin123

### 2. 管理作品

1. 在后台点击"作品管理"
2. 点击"上传作品"按钮
3. 填写作品信息（标题、描述、分类等）
4. 上传作品图片或视频
5. 设置作品状态（草稿/发布）

### 3. 主题切换

在设置页面可以切换深色/浅色主题，主题设置会自动同步到所有页面。

### 4. 数据导入导出

支持JSON格式的数据导入导出，方便批量管理作品。

### 5. AI辅助生成

使用AI生成功能可以快速创建作品集网站，支持多种设计风格。

## 🗄️ 数据库设计

项目支持两种数据库：
- **SQLite**：轻量级，适合开发和小型部署
- **PostgreSQL**：功能强大，适合生产环境

主要数据表包括：
- `users` - 用户信息
- `works` - 作品信息
- `categories` - 作品分类
- `tags` - 标签管理
- `analytics` - 访问统计

详细的数据库设计请参考 `DATABASE_DESIGN_DOCUMENT.md`。

## 🔒 安全特性

- **密码加密**：使用bcryptjs加密存储密码
- **JWT认证**：无状态身份验证
- **输入验证**：防止SQL注入和XSS攻击
- **CORS配置**：安全的跨域访问控制
- **Helmet**：安全HTTP头部设置

## 📱 响应式设计

项目采用移动优先的响应式设计理念：
- **桌面端**：多列网格布局，完整功能
- **平板端**：自适应布局，优化触控体验
- **移动端**：单列布局，简化导航

## 🎨 设计特色

- **现代美学**：简约优雅的设计风格
- **动态效果**：流畅的动画和过渡
- **深度层次**：通过阴影和z-index创建视觉层次
- **配色方案**：专业的配色，支持深色/浅色主题
- **排版系统**：清晰的字体层次结构

## 🤝 贡献指南

欢迎贡献代码和提出建议！请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

感谢以下开源项目的支持：
- [Three.js](https://threejs.org/) - 3D图形渲染
- [GSAP](https://greensock.com/gsap/) - 动画库
- [Express.js](https://expressjs.com/) - Web框架
- [Chart.js](https://chartjs.org/) - 数据可视化

---

**开发者**: 黄俊华  
**GitHub**: [lorryjovens-hub](https://github.com/lorryjovens-hub)  
**版本**: 1.0.0  

如果这个项目对您有帮助，请给它一个 ⭐️！
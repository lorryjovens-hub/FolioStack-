# FolioStack - 产品作品集管理平台

## 1. Concept & Vision

FolioStack 是一个面向创作者、设计师和开发者的专业作品集管理平台。它不仅是个人作品的展示空间，更是一个能够吸引潜在客户和雇主的专业门户。平台以"简约但不简单"为设计理念，通过精致的视觉呈现和流畅的交互体验，让每个创作者的作品都能得到最佳展示。

核心价值主张：让创意工作者专注于创作，而不必为技术细节烦恼。

## 2. Design Language

### 2.1 Aesthetic Direction
- **风格定位**：Minimal Luxury + Editorial Design
- **参考**：Notion 的简洁、Linear 的精致、Raycast 的现代感
- **特点**：大量留白、精致排版、微妙动效、专业但不冰冷

### 2.2 Color Palette
```css
:root {
  /* Core */
  --bg-primary: #FAFAFA;
  --bg-secondary: #FFFFFF;
  --bg-tertiary: #F5F5F5;
  --bg-dark: #0A0A0B;

  /* Text */
  --text-primary: #1A1A1A;
  --text-secondary: #6B6B6B;
  --text-tertiary: #9A9A9A;
  --text-inverse: #FFFFFF;

  /* Accent */
  --accent-primary: #6366F1;      /* Indigo */
  --accent-primary-hover: #4F46E5;
  --accent-secondary: #EC4899;   /* Pink */
  --accent-gradient: linear-gradient(135deg, #6366F1 0%, #EC4899 100%);

  /* Champagne (原有风格保留) */
  --champagne: #C9A96E;
  --champagne-light: #D4B87A;
  --champagne-dark: #B8944D;

  /* Feedback */
  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;

  /* Borders */
  --border-light: rgba(0, 0, 0, 0.06);
  --border-medium: rgba(0, 0, 0, 0.12);
}
```

### 2.3 Typography
```css
/* Display & Headings */
--font-display: 'Instrument Serif', Georgia, serif;

/* Body & UI */
--font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Monospace */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Scale */
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;        /* 16px */
--text-lg: 1.125rem;      /* 18px */
--text-xl: 1.25rem;       /* 20px */
--text-2xl: 1.5rem;       /* 24px */
--text-3xl: 1.875rem;     /* 30px */
--text-4xl: 2.25rem;      /* 36px */
--text-5xl: 3rem;         /* 48px */
--text-6xl: 3.75rem;      /* 60px */
```

### 2.4 Spacing System
```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;       /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

### 2.5 Motion Philosophy
- **Duration**: 快速交互 150ms，标准过渡 300ms，复杂动画 500ms
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` 标准，`cubic-bezier(0, 0, 0.2, 1)` 进入
- **原则**：动效服务于功能，避免纯装饰性动画

## 3. Technical Architecture

### 3.1 Technology Stack

**Frontend:**
- Vanilla JavaScript (ES6+) + Vite
- Three.js (3D效果)
- GSAP (动画)
- Tailwind CSS (样式)

**Backend:**
- Node.js + Express.js
- SQLite (sql.js) - 开发/小型部署
- PostgreSQL - 生产环境 (可选升级)

**Authentication:**
- JWT (access token + refresh token)
- bcrypt (密码加密)
- 第三方登录: GitHub OAuth, Google OAuth

**File Storage:**
- 本地文件系统 (开发)
- AWS S3 / Cloudflare R2 (生产)

### 3.2 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Landing   │  │  Auth    │  │ Dashboard│  │ Portfolio│   │
│  │ Page     │  │  Flow    │  │          │  │ Viewer   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        API Gateway                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │   User   │  │  Works   │  │  Media   │   │
│  │  Routes  │  │  Routes  │  │  Routes  │  │  Routes  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │   User   │  │  Works   │  │  Media   │   │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        Data Layer                            │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │     SQLite       │         │   File System    │          │
│  │   (sql.js)       │         │   /uploads       │          │
│  └──────────────────┘         └──────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Database Schema

```sql
-- Users Table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  website_url TEXT,
  github_url TEXT,
  twitter_url TEXT,
  linkedin_url TEXT,
  role TEXT DEFAULT 'user',
  email_verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Sessions Table
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  refresh_token TEXT,
  expires_at TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Works (Portfolio Items) Table
CREATE TABLE works (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  category TEXT,
  tags TEXT,  -- JSON array
  thumbnail_type TEXT DEFAULT 'gradient',
  thumbnail_data TEXT,  -- JSON
  thumbnail_url TEXT,
  source_file TEXT,
  is_featured INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Categories Table
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL,
  user_id INTEGER,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_system INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Media Table
CREATE TABLE media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  work_id INTEGER,
  filename TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT,
  size INTEGER,
  width INTEGER,
  height INTEGER,
  storage_path TEXT NOT NULL,
  cdn_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_works_user_id ON works(user_id);
CREATE INDEX idx_works_category ON works(category);
CREATE INDEX idx_works_published ON works(is_published);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_media_user_id ON media(user_id);
```

## 4. Page Structure

### 4.1 Public Pages

**Landing Page (/)**
- Hero Section: 动态3D背景 + 主标语 + CTA按钮
- Features Section: 核心功能展示 (3列卡片)
- How It Works: 3步流程说明
- Templates Preview: 作品集模板展示
- Testimonials: 用户评价轮播
- Pricing: 价格方案 (可选)
- FAQ: 常见问题
- Footer: 链接 + 社交媒体

**Login (/login) & Register (/register)**
- 左右分栏布局
- 左: 品牌展示/插图
- 右: 表单 + 第三方登录

**Public Portfolio (/[username])**
- 作品集封面/头图
- 用户信息卡片
- 作品网格展示
- 联系按钮

**Work Detail (/[username]/[work-id])**
- 作品全屏展示
- 项目信息侧栏
- 相关作品推荐

### 4.2 Dashboard (/dashboard)

**Layout:**
- 侧边导航栏 (可折叠)
- 顶部工具栏 (搜索 + 用户菜单)

**Sections:**
- Overview: 统计数据仪表盘
- Works: 作品管理
- Categories: 分类管理
- Media: 媒体库
- Settings: 账户设置
- Billing: 订阅管理 (可选)

## 5. Component Inventory

### 5.1 Navigation
- `Navbar`: 固定顶部，滚动时添加阴影
- `MobileNav`: 汉堡菜单，全屏覆盖
- `Sidebar`: 仪表盘侧边导航

### 5.2 Buttons
- `Button`: primary, secondary, ghost, danger variants
- `IconButton`: 图标按钮
- `ButtonGroup`: 按钮组

### 5.3 Form Elements
- `Input`: 文本输入框
- `Textarea`: 多行文本
- `Select`: 下拉选择
- `Checkbox` & `Radio`
- `Toggle`: 开关
- `FileUpload`: 文件上传拖拽区

### 5.4 Cards
- `WorkCard`: 作品卡片 (hover 3D效果)
- `UserCard`: 用户信息卡片
- `StatsCard`: 统计数字卡片
- `PricingCard`: 价格卡片

### 5.5 Feedback
- `Toast`: 通知提示
- `Modal`: 模态对话框
- `Tooltip`: 工具提示
- `ProgressBar`: 进度条
- `Skeleton`: 加载骨架屏

### 5.6 Layout
- `Container`: 页面容器
- `Grid`: 响应式网格
- `Stack`: 垂直堆叠布局
- `Divider`: 分隔线

## 6. API Design

### 6.1 Authentication Endpoints

```
POST /api/auth/register
  Body: { username, email, password, displayName }
  Response: { user, token }

POST /api/auth/login
  Body: { email/username, password }
  Response: { user, token }

POST /api/auth/logout
  Headers: Authorization: Bearer <token>
  Response: { success: true }

POST /api/auth/refresh
  Body: { refreshToken }
  Response: { token }

POST /api/auth/forgot-password
  Body: { email }
  Response: { message }

POST /api/auth/reset-password
  Body: { token, password }
  Response: { success }

GET /api/auth/oauth/:provider
  Redirect to OAuth provider

GET /api/auth/oauth/:provider/callback
  Handle OAuth callback
```

### 6.2 User Endpoints

```
GET /api/users/me
  Response: { user }

PUT /api/users/me
  Body: { displayName, bio, avatarUrl, ... }
  Response: { user }

GET /api/users/:username
  Response: { user, works }

GET /api/users/:username/portfolio
  Response: { works, categories }
```

### 6.3 Works Endpoints

```
GET /api/works
  Query: { category, tags, sort, page, limit }
  Response: { works: [], pagination }

POST /api/works
  Body: { title, description, url, category, tags, ... }
  Response: { work }

GET /api/works/:uuid
  Response: { work }

PUT /api/works/:uuid
  Body: { title, description, ... }
  Response: { work }

DELETE /api/works/:uuid
  Response: { success: true }

POST /api/works/:uuid/media
  Body: FormData (file)
  Response: { media }

PUT /api/works/:uuid/publish
  Response: { work }

PUT /api/works/:uuid/feature
  Response: { work }
```

### 6.4 Categories Endpoints

```
GET /api/categories
  Response: { categories: [] }

POST /api/categories
  Body: { name, color, icon }
  Response: { category }

PUT /api/categories/:uuid
  Body: { name, color, icon }
  Response: { category }

DELETE /api/categories/:uuid
  Response: { success: true }
```

## 7. Security Requirements

### 7.1 Authentication
- Password: min 8 chars, bcrypt hashing (12 rounds)
- JWT: 15min access token, 7d refresh token
- Rate limiting: 5 attempts per minute for login

### 7.2 Authorization
- CORS: Whitelist allowed origins
- CSRF: Token validation for state-changing operations
- XSS: Input sanitization, CSP headers
- SQL Injection: Parameterized queries only

### 7.3 Data Protection
- HTTPS only in production
- Secure cookie flags (HttpOnly, Secure, SameSite)
- File upload: Type validation, size limits, virus scanning (production)

## 8. Development Phases

### Phase 1: Foundation (Current)
- [x] Project setup
- [x] Backend API with SQLite
- [x] Basic authentication
- [x] Works CRUD
- [ ] Landing page redesign
- [ ] Dashboard layout

### Phase 2: Core Features
- [ ] Complete landing page
- [ ] User registration flow
- [ ] Portfolio management
- [ ] Media upload
- [ ] Category management

### Phase 3: Enhanced Features
- [ ] Third-party OAuth (GitHub, Google)
- [ ] Password reset flow
- [ ] Email verification
- [ ] Public portfolio pages
- [ ] Search and filtering

### Phase 4: Polish
- [ ] Animation refinements
- [ ] Performance optimization
- [ ] SEO optimization
- [ ] Accessibility audit
- [ ] Mobile optimization

### Phase 5: Launch
- [ ] Documentation
- [ ] Deployment setup
- [ ] Monitoring
- [ ] Analytics

## 9. File Structure

```
designer-portfolio/
├── index.html              # Landing page
├── dashboard.html           # Dashboard page
├── portfolio.html          # Public portfolio page
├── works/
│   └── work-viewer.html    # Individual work view
├── server/
│   ├── index.js            # Express server
│   ├── db.js               # Database operations
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validate.js
│   │   └── rateLimit.js
│   └── routes/
│       ├── auth.js
│       ├── users.js
│       ├── works.js
│       └── categories.js
├── public/
│   ├── css/
│   │   ├── variables.css
│   │   ├── base.css
│   │   ├── components.css
│   │   └── pages.css
│   ├── js/
│   │   ├── app.js
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   ├── works.js
│   │   └── utils.js
│   └── assets/
│       ├── images/
│       └── icons/
├── uploads/                # User uploaded files
├── data/                   # SQLite database
├── package.json
└── SPEC.md
```

## 10. Testing Strategy

### 10.1 Unit Tests
- Utility functions
- Data transformations
- Validation logic

### 10.2 Integration Tests
- API endpoints
- Authentication flows
- Database operations

### 10.3 E2E Tests (Playwright)
- User registration
- Login/logout
- CRUD operations
- Page navigation

### 10.4 Performance Targets
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3s
- Lighthouse Score: > 90

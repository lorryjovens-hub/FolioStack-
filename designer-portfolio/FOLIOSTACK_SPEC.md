# FolioStack 产品作品集管理平台 - 技术规格说明书

## 1. 概念与愿景

FolioStack 是一款专为创作者设计的顶级作品集管理平台，融合奢华美学与强大功能。平台以"让作品自己讲述故事"为核心理念，通过视觉盛宴级的展示效果和流畅的创作体验，帮助创作者专注于作品本身，而非技术细节。

**设计理念**: 简约奢华 (Minimal Luxury) × 编辑设计 (Editorial Design) × 技术仪式感 (Tech Ritual)
**视觉调性**: 黑金色调（香槟金 #c9a96e × 暗黑基色 #0a0a0a），营造高端精致的品牌氛围

---

## 2. 设计语言规范

### 2.1 色彩系统

```css
:root {
  /* 主色调 */
  --obsidian: #0a0a0a;        /* 主背景 - 深邃黑 */
  --charcoal: #141414;       /* 卡片背景 */
  --graphite: #1a1a1a;       /* 次级背景 */
  --silver: #2a2a2a;         /* 边框线 */
  --mist: #3a3a3a;           /* 禁用态 */
  --ash: #8a8a8a;            /* 次要文本 */
  --smoke: #b0b0b0;          /* 主要文本 */
  --pearl: #d4d4d4;          /* 强调文本 */
  --ivory: #f0ece4;          /* 标题文本 */

  /* 强调色 */
  --champagne: #c9a96e;      /* 主强调色 - 香槟金 */
  --champagne-light: #e0c992;
  --champagne-dark: #a68b4b;

  /* 功能色 */
  --rose-gold: #b76e79;      /* 错误/删除 */
  --deep-blue: #1a2a4a;      /* 信息 */
  --emerald: #2a6b5a;        /* 成功 */
  --amber: #d4a574;          /* 警告 */
}
```

### 2.2 字体系统

```css
--font-display: 'Cormorant Garamond', Georgia, serif;  /* 标题 - 优雅衬线 */
--font-body: 'DM Sans', -apple-system, sans-serif;     /* 正文 - 现代无衬线 */
--font-mono: 'Space Mono', monospace;                  /* 代码/数据 - 等宽 */
```

### 2.3 间距系统

```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-2xl: 48px;
--space-3xl: 64px;
--space-4xl: 96px;
```

### 2.4 动效哲学

- **入场动画**: 元素从下方渐入，opacity 0→1, translateY 30px→0, 600ms ease-out-expo
- **交错动画**: 列表项依次入场，delay 100ms 递增
- **悬停反馈**: 元素轻微上浮 (-4px) + 边框发光 + 阴影加深
- **页面过渡**: 内容淡入淡出，300ms ease-out
- **微交互**: 按钮点击缩放 0.98，400ms 回弹

### 2.5 组件状态

| 状态 | 视觉表现 |
|------|----------|
| Default | 基础样式，无修饰 |
| Hover | 边框变为香槟金，元素上浮4px，阴影加深 |
| Active | 元素缩放0.98，香槟金背景加深 |
| Disabled | 50%透明度，禁用光标 |
| Loading | 骨架屏动画，香槟金脉冲 |
| Error | 玫瑰金边框，错误图标 |

---

## 3. 技术架构

### 3.1 技术栈选择

#### 前端技术栈

| 技术 | 选择 | 理由 |
|------|------|------|
| 核心框架 | **React 18 + TypeScript** | 组件化、生态成熟、性能优秀 |
| 状态管理 | **Zustand** | 轻量级、TypeScript友好、API简洁 |
| 路由 | **React Router v6** | 标准解决方案 |
| 样式方案 | **CSS Modules + CSS Variables** | 作用域隔离、主题切换灵活 |
| 动画库 | **GSAP + Framer Motion** | GSAP处理复杂时间线，Framer处理UI动画 |
| 3D效果 | **Three.js + React Three Fiber** | 粒子系统、3D卡片翻转 |
| 图表库 | **Recharts** | React原生、轻量、可定制 |
| 表单 | **React Hook Form + Zod** | 性能优秀、类型安全 |
| HTTP | **Axios + React Query** | 请求缓存、自动重试 |

#### 后端技术栈

| 技术 | 选择 | 理由 |
|------|------|------|
| 运行时 | **Node.js 20 LTS** | 成熟稳定、异步I/O优秀 |
| 框架 | **Express.js** | 简洁灵活、中间件丰富 |
| 数据库 | **PostgreSQL + Prisma** | 关系型强一致、Prisma类型安全 |
| 缓存 | **Redis** | 会话缓存、实时数据 |
| 文件存储 | **Cloudflare R2 / AWS S3** | 成本低、CDN分发 |
| 认证 | **JWT + Refresh Token** | 无状态、安全 |
| 实时通信 | **Socket.IO** | WebSocket + 自动重连 |

#### 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                        CDN (Cloudflare)                     │
│                   静态资源全球分发 + DDoS防护                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer                           │
│                    (Nginx / 云服务)                         │
└─────────────────────────────────────────────────────────────┘
          │                           │
          ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│   Frontend App   │         │   Backend API   │
│   (Vercel/CDN)   │         │   (Node.js)     │
└─────────────────┘         └─────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                  ▼
            ┌────────────┐    ┌────────────┐    ┌────────────┐
            │ PostgreSQL │    │    Redis   │    │     R2     │
            │  Database  │    │    Cache   │    │   Storage  │
            └────────────┘    └────────────┘    └────────────┘
```

### 3.2 数据库设计

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  role VARCHAR(20) DEFAULT 'creator', -- creator, team, admin
  plan VARCHAR(20) DEFAULT 'free', -- free, pro, enterprise
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 作品表
CREATE TABLE works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  tags TEXT[],
  status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
  visibility VARCHAR(20) DEFAULT 'public', -- public, private, password, team_only
  password_hash VARCHAR(255), -- 作品密码保护
  thumbnail_url TEXT,
  media JSONB DEFAULT '[]', -- 多媒体内容
  metadata JSONB DEFAULT '{}', -- 扩展元数据
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  allow_download BOOLEAN DEFAULT false,
  watermark_enabled BOOLEAN DEFAULT true,
  custom_slug VARCHAR(100) UNIQUE,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 作品版本历史
CREATE TABLE work_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID REFERENCES works(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  data JSONB NOT NULL, -- 完整作品快照
  change_summary TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 作品分析表
CREATE TABLE work_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID REFERENCES works(id) ON DELETE CASCADE,
  visitor_id VARCHAR(255),
  event_type VARCHAR(50) NOT NULL, -- view, like, share, download, comment
  referrer TEXT,
  device_type VARCHAR(20),
  country VARCHAR(50),
  city VARCHAR(100),
  duration_seconds INTEGER, -- 停留时长
  created_at TIMESTAMP DEFAULT NOW()
);

-- 团队成员表
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- owner, admin, editor, viewer
  permissions JSONB DEFAULT '{}',
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  UNIQUE(team_id, user_id)
);

-- 作品分类表
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100),
  color VARCHAR(7),
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 导出记录表
CREATE TABLE exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  work_ids UUID[],
  format VARCHAR(20) NOT NULL, -- pdf, html, json, zip
  template_id UUID,
  settings JSONB DEFAULT '{}',
  file_url TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_works_user_id ON works(user_id);
CREATE INDEX idx_works_status ON works(status);
CREATE INDEX idx_works_category ON works(category);
CREATE INDEX idx_analytics_work_id ON work_analytics(work_id);
CREATE INDEX idx_analytics_created_at ON work_analytics(created_at);
CREATE INDEX idx_sessions_token ON sessions(token);
```

---

## 4. 功能模块设计

### 4.1 作品集管理模块

**核心功能**:

```typescript
interface Work {
  id: string;
  title: string;
  description: string;
  category: Category;
  tags: string[];
  media: MediaItem[];
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'private' | 'password' | 'team_only';
  thumbnail: string;
  versions: WorkVersion[];
  analytics: AnalyticsSummary;
  settings: WorkSettings;
}

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'document' | 'embed';
  url: string;
  thumbnail?: string;
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    size?: number;
    format?: string;
    alt?: string;
  };
}
```

**功能列表**:
- ✅ 作品创建/编辑/删除
- ✅ 多媒体上传（拖拽、批量）
- ✅ 分类与标签管理
- ✅ 草稿/发布/归档状态
- ✅ 版本历史与回滚
- 🔄 作品草稿自动保存（每30秒）
- 🔄 批量操作（移动、复制、合并）
- 🔄 模板功能（从现有作品创建）

### 4.2 数据分析模块

**核心功能**:

```typescript
interface AnalyticsDashboard {
  overview: {
    totalViews: number;
    totalLikes: number;
    totalShares: number;
    avgEngagementRate: number;
  };
  trends: {
    viewsTrend: DataPoint[];
    likesTrend: DataPoint[];
    geographicDistribution: GeoData[];
    trafficSources: SourceData[];
  };
  audience: {
    deviceBreakdown: PieChartData[];
    topCountries: BarChartData[];
    engagementByTime: HeatmapData;
  };
  recommendations: Recommendation[];
}

interface DataPoint {
  date: string;
  value: number;
  change?: number; // 环比变化
}
```

**功能列表**:
- ✅ 访问量/点赞/分享统计
- 🔄 停留时长追踪
- 🔄 来源渠道分析
- 🔄 受众画像（设备/地域）
- 🔄 数据可视化仪表盘
- 🔄 AI 创作方向优化建议

### 4.3 多媒体展示模块

**核心功能**:

```typescript
interface MediaViewer {
  type: 'lightbox' | 'carousel' | 'grid' | 'slideshow';
  media: MediaItem[];
  currentIndex: number;
  settings: {
    autoPlay?: boolean;
    loop?: boolean;
    controls?: boolean;
    zoom?: boolean;
    fullscreen?: boolean;
  };
}
```

**功能列表**:
- ✅ 图片灯箱展示 + 缩放
- 🔄 视频播放器（播放控制、全屏）
- 🔄 文档在线预览（PDF、Office）
- 🔄 响应式布局适配
- 🔄 懒加载与性能优化
- 🔄 画廊轮播模式
- 🔄 嵌入模式支持

### 4.4 导出功能模块

**核心功能**:

```typescript
interface ExportConfig {
  workIds: string[];
  format: 'pdf' | 'html' | 'json' | 'zip' | 'md';
  template?: {
    id: string;
    customizations?: TemplateCustomization;
  };
  settings: {
    includeMetadata: boolean;
    imageQuality: 'low' | 'medium' | 'high' | 'original';
    password?: string;
    watermark?: WatermarkConfig;
  };
}

interface WatermarkConfig {
  text: string;
  position: 'center' | 'corner' | 'diagonal';
  opacity: number;
  fontSize: number;
}
```

**功能列表**:
- ✅ PDF 导出（单作品/批量）
- 🔄 HTML 独立网页导出
- 🔄 自定义导出模板
- 🔄 增量导出
- 🔄 水印添加
- 🔄 密码保护

### 4.5 安全权限模块

**核心功能**:

```typescript
interface Permission {
  action: 'view' | 'edit' | 'delete' | 'export' | 'manage';
  resource: 'work' | 'category' | 'team' | 'settings';
  conditions?: {
    own?: boolean;
    status?: string[];
  };
}

interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}
```

**功能列表**:
- ✅ JWT 认证
- ✅ 刷新令牌机制
- 🔄 作品密码保护
- 🔄 团队角色权限（owner/admin/editor/viewer）
- 🔄 操作审计日志
- 🔄 作品水印版权保护
- 🔄 API 速率限制

### 4.6 实时同步模块

**核心功能**:

```typescript
interface SyncState {
  status: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncedAt: string;
  pendingChanges: number;
  conflicts: Conflict[];
}

interface OfflineChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  resource: 'work' | 'category';
  data: any;
  timestamp: string;
}
```

**功能列表**:
- 🔄 云端实时同步
- 🔄 离线编辑队列
- 🔄 冲突自动解决策略
- 🔄 增量同步优化
- 🔄 数据自动备份
- 🔄 手动恢复点

---

## 5. API 设计

### 5.1 认证接口

```
POST /api/auth/register     - 用户注册
POST /api/auth/login        - 用户登录
POST /api/auth/logout       - 登出
POST /api/auth/refresh      - 刷新令牌
GET  /api/auth/me           - 获取当前用户
```

### 5.2 作品接口

```
GET    /api/works            - 获取作品列表
POST   /api/works            - 创建作品
GET    /api/works/:id        - 获取作品详情
PUT    /api/works/:id        - 更新作品
DELETE /api/works/:id        - 删除作品
POST   /api/works/:id/publish    - 发布作品
POST   /api/works/:id/archive   - 归档作品
GET    /api/works/:id/versions  - 获取版本历史
POST   /api/works/:id/rollback  - 回滚到指定版本
```

### 5.3 多媒体接口

```
POST   /api/upload          - 上传文件
DELETE /api/media/:id       - 删除媒体
PUT    /api/media/:id       - 更新媒体元数据
```

### 5.4 分析接口

```
GET    /api/analytics/overview      - 数据总览
GET    /api/analytics/works/:id    - 单作品分析
GET    /api/analytics/trends       - 趋势数据
POST   /api/analytics/track        - 事件追踪
```

### 5.5 导出接口

```
POST   /api/export           - 创建导出任务
GET    /api/export/:id       - 获取导出状态
GET    /api/export/:id/download - 下载导出文件
GET    /api/templates        - 获取模板列表
POST   /api/templates       - 创建模板
```

### 5.6 团队接口

```
GET    /api/team/members     - 获取团队成员
POST   /api/team/invite      - 邀请成员
PUT    /api/team/members/:id - 更新成员权限
DELETE /api/team/members/:id - 移除成员
```

---

## 6. 页面结构

```
FolioStack/
├── landing.html          # 产品官网（已完成）
├── dashboard.html        # 管理后台主页面（已完成）
├── works.html           # 作品展示页面（已完成）
│
├── index.html            # 原有个人作品集（保留）
│
└── pages/                # 完整版 React 应用页面
    ├── login.html        # 登录页
    ├── register.html     # 注册页
    ├── profile.html      # 个人资料
    ├── analytics.html    # 数据分析仪表盘
    ├── settings.html     # 系统设置
    ├── templates.html    # 导出模板管理
    └── work-editor.html  # 作品编辑器
```

---

## 7. 开发阶段

### Phase 1: 基础建设 ✅
- [x] 项目架构设计
- [x] 设计系统建立
- [x] 数据库Schema定义
- [x] Landing页面实现

### Phase 2: 核心功能 🚧
- [ ] 用户认证系统
- [ ] 作品CRUD功能
- [ ] 分类标签系统
- [ ] 多媒体上传

### Phase 3: 增强功能 📋
- [ ] 数据分析仪表盘
- [ ] 版本历史系统
- [ ] 团队协作功能
- [ ] 导出功能

### Phase 4: 完善优化 📋
- [ ] 实时同步
- [ ] 离线支持
- [ ] 性能优化
- [ ] 安全加固

### Phase 5: 发布上线 📋
- [ ] 部署配置
- [ ] 监控告警
- [ ] 文档编写
- [ ] 正式发布

---

## 8. 测试策略

### 单元测试
- Jest + React Testing Library
- 组件渲染测试
- Hooks 测试
- 工具函数测试

### 集成测试
- API 端点测试
- 数据库操作测试
- 认证流程测试

### E2E 测试
- Playwright
- 用户关键路径覆盖
- 表单提交验证

### 性能测试
- Lighthouse CI
- Core Web Vitals
- 压力测试

---

## 9. 安全考虑

1. **输入验证**: 所有用户输入经过 Zod 验证
2. **SQL注入**: 使用 Prisma ORM 参数化查询
3. **XSS防护**: React 自动转义，DOMPurify 处理富文本
4. **CSRF**: SameSite Cookie + CSRF Token
5. **密码存储**: bcrypt 加密，12轮哈希
6. **敏感数据**: 环境变量管理，密钥轮换
7. **文件上传**: 类型白名单，大小限制，病毒扫描
8. **速率限制**: Redis 实现 API 限流

---

## 10. 成本评估（预估）

### 小规模运营（月）
| 服务 | 方案 | 成本 |
|------|------|------|
| 前端部署 | Vercel Free | $0 |
| 后端部署 | Railway / Render | $5-20 |
| 数据库 | Neon PostgreSQL | $0-10 |
| 存储 | Cloudflare R2 | $0-5 |
| 域名 | .app 域名 | $12 |
| **总计** | | **$20-50** |

### 中等规模运营（月）
| 服务 | 方案 | 成本 |
|------|------|------|
| 前端部署 | Vercel Pro | $20 |
| 后端部署 | Railway Pro | $50 |
| 数据库 | Neon PostgreSQL Pro | $25 |
| 存储 + CDN | Cloudflare R2 + CDN | $20 |
| Redis | Upstash | $10 |
| 监控 | Datadog | $50 |
| **总计** | | **~$175** |

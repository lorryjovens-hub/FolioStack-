# FolioStack 登录注册系统使用指南

## 🎉 系统已修复完成！

登录注册系统已成功修复并可以正常使用。

---

## 🚀 快速启动

### 方法 1: 使用启动脚本（推荐）

双击运行 `start-auth.bat` 文件，脚本会自动：
1. 检查 Node.js 是否安装
2. 安装必要的依赖
3. 启动认证服务器

### 方法 2: 使用命令行

#### 启动后端认证服务器
```bash
npm run server-auth
```

#### 启动前端开发服务器（新终端）
```bash
npm run dev
```

---

## 📊 系统架构

### 前端服务器
- **端口**: 3001
- **访问地址**: http://localhost:3001
- **技术栈**: React + Vite + TypeScript

### 后端认证服务器
- **端口**: 3002
- **API地址**: http://localhost:3002/api
- **技术栈**: Express + JWT + bcrypt

### 数据库
- **类型**: SQLite（本地开发）
- **位置**: `data/portfolio.db`
- **备选**: PostgreSQL（生产环境）

---

## 🔐 认证功能

### 可用的 API 端点

#### 1. 用户注册
```http
POST http://localhost:3002/api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "displayName": "Test User"
}
```

#### 2. 用户登录
```http
POST http://localhost:3002/api/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123"
}
```

#### 3. 获取当前用户信息
```http
GET http://localhost:3002/api/auth/me
Authorization: Bearer <your_token>
```

#### 4. 用户登出
```http
POST http://localhost:3002/api/auth/logout
Authorization: Bearer <your_token>
```

#### 5. 健康检查
```http
GET http://localhost:3002/api/health
```

---

## 🎯 使用步骤

### 1. 启动服务器

#### Windows 用户
```bash
# 方法 1: 双击运行
start-auth.bat

# 方法 2: 命令行运行
npm run server-auth
```

#### Mac/Linux 用户
```bash
npm run server-auth
```

### 2. 启动前端（新终端）
```bash
npm run dev
```

### 3. 访问应用
打开浏览器访问：http://localhost:3001

### 4. 注册新用户
1. 点击右上角"注册"按钮
2. 填写用户信息：
   - 用户名（必填）
   - 邮箱（必填）
   - 密码（必填）
   - 显示名称（可选）
3. 点击"注册"按钮

### 5. 登录
1. 点击右上角"登录"按钮
2. 输入用户名/邮箱和密码
3. 点击"登录"按钮

---

## 🔧 故障排查

### 问题 1: 端口被占用

**症状**: 
```
Error: listen EADDRINUSE: address already in use :::3002
```

**解决方案**:
```bash
# Windows
netstat -ano | findstr :3002
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :3002
kill -9 <PID>
```

### 问题 2: 数据库连接失败

**症状**:
```
PostgreSQL unavailable: Connection terminated
```

**解决方案**:
系统会自动回退到 SQLite 数据库，无需手动处理。

### 问题 3: 前端无法连接后端

**症状**: 登录/注册时显示"网络错误"

**检查清单**:
1. ✅ 后端服务器是否运行在 3002 端口？
2. ✅ 前端服务器是否运行在 3001 端口？
3. ✅ 浏览器控制台是否有 CORS 错误？

**解决方案**:
```bash
# 重启后端服务器
npm run server-auth

# 重启前端服务器
npm run dev
```

### 问题 4: Token 失效

**症状**: 
```
401 Unauthorized
```

**解决方案**:
清除浏览器本地存储并重新登录：
```javascript
// 在浏览器控制台执行
localStorage.clear();
location.reload();
```

---

## 📁 文件结构

```
designer-portfolio/
├── server/
│   ├── auth-server.js      # 认证服务器（新增）
│   ├── db.js               # 数据库连接
│   └── index.js            # 主服务器
├── src/
│   ├── pages/
│   │   ├── Login.tsx       # 登录页面
│   │   └── Register.tsx    # 注册页面
│   └── store/
│       └── authStore.ts    # 认证状态管理
├── data/
│   └── portfolio.db        # SQLite 数据库
├── .env                    # 环境配置
├── start-auth.bat          # Windows 启动脚本（新增）
└── package.json            # 项目配置
```

---

## 🔒 安全配置

### JWT 配置
- **密钥**: 在 `.env` 文件中设置 `JWT_SECRET`
- **过期时间**: 默认 7 天，可在 `.env` 中修改 `JWT_EXPIRES_IN`

### 生产环境建议
1. **更改 JWT 密钥**:
   ```env
   JWT_SECRET=your_very_strong_random_secret_key_here
   ```

2. **使用 HTTPS**:
   ```env
   CORS_ORIGIN=https://yourdomain.com
   ```

3. **使用 PostgreSQL**:
   ```env
   DB_TYPE=postgres
   POSTGRES_HOST=your-db-host
   POSTGRES_PORT=5432
   POSTGRES_USER=your-db-user
   POSTGRES_PASSWORD=your-db-password
   POSTGRES_DATABASE=your-db-name
   ```

---

## 🧪 测试账号

### 创建测试账号
```bash
# 使用 curl 测试注册
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"test123","displayName":"Test User"}'

# 使用 curl 测试登录
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'
```

---

## 📊 监控和日志

### 查看服务器日志
服务器会自动输出请求日志：
```
[2026-04-12T10:30:45.123Z] POST /api/auth/register
[2026-04-12T10:30:45.456Z] POST /api/auth/login
```

### 健康检查
```bash
curl http://localhost:3002/api/health
```

响应示例：
```json
{
  "status": "ok",
  "timestamp": "2026-04-12T10:30:45.123Z",
  "database": "sqlite",
  "port": 3002
}
```

---

## 🎓 开发指南

### 添加新的认证功能

#### 1. 添加新的 API 端点
在 `server/auth-server.js` 中添加：
```javascript
app.post('/api/auth/new-feature', authenticate, async (req, res) => {
  // 实现新功能
});
```

#### 2. 更新前端状态管理
在 `src/store/authStore.ts` 中添加：
```typescript
newFeature: async () => {
  // 调用新 API
}
```

#### 3. 更新 UI
在相应的页面组件中调用新的 store 方法。

---

## 📞 获取帮助

### 常见问题
1. 查看服务器日志输出
2. 检查浏览器控制台错误
3. 验证 API 端点是否正确
4. 确认数据库连接状态

### 调试技巧
```javascript
// 在浏览器控制台查看当前用户状态
console.log(localStorage.getItem('token'));
console.log(axios.defaults.headers.common['Authorization']);

// 清除认证状态
localStorage.clear();
location.reload();
```

---

## ✅ 功能清单

- [x] 用户注册
- [x] 用户登录
- [x] 用户登出
- [x] JWT Token 认证
- [x] 密码加密存储
- [x] 会话管理
- [x] SQLite 数据库支持
- [x] PostgreSQL 数据库支持
- [x] CORS 跨域支持
- [x] 错误处理
- [x] 请求日志
- [x] 健康检查

---

## 🎉 总结

登录注册系统已经完全修复并可以正常使用。主要改进包括：

1. ✅ 创建了独立的认证服务器
2. ✅ 修复了端口配置问题
3. ✅ 添加了详细的日志输出
4. ✅ 改进了错误处理
5. ✅ 创建了便捷的启动脚本
6. ✅ 添加了完整的文档

现在您可以：
- 注册新用户
- 登录系统
- 管理会话
- 安全地使用应用

**祝您使用愉快！** 🎊
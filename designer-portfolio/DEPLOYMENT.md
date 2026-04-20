# FolioStack 持久化部署方案

## 🚀 技术栈架构

### 核心技术
- **Node.js 20** - 运行时环境
- **Express 5** - Web框架
- **PM2** - 进程管理和持久化
- **Docker** - 容器化部署
- **PostgreSQL** - 主数据库
- **Redis** - 缓存和会话存储
- **Nginx** - 反向代理（可选）

### 架构特性
✅ **进程持久化** - PM2自动重启和集群模式
✅ **健康检查** - 完善的健康检查机制
✅ **性能监控** - 实时性能指标收集
✅ **日志管理** - 结构化日志记录
✅ **缓存优化** - Redis缓存提升性能
✅ **容器化** - Docker一键部署
✅ **负载均衡** - 多进程集群模式

---

## 📦 部署方式

### 方式一：PM2进程管理（推荐用于开发/测试）

#### 1. 安装PM2
```bash
npm install -g pm2
```

#### 2. 启动服务
```bash
# 启动所有服务
npm start

# 查看状态
npm run status

# 查看日志
npm run logs

# 监控面板
npm run monit

# 重启服务
npm run restart

# 停止服务
npm run stop
```

#### 3. PM2特性
- **自动重启**: 崩溃后自动重启
- **集群模式**: 利用多核CPU
- **日志管理**: 自动日志分割
- **监控面板**: 实时性能监控
- **零停机重启**: 优雅重启机制

---

### 方式二：Docker Compose（推荐用于生产）

#### 1. 安装Docker和Docker Compose
- [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
- Docker Compose会随Docker Desktop一起安装

#### 2. 启动完整技术栈
```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 查看服务状态
docker-compose ps

# 重启服务
docker-compose restart

# 停止服务
docker-compose down
```

#### 3. 服务访问地址
- **前端**: http://localhost:3001
- **后端API**: http://localhost:3002
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **Nginx**: http://localhost:80

---

## 🔧 配置说明

### 环境变量 (.env)
```env
# 服务器配置
NODE_ENV=production
PORT=3002

# 数据库配置
DATABASE_URL=postgresql://postgres:password@localhost:5432/foliostack

# Redis配置
REDIS_URL=redis://localhost:6379

# JWT配置
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# AI配置（可选）
OPENAI_API_KEY=your-openai-api-key
```

### PM2配置 (ecosystem.config.json)
- **instances**: "max" - 自动使用所有CPU核心
- **exec_mode**: "cluster" - 集群模式
- **max_memory_restart**: "1G" - 内存超限自动重启
- **autorestart**: true - 自动重启
- **watch**: false - 生产环境禁用文件监听

---

## 📊 监控和日志

### 健康检查端点
```bash
# 后端健康检查
curl http://localhost:3002/api/health

# 性能指标
curl http://localhost:3002/api/metrics

# 就绪检查
curl http://localhost:3002/api/ready
```

### 日志文件位置
- **PM2日志**: `./logs/pm2-*.log`
- **服务器日志**: `./logs/server-*.log`
- **错误日志**: `./logs/pm2-error.log`

### PM2监控命令
```bash
# 实时监控
pm2 monit

# 查看详细信息
pm2 show foliostack-backend

# 查看日志
pm2 logs foliostack-backend

# 刷新日志
pm2 flush
```

---

## 🚨 故障排查

### 服务无法启动
```bash
# 检查端口占用
netstat -ano | findstr :3002

# 检查PM2状态
pm2 status

# 查看错误日志
pm2 logs --err
```

### 数据库连接失败
```bash
# 检查PostgreSQL状态
docker-compose ps postgres

# 查看PostgreSQL日志
docker-compose logs postgres

# 重启PostgreSQL
docker-compose restart postgres
```

### Redis连接失败
```bash
# 检查Redis状态
docker-compose ps redis

# 测试Redis连接
docker-compose exec redis redis-cli ping
```

---

## 📈 性能优化

### 1. Redis缓存
- API响应缓存
- 会话存储
- 热点数据缓存

### 2. 集群模式
- 多进程负载均衡
- CPU利用率最大化
- 故障自动转移

### 3. 数据库优化
- 连接池管理
- 查询优化
- 索引优化

---

## 🔄 更新部署

### PM2方式
```bash
# 拉取最新代码
git pull

# 安装依赖
npm install

# 重启服务（零停机）
pm2 restart foliostack-backend
```

### Docker方式
```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build

# 清理旧镜像
docker image prune -f
```

---

## 🛡️ 安全建议

1. **修改默认密码**: PostgreSQL、Redis密码
2. **启用HTTPS**: 配置Nginx SSL证书
3. **防火墙配置**: 限制端口访问
4. **定期备份**: 数据库和上传文件
5. **日志审计**: 定期检查异常日志

---

## 📞 技术支持

如遇问题，请检查：
1. 日志文件 (`./logs/`)
2. PM2状态 (`pm2 status`)
3. Docker容器状态 (`docker-compose ps`)
4. 健康检查端点 (`/api/health`)

---

## 🎯 生产环境检查清单

- [ ] 修改所有默认密码
- [ ] 配置HTTPS证书
- [ ] 启用防火墙规则
- [ ] 配置数据库备份
- [ ] 设置日志轮转
- [ ] 配置监控告警
- [ ] 测试故障恢复
- [ ] 文档化部署流程
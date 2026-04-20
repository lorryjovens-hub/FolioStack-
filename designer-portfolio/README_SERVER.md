# FolioStack - 持久化后端服务器架构

## 🎯 技术栈总览

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

## 🚀 快速开始

### Windows用户
双击运行 `start.bat`

### Linux/Mac用户
```bash
chmod +x start.sh
./start.sh
```

### 手动启动
```bash
# 安装PM2（首次运行）
npm install -g pm2

# 启动服务
npm start

# 查看状态
npm run status

# 查看日志
npm run logs

# 监控面板
npm run monit
```

---

## 📦 部署方式

### 方式一：PM2进程管理（推荐用于开发/测试）

**优点：**
- 简单易用
- 自动重启
- 零停机部署
- 实时监控

**启动命令：**
```bash
npm start          # 启动服务
npm run stop       # 停止服务
npm run restart    # 重启服务
npm run logs       # 查看日志
npm run monit      # 监控面板
npm run status     # 查看状态
```

### 方式二：Docker Compose（推荐用于生产）

**优点：**
- 环境隔离
- 一键部署
- 服务编排
- 易于扩展

**启动命令：**
```bash
docker-compose up -d        # 启动所有服务
docker-compose logs -f      # 查看日志
docker-compose ps           # 查看状态
docker-compose restart      # 重启服务
docker-compose down         # 停止服务
```

---

## 📊 监控和管理

### 健康检查端点
```bash
# 后端健康检查
curl http://localhost:3002/api/health

# 性能指标
curl http://localhost:3002/api/metrics

# 就绪检查
curl http://localhost:3002/api/ready
```

### PM2监控
```bash
pm2 monit              # 实时监控面板
pm2 logs               # 查看日志
pm2 show <app-name>    # 查看应用详情
pm2 flush              # 清空日志
pm2 reload all         # 零停机重载
```

### Docker监控
```bash
docker-compose ps                    # 查看容器状态
docker-compose logs -f <service>     # 查看服务日志
docker stats                         # 查看资源使用
```

---

## 🔧 配置文件

### PM2配置
- **文件**: `ecosystem.config.json`
- **集群模式**: 自动使用所有CPU核心
- **内存限制**: 1GB自动重启
- **日志管理**: 自动分割和归档

### 环境变量
- **文件**: `.env`
- **数据库**: PostgreSQL连接字符串
- **缓存**: Redis连接URL
- **安全**: JWT密钥配置

### Docker配置
- **Dockerfile**: 多阶段构建优化
- **docker-compose.yml**: 完整技术栈编排
- **.dockerignore**: 构建优化

---

## 📁 项目结构

```
designer-portfolio/
├── server/
│   ├── enhanced-server.js    # 增强版服务器
│   ├── cache.js              # Redis缓存管理
│   ├── db.js                 # 数据库管理
│   └── index.js              # 原始服务器
├── logs/                     # 日志文件
├── data/                     # 数据库文件
├── uploads/                  # 上传文件
├── ecosystem.config.json     # PM2配置
├── docker-compose.yml        # Docker编排
├── Dockerfile                # Docker镜像
├── start.bat                 # Windows启动脚本
├── start.sh                  # Linux/Mac启动脚本
└── DEPLOYMENT.md             # 详细部署文档
```

---

## 🛠️ 技术特性

### 1. 进程持久化
- **PM2守护进程**: 自动重启和故障恢复
- **集群模式**: 多进程负载均衡
- **内存监控**: 超限自动重启
- **优雅关闭**: 零停机重启

### 2. 健康检查
- **数据库连接检查**: 确保数据库可用
- **内存使用监控**: 防止内存泄漏
- **响应时间监控**: 性能异常检测
- **自定义检查**: 可扩展检查项

### 3. 性能监控
- **请求统计**: 总请求数、错误率
- **响应时间**: 平均响应时间
- **资源使用**: CPU、内存使用情况
- **实时指标**: `/api/metrics` 端点

### 4. 日志管理
- **结构化日志**: JSON格式日志
- **日志分割**: 按日期分割
- **错误追踪**: 完整错误堆栈
- **性能分析**: 请求耗时记录

### 5. 缓存优化
- **Redis缓存**: 热点数据缓存
- **会话存储**: 分布式会话
- **API缓存**: 响应缓存
- **缓存装饰器**: 简化缓存使用

---

## 🚨 故障排查

### 服务无法启动
1. 检查端口占用: `netstat -ano | findstr :3002`
2. 检查PM2状态: `pm2 status`
3. 查看错误日志: `pm2 logs --err`

### 数据库连接失败
1. 检查PostgreSQL状态: `docker-compose ps postgres`
2. 查看日志: `docker-compose logs postgres`
3. 重启服务: `docker-compose restart postgres`

### Redis连接失败
1. 检查Redis状态: `docker-compose ps redis`
2. 测试连接: `docker-compose exec redis redis-cli ping`
3. 重启服务: `docker-compose restart redis`

---

## 📈 性能优化建议

1. **启用Redis缓存**: 减少数据库查询
2. **使用集群模式**: 充分利用多核CPU
3. **配置连接池**: 数据库连接优化
4. **启用压缩**: 减少网络传输
5. **CDN加速**: 静态资源加速

---

## 📚 相关文档

- [详细部署文档](./DEPLOYMENT.md)
- [PM2官方文档](https://pm2.keymetrics.io/)
- [Docker官方文档](https://docs.docker.com/)
- [Redis官方文档](https://redis.io/documentation)

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

---

**FolioStack** - 强大、稳定、可扩展的作品集管理系统 🚀
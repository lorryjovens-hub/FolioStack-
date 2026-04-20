# 多阶段构建 - 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 复制package文件
COPY package*.json ./
COPY server/package*.json ./server/

# 安装依赖
RUN npm ci --only=production
RUN cd server && npm ci --only=production

# 复制源代码
COPY . .

# 构建前端（如果需要）
# RUN npm run build

# 生产阶段
FROM node:20-alpine

WORKDIR /app

# 安装PM2
RUN npm install -g pm2

# 复制依赖和代码
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/public ./public
COPY --from=builder /app/*.html ./
COPY --from=builder /app/*.js ./
COPY --from=builder /app/js ./js
COPY --from=builder /app/css ./css
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/data ./data
COPY --from=builder /app/ecosystem.config.json ./

# 创建日志目录
RUN mkdir -p logs uploads works extracted cloned-sites

# 暴露端口
EXPOSE 3002 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用PM2启动
CMD ["pm2-runtime", "start", "ecosystem.config.json", "--only", "foliostack-backend"]
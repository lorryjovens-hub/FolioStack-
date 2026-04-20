#!/bin/bash

echo "========================================"
echo "FolioStack 快速启动脚本"
echo "========================================"
echo

# 检查Node.js
echo "[1/4] 检查Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js 20+"
    exit 1
fi
echo "✅ Node.js已安装: $(node --version)"

# 检查PM2
echo
echo "[2/4] 检查PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2未安装，正在安装..."
    npm install -g pm2
    if [ $? -ne 0 ]; then
        echo "❌ PM2安装失败"
        exit 1
    fi
fi
echo "✅ PM2已安装: $(pm2 --version)"

# 安装依赖
echo
echo "[3/4] 安装项目依赖..."
if [ ! -d "node_modules" ]; then
    echo "正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
fi
echo "✅ 依赖已安装"

# 启动服务
echo
echo "[4/4] 启动服务..."
pm2 start ecosystem.config.json
if [ $? -ne 0 ]; then
    echo "❌ 服务启动失败"
    exit 1
fi

echo
echo "========================================"
echo "✅ 服务启动成功！"
echo "========================================"
echo
echo "📊 查看状态: npm run status"
echo "📝 查看日志: npm run logs"
echo "📈 监控面板: npm run monit"
echo
echo "🌐 访问地址:"
echo "   前端: http://localhost:3001"
echo "   后端: http://localhost:3002"
echo
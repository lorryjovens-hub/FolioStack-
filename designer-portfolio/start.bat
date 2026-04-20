@echo off
chcp 65001 >nul
echo ========================================
echo FolioStack 快速启动脚本
echo ========================================
echo.

echo [1/4] 检查Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js未安装，请先安装Node.js 20+
    pause
    exit /b 1
)
echo ✅ Node.js已安装

echo.
echo [2/4] 检查PM2...
pm2 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  PM2未安装，正在安装...
    npm install -g pm2
    if %errorlevel% neq 0 (
        echo ❌ PM2安装失败
        pause
        exit /b 1
    )
)
echo ✅ PM2已安装

echo.
echo [3/4] 安装项目依赖...
if not exist "node_modules" (
    echo 正在安装依赖...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
)
echo ✅ 依赖已安装

echo.
echo [4/4] 启动服务...
pm2 start ecosystem.config.json
if %errorlevel% neq 0 (
    echo ❌ 服务启动失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ 服务启动成功！
echo ========================================
echo.
echo 📊 查看状态: npm run status
echo 📝 查看日志: npm run logs
echo 📈 监控面板: npm run monit
echo.
echo 🌐 访问地址:
echo    前端: http://localhost:3001
echo    后端: http://localhost:3002
echo.
pause
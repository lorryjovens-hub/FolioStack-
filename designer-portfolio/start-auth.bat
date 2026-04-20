@echo off
chcp 65001 >nul
echo ========================================
echo FolioStack 登录注册系统启动脚本
echo ========================================
echo.

echo [1/3] 检查Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js未安装，请先安装Node.js 20+
    pause
    exit /b 1
)
echo ✅ Node.js已安装

echo.
echo [2/3] 安装依赖...
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
echo [3/3] 启动认证服务器...
echo.
echo ========================================
echo 认证服务器启动中...
echo ========================================
echo.

node server/auth-server.js

pause
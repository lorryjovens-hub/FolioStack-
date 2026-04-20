# FolioStack 诊断修复指南

## 🔧 已修复的问题

### 1. ✅ production-server.js 语法错误
**问题**: Line 282 字符串字面量错误
**修复**: 将 `masterLogger.info(\`Worker ${worker.process.pid} is online');` 改为 `masterLogger.info(\`Worker ${worker.process.pid} is online\`);`

---

## 📋 剩余诊断问题

### 2. TypeScript 模块导入错误

#### 问题描述
- App.tsx 找不到页面组件模块
- Layout.tsx 找不到 authStore 模块
- main.tsx 找不到 App.tsx 模块

#### 原因分析
这些错误通常是 TypeScript 语言服务器的问题，而不是实际的代码问题。文件都存在且导入路径正确。

#### 解决方案

**方法 1: 重启 TypeScript 服务器**
1. 在 VS Code 中按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac)
2. 输入 "TypeScript: Restart TS Server"
3. 选择并执行

**方法 2: 重新安装依赖**
```bash
# 删除 node_modules 和 lock 文件
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

**方法 3: 检查 TypeScript 版本**
```bash
# 查看当前版本
npm list typescript

# 如果版本过旧，更新到最新
npm install --save-dev typescript@latest
```

**方法 4: 清理 TypeScript 缓存**
```bash
# 删除 TypeScript 缓存
rm -rf node_modules/.cache
rm -rf .tsbuildinfo

# 重新构建
npm run build
```

---

### 3. dashboard.html 警告

#### 问题描述
Line 176: 还定义标准属性"line-clamp"以实现兼容性

#### 原因
这是一个 CSS 兼容性警告，提示应该同时使用标准属性和浏览器前缀属性。

#### 解决方案
找到 dashboard.html Line 176，添加标准属性：
```css
/* 修改前 */
-webkit-line-clamp: 2;

/* 修改后 */
-webkit-line-clamp: 2;
line-clamp: 2;
```

---

## 🚀 快速修复命令

### Windows PowerShell
```powershell
# 清理并重新安装
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

# 重启 TypeScript 服务器 (在 VS Code 中)
# Ctrl+Shift+P -> "TypeScript: Restart TS Server"
```

### Linux/Mac
```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install

# 重启 TypeScript 服务器 (在 VS Code 中)
# Cmd+Shift+P -> "TypeScript: Restart TS Server"
```

---

## ✅ 验证修复

### 1. 检查 TypeScript 错误
```bash
# 运行 TypeScript 编译检查
npm run build
```

### 2. 检查 ESLint 错误
```bash
# 运行 ESLint
npm run lint
```

### 3. 启动开发服务器
```bash
# 启动前端
npm run dev

# 启动后端 (新终端)
npm run server-prod
```

---

## 📊 诊断状态

| 问题 | 状态 | 优先级 |
|------|------|--------|
| production-server.js 语法错误 | ✅ 已修复 | 高 |
| TypeScript 模块导入错误 | ⚠️ 需重启 TS Server | 中 |
| dashboard.html CSS 警告 | ℹ️ 可选修复 | 低 |

---

## 🆘 如果问题仍然存在

### 1. 检查文件编码
确保所有文件使用 UTF-8 编码

### 2. 检查路径分隔符
Windows 使用反斜杠 `\`，Linux/Mac 使用正斜杠 `/`

### 3. 检查 Node.js 版本
```bash
node --version  # 应该是 20.x 或更高
npm --version   # 应该是 10.x 或更高
```

### 4. 检查环境变量
```bash
# 查看环境变量
echo $NODE_ENV  # Linux/Mac
echo %NODE_ENV% # Windows
```

---

## 📞 获取帮助

如果以上方法都无法解决问题：

1. **查看完整错误日志**
   ```bash
   npm run build 2>&1 | tee build.log
   ```

2. **检查 TypeScript 日志**
   - VS Code: 查看 "Output" -> "TypeScript" 面板

3. **提交 Issue**
   - 包含完整的错误信息
   - 包含 Node.js 和 npm 版本
   - 包含操作系统信息

---

**最后更新**: 2026-04-12
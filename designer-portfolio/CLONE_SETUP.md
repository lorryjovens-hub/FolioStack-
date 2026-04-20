# 网站克隆功能使用指南

## 功能概述

网站克隆功能集成了AI爬虫，支持：
- 高并发爬取网站图片和视频
- 完整克隆整个网站
- AI对话指导内容替换和改造
- 自定义样式和内容修改

## 安装依赖

```bash
npm install
```

## 配置环境变量

创建 `.env` 文件：

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3003
```

## 启动服务器

### 方式1: 单独启动克隆服务器

```bash
npm run server-clone
```

服务器将在 `http://localhost:3003` 启动

### 方式2: 同时启动主服务器和克隆服务器

打开两个终端窗口：

终端1:
```bash
npm run server
```

终端2:
```bash
npm run server-clone
```

## 使用步骤

1. **访问克隆页面**
   - 打开 `http://localhost:3003/clone-website.html`
   - 或从导航栏点击"克隆网站"

2. **配置爬虫参数**
   - 输入目标网站URL
   - 设置并发数（1-20）
   - 设置爬取深度（1-5）
   - 选择User-Agent
   - 勾选需要爬取的内容类型

3. **开始爬取**
   - 点击"开始爬取"按钮
   - 观察进度条和统计数据
   - 可以随时点击"停止爬取"

4. **AI内容改造**
   - 爬取完成后，在右侧对话框中输入改造指令
   - 例如："把公司名称换成我的名字，联系方式改成我的邮箱，把蓝色主题改成金色"
   - AI会自动修改HTML并预览

5. **保存和导出**
   - 在新窗口打开预览
   - 下载HTML文件
   - 保存到网站（生成可访问的链接）

## API端点

### POST /api/clone/start
启动网站克隆任务

**请求体:**
```json
{
  "url": "https://example.com",
  "concurrency": 5,
  "depth": 2,
  "timeout": 30,
  "userAgent": "chrome",
  "crawlHtml": true,
  "crawlCss": true,
  "crawlJs": true,
  "crawlImages": true,
  "crawlVideos": true,
  "crawlFonts": true
}
```

**响应:**
```json
{
  "cloneId": "uuid",
  "message": "爬取任务已启动"
}
```

### GET /api/clone/progress/:cloneId
获取克隆进度

**响应:**
```json
{
  "status": "crawling",
  "progress": 50,
  "message": "正在下载图片...",
  "stats": {
    "pages": 5,
    "images": 23,
    "videos": 2,
    "files": 30
  }
}
```

### GET /api/clone/result/:cloneId
获取克隆结果

**响应:**
```json
{
  "cloneId": "uuid",
  "html": "<!DOCTYPE html>...",
  "stats": {...}
}
```

### POST /api/clone/stop/:cloneId
停止克隆任务

### POST /api/clone/transform
AI改造HTML

**请求体:**
```json
{
  "html": "<!DOCTYPE html>...",
  "instructions": "把公司名称换成我的名字"
}
```

**响应:**
```json
{
  "html": "<!DOCTYPE html>..."
}
```

### POST /api/clone/save
保存网站

**请求体:**
```json
{
  "html": "<!DOCTYPE html>...",
  "cloneId": "uuid",
  "title": "克隆网站"
}
```

**响应:**
```json
{
  "siteId": "site_1234567890",
  "subRoute": "user123/site_1234567890",
  "fullUrl": "http://localhost:3003/sites/user123/site_1234567890",
  "message": "保存成功"
}
```

## AI指令示例

### 替换内容
- "把公司名称换成'我的设计工作室'"
- "把contact@example.com改成myemail@example.com"
- "把所有'我们'改成'我'"

### 修改样式
- "把蓝色主题改成金色"
- "把背景改成深色模式"
- "增加字体大小"

### 布局调整
- "把导航栏放在顶部"
- "调整图片大小"
- "移除侧边栏"

### 添加内容
- "在页脚添加版权信息"
- "添加联系表单"
- "在顶部添加logo"

## 技术栈

- **后端**: Node.js + Express
- **爬虫**: Puppeteer
- **HTML解析**: Cheerio
- **AI**: OpenAI GPT-4
- **并发控制**: Promise.all + 并发限制

## 注意事项

1. 确保目标网站允许爬虫访问
2. 遵守robots.txt规则
3. 合理设置并发数，避免对目标服务器造成压力
4. 首次使用需要安装Puppeteer浏览器（约100-200MB）
5. OpenAI API需要有效密钥才能使用完整AI功能

## 故障排除

### Puppeteer安装失败
```bash
npm install puppeteer --unsafe-perm=true
```

### 端口被占用
修改 `.env` 文件中的 `PORT` 或关闭占用端口的程序

### 爬取失败
- 检查目标URL是否可访问
- 增加超时时间
- 尝试不同的User-Agent

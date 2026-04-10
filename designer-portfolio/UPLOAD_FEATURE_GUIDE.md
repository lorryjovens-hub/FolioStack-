# FolioStack 作品上传功能使用指南

## 概述

FolioStack 现在支持多种作品上传方式，包括文件上传、ZIP文件解析、以及Netlify/Vercel链接上传。

## 支持的上传方式

### 1. 文件上传

**API端点**: `POST /api/upload`

**功能**: 上传单个文件（支持HTML、JS、CSS、ZIP等）

**请求方式**: `multipart/form-data`

**参数**:
- `file`: 文件（必填）

**示例**:
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch('/api/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('上传成功:', data.fileUrl);
});
```

**响应**:
```json
{
  "success": true,
  "fileUrl": "/uploads/uuid_filename.html",
  "filename": "index.html",
  "size": 1024,
  "mimetype": "text/html"
}
```

### 2. ZIP文件解析

**API端点**: `POST /api/upload/zip`

**功能**: 上传ZIP文件并自动解压，支持完整网站项目上传

**请求方式**: `multipart/form-data`

**参数**:
- `file`: ZIP文件（必填）

**示例**:
```javascript
const formData = new FormData();
formData.append('file', zipFileInput.files[0]);

fetch('/api/upload/zip', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('ZIP解压成功:', data.previewUrl);
  console.log('文件列表:', data.files);
});
```

**响应**:
```json
{
  "success": true,
  "workId": "uuid",
  "previewUrl": "/extracted/uuid/index.html",
  "files": [
    {
      "name": "index.html",
      "path": "index.html",
      "size": 1024,
      "type": "html"
    },
    {
      "name": "style.css", 
      "path": "css/style.css",
      "size": 512,
      "type": "css"
    }
  ],
  "fileCount": 2
}
```

### 3. Netlify/Vercel/GitHub链接上传

**API端点**: `POST /api/upload/url`

**功能**: 上传Netlify、Vercel部署的项目链接或GitHub仓库链接

**请求方式**: `application/json`

**参数**:
- `url`: 项目链接（必填，支持http/https）
- `platform`: 平台类型（必填，支持：netlify, vercel, github, custom）

**示例 - Netlify/Vercel**:
```javascript
fetch('/api/upload/url', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://your-project.netlify.app',
    platform: 'netlify'
  })
})
.then(response => response.json())
.then(data => {
  console.log('链接上传成功:', data.previewUrl);
});
```

**示例 - GitHub**:
```javascript
fetch('/api/upload/url', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://github.com/username/repository',
    platform: 'github'
  })
})
.then(response => response.json())
.then(data => {
  console.log('GitHub项目上传成功:', data.previewUrl);
  console.log('原始仓库链接:', data.url);
});
```

**响应**:
```json
{
  "success": true,
  "url": "https://your-project.netlify.app",
  "platform": "netlify",
  "previewUrl": "https://your-project.netlify.app"
}
```

## 静态文件访问

上传的文件可以通过以下路径访问：

- **普通文件**: `http://localhost:3001/uploads/{filename}`
- **解压文件**: `http://localhost:3001/extracted/{workId}/{filepath}`

## 文件类型限制

支持上传的文件类型：
- ZIP文件：`application/zip`, `application/x-zip-compressed`
- HTML文件：`text/html`
- JavaScript文件：`application/javascript`
- CSS文件：`text/css`

## 文件大小限制

- 单个文件最大：50MB
- ZIP文件解压后无限制（取决于服务器存储空间）

## 与作品创建集成

在创建作品时，可以使用上传返回的URL：

```javascript
// 1. 先上传文件
const uploadResponse = await fetch('/api/upload/zip', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token },
  body: formData
});
const uploadData = await uploadResponse.json();

// 2. 然后创建作品
await fetch('/api/works', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: '我的作品',
    description: '作品描述',
    url: uploadData.previewUrl,
    category: 'Web设计',
    tags: ['前端', 'React'],
    source: 'upload' // 使用upload表示通过文件上传
  })
});
```

## 注意事项

1. 所有上传功能需要用户登录认证
2. 文件上传后会保存在服务器，请注意文件大小限制
3. ZIP文件会自动解压到独立目录，确保项目结构完整
4. Netlify/Vercel链接上传需要确保链接可公开访问
5. 上传的文件会自动生成唯一文件名，避免重复

## 故障排除

如果遇到上传问题：
1. 检查文件大小是否超过50MB限制
2. 确认文件类型是否支持
3. 检查网络连接是否稳定
4. 查看服务器日志获取详细错误信息
5. 联系管理员获取技术支持

## 更新日志

- 2026-04-09: 添加文件上传、ZIP解析、链接上传功能
- 支持静态文件服务和预览功能
- 集成到现有作品创建流程
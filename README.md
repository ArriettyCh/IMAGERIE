# BS 体系软件设计大程：图片管理网站

## 快速开始

### 1. 安装依赖

```bash
# 在项目根目录
npm install

# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 2. 配置数据库

#### 方式一：使用本地MySQL

1. 确保MySQL服务已启动
2. 创建数据库：

```sql
CREATE DATABASE image_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. 在 `backend` 目录下创建 `.env` 文件：
```bash
cd backend
cp .env.example .env
```

4. 编辑 `.env` 文件，修改数据库连接信息：
```env
DATABASE_URL="mysql://你的用户名:你的密码@localhost:3306/image_manager?schema=public"
JWT_SECRET="请修改为一个随机字符串"

# 地理编码API配置（可选，但强烈推荐配置以获得更准确的中国地区定位）
# 高德地图API密钥（推荐）：https://console.amap.com/dev/key/app
# 重要：必须申请"Web服务"类型的API密钥（不是"Web端(JS API)"）
AMAP_API_KEY="你的高德地图API密钥"

# 或使用百度地图API密钥（备用）：https://lbsyun.baidu.com/apiconsole/key
# BAIDU_API_KEY="你的百度地图API密钥"
```

**注意**：
- 如果不配置API密钥，系统仍可使用Nominatim服务，但中国地区的定位精度可能较低。
- 配置高德或百度地图API密钥后，系统会自动进行坐标转换（WGS-84转GCJ-02），大幅提升中国地区的定位准确性。
- **高德地图Web服务API不需要安全密钥**：Web服务API只需要配置 `AMAP_API_KEY` 即可，不需要配置安全密钥（安全密钥仅用于JS API）。
- **如果遇到 `fetch failed` 或网络连接错误**：
  1. **检查API密钥类型**：必须申请 **"Web服务"** 类型的API密钥（不是"Web端(JS API)"）。在高德开放平台控制台，确保你的key类型是"Web服务"。
  2. **检查IP白名单**：如果配置了IP白名单，需要将服务器IP添加到白名单中。开发环境可以暂时不配置白名单。
  3. **检查网络连接**：确保服务器能够访问 `restapi.amap.com`。
  4. **检查Node.js版本**：确保Node.js版本 >= 18.0.0（fetch API需要）。

#### 方式二：使用Docker（推荐）

```bash
# 只启动MySQL
docker-compose up -d mysql
```

然后按照方式一的步骤3-4配置 `.env` 文件，但使用以下连接信息：
```env
DATABASE_URL="mysql://appuser:apppassword@localhost:3306/image_manager?schema=public"
```

### 3. 初始化数据库

```bash
cd backend

# 生成Prisma客户端
npm run prisma:generate

# 运行数据库迁移
npm run prisma:migrate
```

### 4. 启动开发服务器

#### 方式一：分别启动

```bash
# 终端1：启动后端
cd backend
npm run dev

# 终端2：启动前端
cd frontend
npm run dev
```

#### 方式二：使用根目录脚本

```bash
# 在项目根目录
npm run dev
```

### 5. 访问应用

- 前端：http://localhost:3000
- 后端API：http://localhost:3001

## 常见问题

### 问题1：数据库连接失败

**错误信息**：`Can't reach database server`

**解决方法**：
1. 检查MySQL服务是否运行：`mysql -u root -p`
2. 确认 `.env` 文件中的 `DATABASE_URL` 正确
3. 检查防火墙设置

### 问题2：Prisma客户端未生成

**错误信息**：`@prisma/client did not initialize yet`

**解决方法**：
```bash
cd backend
npm run prisma:generate
```

### 问题3：端口被占用

**解决方法**：
- 修改 `backend/.env` 中的 `PORT`
- 修改 `frontend/vite.config.ts` 中的 `server.port`

### 问题4：npm install 失败

**解决方法**：
1. 清除缓存：`npm cache clean --force`
2. 删除 `node_modules` 和 `package-lock.json`
3. 重新安装：`npm install`

## Docker部署

### 完整部署（包含前后端）

```bash
# 构建并启动所有服务
docker-compose up -d

# 初始化数据库（首次运行）
docker exec -it image-manager-backend sh
npm run prisma:migrate
exit

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 仅部署MySQL

```bash
docker-compose up -d mysql
```

## 开发工具

### Prisma Studio（数据库可视化工具）

```bash
cd backend
npm run prisma:studio
```

访问 http://localhost:5555 查看和编辑数据库数据。



## 项目简介

这是一个基于现代Web技术栈开发的图片管理网站，支持用户注册登录、图片上传、EXIF信息提取、标签管理、图片检索等功能。

## 技术栈

### 后端
- **Node.js** + **Express** + **TypeScript** - 服务器框架
- **Prisma** - ORM数据库管理
- **MySQL** - 关系型数据库
- **JWT** - 用户认证
- **bcryptjs** - 密码加密
- **express-validator** - 数据验证

### 前端
- **React** + **TypeScript** - UI框架
- **Vite** - 构建工具
- **React Router** - 路由管理
- **Zustand** - 状态管理
- **Axios** - HTTP客户端

### 部署
- **Docker** + **Docker Compose** - 容器化部署

## 项目结构

```
ZJU-25-BS/
├── backend/                 # 后端代码
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   ├── middleware/      # 中间件
│   │   ├── routes/          # 路由
│   │   ├── utils/           # 工具函数
│   │   └── server.ts        # 服务器入口
│   ├── prisma/
│   │   └── schema.prisma    # 数据库模型
│   ├── Dockerfile
│   └── package.json
├── frontend/                # 前端代码
│   ├── src/
│   │   ├── components/      # 组件
│   │   ├── pages/           # 页面
│   │   ├── store/           # 状态管理
│   │   └── main.tsx         # 入口文件
│   ├── Dockerfile
│   └── package.json
├── database/
│   └── init.sql            # 数据库初始化脚本
├── docker-compose.yml      # Docker编排配置
└── README.md
```

## 环境配置

### 前置要求

1. **Node.js** >= 18.0.0
2. **MySQL** >= 8.0（或使用Docker）
3. **npm** 或 **yarn**
4. **Docker** 和 **Docker Compose**（可选，用于容器化部署）

### 本地开发环境配置

#### 1. 安装依赖

在项目根目录和子目录分别安装依赖：

```bash
# 安装根目录依赖
npm install

# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

#### 2. 配置数据库

**方式一：使用本地MySQL**

1. 创建MySQL数据库：
```sql
CREATE DATABASE image_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. 配置后端环境变量：
```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件，修改数据库连接：
```env
DATABASE_URL="mysql://用户名:密码@localhost:3306/image_manager?schema=public"
JWT_SECRET="your-secret-key-change-this-in-production"

# 地理编码API配置（可选，但强烈推荐配置以获得更准确的中国地区定位）
# 高德地图API密钥（推荐）：https://console.amap.com/dev/key/app
# 重要：必须申请"Web服务"类型的API密钥（不是"Web端(JS API)"）
AMAP_API_KEY="你的高德地图API密钥"

# 或使用百度地图API密钥（备用）：https://lbsyun.baidu.com/apiconsole/key
# BAIDU_API_KEY="你的百度地图API密钥"
```

**注意**：
- 如果不配置API密钥，系统仍可使用Nominatim服务，但中国地区的定位精度可能较低。
- 配置高德或百度地图API密钥后，系统会自动进行坐标转换（WGS-84转GCJ-02），大幅提升中国地区的定位准确性。
- **高德地图Web服务API不需要安全密钥**：Web服务API只需要配置 `AMAP_API_KEY` 即可，不需要配置安全密钥（安全密钥仅用于JS API）。
- **如果遇到 `fetch failed` 或网络连接错误**：
  1. **检查API密钥类型**：必须申请 **"Web服务"** 类型的API密钥（不是"Web端(JS API)"）。在高德开放平台控制台，确保你的key类型是"Web服务"。
  2. **检查IP白名单**：如果配置了IP白名单，需要将服务器IP添加到白名单中。开发环境可以暂时不配置白名单。
  3. **检查网络连接**：确保服务器能够访问 `restapi.amap.com`。
  4. **检查Node.js版本**：确保Node.js版本 >= 18.0.0（fetch API需要）。

**方式二：使用Docker Compose（推荐）**

直接使用docker-compose启动MySQL：
```bash
docker-compose up -d mysql
```

#### 3. 初始化数据库

```bash
cd backend

# 生成Prisma客户端
npm run prisma:generate

# 运行数据库迁移
npm run prisma:migrate
```

#### 4. 启动开发服务器

**方式一：分别启动前后端**

```bash
# 终端1：启动后端
cd backend
npm run dev

# 终端2：启动前端
cd frontend
npm run dev
```

**方式二：使用根目录脚本（需要先安装根目录依赖）**

```bash
# 在项目根目录
npm run dev
```

访问：
- 前端：http://localhost:3000
- 后端API：http://localhost:3001

### Docker部署

#### 1. 构建并启动所有服务

```bash
docker-compose up -d
```

#### 2. 初始化数据库（首次运行）

```bash
# 进入后端容器
docker exec -it image-manager-backend sh

# 运行数据库迁移
npm run prisma:migrate
```

#### 3. 查看日志

```bash
docker-compose logs -f
```

#### 4. 停止服务

```bash
docker-compose down
```

## 已实现功能

### 用户系统 ✅
- [x] 用户注册（用户名、邮箱唯一性验证，密码长度验证）
- [x] 用户登录（JWT认证）
- [x] 用户信息获取
- [x] 前端路由保护
- [x] 移动端适配

## 待实现功能

### 核心功能
- [ ] 图片上传（支持PC和移动端）
- [ ] EXIF信息提取（时间、地点、分辨率等）
- [ ] 自定义标签管理
- [ ] 缩略图生成
- [ ] 图片查询界面（多条件检索）
- [ ] 图片展示界面（轮播等）
- [ ] 图片编辑功能（裁剪、色调调整）
- [ ] 图片删除功能

### 增强功能
- [ ] AI模型图片分析（自动标签）
- [ ] MCP接口（大模型对话检索）

## API文档

### 认证相关

#### 注册
```
POST /api/auth/register
Body: {
  username: string (>=6字符),
  email: string (有效邮箱),
  password: string (>=6字符)
}
```

#### 登录
```
POST /api/auth/login
Body: {
  email: string,
  password: string
}
```

#### 获取当前用户
```
GET /api/auth/me
Headers: {
  Authorization: Bearer <token>
}
```

## 开发说明

### 数据库管理

使用Prisma管理数据库：

```bash
# 查看数据库（Prisma Studio）
npm run prisma:studio

# 创建新的迁移
npm run prisma:migrate

# 重置数据库（谨慎使用）
npx prisma migrate reset
```

### 代码规范

- 使用TypeScript进行类型检查
- 遵循ESLint规则
- 提交前运行 `npm run lint` 检查代码

## 常见问题

### 1. 数据库连接失败

- 检查MySQL服务是否运行
- 确认`.env`文件中的数据库连接信息正确
- 检查防火墙设置

### 2. Prisma客户端未生成

```bash
cd backend
npm run prisma:generate
```

### 3. 端口被占用

修改`backend/.env`中的`PORT`或`frontend/vite.config.ts`中的端口配置

## 提交要求

- [x] Git版本管理
- [x] Docker容器配置
- [ ] 功能演示视频
- [ ] 设计文档
- [ ] 使用手册
- [ ] 测试报告

## 许可证

本项目仅用于课程作业。

FROM node:20-alpine

WORKDIR /app

# 安装系统依赖（Prisma 需要 OpenSSL）
RUN apk add --no-cache openssl

# 复制package文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖
RUN npm install

# 生成Prisma客户端
RUN npx prisma generate

# 复制源代码
COPY . .

# 构建
RUN npm run build

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["npm", "start"]


FROM node:20-slim

WORKDIR /app

# 安装前端依赖
COPY package.json package-lock.json* ./
RUN npm install

# 安装后端依赖（构建前需要）
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --production=false

# 复制全部代码并构建
COPY . .
RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]

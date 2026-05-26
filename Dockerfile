FROM node:20-slim

WORKDIR /app

# 安装前端依赖并构建
COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# 安装后端依赖
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --production=false

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]

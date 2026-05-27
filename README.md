# 后台管理系统

基于 Vue3 + TypeScript + Element Plus 的后台管理系统，包含登录、数据仪表盘、用户管理等功能。

## 技术栈

- **框架：** Vue 3 + TypeScript + Composition API
- **构建工具：** Vite
- **UI 组件库：** Element Plus
- **状态管理：** Pinia
- **图表：** ECharts
- **路由：** Vue Router

## 功能特性

- 登录认证：表单验证 + 路由守卫
- 数据仪表盘：统计卡片 + 折线图 + 饼图
- 用户管理：搜索 + 分页 + 新增/编辑/删除 CRUD
- 响应式布局：侧边栏可折叠

## 测试账号

- 用户名：`admin`
- 密码：`123456`

## 本地运行

```bash
# 克隆项目
git clone https://github.com/WadePan1017/Public.git
cd Public

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 项目结构

```
src/
├── api/              # API 接口
├── assets/           # 静态资源
├── components/       # 公共组件
├── layouts/          # 布局组件
│   └── MainLayout.vue
├── router/           # 路由配置
│   └── index.ts
├── stores/           # Pinia 状态管理
│   └── user.ts
├── utils/            # 工具函数
├── views/            # 页面视图
│   ├── login/        # 登录页
│   ├── dashboard/    # 数据仪表盘
│   └── users/        # 用户管理
├── App.vue
├── main.ts
└── style.css
```

## 联系方式

- GitHub: [WadePan1017](https://github.com/WadePan1017)
- 邮箱: 2455177610@qq.com


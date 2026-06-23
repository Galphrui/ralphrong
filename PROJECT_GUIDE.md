# Ra Android Notes 项目说明

这份文档说明 Ra Android Notes 的代码结构、各模块职责、本地开发、构建、发布和部署流程。项目本质是一个 React + Vite 静态博客，公开数据放在 `data/posts.json`，后台管理页面通过本地服务或 Cloudflare Worker 写入数据。

## 目录结构

```text
.
├── src/                    # 前台 React 源码
├── data/                   # 博客数据和后台账号数据
├── worker/                 # Cloudflare Worker 后台 API
├── backend/                # 早期后端示例代码
├── index.html              # Vite 前台入口
├── admin.html              # 后台管理页
├── login.html              # 后台登录页
├── admin.js                # 后台管理逻辑
├── login.js                # 登录页逻辑
├── admin-config.js         # 外网后台 API 地址配置
├── local-admin-server.mjs  # 本地后台服务
├── vite.config.js          # Vite 构建和 GitHub Pages base 配置
├── tailwind.config.js      # 主题色、背景、阴影等 Tailwind 配置
└── package.json            # npm 脚本和依赖
```

## 前台代码说明

`src/App.jsx`

负责应用入口、路由判断和数据加载。项目使用 hash 路由：`#post/文章slug` 打开文章详情，`#profile` 打开个人页，默认显示首页。这里会调用 `fetchSiteData()` 读取文章、标签和简历数据，并写入全局 store。

`src/components/Navigation.jsx`

顶部导航栏。左侧显示 Ra 标识和站点名称，右侧是“文章 / 个人 / 管理”。“文章”跳到首页文章区域，“个人”跳到简历页面，“管理”打开后台页面。

`src/components/HomePage.jsx`

首页三栏布局。左侧是 Ra 个人信息和访问记录，中间是欢迎区和文章列表，右侧是文章统计和主题聚焦。桌面端使用 `xl:grid-cols-[240px_minmax(0,1fr)_240px]`，让左右信息栏从首屏开始出现在主内容两侧。

`src/components/Hero.jsx`

首页欢迎区。这里控制主标题、副标题、网格背景和顶部品牌色线条。欢迎词、主题表达和 Hero 大小主要在这个文件里改。

`src/components/PostList.jsx`

文章列表容器。负责搜索、标签筛选、空状态和文章卡片渲染。搜索会匹配标题、摘要和标签。

`src/components/PostCard.jsx`

单篇文章卡片。控制文章列表里的日期、阅读时长、标题、摘要和标签。点击卡片会跳转到 `#post/slug`。

`src/components/PostDetail.jsx`

文章详情页。根据当前 slug 找到文章并渲染 Markdown 风格内容。文章里的 `##`、代码块和列表在这里被转换成页面结构。

`src/components/ProfilePage.jsx`

个人简历页。数据来自 `data/posts.json` 的 `profile` 字段，用于展示姓名、方向、联系方式、技能、工作经历、项目经历、教育经历和自我评价。

`src/components/VisitStats.jsx`

访问记录卡片。当前使用 `localStorage` 在本机记录访问次数、访问人数和最近访问时间。它不是全站真实 UV 统计，只代表当前浏览器本地记录。

`src/components/TagFilter.jsx`

标签筛选按钮。标签来自所有文章的 `tags` 字段，点击后会更新 store 中的 `selectedTag`。

`src/store/useStore.js`

全局状态管理，使用 Zustand。保存文章列表、标签、搜索关键词、当前筛选标签、加载状态、错误状态和个人简历。

`src/utils/api.js`

数据读取层。本地开发时读取 `/data/posts.json`，线上环境读取 GitHub raw 地址，避免 GitHub Pages 缓存静态 JSON 后不及时更新。

## 样式说明

`tailwind.config.js`

定义 Ra 主题色、强调色、品牌渐变、背景渐变、网格背景、阴影和动画。想整体换色，优先改这里。

`src/styles/globals.css`

引入 Tailwind 的 base、components、utilities，并定义少量复用类，例如 `glass-effect` 和 `gradient-text`。

## 数据文件说明

`data/posts.json`

公开博客数据。主要字段：

```json
{
  "site": {},
  "posts": [],
  "profile": {}
}
```

每篇文章包含：

```json
{
  "slug": "unique-post-slug",
  "title": "文章标题",
  "date": "2026-06-23",
  "tags": ["Android", "Ra记录"],
  "summary": "文章摘要",
  "readingMinutes": 5,
  "content": "Markdown 风格正文"
}
```

`data/admin-users.json`

后台账号数据，只保存 PBKDF2 加盐哈希，不保存明文密码。账号管理建议只在本地后台完成。

文件中还包含 `resetCode`，用于登录页找回密码。它同样只保存 PBKDF2 哈希，不保存明文重置指令。登录后台后，可以在“账号管理”面板更新重置指令。

## 后台代码说明

`login.html` / `login.js`

后台登录页。本地环境可以注册账号；线上环境只允许已经存在的账号登录。

`admin.html` / `admin.js`

后台管理页。用于新增、编辑、删除文章，也可以编辑个人简历。发布时会写入 `data/posts.json`。

“账号管理”面板可以配置登录页的重置指令。本地后台还可以新增账号、删除账号和直接重置账号密码；外网后台只开放重置指令配置。

`admin-config.js`

外网后台 API 地址配置。部署 Cloudflare Worker 后，把 Worker 地址写到：

```js
window.BLOG_ADMIN_API_BASE = "https://ralphrong-blog-admin.ralphrong.workers.dev";
```

`local-admin-server.mjs`

本地后台服务。启动后会托管前台、后台和本地 API，用于本地注册账号、编辑文章和写入数据文件。

`worker/admin-worker.js`

Cloudflare Worker API。线上后台通过它完成登录验证和写入 GitHub 仓库。GitHub token 只保存在 Worker Secret 中，不暴露给浏览器。

## 本地开发

安装依赖：

```bash
npm install
```

启动前台开发服务：

```bash
npm run dev
```

访问：

```text
http://localhost:5173/
```

启动本地后台服务：

```bash
node local-admin-server.mjs
```

访问：

```text
http://localhost:8080/admin.html
```

## 构建

执行：

```bash
npm run build
```

构建成功后会生成：

```text
dist/
```

`dist` 是最终可部署的静态站点产物。GitHub Pages 工作流也是执行这个命令后上传 `dist`。

## 本地预览构建产物

如果需要检查生产构建效果：

```bash
npm run build
npm run preview
```

然后访问 Vite 输出的本地地址。

## 发布文章

本地后台发布：

1. 启动 `node local-admin-server.mjs`。
2. 打开 `http://localhost:8080/admin.html`。
3. 登录后台。
4. 新增或编辑文章。
5. 点击发布，内容写入 `data/posts.json`。
6. 执行构建检查。
7. 提交并推送。

命令：

```bash
npm run build
git add data/posts.json
git commit -m "update blog content"
git push origin main
```

PDF 导入文章时要先做脱敏检查，不要公开账号、密码、token、内网地址、VPN、代理配置等内容。

## 发布个人简历

个人页数据在 `data/posts.json` 的 `profile` 字段。可以通过后台简历编辑页修改，也可以手动修改 JSON。修改后同样需要：

```bash
npm run build
git add data/posts.json
git commit -m "update Ra profile"
git push origin main
```

## GitHub Pages 部署

仓库部署方式：

1. GitHub 仓库进入 `Settings`。
2. 进入 `Pages`。
3. Source 选择 `GitHub Actions`。
4. 推送到 `main`。
5. GitHub Actions 执行构建并上传 `dist`。
6. 部署完成后访问公开站点。

公开地址：

```text
https://galphrui.github.io/ralphrong/
```

注意：不要把 Pages 配成 `Deploy from a branch` 的 `main / root`。这个项目必须先由 Vite 构建成 `dist`，直接托管仓库根目录会导致页面空白。

## 外网后台部署

外网后台需要 Cloudflare Worker：

```bash
npm install -g wrangler
wrangler login
wrangler secret put SESSION_SECRET
wrangler secret put GITHUB_TOKEN
wrangler deploy
```

Secret 说明：

- `SESSION_SECRET`：会话签名密钥，可以用 `openssl rand -hex 32` 生成。
- `GITHUB_TOKEN`：GitHub fine-grained token，只给 `Galphrui/ralphrong` 仓库 `Contents: Read and write` 权限。

部署完成后更新 `admin-config.js`，再提交推送。之后外网后台可以编辑文章并写回 GitHub。

## 常用维护命令

查看当前改动：

```bash
git status --short
git diff --stat
```

构建检查：

```bash
npm run build
```

提交内容：

```bash
git add 文件名
git commit -m "说明本次修改"
git push origin main
```

查看最新 GitHub Actions：

```bash
gh api repos/Galphrui/ralphrong/actions/runs --jq '.workflow_runs[0] | {name,status,conclusion,html_url}'
```

## 常见问题

页面空白：

- 检查 GitHub Pages 是否使用 `GitHub Actions`。
- 检查 `vite.config.js` 的 `base` 是否为 `/ralphrong/`。
- 检查浏览器控制台是否有 JS 或资源 404。
- 运行 `npm run build` 看是否构建失败。

文章数不对：

- 检查 `data/posts.json` 是否格式正确。
- 检查 `posts` 数组是否为空。
- 检查文章是否缺少 `slug`、`title`、`content`。
- 线上可能有缓存，稍等 GitHub raw 数据更新后再刷新。

后台登录失败：

- 本地先确认 `data/admin-users.json` 有账号。
- 线上确认 Worker Secret 配置完整。
- 确认 `admin-config.js` 指向正确 Worker 地址。

外网后台发布失败：

- 检查 GitHub token 是否有 `Contents: Read and write`。
- 检查 Worker 日志。
- 检查目标仓库和分支是否正确。

# Ra Android Notes

这是一个可部署到 GitHub Pages 的 Ra Android 工程笔记站。前台是静态页面，文章数据保存在 `data/posts.json`；后台账号密码以 PBKDF2 加盐哈希形式保存在 `data/admin-users.json`。

完整代码结构、模块职责、构建、发布和部署流程见：

```text
PROJECT_GUIDE.md
```

## 本地开发

项目本地开发依赖本地后台。直接用一条命令启动完整环境：

```bash
npm run dev
```

这个命令会先运行配置校验，自动补齐缺失的本地数据文件和模块配置，然后同时启动：

- 前台：`http://127.0.0.1:5173/`
- 后台：`http://127.0.0.1:3001/login.html`
- API：`http://127.0.0.1:3001/api`

只想检查配置是否完整：

```bash
npm run verify:config
```

校验脚本会检查并补齐：

- `data/posts.json` 里的 `modules`、`repositories` 等结构。
- `data/messages.json` 本地留言存储。
- `data/post-metrics.json` 本地文章点击/点赞存储。
- Android 和 iOS 内置离线数据。

只启动前台 Vite 服务时使用：

```bash
npm run dev:web
```

注意：前台的 `/api` 会代理到 `http://localhost:3001`，所以完整功能仍需要本地后台运行。

## 后台账号体系

账号控制只在本地进行，外网后台只允许已经注册过的账号登录和管理博客内容。

后台拆成两个独立页面：

- `login.html`：登录页，本地环境可以注册账号。
- `admin.html`：管理页，未登录会跳转到 `login.html`。

后台页面的 id/class/data 标识统一使用 `Ra` 前缀，方便你后续按自己的风格改样式。

本地启动后台：

```bash
npm run backend
```

访问：

```text
http://127.0.0.1:3001/admin.html
```

首次使用打开 `login.html` 点击“本地注册账号”。本地后台还提供账号管理，可以新增账号、重置密码、删除账号。账号数据会写入：

```text
data/admin-users.json
```

这个文件只保存 PBKDF2 加盐哈希，不保存明文密码。提交到 GitHub 后，仓库里看到的也是哈希后的账号数据。

加密规则：

- 算法：PBKDF2
- 哈希：SHA-256
- salt：16 字节随机数，hex 存储
- iterations：100000（Cloudflare Worker PBKDF2 支持的上限）
- 输出：32 字节 hash，hex 存储

本地账号管理后执行：

```bash
git add data/admin-users.json
git commit -m "update admin accounts"
git push
```

外网后台会读取 GitHub 上的 `data/admin-users.json` 来验证登录。

如果忘记密码，可以在登录页点击“重置密码”，输入账号、新密码、确认密码和重置指令。重置指令本身以 PBKDF2 哈希形式保存在 `data/admin-users.json`，登录后台后可以在“账号管理”里更新这条指令。

## 外网后台管理

外网后台地址：

```text
https://galphrui.github.io/ralphrong/admin.html
```

外网登录页：

```text
https://galphrui.github.io/ralphrong/login.html
```

GitHub Pages 是纯静态托管，不能单独安全地完成登录和写入。因此外网后台需要部署 `worker/admin-worker.js` 作为 API：

- 登录时 Worker 从 GitHub 读取 `data/admin-users.json`，用哈希验证账号密码。
- 如果旧账号哈希超过 Cloudflare Worker 的 PBKDF2 上限，登录页会引导用重置指令迁移密码；没有 `GITHUB_TOKEN` 时，Worker 会把迁移后的账号哈希写入 KV，后续外网登录直接使用 KV 覆盖项。
- Worker 不提供注册、删号、改密码接口。
- Worker 使用 GitHub token secret 写入 `data/posts.json`，token 不暴露给浏览器。

部署 Worker：

```bash
npm install -g wrangler
wrangler login
wrangler secret put SESSION_SECRET
wrangler secret put GITHUB_TOKEN
wrangler deploy
```

其中：

- `SESSION_SECRET` 可以用 `openssl rand -hex 32` 生成。
- `GITHUB_TOKEN` 使用 fine-grained token，Repository access 选择 `Galphrui/ralphrong`，Contents 设置为 `Read and write`。

部署 Worker 后，将 Worker 地址写入 `admin-config.js`：

```js
window.BLOG_ADMIN_API_BASE = "https://ralphrong-blog-admin.ralphrong.workers.dev";
```

然后提交并推送。外网后台就能用本地注册过的账号登录和编辑文章。

如果在本地后台编辑文章、站点信息或简历，点击“发布到外网”会写入本地 `data/posts.json`，并通过本地后台服务自动执行 `git add`、`git commit`、`git push`。GitHub Actions 随后会重新构建 GitHub Pages。

## 外网访问

公开博客地址：

```text
https://galphrui.github.io/ralphrong/
```

Cloudflare Worker 示例：

```text
worker/admin-worker.js
```

账号管理仍然只通过本地后台完成。

## GitHub Pages 部署

1. 将仓库设为 public。
2. 进入仓库 `Settings` -> `Pages`。
3. Source 选择 `GitHub Actions`。
4. 推送到 `main` 后，`.github/workflows/deploy.yml` 会自动执行 `npm run build` 并上传 `dist`。
5. 保存后等待 GitHub Pages 生成访问地址。

不要把 Pages 配成 `Deploy from a branch` 的 `main / root`。当前前台入口是 React + Vite 源码，必须先构建成 `dist` 后再部署；直接托管仓库根目录会导致浏览器加载未编译的 `/src/main.jsx`，页面可能一片空白。

`vite.config.js` 会在构建结束时把 `admin.html`、`login.html`、后台脚本、样式和数据文件复制到 `dist`。如果外网访问 `/admin.html` 出现 404，优先检查这一步是否在最新构建里执行。

## 数据文件

- `data/posts.json`：公开博客文章数据，前台会直接读取。
- `data/admin-users.json`：本地后台账号数据，只保存加盐哈希。

## 本地开发

```bash
node local-admin-server.mjs
```

同一个服务会同时提供前台页面、后台页面和本地 API。

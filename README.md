# Ralph Rong 个人技术博客

这是一个可部署到 GitHub Pages 的个人技术博客。前台是静态页面，文章数据保存在 `data/posts.json`；后台账号密码以 PBKDF2 加盐哈希形式保存在 `data/admin-users.json`。

## 本地预览

```bash
node local-admin-server.mjs
```

访问：

- 前台：`http://localhost:8080/`
- 后台：`http://localhost:8080/admin.html`

## 后台账号体系

账号控制只在本地进行，外网后台只允许已经注册过的账号登录和管理博客内容。

后台拆成两个独立页面：

- `login.html`：登录页，本地环境可以注册账号。
- `admin.html`：管理页，未登录会跳转到 `login.html`。

后台页面的 id/class/data 标识统一使用 `Ra` 前缀，方便你后续按自己的风格改样式。

本地启动后台：

```bash
node local-admin-server.mjs
```

访问：

```text
http://localhost:8080/admin.html
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
- iterations：210000
- 输出：32 字节 hash，hex 存储

本地账号管理后执行：

```bash
git add data/admin-users.json
git commit -m "update admin accounts"
git push
```

外网后台会读取 GitHub 上的 `data/admin-users.json` 来验证登录。

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
window.BLOG_ADMIN_API_BASE = "https://你的-worker地址";
```

然后提交并推送。外网后台就能用本地注册过的账号登录和编辑文章。

如果在本地后台编辑文章，点击发布会写入本地 `data/posts.json`。然后执行：

```bash
git add data/posts.json
git commit -m "update blog content"
git push
```

GitHub Pages 会自动更新公开博客。

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
3. Source 选择 `Deploy from a branch`。
4. Branch 选择 `main`，目录选择 `/root`。
5. 保存后等待 GitHub Pages 生成访问地址。

## 数据文件

- `data/posts.json`：公开博客文章数据，前台会直接读取。
- `data/admin-users.json`：本地后台账号数据，只保存加盐哈希。

## 本地开发

```bash
node local-admin-server.mjs
```

同一个服务会同时提供前台页面、后台页面和本地 API。

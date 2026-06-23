# Ralph Rong 个人技术博客

这是一个可部署到 GitHub Pages 的个人技术博客。前台是静态页面，文章数据保存在 `data/posts.json`；管理后台通过 GitHub Contents API 将数据写回仓库，实现无传统服务器的数据持久化。

## 本地预览

```bash
python3 -m http.server 8080
```

访问：

- 前台：`http://localhost:8080/`
- 后台：`http://localhost:8080/admin.html`

## GitHub Pages 部署

1. 新建 GitHub 仓库并推送这些文件。
2. 进入仓库 `Settings` -> `Pages`。
3. Source 选择 `Deploy from a branch`。
4. Branch 选择 `main`，目录选择 `/root`。
5. 保存后等待 GitHub Pages 生成访问地址。

## 外网后台登录

外网后台地址是：

```text
https://galphrui.github.io/ralphrong/admin.html
```

GitHub Pages 是纯静态托管，不能安全地直接保存账号密码。安全的账号密码登录需要一个服务端来校验密码和保管 GitHub 写入凭据。本项目提供了 Cloudflare Worker 后端：

- 前端只输入管理员账号和密码。
- 密码在 Worker 中用 PBKDF2 哈希校验，明文密码不会写入仓库。
- GitHub token 保存在 Worker Secret 中，不暴露给浏览器。
- 登录后使用 HttpOnly Cookie 维持会话。

### 生成密码哈希

```bash
node worker/hash-password.mjs "你的后台密码"
```

复制输出的：

- `ADMIN_PASSWORD_SALT`
- `PBKDF2_ITERATIONS`
- `ADMIN_PASSWORD_HASH`

### 部署 Cloudflare Worker

安装并登录 Wrangler：

```bash
npm install -g wrangler
wrangler login
```

设置 secrets：

```bash
wrangler secret put ADMIN_PASSWORD_SALT
wrangler secret put ADMIN_PASSWORD_HASH
wrangler secret put SESSION_SECRET
wrangler secret put GITHUB_TOKEN
```

其中：

- `SESSION_SECRET` 可以用 `openssl rand -hex 32` 生成。
- `GITHUB_TOKEN` 使用 fine-grained token，Repository access 选择 `Galphrui/ralphrong`，Contents 设置为 `Read and write`。

部署：

```bash
wrangler deploy
```

部署成功后，把 Worker 地址写入 `admin-config.js`：

```text
window.BLOG_ADMIN_API_BASE = "https://你的-worker地址";
```

然后提交并推送到 GitHub，外网后台就会切换为账号密码登录。

## 后台发布配置

后台可以通过仓库地址自动生成连接信息。部署到 GitHub Pages 后，后台也会尝试从当前网址识别 owner 和 repo。

如果没有配置 Worker API，后台会回退到本地调试模式，需要手动填写 GitHub token。正式外网后台建议始终使用 Worker 模式。

读取数据有两种方式：

- 公开仓库：前台和未登录状态可以直接读取 `data/posts.json`。
- 后台管理：登录后通过 Worker 读取和发布，GitHub 写入凭据不会暴露给浏览器。

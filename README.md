# Ralph Rong 个人技术博客

这是一个可部署到 GitHub Pages 的个人技术博客。前台是静态页面，文章数据保存在 `data/posts.json`；后台管理只在本地运行，账号密码以加盐哈希形式保存在 `data/admin-users.json`。

## 本地预览

```bash
node local-admin-server.mjs
```

访问：

- 前台：`http://localhost:8080/`
- 后台：`http://localhost:8080/admin.html`

## 后台账号密码

后台管理在本地进行，公开站点只展示博客。这样可以避免把后台登录逻辑和写入权限暴露到公网。

启动本地后台：

```bash
node local-admin-server.mjs
```

访问：

```text
http://localhost:8080/admin.html
```

首次使用点击“注册账号”。账号数据会写入：

```text
data/admin-users.json
```

这个文件只保存 PBKDF2 加盐哈希，不保存明文密码。提交到 GitHub 后，仓库里看到的也是加密后的账号数据。

编辑文章后点击“发布到 GitHub”，本地后台会把内容写入 `data/posts.json`。然后执行：

```bash
git add data/posts.json data/admin-users.json
git commit -m "update blog content"
git push
```

GitHub Pages 会自动更新公开博客。

## 外网访问

公开博客地址：

```text
https://galphrui.github.io/ralphrong/
```

GitHub Pages 是纯静态托管，不能安全地直接保存账号密码。如果未来需要公网后台登录和远程发布，需要部署一个真正的后端。本项目保留了 Cloudflare Worker 示例：

```text
worker/admin-worker.js
```

但默认推荐使用本地后台模式。

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

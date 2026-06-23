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

## 后台发布配置

后台可以通过仓库地址自动生成连接信息。部署到 GitHub Pages 后，后台也会尝试从当前网址识别 owner 和 repo。

外网后台地址是：

```text
https://galphrui.github.io/ralphrong/admin.html
```

后台是静态页面，不能把真实账号密码写在前端代码里。管理员登录使用 GitHub 用户名和 fine-grained token，登录时会验证 token 是否能访问当前仓库和 `data/posts.json`。

读取数据有两种方式：

- 公开仓库：点击“从 GitHub 读取”，后台会直接读取 `data/posts.json`。
- 私有仓库：需要填写 GitHub token 后再读取和发布。

写回 `data/posts.json` 始终需要 GitHub token。

建议创建 fine-grained personal access token：

1. GitHub 头像菜单 -> `Settings` -> `Developer settings` -> `Personal access tokens` -> `Fine-grained tokens`。
2. Repository access 只选择当前博客仓库。
3. Permissions 中将 `Contents` 设置为 `Read and write`。
4. 生成 token 后，在 `admin.html` 填入仓库地址和 token，或让后台自动识别仓库。
5. 点击“从 GitHub 读取”，编辑内容后点击“发布到 GitHub”。

Token 只保存在浏览器 `localStorage`，不要把 token 写进仓库。

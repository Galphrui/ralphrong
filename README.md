# 个人技术博客

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

后台需要一个 GitHub token 才能写回 `data/posts.json`。

建议创建 fine-grained personal access token：

1. GitHub 头像菜单 -> `Settings` -> `Developer settings` -> `Personal access tokens` -> `Fine-grained tokens`。
2. Repository access 只选择当前博客仓库。
3. Permissions 中将 `Contents` 设置为 `Read and write`。
4. 生成 token 后，在 `admin.html` 填入 owner、repo、branch、path 和 token。
5. 点击“从 GitHub 读取”，编辑内容后点击“发布到 GitHub”。

Token 只保存在浏览器 `localStorage`，不要把 token 写进仓库。

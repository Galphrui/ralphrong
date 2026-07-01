# Ra iOS Notes App

`RaIosNotesApp` 是和 `RaAndroidNotesApp` 对齐的原生 iOS SwiftUI 工程，可用 Xcode 打开并运行到 iPhone 或模拟器。

## 已实现功能

- 文章首页：公开文章读取、搜索、标签筛选、排序、推荐文章。
- 文章详情：Markdown 正文、浏览数记录、点赞、文章留言。
- 简历页面：读取 `posts.json` 中的公开简历数据。
- 留言板：读取和发布站点留言。
- 访问统计：访问次数、访客数、最近访问时间、热门文章指标。
- 后台管理：网页登录账号登录 Worker，新增/编辑/删除文章，发布完整数据。
- 简历快速编辑：修改姓名、标题、简介、联系方式并发布。
- 本机账号安全：本机密码只保存在当前 iOS 设备，不上传远端。
- 离线缓存：联网成功后缓存完整博客数据和统计；断网时读取缓存；无缓存时读取内置 `Resources/offline-posts.json`。
- 只读模式：无法读取公网数据时仍可阅读缓存/离线内容，后台能力依赖 Worker 连通。

## 数据接口

- 公开数据：`https://galphrui.github.io/ralphrong/data/posts.json`
- 后台 API：`https://ralphrong-blog-admin.ralphrong.workers.dev`

修改位置：

```swift
RaIosNotesApp/Services/BlogRepository.swift
```

## 运行

用 Xcode 打开：

```bash
open RaIosNotesApp.xcodeproj
```

命令行构建模拟器：

```bash
xcodebuild -project RaIosNotesApp.xcodeproj -scheme RaIosNotesApp -destination 'platform=iOS Simulator,name=iPhone 16' build
```

真机运行前，在 Xcode 的 Signing & Capabilities 中选择你的 Team，并根据需要调整 Bundle Identifier。

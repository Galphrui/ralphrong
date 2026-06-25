# Ra Android Notes App

Ra Android Notes App 是基于当前 Ra Android Notes 网页博客扩展出来的独立 Android 项目。它保留和网页项目的数据关联，但项目结构、构建、运行、发布都可以单独管理，后续可以作为独立仓库上传到 GitHub。

## 功能

- 文章首页：展示公开博客文章、标签、搜索、文章统计。
- 文章详情：查看标题、摘要、标签和 Markdown 正文。
- 简历页面：读取公开数据中的个人简历信息并在 App 内展示。
- 访问统计：通过 Cloudflare Worker 记录总访问次数、访客数和最近访问时间，并在本机缓存最近一次成功统计。
- 后台管理：登录后可新增、编辑、删除文章，并发布到公网博客数据。
- 简历编辑：登录后可快速修改姓名、标题、简介和联系方式，并发布到公网数据。
- 本机账号安全：本机密码注册、修改只保存在当前 Android 设备，不会上传到公网服务；后台登录仍与网页一致，直接输入后台账号密码。
- 离线缓存：成功联网读取或后台发布后，会缓存完整文章和简历数据；网络不可用时优先读取最近一次缓存，没有缓存时再读取内置 `offline-posts.json`，避免页面空白或 UI 异常。
- 离线/只读模式：断网或 Cloudflare Worker 不可达时，只显示文章和简历，统计和管理入口会自动隐藏。
- 下拉刷新：在页面顶部下拉并松开，可以重新读取公网文章、简历和后台连通状态；网络从无到有时无需退出 App。
- 文章排序：文章首页通过悬浮排序按钮支持最新发布、最早发布、标题 A-Z、标题 Z-A、最近修改等排序方式。

## 数据关联

Android App 默认连接当前博客项目的线上数据：

- 公开数据：`https://galphrui.github.io/ralphrong/data/posts.json`
- 后台 API：`https://ralphrong-blog-admin.ralphrong.workers.dev`

如果后续 Worker 地址或 GitHub Pages 地址变更，修改：

```java
app/src/main/java/com/ralph/notes/BlogRepository.java
```

其中：

- `PUBLIC_DATA_URL`：前台读取文章、简历、统计基准数据。
- `WORKER_BASE_URL`：后台登录、发布、访问统计接口。

## 项目结构

```text
RaAndroidNotesApp/
├── app/
│   ├── build.gradle
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/ralph/notes/
│       │   ├── MainActivity.java          # 页面渲染、导航、交互入口
│       │   ├── BlogRepository.java        # GitHub Pages 和 Worker API 请求
│       │   ├── CacheStore.java            # 完整博客数据和统计数据的本机缓存
│       │   ├── JsonMapper.java            # posts.json 与 Java 对象转换
│       │   ├── LocalCredentialStore.java  # 本机密码注册、解锁、修改
│       │   ├── DeviceIdStore.java         # 本机访客 ID
│       │   └── *.java                     # 文章、简历、统计等数据模型
│       ├── assets/
│       │   └── offline-posts.json         # 离线文章、简历兜底数据
│       ├── res/layout/
│       │   ├── activity_main.xml          # App 顶部、导航、滚动容器
│       │   ├── page_home.xml              # 文章首页
│       │   ├── page_post_detail.xml       # 文章详情
│       │   ├── page_profile.xml           # 简历页
│       │   ├── page_stats.xml             # 统计页
│       │   ├── page_admin.xml             # 后台登录与本机安全入口
│       │   ├── page_admin_editor.xml      # 文章、简历编辑页
│       │   ├── page_local_password.xml    # 本机密码注册/修改页
│       │   ├── view_post_item.xml         # 文章列表卡片
│       │   ├── view_profile_section.xml   # 简历内容区块
│       │   ├── view_tag_chip.xml          # 标签胶囊
│       │   └── view_action_chip.xml       # 后台文章选择项
│       ├── res/drawable/                  # 卡片、按钮、标签、输入框背景
│       └── res/values/                    # 主题、颜色、应用名、导航样式
├── build.gradle
├── settings.gradle
├── gradle.properties
└── local.properties
```

## 构建运行

当前项目使用 Android Gradle Plugin 8.11.2，`compileSdk` 为 36。项目已经配置使用 Android Studio 自带 JDK 21：

```properties
org.gradle.java.home=/Applications/Android Studio.app/Contents/jbr/Contents/Home
```

本机命令行构建：

```bash
./gradlew assembleDebug
```

安装到已连接设备：

```bash
./gradlew installDebug
```

也可以直接用 Android Studio 打开 `RaAndroidNotesApp` 目录，然后点击 Run。

生成可分发安装的 release 签名 APK：

```bash
./gradlew assembleRelease
```

当前本机已生成 release 签名包：

```text
app/build/outputs/apk/release/app-release.apk
```

签名配置读取本机文件：

```text
keystore.properties
signing/ra-notes-release.jks
```

这两个文件已加入 `.gitignore`，不要上传到公开仓库。换机器构建 release 包时，需要重新生成 keystore 或复制你自己的签名文件。

## 后台登录规则

后台管理现在与网页一致：

1. 在管理页直接输入网页后台账号和密码。
2. App 调用 Cloudflare Worker 登录并读取数据。
3. 登录成功后显示文章编辑、发布和简历快速编辑。

本机密码是可选的设备侧安全配置，不再拦截后台登录，也不会修改远端后台账号。

本机密码的注册、修改只在 Android 设备执行，代码位于：

```text
app/src/main/java/com/ralph/notes/LocalCredentialStore.java
```

App 不提供线上账号密码重置、修改接口，避免在移动端暴露管理账号变更能力。

如果真机提示 `无法连接后台 API` 或 `failed to connect to ralphrong-blog-admin.ralphrong.workers.dev`，这通常不是密码错误，而是当前手机网络无法连通 Cloudflare Worker 域名。Mac 上可以用下面命令验证 Worker 是否正常：

```bash
curl -s https://ralphrong-blog-admin.ralphrong.workers.dev/api/visits
```

如果电脑能通但手机不通，需要换一个手机网络，或给 Worker 绑定一个手机网络可访问的自定义域名，然后在 `BlogRepository.WORKER_BASE_URL` 中替换地址。App 会把这种情况识别为只读模式，只保留文章和简历入口。

## UI 修改位置

常规页面样式优先改 XML：

```text
app/src/main/res/layout/activity_main.xml
app/src/main/res/layout/page_home.xml
app/src/main/res/layout/page_post_detail.xml
app/src/main/res/layout/page_profile.xml
app/src/main/res/layout/page_stats.xml
app/src/main/res/layout/page_admin.xml
app/src/main/res/layout/page_admin_editor.xml
app/src/main/res/layout/page_local_password.xml
```

`activity_main.xml` 控制顶部 RA 标识、标题、副标题、文章/简历/统计/管理导航、悬浮圆形下拉刷新指示器，以及页面滚动容器。顶部栏会根据系统状态栏动态增加上边距，避免沉浸式状态栏遮挡。

```text
app/src/main/res/layout/view_post_item.xml
```

这里控制首页文章列表每一项的标题、摘要、标签和间距。

颜色和背景优先改：

```text
app/src/main/res/values/colors.xml
app/src/main/res/drawable/bg_panel.xml
app/src/main/res/drawable/bg_hero.xml
app/src/main/res/drawable/bg_button_primary.xml
app/src/main/res/drawable/bg_button_secondary.xml
app/src/main/res/drawable/bg_input.xml
app/src/main/res/drawable/bg_chip.xml
```

`MainActivity.java` 现在主要负责读取数据、切换页面、把文章和简历内容填充到 XML 容器里。

下拉刷新和文章排序逻辑也在 `MainActivity.java` 中：当 `ScrollView` 位于顶部且下拉距离达到阈值时，会显示悬浮圆形加载指示器并重新执行公开数据加载；加载后会重新判断离线/只读状态，并尽量停留在刷新前所在页面。文章排序使用右下角悬浮按钮打开排序面板，会优先使用 `updatedAt`，旧文章没有该字段时回退到发布日期。

Android Studio 预览以前看起来空白，主要原因是文章列表、Markdown 正文、简历区块这些内容都是运行时从 JSON 动态填充的，XML 文件本身没有真实数据。现在各个 XML 已补充 `tools:text`、`tools:visibility` 和示例 `include`，设计器可以直接看到页面骨架；运行时仍会清空这些预览内容，再填入真实数据。

仍然保留在 Java 中动态生成的部分，是因为文章数量、标签数量、Markdown 段落和简历栏目数量都是可变数据。对应的单项样式已经抽成 XML：

```text
app/src/main/res/layout/view_post_item.xml
app/src/main/res/layout/view_profile_section.xml
app/src/main/res/layout/view_tag_chip.xml
app/src/main/res/layout/view_action_chip.xml
```

## 发布逻辑

发布文章或简历时，Android App 会：

1. 使用 Worker 登录拿到会话令牌。
2. 拉取当前后台数据。
3. 修改内存中的文章或简历数据。
4. 通过 `PUT /api/posts` 把完整数据提交给 Worker。
5. Worker 写入 GitHub 仓库，GitHub Pages 稍后更新公网内容。
6. 发布成功后立刻把最新完整数据写入本机缓存，后续断网也能看到最新文章和简历。

相关代码：

```text
app/src/main/java/com/ralph/notes/BlogRepository.java
app/src/main/java/com/ralph/notes/MainActivity.java
```

## 上传到 GitHub

如果要把 Android 项目作为独立仓库上传：

```bash
cd /Users/galph/Documents/MyPersionWeb/RaAndroidNotesApp
git init
git add .
git commit -m "Initial Ra Android Notes app"
git branch -M main
git remote add origin git@github.com:<your-name>/<your-android-repo>.git
git push -u origin main
```

如果继续放在当前网页项目仓库里，则直接在父项目提交 `RaAndroidNotesApp/` 目录即可。

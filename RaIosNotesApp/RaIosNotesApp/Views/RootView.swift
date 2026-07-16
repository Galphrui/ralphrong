import SwiftUI

struct RootView: View {
    @EnvironmentObject private var model: AppViewModel

    var body: some View {
        TabView {
            ForEach(model.visibleModules) { module in
                moduleView(module)
                    .tabItem { Label(module.label, systemImage: iconName(for: module.id)) }
            }
        }
        .tint(.raPrimary)
        .overlay(alignment: .top) {
            if model.isLoading {
                ProgressView(model.statusMessage)
                    .padding(10)
                    .background(.regularMaterial, in: Capsule())
                    .padding(.top, 8)
            }
        }
    }

    @ViewBuilder
    private func moduleView(_ module: FeatureModule) -> some View {
        switch module.id {
        case "code":
            NavigationStack { CodeRepositoryView() }
        case "profile":
            NavigationStack { ProfileView() }
        case "guestbook":
            NavigationStack { GuestbookView() }
        case "stats":
            NavigationStack { StatsView() }
        case "admin":
            NavigationStack { AdminView() }
        default:
            NavigationStack { HomeView() }
        }
    }

    private func iconName(for id: String) -> String {
        switch id {
        case "code": return "chevron.left.forwardslash.chevron.right"
        case "profile": return "person.text.rectangle"
        case "guestbook": return "bubble.left.and.bubble.right"
        case "stats": return "chart.bar"
        case "admin": return "lock.shield"
        default: return "doc.text"
        }
    }
}

struct HomeView: View {
    @EnvironmentObject private var model: AppViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HeaderView()
                SourceBanner()

                Picker("推荐", selection: $model.promoMode) {
                    ForEach(PromoMode.allCases) { mode in
                        Text(mode.label).tag(mode)
                    }
                }
                .pickerStyle(.segmented)

                if !model.featuredPosts.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(model.featuredPosts) { post in
                                NavigationLink(value: post) {
                                    FeaturedPostCard(post: post)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal)
                    }
                    .padding(.horizontal, -16)
                }

                VStack(spacing: 12) {
                    TextField("搜索标题、标签、正文", text: $model.searchText)
                        .textInputAutocapitalization(.never)
                        .padding(12)
                        .background(Color.raPanel, in: RoundedRectangle(cornerRadius: 8))

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            ForEach(model.tags, id: \.self) { tag in
                                Button(tag) { model.selectedTag = tag }
                                    .buttonStyle(ChipButtonStyle(selected: model.selectedTag == tag))
                            }
                        }
                    }

                    Picker("排序", selection: $model.sortMode) {
                        ForEach(SortMode.allCases) { mode in
                            Text(mode.label).tag(mode)
                        }
                    }
                    .pickerStyle(.menu)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                }

                Text("文章列表 · \(model.filteredPosts.count) 篇 · \(model.sortMode.label)")
                    .font(.headline)

                LazyVStack(spacing: 12) {
                    ForEach(model.filteredPosts) { post in
                        NavigationLink(value: post) {
                            PostRow(post: post)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(16)
        }
        .background(Color.raBackground)
        .refreshable { await model.refresh() }
        .navigationTitle(model.blog.title)
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: Post.self) { post in
            PostDetailView(post: post)
        }
    }
}

struct CodeRepositoryView: View {
    @EnvironmentObject private var model: AppViewModel
    @State private var searchText = ""

    var repositories: [CodeRepository] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !query.isEmpty else { return model.sortedRepositories }
        return model.sortedRepositories.filter {
            [$0.name, $0.description, $0.language, $0.sourcePath ?? "", $0.notes ?? ""]
                .joined(separator: " ")
                .lowercased()
                .contains(query)
                || $0.tags.joined(separator: " ").lowercased().contains(query)
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                SourceBanner()
                Panel {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("代码库")
                            .font(.largeTitle.weight(.bold))
                        Text("存放可复用代码片段、排查脚本、工程模板和项目仓库说明。")
                            .foregroundStyle(.secondary)
                    }
                }
                TextField("搜索代码库、语言、标签", text: $searchText)
                    .textInputAutocapitalization(.never)
                    .padding(12)
                    .background(Color.raPanel, in: RoundedRectangle(cornerRadius: 8))

                if repositories.isEmpty {
                    Panel { Text("暂无匹配的代码库").foregroundStyle(.secondary) }
                } else {
                    ForEach(repositories) { repo in
                        NavigationLink {
                            CodeRepositoryDetailView(repo: repo)
                        } label: {
                            CodeRepositoryCard(repo: repo)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(16)
        }
        .background(Color.raBackground)
        .navigationTitle("代码库")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await model.refresh() }
    }
}

struct CodeRepositoryCard: View {
    let repo: CodeRepository

    var body: some View {
        Panel {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(repo.language.uppercased())
                            .font(.caption.weight(.bold))
                            .foregroundStyle(Color.raPrimary)
                        Text(repo.name)
                            .font(.headline)
                    }
                    Spacer()
                    if let updatedAt = repo.updatedAt, !updatedAt.isEmpty {
                        Text(updatedAt).font(.caption).foregroundStyle(.secondary)
                    }
                }
                Text(repo.description)
                    .foregroundStyle(.secondary)
                TagCloud(tags: repo.tags)
                if let snippet = repo.snippet, !snippet.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        Text(formatCodeSnippet(snippet, language: repo.language))
                            .font(.system(.caption, design: .monospaced))
                            .padding(10)
                            .background(Color.black.opacity(0.88), in: RoundedRectangle(cornerRadius: 6))
                            .foregroundStyle(.white)
                    }
                }
                if let sourcePath = repo.sourcePath, !sourcePath.isEmpty {
                    Text(sourcePath)
                        .font(.footnote.monospaced())
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
}

struct CodeRepositoryDetailView: View {
    let repo: CodeRepository

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(repo.name)
                    .font(.largeTitle.weight(.bold))
                    .fixedSize(horizontal: false, vertical: true)
                Text([repo.language, repo.updatedAt ?? "", repo.sourcePath ?? ""].filter { !$0.isEmpty }.joined(separator: " · "))
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                TagCloud(tags: repo.tags)
                Text(repo.description)
                    .foregroundStyle(.secondary)

                HStack {
                    if let fileURL = codeTempFileURL(for: repo) {
                        ShareLink(item: fileURL) {
                            Label("保存代码", systemImage: "square.and.arrow.down")
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.raPrimary)
                    }
                    if let urlText = repo.url, let url = URL(string: urlText), !urlText.isEmpty {
                        Link(destination: url) {
                            Label("打开仓库", systemImage: "arrow.up.right")
                        }
                        .buttonStyle(.bordered)
                    }
                }

                if let snippet = repo.snippet, !snippet.isEmpty {
                    ScrollView(.horizontal, showsIndicators: true) {
                        Text(formatCodeSnippet(snippet, language: repo.language))
                            .font(.system(.footnote, design: .monospaced))
                            .padding(14)
                            .background(Color.black.opacity(0.9), in: RoundedRectangle(cornerRadius: 8))
                            .foregroundStyle(.white)
                    }
                }

                if let notes = repo.notes, !notes.isEmpty {
                    Panel {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("备注").font(.headline)
                            Text(notes).foregroundStyle(.secondary)
                        }
                    }
                }

                AttachmentSection(attachments: repo.attachments ?? [], title: "代码附件")
            }
            .padding(16)
        }
        .background(Color.raBackground)
        .navigationTitle("代码详情")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private func codeTempFileURL(for repo: CodeRepository) -> URL? {
    let snippet = formatCodeSnippet(repo.snippet ?? "", language: repo.language)
    guard !snippet.isEmpty, let data = snippet.data(using: .utf8) else { return nil }
    let preferredName = repo.fileName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let baseName = safeFileName(preferredName.isEmpty ? (repo.name.isEmpty ? repo.id : repo.name) : preferredName)
    let fileName = baseName.contains(".") ? baseName : baseName + "." + codeExtension(repo.language)
    let url = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
    try? data.write(to: url, options: .atomic)
    return url
}

private func codeExtension(_ language: String) -> String {
    switch language.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() {
    case "c": return "c"
    case "c++", "cpp": return "cpp"
    case "python": return "py"
    case "java": return "java"
    case "kotlin", "kt": return "kt"
    case "javascript", "js": return "js"
    case "typescript", "ts": return "ts"
    case "shell", "adb": return "sh"
    case "xml": return "xml"
    case "json": return "json"
    case "markdown", "md": return "md"
    case "gradle": return "gradle"
    case "swift": return "swift"
    case "go": return "go"
    case "rust": return "rs"
    case "sql": return "sql"
    case "yaml": return "yml"
    default: return "txt"
    }
}

private func safeFileName(_ value: String) -> String {
    let invalid = CharacterSet(charactersIn: "\\/:*?\"<>|")
    let clean = value.components(separatedBy: invalid).joined(separator: "_").trimmingCharacters(in: .whitespacesAndNewlines)
    return clean.isEmpty ? "code-snippet" : clean
}

private func formatCodeSnippet(_ source: String, language: String) -> String {
    let code = source.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
    let clean = language.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    if clean == "json",
       let data = code.data(using: .utf8),
       let object = try? JSONSerialization.jsonObject(with: data),
       let pretty = try? JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys]),
       let text = String(data: pretty, encoding: .utf8) {
        return text
    }
    if ["c", "c++", "java", "kotlin", "javascript", "typescript", "swift", "go", "rust", "gradle"].contains(clean) {
        return formatBracedCode(code)
    }
    return code
}

private func formatBracedCode(_ code: String) -> String {
    let expanded = code
        .replacingOccurrences(of: "\\{\\s*", with: "{\n", options: .regularExpression)
        .replacingOccurrences(of: "\\s*\\}", with: "\n}", options: .regularExpression)
        .replacingOccurrences(of: ";\\s*", with: ";\n", options: .regularExpression)
        .replacingOccurrences(of: "\\n{2,}", with: "\n", options: .regularExpression)
    var level = 0
    return expanded.split(separator: "\n").compactMap { rawLine in
        let clean = rawLine.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else { return nil }
        if clean.hasPrefix("}") { level = max(level - 1, 0) }
        let output = String(repeating: "  ", count: level) + clean
        if clean.hasSuffix("{") { level += 1 }
        return output
    }.joined(separator: "\n")
}

struct PostDetailView: View {
    @EnvironmentObject private var model: AppViewModel
    let post: Post
    @State private var name = ""
    @State private var message = ""
    @State private var password = ""
    @State private var passwordError = ""
    @State private var unlocked = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(post.title)
                    .font(.largeTitle.weight(.bold))
                    .fixedSize(horizontal: false, vertical: true)
                Text("作者：Ralph Rong / Ra · \(post.date) · \(post.readingText) · \(model.metric(for: post.slug).views) 点击 · \(model.metric(for: post.slug).likes) 赞")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                if post.isPasswordProtected {
                    Label("密码可见", systemImage: "lock")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.orange)
                }

                TagCloud(tags: post.tags)

                if post.isPasswordProtected && !unlocked {
                    Panel {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("这篇文章需要密码授权").font(.headline)
                            SecureField("访问密码", text: $password)
                                .textFieldStyle(.roundedBorder)
                            Button {
                                if password == (post.accessPassword ?? "") {
                                    unlocked = true
                                    password = ""
                                    passwordError = ""
                                } else {
                                    passwordError = "密码不正确，请重新输入。"
                                }
                            } label: {
                                Label("授权阅读", systemImage: "lock.open")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.raPrimary)
                            if !passwordError.isEmpty {
                                Text(passwordError)
                                    .font(.footnote.weight(.semibold))
                                    .foregroundStyle(.red)
                            }
                        }
                    }
                } else {
                    Button {
                        Task { await model.like(post: post) }
                    } label: {
                        Label("点赞 \(model.metric(for: post.slug).likes)", systemImage: "hand.thumbsup")
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.raPrimary)

                    MarkdownText(post.content)
                        .padding(.top, 8)

                    AttachmentSection(attachments: post.attachments ?? [])

                    Divider().padding(.vertical, 8)
                    MessageComposer(title: "写下这篇文章的留言", name: $name, message: $message) {
                        let ok = await model.submitMessage(name: name, message: message, postSlug: post.slug)
                        if ok { message = "" }
                    }

                    MessageList(messages: model.postMessages[post.slug] ?? [])
                }
            }
            .padding(16)
        }
        .background(Color.raBackground)
        .navigationTitle("文章详情")
        .navigationBarTitleDisplayMode(.inline)
        .task { await model.openPost(post) }
        .onAppear {
            unlocked = !post.isPasswordProtected
        }
    }
}

struct AttachmentSection: View {
    let attachments: [PostAttachment]
    var title: String = "文章附件"

    var body: some View {
        if !attachments.isEmpty {
            Panel {
                VStack(alignment: .leading, spacing: 12) {
                    Text(title).font(.headline)
                    ForEach(attachments) { attachment in
                        HStack(alignment: .top, spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(attachment.name)
                                    .font(.subheadline.weight(.bold))
                                    .fixedSize(horizontal: false, vertical: true)
                                Text([attachment.fileName, attachment.sizeText].filter { !$0.isEmpty }.joined(separator: " · "))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            attachmentAction(attachment)
                        }
                        .padding(12)
                        .background(Color.raBackground, in: RoundedRectangle(cornerRadius: 8))
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func attachmentAction(_ attachment: PostAttachment) -> some View {
        if let urlText = attachment.url, let url = URL(string: urlText), !urlText.isEmpty {
            Link("打开", destination: url)
                .font(.caption.weight(.bold))
        } else if let url = tempFileURL(for: attachment) {
            ShareLink(item: url) {
                Text("保存")
                    .font(.caption.weight(.bold))
            }
        } else {
            Text("不可用")
                .font(.caption.weight(.bold))
                .foregroundStyle(.secondary)
        }
    }

    private func tempFileURL(for attachment: PostAttachment) -> URL? {
        guard let dataUrl = attachment.dataUrl, let comma = dataUrl.firstIndex(of: ",") else { return nil }
        let base64 = String(dataUrl[dataUrl.index(after: comma)...])
        guard let data = Data(base64Encoded: base64) else { return nil }
        let safeName = attachment.fileName.replacingOccurrences(of: "/", with: "_")
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(safeName.isEmpty ? "attachment" : safeName)
        try? data.write(to: url, options: .atomic)
        return url
    }
}

struct ProfileView: View {
    @EnvironmentObject private var model: AppViewModel

    var profile: Profile { model.blog.profile ?? Profile() }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                SourceBanner()
                Panel {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(profile.name)
                            .font(.largeTitle.weight(.bold))
                        Text(profile.headline)
                            .font(.headline)
                            .foregroundStyle(Color.raPrimary)
                        Text(profile.summary)
                        if !profile.intent.isEmpty {
                            Label(profile.intent, systemImage: "scope")
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                SectionBlock(title: "联系方式", rows: profile.contacts)
                SectionBlock(title: "核心优势", rows: profile.advantages)

                ForEach(profile.skills) { group in
                    Panel {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(group.name).font(.headline)
                            TagCloud(tags: group.items)
                        }
                    }
                }

                ExperienceSection(title: "工作经历", items: profile.workExperience)
                ExperienceSection(title: "项目经历", items: profile.projects)
                ExperienceSection(title: "教育经历", items: profile.education)
                SectionBlock(title: "自我评价", rows: profile.selfReview)

                ForEach(profile.sections) { section in
                    Panel {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(section.title).font(.headline)
                            MarkdownText(section.content)
                        }
                    }
                }
            }
            .padding(16)
        }
        .background(Color.raBackground)
        .navigationTitle("简历")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await model.refresh() }
    }
}

struct GuestbookView: View {
    @EnvironmentObject private var model: AppViewModel
    @State private var name = ""
    @State private var message = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                SourceBanner()
                MessageComposer(title: "给 Ra 留句话", name: $name, message: $message) {
                    let ok = await model.submitMessage(name: name, message: message)
                    if ok { message = "" }
                }
                MessageList(messages: model.guestMessages)
            }
            .padding(16)
        }
        .background(Color.raBackground)
        .navigationTitle("留言")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await model.refresh() }
    }
}

struct StatsView: View {
    @EnvironmentObject private var model: AppViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                SourceBanner()
                HStack(spacing: 12) {
                    StatCard(title: "访问次数", value: "\(model.stats.visits)")
                    StatCard(title: "访客数", value: "\(model.stats.visitors)")
                }
                Panel {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("最近访问").font(.headline)
                        Text(model.stats.lastVisitAt.isEmpty ? "暂无记录" : model.stats.lastVisitAt)
                            .foregroundStyle(.secondary)
                        Text(model.stats.sourceMessage)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
                Text("热门文章")
                    .font(.headline)
                ForEach(model.blog.posts.sorted { model.metric(for: $0.slug).views > model.metric(for: $1.slug).views }.prefix(10)) { post in
                    Panel {
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 6) {
                                Text(post.title).font(.headline)
                                Text(post.date).font(.footnote).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text("\(model.metric(for: post.slug).views) / \(model.metric(for: post.slug).likes)")
                                .font(.footnote.monospacedDigit())
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .padding(16)
        }
        .background(Color.raBackground)
        .navigationTitle("统计")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await model.refresh() }
    }
}

import SwiftUI

struct AdminView: View {
    @EnvironmentObject private var model: AppViewModel
    @State private var username = ""
    @State private var password = ""
    @State private var showingLocalPassword = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                SourceBanner()
                Panel {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("后台管理").font(.title2.weight(.bold))
                        Text(model.adminStatus)
                            .font(.footnote)
                            .foregroundStyle(.secondary)

                        if model.adminSession == nil {
                            TextField("后台账号", text: $username)
                                .textInputAutocapitalization(.never)
                                .textFieldStyle(.roundedBorder)
                            SecureField("后台密码", text: $password)
                                .textFieldStyle(.roundedBorder)
                            Button {
                                Task { await model.login(username: username, password: password) }
                            } label: {
                                Label("登录后台", systemImage: "person.badge.key")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.raPrimary)
                        } else {
                            HStack {
                                Button {
                                    Task { await model.reloadAdminData() }
                                } label: {
                                    Label("刷新后台", systemImage: "arrow.clockwise")
                                }
                                .buttonStyle(.bordered)

                                Button {
                                    model.adminSession = nil
                                    model.adminStatus = "已退出"
                                } label: {
                                    Label("退出", systemImage: "rectangle.portrait.and.arrow.right")
                                }
                                .buttonStyle(.bordered)
                            }
                        }

                        Button {
                            showingLocalPassword = true
                        } label: {
                            Label(model.credentials.hasPassword ? "修改本机密码" : "设置本机密码", systemImage: "iphone.and.arrow.forward")
                        }
                        .buttonStyle(.bordered)
                    }
                }

                if model.adminSession != nil {
                    AdminEditorView()
                    ProfileQuickEditor()
                }
            }
            .padding(16)
        }
        .background(Color.raBackground)
        .navigationTitle("管理")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showingLocalPassword) {
            LocalPasswordView()
        }
    }
}

struct AdminEditorView: View {
    @EnvironmentObject private var model: AppViewModel
    @State private var draft = Post.blank
    @State private var tagsText = ""
    @State private var passwordVisible = false

    var body: some View {
        Panel {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("文章编辑").font(.title3.weight(.bold))
                    Spacer()
                    Button {
                        draft = Post.blank
                        tagsText = ""
                        passwordVisible = false
                        model.selectedAdminPost = nil
                    } label: {
                        Label("新建", systemImage: "plus")
                    }
                    .buttonStyle(.bordered)
                }

                Picker("选择文章", selection: Binding(
                    get: { model.selectedAdminPost?.slug ?? "" },
                    set: { slug in
                        if let post = model.adminBlog.posts.first(where: { $0.slug == slug }) {
                            model.selectedAdminPost = post
                            load(post)
                        }
                    }
                )) {
                    Text("新建文章").tag("")
                    ForEach(model.adminBlog.posts) { post in
                        Text(post.title).tag(post.slug)
                    }
                }
                .pickerStyle(.menu)

                Group {
                    TextField("标题", text: $draft.title)
                    TextField("Slug", text: $draft.slug)
                        .textInputAutocapitalization(.never)
                    TextField("日期 yyyy-MM-dd", text: $draft.date)
                    TextField("标签，用逗号分隔", text: $tagsText)
                    TextField("摘要", text: $draft.summary, axis: .vertical)
                        .lineLimit(2...4)
                }
                .textFieldStyle(.roundedBorder)

                Toggle("输入密码可见", isOn: $passwordVisible)
                    .tint(.raPrimary)
                if passwordVisible {
                    SecureField("访问密码（密码文章必填）", text: Binding(
                        get: { draft.accessPassword ?? "" },
                        set: { draft.accessPassword = $0 }
                    ))
                    .textFieldStyle(.roundedBorder)
                }

                Stepper("阅读时长：\(draft.readingMinutes ?? 3) 分钟", value: Binding(
                    get: { draft.readingMinutes ?? 3 },
                    set: { draft.readingMinutes = $0 }
                ), in: 1...60)

                Text("正文 Markdown")
                    .font(.headline)
                TextEditor(text: $draft.content)
                    .frame(minHeight: 260)
                    .padding(6)
                    .background(Color.raBackground, in: RoundedRectangle(cornerRadius: 8))

                HStack {
                    Button {
                        prepareDraft()
                        Task { await model.publish(post: draft) }
                    } label: {
                        Label("发布文章", systemImage: "square.and.arrow.up")
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.raPrimary)
                    .disabled(draft.title.trimmingCharacters(in: .whitespaces).isEmpty || draft.slug.trimmingCharacters(in: .whitespaces).isEmpty || (passwordVisible && (draft.accessPassword ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty))

                    if model.selectedAdminPost != nil {
                        Button(role: .destructive) {
                            Task { await model.delete(post: draft) }
                        } label: {
                            Label("删除", systemImage: "trash")
                        }
                        .buttonStyle(.bordered)
                    }
                }
            }
        }
        .onAppear {
            if let post = model.selectedAdminPost {
                load(post)
            }
        }
        .onChange(of: model.selectedAdminPost) { newValue in
            if let newValue { load(newValue) }
        }
    }

    private func load(_ post: Post) {
        draft = post
        tagsText = post.tags.joined(separator: ", ")
        passwordVisible = post.isPasswordProtected
    }

    private func prepareDraft() {
        draft.tags = tagsText
            .split { $0 == "," || $0 == "，" || $0 == "\n" }
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        draft.slug = draft.slug.trimmingCharacters(in: .whitespacesAndNewlines)
        draft.title = draft.title.trimmingCharacters(in: .whitespacesAndNewlines)
        draft.date = draft.date.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? Post.todayString : draft.date
        draft.visibility = passwordVisible ? "password" : "public"
        draft.accessPassword = passwordVisible ? (draft.accessPassword ?? "").trimmingCharacters(in: .whitespacesAndNewlines) : ""
    }
}

struct ProfileQuickEditor: View {
    @EnvironmentObject private var model: AppViewModel
    @State private var name = ""
    @State private var headline = ""
    @State private var summary = ""
    @State private var contacts = ""

    var body: some View {
        Panel {
            VStack(alignment: .leading, spacing: 12) {
                Text("简历快速编辑").font(.title3.weight(.bold))
                TextField("姓名", text: $name)
                    .textFieldStyle(.roundedBorder)
                TextField("标题", text: $headline)
                    .textFieldStyle(.roundedBorder)
                TextField("简介", text: $summary, axis: .vertical)
                    .lineLimit(3...6)
                    .textFieldStyle(.roundedBorder)
                Text("联系方式，每行一条")
                    .font(.headline)
                TextEditor(text: $contacts)
                    .frame(minHeight: 110)
                    .padding(6)
                    .background(Color.raBackground, in: RoundedRectangle(cornerRadius: 8))
                Button {
                    Task {
                        await model.publishProfile(name: name, headline: headline, summary: summary, contactsText: contacts)
                    }
                } label: {
                    Label("发布简历", systemImage: "person.crop.rectangle")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.raPrimary)
            }
        }
        .onAppear(perform: load)
        .onChange(of: model.adminBlog.profile?.name ?? "") { _ in load() }
    }

    private func load() {
        let profile = model.adminBlog.profile ?? Profile()
        name = profile.name
        headline = profile.headline
        summary = profile.summary
        contacts = profile.contacts.joined(separator: "\n")
    }
}

struct LocalPasswordView: View {
    @EnvironmentObject private var model: AppViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var oldPassword = ""
    @State private var newPassword = ""
    @State private var status = ""

    var body: some View {
        NavigationStack {
            Form {
                if model.credentials.hasPassword {
                    SecureField("原本机密码", text: $oldPassword)
                }
                SecureField("新本机密码", text: $newPassword)
                if !status.isEmpty {
                    Text(status).foregroundStyle(.secondary)
                }
            }
            .navigationTitle(model.credentials.hasPassword ? "修改本机密码" : "设置本机密码")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        do {
                            if model.credentials.hasPassword {
                                try model.credentials.change(oldPassword: oldPassword, newPassword: newPassword)
                            } else {
                                try model.credentials.register(password: newPassword)
                            }
                            dismiss()
                        } catch {
                            status = error.localizedDescription
                        }
                    }
                }
            }
        }
    }
}

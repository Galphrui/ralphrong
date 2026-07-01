import Foundation
import SwiftUI

@MainActor
final class AppViewModel: ObservableObject {
    @Published var blog = BlogData.empty
    @Published var source: DataSource = .offline("准备加载")
    @Published var stats = VisitStats()
    @Published var guestMessages: [GuestMessage] = []
    @Published var postMessages: [String: [GuestMessage]] = [:]
    @Published var metrics: [String: PostMetric] = [:]
    @Published var selectedTag = "全部"
    @Published var searchText = ""
    @Published var sortMode: SortMode = .newest
    @Published var promoMode: PromoMode = .latest
    @Published var isLoading = false
    @Published var statusMessage = "准备加载"
    @Published var adminSession: AdminSession?
    @Published var adminBlog = BlogData.empty
    @Published var selectedAdminPost: Post?
    @Published var adminJSON: [String: Any] = [:]
    @Published var adminStatus = "未登录"

    let credentials = LocalCredentialStore()
    private let repository = BlogRepository()
    private let deviceIdStore = DeviceIdStore()

    var isReadOnly: Bool { source.isReadOnly }
    var visitorId: String { deviceIdStore.visitorId }

    var tags: [String] {
        let values = blog.posts.flatMap(\.tags)
        return ["全部"] + Array(Set(values)).sorted()
    }

    var filteredPosts: [Post] {
        var output = blog.posts
        if selectedTag != "全部" {
            output = output.filter { $0.tags.contains(selectedTag) }
        }
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if !query.isEmpty {
            output = output.filter {
                $0.title.lowercased().contains(query)
                    || $0.summary.lowercased().contains(query)
                    || $0.content.lowercased().contains(query)
                    || $0.tags.joined(separator: " ").lowercased().contains(query)
            }
        }
        return sort(output)
    }

    var featuredPosts: [Post] {
        let posts: [Post]
        switch promoMode {
        case .latest:
            posts = sort(blog.posts)
        case .views:
            posts = blog.posts.sorted { metric(for: $0.slug).views > metric(for: $1.slug).views }
        case .likes:
            posts = blog.posts.sorted { metric(for: $0.slug).likes > metric(for: $1.slug).likes }
        }
        return Array(posts.prefix(5))
    }

    var visibleModules: [FeatureModule] {
        let defaults = [
            FeatureModule(id: "posts", label: "文章", href: nil, enabled: true, order: 10, surface: "top", external: false),
            FeatureModule(id: "code", label: "代码库", href: nil, enabled: true, order: 20, surface: "top", external: false),
            FeatureModule(id: "profile", label: "简历", href: nil, enabled: true, order: 30, surface: "top", external: false),
            FeatureModule(id: "guestbook", label: "留言", href: nil, enabled: true, order: 40, surface: "top", external: false),
            FeatureModule(id: "stats", label: "统计", href: nil, enabled: true, order: 50, surface: "top", external: false),
            FeatureModule(id: "admin", label: "管理", href: nil, enabled: true, order: 100, surface: "top", external: false)
        ]
        let modules = blog.modules?.modules.filter { $0.id != "modules" && $0.external != true } ?? defaults
        let maxCount = min(max(blog.modules?.settings?.maxTopModules ?? 6, 3), 8)
        return Array(modules.filter { $0.enabled != false }.sorted { ($0.order ?? 999) < ($1.order ?? 999) }.prefix(maxCount))
    }

    var sortedRepositories: [CodeRepository] {
        blog.repositories.sorted { ($0.updatedAt ?? "") > ($1.updatedAt ?? "") }
    }

    func bootstrap() async {
        await refresh(manual: false)
    }

    func refresh(manual: Bool = true) async {
        isLoading = true
        statusMessage = manual ? "正在刷新..." : "正在读取公网数据..."
        defer { isLoading = false }
        do {
            let result = try await repository.fetchPublicData()
            blog = result.0
            source = result.1
            statusMessage = result.1.message
            async let visitTask = repository.recordVisit(visitorId: visitorId)
            async let metricTask = repository.fetchPostMetrics()
            async let messageTask = repository.fetchMessages()
            if let loadedStats = try? await visitTask { stats = loadedStats }
            if let loadedMetrics = try? await metricTask { metrics = loadedMetrics }
            if let loadedMessages = try? await messageTask { guestMessages = loadedMessages }
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    func metric(for slug: String) -> PostMetric {
        metrics[slug] ?? PostMetric()
    }

    func openPost(_ post: Post) async {
        if let updated = try? await repository.recordPostView(slug: post.slug) {
            metrics = updated
        }
        if let messages = try? await repository.fetchMessages(postSlug: post.slug) {
            postMessages[post.slug] = messages
        }
    }

    func like(post: Post) async {
        do {
            metrics = try await repository.likePost(slug: post.slug, visitorId: visitorId)
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    func submitMessage(name: String, message: String, postSlug: String = "") async -> Bool {
        if let validation = Moderation.validate(name: name, message: message) {
            statusMessage = validation
            return false
        }
        do {
            let list = try await repository.createMessage(
                name: name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "陌生朋友" : name,
                message: message.trimmingCharacters(in: .whitespacesAndNewlines),
                postSlug: postSlug
            )
            if postSlug.isEmpty {
                guestMessages = list
            } else {
                postMessages[postSlug] = list
            }
            statusMessage = "留言已发布"
            return true
        } catch {
            statusMessage = error.localizedDescription
            return false
        }
    }

    func login(username: String, password: String) async {
        adminStatus = "正在登录..."
        do {
            let session = try await repository.login(username: username, password: password)
            adminSession = session
            let result = try await repository.fetchAdminData(token: session.token)
            adminBlog = result.0
            adminJSON = result.1
            selectedAdminPost = adminBlog.posts.first
            adminStatus = "已登录：\(session.user)"
        } catch {
            adminStatus = error.localizedDescription
        }
    }

    func reloadAdminData() async {
        guard let session = adminSession else { return }
        do {
            let result = try await repository.fetchAdminData(token: session.token)
            adminBlog = result.0
            adminJSON = result.1
            selectedAdminPost = adminBlog.posts.first
            adminStatus = "后台数据已刷新"
        } catch {
            adminStatus = error.localizedDescription
        }
    }

    func publish(post: Post) async {
        guard let session = adminSession else { return }
        do {
            adminJSON = upserting(post: post, into: adminJSON)
            let result = try await repository.publish(token: session.token, json: adminJSON)
            try repository.saveBlogCache(json: adminJSON)
            let updated = try await repository.fetchAdminData(token: session.token)
            adminBlog = updated.0
            adminJSON = updated.1
            selectedAdminPost = post
            adminStatus = result.message.isEmpty ? "文章已发布" : result.message
            await refresh(manual: false)
        } catch {
            adminStatus = error.localizedDescription
        }
    }

    func delete(post: Post) async {
        guard let session = adminSession else { return }
        do {
            var json = adminJSON
            var posts = json["posts"] as? [[String: Any]] ?? []
            posts.removeAll { ($0["slug"] as? String) == post.slug }
            json["posts"] = posts
            _ = try await repository.publish(token: session.token, json: json)
            adminJSON = json
            let data = try JSONSerialization.data(withJSONObject: json)
            adminBlog = try JSONDecoder().decode(BlogData.self, from: data)
            selectedAdminPost = adminBlog.posts.first
            adminStatus = "文章已删除并发布"
            await refresh(manual: false)
        } catch {
            adminStatus = error.localizedDescription
        }
    }

    func publishProfile(name: String, headline: String, summary: String, contactsText: String) async {
        guard let session = adminSession else { return }
        do {
            var json = adminJSON
            var profile = json["profile"] as? [String: Any] ?? [:]
            profile["name"] = name
            profile["headline"] = headline
            profile["summary"] = summary
            profile["contacts"] = contactsText.components(separatedBy: .newlines).map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
            json["profile"] = profile
            _ = try await repository.publish(token: session.token, json: json)
            adminJSON = json
            adminStatus = "简历已发布"
            await refresh(manual: false)
        } catch {
            adminStatus = error.localizedDescription
        }
    }

    private func sort(_ posts: [Post]) -> [Post] {
        switch sortMode {
        case .newest:
            return posts.sorted { $0.date > $1.date }
        case .oldest:
            return posts.sorted { $0.date < $1.date }
        case .titleAsc:
            return posts.sorted { $0.title.localizedStandardCompare($1.title) == .orderedAscending }
        case .titleDesc:
            return posts.sorted { $0.title.localizedStandardCompare($1.title) == .orderedDescending }
        case .updated:
            return posts.sorted { $0.modifiedDate > $1.modifiedDate }
        }
    }

    private func upserting(post: Post, into json: [String: Any]) -> [String: Any] {
        var output = json
        var posts = output["posts"] as? [[String: Any]] ?? []
        let item: [String: Any] = [
            "title": post.title,
            "slug": post.slug,
            "date": post.date,
            "createdAt": post.createdAt ?? post.date,
            "updatedAt": Post.todayString,
            "tags": post.tags,
            "summary": post.summary,
            "content": post.content,
            "visibility": post.isPasswordProtected ? "password" : "public",
            "accessPassword": post.isPasswordProtected ? (post.accessPassword ?? "") : "",
            "readingMinutes": post.readingMinutes ?? 3,
            "attachments": (post.attachments ?? []).map {
                [
                    "id": $0.id,
                    "name": $0.name,
                    "fileName": $0.fileName,
                    "mimeType": $0.mimeType ?? "",
                    "size": $0.size ?? 0,
                    "url": $0.url ?? "",
                    "dataUrl": $0.dataUrl ?? ""
                ] as [String: Any]
            }
        ]
        if let index = posts.firstIndex(where: { ($0["slug"] as? String) == post.slug }) {
            posts[index] = item
        } else {
            posts.insert(item, at: 0)
        }
        output["posts"] = posts
        return output
    }
}

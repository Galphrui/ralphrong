import Foundation

final class BlogRepository {
    static let publicDataURL = URL(string: "https://galphrui.github.io/ralphrong/data/posts.json")!
    static let workerBaseURL = URL(string: "https://ralphrong-blog-admin.ralphrong.workers.dev")!

    private let cache = CacheStore()
    private let session: URLSession
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    init(session: URLSession = .shared) {
        self.session = session
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
    }

    func fetchPublicData() async throws -> (BlogData, DataSource) {
        do {
            var components = URLComponents(url: Self.publicDataURL, resolvingAgainstBaseURL: false)!
            components.queryItems = [URLQueryItem(name: "t", value: String(Int(Date().timeIntervalSince1970 * 1000)))]
            let data = try await requestData(url: components.url!, method: "GET")
            try cache.saveBlogData(data)
            var blog = try decoder.decode(BlogData.self, from: data)
            blog.posts.sort { $0.date > $1.date }
            return (blog, .online("公网数据"))
        } catch {
            if let data = try? cache.loadBlogData() {
                var blog = try decoder.decode(BlogData.self, from: data)
                blog.posts.sort { $0.date > $1.date }
                return (blog, .cache("本地缓存"))
            }
            let data = try Self.loadBundledOfflineData()
            var blog = try decoder.decode(BlogData.self, from: data)
            blog.posts.sort { $0.date > $1.date }
            return (blog, .offline("内置离线数据"))
        }
    }

    func recordVisit(visitorId: String) async throws -> VisitStats {
        do {
            let response: VisitEnvelope = try await requestJSON(path: "/api/visits", method: "POST", body: ["visitorId": visitorId])
            var stats = response.data ?? VisitStats()
            stats.sourceMessage = "公网统计"
            try cache.saveStats(stats)
            return stats
        } catch {
            if let stats = try? cache.loadStats() { return stats }
            throw error
        }
    }

    func fetchVisitStats() async throws -> VisitStats {
        do {
            let response: VisitEnvelope = try await requestJSON(path: "/api/visits", method: "GET")
            var stats = response.data ?? VisitStats()
            stats.sourceMessage = "公网统计"
            try cache.saveStats(stats)
            return stats
        } catch {
            if let stats = try? cache.loadStats() { return stats }
            throw error
        }
    }

    func fetchMessages(postSlug: String = "") async throws -> [GuestMessage] {
        var path = "/api/messages"
        if !postSlug.isEmpty {
            path += "?postSlug=\(postSlug.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? postSlug)"
        }
        let response: ListEnvelope<GuestMessage> = try await requestJSON(path: path, method: "GET")
        return response.data ?? []
    }

    func createMessage(name: String, message: String, postSlug: String = "") async throws -> [GuestMessage] {
        let body = ["name": name, "message": message, "postSlug": postSlug]
        let response: ListEnvelope<GuestMessage> = try await requestJSON(path: "/api/messages", method: "POST", body: body)
        return response.data ?? []
    }

    func fetchPostMetrics() async throws -> [String: PostMetric] {
        let response: DictionaryEnvelope<PostMetric> = try await requestJSON(path: "/api/post-metrics", method: "GET")
        return response.data ?? [:]
    }

    func recordPostView(slug: String) async throws -> [String: PostMetric] {
        let response: DictionaryEnvelope<PostMetric> = try await requestJSON(path: "/api/post-view", method: "POST", body: ["slug": slug])
        return response.data ?? [:]
    }

    func likePost(slug: String, visitorId: String) async throws -> [String: PostMetric] {
        let response: DictionaryEnvelope<PostMetric> = try await requestJSON(path: "/api/post-like", method: "POST", body: ["slug": slug, "visitorId": visitorId])
        return response.data ?? [:]
    }

    func login(username: String, password: String) async throws -> AdminSession {
        let response: LoginEnvelope = try await requestJSON(path: "/api/login", method: "POST", body: ["username": username, "password": password])
        guard response.ok else { throw RepositoryError.server(response.error ?? "登录失败") }
        return AdminSession(user: response.user ?? username, token: response.sessionToken ?? "")
    }

    func fetchAdminData(token: String) async throws -> (BlogData, [String: Any]) {
        let raw = try await requestJSONObject(path: "/api/posts", method: "GET", token: token)
        guard (raw["ok"] as? Bool) == true, let dataObject = raw["data"] as? [String: Any] else {
            throw RepositoryError.server(raw["error"] as? String ?? "读取后台数据失败")
        }
        let data = try JSONSerialization.data(withJSONObject: dataObject)
        var blog = try decoder.decode(BlogData.self, from: data)
        blog.posts.sort { $0.date > $1.date }
        return (blog, dataObject)
    }

    func publish(token: String, json: [String: Any]) async throws -> DeployResult {
        let raw = try await requestJSONObject(path: "/api/posts", method: "PUT", body: ["data": json], token: token)
        guard (raw["ok"] as? Bool) == true else {
            throw RepositoryError.server(raw["error"] as? String ?? "发布失败")
        }
        if let deploy = raw["deploy"] as? [String: Any] {
            let data = try JSONSerialization.data(withJSONObject: deploy)
            return try decoder.decode(DeployResult.self, from: data)
        }
        return DeployResult()
    }

    func saveBlogCache(json: [String: Any]) throws {
        let data = try JSONSerialization.data(withJSONObject: json)
        try cache.saveBlogData(data)
    }

    private func requestJSON<T: Decodable>(path: String, method: String, body: Encodable? = Optional<String>.none, token: String? = nil) async throws -> T {
        let data = try await requestData(url: url(for: path), method: method, body: body, token: token)
        let envelope = try decoder.decode(ServerOKEnvelope.self, from: data)
        if envelope.ok == false { throw RepositoryError.server(envelope.error ?? "请求失败") }
        return try decoder.decode(T.self, from: data)
    }

    private func requestJSONObject(path: String, method: String, body: [String: Any]? = nil, token: String? = nil) async throws -> [String: Any] {
        let data = try await requestData(url: url(for: path), method: method, rawBody: body, token: token)
        return try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
    }

    private func requestData(url: URL, method: String, body: Encodable? = Optional<String>.none, rawBody: [String: Any]? = nil, token: String? = nil) async throws -> Data {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 12
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token, !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            request.httpBody = try encoder.encode(AnyEncodable(body))
            request.setValue("application/json; charset=utf-8", forHTTPHeaderField: "Content-Type")
        }
        if let rawBody {
            request.httpBody = try JSONSerialization.data(withJSONObject: rawBody)
            request.setValue("application/json; charset=utf-8", forHTTPHeaderField: "Content-Type")
        }
        let (data, response) = try await session.data(for: request)
        let code = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(code) else {
            let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            throw RepositoryError.server(json?["error"] as? String ?? String(data: data, encoding: .utf8) ?? "HTTP \(code)")
        }
        return data
    }

    private func url(for path: String) -> URL {
        if path.hasPrefix("http") { return URL(string: path)! }
        if path.contains("?") {
            return URL(string: Self.workerBaseURL.absoluteString + path)!
        }
        return Self.workerBaseURL.appendingPathComponent(path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))
    }

    private static func loadBundledOfflineData() throws -> Data {
        guard let url = Bundle.main.url(forResource: "offline-posts", withExtension: "json") else {
            throw RepositoryError.server("找不到内置离线数据")
        }
        return try Data(contentsOf: url)
    }
}

enum DataSource: Equatable {
    case online(String)
    case cache(String)
    case offline(String)

    var message: String {
        switch self {
        case .online(let value), .cache(let value), .offline(let value): return value
        }
    }

    var isReadOnly: Bool {
        if case .online = self { return false }
        return true
    }
}

enum RepositoryError: LocalizedError {
    case server(String)

    var errorDescription: String? {
        switch self {
        case .server(let message): return message
        }
    }
}

private struct ServerOKEnvelope: Decodable {
    var ok: Bool?
    var error: String?
}

private struct VisitEnvelope: Decodable {
    var ok: Bool?
    var error: String?
    var data: VisitStats?
}

private struct ListEnvelope<T: Decodable>: Decodable {
    var ok: Bool?
    var error: String?
    var data: [T]?
}

private struct DictionaryEnvelope<T: Decodable>: Decodable {
    var ok: Bool?
    var error: String?
    var data: [String: T]?
}

private struct LoginEnvelope: Decodable {
    var ok: Bool
    var error: String?
    var user: String?
    var sessionToken: String?
}

private struct AnyEncodable: Encodable {
    private let encodeClosure: (Encoder) throws -> Void

    init(_ wrapped: Encodable) {
        encodeClosure = wrapped.encode
    }

    func encode(to encoder: Encoder) throws {
        try encodeClosure(encoder)
    }
}

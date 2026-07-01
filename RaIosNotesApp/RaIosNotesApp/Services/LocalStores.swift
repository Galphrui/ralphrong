import CryptoKit
import Foundation

final class CacheStore {
    private let fileManager = FileManager.default

    func saveBlogData(_ data: Data) throws {
        try data.write(to: blogURL, options: [.atomic])
    }

    func loadBlogData() throws -> Data {
        try Data(contentsOf: blogURL)
    }

    func saveStats(_ stats: VisitStats) throws {
        let data = try JSONEncoder().encode(stats)
        try data.write(to: statsURL, options: [.atomic])
    }

    func loadStats() throws -> VisitStats {
        let data = try Data(contentsOf: statsURL)
        var stats = try JSONDecoder().decode(VisitStats.self, from: data)
        stats.fromCache = true
        stats.sourceMessage = "本地缓存"
        return stats
    }

    private var directory: URL {
        let url = fileManager.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("RaIosNotesApp", isDirectory: true)
        if !fileManager.fileExists(atPath: url.path) {
            try? fileManager.createDirectory(at: url, withIntermediateDirectories: true)
        }
        return url
    }

    private var blogURL: URL { directory.appendingPathComponent("blog-cache.json") }
    private var statsURL: URL { directory.appendingPathComponent("stats-cache.json") }
}

final class DeviceIdStore {
    private let key = "ra_ios_visitor_id"

    var visitorId: String {
        if let value = UserDefaults.standard.string(forKey: key), !value.isEmpty {
            return value
        }
        let value = UUID().uuidString
        UserDefaults.standard.set(value, forKey: key)
        return value
    }
}

final class LocalCredentialStore {
    private let passwordHashKey = "ra_ios_local_password_hash"
    private let saltKey = "ra_ios_local_password_salt"

    var hasPassword: Bool {
        UserDefaults.standard.string(forKey: passwordHashKey) != nil
    }

    func register(password: String) throws {
        guard password.count >= 4 else { throw CredentialError.invalid("本机密码至少 4 位。") }
        let salt = UUID().uuidString
        UserDefaults.standard.set(salt, forKey: saltKey)
        UserDefaults.standard.set(hash(password: password, salt: salt), forKey: passwordHashKey)
    }

    func verify(password: String) -> Bool {
        guard let salt = UserDefaults.standard.string(forKey: saltKey),
              let stored = UserDefaults.standard.string(forKey: passwordHashKey) else {
            return false
        }
        return stored == hash(password: password, salt: salt)
    }

    func change(oldPassword: String, newPassword: String) throws {
        guard verify(password: oldPassword) else { throw CredentialError.invalid("原本机密码不正确。") }
        try register(password: newPassword)
    }

    private func hash(password: String, salt: String) -> String {
        let data = Data("\(salt):\(password)".utf8)
        return SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }
}

enum CredentialError: LocalizedError {
    case invalid(String)

    var errorDescription: String? {
        switch self {
        case .invalid(let message): return message
        }
    }
}

enum Moderation {
    static func validate(name: String, message: String) -> String? {
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanMessage = message.trimmingCharacters(in: .whitespacesAndNewlines)
        if cleanName.count > 24 { return "昵称最多 24 个字。" }
        if cleanMessage.count < 2 { return "留言至少需要 2 个字。" }
        if cleanMessage.count > 240 { return "留言最多 240 个字。" }

        let source = (cleanName + " " + cleanMessage).lowercased()
        let blocked = ["http://", "https://", "www.", "加微信", "博彩", "贷款", "发票"]
        if blocked.contains(where: { source.contains($0) }) {
            return "留言里包含暂不支持发布的内容。"
        }
        return nil
    }
}

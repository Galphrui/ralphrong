import Foundation

struct BlogData: Codable {
    var site: Site?
    var profile: Profile?
    var posts: [Post]
    var repositories: [CodeRepository]
    var modules: ModuleRegistry?

    var title: String { site?.title ?? "Ra Android Notes" }
    var subtitle: String { site?.subtitle ?? "工程实践与调试笔记" }

    static let empty = BlogData(site: nil, profile: Profile(), posts: [], repositories: [], modules: nil)

    enum CodingKeys: String, CodingKey {
        case site, profile, posts, repositories, modules
    }

    init(site: Site?, profile: Profile?, posts: [Post], repositories: [CodeRepository] = [], modules: ModuleRegistry? = nil) {
        self.site = site
        self.profile = profile
        self.posts = posts
        self.repositories = repositories
        self.modules = modules
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        site = try container.decodeIfPresent(Site.self, forKey: .site)
        profile = try container.decodeIfPresent(Profile.self, forKey: .profile)
        posts = try container.decodeIfPresent([Post].self, forKey: .posts) ?? []
        repositories = try container.decodeIfPresent([CodeRepository].self, forKey: .repositories) ?? []
        modules = try container.decodeIfPresent(ModuleRegistry.self, forKey: .modules)
    }
}

struct Site: Codable {
    var title: String
    var subtitle: String
}

struct CodeRepository: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var description: String
    var language: String
    var tags: [String]
    var url: String?
    var sourcePath: String?
    var updatedAt: String?
    var snippet: String?
    var notes: String?
    var attachments: [PostAttachment]?
}

struct ModuleRegistry: Codable, Hashable {
    var settings: ModuleSettings?
    var modules: [FeatureModule]
}

struct ModuleSettings: Codable, Hashable {
    var maxTopModules: Int?
}

struct FeatureModule: Codable, Identifiable, Hashable {
    var id: String
    var label: String
    var href: String?
    var enabled: Bool?
    var order: Int?
    var surface: String?
    var external: Bool?
}

struct Post: Codable, Identifiable, Hashable {
    var id: String { slug }
    var title: String
    var slug: String
    var date: String
    var createdAt: String?
    var updatedAt: String?
    var modifiedAt: String?
    var lastModified: String?
    var tags: [String]
    var summary: String
    var content: String
    var visibility: String?
    var accessPassword: String?
    var readingMinutes: Int?
    var attachments: [PostAttachment]?

    var readingText: String { "\(readingMinutes ?? 3) 分钟阅读" }
    var modifiedDate: String { updatedAt ?? modifiedAt ?? lastModified ?? createdAt ?? date }
    var isPasswordProtected: Bool { visibility == "password" || visibility == "private" }

    static let blank = Post(title: "", slug: "", date: Self.todayString, createdAt: nil, updatedAt: nil, modifiedAt: nil, lastModified: nil, tags: [], summary: "", content: "", visibility: "public", accessPassword: "", readingMinutes: 3, attachments: [])

    static var todayString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }
}

struct PostAttachment: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var fileName: String
    var mimeType: String?
    var size: Int?
    var url: String?
    var dataUrl: String?

    var sizeText: String {
        guard let size else { return "" }
        if size < 1024 { return "\(size) B" }
        if size < 1024 * 1024 { return String(format: "%.1f KB", Double(size) / 1024) }
        return String(format: "%.1f MB", Double(size) / 1024 / 1024)
    }
}

struct Profile: Codable {
    var name: String = "Ralph Rong / Ra"
    var headline: String = ""
    var summary: String = ""
    var intent: String = ""
    var photoUrl: String = ""
    var contacts: [String] = []
    var advantages: [String] = []
    var skills: [SkillGroup] = []
    var workExperience: [ExperienceItem] = []
    var projects: [ExperienceItem] = []
    var education: [ExperienceItem] = []
    var selfReview: [String] = []
    var sections: [ResumeSection] = []
}

struct SkillGroup: Codable, Identifiable, Hashable {
    var id: String { name + items.joined() }
    var name: String
    var items: [String]
}

struct ExperienceItem: Codable, Identifiable, Hashable {
    var id: String { title + period + meta }
    var title: String
    var period: String
    var meta: String
    var details: [String]
}

struct ResumeSection: Codable, Identifiable, Hashable {
    var id: String { title + content }
    var title: String
    var content: String
}

struct VisitStats: Codable {
    var visits: Int = 0
    var visitors: Int = 0
    var lastVisitAt: String = ""
    var fromCache: Bool = false
    var sourceMessage: String = ""
}

struct GuestMessage: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var message: String
    var createdAt: String
}

struct PostMetric: Codable, Hashable {
    var views: Int = 0
    var likes: Int = 0
}

struct AdminSession: Codable {
    var user: String
    var token: String
}

struct DeployResult: Codable {
    var commitSha: String = ""
    var workflowTriggered: Bool = false
    var workflowError: String = ""
    var message: String = ""
}

enum SortMode: String, CaseIterable, Identifiable {
    case newest
    case oldest
    case titleAsc
    case titleDesc
    case updated

    var id: String { rawValue }
    var label: String {
        switch self {
        case .newest: return "最新发布"
        case .oldest: return "最早发布"
        case .titleAsc: return "标题 A-Z"
        case .titleDesc: return "标题 Z-A"
        case .updated: return "最近修改"
        }
    }
}

enum PromoMode: String, CaseIterable, Identifiable {
    case latest
    case views
    case likes

    var id: String { rawValue }
    var label: String {
        switch self {
        case .latest: return "最近更新"
        case .views: return "点击最多"
        case .likes: return "点赞最多"
        }
    }
}

import SwiftUI

extension Color {
    static let raBackground = Color(red: 246 / 255, green: 251 / 255, blue: 248 / 255)
    static let raPanel = Color.white
    static let raPrimary = Color(red: 7 / 255, green: 95 / 255, blue: 81 / 255)
    static let raPrimaryLight = Color(red: 233 / 255, green: 251 / 255, blue: 246 / 255)
    static let raAccent = Color(red: 245 / 255, green: 158 / 255, blue: 11 / 255)
}

struct HeaderView: View {
    @EnvironmentObject private var model: AppViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(model.blog.title)
                .font(.largeTitle.weight(.bold))
            Text(model.blog.subtitle)
                .font(.headline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct SourceBanner: View {
    @EnvironmentObject private var model: AppViewModel

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: model.isReadOnly ? "wifi.slash" : "checkmark.icloud")
            Text(model.isReadOnly ? "\(model.source.message) · 只读模式" : model.source.message)
            Spacer()
            Button {
                Task { await model.refresh() }
            } label: {
                Image(systemName: "arrow.clockwise")
            }
            .buttonStyle(.plain)
        }
        .font(.footnote)
        .padding(10)
        .background(model.isReadOnly ? Color.orange.opacity(0.12) : Color.raPrimaryLight, in: RoundedRectangle(cornerRadius: 8))
        .foregroundStyle(model.isReadOnly ? .orange : Color.raPrimary)
    }
}

struct FeaturedPostCard: View {
    @EnvironmentObject private var model: AppViewModel
    let post: Post

    var body: some View {
        Panel {
            VStack(alignment: .leading, spacing: 10) {
                Text(post.title)
                    .font(.headline)
                    .lineLimit(2)
                    .frame(width: 230, alignment: .leading)
                Text(post.summary)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
                    .frame(width: 230, alignment: .leading)
                Text("\(post.date) · \(model.metric(for: post.slug).views) 点击 · \(model.metric(for: post.slug).likes) 赞")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(width: 270)
    }
}

struct PostRow: View {
    @EnvironmentObject private var model: AppViewModel
    let post: Post

    var body: some View {
        Panel {
            VStack(alignment: .leading, spacing: 10) {
                Text(post.title)
                    .font(.headline)
                Text(post.summary)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
                TagCloud(tags: post.tags)
                Text("\(post.date) · \(post.readingText) · \(model.metric(for: post.slug).views) 点击 · \(model.metric(for: post.slug).likes) 赞")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

struct TagCloud: View {
    let tags: [String]

    var body: some View {
        FlowLayout(spacing: 8) {
            ForEach(tags, id: \.self) { tag in
                Text(tag)
                    .font(.caption)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.raPrimaryLight, in: Capsule())
                    .foregroundStyle(Color.raPrimary)
            }
        }
    }
}

struct Panel<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        content
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(Color.raPanel, in: RoundedRectangle(cornerRadius: 8))
            .overlay {
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.black.opacity(0.06), lineWidth: 1)
            }
    }
}

struct SectionBlock: View {
    let title: String
    let rows: [String]

    var body: some View {
        if !rows.isEmpty {
            Panel {
                VStack(alignment: .leading, spacing: 8) {
                    Text(title).font(.headline)
                    ForEach(rows, id: \.self) { row in
                        Label(row, systemImage: "checkmark.circle")
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }
}

struct ExperienceSection: View {
    let title: String
    let items: [ExperienceItem]

    var body: some View {
        if !items.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                Text(title).font(.headline)
                ForEach(items) { item in
                    Panel {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(item.title).font(.headline)
                            Text([item.period, item.meta].filter { !$0.isEmpty }.joined(separator: " · "))
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                            ForEach(item.details, id: \.self) { detail in
                                Label(detail, systemImage: "smallcircle.filled.circle")
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
        }
    }
}

struct MarkdownText: View {
    let value: String

    init(_ value: String) {
        self.value = value
    }

    var body: some View {
        if let attributed = try? AttributedString(markdown: value, options: AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)) {
            Text(attributed)
                .lineSpacing(5)
                .frame(maxWidth: .infinity, alignment: .leading)
        } else {
            Text(value)
                .lineSpacing(5)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

struct MessageComposer: View {
    let title: String
    @Binding var name: String
    @Binding var message: String
    let submit: () async -> Void

    var body: some View {
        Panel {
            VStack(alignment: .leading, spacing: 12) {
                Text(title).font(.headline)
                TextField("昵称（可选）", text: $name)
                    .textInputAutocapitalization(.never)
                    .textFieldStyle(.roundedBorder)
                TextEditor(text: $message)
                    .frame(minHeight: 110)
                    .padding(6)
                    .background(Color.raBackground, in: RoundedRectangle(cornerRadius: 8))
                Button {
                    Task { await submit() }
                } label: {
                    Label("发布留言", systemImage: "paperplane")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.raPrimary)
            }
        }
    }
}

struct MessageList: View {
    let messages: [GuestMessage]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("留言列表 · \(messages.count)")
                .font(.headline)
            if messages.isEmpty {
                Panel {
                    Text("还没有留言。")
                        .foregroundStyle(.secondary)
                }
            } else {
                ForEach(messages) { item in
                    Panel {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(item.name.isEmpty ? "陌生朋友" : item.name)
                                .font(.headline)
                            Text(item.message)
                            Text(item.createdAt)
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
    }
}

struct StatCard: View {
    let title: String
    let value: String

    var body: some View {
        Panel {
            VStack(alignment: .leading, spacing: 8) {
                Text(title)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                Text(value)
                    .font(.largeTitle.weight(.bold).monospacedDigit())
                    .foregroundStyle(Color.raPrimary)
            }
        }
    }
}

struct ChipButtonStyle: ButtonStyle {
    let selected: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(selected ? Color.raPrimary : Color.raPrimaryLight, in: Capsule())
            .foregroundStyle(selected ? .white : Color.raPrimary)
            .opacity(configuration.isPressed ? 0.75 : 1)
    }
}

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 320
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > width, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: width, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX
        var y = bounds.minY
        var rowHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            subview.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}

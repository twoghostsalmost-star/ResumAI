import SwiftUI

/// Native SwiftUI render of the resume + export/share actions.
struct PreviewTab: View {
    @Bindable var store: ResumeStore

    @State private var shareItems: [Any]?
    @State private var safariURL: URL?
    @State private var isExporting = false
    @State private var errorMessage: String?

    private var resume: Resume? { store.resume }
    private var accent: Color { Color(hex: resume?.design.accentColor ?? "#1f2933") }
    private var fontScale: CGFloat { CGFloat(resume?.design.fontScale ?? 1.0) }

    var body: some View {
        NavigationStack {
            ScrollView {
                if let resume {
                    ResumePreviewDocument(resume: resume, accent: accent, fontScale: fontScale)
                        .padding()
                }
                if let errorMessage {
                    ErrorBanner(message: errorMessage) { self.errorMessage = nil }
                }
            }
            .glassScreenBackground()
            .softScrollEdges()
            .navigationTitle("Preview")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Section("Export") {
                            ForEach(ExportFormat.allCases) { fmt in
                                Button {
                                    Task { await export(fmt) }
                                } label: {
                                    Label(fmt.label, systemImage: "arrow.down.doc")
                                }
                            }
                        }
                        Button {
                            Task { await share() }
                        } label: {
                            Label("Share link", systemImage: "link")
                        }
                    } label: {
                        Image(systemName: "square.and.arrow.up")
                    }
                }
            }
            .overlay { if isExporting { LoadingOverlay(text: "Preparing…") } }
            .sheet(isPresented: Binding(
                get: { shareItems != nil },
                set: { if !$0 { shareItems = nil } }
            )) {
                if let shareItems { ShareSheet(items: shareItems) }
            }
            .sheet(item: $safariURL) { url in SafariView(url: url) }
        }
    }

    private func export(_ format: ExportFormat) async {
        guard let resume else { return }
        isExporting = true
        defer { isExporting = false }
        do {
            let fileURL = try await store.api.downloadExport(id: resume.id, format: format)
            shareItems = [fileURL]
        } catch {
            // Fall back to opening the export URL in Safari if download fails.
            if let url = store.api.exportURL(id: resume.id, format: format) {
                safariURL = url
            } else {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func share() async {
        guard let resume else { return }
        isExporting = true
        defer { isExporting = false }
        do {
            let result = try await store.api.shareLink(id: resume.id)
            if let url = URL(string: result.url) {
                shareItems = [url]
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Native document render

/// A single-column, ATS-style render honoring accent color and font scale.
struct ResumePreviewDocument: View {
    let resume: Resume
    let accent: Color
    let fontScale: CGFloat

    var body: some View {
        VStack(alignment: .leading, spacing: 16 * fontScale) {
            header
            if let summary = resume.basics.summary?.nilIfEmpty {
                sectionTitle("Summary")
                Text(summary).font(.system(size: 13 * fontScale))
            }
            ForEach(resume.sections) { section in
                renderSection(section)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(24)
        .background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .strokeBorder(.separator.opacity(0.4), lineWidth: 0.5)
        )
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4 * fontScale) {
            Text(resume.basics.fullName.nilIfEmpty ?? "Your Name")
                .font(.system(size: 26 * fontScale, weight: .bold))
                .foregroundStyle(accent)
            if let headline = resume.basics.headline?.nilIfEmpty {
                Text(headline)
                    .font(.system(size: 14 * fontScale, weight: .medium))
                    .foregroundStyle(.secondary)
            }
            let contact = [resume.basics.email, resume.basics.phone, resume.basics.location]
                .compactMap { $0?.nilIfEmpty }
                .joined(separator: "  ·  ")
            if !contact.isEmpty {
                Text(contact).font(.system(size: 11 * fontScale)).foregroundStyle(.secondary)
            }
            if !resume.basics.links.isEmpty {
                Text(resume.basics.links.map(\.label).joined(separator: "  ·  "))
                    .font(.system(size: 11 * fontScale))
                    .foregroundStyle(accent)
            }
        }
    }

    private func sectionTitle(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.system(size: 13 * fontScale, weight: .heavy))
            .foregroundStyle(accent)
            .padding(.top, 4 * fontScale)
            .overlay(alignment: .bottom) {
                Rectangle().fill(accent.opacity(0.4)).frame(height: 1).offset(y: 4)
            }
    }

    @ViewBuilder
    private func renderSection(_ section: ResumeSection) -> some View {
        switch section {
        case let .experience(_, items):
            sectionTitle("Experience")
            ForEach(items) { item in
                VStack(alignment: .leading, spacing: 2 * fontScale) {
                    HStack {
                        Text(item.role).font(.system(size: 14 * fontScale, weight: .semibold))
                        Spacer()
                        Text(dateRange(item.startDate, item.endDate))
                            .font(.system(size: 11 * fontScale)).foregroundStyle(.secondary)
                    }
                    Text(([item.company.nilIfEmpty, item.location].compactMap { $0?.nilIfEmpty }).joined(separator: " · "))
                        .font(.system(size: 12 * fontScale)).foregroundStyle(.secondary)
                    bullets(item.bullets)
                }
                .padding(.bottom, 6 * fontScale)
            }
        case let .education(_, items):
            sectionTitle("Education")
            ForEach(items) { item in
                VStack(alignment: .leading, spacing: 2 * fontScale) {
                    Text(item.institution).font(.system(size: 14 * fontScale, weight: .semibold))
                    let line = [item.degree, item.field].compactMap { $0?.nilIfEmpty }.joined(separator: ", ")
                    if !line.isEmpty {
                        Text(line).font(.system(size: 12 * fontScale)).foregroundStyle(.secondary)
                    }
                    bullets(item.details)
                }
                .padding(.bottom, 6 * fontScale)
            }
        case let .skills(_, groups):
            sectionTitle("Skills")
            ForEach(groups) { group in
                HStack(alignment: .top, spacing: 4) {
                    if let name = group.name?.nilIfEmpty {
                        Text("\(name): ").font(.system(size: 12 * fontScale, weight: .semibold))
                    }
                    Text(group.skills.joined(separator: ", "))
                        .font(.system(size: 12 * fontScale))
                }
            }
        case let .projects(_, items):
            sectionTitle("Projects")
            ForEach(items) { item in
                VStack(alignment: .leading, spacing: 2 * fontScale) {
                    Text(item.name).font(.system(size: 14 * fontScale, weight: .semibold))
                    bullets(item.bullets)
                }
                .padding(.bottom, 6 * fontScale)
            }
        case let .certifications(_, items):
            sectionTitle("Certifications")
            ForEach(items) { item in
                Text(([item.name.nilIfEmpty, item.issuer, item.date].compactMap { $0?.nilIfEmpty }).joined(separator: " · "))
                    .font(.system(size: 12 * fontScale))
            }
        case let .custom(_, heading, items):
            sectionTitle(heading.nilIfEmpty ?? "Custom")
            bullets(items.map(\.text))
        }
    }

    private func bullets(_ lines: [String]) -> some View {
        VStack(alignment: .leading, spacing: 2 * fontScale) {
            ForEach(Array(lines.enumerated()), id: \.offset) { _, line in
                HStack(alignment: .top, spacing: 6) {
                    Text("•").foregroundStyle(accent)
                    Text(line)
                }
                .font(.system(size: 12 * fontScale))
            }
        }
    }

    private func dateRange(_ start: String, _ end: String?) -> String {
        let e = (end?.nilIfEmpty).map { $0 == "present" ? "Present" : $0 } ?? ""
        if start.isEmpty && e.isEmpty { return "" }
        return [start, e].filter { !$0.isEmpty }.joined(separator: " – ")
    }
}

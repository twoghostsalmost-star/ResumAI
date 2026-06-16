import SwiftUI

/// Review screen for parsed import results. Shows parsed fields with
/// low-confidence ones highlighted; confirming creates the resume and opens it.
struct ImportReviewView: View {
    let api: APIClient
    let parseResult: ParseResult
    var onOpenEditor: (String) -> Void

    @State private var resume: Resume
    @State private var isSaving = false
    @State private var errorMessage: String?

    private let lowConfidence: Set<String>

    init(api: APIClient, parseResult: ParseResult, onOpenEditor: @escaping (String) -> Void) {
        self.api = api
        self.parseResult = parseResult
        self.onOpenEditor = onOpenEditor
        _resume = State(initialValue: parseResult.resume)
        self.lowConfidence = Set(parseResult.lowConfidenceFields)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                GlassCard(cornerRadius: 18, tint: .tint.opacity(0.12)) {
                    HStack {
                        Image(systemName: "checkmark.seal")
                            .foregroundStyle(.tint)
                        VStack(alignment: .leading) {
                            Text("Parsed via \(parseResult.method)")
                                .font(.subheadline.weight(.semibold))
                            if !lowConfidence.isEmpty {
                                Text("\(lowConfidence.count) field(s) need your review (highlighted).")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            } else {
                                Text("Everything looks good. Review and confirm.")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }

                // Basics
                GlassCard(cornerRadius: 18) {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Basics").font(.headline)
                        reviewField("Full name", text: $resume.basics.fullName, path: "basics.fullName")
                        reviewOptionalField("Email", value: optionalBinding(\.basics.email), path: "basics.email")
                        reviewOptionalField("Phone", value: optionalBinding(\.basics.phone), path: "basics.phone")
                        reviewOptionalField("Headline", value: optionalBinding(\.basics.headline), path: "basics.headline")
                    }
                }

                // Sections summary
                if !resume.sections.isEmpty {
                    GlassCard(cornerRadius: 18) {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Sections").font(.headline)
                            ForEach(resume.sections) { section in
                                HStack {
                                    Image(systemName: section.kind.systemImage)
                                        .foregroundStyle(.tint)
                                    Text(section.displayHeading)
                                    Spacer()
                                    Text(sectionSummary(section))
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                .padding(.vertical, 4)
                            }
                        }
                    }
                }

                if let errorMessage {
                    ErrorBanner(message: errorMessage) { self.errorMessage = nil }
                }

                Button {
                    Task { await confirm() }
                } label: {
                    Label("Create resume", systemImage: "checkmark")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                }
                .glassProminentButton()
                .controlSize(.large)
            }
            .padding()
        }
        .glassScreenBackground()
        .navigationTitle("Review")
        .navigationBarTitleDisplayMode(.inline)
        .overlay { if isSaving { LoadingOverlay(text: "Creating resume…") } }
    }

    private func reviewField(_ label: String, text: Binding<String>, path: String) -> some View {
        let isLow = lowConfidence.contains(path)
        return VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label).font(.caption).foregroundStyle(.secondary)
                if isLow {
                    Label("review", systemImage: "exclamationmark.triangle.fill")
                        .font(.caption2)
                        .foregroundStyle(.orange)
                        .labelStyle(.titleAndIcon)
                }
            }
            TextField(label, text: text)
                .padding(10)
                .glassCard(cornerRadius: 12, tint: isLow ? .orange.opacity(0.18) : nil)
        }
    }

    private func reviewOptionalField(_ label: String, value: Binding<String>, path: String) -> some View {
        reviewField(label, text: value, path: path)
    }

    /// Binding that maps an optional String key path to a non-optional editor.
    private func optionalBinding(_ keyPath: WritableKeyPath<Resume, String?>) -> Binding<String> {
        Binding(
            get: { resume[keyPath: keyPath] ?? "" },
            set: { resume[keyPath: keyPath] = $0.nilIfEmpty }
        )
    }

    private func sectionSummary(_ section: ResumeSection) -> String {
        switch section {
        case let .experience(_, items): return "\(items.count) role(s)"
        case let .education(_, items): return "\(items.count) item(s)"
        case let .skills(_, groups): return "\(groups.reduce(0) { $0 + $1.skills.count }) skill(s)"
        case let .projects(_, items): return "\(items.count) project(s)"
        case let .certifications(_, items): return "\(items.count) cert(s)"
        case let .custom(_, _, items): return "\(items.count) item(s)"
        }
    }

    private func confirm() async {
        isSaving = true
        defer { isSaving = false }
        do {
            // Create with the parsed data; the server assigns the real id.
            let created = try await api.createResume(
                title: resume.title,
                source: .upload,
                data: resume
            )
            onOpenEditor(created.id)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

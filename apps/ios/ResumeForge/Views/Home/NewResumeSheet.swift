import SwiftUI

/// Sheet offering the three creation paths: scratch / upload / LinkedIn, each as
/// a glass option card.
struct NewResumeSheet: View {
    let api: APIClient
    /// Called with the new resume id when an editor should open.
    var onOpenEditor: (String) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var isWorking = false
    @State private var errorMessage: String?
    @State private var showImport = false
    @State private var safariURL: URL?
    @State private var linkedInFallbackText: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    Text("Start a new resume")
                        .font(.title2.bold())
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Text("Pick how you'd like to begin.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    optionCard(
                        icon: "square.and.pencil",
                        title: "Build from scratch",
                        subtitle: "Start with a blank, ATS-ready template."
                    ) { Task { await createScratch() } }

                    optionCard(
                        icon: "arrow.up.doc",
                        title: "Upload a resume",
                        subtitle: "Paste text or import a PDF/DOCX to parse."
                    ) { showImport = true }

                    optionCard(
                        icon: "link",
                        title: "Import from LinkedIn",
                        subtitle: "Sign in with LinkedIn, or use the PDF fallback."
                    ) { Task { await startLinkedIn() } }

                    if let linkedInFallbackText {
                        GlassCard(cornerRadius: 18, tint: .blue.opacity(0.15)) {
                            VStack(alignment: .leading, spacing: 6) {
                                Label("LinkedIn not configured", systemImage: "info.circle")
                                    .font(.subheadline.weight(.semibold))
                                Text(linkedInFallbackText)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }

                    if let errorMessage {
                        ErrorBanner(message: errorMessage) { self.errorMessage = nil }
                    }
                }
                .padding()
            }
            .glassScreenBackground()
            .navigationTitle("New Resume")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .overlay { if isWorking { LoadingOverlay(text: "Creating…") } }
            .navigationDestination(isPresented: $showImport) {
                ImportView(api: api) { resumeId in
                    onOpenEditor(resumeId)
                }
            }
            .sheet(item: $safariURL) { url in
                SafariView(url: url)
            }
        }
    }

    private func optionCard(
        icon: String,
        title: String,
        subtitle: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundStyle(.tint)
                    .frame(width: 46, height: 46)
                    .glassCard(cornerRadius: 14)
                VStack(alignment: .leading, spacing: 3) {
                    Text(title).font(.headline)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.leading)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.footnote)
                    .foregroundStyle(.tertiary)
            }
            .padding(16)
            .glassCard(cornerRadius: 20, interactive: true)
        }
        .buttonStyle(.plain)
        .disabled(isWorking)
    }

    private func createScratch() async {
        isWorking = true
        defer { isWorking = false }
        do {
            let resume = try await api.createResume(title: "Untitled Resume", source: .scratch)
            onOpenEditor(resume.id)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func startLinkedIn() async {
        isWorking = true
        defer { isWorking = false }
        do {
            let auth = try await api.linkedinAuthURL()
            if let url = URL(string: auth.url) {
                safariURL = url
            }
        } catch {
            // The API returns 501 when LinkedIn isn't configured — show the
            // PDF-fallback guidance instead of a raw error.
            linkedInFallbackText = """
            LinkedIn sign-in isn't configured on this server. Instead, open your \
            LinkedIn profile, choose "Save to PDF", then use "Upload a resume" to \
            import it.
            """
        }
    }
}

extension URL: @retroactive Identifiable {
    public var id: String { absoluteString }
}

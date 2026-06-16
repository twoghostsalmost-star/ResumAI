import SwiftUI
import UniformTypeIdentifiers

/// Import flow: paste resume text or pick a PDF/DOCX, send to `/parse/text`
/// (or `/parse/upload` for files), then push a review screen.
struct ImportView: View {
    let api: APIClient
    var onOpenEditor: (String) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var pastedText = ""
    @State private var isParsing = false
    @State private var errorMessage: String?
    @State private var parseResult: ParseResult?
    @State private var showFileImporter = false

    private var canParse: Bool {
        pastedText.trimmingCharacters(in: .whitespacesAndNewlines).count >= 1 && !isParsing
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Paste your resume")
                    .font(.headline)
                Text("Paste the full text of your resume, or import a file to extract it.")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                GlassCard(cornerRadius: 18) {
                    TextEditor(text: $pastedText)
                        .frame(minHeight: 220)
                        .scrollContentBackground(.hidden)
                        .overlay(alignment: .topLeading) {
                            if pastedText.isEmpty {
                                Text("Jane Doe\njane@example.com · (555) 123-4567\n\nExperience\n…")
                                    .foregroundStyle(.tertiary)
                                    .padding(.top, 8)
                                    .padding(.leading, 5)
                                    .allowsHitTesting(false)
                            }
                        }
                }

                HStack(spacing: 12) {
                    Button {
                        showFileImporter = true
                    } label: {
                        Label("Import file", systemImage: "doc")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                    }
                    .glassButton()

                    Button {
                        Task { await parsePasted() }
                    } label: {
                        Label("Parse", systemImage: "wand.and.stars")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                    }
                    .glassProminentButton()
                    .disabled(!canParse)
                }
                .controlSize(.large)

                if let errorMessage {
                    ErrorBanner(message: errorMessage) { self.errorMessage = nil }
                }
            }
            .padding()
        }
        .glassScreenBackground()
        .navigationTitle("Import")
        .navigationBarTitleDisplayMode(.inline)
        .overlay { if isParsing { LoadingOverlay(text: "Parsing resume…") } }
        .fileImporter(
            isPresented: $showFileImporter,
            allowedContentTypes: [.pdf, .plainText, docxType, .item],
            allowsMultipleSelection: false
        ) { result in
            Task { await handleFileImport(result) }
        }
        .navigationDestination(item: $parseResult) { result in
            ImportReviewView(api: api, parseResult: result, onOpenEditor: onOpenEditor)
        }
    }

    private var docxType: UTType {
        UTType("org.openxmlformats.wordprocessingml.document") ?? .data
    }

    private func parsePasted() async {
        isParsing = true
        defer { isParsing = false }
        do {
            let result = try await api.parseText(pastedText)
            parseResult = result
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func handleFileImport(_ result: Result<[URL], Error>) async {
        switch result {
        case let .success(urls):
            guard let url = urls.first else { return }
            isParsing = true
            defer { isParsing = false }
            let didAccess = url.startAccessingSecurityScopedResource()
            defer { if didAccess { url.stopAccessingSecurityScopedResource() } }
            do {
                if url.pathExtension.lowercased() == "txt",
                   let text = try? String(contentsOf: url, encoding: .utf8) {
                    // Plain text → parse directly.
                    parseResult = try await api.parseText(text)
                } else {
                    // PDF/DOCX → upload bytes to /parse/upload (server extracts text).
                    parseResult = try await api.parseUpload(fileURL: url)
                }
            } catch {
                errorMessage = "Couldn't parse that file. \(error.localizedDescription)"
            }
        case let .failure(error):
            errorMessage = error.localizedDescription
        }
    }
}

extension ParseResult: Identifiable {
    var id: String { resume.id + method }
}

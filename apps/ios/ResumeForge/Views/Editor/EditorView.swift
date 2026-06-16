import SwiftUI

/// The resume editor. A `TabView` renders the Liquid Glass tab bar on iOS 26
/// across Preview / Content / Assistant / ATS.
struct EditorView: View {
    @State private var store: ResumeStore
    @State private var selectedTab: EditorTab = .content

    init(api: APIClient, resumeId: String) {
        _store = State(initialValue: ResumeStore(api: api, resumeId: resumeId))
    }

    enum EditorTab: Hashable {
        case preview, content, assistant, ats
    }

    var body: some View {
        Group {
            if store.isLoading && store.resume == nil {
                ProgressView("Loading…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if store.resume != nil {
                TabView(selection: $selectedTab) {
                    Tab("Preview", systemImage: "eye", value: EditorTab.preview) {
                        PreviewTab(store: store)
                    }
                    Tab("Content", systemImage: "list.bullet.rectangle", value: EditorTab.content) {
                        ContentTab(store: store)
                    }
                    Tab("Assistant", systemImage: "sparkles", value: EditorTab.assistant) {
                        AssistantTab(store: store)
                    }
                    Tab("ATS", systemImage: "gauge.with.dots.needle.67percent", value: EditorTab.ats) {
                        ATSTab(store: store)
                    }
                }
            } else {
                EmptyStateCard(
                    systemImage: "exclamationmark.triangle",
                    title: "Couldn't load",
                    message: store.errorMessage ?? "This resume is unavailable."
                )
            }
        }
        .navigationTitle(store.resume?.title ?? "Resume")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if store.resume == nil { await store.load() }
        }
    }
}

import SwiftUI

/// The home screen: a searchable list of the user's resumes in glass cards, a
/// glass floating "+" that morphs into the New Resume sheet, plus toolbar items.
struct HomeView: View {
    @Environment(AppState.self) private var appState

    @State private var items: [ResumeListItem] = []
    @State private var searchText = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    @State private var showNewSheet = false
    @State private var showSettings = false
    @State private var navigateResumeId: String?

    private var filtered: [ResumeListItem] {
        guard !searchText.isEmpty else { return items }
        return items.filter { $0.title.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottomTrailing) {
                listContent
                    .glassScreenBackground()

                FloatingNewButton { showNewSheet = true }
                    .padding(.trailing, 20)
                    .padding(.bottom, 24)
            }
            .navigationTitle("Resumes")
            .searchable(text: $searchText, prompt: "Search resumes")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "gearshape")
                    }
                    .accessibilityLabel("Settings")
                }
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        Task { await reload() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .accessibilityLabel("Refresh")
                }
            }
            .navigationDestination(item: $navigateResumeId) { id in
                EditorView(api: appState.api, resumeId: id)
            }
            .sheet(isPresented: $showNewSheet) {
                NewResumeSheet(api: appState.api) { resumeId in
                    showNewSheet = false
                    Task {
                        await reload()
                        navigateResumeId = resumeId
                    }
                }
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
            }
            .task { await reload() }
            .refreshable { await reload() }
        }
    }

    @ViewBuilder
    private var listContent: some View {
        if isLoading && items.isEmpty {
            ProgressView("Loading resumes…")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if items.isEmpty {
            ScrollView {
                EmptyStateCard(
                    systemImage: "doc.badge.plus",
                    title: "No resumes yet",
                    message: "Tap the + button to build from scratch, upload, or import from LinkedIn."
                )
                .padding(.top, 60)
            }
        } else {
            ScrollView {
                if let errorMessage {
                    ErrorBanner(message: errorMessage) { self.errorMessage = nil }
                        .padding(.top, 8)
                }
                LazyVStack(spacing: 14) {
                    ForEach(filtered) { item in
                        Button {
                            navigateResumeId = item.id
                        } label: {
                            ResumeRowCard(item: item)
                        }
                        .buttonStyle(.plain)
                        .contextMenu {
                            Button(role: .destructive) {
                                Task { await delete(item) }
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.top, 8)
                .padding(.bottom, 96)
            }
            .softScrollEdges()
        }
    }

    private func reload() async {
        isLoading = true
        defer { isLoading = false }
        do {
            items = try await appState.api.listResumes()
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func delete(_ item: ResumeListItem) async {
        do {
            try await appState.api.deleteResume(id: item.id)
            items.removeAll { $0.id == item.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Row card

struct ResumeRowCard: View {
    let item: ResumeListItem

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: sourceIcon)
                .font(.title3)
                .foregroundStyle(.tint)
                .frame(width: 40, height: 40)
                .glassCard(cornerRadius: 12)

            VStack(alignment: .leading, spacing: 4) {
                Text(item.title)
                    .font(.headline)
                    .lineLimit(1)
                HStack(spacing: 6) {
                    Text(item.source.label)
                    if let updated = item.updatedAt.shortRelativeDate {
                        Text("· \(updated)")
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            Spacer()

            if let overall = item.atsScore?.overall {
                ScoreChip(score: overall, compact: true)
            }
            Image(systemName: "chevron.right")
                .font(.footnote)
                .foregroundStyle(.tertiary)
        }
        .padding(14)
        .glassCard(cornerRadius: 20)
    }

    private var sourceIcon: String {
        switch item.source {
        case .scratch: return "square.and.pencil"
        case .upload: return "arrow.up.doc"
        case .linkedin: return "link"
        }
    }
}

extension String {
    /// Best-effort short relative date from an ISO-8601 timestamp.
    var shortRelativeDate: String? {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = iso.date(from: self) ?? ISO8601DateFormatter().date(from: self)
        guard let date else { return nil }
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

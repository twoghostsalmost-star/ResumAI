import SwiftUI

/// Account, API configuration, and privacy controls. The API base URL is
/// persisted via `APIConfig`; data export downloads the user's JSON and offers
/// it to the share sheet; delete performs a hard server-side delete.
struct SettingsView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss

    @State private var apiBase: String = APIConfig.baseURLString
    @State private var showDeleteConfirm = false
    @State private var isWorking = false
    @State private var errorMessage: String?
    @State private var shareItems: [Any]?

    var body: some View {
        NavigationStack {
            Form {
                accountSection
                apiSection
                privacySection
                signOutSection
                aboutSection
            }
            .scrollContentBackground(.hidden)
            .glassScreenBackground()
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .overlay { if isWorking { LoadingOverlay(text: "Working…") } }
            .alert("Delete account?", isPresented: $showDeleteConfirm) {
                Button("Delete everything", role: .destructive) {
                    Task { await deleteAccount() }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This permanently deletes your account, all resumes, conversations, and exports. This cannot be undone.")
            }
            .sheet(isPresented: Binding(get: { shareItems != nil }, set: { if !$0 { shareItems = nil } })) {
                if let shareItems { ShareSheet(items: shareItems) }
            }
        }
    }

    // MARK: Sections

    private var accountSection: some View {
        Section("Account") {
            LabeledContent("Email", value: appState.user?.email ?? "—")
            if let name = appState.user?.name, !name.isEmpty {
                LabeledContent("Name", value: name)
            }
        }
    }

    private var apiSection: some View {
        Section {
            TextField("https://your-api-host", text: $apiBase)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .keyboardType(.URL)
            Button("Save API URL") {
                APIConfig.setOverride(apiBase)
                apiBase = APIConfig.baseURLString
            }
        } header: {
            Text("API")
        } footer: {
            Text("The backend the app talks to. Changes apply to new requests.")
        }
    }

    private var privacySection: some View {
        Section {
            Button {
                Task { await exportData() }
            } label: {
                Label("Export my data", systemImage: "square.and.arrow.up")
            }
            Button(role: .destructive) {
                showDeleteConfirm = true
            } label: {
                Label("Delete account", systemImage: "trash")
            }
            if let errorMessage {
                Text(errorMessage).font(.footnote).foregroundStyle(.red)
            }
        } header: {
            Text("Privacy & data")
        } footer: {
            Text("Your resume content is sensitive. Provider keys (AI, voice) stay on the backend and are never shipped to the app.")
        }
    }

    private var signOutSection: some View {
        Section {
            Button(role: .destructive) {
                appState.signOut()
                dismiss()
            } label: {
                Text("Sign out").frame(maxWidth: .infinity)
            }
        }
    }

    private var aboutSection: some View {
        Section {
            LabeledContent("App", value: "ResumeForge")
            LabeledContent("Design", value: "Liquid Glass · iOS 26")
        }
    }

    // MARK: Actions

    private func exportData() async {
        isWorking = true
        errorMessage = nil
        defer { isWorking = false }
        do {
            let data = try await appState.api.exportMyData()
            let url = FileManager.default.temporaryDirectory
                .appendingPathComponent("resumeforge-data-export.json")
            try data.write(to: url, options: .atomic)
            shareItems = [url]
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func deleteAccount() async {
        isWorking = true
        defer { isWorking = false }
        await appState.deleteAccount()
        if appState.lastError == nil {
            dismiss()
        } else {
            errorMessage = appState.lastError
        }
    }
}

import Foundation
import Observation

/// Owns the active resume being edited plus its load/save/patch lifecycle and
/// the editor's transient state (ATS result, assistant transcript, busy flags).
@MainActor
@Observable
final class ResumeStore {
    let api: APIClient
    let resumeId: String

    var resume: Resume?
    var isLoading = false
    var isSaving = false
    var errorMessage: String?

    // ATS
    var atsResult: AtsScoreResult?
    var isScoring = false

    // Assistant
    var messages: [ChatMessage] = []
    var isSending = false

    private var saveTask: Task<Void, Never>?

    init(api: APIClient, resumeId: String) {
        self.api = api
        self.resumeId = resumeId
    }

    // MARK: Load

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let loaded = try await api.getResume(id: resumeId)
            resume = loaded
            atsResult = loaded.atsScore
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Seed the store with an already-loaded resume (e.g. straight after create).
    func seed(_ resume: Resume) {
        self.resume = resume
        self.atsResult = resume.atsScore
    }

    // MARK: Save (explicit + debounced autosave)

    func save() async {
        guard let resume else { return }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            let saved = try await api.updateResume(resume)
            self.resume = saved
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Debounced autosave triggered by edits in the Content tab.
    func scheduleAutosave() {
        saveTask?.cancel()
        saveTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(1.2))
            guard let self, !Task.isCancelled else { return }
            await self.save()
        }
    }

    // MARK: Patch

    func applyPatches(_ patches: [ResumePatch]) async {
        guard !patches.isEmpty else { return }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            let updated = try await api.patch(id: resumeId, patches: patches)
            resume = updated
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: ATS

    func runScan() async {
        isScoring = true
        errorMessage = nil
        defer { isScoring = false }
        do {
            let result = try await api.score(id: resumeId)
            atsResult = result
            resume?.atsScore = result
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Apply an ATS auto-fix's patches and immediately rescore.
    func applyFix(_ patches: [ResumePatch]) async {
        await applyPatches(patches)
        await runScan()
    }

    // MARK: Assistant

    func sendMessage(_ text: String) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        messages.append(ChatMessage(role: .user, text: trimmed))
        isSending = true
        errorMessage = nil
        defer { isSending = false }
        do {
            let response = try await api.assistant(id: resumeId, message: trimmed)
            messages.append(ChatMessage(role: .assistant, text: response.reply, patches: response.patches))
        } catch {
            errorMessage = error.localizedDescription
            messages.append(ChatMessage(
                role: .assistant,
                text: "Sorry — I couldn't reach the assistant. \(error.localizedDescription)"
            ))
        }
    }

    /// Apply a message's proposed patches, then reflect that they were applied.
    func applyMessagePatches(_ message: ChatMessage) async {
        guard !message.patches.isEmpty else { return }
        await applyPatches(message.patches)
        if errorMessage == nil, let idx = messages.firstIndex(where: { $0.id == message.id }) {
            messages[idx].patchesApplied = true
        }
    }
}

/// A single chat turn in the assistant transcript.
struct ChatMessage: Identifiable, Hashable {
    enum Role { case user, assistant }
    let id = UUID()
    let role: Role
    var text: String
    var patches: [ResumePatch] = []
    var patchesApplied = false
}

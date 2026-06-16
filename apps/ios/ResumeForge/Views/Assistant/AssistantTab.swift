import SwiftUI

/// Conversational assistant. Messages stream into `store.messages`; when a reply
/// carries proposed `ResumePatch`es they are shown as an explicit "Apply" action
/// on a Liquid Glass bar — nothing mutates the resume without the user's tap.
struct AssistantTab: View {
    @Bindable var store: ResumeStore

    @State private var draft: String = ""
    @State private var showVoiceNote = false
    @FocusState private var inputFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                transcript
                inputBar
            }
            .glassScreenBackground()
            .navigationTitle("Assistant")
            .navigationBarTitleDisplayMode(.inline)
        }
        .alert("Voice mode", isPresented: $showVoiceNote) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Push-to-talk streams your mic to the backend speech-to-text proxy and feeds the transcript to the same assistant. Configure STT_API_KEY on the server to enable it.")
        }
    }

    // MARK: Transcript

    private var transcript: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 12) {
                    if store.messages.isEmpty {
                        introCard
                    }
                    ForEach(store.messages) { message in
                        MessageBubble(message: message) {
                            Task { await store.applyMessagePatches(message) }
                        }
                        .id(message.id)
                    }
                    if store.isSending {
                        HStack(spacing: 8) {
                            ProgressView()
                            Text("Thinking…").font(.footnote).foregroundStyle(.secondary)
                        }
                        .padding(.leading, 4)
                        .id("typing")
                    }
                }
                .padding()
            }
            .softScrollEdges()
            .onChange(of: store.messages.count) { _, _ in
                withAnimation { proxy.scrollTo(store.messages.last?.id, anchor: .bottom) }
            }
            .onChange(of: store.isSending) { _, sending in
                if sending { withAnimation { proxy.scrollTo("typing", anchor: .bottom) } }
            }
        }
    }

    private var introCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Ask for improvements", systemImage: "sparkles")
                .font(.headline)
            Text("Try: “Make my summary more impactful”, “Add metrics to my Acme bullets”, or “Tailor this to a senior PM role.” Every change is shown for you to apply or skip.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassCard(cornerRadius: 20)
    }

    // MARK: Input bar

    private var inputBar: some View {
        HStack(spacing: 10) {
            Button {
                showVoiceNote = true
            } label: {
                Image(systemName: "mic.fill")
                    .frame(width: 30, height: 30)
            }
            .glassButton()
            .accessibilityLabel("Voice input")

            HStack {
                TextField("Ask for improvements…", text: $draft, axis: .vertical)
                    .lineLimit(1...4)
                    .focused($inputFocused)
                    .submitLabel(.send)
                    .onSubmit(send)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .glassCapsule()

            Button(action: send) {
                Image(systemName: "arrow.up")
                    .fontWeight(.bold)
                    .frame(width: 30, height: 30)
            }
            .glassProminentButton()
            .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || store.isSending)
            .accessibilityLabel("Send")
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
    }

    private func send() {
        let text = draft
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        draft = ""
        Task { await store.sendMessage(text) }
    }
}

// MARK: - Message bubble

private struct MessageBubble: View {
    let message: ChatMessage
    let onApply: () -> Void

    var body: some View {
        if message.role == .user {
            HStack {
                Spacer(minLength: 40)
                Text(message.text)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(.tint, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
        } else {
            HStack {
                VStack(alignment: .leading, spacing: 10) {
                    Text(message.text)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    if !message.patches.isEmpty {
                        if message.patchesApplied {
                            Label("Applied \(message.patches.count) change\(message.patches.count == 1 ? "" : "s")", systemImage: "checkmark.circle.fill")
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(.green)
                        } else {
                            Button(action: onApply) {
                                Label("Apply \(message.patches.count) change\(message.patches.count == 1 ? "" : "s")", systemImage: "wand.and.stars")
                                    .font(.subheadline.weight(.semibold))
                                    .frame(maxWidth: .infinity)
                            }
                            .glassProminentButton()
                            .tint(.green)
                        }
                    }
                }
                .glassCard(cornerRadius: 18)
                Spacer(minLength: 40)
            }
        }
    }
}

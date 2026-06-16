import SwiftUI

/// Onboarding + passwordless email sign-in. Liquid Glass value-prop card with a
/// `.glassProminent` continue button.
struct AuthView: View {
    @Environment(AppState.self) private var appState

    @State private var email = ""
    @State private var name = ""
    @State private var isSubmitting = false
    @FocusState private var focusedField: Field?

    private enum Field { case name, email }

    private var canSubmit: Bool {
        email.contains("@") && email.contains(".") && !isSubmitting
    }

    var body: some View {
        ZStack {
            content
        }
        .glassScreenBackground()
    }

    private var content: some View {
        ScrollView {
            VStack(spacing: 28) {
                Spacer(minLength: 40)

                VStack(spacing: 14) {
                    Image(systemName: "doc.text.magnifyingglass")
                        .font(.system(size: 64))
                        .foregroundStyle(.tint)
                        .padding(20)
                        .glassCard(cornerRadius: 28)

                    Text("ResumeForge")
                        .font(.largeTitle.bold())
                    Text("Build an ATS-ready resume, score it, and let the assistant sharpen every bullet.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                }

                valuePropRow

                GlassCard(cornerRadius: 26) {
                    VStack(alignment: .leading, spacing: 14) {
                        Text("Sign in")
                            .font(.headline)
                        Text("Passwordless — we'll create your account if it's new.")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        TextField("Name (optional)", text: $name)
                            .textContentType(.name)
                            .focused($focusedField, equals: .name)
                            .padding(12)
                            .glassCard(cornerRadius: 14)

                        TextField("you@example.com", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .focused($focusedField, equals: .email)
                            .padding(12)
                            .glassCard(cornerRadius: 14)

                        if let error = appState.lastError {
                            Text(error)
                                .font(.caption)
                                .foregroundStyle(.red)
                        }

                        Button(action: submit) {
                            HStack {
                                if isSubmitting { ProgressView().controlSize(.small) }
                                Text(isSubmitting ? "Signing in…" : "Continue")
                                    .fontWeight(.semibold)
                                    .frame(maxWidth: .infinity)
                            }
                            .padding(.vertical, 4)
                        }
                        .glassProminentButton()
                        .controlSize(.large)
                        .disabled(!canSubmit)
                    }
                }
                .padding(.horizontal)

                Spacer(minLength: 20)
            }
            .frame(maxWidth: 520)
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
    }

    private var valuePropRow: some View {
        HStack(spacing: 12) {
            feature("gauge.with.dots.needle.67percent", "ATS score")
            feature("sparkles", "AI assistant")
            feature("square.and.arrow.up", "PDF / DOCX")
        }
        .padding(.horizontal)
    }

    private func feature(_ icon: String, _ label: String) -> some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(.tint)
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .glassCard(cornerRadius: 18)
    }

    private func submit() {
        focusedField = nil
        isSubmitting = true
        Task {
            await appState.signIn(
                email: email.trimmingCharacters(in: .whitespaces),
                name: name.trimmingCharacters(in: .whitespaces).nilIfEmpty
            )
            isSubmitting = false
        }
    }
}

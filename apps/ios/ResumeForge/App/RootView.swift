import SwiftUI

/// Switches between launch loading, the auth flow, and the signed-in app.
struct RootView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        switch appState.phase {
        case .loading:
            ZStack {
                Color(.systemGroupedBackground).ignoresSafeArea()
                VStack(spacing: 16) {
                    Image(systemName: "doc.text.magnifyingglass")
                        .font(.system(size: 56))
                        .foregroundStyle(.tint)
                    ProgressView()
                }
            }
            .transition(.opacity)

        case .signedOut:
            AuthView()
                .transition(.opacity)

        case .signedIn:
            HomeView()
                .transition(.opacity)
        }
    }
}

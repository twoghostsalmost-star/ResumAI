import SwiftUI

@main
struct ResumeForgeApp: App {
    @State private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(appState)
                .tint(.accentColor)
                .task {
                    await appState.restoreSession()
                }
        }
    }
}

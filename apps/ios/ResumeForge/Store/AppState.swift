import Foundation
import Observation

/// Global app/auth state. Owns the API client, the signed-in user, and the
/// auth lifecycle (sign in via passwordless email, restore session, sign out).
@MainActor
@Observable
final class AppState {
    enum Phase: Equatable {
        case loading        // restoring session on launch
        case signedOut
        case signedIn
    }

    var phase: Phase = .loading
    var user: User?
    var lastError: String?

    let api: APIClient
    private let tokenStore: TokenStore

    init(api: APIClient = APIClient(), tokenStore: TokenStore = .shared) {
        self.api = api
        self.tokenStore = tokenStore
    }

    var isSignedIn: Bool { phase == .signedIn }

    /// On launch: if we already hold a token, verify it with `/me` and skip auth.
    func restoreSession() async {
        guard tokenStore.hasToken else {
            phase = .signedOut
            return
        }
        do {
            user = try await api.me()
            phase = .signedIn
        } catch {
            // Token invalid/expired — drop it and show sign-in.
            tokenStore.clear()
            phase = .signedOut
        }
    }

    func signIn(email: String, name: String?) async {
        lastError = nil
        do {
            let result = try await api.session(email: email, name: name)
            tokenStore.save(result.token)
            user = result.user
            phase = .signedIn
        } catch {
            lastError = error.localizedDescription
        }
    }

    func signOut() {
        tokenStore.clear()
        user = nil
        phase = .signedOut
    }

    func deleteAccount() async {
        lastError = nil
        do {
            try await api.deleteAccount()
            signOut()
        } catch {
            lastError = error.localizedDescription
        }
    }
}

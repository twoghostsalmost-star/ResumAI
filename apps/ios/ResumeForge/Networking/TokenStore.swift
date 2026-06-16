import Foundation
import Security

/// Secure storage for the bearer token using Keychain Services. The token is the
/// only credential the app holds; it is read on every authenticated request.
struct TokenStore {
    static let shared = TokenStore()

    private let service = "com.resumeforge.app.token"
    private let account = "bearer"

    private var query: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }

    /// The current token, if any.
    var token: String? {
        var q = query
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        let status = SecItemCopyMatching(q as CFDictionary, &item)
        guard status == errSecSuccess, let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    var hasToken: Bool { token != nil }

    /// Store (or replace) the token.
    func save(_ token: String) {
        guard let data = token.data(using: .utf8) else { return }
        // Delete any existing item first so we can add fresh.
        SecItemDelete(query as CFDictionary)
        var attrs = query
        attrs[kSecValueData as String] = data
        attrs[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(attrs as CFDictionary, nil)
    }

    /// Remove the stored token (sign out).
    func clear() {
        SecItemDelete(query as CFDictionary)
    }
}

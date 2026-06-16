import Foundation

/// Resolves and persists the API base URL. Default comes from the Info.plist
/// `API_BASE_URL`; the user can override it in Settings, which persists to
/// `UserDefaults` and takes precedence on subsequent launches.
enum APIConfig {
    private static let overrideKey = "api_base_url_override"

    /// Fallback compiled-in default if neither override nor Info.plist is set.
    static let compiledDefault = "http://localhost:3000"

    /// The value declared in Info.plist (`API_BASE_URL`), if any.
    static var plistDefault: String {
        (Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .nilIfEmpty ?? compiledDefault
    }

    /// The effective base URL string, preferring a user override.
    static var baseURLString: String {
        if let override = UserDefaults.standard.string(forKey: overrideKey)?.nilIfEmpty {
            return override
        }
        return plistDefault
    }

    /// The effective base URL, trailing slash trimmed.
    static var baseURL: URL {
        let trimmed = baseURLString.trimmingTrailingSlash()
        return URL(string: trimmed) ?? URL(string: compiledDefault)!
    }

    static func setOverride(_ value: String?) {
        let cleaned = value?.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty
        if let cleaned {
            UserDefaults.standard.set(cleaned, forKey: overrideKey)
        } else {
            UserDefaults.standard.removeObject(forKey: overrideKey)
        }
    }
}

extension String {
    var nilIfEmpty: String? { isEmpty ? nil : self }

    func trimmingTrailingSlash() -> String {
        var s = self
        while s.hasSuffix("/") { s.removeLast() }
        return s
    }
}

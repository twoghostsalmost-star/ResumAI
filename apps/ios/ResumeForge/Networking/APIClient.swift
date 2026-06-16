import Foundation

// MARK: - Errors

enum APIError: LocalizedError {
    case invalidURL
    case http(status: Int, message: String?)
    case decoding(Error)
    case transport(Error)
    case notConfigured(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "The API URL is invalid. Check the base URL in Settings."
        case let .http(status, message):
            if let message, !message.isEmpty {
                return "Request failed (\(status)): \(message)"
            }
            return "Request failed with status \(status)."
        case let .decoding(error):
            return "Could not read the server response. \(error.localizedDescription)"
        case let .transport(error):
            return error.localizedDescription
        case let .notConfigured(detail):
            return detail
        }
    }
}

/// Decodes the API's `{ "error": "..." }` body for human-readable messages.
private struct APIErrorBody: Decodable {
    let error: String?
    let detail: String?
    let fallback: String?
}

// MARK: - Client

/// async/await `URLSession` client for the ResumeForge API. The base URL is read
/// from `APIConfig` (Info.plist default, overridable in Settings). The bearer
/// token comes from the Keychain via `TokenStore`.
struct APIClient {
    var tokenProvider: () -> String? = { TokenStore.shared.token }
    var baseURL: () -> URL = { APIConfig.baseURL }

    private let session: URLSession

    init(session: URLSession = .shared) {
        self.session = session
    }

    private var encoder: JSONEncoder {
        let e = JSONEncoder()
        return e
    }

    private var decoder: JSONDecoder {
        JSONDecoder()
    }

    // MARK: Request building

    private enum Method: String { case GET, POST, PUT, DELETE }

    private func makeRequest(
        _ method: Method,
        path: String,
        query: [URLQueryItem] = [],
        body: Data? = nil,
        contentType: String = "application/json",
        authenticated: Bool = true
    ) throws -> URLRequest {
        guard var components = URLComponents(
            url: baseURL().appendingPathComponent(path),
            resolvingAgainstBaseURL: false
        ) else { throw APIError.invalidURL }
        if !query.isEmpty { components.queryItems = query }
        guard let url = components.url else { throw APIError.invalidURL }

        var req = URLRequest(url: url)
        req.httpMethod = method.rawValue
        req.timeoutInterval = 60
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            req.httpBody = body
            req.setValue(contentType, forHTTPHeaderField: "Content-Type")
        }
        if authenticated, let token = tokenProvider() {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return req
    }

    @discardableResult
    private func send(_ request: URLRequest) async throws -> Data {
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.transport(error)
        }
        guard let http = response as? HTTPURLResponse else {
            throw APIError.http(status: -1, message: "No HTTP response")
        }
        guard (200..<300).contains(http.statusCode) else {
            let message = decodeErrorMessage(from: data)
            throw APIError.http(status: http.statusCode, message: message)
        }
        return data
    }

    private func decodeErrorMessage(from data: Data) -> String? {
        if let body = try? decoder.decode(APIErrorBody.self, from: data) {
            return [body.error, body.detail].compactMap { $0 }.joined(separator: " — ").nilIfEmpty
        }
        return String(data: data, encoding: .utf8)?.nilIfEmpty
    }

    private func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decoding(error)
        }
    }

    // MARK: Auth

    func session(email: String, name: String?) async throws -> SessionResponse {
        let body = try encoder.encode(["email": email, "name": name].compactMapValues { $0 })
        let req = try makeRequest(.POST, path: "auth/session", body: body, authenticated: false)
        return try decode(SessionResponse.self, from: try await send(req))
    }

    func me() async throws -> User {
        let req = try makeRequest(.GET, path: "me")
        return try decode(User.self, from: try await send(req))
    }

    // MARK: Resumes

    func listResumes() async throws -> [ResumeListItem] {
        let req = try makeRequest(.GET, path: "resumes")
        return try decode([ResumeListItem].self, from: try await send(req))
    }

    func createResume(title: String? = nil, source: Resume.Source? = nil, data: Resume? = nil) async throws -> Resume {
        let body = try encoder.encode(CreateResumeBody(title: title, source: source, data: data))
        let req = try makeRequest(.POST, path: "resumes", body: body)
        return try decode(Resume.self, from: try await send(req))
    }

    func getResume(id: String) async throws -> Resume {
        let req = try makeRequest(.GET, path: "resumes/\(id)")
        return try decode(Resume.self, from: try await send(req))
    }

    func updateResume(_ resume: Resume) async throws -> Resume {
        let body = try encoder.encode(resume)
        let req = try makeRequest(.PUT, path: "resumes/\(resume.id)", body: body)
        return try decode(Resume.self, from: try await send(req))
    }

    func patch(id: String, patches: [ResumePatch]) async throws -> Resume {
        let body = try encoder.encode(PatchBody(patches: patches))
        let req = try makeRequest(.POST, path: "resumes/\(id)/patch", body: body)
        return try decode(Resume.self, from: try await send(req))
    }

    func deleteResume(id: String) async throws {
        let req = try makeRequest(.DELETE, path: "resumes/\(id)")
        try await send(req)
    }

    // MARK: ATS

    func score(id: String) async throws -> AtsScoreResult {
        let req = try makeRequest(.POST, path: "resumes/\(id)/score")
        return try decode(AtsScoreResult.self, from: try await send(req))
    }

    // MARK: Assistant

    func assistant(id: String, message: String) async throws -> AssistantResponse {
        let body = try encoder.encode(AssistantRequest(message: message))
        let req = try makeRequest(.POST, path: "resumes/\(id)/assistant", body: body)
        return try decode(AssistantResponse.self, from: try await send(req))
    }

    // MARK: Parse / import

    func parseText(_ text: String) async throws -> ParseResult {
        let body = try encoder.encode(ParseTextRequest(text: text))
        let req = try makeRequest(.POST, path: "parse/text", body: body)
        return try decode(ParseResult.self, from: try await send(req))
    }

    /// Bonus: upload raw file bytes to `/parse/upload` via multipart/form-data.
    func parseUpload(fileURL: URL) async throws -> ParseResult {
        let data = try Data(contentsOf: fileURL)
        let filename = fileURL.lastPathComponent
        let mime = MimeType.forFile(filename)
        let boundary = "Boundary-\(UUID().uuidString)"
        var body = Data()
        body.appendString("--\(boundary)\r\n")
        body.appendString("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n")
        body.appendString("Content-Type: \(mime)\r\n\r\n")
        body.append(data)
        body.appendString("\r\n--\(boundary)--\r\n")
        let req = try makeRequest(
            .POST,
            path: "parse/upload",
            body: body,
            contentType: "multipart/form-data; boundary=\(boundary)"
        )
        return try decode(ParseResult.self, from: try await send(req))
    }

    // MARK: Share

    func shareLink(id: String) async throws -> ShareResponse {
        let req = try makeRequest(.POST, path: "resumes/\(id)/share")
        return try decode(ShareResponse.self, from: try await send(req))
    }

    // MARK: Export

    /// The export endpoint is a POST that streams bytes/HTML. We surface the URL
    /// for the share sheet/Safari, and also offer a `downloadExport` helper.
    func exportURL(id: String, format: ExportFormat) -> URL? {
        var components = URLComponents(
            url: baseURL().appendingPathComponent("resumes/\(id)/export"),
            resolvingAgainstBaseURL: false
        )
        components?.queryItems = [URLQueryItem(name: "format", value: format.rawValue)]
        return components?.url
    }

    /// Downloads an export to a temporary file and returns its URL (for the
    /// share sheet / QuickLook). Uses POST as the API requires.
    func downloadExport(id: String, format: ExportFormat) async throws -> URL {
        let query = [URLQueryItem(name: "format", value: format.rawValue)]
        let req = try makeRequest(.POST, path: "resumes/\(id)/export", query: query)
        let data = try await send(req)
        let ext = format.rawValue
        let tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("resume-\(id).\(ext)")
        try data.write(to: tmp, options: .atomic)
        return tmp
    }

    // MARK: LinkedIn

    func linkedinAuthURL() async throws -> LinkedInAuthResponse {
        let req = try makeRequest(.GET, path: "linkedin/auth-url")
        return try decode(LinkedInAuthResponse.self, from: try await send(req))
    }

    // MARK: Account

    func exportMyData() async throws -> Data {
        let req = try makeRequest(.GET, path: "me/export")
        return try await send(req)
    }

    func deleteAccount() async throws {
        let req = try makeRequest(.DELETE, path: "me")
        try await send(req)
    }

    // MARK: Voice (push-to-talk STT)

    /// Sends raw audio bytes to `/voice/stt` and returns the transcript.
    func transcribe(audio: Data, mime: String) async throws -> String {
        let req = try makeRequest(.POST, path: "voice/stt", body: audio, contentType: mime)
        return try decode(TranscriptResponse.self, from: try await send(req)).text
    }
}

// MARK: - Helpers

private enum MimeType {
    static func forFile(_ filename: String) -> String {
        let ext = (filename as NSString).pathExtension.lowercased()
        switch ext {
        case "pdf": return "application/pdf"
        case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        case "doc": return "application/msword"
        case "txt": return "text/plain"
        default: return "application/octet-stream"
        }
    }
}

private extension Data {
    mutating func appendString(_ string: String) {
        if let data = string.data(using: .utf8) { append(data) }
    }
}

import Foundation

// MARK: - User & auth

struct User: Codable, Identifiable, Hashable {
    var id: String
    var email: String
    var name: String?
    var createdAt: String?
}

struct SessionResponse: Codable {
    var token: String
    var user: User
}

// MARK: - Resume list

/// Lightweight list row returned by `GET /resumes`.
struct ResumeListItem: Codable, Identifiable, Hashable {
    var id: String
    var title: String
    var source: Resume.Source
    var updatedAt: String
    /// The persisted full ATS result (nullable). Only `overall` is shown in lists.
    var atsScore: AtsScoreResult?

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        title = try c.decodeIfPresent(String.self, forKey: .title) ?? "Untitled Resume"
        source = try c.decodeIfPresent(Resume.Source.self, forKey: .source) ?? .scratch
        updatedAt = try c.decodeIfPresent(String.self, forKey: .updatedAt) ?? ""
        atsScore = try c.decodeIfPresent(AtsScoreResult.self, forKey: .atsScore)
    }

    enum CodingKeys: String, CodingKey { case id, title, source, updatedAt, atsScore }
}

// MARK: - Endpoint request/response bodies

struct CreateResumeBody: Encodable {
    var title: String?
    var source: Resume.Source?
    var data: Resume?
}

struct PatchBody: Encodable {
    var patches: [ResumePatch]
}

struct AssistantRequest: Encodable {
    var message: String
}

struct AssistantResponse: Codable {
    var reply: String
    var patches: [ResumePatch]

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        reply = try c.decodeIfPresent(String.self, forKey: .reply) ?? ""
        patches = try c.decodeIfPresent([ResumePatch].self, forKey: .patches) ?? []
    }

    enum CodingKeys: String, CodingKey { case reply, patches }
}

struct ParseTextRequest: Encodable {
    var text: String
}

struct ParseResult: Codable {
    var resume: Resume
    var lowConfidenceFields: [String]
    var method: String

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        resume = try c.decode(Resume.self, forKey: .resume)
        lowConfidenceFields = try c.decodeIfPresent([String].self, forKey: .lowConfidenceFields) ?? []
        method = try c.decodeIfPresent(String.self, forKey: .method) ?? "heuristic"
    }

    enum CodingKeys: String, CodingKey { case resume, lowConfidenceFields, method }
}

struct ShareResponse: Codable {
    var url: String
    var token: String
    var expiresAt: String
}

struct LinkedInAuthResponse: Codable {
    var url: String
    var state: String
}

struct TranscriptResponse: Codable {
    var text: String

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        text = try c.decodeIfPresent(String.self, forKey: .text) ?? ""
    }

    enum CodingKeys: String, CodingKey { case text }
}

/// Export formats accepted by `POST /resumes/:id/export?format=`.
enum ExportFormat: String, CaseIterable, Identifiable {
    case pdf, docx, html
    var id: String { rawValue }
    var label: String { rawValue.uppercased() }
}

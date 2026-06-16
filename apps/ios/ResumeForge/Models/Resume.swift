import Foundation

// MARK: - Link

struct Link: Codable, Identifiable, Hashable {
    var id = UUID()
    var label: String
    var url: String

    enum CodingKeys: String, CodingKey { case label, url }

    init(label: String, url: String) {
        self.label = label
        self.url = url
    }
}

// MARK: - Basics

struct Basics: Codable, Hashable {
    var fullName: String
    var headline: String?
    var email: String?
    var phone: String?
    var location: String?
    var links: [Link]
    var summary: String?

    init(
        fullName: String = "",
        headline: String? = nil,
        email: String? = nil,
        phone: String? = nil,
        location: String? = nil,
        links: [Link] = [],
        summary: String? = nil
    ) {
        self.fullName = fullName
        self.headline = headline
        self.email = email
        self.phone = phone
        self.location = location
        self.links = links
        self.summary = summary
    }

    // links defaults to [] when the key is absent.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        fullName = try c.decodeIfPresent(String.self, forKey: .fullName) ?? ""
        headline = try c.decodeIfPresent(String.self, forKey: .headline)
        email = try c.decodeIfPresent(String.self, forKey: .email)
        phone = try c.decodeIfPresent(String.self, forKey: .phone)
        location = try c.decodeIfPresent(String.self, forKey: .location)
        links = try c.decodeIfPresent([Link].self, forKey: .links) ?? []
        summary = try c.decodeIfPresent(String.self, forKey: .summary)
    }

    enum CodingKeys: String, CodingKey {
        case fullName, headline, email, phone, location, links, summary
    }
}

// MARK: - Section item types

struct ExperienceItem: Codable, Identifiable, Hashable {
    var id: String
    var company: String
    var role: String
    var location: String?
    var startDate: String
    var endDate: String?   // "present" or YYYY / YYYY-MM
    var bullets: [String]

    init(
        id: String = UUID().uuidString,
        company: String = "",
        role: String = "",
        location: String? = nil,
        startDate: String = "",
        endDate: String? = nil,
        bullets: [String] = []
    ) {
        self.id = id
        self.company = company
        self.role = role
        self.location = location
        self.startDate = startDate
        self.endDate = endDate
        self.bullets = bullets
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString
        company = try c.decodeIfPresent(String.self, forKey: .company) ?? ""
        role = try c.decodeIfPresent(String.self, forKey: .role) ?? ""
        location = try c.decodeIfPresent(String.self, forKey: .location)
        startDate = try c.decodeIfPresent(String.self, forKey: .startDate) ?? ""
        endDate = try c.decodeIfPresent(String.self, forKey: .endDate)
        bullets = try c.decodeIfPresent([String].self, forKey: .bullets) ?? []
    }

    enum CodingKeys: String, CodingKey {
        case id, company, role, location, startDate, endDate, bullets
    }
}

struct EducationItem: Codable, Identifiable, Hashable {
    var id: String
    var institution: String
    var degree: String?
    var field: String?
    var location: String?
    var startDate: String?
    var endDate: String?
    var details: [String]

    init(
        id: String = UUID().uuidString,
        institution: String = "",
        degree: String? = nil,
        field: String? = nil,
        location: String? = nil,
        startDate: String? = nil,
        endDate: String? = nil,
        details: [String] = []
    ) {
        self.id = id
        self.institution = institution
        self.degree = degree
        self.field = field
        self.location = location
        self.startDate = startDate
        self.endDate = endDate
        self.details = details
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString
        institution = try c.decodeIfPresent(String.self, forKey: .institution) ?? ""
        degree = try c.decodeIfPresent(String.self, forKey: .degree)
        field = try c.decodeIfPresent(String.self, forKey: .field)
        location = try c.decodeIfPresent(String.self, forKey: .location)
        startDate = try c.decodeIfPresent(String.self, forKey: .startDate)
        endDate = try c.decodeIfPresent(String.self, forKey: .endDate)
        details = try c.decodeIfPresent([String].self, forKey: .details) ?? []
    }

    enum CodingKeys: String, CodingKey {
        case id, institution, degree, field, location, startDate, endDate, details
    }
}

struct ProjectItem: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var url: String?
    var bullets: [String]

    init(
        id: String = UUID().uuidString,
        name: String = "",
        url: String? = nil,
        bullets: [String] = []
    ) {
        self.id = id
        self.name = name
        self.url = url
        self.bullets = bullets
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? ""
        url = try c.decodeIfPresent(String.self, forKey: .url)
        bullets = try c.decodeIfPresent([String].self, forKey: .bullets) ?? []
    }

    enum CodingKeys: String, CodingKey { case id, name, url, bullets }
}

struct CertItem: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var issuer: String?
    var date: String?

    init(
        id: String = UUID().uuidString,
        name: String = "",
        issuer: String? = nil,
        date: String? = nil
    ) {
        self.id = id
        self.name = name
        self.issuer = issuer
        self.date = date
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? ""
        issuer = try c.decodeIfPresent(String.self, forKey: .issuer)
        date = try c.decodeIfPresent(String.self, forKey: .date)
    }

    enum CodingKeys: String, CodingKey { case id, name, issuer, date }
}

struct BulletItem: Codable, Identifiable, Hashable {
    var id: String
    var text: String

    init(id: String = UUID().uuidString, text: String = "") {
        self.id = id
        self.text = text
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString
        text = try c.decodeIfPresent(String.self, forKey: .text) ?? ""
    }

    enum CodingKeys: String, CodingKey { case id, text }
}

struct SkillsGroup: Codable, Identifiable, Hashable {
    var id = UUID()
    var name: String?
    var skills: [String]

    init(name: String? = nil, skills: [String] = []) {
        self.name = name
        self.skills = skills
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        name = try c.decodeIfPresent(String.self, forKey: .name)
        skills = try c.decodeIfPresent([String].self, forKey: .skills) ?? []
    }

    enum CodingKeys: String, CodingKey { case name, skills }
}

// MARK: - Design

struct ResumeDesign: Codable, Hashable {
    enum Template: String, Codable, CaseIterable, Identifiable {
        case classic, modern, compact
        var id: String { rawValue }
        var label: String { rawValue.capitalized }
    }

    enum Margins: String, Codable, CaseIterable, Identifiable {
        case tight, normal, roomy
        var id: String { rawValue }
        var label: String { rawValue.capitalized }
    }

    var template: Template
    var fontFamily: String
    var accentColor: String     // hex string e.g. "#1f2933"
    var fontScale: Double
    var margins: Margins

    init(
        template: Template = .classic,
        fontFamily: String = "Helvetica",
        accentColor: String = "#1f2933",
        fontScale: Double = 1.0,
        margins: Margins = .normal
    ) {
        self.template = template
        self.fontFamily = fontFamily
        self.accentColor = accentColor
        self.fontScale = fontScale
        self.margins = margins
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        template = try c.decodeIfPresent(Template.self, forKey: .template) ?? .classic
        fontFamily = try c.decodeIfPresent(String.self, forKey: .fontFamily) ?? "Helvetica"
        accentColor = try c.decodeIfPresent(String.self, forKey: .accentColor) ?? "#1f2933"
        fontScale = try c.decodeIfPresent(Double.self, forKey: .fontScale) ?? 1.0
        margins = try c.decodeIfPresent(Margins.self, forKey: .margins) ?? .normal
    }

    enum CodingKeys: String, CodingKey {
        case template, fontFamily, accentColor, fontScale, margins
    }

    /// The ATS-safe font list mirrored from the shared package.
    static let atsSafeFonts = ["Helvetica", "Arial", "Georgia", "Times New Roman", "Calibri"]
}

// MARK: - Resume

struct Resume: Codable, Identifiable, Hashable {
    enum Source: String, Codable, CaseIterable {
        case scratch, upload, linkedin
        var label: String {
            switch self {
            case .scratch: return "From scratch"
            case .upload: return "Upload"
            case .linkedin: return "LinkedIn"
            }
        }
    }

    var id: String
    var userId: String
    var title: String
    var targetRole: String?
    var targetJobDescription: String?
    var basics: Basics
    var sections: [ResumeSection]
    var design: ResumeDesign
    var atsScore: AtsScoreResult?
    var source: Source
    var createdAt: String
    var updatedAt: String

    init(
        id: String = "pending",
        userId: String = "",
        title: String = "Untitled Resume",
        targetRole: String? = nil,
        targetJobDescription: String? = nil,
        basics: Basics = Basics(),
        sections: [ResumeSection] = [],
        design: ResumeDesign = ResumeDesign(),
        atsScore: AtsScoreResult? = nil,
        source: Source = .scratch,
        createdAt: String = ISO8601DateFormatter().string(from: Date()),
        updatedAt: String = ISO8601DateFormatter().string(from: Date())
    ) {
        self.id = id
        self.userId = userId
        self.title = title
        self.targetRole = targetRole
        self.targetJobDescription = targetJobDescription
        self.basics = basics
        self.sections = sections
        self.design = design
        self.atsScore = atsScore
        self.source = source
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decodeIfPresent(String.self, forKey: .id) ?? "pending"
        userId = try c.decodeIfPresent(String.self, forKey: .userId) ?? ""
        title = try c.decodeIfPresent(String.self, forKey: .title) ?? "Untitled Resume"
        targetRole = try c.decodeIfPresent(String.self, forKey: .targetRole)
        targetJobDescription = try c.decodeIfPresent(String.self, forKey: .targetJobDescription)
        basics = try c.decodeIfPresent(Basics.self, forKey: .basics) ?? Basics()
        sections = try c.decodeIfPresent([ResumeSection].self, forKey: .sections) ?? []
        design = try c.decodeIfPresent(ResumeDesign.self, forKey: .design) ?? ResumeDesign()
        atsScore = try c.decodeIfPresent(AtsScoreResult.self, forKey: .atsScore)
        source = try c.decodeIfPresent(Source.self, forKey: .source) ?? .scratch
        let now = ISO8601DateFormatter().string(from: Date())
        createdAt = try c.decodeIfPresent(String.self, forKey: .createdAt) ?? now
        updatedAt = try c.decodeIfPresent(String.self, forKey: .updatedAt) ?? now
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(userId, forKey: .userId)
        try c.encode(title, forKey: .title)
        try c.encodeIfPresent(targetRole, forKey: .targetRole)
        try c.encodeIfPresent(targetJobDescription, forKey: .targetJobDescription)
        try c.encode(basics, forKey: .basics)
        try c.encode(sections, forKey: .sections)
        try c.encode(design, forKey: .design)
        try c.encodeIfPresent(atsScore, forKey: .atsScore)
        try c.encode(source, forKey: .source)
        try c.encode(createdAt, forKey: .createdAt)
        try c.encode(updatedAt, forKey: .updatedAt)
    }

    enum CodingKeys: String, CodingKey {
        case id, userId, title, targetRole, targetJobDescription, basics,
             sections, design, atsScore, source, createdAt, updatedAt
    }
}

import Foundation

/// A resume section, discriminated by the `type` string field in the JSON
/// (experience | education | skills | projects | certifications | custom).
///
/// We model it as an enum with associated values so the payload for each kind is
/// strongly typed. The custom `Codable` conformance reads `type` first, then
/// decodes/encodes the matching associated payload — round-tripping the exact
/// JSON shapes the API (a zod `discriminatedUnion("type", ...)`) produces.
enum ResumeSection: Codable, Identifiable, Hashable {
    case experience(id: String, items: [ExperienceItem])
    case education(id: String, items: [EducationItem])
    case skills(id: String, groups: [SkillsGroup])
    case projects(id: String, items: [ProjectItem])
    case certifications(id: String, items: [CertItem])
    case custom(id: String, heading: String, items: [BulletItem])

    enum Kind: String, Codable, CaseIterable, Identifiable {
        case experience, education, skills, projects, certifications, custom
        var id: String { rawValue }
        var label: String {
            switch self {
            case .experience: return "Experience"
            case .education: return "Education"
            case .skills: return "Skills"
            case .projects: return "Projects"
            case .certifications: return "Certifications"
            case .custom: return "Custom"
            }
        }
        var systemImage: String {
            switch self {
            case .experience: return "briefcase"
            case .education: return "graduationcap"
            case .skills: return "wrench.and.screwdriver"
            case .projects: return "hammer"
            case .certifications: return "rosette"
            case .custom: return "square.text.square"
            }
        }
    }

    /// Stable identity (the section's own `id`) used by ForEach / List.
    var id: String {
        switch self {
        case let .experience(id, _),
             let .education(id, _),
             let .skills(id, _),
             let .projects(id, _),
             let .certifications(id, _):
            return id
        case let .custom(id, _, _):
            return id
        }
    }

    var kind: Kind {
        switch self {
        case .experience: return .experience
        case .education: return .education
        case .skills: return .skills
        case .projects: return .projects
        case .certifications: return .certifications
        case .custom: return .custom
        }
    }

    /// Human-facing heading (custom sections carry their own).
    var displayHeading: String {
        if case let .custom(_, heading, _) = self { return heading.isEmpty ? "Custom" : heading }
        return kind.label
    }

    // MARK: Codable

    private enum CodingKeys: String, CodingKey {
        case id, type, items, groups, heading
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let type = try c.decode(Kind.self, forKey: .type)
        let id = try c.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString
        switch type {
        case .experience:
            let items = try c.decodeIfPresent([ExperienceItem].self, forKey: .items) ?? []
            self = .experience(id: id, items: items)
        case .education:
            let items = try c.decodeIfPresent([EducationItem].self, forKey: .items) ?? []
            self = .education(id: id, items: items)
        case .skills:
            let groups = try c.decodeIfPresent([SkillsGroup].self, forKey: .groups) ?? []
            self = .skills(id: id, groups: groups)
        case .projects:
            let items = try c.decodeIfPresent([ProjectItem].self, forKey: .items) ?? []
            self = .projects(id: id, items: items)
        case .certifications:
            let items = try c.decodeIfPresent([CertItem].self, forKey: .items) ?? []
            self = .certifications(id: id, items: items)
        case .custom:
            let heading = try c.decodeIfPresent(String.self, forKey: .heading) ?? ""
            let items = try c.decodeIfPresent([BulletItem].self, forKey: .items) ?? []
            self = .custom(id: id, heading: heading, items: items)
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(kind, forKey: .type)
        switch self {
        case let .experience(_, items):
            try c.encode(items, forKey: .items)
        case let .education(_, items):
            try c.encode(items, forKey: .items)
        case let .skills(_, groups):
            try c.encode(groups, forKey: .groups)
        case let .projects(_, items):
            try c.encode(items, forKey: .items)
        case let .certifications(_, items):
            try c.encode(items, forKey: .items)
        case let .custom(_, heading, items):
            try c.encode(heading, forKey: .heading)
            try c.encode(items, forKey: .items)
        }
    }

    // MARK: Factory

    /// Create an empty section of the given kind with a fresh id.
    static func empty(_ kind: Kind) -> ResumeSection {
        let id = UUID().uuidString
        switch kind {
        case .experience: return .experience(id: id, items: [])
        case .education: return .education(id: id, items: [])
        case .skills: return .skills(id: id, groups: [SkillsGroup(skills: [])])
        case .projects: return .projects(id: id, items: [])
        case .certifications: return .certifications(id: id, items: [])
        case .custom: return .custom(id: id, heading: "New Section", items: [])
        }
    }
}

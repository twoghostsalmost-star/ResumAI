import Foundation
import SwiftUI

struct AtsSubscores: Codable, Hashable {
    var parseability: Double
    var keywordMatch: Double
    var structure: Double
    var impact: Double
    var formatting: Double

    /// Ordered (label, value) pairs for rendering the five bars.
    var ordered: [(area: AtsArea, value: Double)] {
        [
            (.parseability, parseability),
            (.keywordMatch, keywordMatch),
            (.structure, structure),
            (.impact, impact),
            (.formatting, formatting),
        ]
    }
}

enum AtsArea: String, Codable, CaseIterable, Identifiable {
    case parseability, keywordMatch, structure, impact, formatting
    var id: String { rawValue }
    var label: String {
        switch self {
        case .parseability: return "Parseability"
        case .keywordMatch: return "Keyword Match"
        case .structure: return "Structure"
        case .impact: return "Impact"
        case .formatting: return "Formatting"
        }
    }
}

enum AtsSeverity: String, Codable, Hashable {
    case critical, warning, suggestion

    var color: Color {
        switch self {
        case .critical: return .red
        case .warning: return .orange
        case .suggestion: return .blue
        }
    }

    var systemImage: String {
        switch self {
        case .critical: return "exclamationmark.octagon.fill"
        case .warning: return "exclamationmark.triangle.fill"
        case .suggestion: return "lightbulb.fill"
        }
    }

    var label: String { rawValue.capitalized }
}

struct AtsFix: Codable, Hashable {
    var description: String
    var autoApplyPatch: [ResumePatch]?
}

struct AtsFinding: Codable, Identifiable, Hashable {
    var id: String
    var severity: AtsSeverity
    var area: AtsArea
    var message: String
    var fix: AtsFix?
}

struct AtsScoreResult: Codable, Hashable {
    var overall: Double
    var subscores: AtsSubscores
    var findings: [AtsFinding]
    var version: String
}

extension Double {
    /// Color band for an ATS score (0...100).
    var atsScoreColor: Color {
        switch self {
        case ..<50: return .red
        case ..<75: return .orange
        default: return .green
        }
    }
}

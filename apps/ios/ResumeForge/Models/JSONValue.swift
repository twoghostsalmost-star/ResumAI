import Foundation

/// A type-erased JSON value used for the `value` payload of `ResumePatch`
/// (`op: set | push`), which the API types as `z.any()`. It round-trips
/// arbitrary JSON: strings, numbers, bools, null, arrays and objects.
indirect enum JSONValue: Codable, Hashable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case null
    case array([JSONValue])
    case object([String: JSONValue])

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() {
            self = .null
        } else if let b = try? c.decode(Bool.self) {
            self = .bool(b)
        } else if let n = try? c.decode(Double.self) {
            self = .number(n)
        } else if let s = try? c.decode(String.self) {
            self = .string(s)
        } else if let a = try? c.decode([JSONValue].self) {
            self = .array(a)
        } else if let o = try? c.decode([String: JSONValue].self) {
            self = .object(o)
        } else {
            throw DecodingError.dataCorruptedError(
                in: c, debugDescription: "Unsupported JSON value")
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case let .string(s): try c.encode(s)
        case let .number(n): try c.encode(n)
        case let .bool(b): try c.encode(b)
        case .null: try c.encodeNil()
        case let .array(a): try c.encode(a)
        case let .object(o): try c.encode(o)
        }
    }

    // MARK: Convenience builders

    init(_ string: String) { self = .string(string) }
    init(_ value: Encodable) {
        // Encode then re-decode into JSONValue so any Codable payload (e.g. a
        // String bullet or a whole ExperienceItem) can be wrapped for a patch.
        guard
            let data = try? JSONEncoder().encode(AnyEncodable(value)),
            let decoded = try? JSONDecoder().decode(JSONValue.self, from: data)
        else {
            self = .null
            return
        }
        self = decoded
    }

    /// Best-effort plain-text rendering for previews/debug.
    var displayString: String {
        switch self {
        case let .string(s): return s
        case let .number(n): return n == n.rounded() ? String(Int(n)) : String(n)
        case let .bool(b): return b ? "true" : "false"
        case .null: return "null"
        case let .array(a): return "[\(a.map { $0.displayString }.joined(separator: ", "))]"
        case let .object(o): return "{\(o.keys.sorted().joined(separator: ", "))}"
        }
    }
}

/// Erases a concrete Encodable so it can be encoded through a single-value box.
private struct AnyEncodable: Encodable {
    let value: Encodable
    init(_ value: Encodable) { self.value = value }
    func encode(to encoder: Encoder) throws { try value.encode(to: encoder) }
}

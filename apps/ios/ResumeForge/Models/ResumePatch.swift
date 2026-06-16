import Foundation

/// A JSON-path-style mutation proposed by the assistant or an ATS auto-fix.
/// Discriminated on `op` to mirror the API's `z.discriminatedUnion("op", ...)`:
///   {"op":"set","path":"basics.summary","value":...}
///   {"op":"push","path":"sections.0.items.0.bullets","value":...}
///   {"op":"removeAt","path":"sections.0.items","index":1}
///   {"op":"move","path":"sections","from":2,"to":0}
enum ResumePatch: Codable, Identifiable, Hashable {
    case set(path: String, value: JSONValue)
    case push(path: String, value: JSONValue)
    case removeAt(path: String, index: Int)
    case move(path: String, from: Int, to: Int)

    /// Synthetic identity for ForEach (patches have no id on the wire).
    var id: String {
        switch self {
        case let .set(path, value): return "set:\(path):\(value.displayString)"
        case let .push(path, value): return "push:\(path):\(value.displayString)"
        case let .removeAt(path, index): return "removeAt:\(path):\(index)"
        case let .move(path, from, to): return "move:\(path):\(from)->\(to)"
        }
    }

    var op: String {
        switch self {
        case .set: return "set"
        case .push: return "push"
        case .removeAt: return "removeAt"
        case .move: return "move"
        }
    }

    var path: String {
        switch self {
        case let .set(path, _), let .push(path, _),
             let .removeAt(path, _), let .move(path, _, _):
            return path
        }
    }

    /// A short human-readable summary of what the patch does.
    var summary: String {
        switch self {
        case let .set(path, value):
            return "Set \(path) → \(value.displayString)"
        case let .push(path, value):
            return "Add to \(path): \(value.displayString)"
        case let .removeAt(path, index):
            return "Remove item \(index) from \(path)"
        case let .move(path, from, to):
            return "Move \(path) item \(from) → \(to)"
        }
    }

    // MARK: Codable

    private enum CodingKeys: String, CodingKey {
        case op, path, value, index, from, to
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let op = try c.decode(String.self, forKey: .op)
        let path = try c.decode(String.self, forKey: .path)
        switch op {
        case "set":
            let value = try c.decodeIfPresent(JSONValue.self, forKey: .value) ?? .null
            self = .set(path: path, value: value)
        case "push":
            let value = try c.decodeIfPresent(JSONValue.self, forKey: .value) ?? .null
            self = .push(path: path, value: value)
        case "removeAt":
            let index = try c.decode(Int.self, forKey: .index)
            self = .removeAt(path: path, index: index)
        case "move":
            let from = try c.decode(Int.self, forKey: .from)
            let to = try c.decode(Int.self, forKey: .to)
            self = .move(path: path, from: from, to: to)
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .op, in: c, debugDescription: "Unknown patch op: \(op)")
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(op, forKey: .op)
        try c.encode(path, forKey: .path)
        switch self {
        case let .set(_, value), let .push(_, value):
            try c.encode(value, forKey: .value)
        case let .removeAt(_, index):
            try c.encode(index, forKey: .index)
        case let .move(_, from, to):
            try c.encode(from, forKey: .from)
            try c.encode(to, forKey: .to)
        }
    }
}

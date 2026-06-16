import SwiftUI

/// A compact glass chip showing an ATS overall score, color-banded.
struct ScoreChip: View {
    let score: Double
    var compact: Bool = false

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "gauge.with.dots.needle.67percent")
                .imageScale(.small)
            Text("\(Int(score.rounded()))")
                .font(compact ? .footnote.weight(.semibold) : .subheadline.weight(.semibold))
                .monospacedDigit()
            if !compact {
                Text("ATS")
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(.secondary)
            }
        }
        .foregroundStyle(score.atsScoreColor)
        .padding(.horizontal, compact ? 10 : 12)
        .padding(.vertical, compact ? 5 : 7)
        .glassCapsule(tint: score.atsScoreColor.opacity(0.25))
    }
}

/// A circular ring gauge for the overall ATS score.
struct ScoreRing: View {
    let score: Double
    var lineWidth: CGFloat = 14
    var diameter: CGFloat = 160

    private var fraction: Double { max(0, min(1, score / 100)) }

    var body: some View {
        ZStack {
            Circle()
                .stroke(.secondary.opacity(0.2), lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: fraction)
                .stroke(
                    score.atsScoreColor.gradient,
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .animation(.smooth(duration: 0.6), value: fraction)
            VStack(spacing: 2) {
                Text("\(Int(score.rounded()))")
                    .font(.system(size: diameter * 0.32, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(score.atsScoreColor)
                Text("Overall")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(width: diameter, height: diameter)
        .accessibilityElement()
        .accessibilityLabel("Overall ATS score")
        .accessibilityValue("\(Int(score.rounded())) out of 100")
    }
}

/// A labeled horizontal progress bar for a single subscore.
struct SubscoreBar: View {
    let label: String
    let value: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(label)
                    .font(.subheadline)
                Spacer()
                Text("\(Int(value.rounded()))")
                    .font(.subheadline.weight(.semibold))
                    .monospacedDigit()
                    .foregroundStyle(value.atsScoreColor)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(.secondary.opacity(0.18))
                    Capsule()
                        .fill(value.atsScoreColor.gradient)
                        .frame(width: geo.size.width * max(0, min(1, value / 100)))
                        .animation(.smooth(duration: 0.5), value: value)
                }
            }
            .frame(height: 8)
        }
    }
}

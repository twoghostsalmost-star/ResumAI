import SwiftUI

/// ATS dashboard: overall ring gauge, five subscore bars, and a ranked findings
/// list. Findings carrying an `autoApplyPatch` get a one-tap "Apply fix" that
/// patches the resume and immediately rescans.
struct ATSTab: View {
    @Bindable var store: ResumeStore

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let result = store.atsResult {
                        scoreHeader(result)
                        subscores(result)
                        findings(result)
                    } else {
                        emptyState
                    }
                }
                .padding()
                .padding(.bottom, 24)
            }
            .glassScreenBackground()
            .softScrollEdges()
            .navigationTitle("ATS")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await store.runScan() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .disabled(store.isScoring)
                    .accessibilityLabel("Re-run scan")
                }
            }
            .overlay { if store.isScoring { LoadingOverlay(text: "Scoring…") } }
        }
    }

    // MARK: Sections

    private func scoreHeader(_ result: AtsScoreResult) -> some View {
        VStack(spacing: 12) {
            ScoreRing(score: result.overall)
            Text("Scoring algorithm v\(result.version)")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .glassCard(cornerRadius: 24)
    }

    private func subscores(_ result: AtsScoreResult) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Subscores").font(.headline)
            ForEach(result.subscores.ordered, id: \.area) { entry in
                SubscoreBar(label: entry.area.label, value: entry.value)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassCard(cornerRadius: 22)
    }

    @ViewBuilder
    private func findings(_ result: AtsScoreResult) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Findings").font(.headline)
                Spacer()
                Text("\(result.findings.count)")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            if result.findings.isEmpty {
                Text("No issues found. Nice work.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(result.findings) { finding in
                    FindingRow(finding: finding) { patches in
                        Task { await store.applyFix(patches) }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            EmptyStateCard(
                systemImage: "gauge.with.dots.needle.bottom.50percent",
                title: "Run an ATS scan",
                message: "Check parseability, keyword match, structure, impact, and formatting — with one-tap fixes for common issues."
            )
            Button {
                Task { await store.runScan() }
            } label: {
                Label("Run ATS scan", systemImage: "sparkle.magnifyingglass")
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 4)
            }
            .glassProminentButton()
            .padding(.horizontal)
            .disabled(store.isScoring)
        }
        .padding(.top, 40)
    }
}

// MARK: - Finding row

private struct FindingRow: View {
    let finding: AtsFinding
    let onApplyFix: ([ResumePatch]) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: finding.severity.systemImage)
                    .foregroundStyle(finding.severity.color)
                Text(finding.severity.label.uppercased())
                    .font(.caption.weight(.bold))
                    .foregroundStyle(finding.severity.color)
                Text("· \(finding.area.label)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
            }
            Text(finding.message)
                .font(.subheadline)
                .frame(maxWidth: .infinity, alignment: .leading)
            if let fix = finding.fix {
                Text(fix.description)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                if let patches = fix.autoApplyPatch, !patches.isEmpty {
                    Button {
                        onApplyFix(patches)
                    } label: {
                        Label("Apply fix", systemImage: "wrench.and.screwdriver")
                            .font(.subheadline.weight(.semibold))
                    }
                    .glassButton()
                    .tint(finding.severity.color)
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassCard(cornerRadius: 18, tint: finding.severity.color.opacity(0.14))
        .overlay(alignment: .leading) {
            Rectangle()
                .fill(finding.severity.color)
                .frame(width: 4)
                .clipShape(RoundedRectangle(cornerRadius: 2))
                .padding(.vertical, 6)
        }
    }
}

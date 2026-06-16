import SwiftUI

/// A floating action button that expands from a "+" into labeled quick actions,
/// morphing between states with Liquid Glass via `GlassEffectContainer` +
/// `glassEffectID` in a shared `@Namespace`.
struct FloatingNewButton: View {
    var onTap: () -> Void

    @State private var expanded = false
    @Namespace private var glassNamespace

    var body: some View {
        if #available(iOS 26.0, *) {
            GlassEffectContainer(spacing: 16) {
                VStack(alignment: .trailing, spacing: 14) {
                    if expanded {
                        quickAction("New resume", systemImage: "doc.badge.plus", id: "new")
                        quickAction("Import", systemImage: "arrow.up.doc", id: "import")
                    }
                    mainButton
                }
            }
            .animation(.bouncy(duration: 0.4), value: expanded)
        } else {
            // Fallback: a plain prominent button.
            Button(action: onTap) {
                Image(systemName: "plus")
                    .font(.title2.weight(.semibold))
                    .frame(width: 56, height: 56)
            }
            .buttonStyle(.borderedProminent)
            .clipShape(Circle())
        }
    }

    @available(iOS 26.0, *)
    private var mainButton: some View {
        Button {
            if expanded {
                onTap()
                expanded = false
            } else {
                expanded.toggle()
            }
        } label: {
            Image(systemName: expanded ? "xmark" : "plus")
                .font(.title2.weight(.semibold))
                .frame(width: 60, height: 60)
                .contentTransition(.symbolEffect(.replace))
        }
        .buttonStyle(.glassProminent)
        .clipShape(Circle())
        .glassEffectID("fab", in: glassNamespace)
        .accessibilityLabel(expanded ? "Close" : "New resume")
    }

    @available(iOS 26.0, *)
    private func quickAction(_ title: String, systemImage: String, id: String) -> some View {
        Button {
            onTap()
            expanded = false
        } label: {
            Label(title, systemImage: systemImage)
                .font(.subheadline.weight(.medium))
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
        }
        .buttonStyle(.glass)
        .glassEffectID(id, in: glassNamespace)
        .transition(.scale.combined(with: .opacity))
    }
}

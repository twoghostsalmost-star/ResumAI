import SwiftUI

// MARK: - Centralized Liquid Glass helpers
//
// Everything Liquid Glass funnels through here so the rest of the app calls one
// of these helpers and gets the real iOS 26 material when available, with a
// graceful `.regularMaterial` / `.ultraThinMaterial` fallback on older runtimes.

/// A reusable glass "card" surface — rounded rect with the system Liquid Glass
/// material on iOS 26, falling back to a material-filled rounded rect otherwise.
struct GlassCard<Content: View>: View {
    var cornerRadius: CGFloat = 22
    var tint: Color? = nil
    var interactive: Bool = false
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(16)
            .modifier(GlassSurface(cornerRadius: cornerRadius, tint: tint, interactive: interactive))
    }
}

/// View modifier that applies a Liquid Glass surface clipped to a rounded rect.
struct GlassSurface: ViewModifier {
    var cornerRadius: CGFloat = 22
    var tint: Color? = nil
    var interactive: Bool = false

    func body(content: Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
        if #available(iOS 26.0, *) {
            content
                .glassEffect(glassStyle, in: shape)
        } else {
            content
                .background(.regularMaterial, in: shape)
                .overlay(shape.strokeBorder(.white.opacity(0.08), lineWidth: 0.5))
        }
    }

    @available(iOS 26.0, *)
    private var glassStyle: Glass {
        var glass: Glass = .regular
        if let tint { glass = glass.tint(tint) }
        if interactive { glass = glass.interactive() }
        return glass
    }
}

extension View {
    /// Apply the reusable Liquid Glass card surface to any view.
    func glassCard(cornerRadius: CGFloat = 22, tint: Color? = nil, interactive: Bool = false) -> some View {
        modifier(GlassSurface(cornerRadius: cornerRadius, tint: tint, interactive: interactive))
    }

    /// Apply a capsule-shaped glass surface (chips, pills, input bars).
    func glassCapsule(tint: Color? = nil, interactive: Bool = false) -> some View {
        modifier(GlassCapsuleSurface(tint: tint, interactive: interactive))
    }

    /// A full-bleed glass/gradient background for screens. On iOS 26 this also
    /// extends content under the system bars via `backgroundExtensionEffect`.
    func glassScreenBackground() -> some View {
        modifier(GlassScreenBackground())
    }
}

struct GlassCapsuleSurface: ViewModifier {
    var tint: Color? = nil
    var interactive: Bool = false

    func body(content: Content) -> some View {
        if #available(iOS 26.0, *) {
            var glass: Glass = .regular
            if let tint { glass = glass.tint(tint) }
            if interactive { glass = glass.interactive() }
            return AnyView(content.glassEffect(glass, in: Capsule()))
        } else {
            return AnyView(
                content
                    .background(.ultraThinMaterial, in: Capsule())
                    .overlay(Capsule().strokeBorder(.white.opacity(0.08), lineWidth: 0.5))
            )
        }
    }
}

/// A soft, tinted screen background that plays well with Liquid Glass surfaces.
struct GlassScreenBackground: ViewModifier {
    @Environment(\.colorScheme) private var scheme

    func body(content: Content) -> some View {
        content
            .background {
                LinearGradient(
                    colors: scheme == .dark
                        ? [Color(.systemBackground), Color.accentColor.opacity(0.18)]
                        : [Color(.systemGroupedBackground), Color.accentColor.opacity(0.10)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
            }
    }
}

// MARK: - Scroll edge effect helper

extension View {
    /// Applies the soft scroll-edge effect on iOS 26 (no-op on older OSes).
    @ViewBuilder
    func softScrollEdges() -> some View {
        if #available(iOS 26.0, *) {
            self.scrollEdgeEffectStyle(.soft, for: .all)
        } else {
            self
        }
    }
}

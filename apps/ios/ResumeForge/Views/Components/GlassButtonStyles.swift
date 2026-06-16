import SwiftUI

// Thin wrappers so call sites can use a single API and degrade on older OSes.

extension View {
    /// Prominent glass button on iOS 26, `.borderedProminent` fallback.
    @ViewBuilder
    func glassProminentButton() -> some View {
        if #available(iOS 26.0, *) {
            self.buttonStyle(.glassProminent)
        } else {
            self.buttonStyle(.borderedProminent)
        }
    }

    /// Regular glass button on iOS 26, `.bordered` fallback.
    @ViewBuilder
    func glassButton() -> some View {
        if #available(iOS 26.0, *) {
            self.buttonStyle(.glass)
        } else {
            self.buttonStyle(.bordered)
        }
    }
}

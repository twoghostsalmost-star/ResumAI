import SwiftUI

struct BasicsEditorSection: View {
    @Binding var basics: Basics

    var body: some View {
        Section("Basics") {
            TextField("Full name", text: $basics.fullName)
            TextField("Headline", text: opt($basics.headline))
            TextField("Email", text: opt($basics.email))
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
            TextField("Phone", text: opt($basics.phone))
                .keyboardType(.phonePad)
            TextField("Location", text: opt($basics.location))
            VStack(alignment: .leading) {
                Text("Summary").font(.caption).foregroundStyle(.secondary)
                TextEditor(text: opt($basics.summary))
                    .frame(minHeight: 80)
            }
        }

        Section("Links") {
            ForEach($basics.links) { $link in
                VStack {
                    TextField("Label", text: $link.label)
                    TextField("URL", text: $link.url)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                }
            }
            .onDelete { basics.links.remove(atOffsets: $0) }
            Button {
                basics.links.append(Link(label: "Website", url: "https://"))
            } label: {
                Label("Add link", systemImage: "plus")
            }
        }
    }

    private func opt(_ source: Binding<String?>) -> Binding<String> {
        Binding(get: { source.wrappedValue ?? "" }, set: { source.wrappedValue = $0.nilIfEmpty })
    }
}

struct DesignEditorSection: View {
    @Binding var design: ResumeDesign

    private var accentBinding: Binding<Color> {
        Binding(
            get: { Color(hex: design.accentColor) },
            set: { design.accentColor = $0.hexString }
        )
    }

    var body: some View {
        Section("Design") {
            Picker("Template", selection: $design.template) {
                ForEach(ResumeDesign.Template.allCases) { Text($0.label).tag($0) }
            }
            Picker("Font", selection: $design.fontFamily) {
                ForEach(ResumeDesign.atsSafeFonts, id: \.self) { Text($0).tag($0) }
            }
            ColorPicker("Accent color", selection: accentBinding, supportsOpacity: false)
            VStack(alignment: .leading) {
                HStack {
                    Text("Font scale")
                    Spacer()
                    Text(String(format: "%.2f×", design.fontScale))
                        .foregroundStyle(.secondary).monospacedDigit()
                }
                Slider(value: $design.fontScale, in: 0.8...1.3, step: 0.05)
            }
            Picker("Margins", selection: $design.margins) {
                ForEach(ResumeDesign.Margins.allCases) { Text($0.label).tag($0) }
            }
        }
    }
}

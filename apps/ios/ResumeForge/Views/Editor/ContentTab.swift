import SwiftUI

/// The structured editor: basics, target role/JD, all sections (add/remove/
/// reorder + edit), and design controls. Autosaves on edit and offers explicit Save.
struct ContentTab: View {
    @Bindable var store: ResumeStore

    @State private var showAddSection = false

    var body: some View {
        NavigationStack {
            Group {
                if store.resume != nil {
                    editorForm
                } else {
                    ProgressView()
                }
            }
            .navigationTitle("Content")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await store.save() }
                    } label: {
                        if store.isSaving {
                            ProgressView().controlSize(.small)
                        } else {
                            Text("Save")
                        }
                    }
                    .disabled(store.isSaving)
                }
            }
        }
    }

    private var bindableResume: Binding<Resume> {
        Binding(
            get: { store.resume ?? Resume() },
            set: { store.resume = $0; store.scheduleAutosave() }
        )
    }

    private var editorForm: some View {
        Form {
            if let error = store.errorMessage {
                Section {
                    Text(error).font(.footnote).foregroundStyle(.red)
                }
            }

            Section("Document") {
                TextField("Title", text: bindableResume.title)
            }

            Section("Target") {
                TextField("Target role", text: optional(bindableResume.targetRole))
                VStack(alignment: .leading) {
                    Text("Job description").font(.caption).foregroundStyle(.secondary)
                    TextEditor(text: optional(bindableResume.targetJobDescription))
                        .frame(minHeight: 90)
                }
            }

            BasicsEditorSection(basics: bindableResume.basics)

            ForEach(Array((store.resume?.sections ?? []).enumerated()), id: \.element.id) { index, _ in
                SectionEditor(section: sectionBinding(at: index))
                    .swipeActions {
                        Button(role: .destructive) {
                            removeSection(at: index)
                        } label: { Label("Delete", systemImage: "trash") }
                    }
            }
            .onMove(perform: moveSections)

            Section {
                Button {
                    showAddSection = true
                } label: {
                    Label("Add section", systemImage: "plus.circle")
                }
            }

            DesignEditorSection(design: bindableResume.design)
        }
        .environment(\.editMode, .constant(.active))
        .scrollContentBackground(.hidden)
        .glassScreenBackground()
        .confirmationDialog("Add section", isPresented: $showAddSection, titleVisibility: .visible) {
            ForEach(ResumeSection.Kind.allCases) { kind in
                Button(kind.label) { addSection(kind) }
            }
        }
    }

    // MARK: Bindings & mutations

    private func optional(_ source: Binding<String?>) -> Binding<String> {
        Binding(get: { source.wrappedValue ?? "" }, set: { source.wrappedValue = $0.nilIfEmpty })
    }

    private func sectionBinding(at index: Int) -> Binding<ResumeSection> {
        Binding(
            get: { store.resume?.sections[safe: index] ?? .custom(id: "missing", heading: "", items: []) },
            set: { newValue in
                guard var r = store.resume, r.sections.indices.contains(index) else { return }
                r.sections[index] = newValue
                store.resume = r
                store.scheduleAutosave()
            }
        )
    }

    private func addSection(_ kind: ResumeSection.Kind) {
        guard var r = store.resume else { return }
        r.sections.append(.empty(kind))
        store.resume = r
        store.scheduleAutosave()
    }

    private func removeSection(at index: Int) {
        guard var r = store.resume, r.sections.indices.contains(index) else { return }
        r.sections.remove(at: index)
        store.resume = r
        store.scheduleAutosave()
    }

    private func moveSections(from offsets: IndexSet, to destination: Int) {
        guard var r = store.resume else { return }
        r.sections.move(fromOffsets: offsets, toOffset: destination)
        store.resume = r
        store.scheduleAutosave()
    }
}

extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

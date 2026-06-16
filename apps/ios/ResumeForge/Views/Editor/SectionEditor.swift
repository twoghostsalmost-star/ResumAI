import SwiftUI

/// Editor for a single section. Reads/writes through a `Binding<ResumeSection>`,
/// rebuilding the enum case on each mutation (sections are value types).
struct SectionEditor: View {
    @Binding var section: ResumeSection

    var body: some View {
        Section {
            switch section {
            case let .experience(id, items):
                experienceEditor(id: id, items: items)
            case let .education(id, items):
                educationEditor(id: id, items: items)
            case let .skills(id, groups):
                skillsEditor(id: id, groups: groups)
            case let .projects(id, items):
                projectsEditor(id: id, items: items)
            case let .certifications(id, items):
                certificationsEditor(id: id, items: items)
            case let .custom(id, heading, items):
                customEditor(id: id, heading: heading, items: items)
            }
        } header: {
            Label(section.displayHeading, systemImage: section.kind.systemImage)
        }
    }

    // MARK: Experience

    @ViewBuilder
    private func experienceEditor(id: String, items: [ExperienceItem]) -> some View {
        ForEach(items.indices, id: \.self) { i in
            let item = items[i]
            DisclosureGroup(item.role.nilIfEmpty ?? item.company.nilIfEmpty ?? "Role") {
                TextField("Role", text: experienceField(id: id, items: items, index: i, \.role))
                TextField("Company", text: experienceField(id: id, items: items, index: i, \.company))
                TextField("Location", text: experienceOptional(id: id, items: items, index: i, \.location))
                TextField("Start (YYYY or YYYY-MM)", text: experienceField(id: id, items: items, index: i, \.startDate))
                TextField("End (YYYY / present)", text: experienceOptional(id: id, items: items, index: i, \.endDate))
                BulletsEditor(
                    bullets: experienceBullets(id: id, items: items, index: i),
                    placeholder: "Achievement bullet"
                )
                Button(role: .destructive) {
                    var copy = items; copy.remove(at: i)
                    section = .experience(id: id, items: copy)
                } label: { Label("Remove role", systemImage: "trash") }
            }
        }
        addButton("Add role") {
            section = .experience(id: id, items: items + [ExperienceItem(company: "", role: "New Role", startDate: "")])
        }
    }

    private func experienceField(id: String, items: [ExperienceItem], index: Int, _ kp: WritableKeyPath<ExperienceItem, String>) -> Binding<String> {
        Binding(
            get: { items[safe: index]?[keyPath: kp] ?? "" },
            set: { newValue in
                var copy = items
                guard copy.indices.contains(index) else { return }
                copy[index][keyPath: kp] = newValue
                section = .experience(id: id, items: copy)
            }
        )
    }

    private func experienceOptional(id: String, items: [ExperienceItem], index: Int, _ kp: WritableKeyPath<ExperienceItem, String?>) -> Binding<String> {
        Binding(
            get: { items[safe: index]?[keyPath: kp] ?? "" },
            set: { newValue in
                var copy = items
                guard copy.indices.contains(index) else { return }
                copy[index][keyPath: kp] = newValue.nilIfEmpty
                section = .experience(id: id, items: copy)
            }
        )
    }

    private func experienceBullets(id: String, items: [ExperienceItem], index: Int) -> Binding<[String]> {
        Binding(
            get: { items[safe: index]?.bullets ?? [] },
            set: { newValue in
                var copy = items
                guard copy.indices.contains(index) else { return }
                copy[index].bullets = newValue
                section = .experience(id: id, items: copy)
            }
        )
    }

    // MARK: Education

    @ViewBuilder
    private func educationEditor(id: String, items: [EducationItem]) -> some View {
        ForEach(items.indices, id: \.self) { i in
            let item = items[i]
            DisclosureGroup(item.institution.nilIfEmpty ?? "Institution") {
                TextField("Institution", text: eduField(id: id, items: items, index: i, \.institution))
                TextField("Degree", text: eduOptional(id: id, items: items, index: i, \.degree))
                TextField("Field", text: eduOptional(id: id, items: items, index: i, \.field))
                TextField("Start", text: eduOptional(id: id, items: items, index: i, \.startDate))
                TextField("End", text: eduOptional(id: id, items: items, index: i, \.endDate))
                BulletsEditor(bullets: eduDetails(id: id, items: items, index: i), placeholder: "Detail")
                Button(role: .destructive) {
                    var copy = items; copy.remove(at: i)
                    section = .education(id: id, items: copy)
                } label: { Label("Remove", systemImage: "trash") }
            }
        }
        addButton("Add education") {
            section = .education(id: id, items: items + [EducationItem(institution: "New Institution")])
        }
    }

    private func eduField(id: String, items: [EducationItem], index: Int, _ kp: WritableKeyPath<EducationItem, String>) -> Binding<String> {
        Binding(
            get: { items[safe: index]?[keyPath: kp] ?? "" },
            set: { v in var c = items; guard c.indices.contains(index) else { return }; c[index][keyPath: kp] = v; section = .education(id: id, items: c) }
        )
    }
    private func eduOptional(id: String, items: [EducationItem], index: Int, _ kp: WritableKeyPath<EducationItem, String?>) -> Binding<String> {
        Binding(
            get: { items[safe: index]?[keyPath: kp] ?? "" },
            set: { v in var c = items; guard c.indices.contains(index) else { return }; c[index][keyPath: kp] = v.nilIfEmpty; section = .education(id: id, items: c) }
        )
    }
    private func eduDetails(id: String, items: [EducationItem], index: Int) -> Binding<[String]> {
        Binding(
            get: { items[safe: index]?.details ?? [] },
            set: { v in var c = items; guard c.indices.contains(index) else { return }; c[index].details = v; section = .education(id: id, items: c) }
        )
    }

    // MARK: Skills

    @ViewBuilder
    private func skillsEditor(id: String, groups: [SkillsGroup]) -> some View {
        ForEach(groups.indices, id: \.self) { i in
            VStack(alignment: .leading) {
                TextField("Group name (optional)", text: skillGroupName(id: id, groups: groups, index: i))
                TextField("Comma-separated skills", text: skillGroupSkills(id: id, groups: groups, index: i), axis: .vertical)
                Button(role: .destructive) {
                    var c = groups; c.remove(at: i); section = .skills(id: id, groups: c)
                } label: { Label("Remove group", systemImage: "trash").font(.caption) }
            }
        }
        addButton("Add skill group") {
            section = .skills(id: id, groups: groups + [SkillsGroup(skills: [])])
        }
    }

    private func skillGroupName(id: String, groups: [SkillsGroup], index: Int) -> Binding<String> {
        Binding(
            get: { groups[safe: index]?.name ?? "" },
            set: { v in var c = groups; guard c.indices.contains(index) else { return }; c[index].name = v.nilIfEmpty; section = .skills(id: id, groups: c) }
        )
    }
    private func skillGroupSkills(id: String, groups: [SkillsGroup], index: Int) -> Binding<String> {
        Binding(
            get: { groups[safe: index]?.skills.joined(separator: ", ") ?? "" },
            set: { v in
                var c = groups; guard c.indices.contains(index) else { return }
                c[index].skills = v.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
                section = .skills(id: id, groups: c)
            }
        )
    }

    // MARK: Projects

    @ViewBuilder
    private func projectsEditor(id: String, items: [ProjectItem]) -> some View {
        ForEach(items.indices, id: \.self) { i in
            let item = items[i]
            DisclosureGroup(item.name.nilIfEmpty ?? "Project") {
                TextField("Name", text: projField(id: id, items: items, index: i, \.name))
                TextField("URL", text: projOptional(id: id, items: items, index: i, \.url))
                BulletsEditor(bullets: projBullets(id: id, items: items, index: i), placeholder: "Bullet")
                Button(role: .destructive) {
                    var c = items; c.remove(at: i); section = .projects(id: id, items: c)
                } label: { Label("Remove", systemImage: "trash") }
            }
        }
        addButton("Add project") {
            section = .projects(id: id, items: items + [ProjectItem(name: "New Project")])
        }
    }

    private func projField(id: String, items: [ProjectItem], index: Int, _ kp: WritableKeyPath<ProjectItem, String>) -> Binding<String> {
        Binding(
            get: { items[safe: index]?[keyPath: kp] ?? "" },
            set: { v in var c = items; guard c.indices.contains(index) else { return }; c[index][keyPath: kp] = v; section = .projects(id: id, items: c) }
        )
    }
    private func projOptional(id: String, items: [ProjectItem], index: Int, _ kp: WritableKeyPath<ProjectItem, String?>) -> Binding<String> {
        Binding(
            get: { items[safe: index]?[keyPath: kp] ?? "" },
            set: { v in var c = items; guard c.indices.contains(index) else { return }; c[index][keyPath: kp] = v.nilIfEmpty; section = .projects(id: id, items: c) }
        )
    }
    private func projBullets(id: String, items: [ProjectItem], index: Int) -> Binding<[String]> {
        Binding(
            get: { items[safe: index]?.bullets ?? [] },
            set: { v in var c = items; guard c.indices.contains(index) else { return }; c[index].bullets = v; section = .projects(id: id, items: c) }
        )
    }

    // MARK: Certifications

    @ViewBuilder
    private func certificationsEditor(id: String, items: [CertItem]) -> some View {
        ForEach(items.indices, id: \.self) { i in
            VStack(alignment: .leading) {
                TextField("Name", text: certField(id: id, items: items, index: i, \.name))
                TextField("Issuer", text: certOptional(id: id, items: items, index: i, \.issuer))
                TextField("Date", text: certOptional(id: id, items: items, index: i, \.date))
                Button(role: .destructive) {
                    var c = items; c.remove(at: i); section = .certifications(id: id, items: c)
                } label: { Label("Remove", systemImage: "trash").font(.caption) }
            }
        }
        addButton("Add certification") {
            section = .certifications(id: id, items: items + [CertItem(name: "New Certification")])
        }
    }

    private func certField(id: String, items: [CertItem], index: Int, _ kp: WritableKeyPath<CertItem, String>) -> Binding<String> {
        Binding(
            get: { items[safe: index]?[keyPath: kp] ?? "" },
            set: { v in var c = items; guard c.indices.contains(index) else { return }; c[index][keyPath: kp] = v; section = .certifications(id: id, items: c) }
        )
    }
    private func certOptional(id: String, items: [CertItem], index: Int, _ kp: WritableKeyPath<CertItem, String?>) -> Binding<String> {
        Binding(
            get: { items[safe: index]?[keyPath: kp] ?? "" },
            set: { v in var c = items; guard c.indices.contains(index) else { return }; c[index][keyPath: kp] = v.nilIfEmpty; section = .certifications(id: id, items: c) }
        )
    }

    // MARK: Custom

    @ViewBuilder
    private func customEditor(id: String, heading: String, items: [BulletItem]) -> some View {
        TextField("Heading", text: Binding(
            get: { heading },
            set: { section = .custom(id: id, heading: $0, items: items) }
        ))
        BulletsEditor(
            bullets: Binding(
                get: { items.map(\.text) },
                set: { texts in
                    let newItems = texts.enumerated().map { idx, t in
                        BulletItem(id: items[safe: idx]?.id ?? UUID().uuidString, text: t)
                    }
                    section = .custom(id: id, heading: heading, items: newItems)
                }
            ),
            placeholder: "Item"
        )
    }

    // MARK: Helpers

    private func addButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(title, systemImage: "plus.circle")
                .font(.subheadline)
        }
    }
}

/// A reusable editor for a list of string bullets with add/remove/reorder.
struct BulletsEditor: View {
    @Binding var bullets: [String]
    var placeholder: String = "Bullet"

    var body: some View {
        ForEach(bullets.indices, id: \.self) { i in
            HStack(alignment: .top) {
                Image(systemName: "circle.fill").font(.system(size: 5)).foregroundStyle(.secondary).padding(.top, 8)
                TextField(placeholder, text: Binding(
                    get: { bullets[safe: i] ?? "" },
                    set: { v in if bullets.indices.contains(i) { bullets[i] = v } }
                ), axis: .vertical)
            }
        }
        .onDelete { bullets.remove(atOffsets: $0) }
        .onMove { bullets.move(fromOffsets: $0, toOffset: $1) }
        Button {
            bullets.append("")
        } label: {
            Label("Add \(placeholder.lowercased())", systemImage: "plus").font(.caption)
        }
    }
}

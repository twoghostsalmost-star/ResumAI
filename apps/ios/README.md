# ResumeForge — iOS (native SwiftUI)

A fully native SwiftUI client for ResumeForge, targeting **iOS 26** and built
around Apple's **Liquid Glass** design system. It talks to the same Fastify
backend as the web and React Native apps.

## Requirements
- macOS with **Xcode 26+** (iOS 26 SDK — required for the Liquid Glass APIs).
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) to generate the project
  (no `.xcodeproj` is committed):

```bash
brew install xcodegen
cd apps/ios
xcodegen generate
open ResumeForge.xcodeproj
```

Select an **iOS 26 simulator** (or device) and run.

## Point it at your API
The base URL defaults to `http://localhost:3000` (declared as `API_BASE_URL` in
`Info.plist`). You can override it at runtime in **Settings → API** — the value
persists to `UserDefaults` and takes precedence on next launch. For a deployed
backend, set it to your HTTPS API host (and tighten `NSAppTransportSecurity` in
`project.yml`, which currently allows local plaintext HTTP for dev).

## What's implemented
- **Auth** — passwordless email sign-in (`/auth/session`); the bearer token is
  stored in the **Keychain** and restored on launch.
- **Home** — `.searchable` glass list of resumes, swipe/long-press delete, a
  Liquid Glass floating "+" that morphs into the New Resume sheet.
- **New / Import** — build from scratch, paste/upload to parse (`/parse/text`,
  multipart `/parse/upload`), or LinkedIn (auth URL with PDF fallback). Imports
  land on a **review screen** with low-confidence fields highlighted.
- **Editor** — a Liquid Glass `TabView` with four tabs:
  - **Preview** — native single-column render honoring template/accent/font
    scale; export PDF/DOCX and share-link via the system share sheet.
  - **Content** — full CRUD over basics, target role/JD, every section type, and
    design controls; debounced autosave (`PUT /resumes/:id`).
  - **Assistant** — chat with a glass input bar; proposed `ResumePatch`es are
    applied only on an explicit "Apply changes" tap (never silently). Includes a
    push-to-talk affordance wired to the backend STT proxy concept.
  - **ATS** — overall ring gauge, five subscore bars, severity-ranked findings,
    and one-tap auto-fixes that patch + rescan.
- **Settings** — account info, API URL override, **export my data**, **delete
  account** (hard delete), and sign out.

## Architecture notes
- **Models** (`Models/`) mirror the backend's `Resume` model. The polymorphic
  `ResumeSection` and the `ResumePatch` operations use custom `Codable`
  implementations (discriminated by a `type` / `op` key) so they round-trip the
  API JSON exactly. `JSONValue` carries the open-typed `value` in `set`/`push`
  patches.
- **Networking** (`Networking/APIClient.swift`) is an `async/await`
  `URLSession` client covering every endpoint; base URL via `APIConfig`, token
  via `TokenStore` (Keychain).
- **State** uses the `@Observable` macro (`AppState`, `ResumeStore`) on
  `@MainActor`.
- **Liquid Glass** is centralized in `Views/Components/GlassBackground.swift`
  (`glassCard`, `glassCapsule`, `glassScreenBackground`, `softScrollEdges`) and
  `GlassButtonStyles.swift` (`glassButton`, `glassProminentButton`). Each gates
  the iOS 26 API behind `if #available(iOS 26.0, *)` with a `.regularMaterial` /
  `.ultraThinMaterial` fallback, so the app degrades cleanly on earlier SDKs.

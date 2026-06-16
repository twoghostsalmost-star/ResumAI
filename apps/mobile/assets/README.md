# Fonts required by the Skia preview

`components/ResumePreview.tsx` loads two TTF files that you must add here:

- `Helvetica.ttf`
- `Helvetica-Bold.ttf`

Any ATS-safe TTF works (Helvetica, Arial, or e.g. the open Liberation Sans
renamed to these filenames). They're omitted from the repo for licensing reasons.
Until they're present, the preview renders a blank page placeholder (handled
gracefully in the component).

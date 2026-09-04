# Widgetr

Widgetr is a standalone Nuxt application for building Scriptable widgets through one shared visual state. Phase 4 adds contextual imperative WebMCP tools over the same revision-checked operation path as the UI, on top of the Phase 3 local-first projects, IndexedDB persistence, structure and inspector editing, local reference images, and deterministic Scriptable generation.

The current public-facing editor is intentionally functional rather than visually polished: it demonstrates three independent widget-size layouts, shared data, revision-checked operations, local project history, deterministic Scriptable export, and a live WebMCP tool catalog that changes with the selected element. Data onboarding and design curation remain later phases in the approved product plan.

Live deployment for the Devpost challenge and testing: [widgetr.vercel.app](https://widgetr.vercel.app/)

## Requirements

- Node.js 22.19+, 24.11+, or 26+. The checked-in `.nvmrc` selects Node 24.
- npm

## Local setup

```bash
npm install
npm run dev
```

Open the local URL shown by Nuxt. With no saved projects, the editor starts with intentional project choices; returning users resume their last project. Once a project exists, the workspace provides three widget-size previews, structure and inspector controls, and generated Scriptable source. Projects, edits, undo/redo history, and reference images stay in the browser's local IndexedDB storage.

## Production deployment

Widgetr is configured for a normal Nuxt server deployment. Vercel detects Nuxt automatically and uses the `nuxt build` workflow; no `vercel.json` file or output-directory override is required for the current application.

### Vercel dashboard

1. Push the repository to a public Git provider.
2. In Vercel, choose **Add New → Project**, import the repository, and keep the detected Nuxt framework settings.
3. Use `npm run build` as the build command if Vercel asks for an explicit command. Leave the output directory at its automatic setting.
4. Deploy, open the resulting URL, and verify the three previews, scoped operations, export preflight, Copy action, and `.js` download. The current deployment is [widgetr.vercel.app](https://widgetr.vercel.app/).

Phase 4 has no required environment variables. Do not add secrets to the repository or to the generated Scriptable file.

### Local production check

```bash
npm run build
NODE_ENV=production node .output/server/index.mjs
```

The production server listens on port `3000` by default. `npm run generate` remains available when a fully static output is specifically needed, but the default deployment path uses `npm run build` so the Nuxt server preset remains available.

## Checks

```bash
npm run typecheck
npm test
```

The repository also defines `npm run build` and `npm run generate` for the deliberate deployment checkpoint. A local check does not prove that the generated file has run on an iPhone in Scriptable.

## Environment variables

Phase 4 does not use environment variables. Later phases must document variable names in `.env.example` without committing values or secrets.

## Project boundary

This application has no runtime dependency on `ScriptableEditor`. Local projects, reference images, intentional starter paths, and WebMCP tools belong to the Widgetr runtime; authenticated data diagnostics and the private design library belong to later phases in the approved plan. The exported file is generated from the Widgetr canonical state and runs independently of the website.

## License

Widgetr is released under the [MIT License](./LICENSE).

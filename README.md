# Widgetr

Widgetr is a standalone Nuxt application for building Scriptable widgets through one shared visual state. It adds contextual imperative WebMCP tools over the same revision-checked operation path as the UI, on top of local-first projects, IndexedDB persistence, structure and inspector editing, local reference images, and deterministic Scriptable generation.

The public entry point is a short onboarding page at `/`; the editor lives at `/studio`. The homepage surfaces the page-side WebMCP readiness state, discloses registered page-action names when available, provides a short copyable assistant message, and routes new visitors to the Studio starter flow. The Studio demonstrates three independent widget-size layouts, shared data, revision-checked operations, local project history, deterministic Scriptable export, and a live contextual WebMCP catalog that changes with the selected element. Once a project exists, the assistant can read the full structure on demand and page through persisted semantic changes instead of receiving those details in every context response. Data onboarding and design curation remain later phases in the approved product plan.

Live deployment for the Devpost challenge and testing: [widgetr.vercel.app](https://widgetr.vercel.app/)

## Requirements

- Node.js 22.19+, 24.11+, or 26+. The checked-in `.nvmrc` selects Node 24.
- npm

## Local setup

```bash
npm install
npm run dev
```

Open the local URL shown by Nuxt. `/` is the onboarding page and `/studio` is the editor. A new visitor can use `Start in Studio` to open the intentional starter choices; returning users can use `Continue` to resume their last project. The homepage readiness row reports only what the current page can observe: whether page actions are available, registering, ready, or working. In a WebMCP-capable environment, the `Page actions` disclosure lists the registered tool names; ordinary browsers receive the copy-message fallback. Once a project exists, the workspace provides three widget-size previews, structure and inspector controls, and generated Scriptable source. Projects, edits, semantic change history, and reference images stay in the browser's local IndexedDB storage; the undo/redo controls remain session-local.

## Production deployment

Widgetr is configured for a normal Nuxt server deployment. Vercel detects Nuxt automatically and uses the `nuxt build` workflow; no `vercel.json` file or output-directory override is required for the current application.

### Vercel dashboard

1. Push the repository to a public Git provider.
2. In Vercel, choose **Add New → Project**, import the repository, and keep the detected Nuxt framework settings.
3. Use `npm run build` as the build command if Vercel asks for an explicit command. Leave the output directory at its automatic setting.
4. Deploy, open the resulting URL, and verify the homepage readiness row and page-action disclosure, the Studio starter flow, the three previews, scoped operations, export preflight, Copy action, and `.js` download. The current deployment is [widgetr.vercel.app](https://widgetr.vercel.app/).

Phase 4 has no required environment variables. Do not add secrets to the repository or to the generated Scriptable file.

### Local production check

```bash
npm run build
NODE_ENV=production node .output/server/index.mjs
```

The production server listens on port `3000` by default. `npm run generate` remains available when a fully static output is specifically needed, but the default deployment path uses `npm run build` so the Nuxt server preset remains available.

## Checks

```bash
npm run repo:check
npm run typecheck
npm test
```

The repository also defines `npm run build` and `npm run generate` for the deliberate deployment checkpoint. A local check does not prove that a deployed page registered its WebMCP tools, that an external assistant invoked one, or that the generated file has run on an iPhone in Scriptable.

## Environment variables

Phase 4 does not use environment variables. Later phases must document variable names in `.env.example` without committing values or secrets.

## Project boundary

This application has no runtime dependency on `ScriptableEditor`. Local projects, reference images, intentional starter paths, and WebMCP tools belong to the Widgetr runtime; authenticated data diagnostics and the private design library belong to later phases in the approved plan. The exported file is generated from the Widgetr canonical state and runs independently of the website.

## License

Widgetr is released under the [MIT License](./LICENSE).

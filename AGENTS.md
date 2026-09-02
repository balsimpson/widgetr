# Widgetr agent instructions

## Scope and source of truth

- These instructions apply to `/Users/balsimpson/Documents/Projects/Widgetr`.
- Widgetr is a standalone project. Do not add its runtime, dependencies, or application code to `/Users/balsimpson/Documents/ScriptableEditor`.
- The durable product and architecture contract lives in [`webmcp-scriptable-widget-plan.md`](./webmcp-scriptable-widget-plan.md). It defines what Widgetr is and the rules implementation must preserve. Do not put phase status or dated handoffs there.
- The active phase, task checklists, deployment gates, verification evidence, and exact next action live in [`docs/widgetr-phase-implementation-plan.md`](./docs/widgetr-phase-implementation-plan.md). Update its **Current handoff** after every session that changes implementation or verification state.
- The user-facing product standard lives in [`docs/widgetr-product-principles.md`](./docs/widgetr-product-principles.md). Read it before planning or editing copy, onboarding, UI, UX, visual design, WebMCP handoff, examples, status messages, error states, support guidance, or agent-facing descriptions. Apply its review test as acceptance criteria. Its core rule is to make the easiest next step obvious, especially for beginners.
- The current visual and interaction design contract lives in [`widgetr-design.md`](./widgetr-design.md). Read it when planning or editing the studio shell, canvas, preview sizes, selection, inspector, assistant handoff, responsive behavior, or related copy. Treat it as the design source of truth unless a newer user-approved design explicitly supersedes it.
- The approved homepage and Studio split implementation handoff lives in [`docs/widgetr-homepage-studio-implementation.md`](./docs/widgetr-homepage-studio-implementation.md). Read it before implementing that focused change. It does not replace the canonical phase handoff or the broader product, UX, and visual contracts above.
- User requests set the requested scope. Repository identity, safety, secret, and generated-file rules are non-negotiable. Use the product plan for system boundaries, the implementation plan for phase status and order, the design contract for UI decisions, and the browser runbook for rendered checks. If project documents conflict, pause and reconcile them instead of choosing silently.
- Preserve unrelated changes in the worktree. Do not reset, clean, or delete files to make the checkout look tidy.

## Repository identity hard gate

Before any edit, stage, commit, push, deployment, or Devpost state change:

1. Set the working directory to `/Users/balsimpson/Documents/Projects/Widgetr` explicitly.
2. Run `npm run repo:check`.
3. Run `git status --short --branch` and inspect existing changes before touching files.

The guard must confirm all three identities:

- Git root: `/Users/balsimpson/Documents/Projects/Widgetr`
- `origin`: `https://github.com/balsimpson/widgetr.git`
- package name: `widgetr`

If any identity differs or the guard cannot read it, stop. Do not edit, stage, commit, push, deploy, or create submission state. A task's inherited current directory, a similarly named folder, and prior chat context are not proof of repository identity. Never perform Widgetr work from `/Users/balsimpson/Documents/ScriptableEditor`; that checkout is reference-only.

The identity gate is necessary but not sufficient authorization. Do not commit, push, deploy, publish, or change Devpost state unless the user explicitly requests that external action.

## Status authority

Do not duplicate phase status in this file. The canonical resume state is the **Current handoff** in [`docs/widgetr-phase-implementation-plan.md`](./docs/widgetr-phase-implementation-plan.md). If this file and the implementation plan disagree about status, pause implementation and reconcile the implementation plan against current Git, browser, deployment, and device evidence.

## Provider-neutral WebMCP hard rule

- Widgetr does not care which AI assistant provider is present. Never gate, branch, rank, or debate the product experience based on ChatGPT, Claude, or any other assistant brand.
- Do not ask the user to choose a supported provider and do not reopen provider-compatibility research unless the user explicitly requests provider-specific behavior. A provider support list is not part of ordinary Widgetr implementation or review.
- Runtime behavior may use only facts the page can observe:
  1. **WebMCP enabled** means `document.modelContext?.registerTool` is available in the current page.
  2. **WebMCP ready** means the required Widgetr tools registered successfully. Treat this as the product's ready or connected signal without attempting to identify the provider behind it.
  3. **Your assistant is working** means Widgetr observed an actual registered-tool invocation.
  4. **WebMCP unavailable** means the API is missing or required tool registration failed; show a useful next action.
- Never infer a provider from user agent strings, globals, model names, prompt text, or browser chrome. Provider identity must not affect tool registration, status copy, UI branches, tests, or acceptance criteria.
- Provider names may appear only as optional examples in setup help when useful. They must not become requirements, support promises, or runtime conditions.

## Resume checklist

When starting a new task in this repository:

1. Read this file, the implementation plan's **Current handoff**, and the active phase.
2. Complete the **Repository identity hard gate** above.
3. Inspect `package.json`, `.nvmrc`, and the relevant files below before editing.
4. Confirm the requested work matches the **Phase execution** rules below.
5. Preserve the **Canonical widget invariants** below.
6. For UI behavior changes, follow the [`Widgetr local browser runbook`](./docs/widgetr-local-browser-runbook.md). Source inspection alone is not visual verification.
7. Report checks that were not run instead of implying they passed.

## Local preview preflight

Before opening or claiming the in-app browser preview is available:

1. Check the documented Widgetr port first:

   ```text
   lsof -nP -iTCP:3100 -sTCP:LISTEN
   ```

2. Identify any listener before using it. If port 3100 is free, start exactly one Widgetr dev server from this repository using the [local browser runbook](./docs/widgetr-local-browser-runbook.md), retain its terminal session, and wait for Nuxt's `ready` output. A URL, a stale tab, or a successful source edit is not evidence that a server is running.
3. Open the exact URL for the verified Widgetr listener: `http://127.0.0.1:3100/` by default, or the explicitly reported port if an existing Widgetr session is intentionally using another port. Do not assume `http://localhost:3000/` is the current Widgetr preview.
4. If there is no verified listener or the server is not ready, stop and report that the preview is unavailable instead of opening a browser tab or claiming that it is visible.

## In-app browser inspection

After every implementation change, open the exact local Widgetr preview in the Codex in-app browser, make the browser visible, and leave the changed route or state available for the user to inspect. For UI changes, verify the requested interaction at 1280 x 900 first and keep the browser tab available as the visual handoff. If a change has no meaningful visual surface, state that explicitly rather than silently treating source inspection as visual verification.

## Smallest-change routing map

Start with the owning file below and search only that file (or the two files named for a cross-boundary change). Do not scan every component before making a focused UI change. Use `rg -n -C 5` with the exact visible copy, class, handler, or operation named in the request, then widen the search only when the owner is not present.

| Request area | First owner | Also inspect only when needed |
| --- | --- | --- |
| Tooling, dependencies, and runtime | `package.json`, `package-lock.json`, `.nvmrc` | `scripts/` for an existing command |
| Studio shell, top bar, floating controls, canvas title/grid, sheets, responsive spacing | `app/pages/studio.vue` | `widgetr-design.md` for an interaction or visual contract |
| Preview caption, size scaling, whole-widget selection | `app/components/widget/WidgetPreview.vue` | `app/pages/studio.vue` for selection state wiring |
| Rendered widget nodes and child hit targets | `app/components/widget/WidgetNodeRenderer.vue` | `app/domain/widget/tree.ts` for traversal or labels |
| Layers/outline selection | `app/components/widget/WidgetStructureTree.vue` | `app/pages/studio.vue` for selection state wiring |
| Inspector fields and disclosure sections | `app/components/widget/WidgetInspector.vue` | `app/domain/widget/operations.ts` for the operation payload |
| Projects and first-run choices | `app/components/widget/ProjectList.vue`, `app/components/widget/ProjectStarter.vue` | `app/composables/useWidgetProjects.ts` for persistence behavior |
| Assistant status and tool details | `app/components/widget/AgentToolsPanel.vue` | `app/composables/useWidgetWebMcp.ts` for registration state |
| Project persistence and restoration | `app/composables/useWidgetProjects.ts` | `app/domain/widget/projects.ts`, `app/domain/widget/storage.ts` |
| Any document mutation or scope behavior | `app/domain/widget/operations.ts` | `app/types/widget.ts` and the caller that constructs the operation |
| Element labels, lookup, and tree traversal | `app/domain/widget/tree.ts` | `app/types/widget.ts` for element shape |
| Scriptable output or export formatting | `app/domain/widget/scriptable.ts` | `app/pages/studio.vue` only for export-sheet wiring |
| Unit verification | `tests/unit/`, `vitest.config.ts` | The relevant owner and its operation path |

The current studio shell intentionally remains coordinated in `app/pages/studio.vue`; do not extract a new shell component for a one-off visual adjustment. Keep a change in its first owner whenever possible, and only cross into a second owner when the behavior contract requires it. Update the implementation plan when the change alters the documented UI contract.

## Canonical widget invariants

- `WIDGET_SCHEMA_VERSION` remains explicit and is incremented deliberately when the canonical state changes incompatibly.
- One `WidgetProject` owns shared normalized data and independent `layouts.small`, `layouts.medium`, and `layouts.large` trees.
- Layouts may show different data density, but they must resolve from the same shared data and bindings.
- Every mutation goes through `applyWidgetOperation`. Do not mutate project state directly from a button, component, or future WebMCP adapter.
- Every operation validates its arguments, requires the current `expectedRevision`, increments the monotonic revision on success, and preserves the newest state on stale failure.
- Design scope is explicit: one size, two selected sizes, or all sizes.
- The browser renderer and Scriptable generator must consume the same canonical element trees.
- Keep the canonical element set constrained to text, dates, images, SF Symbols, groups, spacers, repeats, and solid, gradient, or image backgrounds. The only planned additions are progress rings, progress bars, sparklines, and compact bar charts; add them only in their active phase and through the shared operation path.
- Do not introduce arbitrary user JavaScript, user-supplied drawing commands or paths, general canvas or vector editing, interactive charts, maps, animation, tables, or navigation into the canonical state.

## Verification rules

- Use npm. Never use pnpm.
- Use the runtime declared by `.nvmrc`. In this environment, prefer `/Users/balsimpson/.local/bin/node` with its matching npm; do not assume the system Node version is supported.
- Do not run `npm run typecheck` or `npm test` without asking the user first. The commands are ready, but their permission gate is still open.
- Do not run `npm run build` for small changes. A production build belongs to an explicit release or deployment checkpoint.
- If the user authorizes checks, run them with the supported Node runtime and report the exact commands and outcomes.
- For UI behavior changes, verify the rendered result in the desktop browser view at 1280 x 900 first. If responsive behavior is in scope or the user asks, verify the relevant narrow or mobile viewport afterward. Confirm console errors and page-level overflow when responsive layout is involved.
- A local dev server or browser smoke check does not prove a deployed URL, public repository, WebMCP behavior, Scriptable execution, iPhone behavior, or Devpost state. Report those as separate checkpoints.

## Coding conventions

- Use focused edits with `apply_patch`.
- Prefer named exports in application modules. Keep framework-required default exports only in Nuxt/Vitest configuration entrypoints.
- Use Nuxt UI components where they fit and Tailwind for layout. Use semantic Nuxt UI colors rather than hard-coded palette classes.
- Default every input field and textarea to full width with Tailwind (`w-full`) unless a narrower control is explicitly requested. Check the rendered root component as well as its inner input so shrink-wrapped Nuxt UI controls do not leave a narrow field.
- Keep one clear surface within each task. Avoid nested card stacks; floating sheets and modals are separate surfaces when the UI contract calls for them.
- Do not add fake or generic placeholder copy. Fixture fallbacks are allowed only when they represent a real recovery state in the product contract.
- Keep user-provided reference assets local to browser storage. Never add API secrets, user secrets, or committed `.env` values.
- Do not edit `.nuxt/`, generated Nuxt files, or generated Convex files if those directories are introduced later.

## Phase execution

- Follow the active phase and order in `docs/widgetr-phase-implementation-plan.md`.
- Do not start a later phase incidentally. Update the handoff first when the user deliberately reprioritizes work.
- Do not mark a phase complete because code exists. Its local, deployment, WebMCP, privacy, or real-device gate must pass as specified.
- Do not claim the complete product is done until the product plan's definition of done passes or the implementation plan records explicit release deferrals.

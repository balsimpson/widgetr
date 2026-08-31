# Widgetr agent instructions

## Scope and source of truth

- These instructions apply to `/Users/balsimpson/Documents/Projects/Widgetr`.
- Widgetr is a standalone project. Do not add its runtime, dependencies, or application code to `/Users/balsimpson/Documents/ScriptableEditor`.
- The durable product and architecture contract lives in [`webmcp-scriptable-widget-plan.md`](./webmcp-scriptable-widget-plan.md). It defines what Widgetr is and the rules implementation must preserve. Do not put phase status or dated handoffs there.
- The active phase, task checklists, deployment gates, verification evidence, and exact next action live in [`docs/widgetr-phase-implementation-plan.md`](./docs/widgetr-phase-implementation-plan.md). Update its **Current handoff** after every session that changes implementation or verification state.
- The user-facing product standard lives in [`docs/widgetr-product-principles.md`](./docs/widgetr-product-principles.md). Read it before planning or editing copy, onboarding, UI, UX, visual design, WebMCP handoff, examples, status messages, error states, support guidance, or agent-facing descriptions. Apply its review test as acceptance criteria. Its core rule is to make the easiest next step obvious, especially for beginners.
- The current visual and interaction design contract lives in [`widgetr-design.md`](./widgetr-design.md). Read it when planning or editing the studio shell, canvas, preview sizes, selection, inspector, assistant handoff, responsive behavior, or related copy. Treat it as the design source of truth unless a newer user-approved design explicitly supersedes it.
- Before resuming work, read the implementation plan's **Current handoff** and active phase. Do not re-ask decisions already recorded in the product plan, principles, or active phase.
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

## Status authority

Do not duplicate phase status in this file. The canonical resume state is the **Current handoff** in [`docs/widgetr-phase-implementation-plan.md`](./docs/widgetr-phase-implementation-plan.md). If this file and the implementation plan disagree about status, pause implementation and reconcile the implementation plan against current Git, browser, deployment, and device evidence.

## Resume checklist

When starting a new task in this repository:

1. Read this file, the implementation plan's **Current handoff**, and the active phase.
2. Complete the **Repository identity hard gate** above.
3. Inspect `package.json`, `.nvmrc`, and the relevant files below before editing.
4. Confirm the requested work matches the **Phase execution** rules below.
5. Preserve the **Canonical widget invariants** below.
6. For UI behavior changes, follow the [`Widgetr local browser runbook`](./docs/widgetr-local-browser-runbook.md). Source inspection alone is not visual verification.
7. Report checks that were not run instead of implying they passed.

## Critical implementation areas

- `package.json`, `package-lock.json`, and `.nvmrc`: scripts, dependencies, and supported runtime.
- `app/types/widget.ts` and `app/domain/widget/`: canonical state, validation, operations, values, styles, fixtures, persistence, import, and export behavior.
- `app/components/widget/`, `app/composables/`, and `app/pages/index.vue`: previews, editing UI, project workflow, and WebMCP integration.
- `tests/unit/` and `vitest.config.ts`: unit verification. Inspect the directory rather than relying on a fixed test-file list.

## Canonical widget invariants

- `WIDGET_SCHEMA_VERSION` remains explicit and is incremented deliberately when the canonical state changes incompatibly.
- One `WidgetProject` owns shared normalized data and independent `layouts.small`, `layouts.medium`, and `layouts.large` trees.
- Layouts may show different data density, but they must resolve from the same shared data and bindings.
- Every mutation goes through `applyWidgetOperation`. Do not mutate project state directly from a button, component, or future WebMCP adapter.
- Every operation validates its arguments, requires the current `expectedRevision`, increments the monotonic revision on success, and preserves the newest state on stale failure.
- Design scope is explicit: one size, two selected sizes, or all sizes.
- The browser renderer and Scriptable generator must consume the same canonical element trees.
- Keep the implemented element set constrained to text, dates, images, SF Symbols, groups, spacers, repeats, and solid, gradient, or image backgrounds until the active implementation phase authorizes expansion.
- The product plan authorizes only four planned visual-data additions: progress rings, progress bars, sparklines, and compact bar charts. Implement them only through their active phase and the shared operation path.
- Do not introduce arbitrary user JavaScript, user-supplied drawing commands or paths, general canvas or vector editing, interactive charts, maps, animation, tables, or navigation into the canonical state.

## Verification rules

- Use npm. Never use pnpm.
- Use the supported local runtime, preferably `/Users/balsimpson/.local/bin/node` with its matching npm. The system Node 25 runtime is outside the supported even-LTS range for this project.
- Do not run `npm run typecheck` or `npm test` without asking the user first. The commands are ready, but their permission gate is still open.
- Do not run `npm run build` for small changes. A production build belongs to a deliberate release/deployment checkpoint.
- If the user authorizes checks, run them with the supported Node runtime and report the exact commands and outcomes.
- For UI behavior changes, verify the rendered result in the desktop browser view at 1280 x 900. Keep responsive styles intact and inspect the relevant narrow-width rules without switching to a mobile viewport unless the user explicitly requests it. Confirm console errors and page-level overflow when responsive layout is involved.
- A local dev server or browser smoke check does not prove a deployed URL, public repository, WebMCP behavior, Scriptable execution, or iPhone behavior. Report those as separate checkpoints.

## Coding conventions

- Use focused edits with `apply_patch`.
- Prefer named exports in application modules. Keep framework-required default exports only in Nuxt/Vitest configuration entrypoints.
- Use Nuxt UI components where they fit and Tailwind for layout. Use semantic Nuxt UI colors rather than hard-coded palette classes.
- Default every input field and textarea to full width with Tailwind (`w-full`) unless a narrower control is explicitly requested. Check the rendered root component as well as its inner input so shrink-wrapped Nuxt UI controls do not leave a narrow field.
- Keep one clear surface. Avoid nested card stacks.
- Do not add fake or generic placeholder copy. Fixture fallbacks are allowed only when they represent a real recovery state in the product contract.
- Keep browser-local public references local. Never add API secrets, user secrets, or committed `.env` values.
- Do not edit `.nuxt/`, generated Nuxt files, or generated Convex files if those directories are introduced later.

## Phase execution

- Follow the active phase and order in `docs/widgetr-phase-implementation-plan.md`.
- Do not start a later phase incidentally. Update the handoff first when the user deliberately reprioritizes work.
- Do not mark a phase complete because code exists. Its local, deployment, WebMCP, privacy, or real-device gate must pass as specified.
- Do not claim the complete product is done until the product plan's definition of done passes or the implementation plan records explicit release deferrals.

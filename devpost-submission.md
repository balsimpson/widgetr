# Widgetr

## One-line Summary

Widgetr is a visual, local-first builder for Scriptable widgets where people and AI agents shape the same widget through contextual WebMCP tools.

## Problem

Scriptable makes it possible to create powerful iPhone and iPad widgets, but it expects people to write JavaScript and understand layout APIs. Iterating on a widget with an AI assistant is also awkward: an assistant cannot reliably infer a visual editor's current selection, the active widget size, or which changes should apply across small, medium, and large layouts.

## Solution

Widgetr gives the person and the assistant one shared visual workspace. A person can build and inspect a widget on the canvas while WebMCP exposes the current context as structured tools. The assistant can read the selected element, select another element, make scoped content or typography changes, and run export preflight. Every change uses the same revision-checked operation path as a manual edit, so the preview, history, and generated Scriptable source stay aligned.

## Why This Matters

Widgetr makes the assistant useful at the point where visual design decisions happen. Instead of asking the assistant to guess at a screen or generate a disconnected block of JavaScript, the person chooses context in the editor and the assistant acts on a bounded, typed interface. This is especially useful for responsive widget work, where one change may belong to one layout or to all three.

## How We Used AI

WebMCP is the product interaction layer. In a WebMCP-capable browser, Widgetr registers a contextual tool set through `document.modelContext.registerTool`. Project-level tools let the assistant read context and export a widget. Selecting a text or date element exposes element-specific tools for content, typography, alignment, sizing, and style.

The tools return the current revision and require that revision for writes. This lets the assistant make an intentional scoped change while avoiding a stale overwrite. Widgetr shows the result on the same canvas the person is using, then exports deterministic Scriptable source from the canonical widget state.

## How We Used Codex

Codex was used to build and iterate on Widgetr's Nuxt application, WebMCP adapter, revision-checked widget operations, editor interactions, and the final in-app-browser demo. It also helped verify the deployed app's contextual tool catalog and prepare this entry.

## Key Features

- Independent small, medium, and large widget layouts from one shared project.
- A local-first editor with browser IndexedDB persistence, undo/redo history, and visual selection.
- Context-aware WebMCP tools that change with the current editor selection.
- Revision-checked tool operations routed through the same canonical mutation path as manual edits.
- Deterministic Scriptable `.js` generation and export preflight.
- No required environment variables or user secrets in the generated file.

## Architecture

Widgetr is a Nuxt application with a single canonical `WidgetProject`. It stores shared data and separate layout trees for the three Scriptable sizes. The canvas renderer and Scriptable generator consume that same state.

`useWidgetWebMcp.ts` registers browser tools with `document.modelContext.registerTool`. The contextual WebMCP catalog lives in `app/domain/widget/webmcp.ts`. Every tool mutation runs through `applyWidgetOperation` in `app/domain/widget/operations.ts`, which validates input, checks the expected revision, applies the scoped operation, and advances the revision only on success.

## Testing Instructions

1. Open `https://widgetrmcp.vercel.app/` in ChatGPT's in-app browser.
2. Choose or continue a widget project, then open the Studio.
3. Select a text element. Confirm that Widgetr exposes contextual tools such as `widgetr_get_context`, `widgetr_change_text_content`, and `widgetr_export`.
4. Ask the assistant to read the current context, change selected text across all sizes, and inspect the small, medium, and large previews.
5. Open Export and confirm the generated Scriptable source is available.

No login or credentials are required.

## Public Demo Link

https://widgetrmcp.vercel.app/

## Public Repository Link

https://github.com/balsimpson/widgetr

## Demo Video

TODO: Add the public YouTube URL after upload. It must be under three minutes and include audio.

## Screenshot Shot List

Captured for this submission:

- `public/devpost/widgetr-studio-all-sizes.png`: The All sizes canvas, showing small, medium, and large previews together.
- `public/devpost/widgetr-export-preflight.png`: Export preflight with generated Scriptable source.

Still useful to capture:

1. Widgetr's landing screen, showing the assistant connection path.
2. Studio with the medium widget selected and its contextual inspector open.
3. An assistant-driven text change visible in the canvas and inspector.

## Submission Readiness Notes

Verified today:

- The Devpost account is registered for The WebMCP Challenge, and the event is accepting submissions.
- A Devpost project draft exists at `https://devpost.com/software/widgetr` and is attached to the challenge with status `Draft`.
- `https://widgetrmcp.vercel.app/` opens in ChatGPT's in-app browser and exposes Widgetr's WebMCP tools.
- `https://github.com/balsimpson/widgetr` is public and shows a visible MIT license.
- The local repository guard confirms the Widgetr checkout, origin, and package identity.

Still needed before the final Devpost action:

- The public YouTube URL.
- Confirmed answers for the submitter type, country of residence, app status, learning level, and career-value questions.
- Three to five screenshots or a project thumbnail, if you want a stronger visual project page.
- A final review of the current deployed URL and public repository immediately before submission.

## Known Limitations

- The live editor is intentionally focused on the current widget-authoring flow. Data onboarding and design curation are later phases.
- Widgetr's projects are local to the browser unless the user exports their generated Scriptable file.

## TODO Official Form Fields

Use these exact Devpost fields when the video URL is ready:

| Field | Draft answer |
| --- | --- |
| Submitter Type | `Individual` |
| Country of residence | `India` |
| App Status | `New` |
| Live URL | `https://widgetrmcp.vercel.app/` |
| Testing instructions | Use the Testing Instructions section above. No credentials are needed. |
| Public code repository | `https://github.com/balsimpson/widgetr` |
| Agents or clients tested | ChatGPT's in-app browser. It exposed Widgetr's registered WebMCP tool catalog and was used to run context and widget-edit operations. |
| AI tools leveraged | Codex with WebMCP-capable ChatGPT in-app-browser testing. Codex was used for implementation, debugging, visual iteration, and deployment verification. |
| Learning level | `Significant` |
| Career-value question | `Yes` |
| YouTube video URL | TODO: Add once uploaded. |
| Devpost project draft | `https://devpost.com/software/widgetr` |

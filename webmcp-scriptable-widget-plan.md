# WebMCP Scriptable widget builder

## Approved product and delivery plan

Last updated: 28 August 2026  
Status: Phase 0 complete; Phase 4 implemented locally; real Scriptable and deployed WebMCP verification pending
Working title: Scriptable Widget Builder  
Challenge: [The WebMCP Challenge](https://webmcp.devpost.com/)

> This document describes a new standalone project. It is stored temporarily in the current `ScriptableEditor` repository because that is where the planning work took place. The new product must be created in its own repository. It must not be implemented by adding WebMCP to the current project.

## Current implementation handoff

This section is the resume point for a new chat. The implementation lives in `/Users/balsimpson/Documents/Projects/Widgetr`, not in the reference-only `ScriptableEditor` checkout.

| Area | Status | Evidence or remaining work |
| --- | --- | --- |
| Repository | Public | GitHub remote is [`balsimpson/widgetr`](https://github.com/balsimpson/widgetr), and the completed Phase 3 commit is `0100b5a`; the Phase 4 implementation is now in the working tree. |
| Runtime | Ready locally | Use Node 22.23.1 at `/Users/balsimpson/.local/bin/node` with npm. The system Node 25 runtime is outside Nuxt's supported even-LTS range. |
| Agent handoff | Added | [`AGENTS.md`](./AGENTS.md) contains the repository rules, file map, invariants, verification gates, and resume order. |
| Phase 0 foundation | Complete | Nuxt, npm, Nuxt UI, Tailwind, README, deployment instructions, `.env.example`, `.nvmrc`, strict TypeScript setup, MIT license, public GitHub remote, and Vercel deployment are complete. |
| Phase 1 kernel | Implemented | Canonical schema, constraints, separate layout trees, shared revision-checked operations, fixture, and exact-size browser renderer are implemented. |
| Phase 1 checkpoint | Manually verified | Local browser checks passed for one-size, two-size, all-size, and stale-revision behavior. The 390px responsive check has no page-level horizontal overflow. The deployed URL also rendered all three previews and accepted scoped operations without console errors or horizontal overflow. |
| Automated verification | Passed locally | `npm run typecheck` passes; `npm test` passes with 6 files and 42 tests. Do not run `npm run build` for this phase. |
| Phase 2 export | Implemented locally | Deterministic generator, `config.widgetFamily` branches, preflight diagnostics, Scriptable API runtime harness, and shared viewer/copy/download source are implemented. Real iPhone execution remains. |
| Phase 3 editor | Implemented locally | IndexedDB projects, CRUD and autosave, three previews, structure and inspector editing, session undo/redo, local reference-image persistence, and best-effort Scriptable import are implemented. The local browser checkpoint passed. |
| Phase 4 WebMCP | Implemented locally | Contextual imperative tools for widget, text, image, and group contexts are registered over the shared operation path with revision checks, scope handling, bounded results, confirmation, and an editor status panel. The local 1280×900 and 390×844 browser checkpoint passed; a deployed external-agent run remains. |
| Visual design | Deferred | The current page is a functional kernel harness. Do the intentional design pass later, after the state and export work is stable. |

### Resume order

1. Verify the generated file in real Scriptable on an iPhone, including small, medium, and large widget families.
2. Run the deployed external-agent WebMCP checkpoint: create, select, change context, edit, and export through the production URL.
3. Keep later data, admin, and visual-polish work behind the phase checkpoints below.

The current implementation is concentrated in `app/types/widget.ts`, `app/domain/widget/`, `app/components/widget/`, `app/composables/`, `app/pages/index.vue`, and `tests/unit/`.

## 1. Product summary

Scriptable lets people build powerful iPhone widgets, but it expects them to understand JavaScript and Scriptable's widget APIs. Even developers can struggle to make a widget that fits three sizes, displays data clearly, and looks intentional.

This product gives a person and an external WebMCP agent a shared visual editor for creating a Scriptable widget. The person can describe what they want, supply an API or data sample, paste an existing Scriptable widget, or add a local reference image. The agent works through contextual tools that reflect the live editor selection. Both the person and the agent edit the same canonical widget state.

The result is one standalone Scriptable `.js` file. It handles small, medium, and large widget sizes, retrieves data on the iPhone, stores secrets in Scriptable's encrypted Keychain, and continues to behave sensibly when an API is unavailable.

Visual quality is part of the MVP. A small authenticated admin area lets the project owner upload good widget references, ask a vision model to analyze them, review generated test widgets, correct them directly, and approve them. Public generation uses these approved style families when a user has not supplied a reference image.

## 2. Product promise

A nontechnical user should be able to move through this sequence without seeing JSON or writing JavaScript:

1. Explain the widget they want.
2. Explain the data, provide an API URL, or say they do not know which API to use.
3. See small, medium, and large previews.
4. Ask an external agent for changes or adjust supported properties manually.
5. Resolve clear data or layout warnings.
6. Copy or download one standalone Scriptable file.
7. Run it on an iPhone without needing the website afterward.

The product must be honest about limitations. A best-effort import or visual recreation may be useful even when it is incomplete, but the interface must say what it could reproduce, what it could not reproduce, and what the user can do next.

## 3. Non-negotiable rules

- This is a new standalone Nuxt application.
- Use Nuxt UI components where they fit and Tailwind CSS for layout and styling.
- Keep the editor on one clear surface. Avoid cards nested inside cards.
- End users do not need accounts.
- One local project equals one widget and one exported script.
- End-user projects stay in the browser through IndexedDB.
- Data configuration is shared by all widget sizes.
- Small, medium, and large layouts can differ and can show different amounts of the shared data.
- The visual editor and WebMCP tools operate on the same canonical state and the same operations.
- The agent cannot maintain a second hidden representation of the widget.
- The website never asks for or stores end-user API secrets.
- Public reference images remain local and never enter the admin design library.
- Export is deterministic. The language model changes structured widget state; it does not improvise the final Scriptable source.
- The exported script works without the website.
- Keep the MVP small. Do not add a built-in public chat, full canvas editor, public template gallery, or cloud project sync.

## 4. Why WebMCP matters

This should not behave like a remote API pasted onto an editor. WebMCP should let the external agent understand what the person is doing in the live interface.

When nothing is selected, the agent can operate on the widget as a whole. When text, an image, or a group is selected, the available tools change to match that selection. A manual change is visible to the agent immediately because the interface and tools read the same state.

This directly supports the challenge's central idea: a person can make visual judgments while an agent handles structured transformation, data mapping, and repetitive changes inside the same application.

The implementation should follow the current [WebMCP specification](https://webmachinelearning.github.io/webmcp/) and be tested using the environment described by the challenge, including ChatGPT's in-app browser or Chrome with WebMCP testing enabled.

## 5. Audience

### Primary user

An iPhone and Scriptable user who knows the outcome they want but may not know JavaScript, Scriptable's APIs, or which data service to use.

Examples include someone who wants:

- A compact weather summary
- Flight status and departure information
- A sports score or fixture list
- A personal countdown
- Market or portfolio figures
- A calendar or task summary
- A cleaner version of an existing Scriptable widget

### Secondary user

A JavaScript user who can already write Scriptable code but wants a faster way to create polished layouts, compare all sizes, and export a clean standalone script.

### Administrator

The project owner. The administrator curates a small visual reference library and approves every style family before public generation can use it.

## 6. System boundaries

```text
Standalone Nuxt application
├── Public local-first widget builder
│   ├── Project list and IndexedDB persistence
│   ├── Natural-language, API, code, and image starting inputs
│   ├── Small, medium, and large previews
│   ├── Shared inspector and structured operations
│   ├── Contextual WebMCP tool registration
│   └── Deterministic Scriptable export
│
├── Private design-curation admin
│   ├── Auth0 sign-in
│   ├── Convex file storage and reference records
│   ├── OpenAI or OpenRouter vision analysis
│   ├── Three-size test-widget review
│   └── Approval and publication
│
└── Exported Scriptable file
    ├── Runs independently on the iPhone
    ├── Chooses layout from config.widgetFamily
    ├── Retrieves live data
    ├── Stores secrets in Keychain
    └── Uses cache, sample, and error states
```

Convex is the canonical backend only for the private design library. It is not the canonical store for public users' widget projects.

## 7. Canonical widget state

The application has one canonical project representation. The editor, preview renderer, persistence layer, WebMCP tools, admin test widgets, and generator all use it.

The conceptual state contains:

| Area | Required information |
| --- | --- |
| Project | Local identifier, name, created time, updated time, schema version |
| Concurrency | Monotonic revision number used to reject stale operations |
| Data source | Source type, public URL if supplied, method, public parameters, non-secret headers, refresh policy, and named secret placeholders without secret values |
| Data | Normalized sample, pasted, cached, or live data used by all sizes |
| Bindings | Stable mappings between normalized data fields and widget elements |
| Layouts | Separate canonical element trees for small, medium, and large widgets |
| Selection | Active size and selected element or group identifier |
| Design scope | One size, a chosen set of sizes, or all sizes |
| Style provenance | Approved style identifier, friendly name, approved version, and copied recipe snapshot |
| Local reference | Optional image blob and local metadata stored only in IndexedDB |
| Import report | What an imported script or image could and could not reproduce |
| Diagnostics | Blocking errors, warnings, fallback state, and suggested recovery actions |

### Data and design stay separate

All three sizes read from one normalized data model. Each size owns its layout and decides which bindings to display. A small widget can show a headline value, a medium widget can add context, and a large widget can show a fuller list without copying or reconfiguring the data source.

Changing the API or pasted data refreshes all sizes. Changing a layout does not change the data source.

### Supported widget elements

The initial element set is deliberately close to what Scriptable can render reliably:

- Text
- Dates and times
- Images loaded from data or a URL
- SF Symbols
- Horizontal and vertical groups
- Spacers
- Repeat groups for lists, with a separate item limit per size
- Solid, gradient, or image backgrounds

Supported visual properties include typography, color, opacity, alignment, padding, spacing, ordering, direction, borders, corner radius, image fit, image crop, and background treatment.

The MVP does not include arbitrary canvas drawing, animation, charts, maps, table interfaces, app-like navigation, or arbitrary user JavaScript inside the visual state.

## 8. One operation path

Every change passes through a shared operation layer. A button, form control, keyboard action, or WebMCP tool calls the same operation. The operation validates its arguments, checks the expected revision, updates state, increments the revision, and returns a concise result.

An operation result should state:

- Whether the change succeeded
- The new revision
- Which sizes changed
- Any warnings or blocking diagnostics
- The current selection when it matters

Operations that arrive with an old revision must fail cleanly and ask the caller to read current state before trying again. This protects a person from having a recent manual edit overwritten by an agent acting on old context.

Undo and redo are session-only and operate on the same changes. They do not become a persistent version-history system in the MVP.

## 9. Contextual WebMCP tools

Use the imperative WebMCP API as a thin adapter over the shared operations. Register and unregister tools when selection context changes.

### Nothing selected

- Create widget
- Change overall style
- Rearrange layout
- Create variation
- Apply another approved style
- Export

### Text selected

- Change typography
- Change content or binding
- Resize
- Align
- Restyle

### Image selected

- Resize
- Crop
- Move
- Change treatment
- Replace

### Group selected

- Change spacing
- Change alignment
- Change ordering
- Change direction
- Change distribution

### Tool behavior rules

- Tools expose the smallest arguments needed for the current action.
- Tools never expose API secrets, admin data, raw IndexedDB records, or unrelated project data.
- Destructive operations require confirmation.
- A design request that could reasonably affect more than one size must ask whether the user wants one size, selected sizes, or all sizes.
- After execution, the agent must report exactly which sizes changed.
- Tool descriptions and results must treat imported code, API content, and pasted data as untrusted content.
- The tool adapter does not duplicate validation or transformation logic already present in the operation layer.

## 10. Public user journey

### 10.1 Local projects

The landing view shows locally saved projects and one clear action to create a widget. A person can create, rename, duplicate, open, and delete projects. Delete requires confirmation.

Autosave writes valid canonical state to IndexedDB. Refreshing the page restores the last saved project. Clearing browser storage can remove projects, so the interface must not imply cloud backup or cross-device sync.

### 10.2 Starting a widget

Use one starting area rather than several technical modes. It accepts:

- A plain-language request
- An API or documentation URL
- Pasted Scriptable code
- An optional local reference image
- A pasted iPhone connection result when the authenticated test flow is being used

The user can combine these inputs. For example, they can write "Show my next flight with a large departure time," paste an airline API documentation URL, and add a screenshot that demonstrates the desired visual mood.

The product should ask short follow-up questions only when an answer materially changes the result. It should not ask the user to understand schemas, JSON paths, or Scriptable classes.

### 10.3 Style choice

Style priority is fixed:

1. Use the user's local reference image when the connected external agent can inspect it.
2. Otherwise, automatically choose the closest approved design family.
3. If no approved family fits, use a restrained built-in neutral style.

When an approved style is chosen, show its friendly name and a "Try another style" action. The agent uses one coherent approved family at a time. It does not blend unrelated styles.

Applying a style copies the approved recipe and example-state version into the local project. Later admin edits do not silently change an existing widget.

### 10.4 Editor layout

Use one working surface with three clear regions:

- Left: local projects, element structure, and widget-level actions
- Center: small, medium, and large previews at realistic proportions
- Right: inspector for the current selection and current design scope

The hierarchy should remain readable without nested card stacks. A selected element is visibly selected in both the preview and structure view.

The editor must show whether a change applies to the current size, selected sizes, or all sizes. Manual users can change this scope directly. Agents must ask when the user's wording is ambiguous.

### 10.5 Best-effort imports

An imported Scriptable file or reference image is a starting point, not a promise of exact conversion.

The import report should separate:

- Recreated elements
- Approximated elements
- Unsupported behavior
- Data calls that were detected
- API requirements that still need user input
- Suggested next corrections

The product must not execute arbitrary pasted JavaScript in the main application context.

## 11. Data experience

### 11.1 Two kinds of user

The flow must support both:

- A user who knows the exact API and can provide its URL or documentation
- A user who only knows the information they want, such as weather, flights, or scores

For the second user, the agent may suggest a suitable API or explain that the information requires a paid service, authentication, or a source the product cannot access. It must not invent a live integration.

### 11.2 No JSON-first interface

JSON may exist inside requests, responses, and generated code, but the user interface should present:

- Detected field names in plain language
- A small table or list of sample values
- Friendly binding choices such as "departure time" or "current temperature"
- A connection summary and clear errors

The authenticated iPhone result can be pasted into one purpose-built field. The app parses it internally and shows the detected data structure without requiring the user to edit raw JSON.

### 11.3 Browser and Scriptable behave differently

A public API may work in Scriptable but fail in the browser because of CORS. The product must distinguish:

- The API rejected the request
- The browser blocked the request
- Authentication is missing
- The response shape changed
- Scriptable is likely to work even though browser preview cannot fetch it

When browser access fails, use provided sample data, a safe pasted result, or bundled mock data to keep the preview usable. Label the source of preview data.

### 11.4 Authenticated API test on iPhone

The website never collects a secret. Instead, it generates a temporary test version of the same Scriptable file the user will later install.

The flow is:

1. The website generates temporary test code for the chosen API.
2. The user copies it into one Scriptable script on the iPhone.
3. The script asks for the secret and stores it in Scriptable Keychain.
4. The script calls the real API and copies a safe connection result.
5. The user pastes that result into the website.
6. The website detects fields and configures bindings.
7. The final export replaces the temporary code in the same Scriptable script and reuses the Keychain entry.

Keep this as copy and paste in the MVP. Do not add QR pairing, temporary relay servers, file handoff, or device linking.

### 11.5 Runtime fallback order

The exported widget uses this order:

1. Current live response
2. Last-good cached response
3. Clearly labelled sample data, when sample display is appropriate
4. A compact error state that explains the failed requirement

An error state should tell the user what to fix, such as adding an API key, correcting a parameter, checking an identifier, or running the test script again.

## 12. Deterministic preview and export

The preview renderer and Scriptable generator consume the same canonical element trees. The renderer may use browser components, but it must respect the same supported layout rules as the generator.

The language model never writes the final script as free-form code. It calls operations that change canonical state. A deterministic generator then emits the Scriptable file from that state.

The one exported file contains:

- Data-source configuration without secret values
- Secret names and Keychain setup
- Request and response normalization
- Last-good cache behavior
- Sample and error states
- Small, medium, and large layout functions
- Runtime selection through `config.widgetFamily`
- Refresh settings
- Any required image loading and safe fallbacks

Before export, a preflight check separates blockers from warnings. Blockers prevent export. Warnings allow export but remain visible.

The read-only code viewer, Copy action, and downloaded `.js` file must use the exact same generated string. The user cannot edit code in the MVP.

## 13. Admin design-curation system

### 13.1 Purpose

The admin system exists to make public output visually better. It is not a template marketplace, general asset manager, or model-training platform.

"Learning" means human-reviewed retrieval. A model drafts an analysis and test widgets. The administrator corrects the concrete results. Approved recipes and example states become references for later generation. The base model is not automatically retrained.

### 13.2 Access

- Auth0 protects `/admin`.
- Convex independently verifies the authenticated identity and administrator authorization for every protected query, mutation, action, upload, edit, and approval.
- The authorization rule uses a stable Auth0 subject identifier.
- Public users do not receive admin credentials and do not need Auth0 accounts.

### 13.3 Reference lifecycle

Use four visible statuses:

- Analyzing
- Ready for review
- Approved
- Failed

The administrator can:

1. Upload one permitted reference image.
2. Optionally record its source.
3. Wait for analysis.
4. Review the original beside three generated widget previews.
5. Correct the generated states with the same inspector used by the public editor.
6. Correct the style name, source size, content type, and density.
7. Approve only after all three sizes render without blockers.

Editing an approved record creates a draft revision. The public catalog keeps serving the last approved version until the revision is approved.

### 13.4 AI analysis contract

The configured vision model receives the reference image and a strict description of the supported widget state. It returns a validated analysis containing:

- Inferred source size
- Friendly style name
- Content-type and density tags
- Primary and secondary hierarchy
- Spacing and alignment rules
- Typography relationships
- Palette roles and contrast guidance
- Image treatment
- Layout guidance for each size
- Features that Scriptable cannot reproduce
- Confidence and uncertainty notes
- Shared mock data
- Canonical small, medium, and large example states

All three examples use the same mock data. The source-size example acts as the anchor. The other sizes adapt the hierarchy and amount of visible data.

The backend rejects missing sizes, unsupported elements, invalid values, malformed analysis, and unrenderable state. Invalid output becomes a clear Failed record and never reaches the public catalog.

### 13.5 Corrections and approval

Correction is direct and visual. There is no conversational admin correction flow in the MVP.

The corrected canonical states are the approved truth. Measurable rules such as spacing, type sizes, colors, alignment, and density are derived from those states. The administrator does not have to maintain a separate essay about the design.

Approval publishes:

- A friendly style identity
- Matching tags
- The approved design recipe
- Approved canonical examples for all three sizes
- A version used for project snapshots

### 13.6 Provider configuration

Use exactly one configured provider per deployment. Server environment settings choose the API base URL, key, and vision-capable model. There is no provider selector in the admin UI.

The analysis boundary normalizes output so the deployment can use OpenAI directly or OpenRouter's OpenAI-compatible API. It must not assume that every provider endpoint or model supports the same features. The selected path must be verified for image input and structured output. Model and prompt versions are stored with each analysis for diagnosis and repeatability.

Provider keys remain in server configuration. They never reach the browser or the generated Scriptable file.

### 13.7 Convex records

Convex stores:

- Private source-image storage identifier
- Optional source attribution
- Status and error information
- Administrator identity
- Provider, model, and prompt version
- Draft analysis
- Current editable three-size state
- Approved recipe and example snapshot
- Approval and update timestamps

The public builder can read only approved style identifiers, friendly names, tags, recipes, versions, and example states. It cannot read source images, drafts, prompts, errors, or administrator details.

### 13.8 Reference rights

The administrator should upload images they own or have permission to analyze. Source attribution should be recorded when available. The design library extracts general visual rules and must not reproduce third-party branding, logos, or distinctive assets without permission.

## 14. Approved-style matching

Do not add embeddings or vector search in the MVP. The approved catalog will be small enough for structured matching.

Each style has tags for:

- Content type
- Density
- Visual emphasis such as headline metric, image, list, or schedule
- Light, dark, or adaptable palette
- Suitable data shape

When no user image is available, the agent compares the user's goal and normalized data shape with the approved catalog. It selects one coherent style, tells the user which friendly style it chose, and applies constrained adaptation.

Constrained adaptation preserves:

- Typography relationships
- Color roles
- Spacing rhythm
- Hierarchy
- Density limits
- Layout patterns

It adapts labels, values, element count, and content bindings to the user's data. It does not force weather-specific content into a flight widget or squeeze a large layout into a small widget.

"Try another style" keeps the data configuration and replaces the style snapshot and derived layouts.

## 15. Privacy and security boundaries

### Public builder

- No account is required.
- Widget projects and user reference images stay in IndexedDB.
- Public reference images are displayed locally for a vision-capable external agent.
- Public images are not uploaded to Convex, sent to the admin AI provider, or added to the design catalog.
- If the external agent cannot inspect an image, the product says so and falls back to a description or approved style.
- The browser never asks for an API secret.
- WebMCP tools return only the state needed for the current operation.

### Admin

- Auth0 route protection is backed by independent Convex authorization.
- Source images and drafts are private.
- Only approved distilled styles and canonical examples are public.
- AI credentials live only in server environment variables.
- Upload type and size are validated before analysis.
- Untrusted image metadata and model output never become tool instructions.

### Exported script

- Secrets are requested and stored only on the iPhone through Scriptable Keychain.
- Error messages must not print secret values.
- Cached responses should contain only the data needed by the widget.

## 16. Error and recovery design

| Situation | What the user sees | Recovery |
| --- | --- | --- |
| API is unknown | The agent cannot confirm a compatible source | Provide documentation, choose a suggested source, or use sample data |
| Browser CORS block | Preview cannot fetch this API in the browser; Scriptable may still work | Run the iPhone test or provide a safe sample |
| Authentication required | The API needs a secret that the website will not collect | Generate and run the temporary iPhone test script |
| Invalid parameter or identifier | Name the failing field without exposing secrets | Edit the parameter and retry |
| Response shape changed | Show which expected fields are missing | Paste a new test result and remap fields |
| Public image cannot be inspected | The connected agent lacks image vision | Describe the style or use an approved style |
| Script import is partial | Show recreated, approximated, and unsupported parts | Continue from the useful starting state |
| AI reference analysis fails | Admin record shows the provider or validation failure | Retry analysis or remove the draft |
| AI returns unsupported state | Admin record stays unapproved with exact validation errors | Retry with the same image or correct supported metadata |
| Widget layout clips | Mark the affected size and elements | Correct that size before export or approval |
| Live API fails on iPhone | Widget uses cache, then labelled sample data or a compact error | Follow the displayed fix and rerun |
| Export preflight blocker | No download is produced | Fix the named blocker and run preflight again |

Errors must preserve the user's work. A failed fetch, analysis, import, or export must not replace the last valid project or last approved style.

## 17. Visual quality gate

Every admin reference family must pass a manual review before approval:

- No clipped or overlapping content
- Readable typography at realistic iPhone widget dimensions
- Clear primary and secondary information
- Deliberate spacing and alignment
- Suitable contrast
- Data density appropriate to each size
- A small widget that does not inherit all large-widget details
- A coherent family resemblance across small, medium, and large
- No unsupported effect disguised by the browser preview

A generated public widget must pass automated layout constraints before export. The user still makes the final visual judgment in the three previews.

## 18. Implementation sequence

Implementation should be incremental. Each phase ends with a working checkpoint before the next phase begins.

### Phase 0: Create the standalone project

Status: Complete as of 28 August 2026. The local application foundation, MIT license, public remote, and Vercel deployment are complete. The production URL is [`widgetrmcp.vercel.app`](https://widgetrmcp.vercel.app/).

Deliverables:

- [x] New repository, separate from the current `ScriptableEditor` repository
- [x] Nuxt application using npm
- [x] Nuxt UI and Tailwind setup
- [x] Public open-source license
- [x] Basic README with local setup and deployment instructions
- [x] Environment-variable contract with no committed keys
- [x] One early deployment that can be opened in the challenge test browser

Checkpoint:

- [x] The blank application runs locally.
- [x] The application runs from its deployed URL.
- [x] The repository is public and the license is visible from the public remote.
- [x] Only deliberately selected ideas or code are carried over, and the new application has no runtime dependency on the current repository.

### Phase 1: Canonical state and rendering kernel

Status: Implemented as of 28 August 2026. The local browser checkpoint, strict typecheck, and unit-test suite pass.

Deliverables:

- [x] Versioned canonical project schema
- [x] Separate small, medium, and large layout trees over shared data
- [x] Supported element and style constraints
- [x] Shared operations with revision checks
- [x] Browser preview renderer at realistic proportions
- [x] Design-scope behavior for one, several, or all sizes
- [x] A fixed sample widget demonstrating all supported elements

Checkpoint:

- [x] The same sample data renders three intentionally different layouts.
- [x] Manual operations update only the requested sizes.
- [x] A stale revision is rejected without losing the newest state.

### Phase 2: Deterministic Scriptable generator

Status: Implemented locally as of 28 August 2026. The generator uses the same canonical element trees as the browser renderer; real Scriptable execution is still pending.

Deliverables:

- [x] State-to-Scriptable generator
- [x] One-file size branching through `config.widgetFamily`
- [x] Text, image, symbol, group, spacer, repeat, and background generation
- [x] Shared data bindings
- [x] Preflight blockers and warnings
- [x] Identical viewer, copy, and download output

Checkpoint:

- [x] A fixed canonical project generates stable source.
- [x] The generated file parses as JavaScript and runs through the local Scriptable API harness.
- [ ] The same file previews small, medium, and large widgets in real Scriptable.

### Phase 3: Public local-first editor

Status: Implemented locally as of 28 August 2026. The local browser checkpoint passed for project persistence, shared selection, direct editing, undo/redo, local reference-image persistence, and import reporting.

Deliverables:

- [x] Local project list
- [x] Create, rename, duplicate, delete, and autosave
- [x] IndexedDB persistence
- [x] Three-preview editor layout
- [x] Structure view, selection, and inspector
- [x] Session-only undo and redo
- [x] Local reference-image storage and display
- [x] Best-effort Scriptable import with an import report

Checkpoint:

- [x] Refresh restores a project and its local reference image; the browser restored `sample-monsoon.svg` at `1200 × 900`.
- [x] Selecting an element in the preview and structure view identifies the same element.
- [x] Direct edits persist and produce matching generated code; the browser verified a font-size edit, undo, redo, and refresh persistence.
- [x] Desktop and mobile browser checks pass without page-level horizontal overflow or console warnings/errors.

### Phase 4: WebMCP vertical slice

Status: Implemented locally as of 28 August 2026. The local browser checkpoint passed. Deployed external-agent verification remains.

Deliverables:

- Imperative WebMCP adapter over shared operations
- Dynamic tool registration for widget, text, image, and group contexts
- Revision-aware execution
- Design-scope clarification and result reporting
- Destructive confirmation
- Tool input and output limits

Checkpoint:

- A deployed external agent can create a widget, select an element, observe the tool set change, alter it, and see the same state update in the interface.
- A manual change made between agent calls is preserved.
- The agent can export through the same preflight and generator used by the UI.

### Phase 5: Data onboarding and iPhone diagnostics

Deliverables:

- One plain-language starting area
- API and documentation URL input
- Friendly field detection and bindings
- Browser CORS distinction
- Sample and mock-data support
- Temporary iPhone test-script generation
- Safe connection-result paste flow
- Keychain configuration in final export
- Live, cache, sample, and error runtime states

Checkpoint:

- Test one open public API, one authenticated API, one browser-blocked API, and one invalid response.
- No secret enters browser state, logs, Convex, or generated sample fixtures.
- The exported authenticated widget reuses the Keychain value created by the test script.

### Phase 6: Admin design curation

Deliverables:

- Auth0-protected admin route
- Independent Convex admin authorization
- Single-image upload and private storage
- Configured vision-model action
- Validated design analysis
- Three generated canonical test widgets
- Shared direct editor controls
- Approval gate and approved public query
- Draft revision behavior

Checkpoint:

- An unauthorized caller cannot list, upload, edit, analyze, or approve references.
- A valid upload reaches Ready for review.
- Invalid model output remains Failed and private.
- Correcting all three layouts and approving publishes one readable style family.
- Editing it later does not change the last approved public version.

### Phase 7: Approved-style integration

Deliverables:

- Structured style matching without embeddings
- Automatic but visible style selection
- Constrained adaptation
- Style provenance snapshot in local projects
- "Try another style" without replacing data configuration
- Neutral fallback style

Checkpoint:

- A user with no reference image receives an approved style.
- The chosen style name is visible.
- Small, medium, and large layouts reflect the approved family while showing suitable amounts of the user's data.
- An existing local project does not change when the admin publishes a new style revision.

### Phase 8: Hardening and submission

Deliverables:

- Accessibility and keyboard review
- Visual checks at all three sizes
- Live WebMCP browser testing
- Actual iPhone Scriptable tests
- Security and privacy review
- Production deployment
- Public repository cleanup and setup instructions
- Demo video, screenshots, and Devpost copy

Checkpoint:

- The full definition of done passes on the deployed URL.
- A fresh judge can open the public builder without an account.
- The public repository contains everything needed to run the project and no secrets.
- The demo stays under three minutes and clearly shows WebMCP changing live editor state.

## 19. Verification plan

### State and operations

- Validate every operation against the canonical schema.
- Verify revision increments and stale-operation rejection.
- Verify one-size, multi-size, and all-size design scopes.
- Verify undo and redo across manual and WebMCP operations.
- Verify data changes update all previews without overwriting layouts.

### Rendering and export

- Use fixed canonical fixtures for small, medium, and large rendering.
- Compare browser previews at exact target proportions.
- Confirm no unsupported browser-only styling reaches export.
- Verify deterministic source for the same state.
- Verify copied, viewed, and downloaded source is byte-for-byte identical.
- Run representative files in Scriptable on an iPhone.

### WebMCP

- Test tool discovery in ChatGPT's in-app browser.
- Test Chrome with WebMCP testing enabled.
- Test registration changes as selection changes.
- Test cancellation, invalid inputs, stale revisions, and destructive confirmation.
- Confirm tool results are concise and do not disclose private state.

### Data

- Test a working public JSON API without showing raw JSON to the user.
- Test a CORS-blocked API.
- Test an authenticated API through the iPhone copy-and-paste flow.
- Test missing fields, changed response shape, timeout, rate limit, and offline behavior.
- Test live, cache, sample, and error rendering.

### Admin

- Test Auth0 loading, signed-out, signed-in non-admin, and authorized admin states.
- Test upload validation and private file access.
- Test model timeout, malformed response, unsupported elements, and partial output.
- Test correction through shared operations.
- Test approval only when all three sizes pass.
- Test approved revision stability.

### Privacy

- Confirm public images never leave IndexedDB.
- Confirm end-user API secrets never enter website storage or network requests.
- Confirm public style queries omit private images, prompts, drafts, and admin identity.
- Confirm exported diagnostics never print secret values.

## 20. Definition of done

The MVP is complete only when all of these statements are true:

- A visitor can create and save multiple local widget projects without signing in.
- One project produces one standalone Scriptable file.
- Natural language, an API URL, existing Scriptable code, or a local image can provide a useful starting point.
- Users never need to understand JSON to bind data.
- The agent automatically uses an approved style when no local image is present.
- The chosen style is visible and can be replaced.
- The editor shows three synchronized data previews with independent layouts.
- Manual edits and WebMCP calls use the same canonical state and operations.
- Contextual tools change with the live selection.
- Ambiguous design changes ask which sizes to affect.
- Authenticated APIs keep credentials on the iPhone in Keychain.
- Runtime failure produces cache, labelled sample data, or a clear recovery message.
- The final code viewer, copy action, and download are identical.
- The downloaded file runs independently in Scriptable.
- The administrator can upload, analyze, correct, and approve one complete three-size design family.
- Only approved design knowledge reaches the public builder.
- Public reference images and projects remain local.
- The deployed application works in a challenge-supported WebMCP browser.
- The public repository, license, instructions, and demo satisfy the challenge submission requirements.

## 21. Suggested challenge schedule

The official deadline is 3 September 2026 at 1:00 PM PDT. If implementation begins on 27 August, use this sequence:

| Date | Target |
| --- | --- |
| 27 Aug | Create new repository, deploy the shell, finalize state contract |
| 28 Aug | Canonical renderer and deterministic generator vertical slice |
| 29 Aug | Local editor and working contextual WebMCP tools |
| 30 Aug | API onboarding, export, and first iPhone test |
| 31 Aug | Auth0, Convex, reference upload, and AI analysis |
| 1 Sep | Admin correction, approval, and public style matching |
| 2 Sep | Full deployed testing, iPhone recording, README, license, and demo edit |
| 3 Sep | Submission buffer only; avoid adding features |

If the schedule slips, reduce polish and the number of supported API examples. Do not cut the canonical-state rule, contextual WebMCP behavior, three-size export, secret boundary, or one working approved design family. Those prove the product.

## 22. Demo storyboard

Target length: about 2 minutes 40 seconds, leaving room below the three-minute limit.

### 0:00 to 0:20: Problem

Show that Scriptable widgets normally require JavaScript and careful layout work. State that the product lets a person and agent build one together.

### 0:20 to 0:55: Start from intent and data

Describe a real widget and provide a safe data source. Show the app automatically apply an approved style and display its friendly name.

### 0:55 to 1:35: Prove live WebMCP context

Show widget-level tools with nothing selected. Select text and show the tool set change. Ask the agent to change typography for all sizes or one named size. Make a manual correction and show that the next agent action sees it.

### 1:35 to 2:05: Three-size design

Show small, medium, and large previews using the same data with increasing detail. Use "Try another style" or make one targeted layout correction.

### 2:05 to 2:30: Export and iPhone

Run preflight, show identical Copy and Download output, then show the exported file rendering in Scriptable on an iPhone.

### 2:30 to 2:40: Design provenance

Briefly show the admin's approved reference with its three reviewed test widgets. Explain that public generation receives only human-approved design recipes.

Avoid waiting for a live AI analysis during the demo. Use an already approved reference and show the analysis workflow through a quick cut if needed.

## 23. Devpost submission checklist

According to the current [challenge page](https://webmcp.devpost.com/), prepare:

- A working live URL accessible in ChatGPT's in-app browser or Chrome with WebMCP enabled
- A text description explaining why the use case fits WebMCP
- A description of how the experience improves when a person and agent work together
- A brief implementation explanation
- A public YouTube demo with audio that is under three minutes
- A public code repository containing all source, assets, and setup instructions
- A visible open-source license

The public builder should require no judge credentials. The private admin can remain restricted because the demo only needs to prove its curation role.

## 24. Main risks and controls

| Risk | Control |
| --- | --- |
| Generated widgets are functional but ugly | Require approved visual families, constrained adaptation, exact-size previews, and manual quality gates |
| AI analysis is inconsistent | Pin model and prompt versions, validate structured output, and require human approval |
| A small reference is stretched into larger sizes | Generate and approve a complete three-size family with shared data and separate layouts |
| WebMCP acts on stale state | Require expected revisions and reject stale operations |
| WebMCP feels decorative | Demonstrate dynamic tool availability and shared manual-agent state in the core journey |
| Arbitrary APIs create confusing failures | Distinguish CORS, authentication, bad parameters, changed schemas, and runtime failures |
| Users distrust secret handling | Never collect secrets on the site; use iPhone Keychain and a local test script |
| Public image handling raises privacy concerns | Keep public reference images local and never reuse them for the catalog |
| Source references create rights concerns | Upload permitted references, record sources, and extract general rules rather than branded assets |
| Admin scope consumes the hackathon | Keep one-image upload, direct correction, four statuses, and no chat, batches, embeddings, or model selector |
| Browser preview differs from Scriptable | Restrict the state to supported features and test exported files on a real iPhone |
| The draft WebMCP API changes | Pin the tested browser environment and verify the deployed build early and again before submission |

## 25. Explicitly outside the MVP

- Adding WebMCP to the current `ScriptableEditor` project
- End-user accounts
- Cloud project synchronization or backups
- Built-in public chat or bundled public model
- A full drag-and-drop canvas
- A public template or style gallery
- Public server-side reference-image analysis
- Uploading public images into the admin catalog
- Fine-tuning, embeddings, vector search, or automatic model training
- Batch admin upload
- Conversational admin correction
- Multiple administrator roles
- Website collection, storage, or proxying of end-user API secrets
- Editable generated code
- Multiple files per exported widget
- Lock Screen widget families
- iPad-specific families
- Charts, maps, animation, custom canvas drawing, or arbitrary visual JavaScript
- QR codes, relay servers, or automatic desktop-to-iPhone pairing

## 26. Later phases

After the hackathon MVP proves the shared-state and design-quality approach, later work may add:

- An optional built-in chat using the same operation layer as WebMCP
- A visual canvas with direct manipulation
- User-facing templates and style browsing
- More widget families and device sizes
- Optional accounts and cloud synchronization
- A larger curated catalog with similarity search once enough references exist to justify it
- More advanced data-source assistance
- Explicit-consent public image analysis for agents without vision
- Import support for a wider range of existing Scriptable code

None of these should change the canonical-state rule or create a second agent-only representation.

## 27. Locked decision record

| Topic | Approved decision |
| --- | --- |
| Project boundary | New standalone project; current repository holds this plan temporarily |
| Frontend | Nuxt with Nuxt UI and Tailwind |
| Initial AI experience | External WebMCP agent first; built-in chat later |
| End-user identity | No accounts in the MVP |
| Persistence | IndexedDB, local projects, autosave, session undo and redo |
| Project model | One project equals one widget |
| Output | One standalone Scriptable `.js` file |
| Code access | Read-only viewer plus identical Copy and Download actions |
| State | One canonical representation shared by the UI, WebMCP, preview, admin examples, and generator |
| Widget sizes | Shared data with independent small, medium, and large layouts |
| Design scope | One, several, or all sizes; agent asks when ambiguous |
| Data UI | Plain language and friendly fields, not JSON-first |
| APIs | Any conventional HTTP API on a best-effort basis with honest compatibility reporting |
| Secrets | Never stored by the website; Scriptable Keychain on the iPhone |
| Authenticated test | Temporary custom Scriptable test code and simple copy and paste |
| Failure order | Live response, last-good cache, labelled sample, clear error |
| Import | Best-effort code or image starting point with a clear import report |
| Public images | Local only; never sent to Convex or the admin AI |
| Admin | Stripped-down Auth0 and Convex reference-curation area is part of the MVP |
| Reference analysis | Vision model drafts structured rules and three test widgets |
| Admin correction | Direct visual correction through shared editor operations |
| Approval | All three sizes must pass before one style family is published |
| Style selection | Automatic but visible, with "Try another style" |
| Style application | Constrained adaptation rather than exact filling or loose inspiration |
| Learning | Human-reviewed retrieval, not automatic training |
| Public catalog | Approved recipe and canonical examples only; no source images or drafts |
| Provider | One server-configured OpenAI or OpenRouter provider; no admin model picker |
| Generator | Deterministic state-to-Scriptable generation, not free-form model code |

## 28. Reference links

- [The WebMCP Challenge](https://webmcp.devpost.com/)
- [WebMCP specification](https://webmachinelearning.github.io/webmcp/)
- [Chrome WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp)
- [Convex file uploads](https://docs.convex.dev/file-storage/upload-files)
- [Convex file storage](https://docs.convex.dev/file-storage/overview)
- [Convex actions](https://docs.convex.dev/functions/actions)
- [OpenAI API quickstart and image inputs](https://platform.openai.com/docs/quickstart/make-your-first-api-request)
- [OpenRouter quickstart](https://openrouter.ai/docs/quickstart)
- [OpenRouter image inputs](https://openrouter.ai/docs/guides/overview/multimodal/image-understanding)

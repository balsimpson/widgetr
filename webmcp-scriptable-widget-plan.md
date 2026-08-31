# Widgetr product and architecture plan

## Document contract

This document defines what Widgetr is, how its parts fit together, and the product rules that implementation must preserve.

Use the linked documents for the other two jobs:

- [Widgetr product principles](./docs/widgetr-product-principles.md) is the standard for copy, UX, UI, agent behavior, examples, documentation, and support guidance.
- [Widgetr phase implementation plan](./docs/widgetr-phase-implementation-plan.md) records phase status, work order, deployment gates, verification evidence, and the next action for a new session.

Do not add task checklists, dated handoffs, release status, or deployment evidence to this product plan. Update the implementation plan instead. Change this document only when the product promise, system boundary, architecture, or a locked decision changes.

## Product definition

Widgetr is a visual workspace for building Scriptable widgets.

The person works in two places:

- An external AI assistant owns the conversation. It asks what the person wants, asks only the questions needed for the next decision, and uses Widgetr's WebMCP tools when they are available.
- The Widgetr page owns the visual work. It shows the project, local reference image, previews, supported controls, approvals, warnings, and Scriptable export.

Widgetr does not contain a public chat assistant. It must remain neutral about the assistant, browser, model provider, and agent interface.

WebMCP improves the experience but is not the whole product. Without WebMCP, the page must still explain what is available and offer working manual, reference-image, or example paths.

## Guiding principle

Make the easiest next step obvious.

At every point, the person should know:

- What Widgetr is doing
- What they can do now
- What will happen after they choose an action
- Where the next step will happen
- What to do if the expected option is unavailable

This rule has priority over adding more controls, technical labels, or features to the first view.

## Product promise

A person who does not know JavaScript, Scriptable APIs, WebMCP, or JSON should be able to:

1. Choose a widget idea, describe their own idea, or add a reference image.
2. Continue the conversation in their external AI assistant when one is available.
3. Watch the small, medium, and large previews change on the Widgetr page.
4. Review the result and make supported manual corrections.
5. Understand blockers, warnings, and recovery steps without reading code.
6. Export one standalone Scriptable `.js` file.
7. Install and run the file on an iPhone without needing Widgetr afterward.

Widgetr must state limitations honestly. It may provide sample data or a visual approximation, but it must say what it can show, what still needs a decision, and what the person can do next.

## People and success criteria

### Primary user

The primary user wants an iPhone widget but may not know JavaScript, Scriptable, WebMCP, or which data service to use.

They succeed when they can choose an outcome, see the widget take shape, review it, and run the export on an iPhone without learning the internal data model.

### Experienced Scriptable user

An experienced user may supply an API, inspect generated source, and make precise layout changes. The product can expose more detail when they ask for it, but the main path remains plain-language and preview-first.

### Administrator

The project owner may curate approved visual styles in a private admin area. Admin work must never expose private source images, drafts, model credentials, or administrator data to public users.

## Public user journey

| Step | What the person sees | Primary action | What happens next |
| --- | --- | --- | --- |
| Start | A calm list of widget outcomes, reference-image upload, and examples | Choose one starting path | Widgetr records the choice and explains the next step |
| Continue | A message that names the external assistant's chat as the next place to act | Continue in the assistant or use a working manual path | The assistant asks focused questions and uses Widgetr's tools |
| Build | Live previews and only the controls relevant to the current selection | Review the visible change | Manual and assistant changes update the same project state |
| Correct | Plain-language warnings, approvals, and supported controls | Accept, correct, or ask for another change | Widgetr preserves the newest valid state |
| Export | Export status, remaining warnings, and one clear export action | Download the Scriptable file | Widgetr explains how to install and test it on the iPhone |

Each step has one primary action. Secondary actions may remain available, but they must not compete with the next step.

## First-run experience

A new visitor must not open on a finished weather widget or an unexplained empty canvas.

The first view should offer real starting paths such as:

- Build a weather widget
- Track a cryptocurrency
- Build a daily agenda
- Start from a reference image
- Describe my own idea
- Explore examples

Each starting point describes the outcome and what the assistant will ask next. Choosing a starting point does not promise an instant finished widget.

After a choice, Widgetr states where to continue. For example:

> Weather widget selected. Continue in your AI assistant's chat and ask it to start. It will ask for the location and the information you want to see.

Complete examples stay behind `Explore examples`. Opening an example or starting a new project must never silently replace existing work.

Returning users go back to their last active local project. They should not be forced through first-run guidance again unless they choose to start another widget.

## The two places have different jobs

### External AI assistant

The assistant should:

- Ask what the person wants to build
- Ask only the questions needed for the next decision
- Explain what it is about to change
- Use Widgetr's current tools rather than inventing another widget state
- Ask which widget sizes a design change should affect when the scope is unclear
- Report what changed and tell the person what to review on the page

### Widgetr page

The page should:

- Show whether WebMCP tools are available
- Show the selected idea or local reference image
- Keep previews visible while changes happen
- Show relevant controls after a person selects something
- Ask for confirmation before destructive or difficult-to-reverse changes
- Show warnings with a specific recovery action
- Preserve work when the person explores examples or starts another project
- Provide the final preview and export action

An ordinary change must not require the person to copy generated code between the assistant and Widgetr.

## WebMCP status and environment guidance

Use status language that describes what Widgetr can know:

| Status | Meaning |
| --- | --- |
| `WebMCP unavailable` | The page cannot register its tools in the current environment |
| `WebMCP ready` | Widgetr registered its tools successfully |
| `Your assistant is working` | A tool call is currently changing the page |
| `Your review is needed` | A completed change needs the person's inspection or approval |

Do not show `Connected to ChatGPT` or another provider name in the core experience. Registration does not prove that an assistant is active.

When setup guidance is needed, give concrete examples that match current verified environments. Put detailed browser flags and provider-specific steps behind help text. Never leave a beginner with only `Open this page in a supported browser`.

## Workspace and interaction rules

- Keep the preview central.
- Keep one clear application surface. Avoid cards inside cards.
- Show editing controls only when they are relevant.
- Keep the first-run message and assistant status in a stable location.
- Make every assistant change visible in the previews.
- Use plain-language labels in the main path. Keep technical names in help, source, or developer views.
- Use one obvious primary action in each state.
- Make inputs and textareas full width unless a narrower control has a clear purpose.
- Preserve the last valid project when fetch, analysis, or export work fails.

## Project and persistence model

- End users do not need accounts.
- One local project equals one widget and one exported script.
- Projects, public reference images, workspace selection, and active-project state stay in browser storage.
- Autosave persists valid project state.
- Undo and redo are session-only. They are not persistent version history.
- A new project, example, or duplicate creates an intentional project state. It does not replace another project without confirmation.
- If browser storage fails, Widgetr keeps the current session usable and explains that a refresh may lose it.

## Canonical widget state

Widgetr has one versioned `WidgetProject` representation. Manual editing, assistant editing, history, persistence, previews, examples, admin test widgets, and export must use this representation.

| Area | Required information |
| --- | --- |
| Project | Local identifier, name, timestamps, schema version, and starting intent when present |
| Concurrency | Monotonic revision used to reject stale operations |
| Data source | Source type, public request details, refresh policy, and named secret placeholders without secret values |
| Data | Normalized sample, pasted, cached, or live data shared by all sizes |
| Bindings | Stable mappings between normalized data fields and elements |
| Layouts | Separate small, medium, and large element trees |
| Selection | Active size and selected element or group |
| Design scope | One size, selected sizes, or all sizes |
| Style provenance | Approved style identity, version, and copied recipe when used |
| Local reference | Optional local image metadata and browser-storage key |
| Diagnostics | Blocking errors, warnings, fallback state, and recovery actions |

Small, medium, and large layouts may show different amounts of the same shared data. Changing data must not overwrite layouts. Changing a layout must not duplicate or reconfigure the data source.

## Supported widget elements

Widgetr's bounded canonical element vocabulary is:

- Text
- Dates and times
- Images loaded from data or a URL
- SF Symbols
- Horizontal and vertical groups
- Spacers
- Repeat groups with a separate item limit per size
- Solid, gradient, or image backgrounds
- Progress rings and progress bars bound to finite numeric values and explicit ranges
- Sparklines and compact bar charts bound to finite numeric series with size-specific point limits

Supported properties include typography, color, opacity, alignment, padding, spacing, ordering, direction, borders, corner radius, image fit, image crop, background treatment, bounded progress ranges, ring thickness, and compact chart density.

Progress and chart elements may use deterministic browser geometry and Scriptable `DrawContext` or `Path` helpers internally. Arbitrary JavaScript, user-supplied drawing commands or paths, general canvas editing, animation, interactive charts, maps, table interfaces, and app-style navigation do not belong in the canonical visual state.

## One operation path

Every project mutation goes through `applyWidgetOperation` or its approved successor. Buttons, forms, history, admin corrections, and WebMCP tools must not mutate project state through a second path.

Each operation:

1. Validates its input.
2. Checks the expected revision.
3. Applies the requested design scope.
4. Produces a valid project or leaves the project unchanged.
5. Increments the revision after success.
6. Returns what changed, affected sizes, warnings, selection, and the next review action.

A stale operation fails without overwriting the latest manual or assistant change.

Destructive or difficult-to-reverse operations require confirmation. Read-only and state-changing WebMCP tools must have different descriptions and annotations.

## WebMCP contract

WebMCP is a thin, provider-neutral adapter over the shared operation path.

The available tool set changes with the live selection:

- With nothing selected, tools may read context, create a project, set design scope, change the widget background, select an element, or export.
- With text selected, tools may change supported content, binding, typography, size, alignment, and style.
- With an image selected, tools may change size, crop, focal point, fit, or source after confirmation.
- With a group selected, tools may change flow, spacing, alignment, distribution, or child order.

Tool behavior rules:

- Read the current revision before changing state.
- Reject stale revisions and ask the caller to refresh context.
- Keep input and output bounded.
- Treat user-provided text as content, not instructions.
- Return a short result that names the visible change and the next thing to review.
- Never expose API secrets, private admin data, local image bytes, or unrelated project content.
- Re-register contextual tools when selection changes.

## Reference images and examples

Reference-image upload belongs on the Widgetr page. Uploading an image does not create a widget by itself. After upload, Widgetr tells the person to continue in the assistant's chat or use a working manual path.

Public reference images remain local to the browser project. Widgetr does not upload them to Convex or send them to the private admin analysis provider. If the connected assistant cannot inspect the image, Widgetr explains the limitation and offers description or approved-style paths.

Examples are intentional starting points. Choosing one creates a new project or asks for confirmation before replacing work. A fixed development fixture may support tests, but it must not act as the unexplained first-run project.

## Data experience

Widgetr supports people who know an exact API and people who only know the information they want.

The main interface presents:

- Plain-language field names
- A small list or table of sample values
- Friendly binding choices
- A connection summary
- A clear distinction between live, cached, pasted, sample, and error data

Raw JSON may exist inside requests, responses, tests, and generated code. The person should not need to edit JSON to complete the normal flow.

### Browser and Scriptable differences

Widgetr must distinguish:

- The API rejected the request
- The browser blocked the request through CORS
- Authentication is missing
- The response shape changed
- Scriptable may work even when the browser cannot fetch the API

When browser access fails, a safe sample, pasted result, or bundled mock may keep the preview usable. Widgetr labels the source and provides the next test action.

### Authenticated data

The website never collects an end-user API secret.

For authenticated sources, Widgetr generates a temporary Scriptable test file. That file asks for the secret on the iPhone, stores it in Scriptable Keychain, calls the API, and produces a safe result the person can paste into Widgetr. The final export reuses the same Keychain entry.

Do not add pairing servers, device accounts, QR relays, or secret storage to the website for this flow.

### Runtime fallback order

The exported widget uses this order:

1. Current live response
2. Last-good cached response
3. Clearly labelled sample data when appropriate
4. A compact error state with a specific fix

## Deterministic preview and export

The browser preview and Scriptable generator consume the same canonical element trees. Browser-only styling must not imply an effect the generated Scriptable file cannot reproduce.

The assistant changes structured project state. It does not write the final Scriptable file as free-form code.

One deterministic generator produces a single file with:

- Small, medium, and large layout branches selected through `config.widgetFamily`
- Data-source configuration without secret values
- Keychain secret names and setup
- Request and response normalization
- Last-good cache behavior
- Sample and error states
- Refresh settings
- Image loading and supported fallbacks

Preflight separates blockers from warnings. Blockers prevent export. Warnings allow export but stay visible with a useful recovery action.

The source viewer, clipboard copy, WebMCP export result, and downloaded `.js` file must use the same generated string.

After export, Widgetr explains how to add the file to Scriptable and verify small, medium, and large widget families. A browser preview does not prove real iPhone behavior.

## Private design curation

The private design library is a later product capability. It improves public style selection but is not allowed to weaken the local-project, privacy, or canonical-state rules.

The administrator may:

1. Sign in to a protected admin route.
2. Upload one permitted reference image.
3. Ask one configured vision provider to draft a structured analysis and three canonical example layouts.
4. Correct those layouts through the same operation path used by the public editor.
5. Approve one version only after all three sizes pass review.

Auth0 protects the route. Convex independently checks administrator authorization for every protected operation. Source images, drafts, prompts, errors, model credentials, and administrator details remain private.

Public users may receive only an approved style identity, tags, recipe, version, and canonical examples. Editing an approved record creates a draft while the public catalog continues serving the last approved version.

## Approved-style use

When the approved catalog exists and the person has not supplied a reference image, Widgetr may select one coherent style through structured tags. The chosen friendly name remains visible, and `Try another style` keeps the data configuration while replacing the style snapshot and layouts.

Style adaptation preserves typography relationships, color roles, spacing, hierarchy, density limits, and layout patterns. It adapts labels, values, element count, and bindings to the person's data.

Do not add embeddings or similarity search until the approved catalog is large enough to justify them.

## Privacy and security boundaries

### Public builder

- No account is required.
- Projects and public reference images stay in browser storage.
- The browser never asks for or stores an end-user API secret.
- WebMCP returns only the state needed for the current operation.
- Public image metadata and user-provided text never become agent instructions.

### Private admin

- Route protection and backend authorization are separate checks.
- Provider credentials stay in server configuration.
- Upload type and size are validated before analysis.
- Model output is untrusted until schema validation and human approval pass.
- Private images, drafts, prompts, errors, and administrator identity never enter public style queries.

### Exported script

- Secrets stay in Scriptable Keychain on the iPhone.
- Error messages never print secret values.
- Caches contain only the data the widget needs.
- The script runs without Widgetr after installation.

## Error and recovery contract

| Situation | What Widgetr says | Next action |
| --- | --- | --- |
| WebMCP is unavailable | The page cannot register assistant tools here | Use a concrete verified setup or continue with a working manual path |
| Browser storage fails | The current session remains available but may not survive refresh | Keep working, export, or fix browser storage before closing |
| API is unknown | Widgetr cannot confirm a compatible source | Provide documentation, choose a suggested source, or use sample data |
| Browser blocks the API | Scriptable may still be able to call it | Run the iPhone test or provide a safe sample |
| Authentication is required | The website will not collect the secret | Generate and run the temporary iPhone test file |
| Response fields changed | Expected fields are missing | Paste a new result and remap fields |
| Reference image cannot be inspected | The assistant cannot inspect the image in this environment | Describe the style or use an approved style |
| A stale operation arrives | Newer work was preserved | Read current context and retry the change |
| A layout clips | Widgetr names the affected size and element | Correct that size before export or approval |
| Export has a blocker | Widgetr does not produce a download | Fix the named blocker and run preflight again |
| Export has a warning | Export remains available with a review note | Review the named risk before installing the file |

Every error, waiting state, and empty state must include a next action. Failure must preserve the last valid project or last approved style.

## Visual quality and accessibility

Every public widget and approved style family should have:

- No clipped or overlapping content
- Readable typography at realistic iPhone widget dimensions
- Clear information hierarchy
- Deliberate spacing and alignment
- Suitable contrast
- Density appropriate to each size
- Coherent small, medium, and large layouts without forcing large-widget detail into the small widget
- No browser-only effect presented as Scriptable-compatible

The application must support keyboard navigation, visible focus, semantic labels, sufficient contrast, reduced-motion preferences where motion exists, and responsive layouts without unintended page-level horizontal overflow.

## Product acceptance test

Before approving a product change, answer these questions:

- Would a beginner understand the first sentence?
- Is one action clearly the next action?
- Does the person know what happens after choosing it?
- Does the copy name where the next step happens?
- If an assistant is required, does the page name current, concrete ways to use one?
- If a reference image is needed, is upload clearly located on the Widgetr page?
- If the environment cannot provide the feature, is there a working alternative?
- Does the interface avoid provider-specific assumptions?
- Does every error or waiting state include a useful next action?
- Is the result visible without reading code?
- Does the change reduce unnecessary decisions, jargon, and controls?

If any answer is no, simplify the experience before adding another feature.

## Definition of done

Widgetr reaches the complete product described by this plan when:

- A new visitor can choose a clear starting path without seeing an unexplained finished sample.
- A returning visitor can resume local work without repeating onboarding.
- The page accurately distinguishes WebMCP availability, readiness, active work, and review state.
- A person can create and save multiple local projects without signing in.
- Examples, reference images, and new projects never silently replace existing work.
- All manual and assistant changes use one canonical state and one operation path.
- Small, medium, and large previews share data while keeping independent layouts.
- Progress rings, progress bars, sparklines, and compact bar charts use the same bounded values and density rules in the browser preview and Scriptable output.
- The data flow does not require the person to edit JSON.
- Authenticated APIs keep secrets on the iPhone in Scriptable Keychain.
- Errors and warnings preserve work and name a recovery action.
- The viewer, clipboard, WebMCP export, and downloaded file use identical generated source.
- The generated file runs independently in Scriptable for all three widget families.
- The deployed site passes the product acceptance test, accessibility review, responsive browser checks, WebMCP checks, privacy review, and real-iPhone checks.
- If private design curation is enabled, only human-approved style data reaches public users.

The [phase implementation plan](./docs/widgetr-phase-implementation-plan.md) may define a smaller release target. It must state which parts of this full definition remain deferred.

## Explicitly outside the current product

- A built-in public chat that creates a second conversation path
- Cloud storage or account sync for public projects
- Arbitrary JavaScript inside canonical visual state
- A general canvas or vector design tool
- Public template publishing or marketplace features
- Website storage of end-user API secrets
- Automatic model training from public projects or references
- QR pairing, relay servers, or device-linking infrastructure for the iPhone test flow
- Provider-specific assumptions in the core experience
- Embedding search before the approved catalog needs it
- Scriptable source import; this version starts from a new project, a reference image, or a complete example

## Locked decisions

| Topic | Decision |
| --- | --- |
| Repository | Widgetr is a standalone project in `/Users/balsimpson/Documents/Projects/Widgetr` |
| Frontend | Nuxt with Nuxt UI and Tailwind |
| First AI experience | External WebMCP assistant, with no built-in public chat |
| Public identity | No account required |
| Persistence | IndexedDB local projects, autosave, session undo and redo |
| Project model | One project equals one widget and one exported script |
| Canonical state | One versioned representation shared by UI, history, persistence, WebMCP, preview, examples, admin test widgets, and export |
| Widget sizes | Shared data with independent small, medium, and large layouts |
| Mutation path | Every change uses the shared revision-checked operation layer |
| Data interface | Plain-language fields and values, not JSON-first |
| Secrets | Never stored by the website; Scriptable Keychain on the iPhone |
| Public images | Local to the browser project unless the person explicitly chooses another future workflow |
| Generator | Deterministic state-to-Scriptable generation |
| Visual data | Typed progress rings, progress bars, sparklines, and compact bar charts; no arbitrary canvas, paths, or drawing code in canonical state |
| Admin | Private, separately authorized design curation |
| Style learning | Human-reviewed approved recipes, not automatic training |
| Core language | Provider-neutral `AI assistant` and truthful WebMCP status |

## References

- [Widgetr product principles](./docs/widgetr-product-principles.md)
- [Widgetr phase implementation plan](./docs/widgetr-phase-implementation-plan.md)
- [WebMCP specification](https://webmachinelearning.github.io/webmcp/)
- [Chrome WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp)
- [ChatGPT desktop app site tools](https://help.openai.com/en/articles/20001423-using-site-tools-in-the-chatgpt-desktop-app)

# Widgetr product principles

This document is the standard for Widgetr's copy, UX, UI, visual design, agent behavior, examples, documentation, and support guidance.

## The guiding principle

Make the easiest next step obvious.

At every point, a person should know:

- What Widgetr is doing
- What they can do now
- What will happen when they choose it
- Where the next step will happen
- What to do if the expected option is not available

This matters most for people who have never used Scriptable, WebMCP, or an AI agent. They should be able to try Widgetr without learning technical terms first.

## What Widgetr is

Widgetr is a visual workspace for building Scriptable widgets.

It does not contain its own AI assistant. A WebMCP-enabled AI assistant works with the page from its own conversation. Widgetr provides the workspace that the person and assistant can see together.

The connected assistant owns the conversation. It asks what the person wants to build, asks follow-up questions, and makes structured changes.

The Widgetr page owns the visual work. It handles reference-image upload, previews, supported controls, approvals, warnings, and Scriptable export.

Widgetr must remain neutral about which assistant is being used. The core product must not assume ChatGPT, a particular browser, a model provider, or a specific agent interface.

WebMCP is a progressive improvement to the experience. If no compatible assistant is available, the page must explain that clearly and provide the best available manual or example path.

## The first-run experience

The first screen should be a clean starting point with useful suggestions. It should not open on a finished weather widget, and it should not force a person to face an empty canvas without guidance.

The complete example previews stay hidden until the person chooses to explore them.

Suggested starting copy:

> Start building a widget
>
> Choose an idea below or add a reference image. Your AI assistant will ask questions in its own chat. Your preview and controls will stay here.

The first screen can offer actions such as:

- Build a weather widget
- Track Bitcoin
- Build a daily agenda
- Start from a reference image
- Describe my own idea
- Explore examples

These are starting points, not promises that a complete widget will appear immediately.

After a person chooses one, Widgetr should say what happens next. For example:

> Weather widget selected. Continue in your AI assistant's chat and ask it to start. It will ask for the location and the information you want to see.

The page must not pretend to contain a chat interface when it does not. The assistant's conversation stays in the connected browser or AI application. The page shows the work produced by that conversation.

## The user journey

| Step | What the person sees | What happens next |
| --- | --- | --- |
| Choose a starting point | A short list of clear ideas, plus reference-image upload | Widgetr records the selected idea or image and explains the next action |
| Continue with the assistant | A message that names the assistant chat as the next place to go | The external assistant asks questions and uses Widgetr's tools |
| Watch the widget take shape | The live preview updates on the Widgetr page | The person can follow the changes without reading code |
| Review the result | Preview, supported controls, warnings, and approval prompts | The person accepts, corrects, or asks the assistant for another change |
| Export | A clear export action with any remaining warnings | Widgetr produces the Scriptable file and explains what to do with it |

Every step should have one primary action. Secondary actions can remain available, but they should not compete with the next step.

## Starting points and expectations

Starting points should describe an outcome in plain language. Each one should tell the person what the assistant will ask about.

| Starting point | Clear expectation |
| --- | --- |
| Build a weather widget | The assistant will ask for a location, units, and the weather information to show. |
| Track Bitcoin | Widgetr loads live BTC / USD data and a seven-day trend; the assistant can help shape what stays in view. |
| Build a daily agenda | The assistant will ask which parts of the day, tasks, or events matter most. |
| Start from a reference image | The person adds the image on the Widgetr page. The assistant uses it as a visual guide where the current tools support that workflow. |
| Describe my own idea | The assistant will ask focused questions until it has enough information to begin. |

Do not show a complete sample widget as the default starting state. Keep finished examples behind `Explore examples`. Choosing an example should create or open an intentional starting point. It must not silently replace an existing project.

For Weather, the chosen location belongs to that project; it is never a starter-wide fixed value. The assistant should resolve the chosen place to a public weather source, preserve the source timezone, normalize provider forecast fields into the supported repeat layout, and use the device locale for day, time, and whole-number display. It must not silently substitute another place or truncate a rendered value.

## The two places have different jobs

### The connected assistant

The assistant should:

- Ask the person what they want to build
- Ask only the questions needed for the next decision
- Explain what it is about to change
- Use Widgetr's available tools instead of inventing a second widget state
- Report when it has finished and tell the person what to review

### The Widgetr page

The page should:

- Show whether WebMCP tools are available
- Show the selected starting idea or reference image
- Accept reference-image uploads
- Keep previews visible while changes happen
- Show the controls that are relevant to the current selection
- Ask for confirmation before risky or destructive changes
- Show warnings in plain language with a useful next action
- Provide the final preview and export action

Do not make a person copy code between the assistant and Widgetr to complete an ordinary change.

## WebMCP and environment guidance

Never write a generic instruction such as:

> Open this page in a supported browser.

That leaves a beginner with the hardest question unanswered: which browser or assistant should they use?

When a person needs to connect an assistant, give concrete examples that match the current environment. Examples may include:

- Chrome with WebMCP testing enabled. For local testing, open `chrome://flags/#enable-webmcp-testing`, set the flag to `Enabled`, and relaunch Chrome.
- The ChatGPT desktop app's built-in browser when the account has access to site tools. Open the built-in browser, visit Widgetr, and tell ChatGPT what to build.
- Another browser or AI assistant that supports WebMCP. Its setup steps belong in that provider's own instructions.

These are examples, not an exhaustive list. Browser and assistant support changes. Verify each route before describing it as available, and keep the main product copy readable for someone who does not know what a browser flag is. Put detailed setup steps behind a help link or an expandable explanation when possible.

Use status language that describes what Widgetr can actually know:

- `WebMCP unavailable` means the page cannot register its tools in the current environment.
- `WebMCP ready` means Widgetr has registered its tools successfully.
- `Your assistant is working` means a tool call is actually changing the page.
- `Your review is needed` means the person must approve or inspect a change.

Do not show `Connected to ChatGPT`, or any other provider name, in the core experience. Do not claim that an assistant is working just because WebMCP is available.

## Copy rules

Write for a person who wants to make something, not for a developer reading an API reference.

- Lead with the person's task, not the technology.
- Use familiar verbs such as `choose`, `describe`, `add`, `review`, `change`, and `export`.
- Name the next place to act. Say `Continue in your AI assistant's chat` instead of `Connect your agent instance`.
- Say what a choice will produce before asking the person to make it.
- Keep the primary action singular and visible.
- Use `AI assistant` in beginner-facing copy. Explain `WebMCP` in help text or technical documentation.
- Avoid `model context`, `tool registry`, `schema`, `invoke`, `payload`, and `API` in the main path unless the person needs that information.
- Never promise live data, image understanding, browser support, or export behavior that has not been tested.
- Do not write `Something went wrong` without saying what the person can do next.
- Do not use a provider name as a shortcut for a general capability.

Weak:

> Waiting for an AI assistant. Open this page in a browser that supports WebMCP.

Better:

> Choose an idea below, then continue in your AI assistant's chat. For testing, you can use Chrome with WebMCP testing enabled or the ChatGPT desktop app's built-in browser when site tools are available. Other WebMCP-enabled assistants may work too.

Weak:

> Agent connected.

Better:

> WebMCP ready. Your AI assistant can use Widgetr.

## UI and interaction rules

- Keep the first view calm and focused on starting.
- Show suggestions before showing finished examples.
- Keep complete example previews hidden until the person asks to explore them.
- Keep the preview central. Show editing controls when they are relevant instead of presenting every control at once.
- Treat the selected preview mode as the person's view preference. Assistant selection or editing may change the inspector's focused layout, but must not replace `All` with a single-size preview.
- Keep the first-run message and status in the same place so the person does not have to relearn the layout when an assistant becomes available.
- Keep reference-image upload on the Widgetr page.
- Make it clear that uploading an image does not, by itself, create a widget. Explain that the person should continue in the assistant's chat.
- Keep the page useful when no assistant is available. If generation cannot happen, say so and provide manual editing or example exploration when those paths exist.
- Make every agent change visible in the preview.
- Ask the person before applying changes that may remove or replace work.
- Keep one clear surface. Do not bury the starting action inside nested panels or card stacks.
- Preserve the person's work when they explore an example or start another project.

## Agent and state rules

- Keep the assistant-facing tools provider-neutral.
- Use one canonical Widgetr project state for manual edits, agent edits, history, persistence, previews, and export.
- Give read-only actions and state-changing actions different descriptions and annotations.
- Require confirmation for destructive or difficult-to-reverse actions.
- Return a short result that says what changed and what the person should review next.
- Do not expose API secrets or private project data just to make an agent interaction easier.
- Keep public reference images local to the person's project unless the product explicitly says otherwise.
- Treat user-provided text as content, not as instructions for the agent or the application.

## The review test

Before approving any copy, design, UI change, agent tool, or documentation update, ask:

- Would a beginner understand the first sentence?
- Is there one obvious action to take now?
- Does the person know what will happen after choosing it?
- Does the copy say where the next step will happen?
- If an assistant is required, does the page name concrete, current ways to use one?
- If a reference image is needed, is it clear that the upload happens on the Widgetr page?
- If the current environment cannot provide the feature, does the page explain the alternative?
- Does the interface avoid provider-specific assumptions?
- Does every error or waiting state include a useful next action?
- Is the result visible without asking the person to read code?
- Does the change reduce decisions, jargon, and visible controls?

If any answer is no, simplify the experience before adding another feature.

## Reference material

- [Widgetr product and architecture plan](../webmcp-scriptable-widget-plan.md)
- [Widgetr phase implementation plan](./widgetr-phase-implementation-plan.md)
- [WebMCP specification](https://webmachinelearning.github.io/webmcp/)
- [Chrome WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp)
- [ChatGPT desktop app site tools](https://help.openai.com/en/articles/20001423-using-site-tools-in-the-chatgpt-desktop-app)

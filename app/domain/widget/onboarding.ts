export function createAssistantPrompt(widgetrUrl: string): string {
  return `Open Widgetr at ${widgetrUrl}. Ask me what I want to see in a Scriptable widget, then open the widget editor and start it with me. Keep working on that widget as I refine it.`
}

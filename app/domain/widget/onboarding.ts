export function createAssistantPrompt(widgetrUrl: string): string {
  return [
    `Open Widgetr at ${widgetrUrl}.`,
    'Use its page actions to help me build a Scriptable widget.',
    'Ask what I want to see at a glance, then wait for me to choose a starting point.',
    'Keep changes visible on the canvas.'
  ].join(' ')
}

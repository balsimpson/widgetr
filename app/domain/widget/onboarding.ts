export function createAssistantPrompt(widgetrUrl: string): string {
  return `Open Widgetr in the in-app browser at ${widgetrUrl}. Wait until its page actions are ready, then use its getting-started action and open the new-project flow. Wait for me to choose a starter in Widgetr. If I choose Weather, ask for my location in this chat, then connect a public JSON weather source and update the widget from its returned fields. If I choose Bitcoin, use the live BTC / USD data already loaded in Widgetr and help me shape the widget or change its source if I ask.`
}

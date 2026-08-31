import type { WidgetStarterId } from '~/types/widget'

export type WidgetStarterAction = 'create' | 'reference' | 'example'

export interface WidgetStarterDefinition {
  id: WidgetStarterId
  action: WidgetStarterAction
  label: string
  description: string
  nextStep: string
  icon: string
  projectName?: string
}

export const WIDGET_STARTERS: readonly WidgetStarterDefinition[] = [
  {
    id: 'weather',
    action: 'create',
    label: 'Build a weather widget',
    description: 'See the forecast information that matters to you.',
    nextStep: 'Your assistant will ask for a location, units, and what to show.',
    icon: 'i-lucide-cloud-sun',
    projectName: 'Weather widget'
  },
  {
    id: 'cryptocurrency',
    action: 'create',
    label: 'Track a cryptocurrency',
    description: 'Keep the asset and price details you want in view.',
    nextStep: 'Your assistant will ask which asset and price information to display.',
    icon: 'i-lucide-coins',
    projectName: 'Cryptocurrency tracker'
  },
  {
    id: 'daily-agenda',
    action: 'create',
    label: 'Build a daily agenda',
    description: 'Turn the important parts of your day into a quick glance.',
    nextStep: 'Your assistant will ask which tasks or events matter most.',
    icon: 'i-lucide-calendar-days',
    projectName: 'Daily agenda'
  },
  {
    id: 'own-idea',
    action: 'create',
    label: 'Describe my own idea',
    description: 'Start with a widget you already have in mind.',
    nextStep: 'Your assistant will ask focused questions until it can begin.',
    icon: 'i-lucide-lightbulb',
    projectName: 'New widget'
  },
  {
    id: 'reference-image',
    action: 'reference',
    label: 'Start from a reference image',
    description: 'Use a screenshot or photo to set the visual direction.',
    nextStep: 'Add the image here, then continue in your assistant\'s chat.',
    icon: 'i-lucide-image-plus',
    projectName: 'Reference-led widget'
  },
  {
    id: 'example',
    action: 'example',
    label: 'Explore examples',
    description: 'Look at a complete widget before starting your own.',
    nextStep: 'Choose an example only when you want a separate local project.',
    icon: 'i-lucide-panels-top-left'
  }
]

export function getWidgetStarter(id: WidgetStarterId): WidgetStarterDefinition {
  const starter = WIDGET_STARTERS.find(item => item.id === id)
  if (!starter) {
    throw new Error(`Unknown Widgetr starter: ${id}`)
  }
  return starter
}

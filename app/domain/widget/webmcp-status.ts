import type { WebMcpStatus } from '~/types/webmcp'

export interface WebMcpStatusDescription {
  label: string
  description: string
  color: 'neutral' | 'warning' | 'success' | 'error'
  icon: string
}

export function describeWebMcpStatus(status: WebMcpStatus): WebMcpStatusDescription {
  switch (status) {
    case 'checking':
      return {
        label: 'Checking page actions...',
        description: 'Checking whether an assistant can work with this page.',
        color: 'neutral',
        icon: 'i-lucide-search-check'
      }
    case 'registering':
      return {
        label: 'Preparing page actions...',
        description: 'Making the editor actions available to a compatible assistant.',
        color: 'warning',
        icon: 'i-lucide-loader-circle'
      }
    case 'registered':
      return {
        label: 'Page actions ready',
        description: 'This page has registered actions for a compatible assistant. Ask what to build, then shape it together on the canvas.',
        color: 'success',
        icon: 'i-lucide-check-circle-2'
      }
    case 'working':
      return {
        label: 'Your assistant is working',
        description: 'An editor action is running. Keep shaping the widget together on the canvas.',
        color: 'warning',
        icon: 'i-lucide-loader-circle'
      }
    case 'error':
      return {
        label: 'Page actions could not start',
        description: 'Reload the page or use the message below to continue.',
        color: 'error',
        icon: 'i-lucide-circle-alert'
      }
    case 'unsupported':
    default:
      return {
        label: 'Page actions unavailable',
        description: 'The editor still works by itself. Use a browser and assistant that support page actions to control it.',
        color: 'error',
        icon: 'i-lucide-plug-zap'
      }
  }
}

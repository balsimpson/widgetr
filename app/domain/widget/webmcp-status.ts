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
        description: 'Checking whether this page can accept page actions.',
        color: 'neutral',
        icon: 'i-lucide-search-check'
      }
    case 'registering':
      return {
        label: 'Preparing page actions...',
        description: 'Getting Widgetr page actions ready.',
        color: 'warning',
        icon: 'i-lucide-loader-circle'
      }
    case 'registered':
      return {
        label: 'WebMCP ready',
        description: 'Ask what to build, then watch the canvas update.',
        color: 'success',
        icon: 'i-lucide-check-circle-2'
      }
    case 'working':
      return {
        label: 'Your assistant is working',
        description: 'A page action is changing the widget.',
        color: 'warning',
        icon: 'i-lucide-loader-circle'
      }
    case 'error':
      return {
        label: 'Page actions could not start',
        description: 'Retry registration or open Widgetr where an AI assistant can use page actions.',
        color: 'error',
        icon: 'i-lucide-circle-alert'
      }
    case 'unsupported':
    default:
      return {
        label: 'WebMCP unavailable',
        description: 'Open Widgetr where an AI assistant can use page actions.',
        color: 'error',
        icon: 'i-lucide-plug-zap'
      }
  }
}

import { toRaw } from 'vue'
import { parseWidgetProject } from './schema'
import type { WidgetProject } from '~/types/widget'

export function cloneWidgetProject(project: WidgetProject): WidgetProject {
  return parseWidgetProject(JSON.parse(JSON.stringify(toRaw(project))))
}

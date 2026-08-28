import { createSampleWidgetProject } from './fixture'
import { createProjectFromTemplate } from './projects'
import { parseWidgetProject } from './schema'
import type { ImportReport, JsonObject, WidgetProject } from '~/types/widget'

const SNAPSHOT_PATTERN = /var PROJECT = (\{[\s\S]*?\});\s*var SAMPLE_DATA\s*=/
const MAX_SOURCE_LENGTH = 200_000

interface ExportSnapshot {
  id?: string
  name?: string
  data?: JsonObject
  dataSource?: WidgetProject['dataSource']
  bindings?: WidgetProject['bindings']
  layouts?: WidgetProject['layouts']
}

interface DetectedScriptableFeatures {
  textCallCount: number
  imageCallCount: number
  dataCalls: string[]
  unsupported: string[]
  requiredUserInput: string[]
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

function detectScriptableFeatures(source: string): DetectedScriptableFeatures {
  const textCallCount = [...source.matchAll(/\.addText\s*\(/g)].length
  const imageCallCount = [...source.matchAll(/\.addImage\s*\(/g)].length
  const dataCalls: string[] = []
  const unsupported: string[] = []
  const requiredUserInput: string[] = []

  if (/\bRequest\s*\.\s*loadJSON\s*\(/.test(source)) {
    dataCalls.push('Request.loadJSON')
  }
  if (/\bRequest\s*\.\s*loadString\s*\(/.test(source)) {
    dataCalls.push('Request.loadString')
  }
  if (/\bnew\s+Request\s*\(/.test(source)) {
    dataCalls.push('new Request')
  }
  if (/\bfetch\s*\(/.test(source)) {
    dataCalls.push('fetch')
  }
  if (/\bFileManager\s*\./.test(source)) {
    dataCalls.push('FileManager')
  }

  if (/\bDrawContext\b/.test(source)) {
    unsupported.push('DrawContext rendering was detected but is not represented in the visual state.')
  }
  if (/\bWebView\b/.test(source)) {
    unsupported.push('WebView behavior was detected but is not executed during import.')
  }
  if (/\bUITable\b/.test(source)) {
    unsupported.push('UITable interaction was detected but is not represented in the visual editor.')
  }
  if (/\b(Notification|Safari|QuickLook)\s*\./.test(source)) {
    unsupported.push('Interactive Scriptable services were detected but are not imported into the widget state.')
  }

  if (/\bKeychain\s*\./.test(source)) {
    requiredUserInput.push('Re-enter any referenced secret values through Scriptable Keychain on the iPhone.')
  }
  if (dataCalls.length > 0) {
    requiredUserInput.push('Confirm the detected request URL, parameters, response fields, and authentication requirements.')
  }

  return {
    textCallCount,
    imageCallCount,
    dataCalls: unique(dataCalls),
    unsupported: unique(unsupported),
    requiredUserInput: unique(requiredUserInput)
  }
}

export interface ScriptableImportResult {
  project: WidgetProject
  report: ImportReport
  mode: 'widgetr-export' | 'best-effort'
}

function createProjectWithReport(
  name: string,
  report: ImportReport,
  now: string
): WidgetProject {
  const project = createProjectFromTemplate(createSampleWidgetProject(), { name, now })
  project.importReport = report
  return parseWidgetProject(project)
}

function importedWidgetrProject(snapshot: ExportSnapshot, now: string): WidgetProject | null {
  if (
    !snapshot.data
    || !snapshot.dataSource
    || !snapshot.bindings
    || !snapshot.layouts
  ) {
    return null
  }

  const report: ImportReport = {
    reproduced: [
      'Recovered the exported data snapshot and all three layout trees.',
      'Kept the imported widget on Widgetr\'s canonical preview and export path.'
    ],
    approximated: [],
    unsupported: [
      'The original project selection and local reference metadata were not part of the exported file.'
    ],
    dataCalls: snapshot.dataSource.kind === 'public-api' && snapshot.dataSource.url
      ? [`${snapshot.dataSource.method} ${snapshot.dataSource.url}`]
      : [],
    requiredUserInput: snapshot.dataSource.secretPlaceholders.map(secret => (
      `Provide ${secret.label} through Scriptable Keychain before running the imported widget.`
    )),
    nextSteps: [
      'Select an element in a preview or the structure tree to review its settings.',
      'Run the imported file in Scriptable to confirm its image sources and data request.'
    ]
  }

  try {
    const template = createSampleWidgetProject()
    const imported = createProjectFromTemplate(template, {
      name: `${snapshot.name ?? 'Imported widget'} import`,
      now
    })
    imported.data = {
      kind: 'pasted',
      label: 'Imported Scriptable data',
      capturedAt: now,
      value: snapshot.data
    }
    imported.dataSource = snapshot.dataSource
    imported.bindings = snapshot.bindings
    imported.layouts = snapshot.layouts
    imported.importReport = report
    return parseWidgetProject(imported)
  } catch {
    return null
  }
}

export function importScriptableProject(
  source: string,
  now = new Date().toISOString()
): ScriptableImportResult {
  const trimmedSource = source.trim()
  if (trimmedSource.length > MAX_SOURCE_LENGTH) {
    const report: ImportReport = {
      reproduced: ['Read the pasted source as text without executing it.'],
      approximated: [],
      unsupported: [
        `The source is longer than ${MAX_SOURCE_LENGTH.toLocaleString()} characters, so no code was interpreted.`,
        'Scriptable API calls, data requests, and interactive behavior were not executed.'
      ],
      dataCalls: [],
      requiredUserInput: [],
      nextSteps: [
        'Paste the generated Widgetr file or a smaller focused Scriptable script.',
        'Use the imported starter as a safe visual reference and configure its elements manually.'
      ]
    }
    return {
      project: createProjectWithReport('Imported Scriptable widget', report, now),
      report,
      mode: 'best-effort'
    }
  }

  const snapshotMatch = SNAPSHOT_PATTERN.exec(trimmedSource)
  if (snapshotMatch?.[1]) {
    try {
      const snapshot = JSON.parse(snapshotMatch[1]) as ExportSnapshot
      const project = importedWidgetrProject(snapshot, now)
      if (project) {
        return {
          project,
          report: project.importReport!,
          mode: 'widgetr-export'
        }
      }
    } catch {
      // Continue to the safe best-effort path when the embedded snapshot is invalid.
    }
  }

  const detected = detectScriptableFeatures(trimmedSource)
  const report: ImportReport = {
    reproduced: [
      'Read the pasted source as text without executing it.',
      `Detected ${detected.textCallCount} text call${detected.textCallCount === 1 ? '' : 's'} and ${detected.imageCallCount} image call${detected.imageCallCount === 1 ? '' : 's'}.`
    ],
    approximated: [
      'The detected visual calls are represented by Widgetr\'s editable three-size starter; exact Scriptable layout constraints need a manual pass.'
    ],
    unsupported: [
      ...detected.unsupported,
      'Arbitrary JavaScript execution and interactive behavior were not imported.'
    ],
    dataCalls: detected.dataCalls,
    requiredUserInput: detected.requiredUserInput,
    nextSteps: [
      'Use the three-size starter as the editable visual starting point.',
      'Select elements in the previews or structure tree and replace the sample content.',
      'Run the final exported file in Scriptable after adding any required Keychain values.'
    ]
  }

  return {
    project: createProjectWithReport('Imported Scriptable widget', report, now),
    report,
    mode: 'best-effort'
  }
}

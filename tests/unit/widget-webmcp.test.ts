import { describe, expect, it, vi } from 'vitest'
import { shallowRef } from 'vue'
import { createNewWidgetProject } from '~/domain/widget/projects'
import { createNeutralWidgetProject, createSampleWidgetProject } from '~/domain/widget/fixture'
import { applyWidgetOperation } from '~/domain/widget/operations'
import { generateScriptableCode } from '~/domain/widget/scriptable'
import { createVisualDataElement } from '~/domain/widget/visual-data'
import { registerWebMcpToolSet } from '~/composables/useWidgetWebMcp'
import { createAssistantPrompt } from '~/domain/widget/onboarding'
import {
  createHomepageWebMcpToolCatalog,
  createStarterWebMcpToolCatalog,
  createWebMcpToolCatalog,
  getWebMcpContext,
  getWebMcpToolNames,
  serializeWebMcpResult
} from '~/domain/widget/webmcp'
import { describeWebMcpStatus } from '~/domain/widget/webmcp-status'
import type { WebMcpModelContext, WebMcpRuntime, WebMcpTool } from '~/types/webmcp'
import type { WidgetOperation, WidgetProject } from '~/types/widget'

const fixedClock = () => '2026-08-28T06:00:00.000Z'

function selectedProject(size: 'small' | 'medium' | 'large', elementId: string): WidgetProject {
  const project = createSampleWidgetProject()
  const result = applyWidgetOperation(project, {
    type: 'set-selection',
    expectedRevision: 0,
    selection: { size, elementId }
  }, { now: fixedClock })

  if (!result.ok) {
    throw new Error(result.message)
  }
  return result.state
}

function selectedVisualProject(type: 'progress-ring' | 'progress-bar' | 'sparkline' | 'bar-chart'): WidgetProject {
  const project = createSampleWidgetProject()
  const elementId = `webmcp-${type}`
  for (const size of ['small', 'medium', 'large'] as const) {
    project.layouts[size].root.children.push(createVisualDataElement(type, elementId))
  }
  const result = applyWidgetOperation(project, {
    type: 'set-selection',
    expectedRevision: 0,
    selection: { size: 'medium', elementId }
  }, { now: fixedClock })

  if (!result.ok) {
    throw new Error(result.message)
  }
  return result.state
}

function createRuntime(initialProject: WidgetProject, confirmation = true) {
  const state = { project: initialProject }
  const operations: WidgetOperation[] = []
  const confirmations: string[] = []

  const runtime: WebMcpRuntime = {
    getProject: () => state.project,
    commitOperation: operation => {
      operations.push(operation)
      const result = applyWidgetOperation(state.project, operation, { now: fixedClock })
      if (result.ok) {
        state.project = result.state
      }
      return result
    },
    createProject: async (name, startingIntent) => {
      state.project = createNewWidgetProject(fixedClock(), name, startingIntent)
      return state.project
    },
    getExport: () => generateScriptableCode(state.project),
    requestConfirmation: async request => {
      confirmations.push(request.title)
      return confirmation
    }
  }

  return { runtime, state, operations, confirmations }
}

function toolFor(project: WidgetProject, name: string) {
  const tool = createWebMcpToolCatalog(project).find(candidate => candidate.name === name)
  if (!tool) {
    throw new Error(`${name} is not registered for ${getWebMcpContext(project)} context`)
  }
  return tool
}

function signal(): AbortSignal {
  return new AbortController().signal
}

describe('Widgetr WebMCP catalog', () => {
  it('keeps the homepage catalog read-only and points to the Studio', async () => {
    const project = createNeutralWidgetProject()
    const { runtime } = createRuntime(project)
    const catalog = createHomepageWebMcpToolCatalog('http://127.0.0.1:3100/studio')

    expect(catalog.map(tool => tool.name)).toEqual(['widgetr_get_started'])
    const result = await catalog[0]!.execute({}, { signal: signal() }, runtime)

    expect(result).toMatchObject({
      ok: true,
      studioUrl: 'http://127.0.0.1:3100/studio',
      nextStep: expect.stringContaining('choose a starter')
    })
    expect(JSON.stringify(result)).toContain('Build a weather widget')
    expect(JSON.stringify(result)).not.toContain('Kochi')
  })

  it('creates a complete weather starter from the chooser catalog', async () => {
    const project = createNeutralWidgetProject()
    const { runtime, state } = createRuntime(project)
    const catalog = createStarterWebMcpToolCatalog('http://127.0.0.1:3100/studio')
    const createTool = catalog.find(tool => tool.name === 'widgetr_create_widget')

    expect(catalog.map(tool => tool.name)).toEqual([
      'widgetr_get_started',
      'widgetr_create_widget'
    ])
    expect(createTool).toBeDefined()

    const result = await createTool!.execute({
      name: 'Weather widget',
      starterId: 'weather'
    }, { signal: signal() }, runtime)

    expect(result).toMatchObject({
      ok: true,
      name: 'Weather widget',
      startingIntent: 'weather'
    })
    expect(state.project.startingIntent).toBe('weather')
    expect(state.project.dataSource.kind).toBe('sample')
    expect(state.project.data.value.location).toBe('Kochi')
  })

  it('rejects an unlisted starter id before creating a project', async () => {
    const project = createNeutralWidgetProject()
    const { runtime, state } = createRuntime(project)
    const createTool = createStarterWebMcpToolCatalog('http://127.0.0.1:3100/studio')
      .find(tool => tool.name === 'widgetr_create_widget')

    const result = await createTool!.execute({
      name: 'Unexpected widget',
      starterId: 'sample-project'
    }, { signal: signal() }, runtime)

    expect(result).toMatchObject({
      ok: false,
      code: 'INVALID_INPUT'
    })
    expect(state.project.id).toBe(project.id)
  })

  it('builds the assistant message from the current Widgetr URL', () => {
    expect(createAssistantPrompt('http://127.0.0.1:3100/')).toBe(
      'Open Widgetr in the in-app browser at http://127.0.0.1:3100/. Wait until its page actions are ready, then use its getting-started action and open the new-project flow. Wait for me to choose a starter in Widgetr. If I choose Weather, ask for my location in this chat, then connect a public JSON weather source and update the widget from its returned fields. If I choose Bitcoin, use the live BTC / USD data already loaded in Widgetr and help me shape the widget or change its source if I ask.'
    )
  })

  it('keeps all WebMCP status labels provider-neutral and observable', () => {
    expect(describeWebMcpStatus('checking').label).toBe('Checking page actions...')
    expect(describeWebMcpStatus('unsupported').label).toBe('WebMCP unavailable')
    expect(describeWebMcpStatus('registering').label).toBe('Preparing page actions...')
    expect(describeWebMcpStatus('registered').label).toBe('WebMCP ready')
    expect(describeWebMcpStatus('working').label).toBe('Your assistant is working')
    expect(describeWebMcpStatus('error').label).toBe('Page actions could not start')
  })

  it('exposes only the no-selection tools when nothing is selected', () => {
    const project = createSampleWidgetProject()
    project.selection = null

    expect(getWebMcpContext(project)).toBe('none')
    expect(getWebMcpToolNames(project)).toEqual([
      'widgetr_get_context',
      'widgetr_export',
      'widgetr_connect_public_data',
      'widgetr_set_data_bindings',
      'widgetr_select_element',
      'widgetr_clear_selection',
      'widgetr_create_widget',
      'widgetr_set_design_scope',
      'widgetr_change_overall_style',
      'widgetr_insert_visual_data'
    ])
  })

  it('changes the catalog for text, image, and group selections', () => {
    const textProject = selectedProject('small', 'temperature')
    const imageProject = selectedProject('medium', 'weather-image')
    const groupProject = selectedProject('large', 'header')

    expect(getWebMcpContext(textProject)).toBe('text')
    expect(getWebMcpToolNames(textProject)).toContain('widgetr_change_typography')
    expect(getWebMcpToolNames(textProject)).not.toContain('widgetr_replace_image')

    expect(getWebMcpContext(imageProject)).toBe('image')
    expect(getWebMcpToolNames(imageProject)).toContain('widgetr_replace_image')
    expect(getWebMcpToolNames(imageProject)).not.toContain('widgetr_change_typography')

    expect(getWebMcpContext(groupProject)).toBe('group')
    expect(getWebMcpToolNames(groupProject)).toContain('widgetr_reorder_group')
    expect(getWebMcpToolNames(groupProject)).not.toContain('widgetr_replace_image')

    const visualProject = selectedVisualProject('sparkline')
    expect(getWebMcpContext(visualProject)).toBe('visual-data')
    expect(getWebMcpToolNames(visualProject)).toContain('widgetr_configure_visual_data')
    expect(getWebMcpToolNames(visualProject)).toContain('widgetr_remove_visual_data')
    expect(getWebMcpToolNames(visualProject)).not.toContain('widgetr_change_typography')
  })

  it('connects a bounded public JSON source and returns its fields for binding', async () => {
    const project = createNewWidgetProject(fixedClock(), 'Weather widget', 'weather')
    const { runtime, state, operations } = createRuntime(project)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      current: { temperature_2m: 29, weather_code: 61 }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })))

    try {
      const result = await toolFor(project, 'widgetr_connect_public_data').execute({
        expectedRevision: 0,
        url: 'https://api.example.test/forecast',
        refreshMinutes: 30
      }, { signal: signal() }, runtime)

      expect(result).toMatchObject({
        ok: true,
        revision: 1,
        source: { hostname: 'api.example.test', refreshMinutes: 30 }
      })
      expect(result.fields).toEqual(expect.arrayContaining([
        expect.objectContaining({
          path: ['current', 'temperature_2m'],
          valueType: 'number'
        })
      ]))
      expect(state.project.dataSource).toMatchObject({
        kind: 'public-api',
        url: 'https://api.example.test/forecast',
        method: 'GET',
        headers: [],
        secretPlaceholders: []
      })
      expect(state.project.data).toMatchObject({
        kind: 'live',
        value: { current: { temperature_2m: 29, weather_code: 61 } }
      })
      expect(operations.at(-1)).toMatchObject({ type: 'set-public-data-source' })
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('inserts a visual-data element from the no-selection context', async () => {
    const project = createSampleWidgetProject()
    project.selection = null
    const { runtime, state, operations } = createRuntime(project)
    const result = await toolFor(project, 'widgetr_insert_visual_data').execute({
      expectedRevision: 0,
      scope: { kind: 'all' },
      type: 'bar-chart'
    }, { signal: signal() }, runtime)

    expect(result).toMatchObject({
      ok: true,
      revision: 1,
      changedSizes: ['small', 'medium', 'large']
    })
    expect(operations[0]).toMatchObject({
      type: 'insert-element',
      parentId: 'root',
      element: { type: 'bar-chart' }
    })
    expect(state.project.selection?.elementId).toMatch(/^visual-bar-chart-/)
  })

  it('configures a selected visual-data element through the shared operation', async () => {
    const project = selectedVisualProject('sparkline')
    const { runtime, state, operations } = createRuntime(project)
    const result = await toolFor(project, 'widgetr_configure_visual_data').execute({
      expectedRevision: 1,
      scope: { kind: 'one', size: 'medium' },
      series: { kind: 'literal', value: [1, 3, 2, 5] },
      density: 'detailed'
    }, { signal: signal() }, runtime)

    expect(result).toMatchObject({
      ok: true,
      revision: 2,
      changedSizes: ['medium']
    })
    expect(operations[0]).toMatchObject({
      type: 'update-element-content',
      elementId: 'webmcp-sparkline',
      patch: {
        series: { kind: 'literal', value: [1, 3, 2, 5] },
        density: 'detailed'
      }
    })
    const element = state.project.layouts.medium.root.children.find(item => item.id === 'webmcp-sparkline')
    expect(element?.type).toBe('sparkline')
    if (element?.type === 'sparkline') {
      expect(element.values).toEqual({ kind: 'literal', value: [1, 3, 2, 5] })
    }
  })

  it('rejects visual properties that do not belong to the selected element', async () => {
    const project = selectedVisualProject('bar-chart')
    const { runtime, operations } = createRuntime(project)
    const result = await toolFor(project, 'widgetr_configure_visual_data').execute({
      expectedRevision: 1,
      scope: { kind: 'one', size: 'medium' },
      thickness: 3
    }, { signal: signal() }, runtime)

    expect(result).toMatchObject({
      ok: false,
      code: 'INVALID_INPUT',
      revision: 1
    })
    expect(result.message).toContain('does not support thickness')
    expect(operations).toHaveLength(0)
  })

  it('rejects a progress-bar range that would become invalid', async () => {
    const project = selectedVisualProject('progress-bar')
    const { runtime, operations } = createRuntime(project)
    const result = await toolFor(project, 'widgetr_configure_visual_data').execute({
      expectedRevision: 1,
      scope: { kind: 'one', size: 'medium' },
      min: 2
    }, { signal: signal() }, runtime)

    expect(result).toMatchObject({
      ok: false,
      code: 'INVALID_INPUT',
      revision: 1
    })
    expect(result.message).toContain('max must be greater than min')
    expect(operations).toHaveLength(0)
  })

  it('clears selection through the canonical selection operation', async () => {
    const project = selectedProject('small', 'temperature')
    const { runtime, state, operations } = createRuntime(project)
    const result = await toolFor(project, 'widgetr_clear_selection').execute({
      expectedRevision: project.revision
    }, { signal: signal() }, runtime)

    expect(result).toMatchObject({ ok: true, revision: 2, selection: null })
    expect(state.project.selection).toBeNull()
    expect(operations[0]).toMatchObject({ type: 'set-selection', selection: null })
  })

  it('returns a bounded context summary without widget data', async () => {
    const project = selectedProject('small', 'temperature')
    const { runtime } = createRuntime(project)
    const result = await toolFor(project, 'widgetr_get_context').execute({}, { signal: signal() }, runtime)

    expect(result).toMatchObject({
      ok: true,
      revision: 1,
      context: 'text',
      selectedElement: {
        id: 'temperature',
        type: 'text'
      }
    })
    expect(JSON.stringify(result)).not.toContain('Kochi')
    expect(JSON.stringify(result)).not.toContain('forecast')
  })

  it('routes text typography through the current operation path', async () => {
    const project = selectedProject('small', 'temperature')
    const { runtime, state, operations } = createRuntime(project)
    const result = await toolFor(project, 'widgetr_change_typography').execute({
      expectedRevision: 1,
      scope: { kind: 'one', size: 'small' },
      fontSize: 30,
      color: '#F6C453'
    }, { signal: signal() }, runtime)

    expect(result).toMatchObject({
      ok: true,
      revision: 2,
      changedSizes: ['small']
    })
    expect(operations[0]).toMatchObject({
      type: 'update-text-style',
      elementId: 'temperature'
    })
    const temperature = state.project.layouts.small.root.children.find(element => element.id === 'temperature')
    expect(temperature?.type).toBe('text')
    if (temperature?.type === 'text') {
      expect(temperature.textStyle.fontSize).toBe(30)
      expect(temperature.textStyle.color).toBe('#F6C453')
    }
  })

  it('rejects an agent operation after a manual revision change', async () => {
    const project = selectedProject('small', 'temperature')
    const { runtime, state } = createRuntime(project)
    const typographyTool = toolFor(project, 'widgetr_change_typography')

    const manual = applyWidgetOperation(state.project, {
      type: 'update-text-style',
      expectedRevision: 1,
      elementId: 'temperature',
      scope: { kind: 'one', size: 'small' },
      patch: { color: '#12A36E' }
    }, { now: fixedClock })
    if (!manual.ok) {
      throw new Error(manual.message)
    }
    state.project = manual.state

    const result = await typographyTool.execute({
      expectedRevision: 1,
      scope: { kind: 'one', size: 'small' },
      fontSize: 20
    }, { signal: signal() }, runtime)

    expect(result).toMatchObject({
      ok: false,
      code: 'STALE_REVISION',
      revision: 2
    })
    const temperature = state.project.layouts.small.root.children.find(element => element.id === 'temperature')
    expect(temperature?.type).toBe('text')
    if (temperature?.type === 'text') {
      expect(temperature.textStyle.color).toBe('#12A36E')
      expect(temperature.textStyle.fontSize).not.toBe(20)
    }
  })

  it('waits for user confirmation before replacing an image', async () => {
    const project = selectedProject('medium', 'weather-image')
    const { runtime, state, operations, confirmations } = createRuntime(project, false)
    const result = await toolFor(project, 'widgetr_replace_image').execute({
      expectedRevision: 1,
      scope: { kind: 'one', size: 'medium' },
      source: { kind: 'literal', value: '/new-reference.png' },
      alt: 'A new reference image'
    }, { signal: signal() }, runtime)

    expect(result).toMatchObject({
      ok: false,
      code: 'CONFIRMATION_REQUIRED',
      confirmed: false,
      revision: 1
    })
    expect(confirmations).toEqual(['Confirm image replacement'])
    expect(operations).toHaveLength(0)
    const image = state.project.layouts.medium.root.children.find(element => element.id === 'weather-image')
    expect(image?.type).toBe('image')
    if (image?.type === 'image') {
      expect(image.source).toEqual({
        kind: 'binding',
        bindingId: 'hero-image',
        fallback: '/sample-monsoon.svg'
      })
    }
  })

  it('routes group ordering through the canonical reorder operation', async () => {
    const project = selectedProject('large', 'header')
    const { runtime, state, operations } = createRuntime(project)
    const result = await toolFor(project, 'widgetr_reorder_group').execute({
      expectedRevision: 1,
      scope: { kind: 'one', size: 'large' },
      childId: 'location',
      toIndex: 2
    }, { signal: signal() }, runtime)

    expect(result).toMatchObject({
      ok: true,
      revision: 2,
      changedSizes: ['large']
    })
    expect(operations[0]).toMatchObject({
      type: 'reorder-children',
      elementId: 'header',
      childId: 'location',
      toIndex: 2
    })
    const header = state.project.layouts.large.root.children.find(element => element.id === 'header')
    expect(header?.type).toBe('group')
    if (header?.type === 'group') {
      expect(header.children.map(child => child.id)).toEqual([
        'header-spacer',
        'updated',
        'location'
      ])
    }
  })

  it('uses the same export generator and exposes bounded source output', async () => {
    const project = createSampleWidgetProject()
    const { runtime } = createRuntime(project)
    const result = await toolFor(project, 'widgetr_export').execute({}, { signal: signal() }, runtime)
    const expected = generateScriptableCode(project)

    expect(result).toMatchObject({
      ok: true,
      revision: 0,
      ready: true,
      sourceIncluded: false,
      sourceLength: expected.code?.length
    })
    if (expected.code) {
      expect((result as { sourcePreview?: string }).sourcePreview).toBe(expected.code.slice(0, 800))
    }
  })

  it('registers the current descriptor set through a model context', async () => {
    const project = selectedProject('small', 'temperature')
    const { runtime } = createRuntime(project)
    const registered: WebMcpTool[] = []
    const modelContext: WebMcpModelContext = {
      registerTool: async tool => {
        registered.push(tool)
        return undefined
      }
    }
    const controller = new AbortController()

    const names = await registerWebMcpToolSet(
      modelContext,
      createWebMcpToolCatalog(project),
      runtime,
      shallowRef(project),
      controller.signal
    )

    expect(names).toEqual(getWebMcpToolNames(project))
    expect(registered.map(tool => tool.name)).toEqual(names)
    expect(registered.every(tool => tool.inputSchema.type === 'object')).toBe(true)
  })

  it('stops publishing a descriptor set when its registration signal aborts', async () => {
    const project = createSampleWidgetProject()
    const { runtime } = createRuntime(project)
    const controller = new AbortController()
    let registeredCount = 0
    const modelContext: WebMcpModelContext = {
      registerTool: async () => {
        registeredCount += 1
        controller.abort()
        return undefined
      }
    }

    const names = await registerWebMcpToolSet(
      modelContext,
      createWebMcpToolCatalog(project),
      runtime,
      shallowRef(project),
      controller.signal
    )

    expect(registeredCount).toBe(1)
    expect(names).toEqual([])
  })

  it('returns an explicit output-limit result for oversized payloads', () => {
    const result = JSON.parse(serializeWebMcpResult({
      ok: true,
      source: 'x'.repeat(30000)
    })) as { ok: boolean, code: string }

    expect(result).toEqual(expect.objectContaining({
      ok: false,
      code: 'OUTPUT_LIMIT'
    }))
  })
})

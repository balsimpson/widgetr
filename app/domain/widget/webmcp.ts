import { z } from 'zod'
import { WIDGET_CONSTRAINTS } from './constraints'
import { WIDGET_STARTERS } from './starters'
import { findWidgetElement, widgetElementLabel } from './tree'
import {
  VISUAL_DATA_ELEMENT_TYPES,
  createVisualDataElement,
  isVisualDataElement
} from './visual-data'
import {
  designScopeSchema,
  numericSourceSchema,
  progressRingDatumSchema,
  seriesSourceSchema,
  valueSourceSchema,
  widgetBackgroundSchema
} from './schema'
import type {
  DesignScope,
  VisualDataElementType,
  OperationResult,
  UpdateElementContentOperation,
  ValueSource,
  JsonObject,
  WidgetElement,
  WidgetOperation,
  WidgetProject,
  WidgetStarterId,
  WidgetSize
} from '~/types/widget'
import { WIDGET_SIZES } from '~/types/widget'
import type {
  WebMcpContext,
  WebMcpJsonSchema,
  WebMcpRuntime,
  WebMcpToolDescriptor,
  WebMcpToolPayload
} from '~/types/webmcp'

export const WEBMCP_MAX_INPUT_CHARS = 12000
export const WEBMCP_MAX_OUTPUT_CHARS = 28000
export const WEBMCP_MAX_SOURCE_CHARS = 24000
export const WEBMCP_MAX_TEXT_LENGTH = 500

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/
const toolTextSchema = z.string().trim().max(WEBMCP_MAX_TEXT_LENGTH)
const toolColorSchema = z.string().regex(HEX_COLOR_PATTERN, 'Use a six-digit hex color such as #1A2B3C')
const expectedRevisionSchema = z.number().int().nonnegative()
const widgetSizeSchema = z.enum(['small', 'medium', 'large'])
const alignmentSchema = z.enum(['leading', 'center', 'trailing'])
const verticalAlignmentSchema = z.enum(['top', 'center', 'bottom'])
const dimensionSchema = z.union([
  z.number().finite().positive().max(400),
  z.literal('fill'),
  z.literal('fit')
])
const edgeInsetsInputSchema = z.object({
  top: z.number().finite().min(WIDGET_CONSTRAINTS.padding.min).max(WIDGET_CONSTRAINTS.padding.max),
  right: z.number().finite().min(WIDGET_CONSTRAINTS.padding.min).max(WIDGET_CONSTRAINTS.padding.max),
  bottom: z.number().finite().min(WIDGET_CONSTRAINTS.padding.min).max(WIDGET_CONSTRAINTS.padding.max),
  left: z.number().finite().min(WIDGET_CONSTRAINTS.padding.min).max(WIDGET_CONSTRAINTS.padding.max)
}).strict()
const borderInputSchema = z.object({
  color: toolColorSchema,
  width: z.number().finite().min(WIDGET_CONSTRAINTS.borderWidth.min).max(WIDGET_CONSTRAINTS.borderWidth.max)
}).strict()

const boundedValueSourceSchema = valueSourceSchema.superRefine((source, context) => {
  const values = source.kind === 'literal'
    ? [source.value]
    : [source.fallback, source.format?.prefix ?? '', source.format?.suffix ?? '']

  if (values.some(value => value.length > WEBMCP_MAX_TEXT_LENGTH)) {
    context.addIssue({
      code: 'custom',
      message: `Text values must be ${WEBMCP_MAX_TEXT_LENGTH} characters or fewer.`
    })
  }
})

const scopeJsonSchema: WebMcpJsonSchema = {
  type: 'object',
  oneOf: [
    {
      type: 'object',
      properties: {
        kind: { type: 'string', const: 'one' },
        size: { type: 'string', enum: ['small', 'medium', 'large'] }
      },
      required: ['kind', 'size'],
      additionalProperties: false
    },
    {
      type: 'object',
      properties: {
        kind: { type: 'string', const: 'several' },
        sizes: {
          type: 'array',
          items: { type: 'string', enum: ['small', 'medium', 'large'] },
          minItems: 2,
          maxItems: 2
        }
      },
      required: ['kind', 'sizes'],
      additionalProperties: false
    },
    {
      type: 'object',
      properties: {
        kind: { type: 'string', const: 'all' }
      },
      required: ['kind'],
      additionalProperties: false
    }
  ],
  description: 'Choose one size, two different sizes, or all three sizes.'
}

const valueSourceJsonSchema: WebMcpJsonSchema = {
  type: 'object',
  oneOf: [
    {
      type: 'object',
      properties: {
        kind: { type: 'string', const: 'literal' },
        value: { type: 'string', maxLength: WEBMCP_MAX_TEXT_LENGTH }
      },
      required: ['kind', 'value'],
      additionalProperties: false
    },
    {
      type: 'object',
      properties: {
        kind: { type: 'string', const: 'binding' },
        bindingId: { type: 'string', minLength: 1, maxLength: 80 },
        fallback: { type: 'string', maxLength: WEBMCP_MAX_TEXT_LENGTH },
        format: {
          type: 'object',
          properties: {
            prefix: { type: 'string', maxLength: 40 },
            suffix: { type: 'string', maxLength: 40 },
            transform: { type: 'string', enum: ['weekday', 'time', 'integer', 'weather-code'] }
          },
          required: ['prefix', 'suffix'],
          additionalProperties: false
        }
      },
      required: ['kind', 'bindingId', 'fallback'],
      additionalProperties: false
    },
    {
      type: 'object',
      properties: {
        kind: { type: 'string', const: 'item' },
        path: {
          type: 'array',
          items: {
            oneOf: [
              { type: 'string', minLength: 1, maxLength: 120 },
              { type: 'integer', minimum: 0 }
            ]
          },
          maxItems: 24
        },
        fallback: { type: 'string', maxLength: WEBMCP_MAX_TEXT_LENGTH },
        format: {
          type: 'object',
          properties: {
            prefix: { type: 'string', maxLength: 40 },
            suffix: { type: 'string', maxLength: 40 },
            transform: { type: 'string', enum: ['weekday', 'time', 'integer', 'weather-code'] }
          },
          required: ['prefix', 'suffix'],
          additionalProperties: false
        }
      },
      required: ['kind', 'path', 'fallback'],
      additionalProperties: false
    }
  ]
}

const numericSourceJsonSchema: WebMcpJsonSchema = {
  type: 'object',
  oneOf: [
    {
      type: 'object',
      properties: {
        kind: { type: 'string', const: 'literal' },
        value: { type: 'number' }
      },
      required: ['kind', 'value'],
      additionalProperties: false
    },
    {
      type: 'object',
      properties: {
        kind: { type: 'string', const: 'binding' },
        bindingId: { type: 'string', minLength: 1, maxLength: 80 },
        fallback: { type: 'number' }
      },
      required: ['kind', 'bindingId', 'fallback'],
      additionalProperties: false
    },
    {
      type: 'object',
      properties: {
        kind: { type: 'string', const: 'item' },
        path: {
          type: 'array',
          items: {
            oneOf: [
              { type: 'string', minLength: 1, maxLength: 120 },
              { type: 'integer', minimum: 0 }
            ]
          },
          maxItems: 24
        },
        fallback: { type: 'number' }
      },
      required: ['kind', 'path', 'fallback'],
      additionalProperties: false
    }
  ]
}

const seriesSourceJsonSchema: WebMcpJsonSchema = {
  type: 'object',
  oneOf: [
    {
      type: 'object',
      properties: {
        kind: { type: 'string', const: 'literal' },
        value: {
          type: 'array',
          items: { type: 'number' },
          maxItems: WIDGET_CONSTRAINTS.visualData.maxSeriesPoints
        }
      },
      required: ['kind', 'value'],
      additionalProperties: false
    },
    {
      type: 'object',
      properties: {
        kind: { type: 'string', const: 'binding' },
        bindingId: { type: 'string', minLength: 1, maxLength: 80 },
        fallback: {
          type: 'array',
          items: { type: 'number' },
          maxItems: WIDGET_CONSTRAINTS.visualData.maxSeriesPoints
        }
      },
      required: ['kind', 'bindingId', 'fallback'],
      additionalProperties: false
    },
    {
      type: 'object',
      properties: {
        kind: { type: 'string', const: 'item' },
        path: {
          type: 'array',
          items: {
            oneOf: [
              { type: 'string', minLength: 1, maxLength: 120 },
              { type: 'integer', minimum: 0 }
            ]
          },
          maxItems: 24
        },
        fallback: {
          type: 'array',
          items: { type: 'number' },
          maxItems: WIDGET_CONSTRAINTS.visualData.maxSeriesPoints
        }
      },
      required: ['kind', 'path', 'fallback'],
      additionalProperties: false
    }
  ]
}

const visualDataTypeJsonSchema: WebMcpJsonSchema = {
  type: 'string',
  enum: [...VISUAL_DATA_ELEMENT_TYPES]
}

const progressRingJsonSchema: WebMcpJsonSchema = objectJsonSchema({
  id: { type: 'string', minLength: 1, maxLength: 80 },
  value: numericSourceJsonSchema,
  min: { type: 'number' },
  max: { type: 'number' },
  trackColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
  fillColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' }
}, ['id', 'value', 'min', 'max', 'trackColor', 'fillColor'])

const backgroundJsonSchema: WebMcpJsonSchema = {
  type: 'object',
  oneOf: [
    {
      type: 'object',
      properties: {
        kind: { type: 'string', const: 'solid' },
        color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        opacity: { type: 'number', minimum: 0, maximum: 1 }
      },
      required: ['kind', 'color', 'opacity'],
      additionalProperties: false
    },
    {
      type: 'object',
      properties: {
        kind: { type: 'string', const: 'gradient' },
        colors: {
          type: 'array',
          items: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          minItems: 2,
          maxItems: 4
        },
        direction: { type: 'string', enum: ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] },
        opacity: { type: 'number', minimum: 0, maximum: 1 }
      },
      required: ['kind', 'colors', 'direction', 'opacity'],
      additionalProperties: false
    },
    {
      type: 'object',
      properties: {
        kind: { type: 'string', const: 'image' },
        source: valueSourceJsonSchema,
        fit: { type: 'string', enum: ['cover', 'contain', 'fill'] },
        overlayColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        overlayOpacity: { type: 'number', minimum: 0, maximum: 1 }
      },
      required: ['kind', 'source', 'fit', 'overlayColor', 'overlayOpacity'],
      additionalProperties: false
    }
  ]
}

const baseProperties: Record<string, WebMcpJsonSchema> = {
  expectedRevision: {
    type: 'integer',
    minimum: 0,
    description: 'The revision returned by the latest Widgetr context result.'
  },
  scope: scopeJsonSchema
}

function operationJsonSchema(
  properties: Record<string, WebMcpJsonSchema>,
  required: string[]
): WebMcpJsonSchema {
  return {
    type: 'object',
    properties: {
      ...baseProperties,
      ...properties
    },
    required: [...new Set(['expectedRevision', 'scope', ...required])],
    additionalProperties: false
  }
}

function objectJsonSchema(
  properties: Record<string, WebMcpJsonSchema>,
  required: string[] = []
): WebMcpJsonSchema {
  return {
    type: 'object',
    properties,
    required,
    additionalProperties: false
  }
}

const selectElementInputSchema = z.object({
  expectedRevision: expectedRevisionSchema,
  size: widgetSizeSchema,
  elementId: z.string().trim().min(1).max(80)
}).strict()

const clearSelectionInputSchema = z.object({
  expectedRevision: expectedRevisionSchema
}).strict()

const emptyInputSchema = z.object({}).strict()

const creatableStarterIds = WIDGET_STARTERS
  .filter(starter => starter.action === 'create')
  .map(starter => starter.id)

const starterIdSchema = z.string().trim().refine(
  value => WIDGET_STARTERS.some(starter => starter.action === 'create' && starter.id === value),
  'Choose one of Widgetr\'s listed starting ideas.'
).transform(value => value as WidgetStarterId)

const createWidgetInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  starterId: starterIdSchema.optional()
}).strict()

const publicDataSourceInputSchema = z.object({
  expectedRevision: expectedRevisionSchema,
  url: z.url().refine(url => new URL(url).protocol === 'https:', 'Use an https URL.'),
  refreshMinutes: z.number().int().min(5).max(360).default(30)
}).strict()

const dataBindingInputSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  path: z.array(z.union([
    z.string().trim().min(1).max(80),
    z.number().int().nonnegative().max(100)
  ])).min(1).max(8),
  valueType: z.enum(['string', 'number', 'boolean', 'date', 'image-url', 'list', 'object'])
}).strict()

const dataBindingsInputSchema = z.object({
  expectedRevision: expectedRevisionSchema,
  bindings: z.array(dataBindingInputSchema).min(1).max(100)
    .refine(bindings => new Set(bindings.map(binding => binding.id)).size === bindings.length, 'Binding ids must be unique.')
}).strict()

type FieldSummary = {
  path: Array<string | number>
  valueType: 'string' | 'number' | 'boolean' | 'list' | 'object'
  example: string
}

function summarizePublicJson(value: unknown, path: Array<string | number> = [], depth = 0): FieldSummary[] {
  if (depth >= 3 || value === null || typeof value !== 'object') {
    const valueType = Array.isArray(value)
      ? 'list'
      : typeof value === 'boolean'
        ? 'boolean'
        : typeof value === 'number'
          ? 'number'
          : 'string'
    return [{
      path,
      valueType,
      example: String(value).slice(0, 160)
    }]
  }

  if (Array.isArray(value)) {
    const summary: FieldSummary[] = [{
      path,
      valueType: 'list',
      example: `${value.length} items`
    }]
    if (value.length > 0) {
      summary.push(...summarizePublicJson(value[0], [...path, 0], depth + 1))
    }
    return summary
  }

  const entries = Object.entries(value).slice(0, 20)
  if (entries.length === 0) {
    return [{ path, valueType: 'object', example: 'Empty object' }]
  }
  return entries.flatMap(([key, child]) => summarizePublicJson(child, [...path, key], depth + 1))
}

const designScopeInputSchema = z.object({
  expectedRevision: expectedRevisionSchema,
  scope: designScopeSchema
}).strict()

const backgroundInputSchema = z.object({
  expectedRevision: expectedRevisionSchema,
  scope: designScopeSchema,
  background: widgetBackgroundSchema
}).strict()

const textContentInputSchema = z.object({
  expectedRevision: expectedRevisionSchema,
  scope: designScopeSchema,
  value: boundedValueSourceSchema
}).strict()

const typographyInputSchema = z.object({
  expectedRevision: expectedRevisionSchema,
  scope: designScopeSchema,
  fontSize: z.number().finite().min(WIDGET_CONSTRAINTS.fontSize.min).max(WIDGET_CONSTRAINTS.fontSize.max).optional(),
  fontWeight: z.enum(['regular', 'medium', 'semibold', 'bold']).optional(),
  fontDesign: z.enum(['default', 'rounded', 'monospaced', 'serif']).optional(),
  color: toolColorSchema.optional(),
  alignment: alignmentSchema.optional(),
  lineLimit: z.number().int().min(WIDGET_CONSTRAINTS.lineLimit.min).max(WIDGET_CONSTRAINTS.lineLimit.max).optional(),
  minimumScaleFactor: z.number().finite().min(WIDGET_CONSTRAINTS.minimumScaleFactor.min).max(WIDGET_CONSTRAINTS.minimumScaleFactor.max).optional(),
  italic: z.boolean().optional()
}).strict().refine(
  input => Object.keys(input).some(key => !['expectedRevision', 'scope'].includes(key)),
  'Include at least one typography property.'
)

const resizeInputSchema = z.object({
  expectedRevision: expectedRevisionSchema,
  scope: designScopeSchema,
  width: dimensionSchema.optional(),
  height: dimensionSchema.optional()
}).strict().refine(
  input => input.width !== undefined || input.height !== undefined,
  'Include width, height, or both.'
)

const alignInputSchema = z.object({
  expectedRevision: expectedRevisionSchema,
  scope: designScopeSchema,
  alignment: alignmentSchema
}).strict()

const restyleInputSchema = z.object({
  expectedRevision: expectedRevisionSchema,
  scope: designScopeSchema,
  opacity: z.number().finite().min(WIDGET_CONSTRAINTS.opacity.min).max(WIDGET_CONSTRAINTS.opacity.max).optional(),
  padding: edgeInsetsInputSchema.optional(),
  cornerRadius: z.number().finite().min(WIDGET_CONSTRAINTS.cornerRadius.min).max(WIDGET_CONSTRAINTS.cornerRadius.max).optional(),
  border: borderInputSchema.nullable().optional(),
  background: widgetBackgroundSchema.nullable().optional(),
  width: dimensionSchema.optional(),
  height: dimensionSchema.optional(),
  alignSelf: alignmentSchema.optional()
}).strict().refine(
  input => Object.keys(input).some(key => !['expectedRevision', 'scope'].includes(key)),
  'Include at least one style property.'
)

const cropInputSchema = z.object({
  expectedRevision: expectedRevisionSchema,
  scope: designScopeSchema,
  x: z.number().finite().min(WIDGET_CONSTRAINTS.imageCrop.min).max(WIDGET_CONSTRAINTS.imageCrop.max),
  y: z.number().finite().min(WIDGET_CONSTRAINTS.imageCrop.min).max(WIDGET_CONSTRAINTS.imageCrop.max)
}).strict()

const imageTreatmentInputSchema = z.object({
  expectedRevision: expectedRevisionSchema,
  scope: designScopeSchema,
  fit: z.enum(['cover', 'contain', 'fill'])
}).strict()

const replaceImageInputSchema = z.object({
  expectedRevision: expectedRevisionSchema,
  scope: designScopeSchema,
  source: boundedValueSourceSchema,
  alt: toolTextSchema.optional()
}).strict()

const spacingInputSchema = z.object({
  expectedRevision: expectedRevisionSchema,
  scope: designScopeSchema,
  spacing: z.number().finite().min(WIDGET_CONSTRAINTS.spacing.min).max(WIDGET_CONSTRAINTS.spacing.max)
}).strict()

const groupAlignmentInputSchema = z.object({
  expectedRevision: expectedRevisionSchema,
  scope: designScopeSchema,
  horizontalAlignment: alignmentSchema.optional(),
  verticalAlignment: verticalAlignmentSchema.optional()
}).strict().refine(
  input => input.horizontalAlignment !== undefined || input.verticalAlignment !== undefined,
  'Include horizontalAlignment, verticalAlignment, or both.'
)

const groupDirectionInputSchema = z.object({
  expectedRevision: expectedRevisionSchema,
  scope: designScopeSchema,
  direction: z.enum(['horizontal', 'vertical'])
}).strict()

const groupDistributionInputSchema = z.object({
  expectedRevision: expectedRevisionSchema,
  scope: designScopeSchema,
  distribution: z.enum(['start', 'center', 'end', 'space-between'])
}).strict()

const reorderInputSchema = z.object({
  expectedRevision: expectedRevisionSchema,
  scope: designScopeSchema,
  childId: z.string().trim().min(1).max(80),
  toIndex: z.number().int().nonnegative().max(WIDGET_CONSTRAINTS.tree.maxElementsPerLayout - 1)
}).strict()

const visualDataTypeSchema = z.enum(VISUAL_DATA_ELEMENT_TYPES)
const progressRingListSchema = z.array(progressRingDatumSchema)
  .min(1)
  .max(WIDGET_CONSTRAINTS.visualData.maxRings)
  .refine(
    rings => new Set(rings.map(ring => ring.id)).size === rings.length,
    'Progress ring ids must be unique.'
  )

const visualInsertInputSchema = z.object({
  expectedRevision: expectedRevisionSchema,
  scope: designScopeSchema,
  type: visualDataTypeSchema,
  parentId: z.string().trim().min(1).max(80).optional(),
  index: z.number().int().nonnegative().max(WIDGET_CONSTRAINTS.tree.maxElementsPerLayout - 1).optional()
}).strict()

const visualConfigureInputSchema = z.object({
  expectedRevision: expectedRevisionSchema,
  scope: designScopeSchema,
  numericValue: numericSourceSchema.optional(),
  series: seriesSourceSchema.optional(),
  rings: progressRingListSchema.optional(),
  size: z.number().finite()
    .min(WIDGET_CONSTRAINTS.visualData.ringSize.min)
    .max(WIDGET_CONSTRAINTS.visualData.ringSize.max)
    .optional(),
  min: z.number().finite().optional(),
  max: z.number().finite().optional(),
  trackColor: toolColorSchema.optional(),
  fillColor: toolColorSchema.nullable().optional(),
  thickness: z.number().finite()
    .min(WIDGET_CONSTRAINTS.visualData.chartThickness.min)
    .max(WIDGET_CONSTRAINTS.visualData.progressBarThickness.max)
    .optional(),
  centerLabel: boundedValueSourceSchema.nullable().optional(),
  density: z.enum(['compact', 'balanced', 'detailed']).optional(),
  lineColor: toolColorSchema.optional(),
  barColor: toolColorSchema.optional(),
  gap: z.number().finite()
    .min(WIDGET_CONSTRAINTS.visualData.chartGap.min)
    .max(WIDGET_CONSTRAINTS.visualData.chartGap.max)
    .optional()
}).strict().refine(
  input => Object.keys(input).some(key => !['expectedRevision', 'scope'].includes(key)),
  'Include at least one visual-data property.'
)

const visualRemoveInputSchema = z.object({
  expectedRevision: expectedRevisionSchema,
  scope: designScopeSchema
}).strict()

type ToolInputResult<T> =
  | { ok: true, value: T }
  | { ok: false, message: string }

function serializeInput(input: unknown): string | null {
  try {
    const serialized = JSON.stringify(input)
    return serialized === undefined ? null : serialized
  } catch {
    return null
  }
}

function parseToolInput<T>(schema: z.ZodType<T>, input: unknown): ToolInputResult<T> {
  const serialized = serializeInput(input)
  if (!serialized) {
    return { ok: false, message: 'Tool input must be JSON-serializable.' }
  }
  if (serialized.length > WEBMCP_MAX_INPUT_CHARS) {
    return { ok: false, message: `Tool input must be ${WEBMCP_MAX_INPUT_CHARS} characters or fewer.` }
  }

  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues
        .map(issue => `${issue.path.join('.') || 'input'}: ${issue.message}`)
        .join(' ')
    }
  }

  return { ok: true, value: parsed.data }
}

function errorPayload(
  runtime: WebMcpRuntime,
  code: string,
  message: string,
  extra: WebMcpToolPayload = {}
): WebMcpToolPayload {
  return {
    ok: false,
    code,
    revision: runtime.getProject().revision,
    changedSizes: [],
    warnings: [],
    selection: runtime.getProject().selection,
    message,
    ...extra
  }
}

function operationPayload(result: OperationResult): WebMcpToolPayload {
  if (!result.ok) {
    return {
      ok: false,
      code: result.code,
      revision: result.revision,
      changedSizes: result.changedSizes,
      warnings: result.warnings,
      selection: result.selection,
      message: result.message
    }
  }

  return {
    ok: true,
    revision: result.revision,
    changedSizes: result.changedSizes,
    warnings: result.warnings,
    selection: result.selection,
    message: result.message
  }
}

function parseOrError<T>(
  schema: z.ZodType<T>,
  input: unknown,
  runtime: WebMcpRuntime
): { ok: true, value: T } | { ok: false, payload: WebMcpToolPayload } {
  const parsed = parseToolInput(schema, input)
  if (!parsed.ok) {
    return {
      ok: false,
      payload: errorPayload(runtime, 'INVALID_INPUT', parsed.message)
    }
  }
  return parsed
}

function selectedTarget(
  runtime: WebMcpRuntime,
  acceptedTypes: WidgetElement['type'][]
): { ok: true, element: WidgetElement } | { ok: false, payload: WebMcpToolPayload } {
  const project = runtime.getProject()
  if (!project.selection) {
    return {
      ok: false,
      payload: errorPayload(runtime, 'SELECTION_REQUIRED', 'Select an element before using this tool.')
    }
  }

  const element = findWidgetElement(
    project.layouts[project.selection.size].root,
    project.selection.elementId
  )
  if (!element) {
    return {
      ok: false,
      payload: errorPayload(runtime, 'SELECTION_STALE', 'The selected element no longer exists. Read the current context and select it again.')
    }
  }

  if (!acceptedTypes.includes(element.type)) {
    return {
      ok: false,
      payload: errorPayload(
        runtime,
        'TARGET_TYPE_MISMATCH',
        `${widgetElementLabel(element)} does not support this tool in the current context.`
      )
    }
  }

  return { ok: true, element }
}

function descriptor(
  input: Omit<WebMcpToolDescriptor, 'execute'> & {
    execute: WebMcpToolDescriptor['execute']
  }
): WebMcpToolDescriptor {
  return input
}

function mutationAnnotations(destructive = false, untrustedContent = false) {
  return {
    readOnlyHint: false,
    destructiveHint: destructive,
    idempotentHint: false,
    openWorldHint: false,
    untrustedContentHint: untrustedContent
  }
}

function readOnlyAnnotations() {
  return {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
  }
}

function sharedTools(): WebMcpToolDescriptor[] {
  return [
    descriptor({
      name: 'widgetr_get_context',
      title: 'Read Widgetr editor context',
      description: 'Read the current Widgetr revision, selection, design scope, available contextual tools, and a bounded selected-element summary.',
      inputSchema: objectJsonSchema({}),
      annotations: readOnlyAnnotations(),
      execute: (_input, _context, runtime) => {
        const parsed = parseOrError(emptyInputSchema, _input, runtime)
        if (!parsed.ok) {
          return parsed.payload
        }

        const project = runtime.getProject()
        const element = project.selection
          ? findWidgetElement(project.layouts[project.selection.size].root, project.selection.elementId)
          : null
        const context = getWebMcpContext(project)

        return {
          ok: true,
          revision: project.revision,
          startingIntent: project.startingIntent ?? null,
          data: {
            sourceKind: project.dataSource.kind,
            sourceUrl: project.dataSource.url,
            state: project.data.kind,
            label: project.data.label,
            bindingCount: project.bindings.length
          },
          selection: project.selection,
          designScope: project.designScope,
          context,
          availableTools: getWebMcpToolNames(project),
          selectedElement: element
            ? {
                id: element.id,
                type: element.type,
                label: widgetElementLabel(element),
                childCount: element.type === 'group' || element.type === 'repeat'
                  ? element.children.length
                  : undefined
              }
            : null
        }
      }
    }),
    descriptor({
      name: 'widgetr_export',
      title: 'Export Widgetr widget',
      description: 'Run the current Widgetr export preflight and return bounded diagnostics and generated Scriptable source when it fits the tool output limit.',
      inputSchema: objectJsonSchema({}),
      annotations: readOnlyAnnotations(),
      execute: (_input, _context, runtime) => {
        const parsed = parseOrError(emptyInputSchema, _input, runtime)
        if (!parsed.ok) {
          return parsed.payload
        }

        const project = runtime.getProject()
        const exportResult = runtime.getExport()
        const source = exportResult.code
        const blockingIssues = exportResult.issues.filter(issue => issue.severity === 'blocking')
        const issues = exportResult.issues.map(issue => ({
          id: issue.id,
          severity: issue.severity,
          code: issue.code,
          message: issue.message,
          recovery: issue.recovery,
          size: issue.size,
          elementId: issue.elementId
        }))
        const sourceIncluded = source !== null && source.length <= WEBMCP_MAX_SOURCE_CHARS

        return {
          ok: blockingIssues.length === 0,
          code: blockingIssues.length > 0 ? 'EXPORT_BLOCKED' : undefined,
          revision: project.revision,
          ready: source !== null,
          issues,
          sourceLength: source?.length ?? 0,
          sourceIncluded,
          source: sourceIncluded ? source : undefined,
          sourcePreview: source && !sourceIncluded ? source.slice(0, 800) : undefined,
          message: blockingIssues.length > 0
            ? 'Export is blocked by preflight diagnostics.'
            : source
              ? 'Export is ready.'
              : 'No Scriptable source was generated.'
        }
      }
    }),
    descriptor({
      name: 'widgetr_select_element',
      title: 'Select a Widgetr element',
      description: 'Select an existing element in one widget-size layout so Widgetr can expose tools for that element type.',
      inputSchema: objectJsonSchema({
        expectedRevision: {
          type: 'integer',
          minimum: 0,
          description: 'The revision returned by the latest Widgetr context result.'
        },
        size: { type: 'string', enum: ['small', 'medium', 'large'] },
        elementId: { type: 'string', minLength: 1, maxLength: 80 }
      }, ['expectedRevision', 'size', 'elementId']),
      annotations: mutationAnnotations(),
      execute: (_input, _context, runtime) => {
        const parsed = parseOrError(selectElementInputSchema, _input, runtime)
        if (!parsed.ok) {
          return parsed.payload
        }

        const project = runtime.getProject()
        const target = findWidgetElement(project.layouts[parsed.value.size].root, parsed.value.elementId)
        if (!target) {
          return errorPayload(
            runtime,
            'TARGET_NOT_FOUND',
            `${parsed.value.elementId} was not found in the ${parsed.value.size} layout.`
          )
        }

        return operationPayload(runtime.commitOperation({
          type: 'set-selection',
          expectedRevision: parsed.value.expectedRevision,
          selection: {
            size: parsed.value.size,
            elementId: parsed.value.elementId
          }
        }))
      }
    }),
    descriptor({
      name: 'widgetr_clear_selection',
      title: 'Clear Widgetr selection',
      description: 'Clear the current selection so Widgetr can expose project-level tools.',
      inputSchema: objectJsonSchema({
        expectedRevision: {
          type: 'integer',
          minimum: 0,
          description: 'The revision returned by the latest Widgetr context result.'
        }
      }, ['expectedRevision']),
      annotations: mutationAnnotations(),
      execute: (_input, _context, runtime) => {
        const parsed = parseOrError(clearSelectionInputSchema, _input, runtime)
        if (!parsed.ok) {
          return parsed.payload
        }

        return operationPayload(runtime.commitOperation({
          type: 'set-selection',
          expectedRevision: parsed.value.expectedRevision,
          selection: null
        }))
      }
    })
  ]
}

function getStartedTool(studioUrl: string): WebMcpToolDescriptor {
  return descriptor({
    name: 'widgetr_get_started',
    title: 'Get started with Widgetr',
    description: 'Read what Widgetr does, where its widget editor is, and which starting paths are available before creating a widget.',
    inputSchema: objectJsonSchema({}),
    annotations: readOnlyAnnotations(),
    execute: (_input, _context, runtime) => {
      const parsed = parseOrError(emptyInputSchema, _input, runtime)
      if (!parsed.ok) {
        return parsed.payload
      }

      return {
        ok: true,
        widgetr: 'Widgetr is a visual workspace for building Scriptable widgets with an AI assistant.',
        studioUrl,
        starters: WIDGET_STARTERS.map(starter => ({
          id: starter.id,
          label: starter.label,
          action: starter.action
        })),
        nextStep: 'Open the widget editor new-project flow and wait for the person to choose a starter. Once they choose one, continue the required questions in the assistant chat.',
        message: 'Widgetr is ready. Let the person choose a starter in the editor, then shape it together there.'
      }
    }
  })
}

function createWidgetTool(): WebMcpToolDescriptor {
  return descriptor({
    name: 'widgetr_create_widget',
    title: 'Create a Widgetr widget',
    description: 'Create a new local Widgetr project from a listed starting idea. This never edits the neutral unsaved project.',
    inputSchema: objectJsonSchema({
      name: { type: 'string', minLength: 1, maxLength: 120, description: 'The new widget name.' },
      starterId: {
        type: 'string',
        enum: creatableStarterIds,
        description: 'Optional listed starting idea to record on the new project.'
      }
    }, ['name']),
    annotations: mutationAnnotations(),
    execute: async (_input, _context, runtime) => {
      const parsed = parseOrError(createWidgetInputSchema, _input, runtime)
      if (!parsed.ok) {
        return parsed.payload
      }

      try {
        const project = await runtime.createProject(parsed.value.name, parsed.value.starterId)
        return {
          ok: true,
          projectId: project.id,
          name: project.name,
          startingIntent: project.startingIntent,
          revision: project.revision,
          changedSizes: [],
          warnings: [],
          selection: project.selection,
          message: `Created the local widget ${project.name}. Open the widget editor and review the starting canvas.`
        }
      } catch (error) {
        return errorPayload(
          runtime,
          'CREATE_FAILED',
          error instanceof Error ? error.message : 'The local widget could not be created.'
        )
      }
    }
  })
}

function connectPublicDataSourceTool(): WebMcpToolDescriptor {
  return descriptor({
    name: 'widgetr_connect_public_data',
    title: 'Connect public JSON data',
    description: 'Fetch one public HTTPS GET JSON endpoint in the browser, save its live response for preview and Scriptable export, and return a bounded catalog of fields for binding. Do not use this for sources that need credentials, headers, or cookies.',
    inputSchema: objectJsonSchema({
      expectedRevision: { type: 'integer', minimum: 0 },
      url: { type: 'string', minLength: 8, maxLength: 2000, pattern: '^https://' },
      refreshMinutes: { type: 'integer', minimum: 5, maximum: 360 }
    }, ['expectedRevision', 'url']),
    annotations: {
      ...mutationAnnotations(),
      openWorldHint: true,
      untrustedContentHint: true
    },
    execute: async (_input, context, runtime) => {
      const parsed = parseOrError(publicDataSourceInputSchema, _input, runtime)
      if (!parsed.ok) {
        return parsed.payload
      }

      let response: Response
      try {
        response = await fetch(parsed.value.url, {
          method: 'GET',
          credentials: 'omit',
          redirect: 'error',
          signal: context.signal
        })
      } catch (error) {
        return errorPayload(
          runtime,
          context.signal.aborted ? 'CANCELLED' : 'BROWSER_FETCH_FAILED',
          context.signal.aborted
            ? 'The data request was cancelled.'
            : 'The browser could not read this source. It may block cross-origin requests, redirect, or be unavailable. Choose a CORS-friendly public JSON endpoint or provide a safe sample response.'
        )
      }

      if (!response.ok) {
        return errorPayload(
          runtime,
          response.status === 429 ? 'RATE_LIMITED' : 'HTTP_ERROR',
          response.status === 429
            ? 'This source rate-limited the browser request. Wait or choose another public source.'
            : `The source returned HTTP ${response.status}. Check the public endpoint and its access requirements.`
        )
      }

      const declaredLength = Number(response.headers.get('content-length') ?? '0')
      if (Number.isFinite(declaredLength) && declaredLength > 200_000) {
        return errorPayload(
          runtime,
          'RESPONSE_TOO_LARGE',
          'This response is too large for a widget data source. Use an endpoint that returns a smaller JSON payload.'
        )
      }

      const body = await response.text()
      if (body.length > 200_000) {
        return errorPayload(
          runtime,
          'RESPONSE_TOO_LARGE',
          'This response is too large for a widget data source. Use an endpoint that returns a smaller JSON payload.'
        )
      }

      let value: unknown
      try {
        value = JSON.parse(body)
      } catch {
        return errorPayload(
          runtime,
          'INVALID_JSON',
          'This source did not return valid JSON. Choose a JSON endpoint or provide a compatible sample response.'
        )
      }

      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return errorPayload(
          runtime,
          'UNSUPPORTED_JSON_ROOT',
          'Widgetr currently needs a JSON object at the top level. Choose a compatible endpoint.'
        )
      }

      const sourceUrl = new URL(parsed.value.url)
      const result = runtime.commitOperation({
        type: 'set-public-data-source',
        expectedRevision: parsed.value.expectedRevision,
        source: {
          kind: 'public-api',
          url: parsed.value.url,
          method: 'GET',
          parameters: [],
          headers: [],
          refreshMinutes: parsed.value.refreshMinutes,
          secretPlaceholders: []
        },
        data: {
          kind: 'live',
          label: `Live data from ${sourceUrl.hostname}`,
          capturedAt: new Date().toISOString(),
          value: value as JsonObject
        }
      })
      const payload = operationPayload(result)
      if (!result.ok) {
        return payload
      }
      return {
        ...payload,
        source: { hostname: sourceUrl.hostname, refreshMinutes: parsed.value.refreshMinutes },
        fields: summarizePublicJson(value).slice(0, 60),
        nextStep: 'Use widgetr_set_data_bindings with the returned field paths, then update any widget text or repeat elements that need those bindings.'
      }
    }
  })
}

function setDataBindingsTool(): WebMcpToolDescriptor {
  return descriptor({
    name: 'widgetr_set_data_bindings',
    title: 'Set Widgetr data bindings',
    description: 'Replace the project binding catalog with fields from the currently connected public JSON source. Use the paths returned by widgetr_connect_public_data.',
    inputSchema: objectJsonSchema({
      expectedRevision: { type: 'integer', minimum: 0 },
      bindings: {
        type: 'array',
        minItems: 1,
        maxItems: 100,
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', minLength: 1, maxLength: 80 },
            label: { type: 'string', minLength: 1, maxLength: 120 },
            path: { type: 'array', minItems: 1, maxItems: 8 },
            valueType: { type: 'string', enum: ['string', 'number', 'boolean', 'date', 'image-url', 'list', 'object'] }
          },
          required: ['id', 'label', 'path', 'valueType'],
          additionalProperties: false
        }
      }
    }, ['expectedRevision', 'bindings']),
    annotations: mutationAnnotations(),
    execute: (_input, _context, runtime) => {
      const parsed = parseOrError(dataBindingsInputSchema, _input, runtime)
      if (!parsed.ok) {
        return parsed.payload
      }
      return operationPayload(runtime.commitOperation({
        type: 'set-data-bindings',
        expectedRevision: parsed.value.expectedRevision,
        bindings: parsed.value.bindings
      }))
    }
  })
}

export function createHomepageWebMcpToolCatalog(studioUrl: string): WebMcpToolDescriptor[] {
  return [getStartedTool(studioUrl)]
}

export function createStarterWebMcpToolCatalog(studioUrl: string): WebMcpToolDescriptor[] {
  return [getStartedTool(studioUrl), createWidgetTool()]
}

function nextVisualElementId(project: WidgetProject, type: VisualDataElementType): string {
  const base = `visual-${type}`
  let suffix = 1
  let candidate = `${base}-${suffix}`
  while (WIDGET_SIZES.some(size => findWidgetElement(project.layouts[size].root, candidate))) {
    suffix += 1
    candidate = `${base}-${suffix}`
  }
  return candidate
}

function visualInsertTool(): WebMcpToolDescriptor {
  return descriptor({
    name: 'widgetr_insert_visual_data',
    title: 'Insert a Widgetr visual-data element',
    description: 'Insert a bounded progress ring, progress bar, sparkline, or bar chart into the selected group or the layout root.',
    inputSchema: operationJsonSchema({
      type: visualDataTypeJsonSchema,
      parentId: { type: 'string', minLength: 1, maxLength: 80, description: 'Optional group or repeat id. Defaults to the selected group or layout root.' },
      index: { type: 'integer', minimum: 0, maximum: WIDGET_CONSTRAINTS.tree.maxElementsPerLayout - 1 }
    }, ['scope', 'type']),
    annotations: mutationAnnotations(),
    execute: (_input, _context, runtime) => {
      const parsed = parseOrError(visualInsertInputSchema, _input, runtime)
      if (!parsed.ok) {
        return parsed.payload
      }

      const project = runtime.getProject()
      const targetSize = resolveDesignScope(parsed.value.scope)[0]!
      const parentId = parsed.value.parentId
        ?? project.selection?.elementId
        ?? project.layouts[targetSize].root.id
      const element = createVisualDataElement(
        parsed.value.type,
        nextVisualElementId(project, parsed.value.type)
      )

      return operationPayload(runtime.commitOperation({
        type: 'insert-element',
        expectedRevision: parsed.value.expectedRevision,
        parentId,
        element,
        index: parsed.value.index,
        scope: parsed.value.scope
      }))
    }
  })
}

const visualConfigureJsonProperties: Record<string, WebMcpJsonSchema> = {
  numericValue: numericSourceJsonSchema,
  series: seriesSourceJsonSchema,
  rings: {
    type: 'array',
    items: progressRingJsonSchema,
    minItems: 1,
    maxItems: WIDGET_CONSTRAINTS.visualData.maxRings
  },
  size: {
    type: 'number',
    minimum: WIDGET_CONSTRAINTS.visualData.ringSize.min,
    maximum: WIDGET_CONSTRAINTS.visualData.ringSize.max
  },
  min: { type: 'number' },
  max: { type: 'number' },
  trackColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
  fillColor: {
    oneOf: [
      { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
      { type: 'null' }
    ]
  },
  thickness: {
    type: 'number',
    minimum: WIDGET_CONSTRAINTS.visualData.chartThickness.min,
    maximum: WIDGET_CONSTRAINTS.visualData.progressBarThickness.max
  },
  centerLabel: {
    oneOf: [valueSourceJsonSchema, { type: 'null' }]
  },
  density: { type: 'string', enum: ['compact', 'balanced', 'detailed'] },
  lineColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
  barColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
  gap: {
    type: 'number',
    minimum: WIDGET_CONSTRAINTS.visualData.chartGap.min,
    maximum: WIDGET_CONSTRAINTS.visualData.chartGap.max
  }
}

const visualConfigurePatchKeys: Record<VisualDataElementType, readonly string[]> = {
  'progress-ring': ['rings', 'size', 'thickness', 'centerLabel'],
  'progress-bar': ['numericValue', 'min', 'max', 'trackColor', 'fillColor', 'thickness'],
  sparkline: ['series', 'lineColor', 'fillColor', 'thickness', 'density'],
  'bar-chart': ['series', 'barColor', 'gap', 'density']
}

function visualConfigureTargetError(
  runtime: WebMcpRuntime,
  target: WidgetElement,
  patch: UpdateElementContentOperation['patch']
): WebMcpToolPayload | null {
  if (!isVisualDataElement(target)) {
    return errorPayload(runtime, 'TARGET_TYPE_MISMATCH', 'The selected element is not a visual-data element.')
  }

  const supportedKeys = visualConfigurePatchKeys[target.type]
  const unsupportedKeys = Object.keys(patch).filter(key => !supportedKeys.includes(key))
  if (unsupportedKeys.length > 0) {
    return errorPayload(
      runtime,
      'INVALID_INPUT',
      `${widgetElementLabel(target)} does not support ${unsupportedKeys.join(', ')}. Supported properties: ${supportedKeys.join(', ')}.`
    )
  }

  if (target.type === 'progress-ring' && patch.thickness !== undefined) {
    const { min, max } = WIDGET_CONSTRAINTS.visualData.ringThickness
    if (patch.thickness < min || patch.thickness > max) {
      return errorPayload(runtime, 'INVALID_INPUT', `Progress ring thickness must be between ${min} and ${max}.`)
    }
  }

  if (target.type === 'progress-bar') {
    if (patch.fillColor === null) {
      return errorPayload(runtime, 'INVALID_INPUT', 'Progress bar fillColor must be a six-digit hex color.')
    }
    if (patch.thickness !== undefined) {
      const { min, max } = WIDGET_CONSTRAINTS.visualData.progressBarThickness
      if (patch.thickness < min || patch.thickness > max) {
        return errorPayload(runtime, 'INVALID_INPUT', `Progress bar thickness must be between ${min} and ${max}.`)
      }
    }
    const nextMin = patch.min ?? target.min
    const nextMax = patch.max ?? target.max
    if (nextMax <= nextMin) {
      return errorPayload(runtime, 'INVALID_INPUT', 'Progress bar max must be greater than min.')
    }
  }

  if (target.type === 'sparkline' && patch.thickness !== undefined) {
    const { min, max } = WIDGET_CONSTRAINTS.visualData.chartThickness
    if (patch.thickness < min || patch.thickness > max) {
      return errorPayload(runtime, 'INVALID_INPUT', `Sparkline thickness must be between ${min} and ${max}.`)
    }
  }

  return null
}

function visualConfigureTool(): WebMcpToolDescriptor {
  return descriptor({
    name: 'widgetr_configure_visual_data',
    title: 'Configure a Widgetr visual-data element',
    description: 'Update the selected progress ring, progress bar, sparkline, or bar chart using bounded numeric sources, colors, ranges, and density settings.',
    inputSchema: operationJsonSchema(visualConfigureJsonProperties, ['scope']),
    annotations: mutationAnnotations(false, true),
    execute: (_input, _context, runtime) => {
      const parsed = parseOrError(visualConfigureInputSchema, _input, runtime)
      if (!parsed.ok) {
        return parsed.payload
      }
      const target = selectedTarget(runtime, [...VISUAL_DATA_ELEMENT_TYPES])
      if (!target.ok) {
        return target.payload
      }

      const { expectedRevision, scope, ...patch } = parsed.value
      const targetError = visualConfigureTargetError(runtime, target.element, patch)
      if (targetError) {
        return targetError
      }
      return operationPayload(runtime.commitOperation({
        type: 'update-element-content',
        expectedRevision,
        elementId: target.element.id,
        scope,
        patch
      }))
    }
  })
}

function visualRemoveTool(): WebMcpToolDescriptor {
  return descriptor({
    name: 'widgetr_remove_visual_data',
    title: 'Remove a Widgetr visual-data element',
    description: 'Ask for confirmation before removing the selected progress ring, progress bar, sparkline, or bar chart from the requested layouts.',
    inputSchema: operationJsonSchema({}, ['scope']),
    annotations: mutationAnnotations(true),
    execute: async (_input, context, runtime) => {
      const parsed = parseOrError(visualRemoveInputSchema, _input, runtime)
      if (!parsed.ok) {
        return parsed.payload
      }
      const target = selectedTarget(runtime, [...VISUAL_DATA_ELEMENT_TYPES])
      if (!target.ok) {
        return target.payload
      }

      const changedSizes = resolveDesignScope(parsed.value.scope)
      const confirmed = await runtime.requestConfirmation({
        title: 'Confirm visual-data removal',
        description: `Remove ${widgetElementLabel(target.element)} from ${formatSizes(changedSizes)}?`,
        actionLabel: 'Remove element',
        changedSizes
      }, context.signal)
      if (context.signal.aborted) {
        return errorPayload(runtime, 'CANCELLED', 'The visual-data removal was cancelled before it could be applied.')
      }
      if (!confirmed) {
        return errorPayload(runtime, 'CONFIRMATION_REQUIRED', 'The visual-data removal was not confirmed by the user.', {
          confirmed: false
        })
      }

      return operationPayload(runtime.commitOperation({
        type: 'remove-element',
        expectedRevision: parsed.value.expectedRevision,
        elementId: target.element.id,
        scope: parsed.value.scope
      }))
    }
  })
}

function noSelectionTools(): WebMcpToolDescriptor[] {
  return [
    createWidgetTool(),
    visualInsertTool(),
    descriptor({
      name: 'widgetr_set_design_scope',
      title: 'Set Widgetr design scope',
      description: 'Choose whether the next Widgetr visual edit applies to one size, two sizes, or all sizes.',
      inputSchema: operationJsonSchema({}, ['scope']),
      annotations: mutationAnnotations(),
      execute: (_input, _context, runtime) => {
        const parsed = parseOrError(designScopeInputSchema, _input, runtime)
        if (!parsed.ok) {
          return parsed.payload
        }
        return operationPayload(runtime.commitOperation({
          type: 'set-design-scope',
          expectedRevision: parsed.value.expectedRevision,
          scope: parsed.value.scope
        }))
      }
    }),
    descriptor({
      name: 'widgetr_change_overall_style',
      title: 'Change Widgetr overall background',
      description: 'Change the supported layout background for the requested Widgetr design scope.',
      inputSchema: operationJsonSchema({ background: backgroundJsonSchema }, ['scope', 'background']),
      annotations: mutationAnnotations(false, true),
      execute: (_input, _context, runtime) => {
        const parsed = parseOrError(backgroundInputSchema, _input, runtime)
        if (!parsed.ok) {
          return parsed.payload
        }
        return operationPayload(runtime.commitOperation({
          type: 'set-layout-background',
          expectedRevision: parsed.value.expectedRevision,
          scope: parsed.value.scope,
          background: parsed.value.background
        }))
      }
    })
  ]
}

function textTools(): WebMcpToolDescriptor[] {
  const textTypes: WidgetElement['type'][] = ['text', 'date']

  return [
    descriptor({
      name: 'widgetr_change_text_content',
      title: 'Change Widgetr text content',
      description: 'Change the selected text or date element to a bounded literal, binding, or repeat-item value source.',
      inputSchema: operationJsonSchema({ value: valueSourceJsonSchema }, ['scope', 'value']),
      annotations: mutationAnnotations(false, true),
      execute: (_input, _context, runtime) => {
        const parsed = parseOrError(textContentInputSchema, _input, runtime)
        if (!parsed.ok) {
          return parsed.payload
        }
        const target = selectedTarget(runtime, textTypes)
        if (!target.ok) {
          return target.payload
        }

        return operationPayload(runtime.commitOperation({
          type: 'update-element-content',
          expectedRevision: parsed.value.expectedRevision,
          elementId: target.element.id,
          scope: parsed.value.scope,
          patch: { value: parsed.value.value }
        }))
      }
    }),
    descriptor({
      name: 'widgetr_change_typography',
      title: 'Change Widgetr typography',
      description: 'Change supported typography properties on the selected text or date element for the requested sizes.',
      inputSchema: operationJsonSchema({
        fontSize: { type: 'number', minimum: WIDGET_CONSTRAINTS.fontSize.min, maximum: WIDGET_CONSTRAINTS.fontSize.max },
        fontWeight: { type: 'string', enum: ['regular', 'medium', 'semibold', 'bold'] },
        fontDesign: { type: 'string', enum: ['default', 'rounded', 'monospaced', 'serif'] },
        color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        alignment: { type: 'string', enum: ['leading', 'center', 'trailing'] },
        lineLimit: { type: 'integer', minimum: WIDGET_CONSTRAINTS.lineLimit.min, maximum: WIDGET_CONSTRAINTS.lineLimit.max },
        minimumScaleFactor: { type: 'number', minimum: WIDGET_CONSTRAINTS.minimumScaleFactor.min, maximum: WIDGET_CONSTRAINTS.minimumScaleFactor.max },
        italic: { type: 'boolean' }
      }, ['scope']),
      annotations: mutationAnnotations(),
      execute: (_input, _context, runtime) => {
        const parsed = parseOrError(typographyInputSchema, _input, runtime)
        if (!parsed.ok) {
          return parsed.payload
        }
        const target = selectedTarget(runtime, textTypes)
        if (!target.ok) {
          return target.payload
        }

        const {
          expectedRevision,
          scope,
          ...patch
        } = parsed.value
        return operationPayload(runtime.commitOperation({
          type: 'update-text-style',
          expectedRevision,
          elementId: target.element.id,
          scope,
          patch
        }))
      }
    }),
    descriptor({
      name: 'widgetr_resize_element',
      title: 'Resize a Widgetr element',
      description: 'Set the selected text or date element width, height, or both using a fixed size, fill, or fit.',
      inputSchema: operationJsonSchema({
        width: { oneOf: [{ type: 'number', minimum: 0.01, maximum: 400 }, { type: 'string', enum: ['fill', 'fit'] }] },
        height: { oneOf: [{ type: 'number', minimum: 0.01, maximum: 400 }, { type: 'string', enum: ['fill', 'fit'] }] }
      }, ['scope']),
      annotations: mutationAnnotations(),
      execute: (_input, _context, runtime) => {
        const parsed = parseOrError(resizeInputSchema, _input, runtime)
        if (!parsed.ok) {
          return parsed.payload
        }
        const target = selectedTarget(runtime, textTypes)
        if (!target.ok) {
          return target.payload
        }
        const { expectedRevision, scope, ...patch } = parsed.value
        return operationPayload(runtime.commitOperation({
          type: 'update-element-style',
          expectedRevision,
          elementId: target.element.id,
          scope,
          patch
        }))
      }
    }),
    descriptor({
      name: 'widgetr_align_element',
      title: 'Align Widgetr text',
      description: 'Set the text alignment of the selected text or date element for the requested sizes.',
      inputSchema: operationJsonSchema({
        alignment: { type: 'string', enum: ['leading', 'center', 'trailing'] }
      }, ['scope', 'alignment']),
      annotations: mutationAnnotations(),
      execute: (_input, _context, runtime) => {
        const parsed = parseOrError(alignInputSchema, _input, runtime)
        if (!parsed.ok) {
          return parsed.payload
        }
        const target = selectedTarget(runtime, textTypes)
        if (!target.ok) {
          return target.payload
        }
        return operationPayload(runtime.commitOperation({
          type: 'update-text-style',
          expectedRevision: parsed.value.expectedRevision,
          elementId: target.element.id,
          scope: parsed.value.scope,
          patch: { alignment: parsed.value.alignment }
        }))
      }
    }),
    descriptor({
      name: 'widgetr_restyle_element',
      title: 'Restyle a Widgetr element',
      description: 'Change supported opacity, padding, radius, border, background, size, or alignment properties on the selected text or date element.',
      inputSchema: operationJsonSchema({
        opacity: { type: 'number', minimum: WIDGET_CONSTRAINTS.opacity.min, maximum: WIDGET_CONSTRAINTS.opacity.max },
        padding: {
          type: 'object',
          properties: {
            top: { type: 'number', minimum: WIDGET_CONSTRAINTS.padding.min, maximum: WIDGET_CONSTRAINTS.padding.max },
            right: { type: 'number', minimum: WIDGET_CONSTRAINTS.padding.min, maximum: WIDGET_CONSTRAINTS.padding.max },
            bottom: { type: 'number', minimum: WIDGET_CONSTRAINTS.padding.min, maximum: WIDGET_CONSTRAINTS.padding.max },
            left: { type: 'number', minimum: WIDGET_CONSTRAINTS.padding.min, maximum: WIDGET_CONSTRAINTS.padding.max }
          },
          required: ['top', 'right', 'bottom', 'left'],
          additionalProperties: false
        },
        cornerRadius: { type: 'number', minimum: WIDGET_CONSTRAINTS.cornerRadius.min, maximum: WIDGET_CONSTRAINTS.cornerRadius.max },
        border: {
          oneOf: [
            { type: 'null' },
            {
              type: 'object',
              properties: {
                color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                width: { type: 'number', minimum: WIDGET_CONSTRAINTS.borderWidth.min, maximum: WIDGET_CONSTRAINTS.borderWidth.max }
              },
              required: ['color', 'width'],
              additionalProperties: false
            }
          ]
        },
        background: {
          oneOf: [backgroundJsonSchema, { type: 'null' }]
        },
        width: { oneOf: [{ type: 'number', minimum: 0.01, maximum: 400 }, { type: 'string', enum: ['fill', 'fit'] }] },
        height: { oneOf: [{ type: 'number', minimum: 0.01, maximum: 400 }, { type: 'string', enum: ['fill', 'fit'] }] },
        alignSelf: { type: 'string', enum: ['leading', 'center', 'trailing'] }
      }, ['scope']),
      annotations: mutationAnnotations(),
      execute: (_input, _context, runtime) => {
        const parsed = parseOrError(restyleInputSchema, _input, runtime)
        if (!parsed.ok) {
          return parsed.payload
        }
        const target = selectedTarget(runtime, textTypes)
        if (!target.ok) {
          return target.payload
        }
        const { expectedRevision, scope, ...patch } = parsed.value
        return operationPayload(runtime.commitOperation({
          type: 'update-element-style',
          expectedRevision,
          elementId: target.element.id,
          scope,
          patch
        }))
      }
    })
  ]
}

function imageTools(): WebMcpToolDescriptor[] {
  const imageTypes: WidgetElement['type'][] = ['image']

  return [
    descriptor({
      name: 'widgetr_resize_image',
      title: 'Resize a Widgetr image',
      description: 'Set the selected image width, height, or both using a fixed size, fill, or fit.',
      inputSchema: operationJsonSchema({
        width: { oneOf: [{ type: 'number', minimum: 0.01, maximum: 400 }, { type: 'string', enum: ['fill', 'fit'] }] },
        height: { oneOf: [{ type: 'number', minimum: 0.01, maximum: 400 }, { type: 'string', enum: ['fill', 'fit'] }] }
      }, ['scope']),
      annotations: mutationAnnotations(),
      execute: (_input, _context, runtime) => {
        const parsed = parseOrError(resizeInputSchema, _input, runtime)
        if (!parsed.ok) {
          return parsed.payload
        }
        const target = selectedTarget(runtime, imageTypes)
        if (!target.ok) {
          return target.payload
        }
        const { expectedRevision, scope, ...patch } = parsed.value
        return operationPayload(runtime.commitOperation({
          type: 'update-element-style',
          expectedRevision,
          elementId: target.element.id,
          scope,
          patch
        }))
      }
    }),
    descriptor({
      name: 'widgetr_crop_image',
      title: 'Crop a Widgetr image',
      description: 'Set the selected image crop position using percentages from 0 to 100.',
      inputSchema: operationJsonSchema({
        x: { type: 'number', minimum: 0, maximum: 100 },
        y: { type: 'number', minimum: 0, maximum: 100 }
      }, ['scope', 'x', 'y']),
      annotations: mutationAnnotations(),
      execute: (_input, _context, runtime) => imageCropOperation(_input, runtime, cropInputSchema, imageTypes)
    }),
    descriptor({
      name: 'widgetr_move_image',
      title: 'Move a Widgetr image',
      description: 'Move the selected image focal point using the same bounded crop-position controls as the editor.',
      inputSchema: operationJsonSchema({
        x: { type: 'number', minimum: 0, maximum: 100 },
        y: { type: 'number', minimum: 0, maximum: 100 }
      }, ['scope', 'x', 'y']),
      annotations: mutationAnnotations(),
      execute: (_input, runtimeContext, runtime) => imageCropOperation(_input, runtime, cropInputSchema, imageTypes)
    }),
    descriptor({
      name: 'widgetr_change_image_treatment',
      title: 'Change Widgetr image treatment',
      description: 'Change the selected image fit treatment to cover, contain, or fill.',
      inputSchema: operationJsonSchema({
        fit: { type: 'string', enum: ['cover', 'contain', 'fill'] }
      }, ['scope', 'fit']),
      annotations: mutationAnnotations(),
      execute: (_input, _context, runtime) => {
        const parsed = parseOrError(imageTreatmentInputSchema, _input, runtime)
        if (!parsed.ok) {
          return parsed.payload
        }
        const target = selectedTarget(runtime, imageTypes)
        if (!target.ok) {
          return target.payload
        }
        return operationPayload(runtime.commitOperation({
          type: 'update-element-content',
          expectedRevision: parsed.value.expectedRevision,
          elementId: target.element.id,
          scope: parsed.value.scope,
          patch: { fit: parsed.value.fit }
        }))
      }
    }),
    descriptor({
      name: 'widgetr_replace_image',
      title: 'Replace a Widgetr image',
      description: 'Ask the user to confirm before replacing the selected image source, then update the requested sizes.',
      inputSchema: operationJsonSchema({
        source: valueSourceJsonSchema,
        alt: { type: 'string', maxLength: WEBMCP_MAX_TEXT_LENGTH }
      }, ['scope', 'source']),
      annotations: mutationAnnotations(true, true),
      execute: async (_input, context, runtime) => {
        const parsed = parseOrError(replaceImageInputSchema, _input, runtime)
        if (!parsed.ok) {
          return parsed.payload
        }
        const target = selectedTarget(runtime, imageTypes)
        if (!target.ok) {
          return target.payload
        }

        const changedSizes = resolveDesignScope(parsed.value.scope)
        const confirmed = await runtime.requestConfirmation({
          title: 'Confirm image replacement',
          description: `Replace ${widgetElementLabel(target.element)} in ${formatSizes(changedSizes)}?`,
          actionLabel: 'Replace image',
          changedSizes
        }, context.signal)

        if (context.signal.aborted) {
          return errorPayload(runtime, 'CANCELLED', 'The image replacement was cancelled before it could be applied.')
        }
        if (!confirmed) {
          return errorPayload(runtime, 'CONFIRMATION_REQUIRED', 'The image replacement was not confirmed by the user.', {
            confirmed: false
          })
        }

        const patch: { source: ValueSource, alt?: string } = {
          source: parsed.value.source
        }
        if (parsed.value.alt !== undefined) {
          patch.alt = parsed.value.alt
        }

        return operationPayload(runtime.commitOperation({
          type: 'update-element-content',
          expectedRevision: parsed.value.expectedRevision,
          elementId: target.element.id,
          scope: parsed.value.scope,
          patch
        }))
      }
    })
  ]
}

function imageCropOperation(
  input: unknown,
  runtime: WebMcpRuntime,
  schema: z.ZodType<z.infer<typeof cropInputSchema>>,
  acceptedTypes: WidgetElement['type'][]
): WebMcpToolPayload {
  const parsed = parseOrError(schema, input, runtime)
  if (!parsed.ok) {
    return parsed.payload
  }
  const target = selectedTarget(runtime, acceptedTypes)
  if (!target.ok) {
    return target.payload
  }
  return operationPayload(runtime.commitOperation({
    type: 'update-element-content',
    expectedRevision: parsed.value.expectedRevision,
    elementId: target.element.id,
    scope: parsed.value.scope,
    patch: {
      crop: {
        x: parsed.value.x,
        y: parsed.value.y
      }
    }
  }))
}

function groupTools(): WebMcpToolDescriptor[] {
  const groupTypes: WidgetElement['type'][] = ['group', 'repeat']

  return [
    descriptor({
      name: 'widgetr_change_group_spacing',
      title: 'Change Widgetr group spacing',
      description: 'Change the spacing between children of the selected group or repeat element.',
      inputSchema: operationJsonSchema({
        spacing: { type: 'number', minimum: WIDGET_CONSTRAINTS.spacing.min, maximum: WIDGET_CONSTRAINTS.spacing.max }
      }, ['scope', 'spacing']),
      annotations: mutationAnnotations(),
      execute: (_input, _context, runtime) => groupContentOperation(_input, runtime, spacingInputSchema, groupTypes, value => ({ spacing: value.spacing }))
    }),
    descriptor({
      name: 'widgetr_align_group',
      title: 'Align a Widgetr group',
      description: 'Change the horizontal and vertical alignment of the selected group or repeat element.',
      inputSchema: operationJsonSchema({
        horizontalAlignment: { type: 'string', enum: ['leading', 'center', 'trailing'] },
        verticalAlignment: { type: 'string', enum: ['top', 'center', 'bottom'] }
      }, ['scope']),
      annotations: mutationAnnotations(),
      execute: (_input, _context, runtime) => groupContentOperation(_input, runtime, groupAlignmentInputSchema, groupTypes, value => ({
        horizontalAlignment: value.horizontalAlignment,
        verticalAlignment: value.verticalAlignment
      }))
    }),
    descriptor({
      name: 'widgetr_set_group_direction',
      title: 'Set Widgetr group direction',
      description: 'Set the selected group or repeat element to horizontal or vertical flow.',
      inputSchema: operationJsonSchema({
        direction: { type: 'string', enum: ['horizontal', 'vertical'] }
      }, ['scope', 'direction']),
      annotations: mutationAnnotations(),
      execute: (_input, _context, runtime) => groupContentOperation(_input, runtime, groupDirectionInputSchema, groupTypes, value => ({ direction: value.direction }))
    }),
    descriptor({
      name: 'widgetr_set_group_distribution',
      title: 'Set Widgetr group distribution',
      description: 'Set how the selected group or repeat element distributes its children.',
      inputSchema: operationJsonSchema({
        distribution: { type: 'string', enum: ['start', 'center', 'end', 'space-between'] }
      }, ['scope', 'distribution']),
      annotations: mutationAnnotations(),
      execute: (_input, _context, runtime) => groupContentOperation(_input, runtime, groupDistributionInputSchema, groupTypes, value => ({ distribution: value.distribution }))
    }),
    descriptor({
      name: 'widgetr_reorder_group',
      title: 'Reorder a Widgetr group child',
      description: 'Move one child of the selected group or repeat element to a zero-based position in the requested layouts.',
      inputSchema: operationJsonSchema({
        childId: { type: 'string', minLength: 1, maxLength: 80 },
        toIndex: { type: 'integer', minimum: 0, maximum: WIDGET_CONSTRAINTS.tree.maxElementsPerLayout - 1 }
      }, ['scope', 'childId', 'toIndex']),
      annotations: mutationAnnotations(),
      execute: (_input, _context, runtime) => {
        const parsed = parseOrError(reorderInputSchema, _input, runtime)
        if (!parsed.ok) {
          return parsed.payload
        }
        const target = selectedTarget(runtime, groupTypes)
        if (!target.ok) {
          return target.payload
        }
        return operationPayload(runtime.commitOperation({
          type: 'reorder-children',
          expectedRevision: parsed.value.expectedRevision,
          elementId: target.element.id,
          childId: parsed.value.childId,
          toIndex: parsed.value.toIndex,
          scope: parsed.value.scope
        }))
      }
    }),
    visualInsertTool()
  ]
}

function groupContentOperation<T extends { expectedRevision: number, scope: DesignScope }>(
  input: unknown,
  runtime: WebMcpRuntime,
  schema: z.ZodType<T>,
  acceptedTypes: WidgetElement['type'][],
  getPatch: (value: T) => UpdateElementContentOperation['patch']
): WebMcpToolPayload {
  const parsed = parseOrError(schema, input, runtime)
  if (!parsed.ok) {
    return parsed.payload
  }
  const target = selectedTarget(runtime, acceptedTypes)
  if (!target.ok) {
    return target.payload
  }
  return operationPayload(runtime.commitOperation({
    type: 'update-element-content',
    expectedRevision: parsed.value.expectedRevision,
    elementId: target.element.id,
    scope: parsed.value.scope,
    patch: getPatch(parsed.value)
  }))
}

const sharedToolNames = [
  'widgetr_get_context',
  'widgetr_export',
  'widgetr_connect_public_data',
  'widgetr_set_data_bindings',
  'widgetr_select_element',
  'widgetr_clear_selection'
]

const contextToolNames: Record<Exclude<WebMcpContext, 'unsupported'>, string[]> = {
  none: [
    'widgetr_create_widget',
    'widgetr_set_design_scope',
    'widgetr_change_overall_style',
    'widgetr_insert_visual_data'
  ],
  text: [
    'widgetr_change_text_content',
    'widgetr_change_typography',
    'widgetr_resize_element',
    'widgetr_align_element',
    'widgetr_restyle_element'
  ],
  image: [
    'widgetr_resize_image',
    'widgetr_crop_image',
    'widgetr_move_image',
    'widgetr_change_image_treatment',
    'widgetr_replace_image'
  ],
  group: [
    'widgetr_change_group_spacing',
    'widgetr_align_group',
    'widgetr_set_group_direction',
    'widgetr_set_group_distribution',
    'widgetr_reorder_group',
    'widgetr_insert_visual_data'
  ],
  'visual-data': [
    'widgetr_configure_visual_data',
    'widgetr_remove_visual_data'
  ]
}

export function getWebMcpContext(project: WidgetProject): WebMcpContext {
  if (!project.selection) {
    return 'none'
  }

  const element = findWidgetElement(
    project.layouts[project.selection.size].root,
    project.selection.elementId
  )
  if (!element) {
    return 'unsupported'
  }
  if (element.type === 'text' || element.type === 'date') {
    return 'text'
  }
  if (element.type === 'image') {
    return 'image'
  }
  if (element.type === 'group' || element.type === 'repeat') {
    return 'group'
  }
  if (isVisualDataElement(element)) {
    return 'visual-data'
  }
  return 'unsupported'
}

export function getWebMcpToolNames(project: WidgetProject): string[] {
  const context = getWebMcpContext(project)
  const contextNames = context === 'unsupported' ? [] : contextToolNames[context]
  return [...sharedToolNames, ...contextNames]
}

export function createWebMcpToolCatalog(project: WidgetProject): WebMcpToolDescriptor[] {
  const context = getWebMcpContext(project)
  const tools = [
    ...sharedTools(),
    connectPublicDataSourceTool(),
    setDataBindingsTool()
  ]

  if (context === 'none') {
    tools.push(...noSelectionTools())
  } else if (context === 'text') {
    tools.push(...textTools())
  } else if (context === 'image') {
    tools.push(...imageTools())
  } else if (context === 'group') {
    tools.push(...groupTools())
  } else if (context === 'visual-data') {
    tools.push(visualConfigureTool(), visualRemoveTool())
  }

  return tools
}

export function serializeWebMcpResult(payload: WebMcpToolPayload): string {
  const serialized = serializeInput(payload)
  if (serialized && serialized.length <= WEBMCP_MAX_OUTPUT_CHARS) {
    return serialized
  }

  return JSON.stringify({
    ok: false,
    code: 'OUTPUT_LIMIT',
    revision: typeof payload.revision === 'number' ? payload.revision : null,
    changedSizes: Array.isArray(payload.changedSizes) ? payload.changedSizes.slice(0, 3) : [],
    warnings: Array.isArray(payload.warnings) ? payload.warnings.slice(0, 3) : [],
    selection: payload.selection ?? null,
    message: `The tool result exceeded the ${WEBMCP_MAX_OUTPUT_CHARS}-character output limit. Read the current context for a concise result.`
  })
}

export function formatSizes(sizes: WidgetSize[]): string {
  if (sizes.length === 0) {
    return 'no widget sizes'
  }
  if (sizes.length === 1) {
    return sizes[0]!
  }
  if (sizes.length === 2) {
    return `${sizes[0]} and ${sizes[1]}`
  }
  return `${sizes.slice(0, -1).join(', ')}, and ${sizes.at(-1)}`
}

export function resolveDesignScope(scope: DesignScope): WidgetSize[] {
  if (scope.kind === 'all') {
    return ['small', 'medium', 'large']
  }
  if (scope.kind === 'one') {
    return [scope.size]
  }
  return [...scope.sizes]
}

import { z } from 'zod'
import { HEX_COLOR_PATTERN, WIDGET_CONSTRAINTS } from './constraints'
import {
  WIDGET_SCHEMA_VERSION,
  WIDGET_STARTER_IDS,
  WIDGET_SIZES
} from '~/types/widget'
import type {
  DataPath,
  DesignScope,
  JsonObject,
  JsonValue,
  NumericSource,
  ProgressRingDatum,
  SeriesSource,
  ValueSource,
  VisualDataDensity,
  WidgetBackground,
  WidgetElement,
  WidgetOperation,
  WidgetProject,
  WidgetSize
} from '~/types/widget'

const idSchema = z.string().trim().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const labelSchema = z.string().trim().min(1).max(120)
const colorSchema = z.string().regex(HEX_COLOR_PATTERN, 'Use a six-digit hex color such as #1A2B3C')
const widgetSizeSchema = z.enum(WIDGET_SIZES)
const opacitySchema = z.number().min(WIDGET_CONSTRAINTS.opacity.min).max(WIDGET_CONSTRAINTS.opacity.max)
const paddingValueSchema = z.number().min(WIDGET_CONSTRAINTS.padding.min).max(WIDGET_CONSTRAINTS.padding.max)
const spacingSchema = z.number().min(WIDGET_CONSTRAINTS.spacing.min).max(WIDGET_CONSTRAINTS.spacing.max)

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() => z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
  z.array(jsonValueSchema),
  z.record(z.string(), jsonValueSchema)
]))

const jsonObjectSchema: z.ZodType<JsonObject> = z.record(z.string(), jsonValueSchema)

const dataPathSchema: z.ZodType<DataPath> = z.array(
  z.union([z.string().min(1), z.number().int().nonnegative()])
).max(24)

const valueFormatSchema = z.object({
  prefix: z.string().max(40),
  suffix: z.string().max(40),
  transform: z.enum(['weekday', 'time', 'integer', 'weather-code']).optional()
}).strict()

export const valueSourceSchema: z.ZodType<ValueSource> = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('literal'),
    value: z.string()
  }).strict(),
  z.object({
    kind: z.literal('binding'),
    bindingId: idSchema,
    fallback: z.string(),
    format: valueFormatSchema.optional()
  }).strict(),
  z.object({
    kind: z.literal('item'),
    path: dataPathSchema,
    fallback: z.string(),
    format: valueFormatSchema.optional()
  }).strict()
])

const finiteNumberSchema = z.number().finite()
const seriesValuesSchema = z.array(finiteNumberSchema)
  .max(WIDGET_CONSTRAINTS.visualData.maxSeriesPoints)

export const numericSourceSchema: z.ZodType<NumericSource> = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('literal'),
    value: finiteNumberSchema
  }).strict(),
  z.object({
    kind: z.literal('binding'),
    bindingId: idSchema,
    fallback: finiteNumberSchema
  }).strict(),
  z.object({
    kind: z.literal('item'),
    path: dataPathSchema,
    fallback: finiteNumberSchema
  }).strict()
])

export const seriesSourceSchema: z.ZodType<SeriesSource> = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('literal'),
    value: seriesValuesSchema
  }).strict(),
  z.object({
    kind: z.literal('binding'),
    bindingId: idSchema,
    fallback: seriesValuesSchema
  }).strict(),
  z.object({
    kind: z.literal('item'),
    path: dataPathSchema,
    fallback: seriesValuesSchema
  }).strict()
])

const edgeInsetsSchema = z.object({
  top: paddingValueSchema,
  right: paddingValueSchema,
  bottom: paddingValueSchema,
  left: paddingValueSchema
}).strict()

const borderStyleSchema = z.object({
  color: colorSchema,
  width: z.number()
    .min(WIDGET_CONSTRAINTS.borderWidth.min)
    .max(WIDGET_CONSTRAINTS.borderWidth.max)
}).strict()

export const widgetBackgroundSchema: z.ZodType<WidgetBackground> = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('solid'),
    color: colorSchema,
    opacity: opacitySchema
  }).strict(),
  z.object({
    kind: z.literal('gradient'),
    colors: z.array(colorSchema)
      .min(WIDGET_CONSTRAINTS.gradientColors.min)
      .max(WIDGET_CONSTRAINTS.gradientColors.max),
    direction: z.enum([
      'top',
      'top-right',
      'right',
      'bottom-right',
      'bottom',
      'bottom-left',
      'left',
      'top-left'
    ]),
    opacity: opacitySchema
  }).strict(),
  z.object({
    kind: z.literal('image'),
    source: valueSourceSchema,
    fit: z.enum(['cover', 'contain', 'fill']),
    overlayColor: colorSchema,
    overlayOpacity: opacitySchema
  }).strict()
])

export const elementStyleSchema = z.object({
  opacity: opacitySchema,
  padding: edgeInsetsSchema,
  cornerRadius: z.number()
    .min(WIDGET_CONSTRAINTS.cornerRadius.min)
    .max(WIDGET_CONSTRAINTS.cornerRadius.max),
  border: borderStyleSchema.nullable(),
  background: widgetBackgroundSchema.nullable(),
  width: z.union([
    z.number().positive().max(400),
    z.literal('fill'),
    z.literal('fit')
  ]),
  height: z.union([
    z.number().positive().max(400),
    z.literal('fill'),
    z.literal('fit')
  ]),
  alignSelf: z.enum(['leading', 'center', 'trailing'])
}).strict()

export const textStyleSchema = z.object({
  fontSize: z.number()
    .min(WIDGET_CONSTRAINTS.fontSize.min)
    .max(WIDGET_CONSTRAINTS.fontSize.max),
  fontWeight: z.enum(['regular', 'medium', 'semibold', 'bold']),
  fontDesign: z.enum(['default', 'rounded', 'monospaced', 'serif']),
  color: colorSchema,
  alignment: z.enum(['leading', 'center', 'trailing']),
  lineLimit: z.number().int()
    .min(WIDGET_CONSTRAINTS.lineLimit.min)
    .max(WIDGET_CONSTRAINTS.lineLimit.max),
  minimumScaleFactor: z.number()
    .min(WIDGET_CONSTRAINTS.minimumScaleFactor.min)
    .max(WIDGET_CONSTRAINTS.minimumScaleFactor.max),
  italic: z.boolean()
}).strict()

const elementBaseShape = {
  id: idSchema,
  visible: z.boolean(),
  style: elementStyleSchema
}

const progressRangeShape = {
  min: finiteNumberSchema,
  max: finiteNumberSchema
}

export const progressRingDatumSchema: z.ZodType<ProgressRingDatum> = z.object({
  id: idSchema,
  value: numericSourceSchema,
  ...progressRangeShape,
  trackColor: colorSchema,
  fillColor: colorSchema
}).strict().refine(
  ring => ring.max > ring.min,
  { message: 'Progress ranges must have a max greater than min' }
)

const progressRingRingsSchema = z.array(progressRingDatumSchema)
  .min(1)
  .max(WIDGET_CONSTRAINTS.visualData.maxRings)
  .refine(
    rings => new Set(rings.map(ring => ring.id)).size === rings.length,
    'Progress ring ids must be unique'
  )

const progressRingElementSchema = z.object({
  ...elementBaseShape,
  type: z.literal('progress-ring'),
  rings: progressRingRingsSchema,
  size: z.number().finite()
    .min(WIDGET_CONSTRAINTS.visualData.ringSize.min)
    .max(WIDGET_CONSTRAINTS.visualData.ringSize.max),
  thickness: z.number().finite()
    .min(WIDGET_CONSTRAINTS.visualData.ringThickness.min)
    .max(WIDGET_CONSTRAINTS.visualData.ringThickness.max),
  centerLabel: valueSourceSchema.nullable()
}).strict()

const progressBarElementSchema = z.object({
  ...elementBaseShape,
  type: z.literal('progress-bar'),
  value: numericSourceSchema,
  ...progressRangeShape,
  trackColor: colorSchema,
  fillColor: colorSchema,
  thickness: z.number().finite()
    .min(WIDGET_CONSTRAINTS.visualData.progressBarThickness.min)
    .max(WIDGET_CONSTRAINTS.visualData.progressBarThickness.max)
}).strict().refine(
  element => element.max > element.min,
  { message: 'Progress ranges must have a max greater than min' }
)

const visualDataDensitySchema: z.ZodType<VisualDataDensity> = z.enum([
  'compact',
  'balanced',
  'detailed'
])

const sparklineElementSchema = z.object({
  ...elementBaseShape,
  type: z.literal('sparkline'),
  values: seriesSourceSchema,
  lineColor: colorSchema,
  fillColor: colorSchema.nullable(),
  thickness: z.number().finite()
    .min(WIDGET_CONSTRAINTS.visualData.chartThickness.min)
    .max(WIDGET_CONSTRAINTS.visualData.chartThickness.max),
  density: visualDataDensitySchema
}).strict()

const barChartElementSchema = z.object({
  ...elementBaseShape,
  type: z.literal('bar-chart'),
  values: seriesSourceSchema,
  barColor: colorSchema,
  gap: z.number().finite()
    .min(WIDGET_CONSTRAINTS.visualData.chartGap.min)
    .max(WIDGET_CONSTRAINTS.visualData.chartGap.max),
  density: visualDataDensitySchema
}).strict()

export const widgetElementSchema: z.ZodType<WidgetElement> = z.lazy(() => z.discriminatedUnion('type', [
  z.object({
    ...elementBaseShape,
    type: z.literal('text'),
    value: valueSourceSchema,
    textStyle: textStyleSchema
  }).strict(),
  z.object({
    ...elementBaseShape,
    type: z.literal('date'),
    value: valueSourceSchema,
    format: z.enum(['date', 'time', 'date-time', 'relative']),
    textStyle: textStyleSchema
  }).strict(),
  z.object({
    ...elementBaseShape,
    type: z.literal('image'),
    source: valueSourceSchema,
    alt: z.string().trim().min(1).max(160),
    fit: z.enum(['cover', 'contain', 'fill']),
    crop: z.object({
      x: z.number().min(WIDGET_CONSTRAINTS.imageCrop.min).max(WIDGET_CONSTRAINTS.imageCrop.max),
      y: z.number().min(WIDGET_CONSTRAINTS.imageCrop.min).max(WIDGET_CONSTRAINTS.imageCrop.max)
    }).strict()
  }).strict(),
  z.object({
    ...elementBaseShape,
    type: z.literal('symbol'),
    name: valueSourceSchema,
    color: colorSchema,
    size: z.number()
      .min(WIDGET_CONSTRAINTS.symbolSize.min)
      .max(WIDGET_CONSTRAINTS.symbolSize.max)
  }).strict(),
  z.object({
    ...elementBaseShape,
    type: z.literal('group'),
    direction: z.enum(['horizontal', 'vertical']),
    spacing: spacingSchema,
    horizontalAlignment: z.enum(['leading', 'center', 'trailing']),
    verticalAlignment: z.enum(['top', 'center', 'bottom']),
    distribution: z.enum(['start', 'center', 'end', 'space-between']),
    children: z.array(widgetElementSchema).max(WIDGET_CONSTRAINTS.tree.maxElementsPerLayout)
  }).strict(),
  z.object({
    ...elementBaseShape,
    type: z.literal('spacer'),
    length: z.union([
      z.number().min(0).max(160),
      z.literal('flex')
    ])
  }).strict(),
  z.object({
    ...elementBaseShape,
    type: z.literal('repeat'),
    itemsBindingId: idSchema,
    limit: z.number().int()
      .min(WIDGET_CONSTRAINTS.repeatLimit.min)
      .max(WIDGET_CONSTRAINTS.repeatLimit.max),
    direction: z.enum(['horizontal', 'vertical']),
    spacing: spacingSchema,
    horizontalAlignment: z.enum(['leading', 'center', 'trailing']),
    verticalAlignment: z.enum(['top', 'center', 'bottom']),
    distribution: z.enum(['start', 'center', 'end', 'space-between']),
    children: z.array(widgetElementSchema).min(1).max(WIDGET_CONSTRAINTS.tree.maxElementsPerLayout)
  }).strict(),
  progressRingElementSchema,
  progressBarElementSchema,
  sparklineElementSchema,
  barChartElementSchema
]))

const groupElementSchema = widgetElementSchema.refine(
  element => element.type === 'group',
  'A layout root must be a group'
).transform(element => {
  if (element.type !== 'group') {
    throw new Error('A layout root must be a group')
  }

  return element
})

const widgetLayoutSchema = z.object({
  size: widgetSizeSchema,
  padding: edgeInsetsSchema,
  cornerRadius: z.number()
    .min(WIDGET_CONSTRAINTS.cornerRadius.min)
    .max(WIDGET_CONSTRAINTS.cornerRadius.max),
  background: widgetBackgroundSchema,
  root: groupElementSchema
}).strict()

export const designScopeSchema: z.ZodType<DesignScope> = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('one'),
    size: widgetSizeSchema
  }).strict(),
  z.object({
    kind: z.literal('several'),
    sizes: z.tuple([widgetSizeSchema, widgetSizeSchema])
      .refine(sizes => sizes[0] !== sizes[1], 'Choose two different widget sizes')
  }).strict(),
  z.object({
    kind: z.literal('all')
  }).strict()
])

const widgetSelectionSchema = z.object({
  size: widgetSizeSchema,
  elementId: idSchema
}).strict()

const localReferenceMetadataSchema = z.object({
  storageKey: z.string().trim().min(1).max(200),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  width: z.number().int().positive().max(20000),
  height: z.number().int().positive().max(20000),
  addedAt: z.iso.datetime({ offset: true })
}).strict()

function stripRemovedProjectFields(input: unknown): unknown {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return input
  }

  const record = input as Record<string, unknown>
  const hasRemovedImportMetadata = Object.prototype.hasOwnProperty.call(record, 'importReport')
  const hasRemovedImportIntent = record.startingIntent === 'scriptable-import'
  if (!hasRemovedImportMetadata && !hasRemovedImportIntent) {
    return input
  }

  const project = { ...record }
  delete project.importReport
  if (hasRemovedImportIntent) {
    delete project.startingIntent
  }
  return project
}

const dataSourceConfigSchema = z.object({
  kind: z.enum(['none', 'sample', 'pasted', 'public-api']),
  url: z.url().nullable(),
  method: z.enum(['GET', 'POST']),
  parameters: z.array(z.object({
    key: z.string().trim().min(1).max(120),
    value: z.string().max(500)
  }).strict()).max(40),
  headers: z.array(z.object({
    key: z.string().trim().min(1).max(120),
    value: z.string().max(500)
  }).strict()).max(40),
  refreshMinutes: z.number().int()
    .min(WIDGET_CONSTRAINTS.refreshMinutes.min)
    .max(WIDGET_CONSTRAINTS.refreshMinutes.max),
  secretPlaceholders: z.array(z.object({
    name: z.string().trim().min(1).max(80).regex(/^[A-Z][A-Z0-9_]*$/),
    label: labelSchema,
    location: z.enum(['header', 'query', 'body'])
  }).strict()).max(20)
}).strict()

const normalizedDataStateSchema = z.object({
  kind: z.enum(['sample', 'pasted', 'cached', 'live']),
  label: labelSchema,
  capturedAt: z.iso.datetime({ offset: true }),
  value: jsonObjectSchema
}).strict()

const dataBindingSchema = z.object({
  id: idSchema,
  label: labelSchema,
  path: dataPathSchema,
  valueType: z.enum(['string', 'number', 'boolean', 'date', 'image-url', 'list', 'object'])
}).strict()

const widgetProjectBaseSchema = z.preprocess(stripRemovedProjectFields, z.object({
  schemaVersion: z.literal(WIDGET_SCHEMA_VERSION),
  id: idSchema,
  name: labelSchema,
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  revision: z.number().int().nonnegative(),
  startingIntent: z.enum(WIDGET_STARTER_IDS).nullable().optional(),
  dataSource: dataSourceConfigSchema,
  data: normalizedDataStateSchema,
  bindings: z.array(dataBindingSchema).max(100),
  layouts: z.object({
    small: widgetLayoutSchema,
    medium: widgetLayoutSchema,
    large: widgetLayoutSchema
  }).strict(),
  selection: widgetSelectionSchema.nullable(),
  designScope: designScopeSchema,
  styleProvenance: z.object({
    approvedStyleId: idSchema,
    friendlyName: labelSchema,
    approvedVersion: z.number().int().positive(),
    recipeSnapshot: jsonObjectSchema
  }).strict().nullable(),
  localReference: localReferenceMetadataSchema.nullable(),
  diagnostics: z.array(z.object({
    id: idSchema,
    severity: z.enum(['warning', 'blocking']),
    code: z.string().trim().min(1).max(80).regex(/^[A-Z][A-Z0-9_]*$/),
    message: z.string().trim().min(1).max(500),
    recovery: z.string().trim().min(1).max(500),
    size: widgetSizeSchema.optional(),
    elementId: idSchema.optional()
  }).strict()).max(100)
}).strict())

function collectElementFacts(element: WidgetElement, depth = 1, insideRepeat = false): {
  ids: string[]
  bindingIds: string[]
  bindingRequirements: Array<{ bindingId: string, valueType: 'number' | 'list', elementId: string }>
  repeatBindingIds: string[]
  itemSourcesOutsideRepeat: string[]
  count: number
  maxDepth: number
} {
  const facts = {
    ids: [element.id],
    bindingIds: [] as string[],
    bindingRequirements: [] as Array<{ bindingId: string, valueType: 'number' | 'list', elementId: string }>,
    repeatBindingIds: [] as string[],
    itemSourcesOutsideRepeat: [] as string[],
    count: 1,
    maxDepth: depth
  }

  const sources: Array<{
    source: ValueSource | NumericSource | SeriesSource
    valueType?: 'number' | 'list'
  }> = []
  if (element.type === 'text' || element.type === 'date') {
    sources.push({ source: element.value })
  } else if (element.type === 'image') {
    sources.push({ source: element.source })
  } else if (element.type === 'symbol') {
    sources.push({ source: element.name })
  } else if (element.type === 'progress-ring') {
    element.rings.forEach(ring => sources.push({ source: ring.value, valueType: 'number' }))
    if (element.centerLabel) {
      sources.push({ source: element.centerLabel })
    }
  } else if (element.type === 'progress-bar') {
    sources.push({ source: element.value, valueType: 'number' })
  } else if (element.type === 'sparkline' || element.type === 'bar-chart') {
    sources.push({ source: element.values, valueType: 'list' })
  }

  if (element.style.background?.kind === 'image') {
    sources.push({ source: element.style.background.source })
  }

  for (const { source, valueType } of sources) {
    if (source.kind === 'binding') {
      facts.bindingIds.push(source.bindingId)
      if (valueType) {
        facts.bindingRequirements.push({
          bindingId: source.bindingId,
          valueType,
          elementId: element.id
        })
      }
    } else if (source.kind === 'item' && !insideRepeat) {
      facts.itemSourcesOutsideRepeat.push(element.id)
    }
  }

  if (element.type === 'repeat') {
    facts.repeatBindingIds.push(element.itemsBindingId)
  }

  if (element.type === 'group' || element.type === 'repeat') {
    for (const child of element.children) {
      const childFacts = collectElementFacts(child, depth + 1, insideRepeat || element.type === 'repeat')
      facts.ids.push(...childFacts.ids)
      facts.bindingIds.push(...childFacts.bindingIds)
      facts.bindingRequirements.push(...childFacts.bindingRequirements)
      facts.repeatBindingIds.push(...childFacts.repeatBindingIds)
      facts.itemSourcesOutsideRepeat.push(...childFacts.itemSourcesOutsideRepeat)
      facts.count += childFacts.count
      facts.maxDepth = Math.max(facts.maxDepth, childFacts.maxDepth)
    }
  }

  return facts
}

export const widgetProjectSchema: z.ZodType<WidgetProject> = widgetProjectBaseSchema.superRefine((project, context) => {
  const bindingTypes = new Map<string, string>()

  project.bindings.forEach((binding, index) => {
    if (bindingTypes.has(binding.id)) {
      context.addIssue({
        code: 'custom',
        path: ['bindings', index, 'id'],
        message: `Binding id "${binding.id}" is duplicated`
      })
    }
    bindingTypes.set(binding.id, binding.valueType)
  })

  for (const size of WIDGET_SIZES) {
    const layout = project.layouts[size]
    if (layout.size !== size) {
      context.addIssue({
        code: 'custom',
        path: ['layouts', size, 'size'],
        message: `The ${size} layout must declare size "${size}"`
      })
    }

    const facts = collectElementFacts(layout.root)
    if (layout.background.kind === 'image' && layout.background.source.kind === 'binding') {
      facts.bindingIds.push(layout.background.source.bindingId)
    }
    const seenIds = new Set<string>()
    for (const elementId of facts.ids) {
      if (seenIds.has(elementId)) {
        context.addIssue({
          code: 'custom',
          path: ['layouts', size, 'root'],
          message: `Element id "${elementId}" is duplicated in the ${size} layout`
        })
      }
      seenIds.add(elementId)
    }

    if (facts.count > WIDGET_CONSTRAINTS.tree.maxElementsPerLayout) {
      context.addIssue({
        code: 'custom',
        path: ['layouts', size, 'root'],
        message: `The ${size} layout exceeds ${WIDGET_CONSTRAINTS.tree.maxElementsPerLayout} elements`
      })
    }

    if (facts.maxDepth > WIDGET_CONSTRAINTS.tree.maxDepth) {
      context.addIssue({
        code: 'custom',
        path: ['layouts', size, 'root'],
        message: `The ${size} layout exceeds ${WIDGET_CONSTRAINTS.tree.maxDepth} nesting levels`
      })
    }

    for (const bindingId of facts.bindingIds) {
      if (!bindingTypes.has(bindingId)) {
        context.addIssue({
          code: 'custom',
          path: ['layouts', size, 'root'],
          message: `Element references missing binding "${bindingId}"`
        })
      }
    }

    for (const bindingId of facts.repeatBindingIds) {
      if (bindingTypes.get(bindingId) !== 'list') {
        context.addIssue({
          code: 'custom',
          path: ['layouts', size, 'root'],
          message: `Repeat element binding "${bindingId}" must have value type "list"`
        })
      }
    }

    for (const requirement of facts.bindingRequirements) {
      if (bindingTypes.has(requirement.bindingId) && bindingTypes.get(requirement.bindingId) !== requirement.valueType) {
        context.addIssue({
          code: 'custom',
          path: ['layouts', size, 'root'],
          message: `Visual data element "${requirement.elementId}" binding "${requirement.bindingId}" must have value type "${requirement.valueType}"`
        })
      }
    }

    for (const elementId of facts.itemSourcesOutsideRepeat) {
      context.addIssue({
        code: 'custom',
        path: ['layouts', size, 'root'],
        message: `Element "${elementId}" uses item data outside a repeat group`
      })
    }

    if (project.selection?.size === size && !seenIds.has(project.selection.elementId)) {
      context.addIssue({
        code: 'custom',
        path: ['selection', 'elementId'],
        message: `Selected element "${project.selection.elementId}" does not exist in the ${size} layout`
      })
    }
  }

  const sourceKeys = [
    ...project.dataSource.parameters.map(parameter => `parameter:${parameter.key.toLowerCase()}`),
    ...project.dataSource.headers.map(header => `header:${header.key.toLowerCase()}`)
  ]
  if (new Set(sourceKeys).size !== sourceKeys.length) {
    context.addIssue({
      code: 'custom',
      path: ['dataSource'],
      message: 'Data-source parameter and header names must be unique within their groups'
    })
  }


  if (project.dataSource.kind === 'public-api' && !project.dataSource.url) {
    context.addIssue({
      code: 'custom',
      path: ['dataSource', 'url'],
      message: 'A public API source requires a URL'
    })
  }

  const secretNames = project.dataSource.secretPlaceholders.map(secret => secret.name)
  if (new Set(secretNames).size !== secretNames.length) {
    context.addIssue({
      code: 'custom',
      path: ['dataSource', 'secretPlaceholders'],
      message: 'Secret placeholder names must be unique'
    })
  }
})

const elementStylePatchSchema = elementStyleSchema.partial().strict()
  .refine(patch => Object.keys(patch).length > 0, 'Include at least one element-style property')

const textStylePatchSchema = textStyleSchema.partial().strict()
  .refine(patch => Object.keys(patch).length > 0, 'Include at least one text-style property')

const elementContentPatchSchema = z.object({
  visible: z.boolean().optional(),
  value: valueSourceSchema.optional(),
  format: z.enum(['date', 'time', 'date-time', 'relative']).optional(),
  source: valueSourceSchema.optional(),
  alt: z.string().max(240).optional(),
  fit: z.enum(['cover', 'contain', 'fill']).optional(),
  crop: z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100)
  }).strict().optional(),
  name: valueSourceSchema.optional(),
  color: colorSchema.optional(),
  size: z.number().positive().max(200).optional(),
  direction: z.enum(['horizontal', 'vertical']).optional(),
  spacing: spacingSchema.optional(),
  horizontalAlignment: z.enum(['leading', 'center', 'trailing']).optional(),
  verticalAlignment: z.enum(['top', 'center', 'bottom']).optional(),
  distribution: z.enum(['start', 'center', 'end', 'space-between']).optional(),
  length: z.union([
    z.number().min(0).max(400),
    z.literal('flex')
  ]).optional(),
  limit: z.number().int().min(1).max(20).optional(),
  numericValue: numericSourceSchema.optional(),
  series: seriesSourceSchema.optional(),
  rings: progressRingRingsSchema.optional(),
  min: finiteNumberSchema.optional(),
  max: finiteNumberSchema.optional(),
  trackColor: colorSchema.optional(),
  fillColor: colorSchema.nullable().optional(),
  thickness: z.number().finite()
    .min(WIDGET_CONSTRAINTS.visualData.chartThickness.min)
    .max(WIDGET_CONSTRAINTS.visualData.progressBarThickness.max)
    .optional(),
  centerLabel: valueSourceSchema.nullable().optional(),
  density: visualDataDensitySchema.optional(),
  lineColor: colorSchema.optional(),
  barColor: colorSchema.optional(),
  gap: z.number().finite()
    .min(WIDGET_CONSTRAINTS.visualData.chartGap.min)
    .max(WIDGET_CONSTRAINTS.visualData.chartGap.max)
    .optional()
}).strict().refine(patch => Object.keys(patch).length > 0, 'Include at least one element change')

const projectMetadataPatchSchema = z.object({
  name: labelSchema.optional(),
  localReference: localReferenceMetadataSchema.nullable().optional()
}).strict().refine(patch => Object.keys(patch).length > 0, 'Include at least one project change')

export const widgetOperationSchema: z.ZodType<WidgetOperation> = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('set-design-scope'),
    expectedRevision: z.number().int().nonnegative(),
    scope: designScopeSchema
  }).strict(),
  z.object({
    type: z.literal('set-selection'),
    expectedRevision: z.number().int().nonnegative(),
    selection: widgetSelectionSchema.nullable()
  }).strict(),
  z.object({
    type: z.literal('update-element-style'),
    expectedRevision: z.number().int().nonnegative(),
    elementId: idSchema,
    scope: designScopeSchema.optional(),
    patch: elementStylePatchSchema
  }).strict(),
  z.object({
    type: z.literal('update-text-style'),
    expectedRevision: z.number().int().nonnegative(),
    elementId: idSchema,
    scope: designScopeSchema.optional(),
    patch: textStylePatchSchema
  }).strict(),
  z.object({
    type: z.literal('update-element-content'),
    expectedRevision: z.number().int().nonnegative(),
    elementId: idSchema,
    scope: designScopeSchema.optional(),
    patch: elementContentPatchSchema
  }).strict(),
  z.object({
    type: z.literal('update-project-metadata'),
    expectedRevision: z.number().int().nonnegative(),
    patch: projectMetadataPatchSchema
  }).strict(),
  z.object({
    type: z.literal('set-public-data-source'),
    expectedRevision: z.number().int().nonnegative(),
    source: dataSourceConfigSchema.refine(source => (
      source.kind === 'public-api'
      && source.method === 'GET'
      && source.headers.length === 0
      && source.secretPlaceholders.length === 0
    ), 'Public browser sources must use GET without headers or secrets.'),
    data: normalizedDataStateSchema.refine(data => data.kind === 'live', 'A public source needs live JSON data.')
  }).strict(),
  z.object({
    type: z.literal('set-data-bindings'),
    expectedRevision: z.number().int().nonnegative(),
    bindings: z.array(dataBindingSchema).min(1).max(100)
      .refine(bindings => new Set(bindings.map(binding => binding.id)).size === bindings.length, 'Binding ids must be unique.')
  }).strict(),
  z.object({
    type: z.literal('set-layout-background'),
    expectedRevision: z.number().int().nonnegative(),
    scope: designScopeSchema.optional(),
    background: widgetBackgroundSchema
  }).strict(),
  z.object({
    type: z.literal('reorder-children'),
    expectedRevision: z.number().int().nonnegative(),
    elementId: idSchema,
    childId: idSchema,
    toIndex: z.number().int().nonnegative().max(WIDGET_CONSTRAINTS.tree.maxElementsPerLayout - 1),
    scope: designScopeSchema.optional()
  }).strict(),
  z.object({
    type: z.literal('insert-element'),
    expectedRevision: z.number().int().nonnegative(),
    parentId: idSchema,
    element: widgetElementSchema,
    index: z.number().int().nonnegative()
      .max(WIDGET_CONSTRAINTS.tree.maxElementsPerLayout - 1)
      .optional(),
    scope: designScopeSchema.optional()
  }).strict(),
  z.object({
    type: z.literal('remove-element'),
    expectedRevision: z.number().int().nonnegative(),
    elementId: idSchema,
    scope: designScopeSchema.optional()
  }).strict(),
  z.object({
    type: z.literal('restore-snapshot'),
    expectedRevision: z.number().int().nonnegative(),
    snapshot: widgetProjectSchema
  }).strict()
])

export interface WidgetValidationIssue {
  path: string
  message: string
}

export type WidgetValidationResult =
  | { ok: true, value: WidgetProject }
  | { ok: false, issues: WidgetValidationIssue[] }

export function validateWidgetProject(input: unknown): WidgetValidationResult {
  const result = widgetProjectSchema.safeParse(input)
  if (result.success) {
    return { ok: true, value: result.data }
  }

  return {
    ok: false,
    issues: result.error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message
    }))
  }
}

export function parseWidgetProject(input: unknown): WidgetProject {
  return widgetProjectSchema.parse(input)
}

export function resolveDesignScope(scope: DesignScope): WidgetSize[] {
  if (scope.kind === 'all') {
    return [...WIDGET_SIZES]
  }
  if (scope.kind === 'one') {
    return [scope.size]
  }
  return [...scope.sizes]
}

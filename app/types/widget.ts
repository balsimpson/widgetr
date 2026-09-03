export const WIDGET_SCHEMA_VERSION = 1 as const

export const WIDGET_SIZES = ['small', 'medium', 'large'] as const

export type WidgetSize = (typeof WIDGET_SIZES)[number]

export const WIDGET_STARTER_IDS = [
  'weather',
  'cryptocurrency',
  'daily-agenda',
  'reference-image',
  'own-idea',
  'example'
] as const

export type WidgetStarterId = (typeof WIDGET_STARTER_IDS)[number]

export const WIDGET_DIMENSIONS: Record<WidgetSize, { width: number, height: number }> = {
  small: { width: 158, height: 158 },
  medium: { width: 338, height: 158 },
  large: { width: 338, height: 354 }
}

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[]
export type JsonObject = { [key: string]: JsonValue }
export type DataPath = Array<string | number>

export type DataValueType = 'string' | 'number' | 'boolean' | 'date' | 'image-url' | 'list' | 'object'

export interface DataBinding {
  id: string
  label: string
  path: DataPath
  valueType: DataValueType
}

export type ValueSource =
  | { kind: 'literal', value: string }
  | {
    kind: 'binding'
    bindingId: string
    fallback: string
    format?: { prefix: string, suffix: string, transform?: 'weekday' | 'time' | 'integer' | 'weather-code' }
  }
  | {
    kind: 'item'
    path: DataPath
    fallback: string
    format?: { prefix: string, suffix: string, transform?: 'weekday' | 'time' | 'integer' | 'weather-code' }
  }

export type NumericSource =
  | { kind: 'literal', value: number }
  | { kind: 'binding', bindingId: string, fallback: number }
  | { kind: 'item', path: DataPath, fallback: number }

export type SeriesSource =
  | { kind: 'literal', value: number[] }
  | { kind: 'binding', bindingId: string, fallback: number[] }
  | { kind: 'item', path: DataPath, fallback: number[] }

export type HorizontalAlignment = 'leading' | 'center' | 'trailing'
export type VerticalAlignment = 'top' | 'center' | 'bottom'
export type GroupDistribution = 'start' | 'center' | 'end' | 'space-between'
export type GroupDirection = 'horizontal' | 'vertical'
export type VisualDataDensity = 'compact' | 'balanced' | 'detailed'

export interface EdgeInsets {
  top: number
  right: number
  bottom: number
  left: number
}

export interface BorderStyle {
  color: string
  width: number
}

export type WidgetBackground =
  | { kind: 'solid', color: string, opacity: number }
  | {
    kind: 'gradient'
    colors: string[]
    direction: 'top' | 'top-right' | 'right' | 'bottom-right' | 'bottom' | 'bottom-left' | 'left' | 'top-left'
    opacity: number
  }
  | {
    kind: 'image'
    source: ValueSource
    fit: 'cover' | 'contain' | 'fill'
    overlayColor: string
    overlayOpacity: number
  }

export interface ElementStyle {
  opacity: number
  padding: EdgeInsets
  cornerRadius: number
  border: BorderStyle | null
  background: WidgetBackground | null
  width: number | 'fill' | 'fit'
  height: number | 'fill' | 'fit'
  alignSelf: HorizontalAlignment
}

export interface TextStyle {
  fontSize: number
  fontWeight: 'regular' | 'medium' | 'semibold' | 'bold'
  fontDesign: 'default' | 'rounded' | 'monospaced' | 'serif'
  color: string
  alignment: HorizontalAlignment
  lineLimit: number
  minimumScaleFactor: number
  italic: boolean
}

export interface BaseWidgetElement {
  id: string
  visible: boolean
  style: ElementStyle
}

export interface TextElement extends BaseWidgetElement {
  type: 'text'
  value: ValueSource
  textStyle: TextStyle
}

export interface DateElement extends BaseWidgetElement {
  type: 'date'
  value: ValueSource
  format: 'date' | 'time' | 'date-time' | 'relative'
  textStyle: TextStyle
}

export interface ImageElement extends BaseWidgetElement {
  type: 'image'
  source: ValueSource
  alt: string
  fit: 'cover' | 'contain' | 'fill'
  crop: {
    x: number
    y: number
  }
}

export interface SymbolElement extends BaseWidgetElement {
  type: 'symbol'
  name: ValueSource
  color: string
  size: number
}

export interface GroupElement extends BaseWidgetElement {
  type: 'group'
  direction: GroupDirection
  spacing: number
  horizontalAlignment: HorizontalAlignment
  verticalAlignment: VerticalAlignment
  distribution: GroupDistribution
  children: WidgetElement[]
}

export interface SpacerElement extends BaseWidgetElement {
  type: 'spacer'
  length: number | 'flex'
}

export interface RepeatElement extends BaseWidgetElement {
  type: 'repeat'
  itemsBindingId: string
  limit: number
  direction: GroupDirection
  spacing: number
  horizontalAlignment: HorizontalAlignment
  verticalAlignment: VerticalAlignment
  distribution: GroupDistribution
  children: WidgetElement[]
}

export interface ProgressRingDatum {
  id: string
  value: NumericSource
  min: number
  max: number
  trackColor: string
  fillColor: string
}

export interface ProgressRingElement extends BaseWidgetElement {
  type: 'progress-ring'
  rings: ProgressRingDatum[]
  size: number
  thickness: number
  centerLabel: ValueSource | null
}

export interface ProgressBarElement extends BaseWidgetElement {
  type: 'progress-bar'
  value: NumericSource
  min: number
  max: number
  trackColor: string
  fillColor: string
  thickness: number
}

export interface SparklineElement extends BaseWidgetElement {
  type: 'sparkline'
  values: SeriesSource
  lineColor: string
  fillColor: string | null
  thickness: number
  density: VisualDataDensity
}

export interface BarChartElement extends BaseWidgetElement {
  type: 'bar-chart'
  values: SeriesSource
  barColor: string
  gap: number
  density: VisualDataDensity
}

export type WidgetElement =
  | TextElement
  | DateElement
  | ImageElement
  | SymbolElement
  | GroupElement
  | SpacerElement
  | RepeatElement
  | ProgressRingElement
  | ProgressBarElement
  | SparklineElement
  | BarChartElement

export type VisualDataElement =
  | ProgressRingElement
  | ProgressBarElement
  | SparklineElement
  | BarChartElement

export type VisualDataElementType = VisualDataElement['type']

export interface WidgetLayout {
  size: WidgetSize
  padding: EdgeInsets
  cornerRadius: number
  background: WidgetBackground
  root: GroupElement
}

export type WidgetLayouts = Record<WidgetSize, WidgetLayout>

export interface DataSourceConfig {
  kind: 'none' | 'sample' | 'pasted' | 'public-api'
  url: string | null
  method: 'GET' | 'POST'
  parameters: Array<{ key: string, value: string }>
  headers: Array<{ key: string, value: string }>
  refreshMinutes: number
  secretPlaceholders: Array<{
    name: string
    label: string
    location: 'header' | 'query' | 'body'
  }>
}

export interface NormalizedDataState {
  kind: 'sample' | 'pasted' | 'cached' | 'live'
  label: string
  capturedAt: string
  value: JsonObject
}

export type DesignScope =
  | { kind: 'one', size: WidgetSize }
  | { kind: 'several', sizes: [WidgetSize, WidgetSize] }
  | { kind: 'all' }

export interface WidgetSelection {
  size: WidgetSize
  elementId: string
}

export interface StyleProvenance {
  approvedStyleId: string
  friendlyName: string
  approvedVersion: number
  recipeSnapshot: JsonObject
}

export interface LocalReferenceMetadata {
  storageKey: string
  fileName: string
  mimeType: string
  width: number
  height: number
  addedAt: string
}

export interface WidgetDiagnostic {
  id: string
  severity: 'warning' | 'blocking'
  code: string
  message: string
  recovery: string
  size?: WidgetSize
  elementId?: string
}

export interface WidgetProject {
  schemaVersion: typeof WIDGET_SCHEMA_VERSION
  id: string
  name: string
  createdAt: string
  updatedAt: string
  revision: number
  startingIntent?: WidgetStarterId | null
  dataSource: DataSourceConfig
  data: NormalizedDataState
  bindings: DataBinding[]
  layouts: WidgetLayouts
  selection: WidgetSelection | null
  designScope: DesignScope
  styleProvenance: StyleProvenance | null
  localReference: LocalReferenceMetadata | null
  diagnostics: WidgetDiagnostic[]
}

export interface OperationBase {
  expectedRevision: number
}

export interface SetDesignScopeOperation extends OperationBase {
  type: 'set-design-scope'
  scope: DesignScope
}

export interface SetSelectionOperation extends OperationBase {
  type: 'set-selection'
  selection: WidgetSelection | null
}

export interface UpdateElementStyleOperation extends OperationBase {
  type: 'update-element-style'
  elementId: string
  scope?: DesignScope
  patch: Partial<ElementStyle>
}

export interface UpdateTextStyleOperation extends OperationBase {
  type: 'update-text-style'
  elementId: string
  scope?: DesignScope
  patch: Partial<TextStyle>
}

export interface UpdateElementContentOperation extends OperationBase {
  type: 'update-element-content'
  elementId: string
  scope?: DesignScope
  patch: {
    visible?: boolean
    value?: ValueSource
    format?: DateElement['format']
    source?: ValueSource
    alt?: string
    fit?: ImageElement['fit']
    crop?: ImageElement['crop']
    name?: ValueSource
    color?: string
    size?: number
    direction?: GroupDirection
    spacing?: number
    horizontalAlignment?: HorizontalAlignment
    verticalAlignment?: VerticalAlignment
    distribution?: GroupDistribution
    length?: SpacerElement['length']
    limit?: number
    numericValue?: NumericSource
    series?: SeriesSource
    rings?: ProgressRingDatum[]
    min?: number
    max?: number
    trackColor?: string
    fillColor?: string | null
    thickness?: number
    centerLabel?: ValueSource | null
    density?: VisualDataDensity
    lineColor?: string
    barColor?: string
    gap?: number
  }
}

export interface UpdateProjectMetadataOperation extends OperationBase {
  type: 'update-project-metadata'
  patch: {
    name?: string
    localReference?: LocalReferenceMetadata | null
  }
}

export interface SetPublicDataSourceOperation extends OperationBase {
  type: 'set-public-data-source'
  source: DataSourceConfig
  data: NormalizedDataState
}

export interface SetDataBindingsOperation extends OperationBase {
  type: 'set-data-bindings'
  bindings: DataBinding[]
}

export interface SetLayoutBackgroundOperation extends OperationBase {
  type: 'set-layout-background'
  scope?: DesignScope
  background: WidgetBackground
}

export interface ReorderChildrenOperation extends OperationBase {
  type: 'reorder-children'
  elementId: string
  childId: string
  toIndex: number
  scope?: DesignScope
}

export interface InsertElementOperation extends OperationBase {
  type: 'insert-element'
  parentId: string
  element: WidgetElement
  index?: number
  scope?: DesignScope
}

export interface RemoveElementOperation extends OperationBase {
  type: 'remove-element'
  elementId: string
  scope?: DesignScope
}

export interface RestoreSnapshotOperation extends OperationBase {
  type: 'restore-snapshot'
  snapshot: WidgetProject
}

export type WidgetOperation =
  | SetDesignScopeOperation
  | SetSelectionOperation
  | UpdateElementStyleOperation
  | UpdateTextStyleOperation
  | UpdateElementContentOperation
  | UpdateProjectMetadataOperation
  | SetPublicDataSourceOperation
  | SetDataBindingsOperation
  | SetLayoutBackgroundOperation
  | ReorderChildrenOperation
  | InsertElementOperation
  | RemoveElementOperation
  | RestoreSnapshotOperation

export type OperationFailureCode =
  | 'STALE_REVISION'
  | 'INVALID_OPERATION'
  | 'INVALID_PROJECT'
  | 'TARGET_NOT_FOUND'
  | 'TARGET_TYPE_MISMATCH'

export interface OperationSuccess {
  ok: true
  state: WidgetProject
  revision: number
  changedSizes: WidgetSize[]
  warnings: string[]
  selection: WidgetSelection | null
  message: string
}

export interface OperationFailure {
  ok: false
  state: WidgetProject
  revision: number
  changedSizes: []
  warnings: string[]
  selection: WidgetSelection | null
  code: OperationFailureCode
  message: string
}

export type OperationResult = OperationSuccess | OperationFailure

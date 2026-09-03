import { createContext, Script, runInContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { createSampleWidgetProject } from '~/domain/widget/fixture'
import {
  generateScriptableCode,
  getScriptableExportIssues,
  isScriptableExportReady
} from '~/domain/widget/scriptable'
import { createVisualDataElement } from '~/domain/widget/visual-data'

describe('deterministic Scriptable export', () => {
  it('generates stable, syntactically valid source for the fixed fixture', () => {
    const first = generateScriptableCode(createSampleWidgetProject())
    const second = generateScriptableCode(createSampleWidgetProject())

    expect(first.code).toBeTruthy()
    expect(first.code).toBe(second.code)
    if (!first.code) {
      return
    }

    expect(() => new Script(first.code!)).not.toThrow()
    expect(first.code).toContain('config.widgetFamily')
    expect(first.code).toContain('function renderSmall')
    expect(first.code).toContain('function renderMedium')
    expect(first.code).toContain('function renderLarge')
    expect(first.code).toContain('new LinearGradient()')
    expect(first.code).toContain('SFSymbol.named')
    expect(first.code).toContain('Request(source).loadImage')
    expect(first.code).toContain('Keychain.contains')
    expect(first.code).toContain('FileManager.local()')
    expect(first.code).toContain('applyFillingContentMode')
  })

  it('runs each generated widget family through a Scriptable API harness', async () => {
    const result = generateScriptableCode(createSampleWidgetProject())

    expect(result.code).toBeTruthy()
    if (!result.code) {
      return
    }

    for (const family of ['small', 'medium', 'large']) {
      const completed = new Promise<MockContainer>(resolve => {
        const context = createScriptableHarness(family, resolve, true)
        runInContext(result.code!, context)
      })
      const widget = await completed

      expect(widget.children.length).toBeGreaterThan(0)
    }
  })

  it('presents every generated family when run directly in Scriptable', async () => {
    const result = generateScriptableCode(createSampleWidgetProject())

    expect(result.code).toBeTruthy()
    if (!result.code) {
      return
    }

    for (const family of ['small', 'medium', 'large']) {
      const completed = new Promise<MockContainer>(resolve => {
        const context = createScriptableHarness(family, resolve, false)
        runInContext(result.code!, context)
      })
      const widget = await completed

      expect(widget.presentedFamily).toBe(family)
    }
  })

  it('renders the bounded visual-data elements through the Scriptable harness', async () => {
    const project = createSampleWidgetProject()
    const visualTypes = ['progress-ring', 'progress-bar', 'sparkline', 'bar-chart'] as const
    visualTypes.forEach((type, index) => {
      project.layouts.medium.root.children.push(
        createVisualDataElement(type, `export-${type}-${index}`)
      )
    })

    const result = generateScriptableCode(project)

    expect(result.code).toBeTruthy()
    if (!result.code) {
      return
    }
    expect(result.code).toContain('drawVisualData')
    expect(result.code).toContain('new Path()')
    expect(result.code).toContain('limitedSeries')
    expect(result.code).toContain('Math.round(ratio * 100) + "%"')

    const completed = new Promise<MockContainer>(resolve => {
      const context = createScriptableHarness('medium', resolve, true)
      runInContext(result.code!, context)
    })
    const widget = await completed

    expect(widget.children.length).toBeGreaterThan(0)
  })

  it('reports empty, invalid, and bounded visual-data sources', () => {
    const project = createSampleWidgetProject()
    const empty = createVisualDataElement('sparkline', 'empty-series')
    if (empty.type !== 'sparkline') {
      throw new Error('Sparkline fixture was not created')
    }
    empty.values = {
      kind: 'binding',
      bindingId: 'forecast',
      fallback: []
    }
    const bounded = createVisualDataElement('bar-chart', 'long-series')
    if (bounded.type !== 'bar-chart') {
      throw new Error('Bar chart fixture was not created')
    }
    bounded.values = {
      kind: 'literal',
      value: Array.from({ length: 9 }, (_, index) => index)
    }
    const oversized = createVisualDataElement('progress-bar', 'oversized-progress')
    oversized.style.width = 400
    project.layouts.small.root.children.push(empty, bounded, oversized)

    const issues = getScriptableExportIssues(project)

    expect(issues.some(issue => issue.code === 'VISUAL_DATA_NO_POINTS')).toBe(true)
    expect(issues.some(issue => issue.code === 'VISUAL_DATA_INVALID_POINTS')).toBe(true)
    expect(issues.some(issue => issue.code === 'VISUAL_DATA_POINTS_BOUNDED')).toBe(true)
    expect(issues.some(issue => issue.code === 'VISUAL_DATA_DIMENSION_EXCEEDS_WIDGET')).toBe(true)
  })

  it('keeps browser-local image references as export warnings, not blockers', () => {
    const project = createSampleWidgetProject()
    const issues = getScriptableExportIssues(project)

    expect(issues.some(issue => issue.code === 'LOCAL_IMAGE_SOURCE')).toBe(true)
    expect(issues.some(issue => issue.severity === 'blocking')).toBe(false)
    expect(isScriptableExportReady(project)).toBe(true)
  })

  it('blocks a public API with an unsupported protocol', () => {
    const project = createSampleWidgetProject()
    project.dataSource = {
      kind: 'public-api',
      url: 'ftp://weather.example.test/current',
      method: 'GET',
      parameters: [],
      headers: [],
      refreshMinutes: 30,
      secretPlaceholders: []
    }

    const result = generateScriptableCode(project)

    expect(result.code).toBeNull()
    expect(result.issues.some(issue => issue.code === 'UNSUPPORTED_API_PROTOCOL')).toBe(true)
  })

  it('emits Keychain lookup code without embedding a secret value', () => {
    const project = createSampleWidgetProject()
    project.dataSource = {
      kind: 'public-api',
      url: 'https://weather.example.test/current',
      method: 'GET',
      parameters: [{ key: 'api_key', value: '{{WEATHER_API_KEY}}' }],
      headers: [],
      refreshMinutes: 30,
      secretPlaceholders: [{
        name: 'WEATHER_API_KEY',
        label: 'Weather API key',
        location: 'query'
      }]
    }

    const result = generateScriptableCode(project)

    expect(result.code).toBeTruthy()
    expect(result.code).toContain('Keychain.get(name)')
    expect(result.code).toContain('{{WEATHER_API_KEY}}')
    expect(result.code).not.toContain('secret-value')
  })

  it('blocks invalid canonical state before source generation', () => {
    const project = createSampleWidgetProject()
    project.layouts.small.root.children[0]!.style.opacity = 2

    const result = generateScriptableCode(project)

    expect(result.code).toBeNull()
    expect(result.issues.some(issue => issue.code === 'INVALID_PROJECT')).toBe(true)
  })
})

class MockText {
  text: string

  constructor(text: string) {
    this.text = text
  }

  leftAlignText(): void {}
  centerAlignText(): void {}
  rightAlignText(): void {}
  applyDateStyle(): void {}
  applyTimeStyle(): void {}
  applyRelativeStyle(): void {}
}

class MockImageWidget {
  leftAlignImage(): void {}
  centerAlignImage(): void {}
  rightAlignImage(): void {}
  applyFittingContentMode(): void {}
  applyFillingContentMode(): void {}
}

class MockContainer {
  children: unknown[] = []
  presentedFamily: string | null = null

  setPadding(): void {}
  layoutHorizontally(): void {}
  layoutVertically(): void {}
  topAlignContent(): void {}
  centerAlignContent(): void {}
  bottomAlignContent(): void {}

  addText(text: string): MockText {
    const child = new MockText(text)
    this.children.push(child)
    return child
  }

  addDate(): MockText {
    const child = new MockText('date')
    this.children.push(child)
    return child
  }

  addImage(): MockImageWidget {
    const child = new MockImageWidget()
    this.children.push(child)
    return child
  }

  addSpacer(): unknown {
    const child = { type: 'spacer' }
    this.children.push(child)
    return child
  }

  addStack(): MockContainer {
    const child = new MockContainer()
    this.children.push(child)
    return child
  }

  async presentSmall(): Promise<void> {
    this.presentedFamily = 'small'
  }

  async presentMedium(): Promise<void> {
    this.presentedFamily = 'medium'
  }

  async presentLarge(): Promise<void> {
    this.presentedFamily = 'large'
  }
}

function createScriptableHarness(
  family: string,
  resolve: (widget: MockContainer) => void,
  runsInWidget: boolean
): Record<string, unknown> {
  let widget: MockContainer | null = null
  let presentedWidget: MockContainer | null = null
  const scriptable = {
    setWidget(value: MockContainer) {
      widget = value
    },
    complete() {
      if (widget || presentedWidget) {
        resolve(widget ?? presentedWidget!)
      }
    }
  }

  const fontFactories = [
    'boldRoundedSystemFont',
    'boldSystemFont',
    'footnote',
    'italicSystemFont',
    'mediumMonospacedSystemFont',
    'mediumSystemFont',
    'regularSystemFont',
    'semiboldSystemFont',
    'systemFont'
  ]
  const Font = Object.fromEntries(fontFactories.map(name => [name, () => ({ name })]))

  class MockImage {
    static fromFile(): null {
      return null
    }
  }

  const originalPresentSmall = MockContainer.prototype.presentSmall
  const originalPresentMedium = MockContainer.prototype.presentMedium
  const originalPresentLarge = MockContainer.prototype.presentLarge
  MockContainer.prototype.presentSmall = async function (): Promise<void> {
    presentedWidget = this
    await originalPresentSmall.call(this)
  }
  MockContainer.prototype.presentMedium = async function (): Promise<void> {
    presentedWidget = this
    await originalPresentMedium.call(this)
  }
  MockContainer.prototype.presentLarge = async function (): Promise<void> {
    presentedWidget = this
    await originalPresentLarge.call(this)
  }

  class MockRequest {
    constructor(public url: string) {}

    async loadImage(): Promise<null> {
      return null
    }

    async loadJSON(): Promise<Record<string, unknown>> {
      return {}
    }
  }

  class MockDateFormatter {
    useMediumDateStyle(): void {}
    useMediumTimeStyle(): void {}
    string(value: Date): string {
      return value.toISOString()
    }
  }

  class MockDrawContext {
    size = { width: 0, height: 0 }
    opaque = true
    drawImageInRect(): void {}
    setFillColor(): void {}
    setStrokeColor(): void {}
    setLineWidth(): void {}
    strokeEllipse(): void {}
    fillRect(): void {}
    fillEllipse(): void {}
    setFont(): void {}
    setTextColor(): void {}
    setTextAlignedCenter(): void {}
    drawTextInRect(): void {}
    addPath(): void {}
    strokePath(): void {}
    fillPath(): void {}
    getImage(): MockImage {
      return new MockImage()
    }
  }

  class MockFileManager {
    static local(): MockFileManager {
      return new MockFileManager()
    }

    libraryDirectory(): string {
      return '/library'
    }

    joinPath(left: string, right: string): string {
      return `${left}/${right}`
    }

    fileExists(): boolean {
      return false
    }

    readString(): string {
      return ''
    }

    writeString(): void {}
  }

  const SFSymbol = {
    named(name: string) {
      return {
        name,
        image: new MockImage(),
        applyFont(): void {}
      }
    }
  }

  class MockLinearGradient {}
  class MockPoint {
    constructor(public x: number, public y: number) {}
  }
  class MockRect {
    constructor(
      public x: number,
      public y: number,
      public width: number,
      public height: number
    ) {}
  }
  class MockSize {
    constructor(public width: number, public height: number) {}
  }
  class MockPath {
    addRoundedRect(): void {}
    addLines(): void {}
    addLine(): void {}
    closeSubpath(): void {}
  }
  class MockColor {
    constructor(public hex: string, public opacity = 1) {}
  }

  return createContext({
    Color: MockColor,
    DateFormatter: MockDateFormatter,
    DrawContext: MockDrawContext,
    FileManager: MockFileManager,
    Font,
    Image: MockImage,
    Keychain: {
      contains: () => false,
      get: () => ''
    },
    LinearGradient: MockLinearGradient,
    ListWidget: MockContainer,
    Point: MockPoint,
    Path: MockPath,
    Rect: MockRect,
    Request: MockRequest,
    SFSymbol,
    Script: scriptable,
    Size: MockSize,
    config: { widgetFamily: family, runsInWidget },
    console
  })
}

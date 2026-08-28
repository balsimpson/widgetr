import { describe, expect, it } from 'vitest'
import { importScriptableProject } from '~/domain/widget/importer'
import { createSampleWidgetProject } from '~/domain/widget/fixture'
import { generateScriptableCode } from '~/domain/widget/scriptable'

describe('best-effort Scriptable import', () => {
  it('reconstructs a Widgetr export without executing its JavaScript', () => {
    const exported = generateScriptableCode(createSampleWidgetProject())
    if (!exported.code) {
      throw new Error('The sample export should be available for the import round trip')
    }

    const result = importScriptableProject(exported.code, '2026-08-28T06:00:00.000Z')

    expect(result.mode).toBe('widgetr-export')
    expect(result.project.data.value.location).toBe('Kochi')
    expect(result.project.layouts.large.root.id).toBe('root')
    expect(result.report.reproduced).toContain('Recovered the exported data snapshot and all three layout trees.')
    expect(result.report.approximated).toEqual([])
    expect(result.report.dataCalls).toEqual([])
  })

  it('keeps arbitrary scripts in a labelled safe starting point', () => {
    const result = importScriptableProject(
      'const widget = new ListWidget(); widget.addText("Hello"); fetch("https://example.com"); Keychain.get("TOKEN");',
      '2026-08-28T06:00:00.000Z'
    )

    expect(result.mode).toBe('best-effort')
    expect(result.report.reproduced).toContain('Detected 1 text call and 0 image calls.')
    expect(result.report.approximated).toHaveLength(1)
    expect(result.report.unsupported.some(item => item.includes('Arbitrary JavaScript'))).toBe(true)
    expect(result.report.dataCalls).toEqual(['fetch'])
    expect(result.report.requiredUserInput).toHaveLength(2)
    expect(result.project.importReport).toEqual(result.report)
  })

  it('reports Scriptable services that cannot become canonical widget state', () => {
    const result = importScriptableProject(
      'const draw = new DrawContext(); const table = new UITable(); table.show();',
      '2026-08-28T06:00:00.000Z'
    )

    expect(result.report.unsupported).toEqual(expect.arrayContaining([
      expect.stringContaining('DrawContext'),
      expect.stringContaining('UITable')
    ]))
    expect(result.report.dataCalls).toEqual([])
  })

  it('keeps oversized source in a safe report without interpreting it', () => {
    const result = importScriptableProject('x'.repeat(200_001), '2026-08-28T06:00:00.000Z')

    expect(result.mode).toBe('best-effort')
    expect(result.report.unsupported.some(item => item.includes('longer than'))).toBe(true)
    expect(result.report.dataCalls).toEqual([])
  })
})

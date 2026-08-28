import type { EdgeInsets, ElementStyle, TextStyle } from '~/types/widget'

export function createEdgeInsets(value = 0): EdgeInsets {
  return {
    top: value,
    right: value,
    bottom: value,
    left: value
  }
}

export function createElementStyle(overrides: Partial<ElementStyle> = {}): ElementStyle {
  return {
    opacity: 1,
    padding: createEdgeInsets(),
    cornerRadius: 0,
    border: null,
    background: null,
    width: 'fit',
    height: 'fit',
    alignSelf: 'leading',
    ...overrides
  }
}

export function createTextStyle(overrides: Partial<TextStyle> = {}): TextStyle {
  return {
    fontSize: 14,
    fontWeight: 'regular',
    fontDesign: 'default',
    color: '#FFFFFF',
    alignment: 'leading',
    lineLimit: 1,
    minimumScaleFactor: 0.7,
    italic: false,
    ...overrides
  }
}

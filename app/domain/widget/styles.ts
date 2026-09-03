import { resolveValueText } from './values'
import type {
  ElementStyle,
  GroupDirection,
  JsonObject,
  TextStyle,
  WidgetBackground,
  WidgetProject
} from '~/types/widget'

export type StyleRecord = Record<string, string | number | undefined>

const gradientDirections: Record<Extract<WidgetBackground, { kind: 'gradient' }>['direction'], string> = {
  top: 'to top',
  'top-right': 'to top right',
  right: 'to right',
  'bottom-right': 'to bottom right',
  bottom: 'to bottom',
  'bottom-left': 'to bottom left',
  left: 'to left',
  'top-left': 'to top left'
}

function rgba(hex: string, opacity: number): string {
  const red = Number.parseInt(hex.slice(1, 3), 16)
  const green = Number.parseInt(hex.slice(3, 5), 16)
  const blue = Number.parseInt(hex.slice(5, 7), 16)
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`
}

function cssUrl(value: string): string {
  return `url(${JSON.stringify(value)})`
}

function dimension(value: ElementStyle['width']): string {
  if (value === 'fill') {
    return '100%'
  }
  if (value === 'fit') {
    return 'fit-content'
  }
  return `${value}px`
}

export function backgroundStyle(
  background: WidgetBackground,
  project: WidgetProject,
  item: JsonObject | null = null
): StyleRecord {
  if (background.kind === 'solid') {
    return {
      backgroundColor: rgba(background.color, background.opacity)
    }
  }

  if (background.kind === 'gradient') {
    const colors = background.colors.map(color => rgba(color, background.opacity)).join(', ')
    return {
      backgroundImage: `linear-gradient(${gradientDirections[background.direction]}, ${colors})`
    }
  }

  const source = resolveValueText(background.source, project, item)
  return {
    backgroundColor: background.overlayColor,
    backgroundImage: `linear-gradient(${rgba(background.overlayColor, background.overlayOpacity)}, ${rgba(background.overlayColor, background.overlayOpacity)}), ${cssUrl(source)}`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: background.fit === 'fill' ? '100% 100%' : background.fit
  }
}

export function elementStyle(
  style: ElementStyle,
  project: WidgetProject,
  item: JsonObject | null = null,
  parentDirection: GroupDirection = 'vertical'
): StyleRecord {
  const fillsParentAxis = parentDirection === 'horizontal'
    ? style.width === 'fill'
    : style.height === 'fill'

  return {
    boxSizing: 'border-box',
    width: dimension(style.width),
    height: dimension(style.height),
    minWidth: 0,
    minHeight: 0,
    flex: fillsParentAxis ? '1 1 0' : undefined,
    opacity: style.opacity,
    padding: `${style.padding.top}px ${style.padding.right}px ${style.padding.bottom}px ${style.padding.left}px`,
    borderRadius: `${style.cornerRadius}px`,
    border: style.border ? `${style.border.width}px solid ${style.border.color}` : 'none',
    alignSelf: style.alignSelf === 'leading'
      ? 'flex-start'
      : style.alignSelf === 'trailing'
        ? 'flex-end'
        : 'center',
    ...(style.background ? backgroundStyle(style.background, project, item) : {})
  }
}

export function groupStyle(
  direction: GroupDirection,
  spacing: number,
  horizontalAlignment: 'leading' | 'center' | 'trailing',
  verticalAlignment: 'top' | 'center' | 'bottom',
  distribution: 'start' | 'center' | 'end' | 'space-between'
): StyleRecord {
  const mainAlignment = distribution === 'start'
    ? 'flex-start'
    : distribution === 'end'
      ? 'flex-end'
      : distribution
  const crossAlignment = direction === 'horizontal'
    ? verticalAlignment === 'top'
      ? 'flex-start'
      : verticalAlignment === 'bottom'
        ? 'flex-end'
        : 'center'
    : horizontalAlignment === 'leading'
      ? 'flex-start'
      : horizontalAlignment === 'trailing'
        ? 'flex-end'
        : 'center'

  return {
    display: 'flex',
    flexDirection: direction === 'horizontal' ? 'row' : 'column',
    gap: `${spacing}px`,
    justifyContent: mainAlignment,
    alignItems: crossAlignment
  }
}

export function textStyle(style: TextStyle): StyleRecord {
  const fontFamilies: Record<TextStyle['fontDesign'], string> = {
    default: 'var(--font-sans)',
    rounded: 'ui-rounded, "Avenir Next", sans-serif',
    monospaced: 'var(--font-mono)',
    serif: 'ui-serif, Georgia, serif'
  }
  const weights: Record<TextStyle['fontWeight'], number> = {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  }

  return {
    display: '-webkit-box',
    overflow: 'hidden',
    color: style.color,
    fontFamily: fontFamilies[style.fontDesign],
    fontSize: `${style.fontSize}px`,
    fontStyle: style.italic ? 'italic' : 'normal',
    fontWeight: weights[style.fontWeight],
    lineHeight: 1.08,
    textAlign: style.alignment === 'leading'
      ? 'left'
      : style.alignment === 'trailing'
        ? 'right'
        : 'center',
    whiteSpace: style.lineLimit === 1 ? 'nowrap' : 'normal',
    overflowWrap: style.lineLimit === 1 ? 'normal' : 'anywhere',
    textOverflow: 'clip',
    '-webkit-box-orient': 'vertical',
    '-webkit-line-clamp': style.lineLimit
  }
}

export function spacerStyle(length: number | 'flex', parentDirection: GroupDirection): StyleRecord {
  if (length === 'flex') {
    return {
      flex: '1 1 0',
      minWidth: 0,
      minHeight: 0
    }
  }

  return parentDirection === 'horizontal'
    ? { flex: `0 0 ${length}px`, width: `${length}px`, height: '1px' }
    : { flex: `0 0 ${length}px`, width: '1px', height: `${length}px` }
}

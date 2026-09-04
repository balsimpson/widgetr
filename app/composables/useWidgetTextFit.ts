import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type ComputedRef,
  type Ref
} from 'vue'
import type { ElementStyle } from '~/types/widget'

interface UseWidgetTextFitOptions {
  text: ComputedRef<string>
  fontSize: ComputedRef<number>
  lineLimit: ComputedRef<number>
  width: ComputedRef<ElementStyle['width']>
}

const MINIMUM_FITTED_FONT_SIZE = 0.1

function cssPixels(value: string): number {
  const pixels = Number.parseFloat(value)
  return Number.isFinite(pixels) ? pixels : 0
}

export function useWidgetTextFit(options: UseWidgetTextFitOptions): {
  containerRef: Ref<HTMLElement | null>
  contentRef: Ref<HTMLElement | null>
  style: ComputedRef<Record<string, string>>
} {
  const containerRef = ref<HTMLElement | null>(null)
  const contentRef = ref<HTMLElement | null>(null)
  const fittedFontSize = ref<number | null>(null)
  let resizeObserver: ResizeObserver | null = null
  let animationFrame: number | null = null

  function fitText(): void {
    const container = containerRef.value
    const content = contentRef.value
    if (
      !container
      || !content
      || options.width.value === 'fit'
      || options.lineLimit.value !== 1
      || !options.text.value
    ) {
      fittedFontSize.value = null
      return
    }

    const containerStyle = window.getComputedStyle(container)
    const availableWidth = container.clientWidth
      - cssPixels(containerStyle.paddingLeft)
      - cssPixels(containerStyle.paddingRight)
      - cssPixels(containerStyle.borderLeftWidth)
      - cssPixels(containerStyle.borderRightWidth)
    const contentWidth = content.getBoundingClientRect().width
    const currentFontSize = cssPixels(containerStyle.fontSize)
    const baseFontSize = Math.max(MINIMUM_FITTED_FONT_SIZE, options.fontSize.value)

    if (availableWidth <= 0 || contentWidth <= 0 || currentFontSize <= 0) {
      return
    }

    // Measure at the current size, then estimate the natural width at the design size.
    // A small safety margin avoids a one-pixel clip after browser rounding.
    const naturalWidth = contentWidth * baseFontSize / currentFontSize
    const nextFontSize = naturalWidth > availableWidth
      ? Math.max(
          MINIMUM_FITTED_FONT_SIZE,
          baseFontSize * availableWidth / naturalWidth * 0.98
        )
      : null
    const roundedFontSize = nextFontSize === null
      ? null
      : Number(nextFontSize.toFixed(2))

    if (fittedFontSize.value !== roundedFontSize) {
      fittedFontSize.value = roundedFontSize
    }
  }

  function scheduleFit(): void {
    if (typeof window === 'undefined') {
      return
    }
    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame)
    }
    animationFrame = window.requestAnimationFrame(() => {
      animationFrame = null
      fitText()
    })
  }

  onMounted(() => {
    if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
      resizeObserver = new ResizeObserver(scheduleFit)
      resizeObserver.observe(containerRef.value)
    }
    scheduleFit()
  })

  watch(
    [options.text, options.fontSize, options.lineLimit, options.width],
    scheduleFit,
    { flush: 'post' }
  )

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    resizeObserver = null
    if (animationFrame !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(animationFrame)
    }
    animationFrame = null
  })

  return {
    containerRef,
    contentRef,
    style: computed((): Record<string, string> => {
      if (fittedFontSize.value === null) {
        return {}
      }
      return { fontSize: `${fittedFontSize.value}px` }
    })
  }
}

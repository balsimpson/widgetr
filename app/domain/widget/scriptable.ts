import { resolveValueSource } from './values'
import { validateWidgetProject } from './schema'
import {
  resolveNumericSourceDetails,
  resolveSeriesSourceDetails,
  visualDataPointLimit
} from './visual-data'
import { WIDGET_DIMENSIONS } from '~/types/widget'
import type {
  ValueSource,
  WidgetBackground,
  WidgetDiagnostic,
  WidgetElement,
  WidgetProject,
  WidgetSize
} from '~/types/widget'

export interface ScriptableExportResult {
  code: string | null
  issues: WidgetDiagnostic[]
}

const REMOTE_IMAGE_PATTERN = /^https?:\/\//i
const SECRET_TOKEN_PATTERN = /\{\{([A-Z][A-Z0-9_]*)\}\}/g
const SCRIPTABLE_RUNTIME_SOURCE = String.raw`const SECRET_TOKEN_PATTERN = /\{\{([A-Z][A-Z0-9_]*)\}\}/g;
const REMOTE_IMAGE_PATTERN = /^https?:\/\//i;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function resolvePath(value, path) {
  var current = value;
  for (var index = 0; index < path.length; index += 1) {
    var segment = path[index];
    if (typeof segment === "number") {
      if (!Array.isArray(current)) {
        return undefined;
      }
      current = current[segment];
      continue;
    }
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function setPath(target, path, value) {
  if (path.length === 0) {
    return;
  }
  var current = target;
  for (var index = 0; index < path.length - 1; index += 1) {
    var segment = path[index];
    var nextSegment = path[index + 1];
    if (current[segment] === undefined || current[segment] === null) {
      current[segment] = typeof nextSegment === "number" ? [] : {};
    }
    current = current[segment];
  }
  current[path[path.length - 1]] = value;
}

function bindingFor(bindingId) {
  for (var index = 0; index < PROJECT.bindings.length; index += 1) {
    if (PROJECT.bindings[index].id === bindingId) {
      return PROJECT.bindings[index];
    }
  }
  return null;
}

function resolveRawSource(source, data, item) {
  var value;
  if (source.kind === "literal") {
    value = source.value;
  } else if (source.kind === "binding") {
    var binding = bindingFor(source.bindingId);
    value = binding ? resolvePath(data, binding.path) : undefined;
  } else {
    value = resolvePath(item, source.path);
  }
  return value;
}

function resolveSource(source, data, item) {
  var value = resolveRawSource(source, data, item);
  if (value === undefined || value === null || typeof value === "object") {
    return source.fallback;
  }
  return value;
}

function sourceText(source, data, item) {
  var value = resolveSource(source, data, item);
  var text = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  if (source.kind === "literal" || !source.format) {
    return text;
  }
  return source.format.prefix + text + source.format.suffix;
}

function numberSourceValue(source, data, item) {
  var raw = resolveRawSource(source, data, item);
  var value = typeof raw === "number"
    ? raw
    : typeof raw === "string" && raw.trim() !== ""
      ? Number(raw)
      : NaN;
  if (Number.isFinite(value)) {
    return value;
  }
  return source.kind === "literal" ? null : source.fallback;
}

function seriesSourceValues(source, data, item) {
  var raw = resolveRawSource(source, data, item);
  var values = Array.isArray(raw)
    ? raw
    : source.kind === "literal"
      ? []
      : source.fallback;
  return values.map(function (value) {
    return typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;
  }).filter(function (value) {
    return Number.isFinite(value);
  });
}

function visualPointLimit(density) {
  var family = config.widgetFamily === "small" || config.widgetFamily === "large"
    ? config.widgetFamily
    : "medium";
  var limits = {
    compact: { small: 6, medium: 10, large: 14 },
    balanced: { small: 8, medium: 16, large: 24 },
    detailed: { small: 10, medium: 20, large: 28 }
  };
  return limits[density][family];
}

function limitedSeries(values, density) {
  return values.slice(-visualPointLimit(density));
}

function repeatItems(data, bindingId) {
  var binding = bindingFor(bindingId);
  var value = binding ? resolvePath(data, binding.path) : undefined;
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(function (item) {
    return isRecord(item);
  });
}

function color(hex, opacity) {
  return new Color(hex, opacity === undefined ? 1 : opacity);
}

function gradientPoints(direction) {
  var points = {
    top: [[0.5, 1], [0.5, 0]],
    "top-right": [[0, 1], [1, 0]],
    right: [[0, 0.5], [1, 0.5]],
    "bottom-right": [[0, 0], [1, 1]],
    bottom: [[0.5, 0], [0.5, 1]],
    "bottom-left": [[1, 0], [0, 1]],
    left: [[1, 0.5], [0, 0.5]],
    "top-left": [[1, 1], [0, 0]]
  };
  return points[direction] || points.bottom;
}

function applyGradient(target, background) {
  var gradient = new LinearGradient();
  gradient.colors = background.colors.map(function (value) {
    return color(value, background.opacity);
  });
  gradient.locations = background.colors.map(function (_, index) {
    return background.colors.length === 1 ? 0 : index / (background.colors.length - 1);
  });
  var points = gradientPoints(background.direction);
  gradient.startPoint = new Point(points[0][0], points[0][1]);
  gradient.endPoint = new Point(points[1][0], points[1][1]);
  target.backgroundGradient = gradient;
}

function imageWithOverlay(image, overlayColor, overlayOpacity) {
  if (overlayOpacity <= 0) {
    return image;
  }
  var context = new DrawContext();
  context.size = image.size;
  context.opaque = false;
  context.drawImageInRect(image, new Rect(0, 0, image.size.width, image.size.height));
  context.setFillColor(color(overlayColor, overlayOpacity));
  context.fillRect(new Rect(0, 0, image.size.width, image.size.height));
  return context.getImage();
}

async function loadImage(value) {
  var source = String(value);
  try {
    if (REMOTE_IMAGE_PATTERN.test(source)) {
      return await new Request(source).loadImage();
    }
    if (source.indexOf("file://") === 0) {
      return Image.fromFile(source.slice("file://".length));
    }
    if (source.indexOf("/") === 0) {
      return Image.fromFile(source);
    }
  } catch (_) {
    return null;
  }
  return null;
}

async function applyBackground(target, background, data, item) {
  if (!background) {
    return;
  }
  if (background.kind === "solid") {
    target.backgroundColor = color(background.color, background.opacity);
    return;
  }
  if (background.kind === "gradient") {
    applyGradient(target, background);
    return;
  }
  var image = await loadImage(sourceText(background.source, data, item));
  if (image) {
    target.backgroundImage = imageWithOverlay(image, background.overlayColor, background.overlayOpacity);
  } else {
    target.backgroundColor = color(background.overlayColor, background.overlayOpacity);
  }
}

async function applyContainerStyle(target, style, data, item) {
  target.setPadding(style.padding.top, style.padding.right, style.padding.bottom, style.padding.left);
  target.cornerRadius = style.cornerRadius;
  if (style.border) {
    target.borderWidth = style.border.width;
    target.borderColor = color(style.border.color);
  }
  var width = typeof style.width === "number" ? style.width : 0;
  var height = typeof style.height === "number" ? style.height : 0;
  if (width > 0 || height > 0) {
    target.size = new Size(width, height);
  }
  await applyBackground(target, style.background, data, item);
}

function configureGroup(target, group) {
  target.spacing = group.spacing;
  if (group.direction === "horizontal") {
    target.layoutHorizontally();
    if (group.verticalAlignment === "center") {
      target.centerAlignContent();
    } else if (group.verticalAlignment === "bottom") {
      target.bottomAlignContent();
    } else {
      target.topAlignContent();
    }
  } else {
    target.layoutVertically();
  }
}

function addFlexibleSpacer(target) {
  target.addSpacer();
}

async function renderGroupChildren(target, group, data, item) {
  var children = group.children.filter(function (child) {
    return child.visible;
  });
  if (group.distribution === "end" || group.distribution === "center") {
    addFlexibleSpacer(target);
  }
  for (var index = 0; index < children.length; index += 1) {
    if (group.distribution === "space-between" && index > 0) {
      addFlexibleSpacer(target);
    }
    await renderElement(target, children[index], data, item, group.direction, group.horizontalAlignment);
  }
  if (group.distribution === "center") {
    addFlexibleSpacer(target);
  }
}

async function renderText(parent, element, data, item) {
  var target = parent.addStack();
  await applyContainerStyle(target, element.style, data, item);
  var text = target.addText(sourceText(element.value, data, item));
  applyTextStyle(text, element.textStyle, element.style.opacity);
}

function fontFor(style) {
  if (style.fontDesign === "serif") {
    return new Font(style.italic ? "Georgia-Italic" : "Georgia", style.fontSize);
  }
  if (style.italic) {
    return Font.italicSystemFont(style.fontSize);
  }
  var design = style.fontDesign === "rounded"
    ? "Rounded"
    : style.fontDesign === "monospaced"
      ? "Monospaced"
      : "";
  var weight = {
    regular: "regular",
    medium: "medium",
    semibold: "semibold",
    bold: "bold"
  }[style.fontWeight];
  var method = weight + design + "SystemFont";
  return Font[method](style.fontSize);
}

function applyTextStyle(target, style, opacity) {
  target.textColor = color(style.color);
  target.font = fontFor(style);
  target.textOpacity = opacity;
  target.lineLimit = style.lineLimit;
  target.minimumScaleFactor = style.minimumScaleFactor;
  if (style.alignment === "center") {
    target.centerAlignText();
  } else if (style.alignment === "trailing") {
    target.rightAlignText();
  } else {
    target.leftAlignText();
  }
}

function applyDateStyle(target, format) {
  if (format === "relative") {
    target.applyRelativeStyle();
  } else if (format === "time") {
    target.applyTimeStyle();
  } else {
    target.applyDateStyle();
  }
}

function dateTimeText(value) {
  var formatter = new DateFormatter();
  formatter.useMediumDateStyle();
  var datePart = formatter.string(value);
  formatter.useMediumTimeStyle();
  return datePart + " " + formatter.string(value);
}

async function renderDate(parent, element, data, item) {
  var target = parent.addStack();
  await applyContainerStyle(target, element.style, data, item);
  var raw = resolveSource(element.value, data, item);
  var date = new Date(String(raw));
  if (Number.isNaN(date.getTime()) || element.format === "date-time") {
    var fallback = target.addText(
      element.format === "date-time" && !Number.isNaN(date.getTime())
        ? dateTimeText(date)
        : sourceText(element.value, data, item)
    );
    applyTextStyle(fallback, element.textStyle, element.style.opacity);
    return;
  }
  var dateWidget = target.addDate(date);
  applyTextStyle(dateWidget, element.textStyle, element.style.opacity);
  applyDateStyle(dateWidget, element.format);
}

async function renderImage(parent, element, data, item) {
  var target = parent.addStack();
  await applyContainerStyle(target, element.style, data, item);
  var image = await loadImage(sourceText(element.source, data, item));
  if (!image) {
    var unavailable = target.addText("Image unavailable");
    unavailable.textColor = color("#FFFFFF");
    unavailable.font = Font.footnote();
    return;
  }
  var imageWidget = target.addImage(image);
  imageWidget.resizable = true;
  imageWidget.imageOpacity = element.style.opacity;
  if (element.fit === "contain") {
    imageWidget.applyFittingContentMode();
  } else {
    imageWidget.applyFillingContentMode();
  }
  if (typeof element.style.width === "number" || typeof element.style.height === "number") {
    imageWidget.imageSize = new Size(
      typeof element.style.width === "number" ? element.style.width : image.size.width,
      typeof element.style.height === "number" ? element.style.height : image.size.height
    );
  }
  imageWidget.cornerRadius = element.style.cornerRadius;
  if (element.style.border) {
    imageWidget.borderWidth = element.style.border.width;
    imageWidget.borderColor = color(element.style.border.color);
  }
  if (element.style.alignSelf === "center") {
    imageWidget.centerAlignImage();
  } else if (element.style.alignSelf === "trailing") {
    imageWidget.rightAlignImage();
  } else {
    imageWidget.leftAlignImage();
  }
}

async function renderSymbol(parent, element, data, item) {
  var target = parent.addStack();
  await applyContainerStyle(target, element.style, data, item);
  var symbol = SFSymbol.named(sourceText(element.name, data, item));
  if (!symbol) {
    symbol = SFSymbol.named("questionmark");
  }
  if (!symbol) {
    return;
  }
  symbol.applyFont(Font.systemFont(element.size));
  var imageWidget = target.addImage(symbol.image);
  imageWidget.imageSize = new Size(element.size, element.size);
  imageWidget.tintColor = color(element.color);
  imageWidget.imageOpacity = element.style.opacity;
  if (element.style.alignSelf === "center") {
    imageWidget.centerAlignImage();
  } else if (element.style.alignSelf === "trailing") {
    imageWidget.rightAlignImage();
  } else {
    imageWidget.leftAlignImage();
  }
}

async function renderGroup(parent, element, data, item) {
  var target = parent.addStack();
  await applyContainerStyle(target, element.style, data, item);
  configureGroup(target, element);
  await renderGroupChildren(target, element, data, item);
}

async function renderRepeat(parent, element, data, item) {
  var target = parent.addStack();
  await applyContainerStyle(target, element.style, data, item);
  target.spacing = element.spacing;
  if (element.direction === "horizontal") {
    target.layoutHorizontally();
  } else {
    target.layoutVertically();
  }
  var items = repeatItems(data, element.itemsBindingId).slice(0, element.limit);
  if (element.distribution === "end" || element.distribution === "center") {
    addFlexibleSpacer(target);
  }
  for (var index = 0; index < items.length; index += 1) {
    if (element.distribution === "space-between" && index > 0) {
      addFlexibleSpacer(target);
    }
    var itemStack = target.addStack();
    itemStack.layoutVertically();
    itemStack.spacing = 0;
    for (var childIndex = 0; childIndex < element.children.length; childIndex += 1) {
      await renderElement(itemStack, element.children[childIndex], data, items[index], "vertical", element.horizontalAlignment);
    }
  }
  if (element.distribution === "center") {
    addFlexibleSpacer(target);
  }
}

function drawNoData(context, width, height) {
  context.setFont(Font.semiboldSystemFont(10));
  context.setTextColor(color("#8C8A99"));
  context.setTextAlignedCenter();
  context.drawTextInRect("No data", new Rect(0, 0, width, height));
}

function drawRoundedRect(context, rect, radius) {
  var path = new Path();
  path.addRoundedRect(rect, radius, radius);
  context.addPath(path);
  context.fillPath();
}

function drawArc(context, centerX, centerY, radius, ratio, strokeColor, strokeWidth) {
  if (ratio <= 0) {
    return;
  }
  var start = -Math.PI / 2;
  var end = start + Math.PI * 2 * ratio;
  var segments = Math.max(12, Math.ceil(48 * ratio));
  var points = [];
  for (var index = 0; index <= segments; index += 1) {
    var angle = start + (end - start) * index / segments;
    points.push(new Point(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius));
  }
  var path = new Path();
  path.addLines(points);
  context.setStrokeColor(color(strokeColor));
  context.setLineWidth(strokeWidth);
  context.addPath(path);
  context.strokePath();
}

function drawProgressRing(context, element, data, item, width, height) {
  var dimension = Math.min(width, height);
  var centerX = width / 2;
  var centerY = height / 2;
  var scale = dimension / 100;
  var outerRadius = dimension * 0.42;
  var minimumRadius = Math.max(8 * scale, (element.thickness / 2 + 2) * scale);
  var step = element.rings.length > 1
    ? Math.min(dimension * 0.18, (outerRadius - minimumRadius) / (element.rings.length - 1))
    : 0;

  for (var index = 0; index < element.rings.length; index += 1) {
    var ring = element.rings[index];
    var radius = Math.max(minimumRadius, outerRadius - index * step);
    var strokeWidth = Math.min(element.thickness * scale, radius * 0.75);
    var value = numberSourceValue(ring.value, data, item);
    var ratio = value === null || ring.max <= ring.min
      ? null
      : Math.min(1, Math.max(0, (value - ring.min) / (ring.max - ring.min)));
    context.setStrokeColor(color(ring.trackColor));
    context.setLineWidth(strokeWidth);
    context.strokeEllipse(new Rect(centerX - radius, centerY - radius, radius * 2, radius * 2));
    if (ratio !== null) {
      drawArc(context, centerX, centerY, radius, ratio, ring.fillColor, strokeWidth);
    }
  }

  if (element.centerLabel) {
    context.setFont(Font.boldSystemFont(Math.max(10, Math.min(18, dimension * 0.18))));
    context.setTextColor(color("#FFFFFF"));
    context.setTextAlignedCenter();
    context.drawTextInRect(sourceText(element.centerLabel, data, item), new Rect(0, centerY - 10, width, 20));
  }
}

function drawProgressBar(context, element, data, item, width, height) {
  var barHeight = Math.min(height * 0.62, Math.max(6, element.thickness));
  var y = (height - barHeight) / 2;
  context.setFillColor(color(element.trackColor));
  drawRoundedRect(context, new Rect(0, y, width, barHeight), barHeight / 2);
  var value = numberSourceValue(element.value, data, item);
  if (value === null || element.max <= element.min) {
    drawNoData(context, width, height);
    return;
  }
  var ratio = Math.min(1, Math.max(0, (value - element.min) / (element.max - element.min)));
  if (ratio > 0) {
    context.setFillColor(color(element.fillColor));
    drawRoundedRect(context, new Rect(0, y, width * ratio, barHeight), barHeight / 2);
  }
  context.setFont(Font.semiboldSystemFont(9));
  context.setTextColor(color("#FFFFFF"));
  context.setTextAlignedCenter();
  context.drawTextInRect(Math.round(ratio * 100) + "%", new Rect(0, 0, width, height));
}

function seriesChartPoints(values, width, height) {
  if (values.length === 0) {
    return [];
  }
  var min = Math.min.apply(Math, values);
  var max = Math.max.apply(Math, values);
  var range = max - min;
  if (values.length === 1) {
    return [new Point(width / 2, height / 2)];
  }
  return values.map(function (value, index) {
    return new Point(
      index / (values.length - 1) * width,
      range === 0 ? height / 2 : height - (value - min) / range * height
    );
  });
}

function drawSparkline(context, element, data, item, width, height) {
  var values = limitedSeries(seriesSourceValues(element.values, data, item), element.density);
  if (values.length === 0) {
    drawNoData(context, width, height);
    return;
  }
  var points = seriesChartPoints(values, width, height - 6);
  if (element.fillColor && points.length > 1) {
    var fillPath = new Path();
    fillPath.addLines(points);
    fillPath.addLine(new Point(width, height));
    fillPath.addLine(new Point(0, height));
    fillPath.closeSubpath();
    context.setFillColor(color(element.fillColor, 0.14));
    context.addPath(fillPath);
    context.fillPath();
  }
  if (points.length === 1) {
    context.setFillColor(color(element.lineColor));
    context.fillEllipse(new Rect(points[0].x - element.thickness, points[0].y - element.thickness, element.thickness * 2, element.thickness * 2));
    return;
  }
  var path = new Path();
  path.addLines(points);
  context.setStrokeColor(color(element.lineColor));
  context.setLineWidth(element.thickness);
  context.addPath(path);
  context.strokePath();
}

function drawBarChart(context, element, data, item, width, height) {
  var values = limitedSeries(seriesSourceValues(element.values, data, item), element.density);
  if (values.length === 0) {
    drawNoData(context, width, height);
    return;
  }
  var min = Math.min.apply(Math, values);
  var max = Math.max.apply(Math, values);
  var range = max - min;
  var gap = values.length <= 1
    ? 0
    : Math.min(element.gap, Math.max(0, (width - values.length) / (values.length - 1)));
  var barWidth = Math.max(0.5, (width - gap * Math.max(0, values.length - 1)) / values.length);
  var valueY = function (value) {
    return range === 0 ? height / 2 : height - (value - min) / range * height;
  };
  var baseline = min < 0 && max > 0 ? valueY(0) : min >= 0 ? height : 0;
  context.setFillColor(color(element.barColor));
  for (var index = 0; index < values.length; index += 1) {
    var y = valueY(values[index]);
    drawRoundedRect(
      context,
      new Rect(index * (barWidth + gap), Math.min(y, baseline), barWidth, Math.max(1, Math.abs(baseline - y))),
      Math.min(2, barWidth / 2)
    );
  }
}

function visualDataImageSize(element) {
  var width = typeof element.style.width === "number" ? Math.max(1, element.style.width) : 160;
  var height = typeof element.style.height === "number"
    ? Math.max(1, element.style.height)
    : element.type === "progress-ring"
      ? element.size
      : element.type === "progress-bar"
        ? 28
        : 56;
  if (element.type === "progress-ring") {
    width = typeof element.style.width === "number" ? Math.max(1, element.style.width) : element.size;
    height = typeof element.style.height === "number" ? Math.max(1, element.style.height) : element.size;
  }
  return { width: width, height: height };
}

function drawVisualData(element, data, item) {
  var imageSize = visualDataImageSize(element);
  var width = imageSize.width;
  var height = imageSize.height;
  var context = new DrawContext();
  context.size = new Size(width, height);
  context.opaque = false;
  if (element.type === "progress-ring") {
    drawProgressRing(context, element, data, item, width, height);
  } else if (element.type === "progress-bar") {
    drawProgressBar(context, element, data, item, width, height);
  } else if (element.type === "sparkline") {
    drawSparkline(context, element, data, item, width, height);
  } else {
    drawBarChart(context, element, data, item, width, height);
  }
  return context.getImage();
}

async function renderVisualData(parent, element, data, item) {
  var target = parent.addStack();
  await applyContainerStyle(target, element.style, data, item);
  var image = drawVisualData(element, data, item);
  var imageWidget = target.addImage(image);
  imageWidget.resizable = true;
  imageWidget.imageOpacity = element.style.opacity;
  if (typeof element.style.width === "number" || typeof element.style.height === "number") {
    var imageSize = visualDataImageSize(element);
    imageWidget.imageSize = new Size(
      imageSize.width,
      imageSize.height
    );
  }
  if (element.style.alignSelf === "center") {
    imageWidget.centerAlignImage();
  } else if (element.style.alignSelf === "trailing") {
    imageWidget.rightAlignImage();
  } else {
    imageWidget.leftAlignImage();
  }
}

async function renderElementInto(parent, element, data, item) {
  if (element.type === "group") {
    await renderGroup(parent, element, data, item);
  } else if (element.type === "repeat") {
    await renderRepeat(parent, element, data, item);
  } else if (element.type === "text") {
    await renderText(parent, element, data, item);
  } else if (element.type === "date") {
    await renderDate(parent, element, data, item);
  } else if (element.type === "image") {
    await renderImage(parent, element, data, item);
  } else if (element.type === "symbol") {
    await renderSymbol(parent, element, data, item);
  } else if (element.type === "spacer") {
    if (element.length === "flex") {
      parent.addSpacer();
    } else {
      parent.addSpacer(element.length);
    }
  } else if (element.type === "progress-ring" || element.type === "progress-bar" || element.type === "sparkline" || element.type === "bar-chart") {
    await renderVisualData(parent, element, data, item);
  }
}

async function renderElement(parent, element, data, item, parentDirection, parentHorizontalAlignment) {
  if (!element.visible) {
    return;
  }
  var alignment = element.style.alignSelf === "leading"
    ? parentHorizontalAlignment
    : element.style.alignSelf;
  var target = parent;
  var alignmentSlot = null;
  if (parentDirection === "vertical" && alignment !== "leading" && element.type !== "spacer") {
    alignmentSlot = parent.addStack();
    alignmentSlot.layoutHorizontally();
    if (alignment === "center" || alignment === "trailing") {
      addFlexibleSpacer(alignmentSlot);
    }
    target = alignmentSlot;
  }
  await renderElementInto(target, element, data, item);
  if (alignmentSlot && alignment === "center") {
    addFlexibleSpacer(alignmentSlot);
  }
}

function cachePath() {
  var manager = FileManager.local();
  return manager.joinPath(manager.libraryDirectory(), "widgetr-" + PROJECT.id + ".json");
}

function readCachedData() {
  var manager = FileManager.local();
  var path = cachePath();
  if (!manager.fileExists(path)) {
    return null;
  }
  try {
    var value = JSON.parse(manager.readString(path));
    return isRecord(value) ? value : null;
  } catch (_) {
    return null;
  }
}

function writeCachedData(value) {
  try {
    var manager = FileManager.local();
    manager.writeString(cachePath(), JSON.stringify(value));
  } catch (_) {
    // A cache failure should not make a live response unusable.
  }
}

function keychainSecret(name) {
  if (!Keychain.contains(name)) {
    throw new Error("Missing Keychain secret: " + name);
  }
  return Keychain.get(name);
}

function replaceSecretTokens(value) {
  return String(value).replace(SECRET_TOKEN_PATTERN, function (_, name) {
    return keychainSecret(name);
  });
}

function recordValues(records) {
  var output = {};
  for (var index = 0; index < records.length; index += 1) {
    output[replaceSecretTokens(records[index].key)] = replaceSecretTokens(records[index].value);
  }
  return output;
}

function hasSecretToken(value, name) {
  return String(value).indexOf("{{" + name + "}}") !== -1;
}

function addQuery(url, key, value) {
  var separator = url.indexOf("?") === -1 ? "?" : "&";
  return url + separator + encodeURIComponent(key) + "=" + encodeURIComponent(value);
}

function requestData() {
  var source = PROJECT.dataSource;
  var url = replaceSecretTokens(source.url);
  var headers = recordValues(source.headers);
  var body = recordValues(source.parameters);
  var queryParameters = [];
  if (source.method === "GET") {
    for (var index = 0; index < source.parameters.length; index += 1) {
      queryParameters.push([
        replaceSecretTokens(source.parameters[index].key),
        replaceSecretTokens(source.parameters[index].value)
      ]);
    }
  }
  for (var secretIndex = 0; secretIndex < source.secretPlaceholders.length; secretIndex += 1) {
    var secret = source.secretPlaceholders[secretIndex];
    var used = hasSecretToken(source.url, secret.name);
    for (var parameterIndex = 0; parameterIndex < source.parameters.length && !used; parameterIndex += 1) {
      used = hasSecretToken(source.parameters[parameterIndex].key, secret.name)
        || hasSecretToken(source.parameters[parameterIndex].value, secret.name);
    }
    for (var headerIndex = 0; headerIndex < source.headers.length && !used; headerIndex += 1) {
      used = hasSecretToken(source.headers[headerIndex].key, secret.name)
        || hasSecretToken(source.headers[headerIndex].value, secret.name);
    }
    if (!used) {
      var secretValue = keychainSecret(secret.name);
      if (secret.location === "header") {
        headers[secret.name] = secretValue;
      } else if (secret.location === "query") {
        queryParameters.push([secret.name, secretValue]);
      } else {
        body[secret.name] = secretValue;
      }
    }
  }
  for (var queryIndex = 0; queryIndex < queryParameters.length; queryIndex += 1) {
    url = addQuery(url, queryParameters[queryIndex][0], queryParameters[queryIndex][1]);
  }
  var request = new Request(url);
  request.method = source.method;
  request.headers = headers;
  if (source.method === "POST") {
    if (!headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = "application/json";
    }
    request.body = JSON.stringify(body);
  }
  return request.loadJSON();
}

function normalizedResponse(payload) {
  var normalized = {};
  for (var index = 0; index < PROJECT.bindings.length; index += 1) {
    var binding = PROJECT.bindings[index];
    var value = resolvePath(payload, binding.path);
    if (value !== undefined) {
      setPath(normalized, binding.path, value);
    }
  }
  return normalized;
}

async function loadWidgetData() {
  if (PROJECT.dataSource.kind !== "public-api" || !PROJECT.dataSource.url) {
    return { value: SAMPLE_DATA, state: "sample" };
  }
  try {
    var live = normalizedResponse(await requestData());
    writeCachedData(live);
    return { value: live, state: "live" };
  } catch (_) {
    var cached = readCachedData();
    if (cached) {
      return { value: cached, state: "cached" };
    }
    if (Object.keys(SAMPLE_DATA).length > 0) {
      return { value: SAMPLE_DATA, state: "sample" };
    }
    return { value: {}, state: "error" };
  }
}

function renderErrorWidget(size) {
  var widget = new ListWidget();
  widget.setPadding(
    PROJECT.layouts[size].padding.top,
    PROJECT.layouts[size].padding.right,
    PROJECT.layouts[size].padding.bottom,
    PROJECT.layouts[size].padding.left
  );
  widget.backgroundColor = color("#182235");
  var title = widget.addText("Data unavailable");
  title.font = Font.boldSystemFont(14);
  title.textColor = color("#FFFFFF");
  var detail = widget.addText("Check the API settings and Keychain secrets.");
  detail.font = Font.footnote();
  detail.textColor = color("#BFD3F5");
  detail.lineLimit = 3;
  return widget;
}

async function renderLayout(size, data) {
  var layout = PROJECT.layouts[size];
  var widget = new ListWidget();
  await applyBackground(widget, layout.background, data, null);
  widget.setPadding(layout.padding.top, layout.padding.right, layout.padding.bottom, layout.padding.left);
  var root = widget.addStack();
  await applyContainerStyle(root, layout.root.style, data, null);
  configureGroup(root, layout.root);
  await renderGroupChildren(root, layout.root, data, null);
  return widget;
}

async function renderSmall(data) {
  return renderLayout("small", data);
}

async function renderMedium(data) {
  return renderLayout("medium", data);
}

async function renderLarge(data) {
  return renderLayout("large", data);
}

async function main() {
  var family = config.widgetFamily;
  if (family !== "small" && family !== "medium" && family !== "large") {
    family = "medium";
  }
  var loaded = await loadWidgetData();
  var widget = loaded.state === "error"
    ? renderErrorWidget(family)
    : await ({ small: renderSmall, medium: renderMedium, large: renderLarge }[family])(loaded.value);
  widget.refreshAfterDate = new Date(Date.now() + PROJECT.dataSource.refreshMinutes * 60000);
  Script.setWidget(widget);
  Script.complete();
}

main().catch(function () {
  var widget = new ListWidget();
  widget.backgroundColor = color("#182235");
  var message = widget.addText("Widget unavailable");
  message.font = Font.boldSystemFont(14);
  message.textColor = color("#FFFFFF");
  Script.setWidget(widget);
  Script.complete();
});
`

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue)
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map(key => [key, stableValue(record[key])])
    )
  }
  return value
}

function stableJson(value: unknown): string {
  return JSON.stringify(stableValue(value), null, 2)
}

function diagnostic(
  id: string,
  severity: WidgetDiagnostic['severity'],
  code: string,
  message: string,
  recovery: string,
  size?: WidgetSize,
  elementId?: string
): WidgetDiagnostic {
  return {
    id,
    severity,
    code,
    message,
    recovery,
    ...(size ? { size } : {}),
    ...(elementId ? { elementId } : {})
  }
}

function imageSourceValue(source: ValueSource, project: WidgetProject): string | null {
  if (source.kind === 'item') {
    return source.fallback
  }
  const value = resolveValueSource(source, project)
  return typeof value === 'string' ? value : null
}

function inspectImageSource(
  source: ValueSource,
  project: WidgetProject,
  issues: WidgetDiagnostic[],
  id: string,
  size?: WidgetSize,
  elementId?: string
): void {
  const value = imageSourceValue(source, project)
  if (!value || REMOTE_IMAGE_PATTERN.test(value)) {
    return
  }
  issues.push(diagnostic(
    id,
    'warning',
    'LOCAL_IMAGE_SOURCE',
    'This image source is local to the browser and may not be available in Scriptable.',
    'Use an https image URL or verify the file exists on the iPhone.',
    size,
    elementId
  ))
}

function inspectBackground(
  background: WidgetBackground,
  project: WidgetProject,
  issues: WidgetDiagnostic[],
  id: string,
  size?: WidgetSize,
  elementId?: string
): void {
  if (background.kind !== 'image') {
    return
  }
  inspectImageSource(background.source, project, issues, `${id}-source`, size, elementId)
  if (background.fit !== 'cover') {
    issues.push(diagnostic(
      `${id}-fit`,
      'warning',
      'BACKGROUND_IMAGE_FIT_APPROXIMATED',
      `The ${background.fit} background-image fit is approximated by Scriptable's background image API.`,
      'Review this background on the target iPhone size.',
      size,
      elementId
    ))
  }
}

function inspectVisualData(
  element: WidgetElement,
  project: WidgetProject,
  issues: WidgetDiagnostic[],
  size: WidgetSize
): void {
  const bounds = WIDGET_DIMENSIONS[size]
  if (
    (typeof element.style.width === 'number' && element.style.width > bounds.width)
    || (typeof element.style.height === 'number' && element.style.height > bounds.height)
  ) {
    issues.push(diagnostic(
      `${size}-${element.id}-dimensions`,
      'warning',
      'VISUAL_DATA_DIMENSION_EXCEEDS_WIDGET',
      `The ${element.type} has fixed dimensions larger than the ${size} widget bounds and may be clipped in Scriptable.`,
      'Reduce the fixed width or height, or use a fill/fit dimension for this widget size.',
      size,
      element.id
    ))
  }

  if (element.type === 'progress-ring') {
    element.rings.forEach((ring, index) => {
      const resolution = resolveNumericSourceDetails(ring.value, project)
      if (ring.value.kind === 'binding' && resolution.usedFallback) {
        issues.push(diagnostic(
          `${size}-${element.id}-ring-${index}-fallback`,
          'warning',
          'VISUAL_DATA_SOURCE_FALLBACK',
          `Progress ring ${index + 1} is using its configured fallback value because its source did not resolve in the current data.`,
          'Verify the binding path or keep the fallback intentional.',
          size,
          element.id
        ))
      }
    })
    return
  }

  if (element.type === 'progress-bar') {
    const resolution = resolveNumericSourceDetails(element.value, project)
    if (element.value.kind === 'binding' && resolution.usedFallback) {
      issues.push(diagnostic(
        `${size}-${element.id}-fallback`,
        'warning',
        'VISUAL_DATA_SOURCE_FALLBACK',
        'The progress bar is using its configured fallback value because its source did not resolve in the current data.',
        'Verify the binding path or keep the fallback intentional.',
        size,
        element.id
      ))
    }
    return
  }

  if (element.type !== 'sparkline' && element.type !== 'bar-chart') {
    return
  }

  if (element.values.kind === 'item') {
    return
  }

  const resolution = resolveSeriesSourceDetails(element.values, project)
  if (element.values.kind === 'binding' && resolution.usedFallback) {
    issues.push(diagnostic(
      `${size}-${element.id}-fallback`,
      'warning',
      'VISUAL_DATA_SOURCE_FALLBACK',
      `The ${element.type} is using its configured fallback series because its source did not resolve to a list in the current data.`,
      'Verify the binding path or keep the fallback intentional.',
      size,
      element.id
    ))
  }
  if (resolution.values.length === 0) {
    issues.push(diagnostic(
      `${size}-${element.id}-empty`,
      'warning',
      'VISUAL_DATA_NO_POINTS',
      `The ${element.type} has no numeric points to render.`,
      'Bind it to a numeric list or add at least one finite value.',
      size,
      element.id
    ))
  }
  if (resolution.invalidCount > 0) {
    issues.push(diagnostic(
      `${size}-${element.id}-invalid`,
      'warning',
      'VISUAL_DATA_INVALID_POINTS',
      `The ${element.type} source contains ${resolution.invalidCount} value${resolution.invalidCount === 1 ? '' : 's'} that will be ignored.`,
      'Keep the series numeric so the exported chart remains predictable.',
      size,
      element.id
    ))
  }
  const pointLimit = visualDataPointLimit(size, element.density)
  if (resolution.rawLength > pointLimit) {
    issues.push(diagnostic(
      `${size}-${element.id}-bounded`,
      'warning',
      'VISUAL_DATA_POINTS_BOUNDED',
      `The ${element.type} contains ${resolution.rawLength} points, so Scriptable will render the latest ${pointLimit} for the ${size} widget.`,
      'Use a lower-density chart or provide a shorter series when every point must remain visible.',
      size,
      element.id
    ))
  }
}

function inspectElement(
  element: WidgetElement,
  project: WidgetProject,
  issues: WidgetDiagnostic[],
  size: WidgetSize
): void {
  if ((element.type === 'group' || element.type === 'repeat') && element.style.opacity !== 1) {
    issues.push(diagnostic(
      `${size}-${element.id}-opacity`,
      'warning',
      'GROUP_OPACITY_APPROXIMATED',
      `The ${element.type} opacity cannot be applied to all child content by Scriptable's stack API.`,
      'Move opacity to the child text or image elements for an exact export.',
      size,
      element.id
    ))
  }

  if (element.style.background) {
    inspectBackground(element.style.background, project, issues, `${size}-${element.id}-background`, size, element.id)
  }

  if (element.type === 'image') {
    inspectImageSource(element.source, project, issues, `${size}-${element.id}-image`, size, element.id)
    if (element.crop.x !== 50 || element.crop.y !== 50) {
      issues.push(diagnostic(
        `${size}-${element.id}-crop`,
        'warning',
        'IMAGE_CROP_APPROXIMATED',
        'Image crop position is not preserved by Scriptable’s WidgetImage API.',
        'Review or recrop the image on the target iPhone size.',
        size,
        element.id
      ))
    }
  }

  if (element.type === 'date' && element.value.kind !== 'literal' && element.value.format) {
    if (element.value.format.prefix || element.value.format.suffix) {
      issues.push(diagnostic(
        `${size}-${element.id}-date-format`,
        'warning',
        'DATE_VALUE_FORMAT_APPROXIMATED',
        'Prefix and suffix formatting on a native Scriptable date is rendered as a text fallback.',
        'Use the date format itself for the cleanest native date behavior.',
        size,
        element.id
      ))
    }
  }

  if (element.type === 'progress-ring' || element.type === 'progress-bar' || element.type === 'sparkline' || element.type === 'bar-chart') {
    inspectVisualData(element, project, issues, size)
  }

  if ((element.type === 'text' || element.type === 'date') && element.textStyle.italic) {
    if (element.textStyle.fontDesign !== 'default' || element.textStyle.fontWeight !== 'regular') {
      issues.push(diagnostic(
        `${size}-${element.id}-font`,
        'warning',
        'ITALIC_FONT_APPROXIMATED',
        'Scriptable exposes a separate italic system font factory, so italic weight/design combinations are approximated.',
        'Review the exported typography on the target iPhone.',
        size,
        element.id
      ))
    }
  }

  if (element.type === 'group' || element.type === 'repeat') {
    element.children.forEach(child => inspectElement(child, project, issues, size))
  }
}

function scanSecretTokens(value: string, declared: Set<string>, issues: WidgetDiagnostic[], id: string): void {
  SECRET_TOKEN_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = SECRET_TOKEN_PATTERN.exec(value))) {
    const name = match[1]!
    if (!declared.has(name)) {
      issues.push(diagnostic(
        `${id}-${name}`,
        'blocking',
        'UNDECLARED_SECRET_PLACEHOLDER',
        `Secret placeholder {{${name}}} is used without a declared Keychain entry.`,
        `Declare ${name} in the data-source secret placeholders before exporting.`
      ))
    }
  }
}

export function getScriptableExportIssues(input: unknown): WidgetDiagnostic[] {
  const validation = validateWidgetProject(input)
  if (!validation.ok) {
    return validation.issues.map((issue, index) => diagnostic(
      `export-schema-${index}`,
      'blocking',
      'INVALID_PROJECT',
      `${issue.path || 'project'}: ${issue.message}`,
      'Fix the canonical widget state before exporting.'
    ))
  }

  const project = validation.value
  const issues = project.diagnostics.map(issue => ({ ...issue }))
  const source = project.dataSource
  const declaredSecrets = new Set(source.secretPlaceholders.map(secret => secret.name))
  scanSecretTokens(source.url ?? '', declaredSecrets, issues, 'data-source-url')
  source.parameters.forEach((parameter, index) => {
    scanSecretTokens(parameter.key, declaredSecrets, issues, `data-source-parameter-${index}-key`)
    scanSecretTokens(parameter.value, declaredSecrets, issues, `data-source-parameter-${index}-value`)
  })
  source.headers.forEach((header, index) => {
    scanSecretTokens(header.key, declaredSecrets, issues, `data-source-header-${index}-key`)
    scanSecretTokens(header.value, declaredSecrets, issues, `data-source-header-${index}-value`)
  })

  if (source.kind === 'public-api') {
    if (!source.url) {
      issues.push(diagnostic(
        'public-api-url',
        'blocking',
        'MISSING_API_URL',
        'A public API data source needs a URL before it can be exported.',
        'Add an https API URL or switch the data source to sample data.'
      ))
    } else {
      try {
        const protocol = new URL(source.url).protocol
        if (protocol !== 'http:' && protocol !== 'https:') {
          issues.push(diagnostic(
            'public-api-protocol',
            'blocking',
            'UNSUPPORTED_API_PROTOCOL',
            'Scriptable export supports only http and https API URLs.',
            'Use an http or https endpoint.'
          ))
        }
      } catch {
        issues.push(diagnostic(
          'public-api-url-invalid',
          'blocking',
          'INVALID_API_URL',
          'The public API URL is not valid.',
          'Correct the API URL before exporting.'
        ))
      }
    }
  }

  for (const size of ['small', 'medium', 'large'] as WidgetSize[]) {
    const layout = project.layouts[size]
    inspectBackground(layout.background, project, issues, `${size}-layout-background`, size)
    inspectElement(layout.root, project, issues, size)
  }

  return issues
}

function exportSnapshot(project: WidgetProject): Record<string, unknown> {
  return {
    id: project.id,
    name: project.name,
    data: project.data.value,
    dataSource: project.dataSource,
    bindings: project.bindings,
    layouts: project.layouts
  }
}

function renderScriptableSource(project: WidgetProject): string {
  const snapshot = stableJson(exportSnapshot(project))
  return [
    '// Generated by Widgetr. Edit the structured widget state in Widgetr and export again.',
    `var PROJECT = ${snapshot};`,
    `var SAMPLE_DATA = ${stableJson(project.data.value)};`,
    '',
    SCRIPTABLE_RUNTIME_SOURCE.trim()
  ].join('\n') + '\n'
}

export function generateScriptableCode(input: unknown): ScriptableExportResult {
  const issues = getScriptableExportIssues(input)
  if (issues.some(issue => issue.severity === 'blocking')) {
    return { code: null, issues }
  }

  const validation = validateWidgetProject(input)
  if (!validation.ok) {
    return { code: null, issues }
  }

  return {
    code: renderScriptableSource(validation.value),
    issues
  }
}

export function isScriptableExportReady(input: unknown): boolean {
  return !getScriptableExportIssues(input).some(issue => issue.severity === 'blocking')
}

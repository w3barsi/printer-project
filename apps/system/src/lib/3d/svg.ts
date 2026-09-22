import { toHex, type RgbColor } from "./color";
import { drawToGrid, type DecodedImage } from "./decode";

export type SvgPaints = {
  colors: RgbColor[];
  gradientCount: number;
  unresolvedCount: number;
};

type PaintProperty = "fill" | "stroke" | "color";

type StyleRule = {
  selector: string;
  /** [ids, classes, tags] */
  specificity: [number, number, number];
  order: number;
  declarations: Partial<Record<PaintProperty, string>>;
};

type PaintState = {
  fill: string;
  stroke: string;
  color: string;
};

type PaintCollector = {
  colors: RgbColor[];
  seen: Set<string>;
  gradientCount: number;
  unresolvedCount: number;
};

const INITIAL_PAINT: PaintState = { fill: "black", stroke: "none", color: "black" };
const LENGTH_PATTERN = /^\s*(-?\d*\.?\d+(?:e[+-]?\d+)?)/i;
const PAINT_ELEMENTS = new Set([
  "circle",
  "ellipse",
  "line",
  "path",
  "polygon",
  "polyline",
  "rect",
  "text",
  "textpath",
  "tspan",
  "use",
]);

export async function decodeSvg(file: File, maxDimension: number): Promise<DecodedImage> {
  if (file.type && file.type !== "image/svg+xml") {
    throw new Error("Only SVG files are supported.");
  }

  const document = parseSvg(await file.text());
  const size = svgSize(document);
  const scale = maxDimension / Math.max(size.width, size.height);
  const width = Math.max(1, Math.round(size.width * scale));
  const height = Math.max(1, Math.round(size.height * scale));

  const root = document.documentElement;
  root.setAttribute("width", String(width));
  root.setAttribute("height", String(height));

  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(document)], {
      type: "image/svg+xml",
    }),
  );

  try {
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch {
      throw new Error("Could not render this SVG.");
    }

    try {
      return drawToGrid(image, width, height);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "SecurityError") {
        throw new Error("This SVG references external content and cannot be read.");
      }
      throw cause;
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Collects the SVG's declared fill and stroke colors without rendering:
 * inline styles beat presentation attributes, which beat simple `<style>`
 * rules (class/id/tag); fills, strokes, and color inherit down the tree.
 */
export function extractSvgPaints(text: string): SvgPaints {
  let document: Document;
  try {
    document = parseSvg(text);
  } catch {
    return { colors: [], gradientCount: 0, unresolvedCount: 0 };
  }

  const { rules, unsupported } = collectStyleRules(document);
  const colorContext = createColorContext();
  const collector: PaintCollector = {
    colors: [],
    seen: new Set(),
    gradientCount: 0,
    unresolvedCount: unsupported,
  };

  walkPaints(document.documentElement, INITIAL_PAINT, rules, colorContext, collector);

  return {
    colors: collector.colors,
    gradientCount: collector.gradientCount,
    unresolvedCount: collector.unresolvedCount,
  };
}

function parseSvg(text: string): Document {
  const document = new DOMParser().parseFromString(text, "image/svg+xml");
  const root = document.documentElement;
  if (
    root.nodeName.toLowerCase() !== "svg" ||
    document.getElementsByTagName("parsererror").length > 0
  ) {
    throw new Error("Could not parse this SVG.");
  }
  return document;
}

function svgSize(document: Document): { width: number; height: number } {
  const root = document.documentElement;
  const width = parseLength(root.getAttribute("width"));
  const height = parseLength(root.getAttribute("height"));
  if (width && height) return { width, height };

  const viewBox = parseViewBox(root.getAttribute("viewBox"));
  if (viewBox) return viewBox;
  if (width || height) {
    const side = width ?? height ?? 1;
    return { width: side, height: side };
  }
  return { width: 1, height: 1 };
}

function parseLength(value: string | null): number | null {
  if (!value || value.trim().endsWith("%")) return null;
  const match = LENGTH_PATTERN.exec(value);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseViewBox(value: string | null): { width: number; height: number } | null {
  if (!value) return null;
  const parts = value
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
  const width = parts[2];
  const height = parts[3];
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

function walkPaints(
  element: Element,
  inherited: PaintState,
  rules: StyleRule[],
  colorContext: CanvasRenderingContext2D | null,
  collector: PaintCollector,
): void {
  const color = resolveProperty(element, rules, "color", inherited.color);
  const fill = resolveProperty(element, rules, "fill", inherited.fill);
  const stroke = resolveProperty(element, rules, "stroke", inherited.stroke);

  if (PAINT_ELEMENTS.has(element.localName.toLowerCase())) {
    collectPaint(fill, color, colorContext, collector);
    collectPaint(stroke, color, colorContext, collector);
  }

  const next: PaintState = { fill, stroke, color };
  for (const child of Array.from(element.children)) {
    walkPaints(child, next, rules, colorContext, collector);
  }
}

function resolveProperty(
  element: Element,
  rules: StyleRule[],
  property: PaintProperty,
  inherited: string,
): string {
  let value = inherited;

  const attribute = element.getAttribute(property);
  if (attribute) value = attribute;

  let best: StyleRule | null = null;
  for (const rule of rules) {
    const declaration = rule.declarations[property];
    if (declaration === undefined || !matchesSelector(element, rule.selector)) continue;
    if (!best || compareRules(rule, best) > 0) best = rule;
  }
  if (best) value = best.declarations[property] ?? value;

  const inline = element.getAttribute("style");
  if (inline) {
    const declaration = parseDeclarations(inline)[property];
    if (declaration !== undefined) value = declaration;
  }

  return value.trim().toLowerCase() === "inherit" ? inherited : value;
}

function collectPaint(
  value: string,
  currentColor: string,
  colorContext: CanvasRenderingContext2D | null,
  collector: PaintCollector,
): void {
  const resolved = value.trim().toLowerCase() === "currentcolor" ? currentColor : value;
  const paint = resolved.trim().toLowerCase();

  if (paint === "none" || paint === "transparent") return;
  if (paint.startsWith("url(")) {
    collector.gradientCount += 1;
    return;
  }

  const color = normalizeColor(resolved, colorContext);
  if (!color) {
    collector.unresolvedCount += 1;
    return;
  }

  const key = toHex(color);
  if (collector.seen.has(key)) return;
  collector.seen.add(key);
  collector.colors.push(color);
}

function collectStyleRules(document: Document): {
  rules: StyleRule[];
  unsupported: number;
} {
  const rules: StyleRule[] = [];
  let unsupported = 0;
  let order = 0;

  for (const element of Array.from(document.getElementsByTagName("style"))) {
    for (const block of parseStyleSheet(element.textContent ?? "")) {
      const declarations = parseDeclarations(block.body);
      if (
        declarations.fill === undefined &&
        declarations.stroke === undefined &&
        declarations.color === undefined
      ) {
        continue;
      }

      for (const selector of block.selectors.split(",")) {
        const trimmed = selector.trim();
        if (!trimmed) continue;
        const specificity = selectorSpecificity(trimmed);
        if (!specificity) {
          unsupported += 1;
          continue;
        }
        rules.push({
          selector: trimmed,
          specificity,
          order: order++,
          declarations,
        });
      }
    }
  }

  return { rules, unsupported };
}

function parseStyleSheet(css: string): Array<{ selectors: string; body: string }> {
  const blocks: Array<{ selectors: string; body: string }> = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let index = 0;

  while (index < clean.length) {
    const open = clean.indexOf("{", index);
    if (open === -1) break;

    let depth = 1;
    let cursor = open + 1;
    while (cursor < clean.length && depth > 0) {
      const character = clean[cursor];
      if (character === "{") depth += 1;
      else if (character === "}") depth -= 1;
      cursor += 1;
    }

    const selectors = clean.slice(index, open).trim();
    const body = clean.slice(open + 1, cursor - 1);
    if (selectors && !selectors.startsWith("@")) blocks.push({ selectors, body });
    index = cursor;
  }

  return blocks;
}

function parseDeclarations(body: string): Partial<Record<PaintProperty, string>> {
  const declarations: Partial<Record<PaintProperty, string>> = {};

  for (const declaration of body.split(";")) {
    const colon = declaration.indexOf(":");
    if (colon === -1) continue;
    const property = declaration.slice(0, colon).trim().toLowerCase();
    if (property !== "fill" && property !== "stroke" && property !== "color") continue;
    declarations[property] = declaration
      .slice(colon + 1)
      .replace(/!important/i, "")
      .trim();
  }

  return declarations;
}

function selectorSpecificity(selector: string): [number, number, number] | null {
  if (!/^(?:\*|[a-zA-Z][\w-]*)?(?:[.#][\w-]+)*$/.test(selector)) return null;

  const ids = selector.match(/#[\w-]+/g)?.length ?? 0;
  const classes = selector.match(/\.[\w-]+/g)?.length ?? 0;
  const tags = /^[a-zA-Z]/.test(selector) ? 1 : 0;
  return [ids, classes, tags];
}

function matchesSelector(element: Element, selector: string): boolean {
  const tag = /^[a-zA-Z][\w-]*/.exec(selector)?.[0];
  if (tag && element.localName.toLowerCase() !== tag.toLowerCase()) return false;

  const classes = (element.getAttribute("class") ?? "").split(/\s+/);
  for (const match of selector.matchAll(/\.([\w-]+)/g)) {
    if (!classes.includes(match[1])) return false;
  }

  for (const match of selector.matchAll(/#([\w-]+)/g)) {
    if (element.getAttribute("id") !== match[1]) return false;
  }

  return true;
}

function compareRules(a: StyleRule, b: StyleRule): number {
  for (let index = 0; index < 3; index += 1) {
    if (a.specificity[index] !== b.specificity[index]) {
      return a.specificity[index] - b.specificity[index];
    }
  }
  return a.order - b.order;
}

function createColorContext(): CanvasRenderingContext2D | null {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.getContext("2d", { willReadFrequently: true });
}

function normalizeColor(
  value: string,
  context: CanvasRenderingContext2D | null,
): RgbColor | null {
  if (!context) return null;
  if (typeof CSS !== "undefined" && !CSS.supports("color", value)) return null;

  context.clearRect(0, 0, 1, 1);
  context.fillStyle = "#000000";
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);

  const { data } = context.getImageData(0, 0, 1, 1);
  if (data[3] !== 255) return null;
  return { r: data[0], g: data[1], b: data[2] };
}

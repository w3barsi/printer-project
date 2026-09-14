import { Button } from "@dg/ui/components/button";
import { Spinner } from "@dg/ui/components/spinner";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import fileSaver from "file-saver";
import { ImagePlusIcon } from "lucide-react";
import { useRef, useState } from "react";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { AttachmentPanel } from "@/components/3d/attachment-panel";
import { BasePanel } from "@/components/3d/base-panel";
import { ColorPickerPopover } from "@/components/3d/color-picker-popover";
import { DetailPanel } from "@/components/3d/detail-panel";
import { ExportPanel } from "@/components/3d/export-panel";
import { ImageDropzone } from "@/components/3d/image-dropzone";
import { KeychainScene } from "@/components/3d/keychain-model";
import { PalettePanel } from "@/components/3d/palette-panel";
import { QuantizedPreview } from "@/components/3d/quantized-preview";
import { Viewport } from "@/components/3d/viewport";
import { WarningsPanel } from "@/components/3d/warnings-panel";
import { Container } from "@/components/layouts/container";
import { DEFAULT_ATTACHMENT, type Attachment } from "@/lib/3d/attachment";
import { toHex, type RgbColor } from "@/lib/3d/color";
import {
  ALPHA_LIMITS,
  BASE_LIMITS,
  DEFAULT_ALPHA_THRESHOLD,
  DEFAULT_BASE_COLOR,
  DEFAULT_BASE_SETTINGS,
  DEFAULT_IMAGE_QUALITY,
  DEFAULT_LAYER_THICKNESS,
  DEFAULT_SPECK_MM2,
  SPECK_LIMITS,
  type BaseSettings,
  type ImageQuality,
  type KeychainModelInfo,
  type PaletteSwatch,
} from "@/lib/3d/design";
import { build3mfBlob } from "@/lib/3d/export/3mf";
import { buildStlBlob } from "@/lib/3d/export/stl";
import type { KeychainGeometry } from "@/lib/3d/geometry";
import { decodePng, IMAGE_DIMENSIONS, type DecodedPng } from "@/lib/3d/png";
import { quantize, type QuantizedImage } from "@/lib/3d/quantize";
import { buildWarnings } from "@/lib/3d/warnings";

export const Route = createFileRoute("/_authenticated/3d/keychain")({
  component: KeychainMakerPage,
  loader: () => ({
    crumb: [
      { value: "3D", href: "/3d", type: "static" },
      { value: "Keychain Maker", href: "/3d/keychain", type: "static" },
    ],
  }),
  head: () => ({
    meta: [{ title: "Keychain Maker | DG" }],
  }),
});

const DEFAULT_COLOR_COUNT = 3;
const DEFAULT_SLOTS = 4;

const DEFAULT_PREVIEW_BACKGROUND: RgbColor = { r: 255, g: 255, b: 255 };

const PREVIEW_BACKGROUND_PRESETS: Array<{ label: string; color: RgbColor }> = [
  { label: "White", color: { r: 255, g: 255, b: 255 } },
  { label: "Light gray", color: { r: 244, g: 244, b: 245 } },
  { label: "Silver", color: { r: 212, g: 212, b: 216 } },
  { label: "Slate", color: { r: 113, g: 113, b: 122 } },
  { label: "Graphite", color: { r: 63, g: 63, b: 70 } },
  { label: "Charcoal", color: { r: 9, g: 9, b: 11 } },
];

type SourceImage = {
  fileName: string;
  file: File;
  decoded: DecodedPng;
};

function KeychainMakerPage() {
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const geometryRef = useRef<KeychainGeometry | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [source, setSource] = useState<SourceImage | null>(null);
  const [colorCount, setColorCount] = useState(DEFAULT_COLOR_COUNT);
  const [quality, setQuality] = useState<ImageQuality>(DEFAULT_IMAGE_QUALITY);
  const [alphaThreshold, setAlphaThreshold] = useState(DEFAULT_ALPHA_THRESHOLD);
  const [speckThresholdMm2, setSpeckThresholdMm2] = useState(DEFAULT_SPECK_MM2);
  const [quantized, setQuantized] = useState<QuantizedImage | null>(null);
  const [palette, setPalette] = useState<PaletteSwatch[]>([]);
  const [baseSettings, setBaseSettings] = useState<BaseSettings>(DEFAULT_BASE_SETTINGS);
  const [baseColor, setBaseColor] = useState<RgbColor>(DEFAULT_BASE_COLOR);
  const [previewBackground, setPreviewBackground] = useState<RgbColor>(
    DEFAULT_PREVIEW_BACKGROUND,
  );
  const [attachment, setAttachment] = useState<Attachment | null>(DEFAULT_ATTACHMENT);
  const [slots, setSlots] = useState(DEFAULT_SLOTS);
  const [uniformThickness, setUniformThickness] = useState(false);
  const [modelInfo, setModelInfo] = useState<KeychainModelInfo | null>(null);
  const [modelVersion, setModelVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyQuantization(
    decoded: DecodedPng,
    count: number,
    threshold = alphaThreshold,
  ) {
    const result = quantize(decoded, count, threshold);
    setQuantized(result);
    setPalette(
      result.palette.map((entry) => ({
        ...entry,
        id: crypto.randomUUID(),
        thickness: DEFAULT_LAYER_THICKNESS,
      })),
    );
    setModelVersion((version) => version + 1);
  }

  async function handleFile(file: File) {
    setIsLoading(true);
    setError(null);
    try {
      const decoded = await decodePng(file, IMAGE_DIMENSIONS[quality]);
      applyQuantization(decoded, colorCount);
      setSource({ fileName: file.name, file, decoded });
    } catch (cause) {
      console.error(cause);
      setError(cause instanceof Error ? cause.message : "Could not read that PNG.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleQualityChange(next: ImageQuality) {
    setQuality(next);
    if (!source) return;
    setIsLoading(true);
    setError(null);
    try {
      const decoded = await decodePng(source.file, IMAGE_DIMENSIONS[next]);
      applyQuantization(decoded, colorCount);
      setSource((current) => (current ? { ...current, decoded } : current));
    } catch (cause) {
      console.error(cause);
      setError(cause instanceof Error ? cause.message : "Could not read that PNG.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleAlphaThresholdChange(value: number) {
    if (!Number.isFinite(value)) return;
    const clamped = Math.min(
      ALPHA_LIMITS.max,
      Math.max(ALPHA_LIMITS.min, Math.round(value)),
    );
    setAlphaThreshold(clamped);
    if (!source) return;
    applyQuantization(source.decoded, colorCount, clamped);
  }

  function handleSpeckThresholdChange(value: number) {
    if (!Number.isFinite(value)) return;
    setSpeckThresholdMm2(Math.min(SPECK_LIMITS.max, Math.max(SPECK_LIMITS.min, value)));
  }

  function handleColorCountChange(next: number) {
    setColorCount(next);
    if (!source) return;
    applyQuantization(source.decoded, next);
  }

  function handlePaletteColorChange(index: number, color: RgbColor) {
    setPalette((current) =>
      current.map((swatch, swatchIndex) =>
        swatchIndex === index ? { ...swatch, ...color } : swatch,
      ),
    );
  }

  function handlePaletteThicknessChange(index: number, thickness: number) {
    if (!Number.isFinite(thickness)) return;
    const clamped = Math.min(
      BASE_LIMITS.layerThicknessMm.max,
      Math.max(BASE_LIMITS.layerThicknessMm.min, thickness),
    );
    setPalette((current) =>
      current.map((swatch, swatchIndex) =>
        uniformThickness || swatchIndex === index
          ? { ...swatch, thickness: clamped }
          : swatch,
      ),
    );
  }

  function handleUniformThicknessChange(next: boolean) {
    setUniformThickness(next);
    if (!next) return;
    setPalette((current) => {
      const value = current[0]?.thickness;
      if (value === undefined) return current;
      return current.map((swatch) => ({ ...swatch, thickness: value }));
    });
  }

  function handleBaseSettingsChange(next: BaseSettings) {
    const footprintChanged =
      next.longestSideMm !== baseSettings.longestSideMm ||
      next.marginMm !== baseSettings.marginMm ||
      next.style !== baseSettings.style;
    setBaseSettings(next);
    if (footprintChanged) setModelVersion((version) => version + 1);
  }

  function handleSlotsChange(next: number) {
    if (!Number.isFinite(next)) return;
    setSlots(Math.min(8, Math.max(1, Math.round(next))));
  }

  async function handleExport3mf() {
    const geometry = geometryRef.current;
    if (!geometry) return;
    const blob = await build3mfBlob(geometry, palette, baseColor);
    fileSaver.saveAs(blob, `${exportBaseName()}.3mf`);
  }

  function handleExportStl() {
    const geometry = geometryRef.current;
    if (!geometry) return;
    fileSaver.saveAs(buildStlBlob(geometry), `${exportBaseName()}.stl`);
  }

  const thicknesses = palette.map((swatch) => swatch.thickness);
  const filamentCount = palette.filter((swatch) => swatch.thickness > 0).length + 1;
  const warnings =
    source && quantized
      ? buildWarnings({
          hasTransparency: quantized.transparentPixels > 0,
          thinColorIndexes: modelInfo?.thinColorIndexes ?? [],
          palette,
          specksMerged: modelInfo?.specksMerged ?? 0,
          filamentCount,
          slots,
        })
      : [];

  return (
    <main className="min-h-[calc(100svh-4.1rem)] bg-muted/25">
      <Container className="flex max-w-7xl flex-col gap-6 px-3 py-5 md:px-6 md:py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Keychain Maker</h1>
          <p className="text-sm text-muted-foreground">
            Upload a transparent PNG and choose up to five colors.
          </p>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {isLoading ? (
            <section className="flex min-h-[60svh] items-center justify-center overflow-hidden rounded-lg border bg-card p-4">
              <Spinner className="size-6 text-muted-foreground" />
            </section>
          ) : quantized && palette.length > 0 ? (
            <div className="relative">
              <Viewport
                fitKey={modelVersion}
                controlsRef={controlsRef}
                background={toHex(previewBackground)}
                className="h-[70svh] min-h-100 w-full overflow-hidden rounded-lg border bg-card"
              >
                <KeychainScene
                  quantized={quantized}
                  base={baseSettings}
                  baseColor={baseColor}
                  thicknesses={thicknesses}
                  palette={palette}
                  attachment={attachment}
                  speckThresholdMm2={speckThresholdMm2}
                  geometryRef={geometryRef}
                  controlsRef={controlsRef}
                  onModelInfo={setModelInfo}
                  onAttachmentChange={setAttachment}
                />
              </Viewport>
              <div className="absolute top-3 right-3">
                <ColorPickerPopover
                  label="Preview background"
                  value={previewBackground}
                  usedColors={[...palette, baseColor]}
                  presets={PREVIEW_BACKGROUND_PRESETS}
                  onChange={setPreviewBackground}
                />
              </div>
            </div>
          ) : (
            <section className="flex min-h-[60svh] items-center justify-center overflow-hidden rounded-lg border bg-card p-4">
              {source && quantized ? (
                <p className="text-sm text-muted-foreground">
                  Nothing to preview — the image is fully transparent.
                </p>
              ) : (
                <div className="w-full max-w-md">
                  <ImageDropzone onFile={handleFile} disabled={isLoading} />
                </div>
              )}
            </section>
          )}

          <aside className="flex flex-col gap-4">
            <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-sm font-medium">Source</h2>
                <p className="text-xs text-muted-foreground">
                  PNG only. Transparent pixels are ignored.
                </p>
              </div>

              {source ? (
                <div className="flex flex-col gap-2">
                  {quantized ? (
                    <QuantizedPreview
                      quantized={quantized}
                      colors={palette}
                      className="max-h-24 w-auto max-w-full self-start rounded-sm border"
                    />
                  ) : null}
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm">{source.fileName}</span>
                    <span className="text-xs text-muted-foreground">
                      {source.decoded.width} × {source.decoded.height} px
                    </span>
                  </div>
                  <input
                    ref={replaceInputRef}
                    type="file"
                    accept="image/png,.png"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleFile(file);
                      event.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => replaceInputRef.current?.click()}
                  >
                    <ImagePlusIcon data-icon="inline-start" />
                    Replace image
                  </Button>
                </div>
              ) : null}

              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </section>

            <DetailPanel
              quality={quality}
              alphaThreshold={alphaThreshold}
              speckThresholdMm2={speckThresholdMm2}
              onQualityChange={(next) => void handleQualityChange(next)}
              onAlphaThresholdChange={handleAlphaThresholdChange}
              onSpeckThresholdChange={handleSpeckThresholdChange}
              disabled={isLoading}
            />

            <PalettePanel
              colorCount={colorCount}
              palette={palette}
              hasImage={source !== null}
              slots={slots}
              flattenLayers={baseSettings.faceDown}
              uniformThickness={uniformThickness}
              onColorCountChange={handleColorCountChange}
              onColorChange={handlePaletteColorChange}
              onThicknessChange={handlePaletteThicknessChange}
              onSlotsChange={handleSlotsChange}
              onUniformThicknessChange={handleUniformThicknessChange}
              disabled={isLoading}
            />

            <BasePanel
              settings={baseSettings}
              color={baseColor}
              usedColors={palette}
              modelInfo={modelInfo}
              onSettingsChange={handleBaseSettingsChange}
              onColorChange={setBaseColor}
            />

            <AttachmentPanel
              attachment={attachment}
              onChange={setAttachment}
              disabled={isLoading}
            />

            <WarningsPanel warnings={warnings} />

            <ExportPanel
              disabled={modelInfo === null}
              onExport3mf={() => void handleExport3mf()}
              onExportStl={handleExportStl}
            />
          </aside>
        </div>
      </Container>
    </main>
  );
}

function exportBaseName(): string {
  return `keychain-${format(new Date(), "yyMMdd-HHmm")}`;
}

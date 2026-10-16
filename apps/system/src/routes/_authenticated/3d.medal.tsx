import { Spinner } from "@dg/ui-coss/components/spinner";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import fileSaver from "file-saver";
import { ChevronDownIcon, SplineIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ExportPanel } from "@/components/3d/export-panel";
import { FileDropzone } from "@/components/3d/file-dropzone";
import { MedalBasePanel } from "@/components/3d/medal/base-panel";
import { MedalScene } from "@/components/3d/medal/medal-scene";
import { MedalOffsetPanel } from "@/components/3d/medal/offset-panel";
import { MedalSourcePanel } from "@/components/3d/medal/source-panel";
import { Viewport } from "@/components/3d/viewport";
import { WarningsPanel } from "@/components/3d/warnings-panel";
import { Container } from "@/components/layouts/container";
import { type RgbColor } from "@/lib/3d/color";
import { DEFAULT_BASE_COLOR } from "@/lib/3d/design";
import {
  DEFAULT_FIT_MM,
  DEFAULT_MEDAL_THICKNESS_MM,
  DEFAULT_OFFSET_THICKNESS_MM,
  DEFAULT_OFFSET_WIDTH_MM,
  FIT_LIMITS,
  MEDAL_THICKNESS_LIMITS,
  OFFSET_COLOR_PRESETS,
  OFFSET_WIDTH_LIMITS,
  type MedalModelInfo,
  type OffsetLayer,
} from "@/lib/3d/dxf/design";
import type { MedalGeometry } from "@/lib/3d/dxf/geometry";
import { parseDxf, type DxfResults } from "@/lib/3d/dxf/parse";
import { buildDxfWarnings } from "@/lib/3d/dxf/warnings";
import { build3mfBlob } from "@/lib/3d/export/3mf";
import type { ExtrudedModel } from "@/lib/3d/export/model";
import { buildStlBlob } from "@/lib/3d/export/stl";

export const Route = createFileRoute("/_authenticated/3d/medal")({
  component: MedalMakerPage,
  loader: () => ({
    crumb: [
      { value: "3D", href: "/3d", type: "static" },
      { value: "Medal Maker", href: "/3d/medal", type: "static" },
    ],
  }),
  head: () => ({
    meta: [{ title: "Medal Maker | DG" }],
  }),
});

type Limit = { min: number; max: number };

function clamp(limits: Limit, value: number): number {
  return Math.min(limits.max, Math.max(limits.min, value));
}

function MedalMakerPage() {
  const geometryRef = useRef<MedalGeometry | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarEndRef = useRef<HTMLDivElement>(null);
  const [hasMoreOptions, setHasMoreOptions] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dxf, setDxf] = useState<DxfResults | null>(null);
  const [baseThicknessMm, setBaseThicknessMm] = useState(DEFAULT_MEDAL_THICKNESS_MM);
  const [baseColor, setBaseColor] = useState<RgbColor>(DEFAULT_BASE_COLOR);
  const [offsets, setOffsets] = useState<OffsetLayer[]>([]);
  const [fitToSize, setFitToSize] = useState(false);
  const [fitMm, setFitMm] = useState(DEFAULT_FIT_MM);
  const [modelInfo, setModelInfo] = useState<MedalModelInfo | null>(null);
  const [modelVersion, setModelVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Watch the end of the options list to know when there is more to scroll to.
  useEffect(() => {
    const scroller = sidebarRef.current;
    const end = sidebarEndRef.current;
    if (!scroller || !end) return;

    const observer = new IntersectionObserver(
      ([entry]) => setHasMoreOptions(!entry.isIntersecting),
      { root: scroller, rootMargin: "0px 0px 24px 0px" },
    );
    observer.observe(end);
    return () => observer.disconnect();
  }, []);

  async function handleFile(file: File) {
    setIsLoading(true);
    setError(null);
    try {
      if (!file.name.toLowerCase().endsWith(".dxf")) {
        throw new Error("Only DXF files are supported.");
      }
      const results = parseDxf(await file.text());
      setFileName(file.name);
      setDxf(results);
      setOffsets([]);
      setModelInfo(null);
      geometryRef.current = null;
      setModelVersion((version) => version + 1);
    } catch (cause) {
      console.error(cause);
      setError(cause instanceof Error ? cause.message : "Could not read that file.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleBaseThicknessChange(value: number) {
    if (!Number.isFinite(value)) return;
    setBaseThicknessMm(clamp(MEDAL_THICKNESS_LIMITS, value));
  }

  function handleFitToSizeChange(value: boolean) {
    setFitToSize(value);
    setModelVersion((version) => version + 1);
  }

  function handleFitMmChange(value: number) {
    if (!Number.isFinite(value)) return;
    setFitMm(clamp(FIT_LIMITS, value));
    setModelVersion((version) => version + 1);
  }

  function handleAddOffset() {
    setOffsets((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        widthMm: DEFAULT_OFFSET_WIDTH_MM,
        thicknessMm: DEFAULT_OFFSET_THICKNESS_MM,
        color: OFFSET_COLOR_PRESETS[current.length % OFFSET_COLOR_PRESETS.length],
      },
    ]);
  }

  function handleRemoveOffset(id: string) {
    setOffsets((current) => current.filter((offset) => offset.id !== id));
  }

  function handleOffsetWidthChange(id: string, value: number) {
    if (!Number.isFinite(value)) return;
    setOffsets((current) =>
      current.map((offset) =>
        offset.id === id
          ? { ...offset, widthMm: clamp(OFFSET_WIDTH_LIMITS, value) }
          : offset,
      ),
    );
  }

  function handleOffsetThicknessChange(id: string, value: number) {
    if (!Number.isFinite(value)) return;
    setOffsets((current) =>
      current.map((offset) =>
        offset.id === id
          ? { ...offset, thicknessMm: clamp(MEDAL_THICKNESS_LIMITS, value) }
          : offset,
      ),
    );
  }

  function handleOffsetColorChange(id: string, color: RgbColor) {
    setOffsets((current) =>
      current.map((offset) => (offset.id === id ? { ...offset, color } : offset)),
    );
  }

  function exportModel(): ExtrudedModel | null {
    const model = geometryRef.current;
    if (!model) return null;
    return {
      title: "Medal",
      parts: [
        { name: "Base", geometry: model.base, color: baseColor },
        ...model.parts.map((part) => ({
          name: `Offset ${part.offsetIndex + 1}`,
          geometry: part.geometry,
          color: offsets[part.offsetIndex]?.color ?? baseColor,
        })),
      ],
    };
  }

  async function handleExport3mf() {
    const model = exportModel();
    if (!model) return;
    fileSaver.saveAs(await build3mfBlob(model), `${exportBaseName()}.3mf`);
  }

  function handleExportStl() {
    const model = exportModel();
    if (!model) return;
    fileSaver.saveAs(buildStlBlob(model), `${exportBaseName()}.stl`);
  }

  const warnings = useMemo(() => {
    if (!dxf) return [];
    return buildDxfWarnings({
      units: dxf.units,
      unsupported: dxf.unsupported,
      openContours: dxf.openContours,
      splinesSkipped: dxf.splinesSkipped,
    });
  }, [dxf]);

  const profile = dxf?.profile ?? [];

  return (
    <main className="min-h-[calc(100svh-4.1rem)] bg-muted/25 lg:h-[calc(100svh-4.1rem)] lg:min-h-0 lg:overflow-hidden">
      <Container className="flex max-w-7xl flex-col gap-6 px-3 py-5 md:px-6 md:py-8 lg:h-full lg:min-h-0 lg:gap-5 lg:py-6">
        <div className="flex flex-col gap-1 lg:shrink-0">
          <h1 className="text-3xl font-bold tracking-tight">Medal Maker</h1>
          <p className="text-sm text-muted-foreground">
            Upload a DXF outline, set the base thickness, and grow the medal outward with
            offsets.
          </p>
        </div>

        <div className="grid items-start gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-stretch">
          {isLoading ? (
            <section className="flex min-h-[60svh] items-center justify-center overflow-hidden rounded-lg border bg-card p-4 lg:min-h-0">
              <Spinner className="size-6 text-muted-foreground" />
            </section>
          ) : profile.length > 0 ? (
            <div className="relative lg:min-h-0">
              <Viewport
                fitKey={modelVersion}
                background="#ffffff"
                className="h-[70svh] min-h-100 w-full overflow-hidden rounded-lg border bg-card lg:h-full lg:min-h-0"
              >
                <MedalScene
                  profile={profile}
                  baseThicknessMm={baseThicknessMm}
                  baseColor={baseColor}
                  offsets={offsets}
                  fitToSize={fitToSize}
                  fitMm={fitMm}
                  geometryRef={geometryRef}
                  onModelInfo={setModelInfo}
                />
              </Viewport>
            </div>
          ) : (
            <section className="flex min-h-[60svh] items-center justify-center overflow-hidden rounded-lg border bg-card p-4 lg:min-h-0">
              {dxf ? (
                <p className="text-sm text-muted-foreground">
                  Nothing to preview — no closed outlines were found in this DXF.
                </p>
              ) : (
                <div className="w-full max-w-md">
                  <FileDropzone
                    accept={{ "application/dxf": [".dxf"], "image/vnd.dxf": [".dxf"] }}
                    icon={SplineIcon}
                    title="Drop a DXF here"
                    hint="or click to browse. Closed outlines become the profile."
                    rejection="Only DXF files are supported."
                    onFile={handleFile}
                    disabled={isLoading}
                  />
                </div>
              )}
            </section>
          )}

          <aside
            ref={sidebarRef}
            className="scrollbar-themed flex flex-col gap-4 lg:min-h-0 lg:overflow-y-scroll lg:pr-4"
          >
            <MedalSourcePanel
              fileName={fileName}
              units={dxf?.units ?? null}
              modelInfo={modelInfo}
              fitToSize={fitToSize}
              fitMm={fitMm}
              error={error}
              disabled={isLoading}
              onFile={(file) => void handleFile(file)}
              onFitToSizeChange={handleFitToSizeChange}
              onFitMmChange={handleFitMmChange}
            />

            <MedalBasePanel
              thicknessMm={baseThicknessMm}
              color={baseColor}
              usedColors={[...offsets.map((offset) => offset.color), baseColor]}
              onThicknessChange={handleBaseThicknessChange}
              onColorChange={setBaseColor}
            />

            <MedalOffsetPanel
              offsets={offsets}
              disabled={isLoading}
              onAdd={handleAddOffset}
              onRemove={handleRemoveOffset}
              onWidthChange={handleOffsetWidthChange}
              onThicknessChange={handleOffsetThicknessChange}
              onColorChange={handleOffsetColorChange}
            />

            <WarningsPanel warnings={warnings} />

            <ExportPanel
              disabled={modelInfo === null}
              onExport3mf={() => void handleExport3mf()}
              onExportStl={handleExportStl}
            />

            {hasMoreOptions ? (
              <div className="pointer-events-none sticky bottom-0 -mt-4 hidden h-16 shrink-0 items-end justify-center bg-linear-to-t from-background via-background/80 to-transparent pb-1 lg:flex">
                <button
                  type="button"
                  aria-label="Scroll down for more options"
                  className="pointer-events-auto flex size-8 cursor-pointer items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground"
                  onClick={() => {
                    const scroller = sidebarRef.current;
                    if (!scroller) return;
                    scroller.scrollBy({
                      top: scroller.clientHeight * 0.8,
                      behavior: "smooth",
                    });
                  }}
                >
                  <ChevronDownIcon className="size-4" />
                </button>
              </div>
            ) : null}
            <div ref={sidebarEndRef} aria-hidden className="h-px shrink-0" />
          </aside>
        </div>
      </Container>
    </main>
  );
}

function exportBaseName(): string {
  return `medal-${format(new Date(), "yyMMdd-HHmm")}`;
}

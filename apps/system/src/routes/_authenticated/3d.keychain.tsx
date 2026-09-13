import { Button } from "@dg/ui/components/button";
import { Spinner } from "@dg/ui/components/spinner";
import { createFileRoute } from "@tanstack/react-router";
import { ImagePlusIcon } from "lucide-react";
import { useRef, useState } from "react";

import { ImageDropzone } from "@/components/3d/image-dropzone";
import { KeychainScene } from "@/components/3d/keychain-model";
import { PalettePanel } from "@/components/3d/palette-panel";
import { QuantizedPreview } from "@/components/3d/quantized-preview";
import { Viewport } from "@/components/3d/viewport";
import { Container } from "@/components/layouts/container";
import { DEFAULT_LAYER_THICKNESS, type PaletteSwatch } from "@/lib/3d/design";
import { decodePng, type DecodedPng } from "@/lib/3d/png";
import { quantize, type QuantizedImage } from "@/lib/3d/quantize";

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

type SourceImage = {
  fileName: string;
  decoded: DecodedPng;
};

function KeychainMakerPage() {
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<SourceImage | null>(null);
  const [colorCount, setColorCount] = useState(DEFAULT_COLOR_COUNT);
  const [quantized, setQuantized] = useState<QuantizedImage | null>(null);
  const [palette, setPalette] = useState<PaletteSwatch[]>([]);
  const [modelVersion, setModelVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyQuantization(decoded: DecodedPng, count: number) {
    const result = quantize(decoded, count);
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
      const decoded = await decodePng(file);
      applyQuantization(decoded, colorCount);
      setSource({ fileName: file.name, decoded });
    } catch (cause) {
      console.error(cause);
      setError(cause instanceof Error ? cause.message : "Could not read that PNG.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleColorCountChange(next: number) {
    setColorCount(next);
    if (!source) return;
    applyQuantization(source.decoded, next);
  }

  function handlePaletteColorChange(
    index: number,
    color: { r: number; g: number; b: number },
  ) {
    setPalette((current) =>
      current.map((swatch, swatchIndex) =>
        swatchIndex === index ? { ...swatch, ...color } : swatch,
      ),
    );
  }

  const hasOpaqueBackground = source !== null && source.decoded.transparentPixels === 0;

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
            <Viewport
              fitKey={modelVersion}
              className="h-[70svh] min-h-100 w-full overflow-hidden rounded-lg border bg-card"
            >
              <KeychainScene quantized={quantized} palette={palette} />
            </Viewport>
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

              {hasOpaqueBackground ? (
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  This PNG has no transparency, so its background will become a color
                  layer.
                </p>
              ) : null}

              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </section>

            <PalettePanel
              colorCount={colorCount}
              palette={palette}
              hasImage={source !== null}
              onColorCountChange={handleColorCountChange}
              onColorChange={handlePaletteColorChange}
              disabled={isLoading}
            />
          </aside>
        </div>
      </Container>
    </main>
  );
}

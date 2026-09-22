import { Button } from "@dg/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@dg/ui/components/card";
import { PaletteIcon, ScanLineIcon } from "lucide-react";

import { MAX_PALETTE_COLORS } from "@/lib/3d/quantize";

export type SvgMode = "raster" | "exact";

type SvgModeChooserProps = {
  paintCount: number;
  gradientCount: number;
  unresolvedCount: number;
  onChoose: (mode: SvgMode) => void;
};

type SvgModeToggleProps = {
  mode: SvgMode;
  exactDisabled: boolean;
  gradientCount: number;
  unresolvedCount: number;
  disabled?: boolean;
  onChange: (mode: SvgMode) => void;
};

export function SvgModeChooser({
  paintCount,
  gradientCount,
  unresolvedCount,
  onChoose,
}: SvgModeChooserProps) {
  const caveat = paintCount > 0 ? caveatText(gradientCount, unresolvedCount) : null;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-1 text-center">
        <h2 className="text-sm font-medium">How should this SVG become a palette?</h2>
        <p className="text-xs text-muted-foreground">
          You can switch modes later in the Source panel.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <span className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ScanLineIcon className="size-5" />
            </span>
            <CardTitle>Rasterize</CardTitle>
            <CardDescription>
              Quantize the rendered pixels, like a PNG. Handles gradients, text, and
              effects.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={() => onChoose("raster")}
            >
              Rasterize
            </Button>
          </CardFooter>
        </Card>

        <Card size="sm">
          <CardHeader>
            <span className="mb-2 flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <PaletteIcon className="size-5" />
            </span>
            <CardTitle>Exact colors</CardTitle>
            <CardDescription>
              {paintCount === 0
                ? "No fill or stroke colors were found in this file."
                : paintCount <= MAX_PALETTE_COLORS
                  ? `Use the ${paintCount} fill and stroke ${
                      paintCount === 1 ? "color" : "colors"
                    } declared in the file.`
                  : `Use the five most-used of the ${paintCount} declared fill and stroke colors.`}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex-col items-stretch gap-2">
            {caveat ? <p className="text-xs text-muted-foreground">{caveat}</p> : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              disabled={paintCount === 0}
              onClick={() => onChoose("exact")}
            >
              Exact colors
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export function SvgModeToggle({
  mode,
  exactDisabled,
  gradientCount,
  unresolvedCount,
  disabled,
  onChange,
}: SvgModeToggleProps) {
  const caveat = mode === "exact" ? caveatText(gradientCount, unresolvedCount) : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-1" role="group" aria-label="SVG reading mode">
        <Button
          type="button"
          size="sm"
          variant={mode === "raster" ? "default" : "outline"}
          disabled={disabled}
          onClick={() => onChange("raster")}
        >
          Rasterize
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "exact" ? "default" : "outline"}
          disabled={disabled || exactDisabled}
          onClick={() => onChange("exact")}
        >
          Exact colors
        </Button>
      </div>
      {caveat ? <p className="text-xs text-muted-foreground">{caveat}</p> : null}
    </div>
  );
}

function caveatText(gradientCount: number, unresolvedCount: number): string | null {
  const parts: string[] = [];

  if (gradientCount > 0) {
    parts.push(
      `${gradientCount} gradient ${
        gradientCount === 1 ? "paint is" : "paints are"
      } approximated by the nearest color`,
    );
  }
  if (unresolvedCount > 0) {
    parts.push(
      `${unresolvedCount} unsupported style ${
        unresolvedCount === 1 ? "rule is" : "rules are"
      } ignored`,
    );
  }

  return parts.length > 0 ? `${parts.join("; ")}.` : null;
}

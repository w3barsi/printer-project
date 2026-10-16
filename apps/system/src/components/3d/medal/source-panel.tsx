import { Button } from "@dg/ui-coss/components/button";
import { Switch } from "@dg/ui-coss/components/switch";
import { UploadIcon } from "lucide-react";
import { useRef } from "react";

import { SliderRow } from "@/components/3d/slider-row";
import { FIT_LIMITS, type MedalModelInfo } from "@/lib/3d/dxf/design";
import type { DxfUnits } from "@/lib/3d/dxf/parse";

type MedalSourcePanelProps = {
  fileName: string | null;
  units: DxfUnits | null;
  modelInfo: MedalModelInfo | null;
  fitToSize: boolean;
  fitMm: number;
  error: string | null;
  disabled?: boolean;
  onFile: (file: File) => void;
  onFitToSizeChange: (value: boolean) => void;
  onFitMmChange: (value: number) => void;
};

export function MedalSourcePanel({
  fileName,
  units,
  modelInfo,
  fitToSize,
  fitMm,
  error,
  disabled,
  onFile,
  onFitToSizeChange,
  onFitMmChange,
}: MedalSourcePanelProps) {
  const replaceInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">Source</h2>
        <p className="text-xs text-muted-foreground">
          ASCII DXF. Closed outlines become the profile.
        </p>
      </div>

      {fileName ? (
        <div className="flex flex-col gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm">{fileName}</span>
            <span className="text-xs text-muted-foreground">{unitNote(units)}</span>
          </div>

          <p className="text-xs text-muted-foreground">
            {modelInfo
              ? `${modelInfo.width.toFixed(1)} × ${modelInfo.height.toFixed(1)} mm · ${modelInfo.triangles.toLocaleString()} triangles`
              : "Waiting for a model."}
          </p>

          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Fit to size</span>
              <span className="text-xs text-muted-foreground/70">
                Scale the base outline.
              </span>
            </div>
            <Switch
              checked={fitToSize}
              disabled={disabled}
              onCheckedChange={onFitToSizeChange}
            />
          </div>

          <SliderRow
            label="Longest side"
            value={fitMm}
            formatValue={(value) => `${value} mm`}
            min={FIT_LIMITS.min}
            max={FIT_LIMITS.max}
            step={FIT_LIMITS.step}
            disabled={!fitToSize || disabled}
            onChange={onFitMmChange}
          />

          <input
            ref={replaceInputRef}
            type="file"
            accept=".dxf,application/dxf,image/vnd.dxf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => replaceInputRef.current?.click()}
          >
            <UploadIcon data-icon="inline-start" />
            Replace DXF
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Upload a DXF to start.</p>
      )}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </section>
  );
}

function unitNote(units: DxfUnits | null): string {
  if (!units) return "";
  if (units.assumed) return "No units in file — assuming millimetres.";
  return `Units: ${units.label}.`;
}

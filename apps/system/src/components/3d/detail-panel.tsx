import { Button } from "@dg/ui-coss/components/button";

import { SliderRow } from "@/components/3d/slider-row";
import { ALPHA_LIMITS, SPECK_LIMITS, type ImageQuality } from "@/lib/3d/design";

const QUALITY_OPTIONS: { value: ImageQuality; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "high", label: "High" },
];

type DetailPanelProps = {
  quality: ImageQuality;
  alphaThreshold: number;
  speckThresholdMm2: number;
  onQualityChange: (quality: ImageQuality) => void;
  onAlphaThresholdChange: (value: number) => void;
  onSpeckThresholdChange: (value: number) => void;
  disabled?: boolean;
};

export function DetailPanel({
  quality,
  alphaThreshold,
  speckThresholdMm2,
  onQualityChange,
  onAlphaThresholdChange,
  onSpeckThresholdChange,
  disabled,
}: DetailPanelProps) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">Detail</h2>
        <p className="text-xs text-muted-foreground">
          Trade processing time for small-feature accuracy.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Quality</span>
          <span className="text-xs tabular-nums">
            {quality === "high" ? "2048 px" : "1024 px"}
          </span>
        </div>
        <div
          className="grid grid-cols-2 gap-1"
          role="group"
          aria-label="Processing quality"
        >
          {QUALITY_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={quality === option.value ? "default" : "outline"}
              disabled={disabled}
              onClick={() => onQualityChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <SliderRow
        label="Alpha cutoff"
        value={alphaThreshold}
        formatValue={(value) => `${value}`}
        min={ALPHA_LIMITS.min}
        max={ALPHA_LIMITS.max}
        step={ALPHA_LIMITS.step}
        disabled={disabled}
        onChange={onAlphaThresholdChange}
      />

      <SliderRow
        label="Remove specks below"
        value={speckThresholdMm2}
        formatValue={(value) => (value === 0 ? "Off" : `${value.toFixed(1)} mm²`)}
        min={SPECK_LIMITS.min}
        max={SPECK_LIMITS.max}
        step={SPECK_LIMITS.step}
        disabled={disabled}
        onChange={onSpeckThresholdChange}
      />
    </section>
  );
}

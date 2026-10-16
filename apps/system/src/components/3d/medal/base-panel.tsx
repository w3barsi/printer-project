import { ColorPickerPopover } from "@/components/3d/color-picker-popover";
import { SliderRow } from "@/components/3d/slider-row";
import { type RgbColor } from "@/lib/3d/color";
import { MEDAL_THICKNESS_LIMITS } from "@/lib/3d/dxf/design";

type MedalBasePanelProps = {
  thicknessMm: number;
  color: RgbColor;
  usedColors: RgbColor[];
  onThicknessChange: (value: number) => void;
  onColorChange: (color: RgbColor) => void;
};

export function MedalBasePanel({
  thicknessMm,
  color,
  usedColors,
  onThicknessChange,
  onColorChange,
}: MedalBasePanelProps) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">Base</h2>
        <p className="text-xs text-muted-foreground">
          The plate every offset grows out from, level with it on the bed.
        </p>
      </div>

      <SliderRow
        label="Base thickness"
        value={thicknessMm}
        formatValue={(value) => `${value.toFixed(1)} mm`}
        min={MEDAL_THICKNESS_LIMITS.min}
        max={MEDAL_THICKNESS_LIMITS.max}
        step={MEDAL_THICKNESS_LIMITS.step}
        onChange={onThicknessChange}
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Base color</span>
        <ColorPickerPopover
          label="Base color"
          value={color}
          usedColors={usedColors}
          onChange={onColorChange}
        />
      </div>
    </section>
  );
}

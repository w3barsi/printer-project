import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dg/ui/components/select";
import { Switch } from "@dg/ui/components/switch";

import { ColorPickerPopover } from "@/components/3d/color-picker-popover";
import { SliderRow } from "@/components/3d/slider-row";
import { type RgbColor } from "@/lib/3d/color";
import {
  BASE_LIMITS,
  type BaseSettings,
  type BaseStyle,
  type KeychainModelInfo,
} from "@/lib/3d/design";

const BASE_SHAPES: Array<{ label: string; value: BaseStyle }> = [
  { label: "Bounding box", value: "rect" },
  { label: "Outline", value: "outline" },
  { label: "Round", value: "circle" },
];

type BasePanelProps = {
  settings: BaseSettings;
  color: RgbColor;
  usedColors: RgbColor[];
  modelInfo: KeychainModelInfo | null;
  onSettingsChange: (settings: BaseSettings) => void;
  onColorChange: (color: RgbColor) => void;
};

export function BasePanel({
  settings,
  color,
  usedColors,
  modelInfo,
  onSettingsChange,
  onColorChange,
}: BasePanelProps) {
  const autoRadius = settings.cornerRadiusMm === null;
  const radius = settings.cornerRadiusMm ?? 3;

  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">Base &amp; size</h2>
        <p className="text-xs text-muted-foreground">
          {modelInfo
            ? `${modelInfo.width.toFixed(1)} × ${modelInfo.height.toFixed(1)} mm · ${modelInfo.triangles.toLocaleString()} triangles`
            : "Waiting for a model."}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted-foreground">Base shape</span>
        <Select
          items={BASE_SHAPES}
          value={settings.style}
          onValueChange={(value) =>
            onSettingsChange({ ...settings, style: value as BaseStyle })
          }
        >
          <SelectTrigger className="w-full" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {BASE_SHAPES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <SliderRow
        label="Longest side"
        value={settings.longestSideMm}
        formatValue={(value) => `${value} mm`}
        min={BASE_LIMITS.longestSideMm.min}
        max={BASE_LIMITS.longestSideMm.max}
        step={BASE_LIMITS.longestSideMm.step}
        onChange={(value) => onSettingsChange({ ...settings, longestSideMm: value })}
      />

      <SliderRow
        label="Base thickness"
        value={settings.thicknessMm}
        formatValue={(value) => `${value.toFixed(1)} mm`}
        min={BASE_LIMITS.thicknessMm.min}
        max={BASE_LIMITS.thicknessMm.max}
        step={BASE_LIMITS.thicknessMm.step}
        onChange={(value) => onSettingsChange({ ...settings, thicknessMm: value })}
      />

      <SliderRow
        label="Margin"
        value={settings.marginMm}
        formatValue={(value) => `${value.toFixed(1)} mm`}
        min={BASE_LIMITS.marginMm.min}
        max={BASE_LIMITS.marginMm.max}
        step={BASE_LIMITS.marginMm.step}
        onChange={(value) => onSettingsChange({ ...settings, marginMm: value })}
      />

      {settings.style === "rect" ? (
        <SliderRow
          label="Corner radius"
          value={radius}
          formatValue={(value) => (autoRadius ? "Auto" : `${value.toFixed(1)} mm`)}
          min={BASE_LIMITS.cornerRadiusMm.min}
          max={BASE_LIMITS.cornerRadiusMm.max}
          step={BASE_LIMITS.cornerRadiusMm.step}
          disabled={autoRadius}
          action={
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Auto
              <Switch
                size="sm"
                checked={autoRadius}
                onCheckedChange={(checked) =>
                  onSettingsChange({
                    ...settings,
                    cornerRadiusMm: checked ? null : 3,
                  })
                }
              />
            </label>
          }
          onChange={(value) => onSettingsChange({ ...settings, cornerRadiusMm: value })}
        />
      ) : settings.style === "outline" ? (
        <p className="text-xs text-muted-foreground">
          The base follows the artwork with a {settings.marginMm.toFixed(1)} mm margin.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Round base {settings.longestSideMm} mm across, artwork fitted inside.
        </p>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Face-down print</span>
          <span className="text-xs text-muted-foreground/70">
            Colors flush with the base, flat top.
          </span>
        </div>
        <Switch
          size="sm"
          checked={settings.faceDown}
          onCheckedChange={(checked) =>
            onSettingsChange({ ...settings, faceDown: checked })
          }
        />
      </div>

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

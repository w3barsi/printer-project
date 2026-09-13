import { Slider } from "@dg/ui/components/slider";
import { Switch } from "@dg/ui/components/switch";

import { fromHex, toHex, type RgbColor } from "@/lib/3d/color";
import { BASE_LIMITS, type BaseSettings, type KeychainModelInfo } from "@/lib/3d/design";

type BasePanelProps = {
  settings: BaseSettings;
  color: RgbColor;
  modelInfo: KeychainModelInfo | null;
  onSettingsChange: (settings: BaseSettings) => void;
  onColorChange: (color: RgbColor) => void;
};

export function BasePanel({
  settings,
  color,
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

      <SliderRow
        label="Longest side"
        value={settings.longestSideMm}
        display={`${settings.longestSideMm} mm`}
        min={BASE_LIMITS.longestSideMm.min}
        max={BASE_LIMITS.longestSideMm.max}
        step={BASE_LIMITS.longestSideMm.step}
        onChange={(value) => onSettingsChange({ ...settings, longestSideMm: value })}
      />

      <SliderRow
        label="Base thickness"
        value={settings.thicknessMm}
        display={`${settings.thicknessMm.toFixed(1)} mm`}
        min={BASE_LIMITS.thicknessMm.min}
        max={BASE_LIMITS.thicknessMm.max}
        step={BASE_LIMITS.thicknessMm.step}
        onChange={(value) => onSettingsChange({ ...settings, thicknessMm: value })}
      />

      <SliderRow
        label="Margin"
        value={settings.marginMm}
        display={`${settings.marginMm.toFixed(1)} mm`}
        min={BASE_LIMITS.marginMm.min}
        max={BASE_LIMITS.marginMm.max}
        step={BASE_LIMITS.marginMm.step}
        onChange={(value) => onSettingsChange({ ...settings, marginMm: value })}
      />

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Corner radius</span>
          <div className="flex items-center gap-3">
            <span className="text-xs tabular-nums">
              {autoRadius ? "Auto" : `${radius.toFixed(1)} mm`}
            </span>
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
          </div>
        </div>
        <Slider
          value={radius}
          min={BASE_LIMITS.cornerRadiusMm.min}
          max={BASE_LIMITS.cornerRadiusMm.max}
          step={BASE_LIMITS.cornerRadiusMm.step}
          disabled={autoRadius}
          onValueChange={(value) => {
            const next = Array.isArray(value) ? value[0] : value;
            onSettingsChange({ ...settings, cornerRadiusMm: next });
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Base color</span>
        <input
          type="color"
          value={toHex(color)}
          onChange={(event) => onColorChange(fromHex(event.target.value))}
          aria-label="Base color"
          className="size-7 cursor-pointer rounded border bg-transparent p-0.5"
        />
      </div>
    </section>
  );
}

type SliderRowProps = {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (value: number) => void;
};

function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step,
  disabled,
  onChange,
}: SliderRowProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs tabular-nums">{display}</span>
      </div>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(value) => onChange(Array.isArray(value) ? value[0] : value)}
      />
    </div>
  );
}

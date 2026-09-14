import { Button } from "@dg/ui/components/button";
import { Slider } from "@dg/ui/components/slider";
import { Switch } from "@dg/ui/components/switch";

import { SliderRow } from "@/components/3d/slider-row";
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

      <div className="grid grid-cols-2 gap-1" role="group" aria-label="Base style">
        <Button
          type="button"
          size="sm"
          variant={settings.style === "rect" ? "default" : "outline"}
          disabled={settings.faceDown}
          onClick={() => onSettingsChange({ ...settings, style: "rect" })}
        >
          Bounding box
        </Button>
        <Button
          type="button"
          size="sm"
          variant={settings.style === "outline" ? "default" : "outline"}
          disabled={settings.faceDown}
          onClick={() => onSettingsChange({ ...settings, style: "outline" })}
        >
          Outline
        </Button>
      </div>

      {settings.faceDown ? (
        <p className="text-xs text-muted-foreground">
          Face-down uses the image outline exactly; margin and corner radius are ignored.
        </p>
      ) : null}

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
        disabled={settings.faceDown}
        onChange={(value) => onSettingsChange({ ...settings, marginMm: value })}
      />

      {settings.style === "rect" && !settings.faceDown ? (
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
      ) : (
        <p className="text-xs text-muted-foreground">
          The base follows the artwork with a {settings.marginMm.toFixed(1)} mm margin.
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

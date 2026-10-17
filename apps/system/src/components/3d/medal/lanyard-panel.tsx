import { Button } from "@dg/ui-coss/components/button";
import { Switch } from "@dg/ui-coss/components/switch";
import { LockIcon, UnlockIcon } from "lucide-react";

import { NumberInput } from "@/components/3d/number-input";
import { SliderRow } from "@/components/3d/slider-row";
import {
  LANYARD_CORNERS,
  LANYARD_LIMITS,
  type Lanyard,
  type LanyardCorner,
} from "@/lib/3d/dxf/design";

const CORNER_LABELS: Record<LanyardCorner, string> = {
  outerLeft: "Outer left",
  outerRight: "Outer right",
  innerLeft: "Inner left",
  innerRight: "Inner right",
};

type MedalLanyardPanelProps = {
  lanyard: Lanyard;
  /** Distance between the contact feet, from the built model. */
  widthMm: number | null;
  disabled?: boolean;
  onChange: (lanyard: Lanyard) => void;
};

export function MedalLanyardPanel({
  lanyard,
  widthMm,
  disabled,
  onChange,
}: MedalLanyardPanelProps) {
  function setCorner(
    corner: LanyardCorner,
    patch: Partial<Lanyard["corners"][LanyardCorner]>,
  ) {
    onChange({
      ...lanyard,
      corners: { ...lanyard.corners, [corner]: { ...lanyard.corners[corner], ...patch } },
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">Lanyard</h2>
        <p className="text-xs text-muted-foreground">
          A tab with a slot for the ribbon. Click the tab on the model to select it — its
          edges show and its contact points become draggable to place and aim it. With the
          width locked the tab moves as one piece.
        </p>
        <p className="text-xs text-muted-foreground/70">
          {widthMm !== null
            ? `Width ${widthMm.toFixed(1)} mm — set by the contact points.`
            : "Waiting for a model."}
        </p>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Lock width</span>
          <span className="text-xs text-muted-foreground/70">
            Keep the width while moving the tab.
          </span>
        </div>
        <Switch
          checked={lanyard.widthLocked}
          disabled={disabled}
          onCheckedChange={(checked) => onChange({ ...lanyard, widthLocked: checked })}
        />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Lock to X axis</span>
          <span className="text-xs text-muted-foreground/70">
            {lanyard.widthLocked
              ? "Keeps the tab flat and aligned to the X axis."
              : "Requires Lock width — enable it above to use this."}
          </span>
        </div>
        <Switch
          checked={lanyard.lockToXAxis}
          disabled={disabled || !lanyard.widthLocked}
          onCheckedChange={(checked) => onChange({ ...lanyard, lockToXAxis: checked })}
        />
      </div>

      <SliderRow
        label="Height"
        value={lanyard.heightMm}
        unit="mm"
        min={LANYARD_LIMITS.heightMm.min}
        max={LANYARD_LIMITS.heightMm.max}
        step={LANYARD_LIMITS.heightMm.step}
        disabled={disabled}
        onChange={(value) => onChange({ ...lanyard, heightMm: value })}
      />

      <SliderRow
        label="Hole width"
        value={lanyard.holeWidthMm}
        unit="mm"
        min={LANYARD_LIMITS.holeWidthMm.min}
        max={LANYARD_LIMITS.holeWidthMm.max}
        step={LANYARD_LIMITS.holeWidthMm.step}
        disabled={disabled}
        onChange={(value) => onChange({ ...lanyard, holeWidthMm: value })}
      />

      <SliderRow
        label="Hole height"
        value={lanyard.holeHeightMm}
        unit="mm"
        min={LANYARD_LIMITS.holeHeightMm.min}
        max={LANYARD_LIMITS.holeHeightMm.max}
        step={LANYARD_LIMITS.holeHeightMm.step}
        disabled={disabled}
        onChange={(value) => onChange({ ...lanyard, holeHeightMm: value })}
      />

      <SliderRow
        label="Thickness"
        value={lanyard.thicknessMm}
        unit="mm"
        min={LANYARD_LIMITS.thicknessMm.min}
        max={LANYARD_LIMITS.thicknessMm.max}
        step={LANYARD_LIMITS.thicknessMm.step}
        disabled={disabled}
        onChange={(value) => onChange({ ...lanyard, thicknessMm: value })}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Fill gaps</span>
          <span className="text-xs text-muted-foreground/70">
            Bridge the space between the tab and the model.
          </span>
        </div>
        <Switch
          checked={lanyard.fillGaps}
          disabled={disabled}
          onCheckedChange={(checked) => onChange({ ...lanyard, fillGaps: checked })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">Corner fillets</span>
        <ul className="flex flex-col gap-1.5">
          {LANYARD_CORNERS.map((corner) => {
            const settings = lanyard.corners[corner];
            return (
              <li key={corner} className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {CORNER_LABELS[corner]}
                </span>
                <label className="flex items-center gap-1">
                  <NumberInput
                    value={settings.filletMm}
                    min={LANYARD_LIMITS.filletMm.min}
                    max={LANYARD_LIMITS.filletMm.max}
                    step={LANYARD_LIMITS.filletMm.step}
                    label={`${CORNER_LABELS[corner]} fillet`}
                    disabled={disabled || settings.locked}
                    onChange={(value) => setCorner(corner, { filletMm: value })}
                  />
                  <span className="text-xs text-muted-foreground">mm</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${settings.locked ? "Unlock" : "Lock"} ${CORNER_LABELS[corner].toLowerCase()} corner`}
                    disabled={disabled}
                    onClick={() => setCorner(corner, { locked: !settings.locked })}
                  >
                    {settings.locked ? <LockIcon /> : <UnlockIcon />}
                  </Button>
                </label>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground/70">
          Locked corners are frozen until unlocked.
        </p>
      </div>
    </section>
  );
}

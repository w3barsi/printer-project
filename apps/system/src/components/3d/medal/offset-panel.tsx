import { Button } from "@dg/ui-coss/components/button";
import { Input } from "@dg/ui-coss/components/input";
import { PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { fromHex, toHex, type RgbColor } from "@/lib/3d/color";
import {
  MEDAL_THICKNESS_LIMITS,
  OFFSET_WIDTH_LIMITS,
  type OffsetLayer,
} from "@/lib/3d/dxf/design";

type MedalOffsetPanelProps = {
  offsets: OffsetLayer[];
  disabled?: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onWidthChange: (id: string, value: number) => void;
  onThicknessChange: (id: string, value: number) => void;
  onColorChange: (id: string, color: RgbColor) => void;
};

export function MedalOffsetPanel({
  offsets,
  disabled,
  onAdd,
  onRemove,
  onWidthChange,
  onThicknessChange,
  onColorChange,
}: MedalOffsetPanelProps) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">Offsets</h2>
        <p className="text-xs text-muted-foreground">
          Bands beside the profile, level with the base. Each offset grows the medal by
          its width and stacks outward in list order.
        </p>
      </div>

      {offsets.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No offsets yet. Add one to give the medal a border.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {offsets.map((offset, index) => (
            <li key={offset.id} className="flex flex-col gap-2 rounded-md border p-2.5">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={toHex(offset.color)}
                  onChange={(event) =>
                    onColorChange(offset.id, fromHex(event.target.value))
                  }
                  aria-label={`Offset ${index + 1} color`}
                  className="size-7 shrink-0 cursor-pointer rounded border bg-transparent p-0.5"
                />
                <span className="min-w-0 flex-1 truncate text-xs font-medium">
                  Offset {index + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove offset ${index + 1}`}
                  disabled={disabled}
                  onClick={() => onRemove(offset.id)}
                >
                  <XIcon />
                </Button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Width</span>
                <label className="flex items-center gap-1">
                  <DraftNumberInput
                    value={offset.widthMm}
                    min={OFFSET_WIDTH_LIMITS.min}
                    max={OFFSET_WIDTH_LIMITS.max}
                    step={OFFSET_WIDTH_LIMITS.step}
                    label={`Offset ${index + 1} width`}
                    disabled={disabled}
                    onChange={(value) => onWidthChange(offset.id, value)}
                  />
                  <span className="text-xs text-muted-foreground">mm</span>
                </label>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Thickness</span>
                <label className="flex items-center gap-1">
                  <DraftNumberInput
                    value={offset.thicknessMm}
                    min={MEDAL_THICKNESS_LIMITS.min}
                    max={MEDAL_THICKNESS_LIMITS.max}
                    step={MEDAL_THICKNESS_LIMITS.step}
                    label={`Offset ${index + 1} thickness`}
                    disabled={disabled}
                    onChange={(value) => onThicknessChange(offset.id, value)}
                  />
                  <span className="text-xs text-muted-foreground">mm</span>
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={onAdd}
      >
        <PlusIcon data-icon="inline-start" />
        Add offset
      </Button>
    </section>
  );
}

/** Number input with a local draft so partial decimals type freely. */
function DraftNumberInput({
  value,
  min,
  max,
  step,
  label,
  disabled,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <Input
      type="number"
      value={draft ?? String(value)}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      aria-label={label}
      className="h-7 w-16 text-xs"
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        const parsed = Number(next);
        if (next.trim() !== "" && Number.isFinite(parsed)) onChange(parsed);
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

import { Slider } from "@dg/ui-coss/components/slider";
import { useEffect, useState, type ReactNode } from "react";

import { NumberInput } from "@/components/3d/number-input";

export type SliderRowProps = {
  label: string;
  value: number;
  /** Unit shown after the value input, e.g. "mm". */
  unit?: string;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  /** Optional control rendered next to the value, e.g. an Auto switch. */
  action?: ReactNode;
  onChange: (value: number) => void;
};

export function SliderRow({
  label,
  value,
  unit,
  min,
  max,
  step,
  disabled,
  action,
  onChange,
}: SliderRowProps) {
  // While dragging, only this draft moves; the parent value (and anything that
  // depends on it) is updated on release.
  const [draft, setDraft] = useState<number | null>(null);
  const shown = draft ?? value;

  useEffect(() => {
    setDraft(null);
  }, [value]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <NumberInput
              value={shown}
              min={min}
              max={max}
              step={step}
              label={label}
              disabled={disabled}
              onChange={onChange}
            />
            {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
          </div>
          {action}
        </div>
      </div>
      <Slider
        value={shown}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(next) => setDraft(Array.isArray(next) ? next[0] : next)}
        onValueCommitted={(next) => {
          onChange(Array.isArray(next) ? next[0] : next);
          setDraft(null);
        }}
      />
    </div>
  );
}

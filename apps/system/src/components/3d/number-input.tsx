import { Input } from "@dg/ui-coss/components/input";
import { useState } from "react";

type NumberInputProps = {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  disabled?: boolean;
  onChange: (value: number) => void;
};

/** Number input with a local draft so partial decimals type freely. */
export function NumberInput({
  value,
  min,
  max,
  step,
  label,
  disabled,
  onChange,
}: NumberInputProps) {
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
        if (next.trim() !== "" && Number.isFinite(parsed)) {
          onChange(Math.min(max, Math.max(min, parsed)));
        }
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

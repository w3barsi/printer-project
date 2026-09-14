import { Slider } from "@dg/ui/components/slider";

export type SliderRowProps = {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (value: number) => void;
};

export function SliderRow({
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
        onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
      />
    </div>
  );
}

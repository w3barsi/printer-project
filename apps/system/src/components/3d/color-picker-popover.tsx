import { Button } from "@dg/ui/components/button";
import {
  ColorPicker,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from "@dg/ui/components/color-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@dg/ui/components/popover";
import { cn } from "@dg/ui/lib/utils";
import { useCallback } from "react";

import { toHex, type RgbColor } from "@/lib/3d/color";

type ColorPickerPopoverProps = {
  label: string;
  value: RgbColor;
  usedColors: RgbColor[];
  onChange: (color: RgbColor) => void;
  disabled?: boolean;
};

export function ColorPickerPopover({
  label,
  value,
  usedColors,
  onChange,
  disabled,
}: ColorPickerPopoverProps) {
  const hex = toHex(value);

  // Stable identity keeps the picker's change effect from re-firing every render.
  const handleChange = useCallback(
    ([red, green, blue]: [number, number, number, number]) => {
      onChange({
        r: Math.round(red),
        g: Math.round(green),
        b: Math.round(blue),
      });
    },
    [onChange],
  );

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={disabled}
            aria-label={label}
            className="size-7 p-1"
          />
        }
      >
        <span
          className="size-full rounded-xs border border-black/10"
          style={{ backgroundColor: hex }}
        />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        {usedColors.length > 0 ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">Used in this project</span>
            <div className="flex flex-wrap gap-1.5">
              {usedColors.map((color) => {
                const swatchHex = toHex(color);
                return (
                  <button
                    key={swatchHex}
                    type="button"
                    aria-label={`Use ${swatchHex}`}
                    className={cn(
                      "size-6 cursor-pointer rounded border",
                      swatchHex === hex &&
                        "ring-2 ring-ring ring-offset-1 ring-offset-popover",
                    )}
                    style={{ backgroundColor: swatchHex }}
                    onClick={() => onChange(color)}
                  />
                );
              })}
            </div>
          </div>
        ) : null}
        <ColorPicker className="gap-3" value={hex} onChange={handleChange}>
          <ColorPickerSelection className="h-36 rounded-md" />
          <ColorPickerHue />
          <div className="flex items-center gap-2">
            <ColorPickerEyeDropper size="icon-sm" />
            <ColorPickerOutput />
            <ColorPickerFormat />
          </div>
        </ColorPicker>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { Button } from "@dg/ui/components/button";
import { Input } from "@dg/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dg/ui/components/select";
import { cn } from "@dg/ui/lib/utils";
import Color, { type ColorLike } from "color";
import { PipetteIcon } from "lucide-react";
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface ColorPickerContextValue {
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
  mode: string;
  setHue: (hue: number) => void;
  setSaturation: (saturation: number) => void;
  setLightness: (lightness: number) => void;
  setAlpha: (alpha: number) => void;
  setMode: (mode: string) => void;
}

const ColorPickerContext = createContext<ColorPickerContextValue | undefined>(undefined);

export function useColorPicker() {
  const context = useContext(ColorPickerContext);

  if (!context) {
    throw new Error("useColorPicker must be used within a ColorPicker");
  }

  return context;
}

export type ColorPickerProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> & {
  value?: ColorLike;
  defaultValue?: ColorLike;
  onChange?: (value: [number, number, number, number]) => void;
};

export function ColorPicker({
  value,
  defaultValue = "#000000",
  onChange,
  className,
  ...props
}: ColorPickerProps) {
  const initialColor = Color(value ?? defaultValue);

  const [hue, setHue] = useState(initialColor.hue());
  const [saturation, setSaturation] = useState(initialColor.saturationl());
  const [lightness, setLightness] = useState(initialColor.lightness());
  const [alpha, setAlpha] = useState(initialColor.alpha() * 100);
  const [mode, setMode] = useState("hex");
  const emittedHex = useRef<string | null>(null);

  // Follow the controlled value so external picks (e.g. known swatches) update
  // the canvas, sliders and readouts. Values this picker emitted are ignored so
  // dragging near an achromatic color can't fight the pointer.
  useEffect(() => {
    if (value === undefined) return;

    const color = Color(value);
    if (color.hex().toLowerCase() === emittedHex.current) return;

    setHue(color.hue());
    setSaturation(color.saturationl());
    setLightness(color.lightness());
    setAlpha(color.alpha() * 100);
  }, [value]);

  useEffect(() => {
    if (!onChange) return;

    const color = Color.hsl(hue, saturation, lightness).alpha(alpha / 100);
    const [red, green, blue] = color.rgb().array();

    emittedHex.current = Color.rgb(Math.round(red), Math.round(green), Math.round(blue))
      .hex()
      .toLowerCase();
    onChange([red, green, blue, alpha / 100]);
  }, [hue, saturation, lightness, alpha, onChange]);

  return (
    <ColorPickerContext.Provider
      value={{
        hue,
        saturation,
        lightness,
        alpha,
        mode,
        setHue,
        setSaturation,
        setLightness,
        setAlpha,
        setMode,
      }}
    >
      <div className={cn("flex size-full flex-col gap-4", className)} {...props} />
    </ColorPickerContext.Provider>
  );
}

export type ColorPickerSelectionProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerSelection = memo(function ColorPickerSelection({
  className,
  ...props
}: ColorPickerSelectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { hue, saturation, lightness, setSaturation, setLightness } = useColorPicker();

  const backgroundGradient = useMemo(
    () => `linear-gradient(0deg, rgba(0,0,0,1), rgba(0,0,0,0)),
            linear-gradient(90deg, rgba(255,255,255,1), rgba(255,255,255,0)),
            hsl(${hue}, 100%, 50%)`,
    [hue],
  );

  // Derive the marker position from the current color so it also moves when
  // the controlled value changes from the outside.
  const positionX = saturation / 100;
  const topLightness = positionX < 0.01 ? 100 : 50 + 50 * (1 - positionX);
  const positionY = Math.min(1, Math.max(0, 1 - lightness / topLightness));

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      setSaturation(x * 100);
      const top = x < 0.01 ? 100 : 50 + 50 * (1 - x);
      setLightness(top * (1 - y));
    },
    [setSaturation, setLightness],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerUp = () => setIsDragging(false);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging, handlePointerMove]);

  return (
    <div
      className={cn("relative size-full cursor-crosshair rounded", className)}
      ref={containerRef}
      style={{ background: backgroundGradient }}
      onPointerDown={(event) => {
        event.preventDefault();
        setIsDragging(true);
        handlePointerMove(event.nativeEvent);
      }}
      {...props}
    >
      <div
        className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
        style={{
          left: `${positionX * 100}%`,
          top: `${positionY * 100}%`,
          boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
        }}
      />
    </div>
  );
});

export type ColorPickerHueProps = SliderPrimitive.Root.Props<number[]>;

export function ColorPickerHue({ className, ...props }: ColorPickerHueProps) {
  const { hue, setHue } = useColorPicker();

  return (
    <SliderPrimitive.Root
      className={cn("relative flex h-4 w-full touch-none select-none", className)}
      max={360}
      min={0}
      step={1}
      thumbAlignment="edge"
      value={[hue]}
      onValueChange={([next]) => setHue(next)}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none">
        <SliderPrimitive.Track className="relative my-0.5 h-3 w-full grow overflow-hidden rounded-full bg-[linear-gradient(90deg,#FF0000,#FFFF00,#00FF00,#00FFFF,#0000FF,#FF00FF,#FF0000)]">
          <SliderPrimitive.Indicator className="absolute h-full" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-label="Hue"
          className="block size-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export type ColorPickerAlphaProps = SliderPrimitive.Root.Props<number[]>;

export function ColorPickerAlpha({ className, ...props }: ColorPickerAlphaProps) {
  const { alpha, setAlpha } = useColorPicker();

  return (
    <SliderPrimitive.Root
      className={cn("relative flex h-4 w-full touch-none select-none", className)}
      max={100}
      min={0}
      step={1}
      thumbAlignment="edge"
      value={[alpha]}
      onValueChange={([next]) => setAlpha(next)}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none">
        <SliderPrimitive.Track
          className="relative my-0.5 h-3 w-full grow overflow-hidden rounded-full"
          style={{
            background:
              'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==") left center',
          }}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent to-black/50" />
          <SliderPrimitive.Indicator className="absolute h-full rounded-full bg-transparent" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-label="Alpha"
          className="block size-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export type ColorPickerEyeDropperProps = ComponentProps<typeof Button>;

export function ColorPickerEyeDropper({
  className,
  ...props
}: ColorPickerEyeDropperProps) {
  const { setHue, setSaturation, setLightness, setAlpha } = useColorPicker();

  async function handleEyeDropper() {
    try {
      // @ts-expect-error EyeDropper API is not in the DOM types yet
      const eyeDropper = new EyeDropper();
      const result: { sRGBHex: string } = await eyeDropper.open();
      const color = Color(result.sRGBHex);

      setHue(color.hue());
      setSaturation(color.saturationl());
      setLightness(color.lightness());
      setAlpha(100);
    } catch (cause) {
      console.error("EyeDropper failed:", cause);
    }
  }

  return (
    <Button
      aria-label="Pick a color from the screen"
      className={cn("shrink-0 text-muted-foreground", className)}
      onClick={() => void handleEyeDropper()}
      size="icon"
      type="button"
      variant="outline"
      {...props}
    >
      <PipetteIcon />
    </Button>
  );
}

export type ColorPickerOutputProps = ComponentProps<typeof SelectTrigger>;

const FORMATS = [
  { value: "hex", label: "HEX" },
  { value: "rgb", label: "RGB" },
  { value: "css", label: "CSS" },
  { value: "hsl", label: "HSL" },
];

export function ColorPickerOutput({ className, ...props }: ColorPickerOutputProps) {
  const { mode, setMode } = useColorPicker();

  return (
    <Select
      items={FORMATS}
      value={mode}
      onValueChange={(next) => {
        if (next !== null) setMode(next);
      }}
    >
      <SelectTrigger
        className={cn("h-8 w-20 shrink-0 text-xs", className)}
        size="sm"
        {...props}
      >
        <SelectValue placeholder="Mode" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {FORMATS.map((format) => (
            <SelectItem className="text-xs" key={format.value} value={format.value}>
              {format.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

type PercentageInputProps = ComponentProps<typeof Input>;

function PercentageInput({ className, ...props }: PercentageInputProps) {
  return (
    <div className="relative -ml-px">
      <Input
        readOnly
        type="text"
        {...props}
        className={cn(
          "h-8 w-[3.25rem] rounded-l-none bg-secondary px-2 text-xs shadow-none",
          className,
        )}
      />
      <span className="absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">
        %
      </span>
    </div>
  );
}

export type ColorPickerFormatProps = HTMLAttributes<HTMLDivElement>;

export function ColorPickerFormat({ className, ...props }: ColorPickerFormatProps) {
  const { hue, saturation, lightness, alpha, mode } = useColorPicker();
  const color = Color.hsl(hue, saturation, lightness, alpha / 100);

  if (mode === "hex") {
    return (
      <div
        className={cn(
          "relative flex w-full items-center rounded-md shadow-sm",
          className,
        )}
        {...props}
      >
        <Input
          className="h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none"
          readOnly
          type="text"
          value={color.hex()}
        />
        <PercentageInput value={alpha} />
      </div>
    );
  }

  if (mode === "rgb") {
    const rgb = color
      .rgb()
      .array()
      .map((value) => Math.round(value));

    return (
      <div className={cn("flex items-center rounded-md shadow-sm", className)} {...props}>
        {rgb.map((value, index) => (
          <Input
            className={cn(
              "h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none",
              index > 0 && "-ml-px rounded-l-none",
            )}
            key={index}
            readOnly
            type="text"
            value={value}
          />
        ))}
        <PercentageInput value={alpha} />
      </div>
    );
  }

  if (mode === "css") {
    const rgb = color
      .rgb()
      .array()
      .map((value) => Math.round(value));

    return (
      <div className={cn("w-full rounded-md shadow-sm", className)} {...props}>
        <Input
          className="h-8 w-full bg-secondary px-2 text-xs shadow-none"
          readOnly
          type="text"
          value={`rgba(${rgb.join(", ")}, ${Math.round(alpha)}%)`}
        />
      </div>
    );
  }

  if (mode === "hsl") {
    const hsl = color
      .hsl()
      .array()
      .map((value) => Math.round(value));

    return (
      <div className={cn("flex items-center rounded-md shadow-sm", className)} {...props}>
        {hsl.map((value, index) => (
          <Input
            className={cn(
              "h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none",
              index > 0 && "-ml-px rounded-l-none",
            )}
            key={index}
            readOnly
            type="text"
            value={value}
          />
        ))}
        <PercentageInput value={alpha} />
      </div>
    );
  }

  return null;
}

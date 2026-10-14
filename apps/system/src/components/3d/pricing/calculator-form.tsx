import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Id } from "@dg/backend/dataModel";
import {
  formatPeso,
  printPricingLimits,
  type PrintPricingInput,
} from "@dg/backend/printPricing";
import { Button } from "@dg/ui-coss/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dg/ui-coss/components/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@dg/ui-coss/components/field";
import { Input } from "@dg/ui-coss/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dg/ui-coss/components/select";
import { Spinner } from "@dg/ui-coss/components/spinner";
import { Switch } from "@dg/ui-coss/components/switch";
import { Textarea } from "@dg/ui-coss/components/textarea";
import { toastManager } from "@dg/ui-coss/components/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookmarkPlusIcon, PlusIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useHotkeys } from "react-hotkeys-hook";
import { z } from "zod";

import {
  FilamentPresetFormDialog,
  PrinterPresetFormDialog,
  type FilamentPresetInitialValues,
  type PrinterPresetInitialValues,
  type PrinterPresetListItem,
} from "@/components/3d/pricing/preset-manager-dialog";

const filamentRowSchema = z.object({
  presetId: z.string(),
  name: z.string().trim().min(1, "Filament name is required").max(120),
  weightGrams: z.number().positive("Weight must be greater than 0"),
  costPerKg: z.number().nonnegative("Cost per kg cannot be negative"),
});

const pricingCalculatorSchema = z
  .object({
    filaments: z
      .array(filamentRowSchema)
      .min(1, "Add at least one filament")
      .max(
        printPricingLimits.maxFilaments,
        `Use at most ${printPricingLimits.maxFilaments} filaments`,
      ),
    printTimeHours: z.number(),
    printTimeMinutes: z.number(),
    includePrinter: z.boolean(),
    printerPresetId: z.string(),
    printerName: z.string().max(120).optional(),
    printerPowerWatts: z.number(),
    printerPrice: z.number(),
    printerLifespanHours: z.number(),
    electricityRatePerKwh: z.number(),
    includeLabor: z.boolean(),
    laborRatePerHour: z.number(),
    laborHours: z.number(),
    includeBusiness: z.boolean(),
    failureRatePercent: z.number(),
    markupPercent: z.number(),
    note: z.string().max(500).optional(),
  })
  .superRefine((values, context) => {
    if (!Number.isFinite(values.printTimeHours) || values.printTimeHours < 0) {
      context.addIssue({
        code: "custom",
        path: ["printTimeHours"],
        message: "Hours must be a non-negative number",
      });
    }

    if (
      !Number.isFinite(values.printTimeMinutes) ||
      values.printTimeMinutes < 0 ||
      values.printTimeMinutes > 59
    ) {
      context.addIssue({
        code: "custom",
        path: ["printTimeMinutes"],
        message: "Minutes must be between 0 and 59",
      });
    }

    if (values.includePrinter) {
      if (!Number.isFinite(values.printerPowerWatts) || values.printerPowerWatts <= 0) {
        context.addIssue({
          code: "custom",
          path: ["printerPowerWatts"],
          message: "Power must be greater than 0",
        });
      }

      if (!Number.isFinite(values.printerPrice) || values.printerPrice < 0) {
        context.addIssue({
          code: "custom",
          path: ["printerPrice"],
          message: "Price must be a non-negative number",
        });
      }

      if (
        !Number.isFinite(values.printerLifespanHours) ||
        values.printerLifespanHours <= 0
      ) {
        context.addIssue({
          code: "custom",
          path: ["printerLifespanHours"],
          message: "Lifespan must be greater than 0",
        });
      }

      if (
        !Number.isFinite(values.electricityRatePerKwh) ||
        values.electricityRatePerKwh < 0
      ) {
        context.addIssue({
          code: "custom",
          path: ["electricityRatePerKwh"],
          message: "Rate must be a non-negative number",
        });
      }
    }

    if (values.includeLabor) {
      if (!Number.isFinite(values.laborRatePerHour) || values.laborRatePerHour < 0) {
        context.addIssue({
          code: "custom",
          path: ["laborRatePerHour"],
          message: "Rate must be a non-negative number",
        });
      }

      if (!Number.isFinite(values.laborHours) || values.laborHours < 0) {
        context.addIssue({
          code: "custom",
          path: ["laborHours"],
          message: "Hours must be a non-negative number",
        });
      }
    }

    if (values.includeBusiness) {
      if (
        !Number.isFinite(values.failureRatePercent) ||
        values.failureRatePercent < 0 ||
        values.failureRatePercent > 100
      ) {
        context.addIssue({
          code: "custom",
          path: ["failureRatePercent"],
          message: "Failure rate must be between 0 and 100",
        });
      }

      if (!Number.isFinite(values.markupPercent) || values.markupPercent < 0) {
        context.addIssue({
          code: "custom",
          path: ["markupPercent"],
          message: "Markup must be a non-negative number",
        });
      }
    }
  });

type PricingCalculatorFormData = z.infer<typeof pricingCalculatorSchema>;

function createEmptyFilamentRow() {
  return { presetId: "", name: "", weightGrams: 0, costPerKg: 0 };
}

function createDefaultValues(): PricingCalculatorFormData {
  return {
    filaments: [createEmptyFilamentRow()],
    printTimeHours: 0,
    printTimeMinutes: 0,
    includePrinter: true,
    printerPresetId: "",
    printerName: "",
    printerPowerWatts: 0,
    printerPrice: 0,
    printerLifespanHours: 0,
    electricityRatePerKwh: 18,
    includeLabor: true,
    laborRatePerHour: 100,
    laborHours: 0.25,
    includeBusiness: true,
    failureRatePercent: 5,
    markupPercent: 50,
    note: "",
  };
}

function toFiniteNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function toPricingInput(values: PricingCalculatorFormData): PrintPricingInput {
  return {
    filaments: values.filaments.map((filament) => ({
      presetId: filament.presetId
        ? (filament.presetId as Id<"printPricingFilamentPresets">)
        : undefined,
      name: filament.name.trim(),
      weightGrams: toFiniteNumber(filament.weightGrams),
      costPerKg: toFiniteNumber(filament.costPerKg),
    })),
    printTimeHours:
      toFiniteNumber(values.printTimeHours) +
      toFiniteNumber(values.printTimeMinutes) / 60,
    printer: values.includePrinter
      ? {
          presetId: values.printerPresetId
            ? (values.printerPresetId as Id<"printPricingPrinterPresets">)
            : undefined,
          name: values.printerName?.trim() || undefined,
          powerWatts: toFiniteNumber(values.printerPowerWatts),
          price: toFiniteNumber(values.printerPrice),
          lifespanHours: toFiniteNumber(values.printerLifespanHours),
          electricityRatePerKwh: toFiniteNumber(values.electricityRatePerKwh),
        }
      : undefined,
    labor: values.includeLabor
      ? {
          ratePerHour: toFiniteNumber(values.laborRatePerHour),
          hours: toFiniteNumber(values.laborHours),
        }
      : undefined,
    business: values.includeBusiness
      ? {
          failureRatePercent: toFiniteNumber(values.failureRatePercent),
          markupPercent: toFiniteNumber(values.markupPercent),
        }
      : undefined,
  };
}

// Rebuild the form's flattened shape from a saved pricing input (used to
// prefill the calculator with the latest history entry).
function toFormValues(input: PrintPricingInput): PricingCalculatorFormData {
  const defaults = createDefaultValues();
  const totalMinutes = Math.round(input.printTimeHours * 60);

  return {
    ...defaults,
    filaments: input.filaments.map((filament) => ({
      presetId: filament.presetId ?? "",
      name: filament.name,
      weightGrams: filament.weightGrams,
      costPerKg: filament.costPerKg,
    })),
    printTimeHours: Math.floor(totalMinutes / 60),
    printTimeMinutes: totalMinutes % 60,
    includePrinter: input.printer !== undefined,
    printerPresetId: input.printer?.presetId ?? "",
    printerName: input.printer?.name ?? "",
    printerPowerWatts: input.printer?.powerWatts ?? 0,
    printerPrice: input.printer?.price ?? 0,
    printerLifespanHours: input.printer?.lifespanHours ?? 0,
    electricityRatePerKwh:
      input.printer?.electricityRatePerKwh ?? defaults.electricityRatePerKwh,
    includeLabor: input.labor !== undefined,
    laborRatePerHour: input.labor?.ratePerHour ?? defaults.laborRatePerHour,
    laborHours: input.labor?.hours ?? defaults.laborHours,
    includeBusiness: input.business !== undefined,
    failureRatePercent: input.business?.failureRatePercent ?? defaults.failureRatePercent,
    markupPercent: input.business?.markupPercent ?? defaults.markupPercent,
    note: "",
  };
}

export function PricingCalculatorForm({
  itemId,
  initialInput,
  onInputChange,
}: {
  itemId: Id<"printPricingItems">;
  initialInput?: PrintPricingInput;
  onInputChange: (input: PrintPricingInput) => void;
}) {
  const form = useForm<PricingCalculatorFormData>({
    resolver: zodResolver(pricingCalculatorSchema),
    defaultValues: initialInput ? toFormValues(initialInput) : createDefaultValues(),
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "filaments",
  });
  const mutation = useMutation({
    mutationFn: useConvexMutation(api.printPricing.calculations.createCalculation),
    onSuccess: () => {
      toastManager.add({ title: "Price saved", type: "success" });
      form.setValue("note", "");
    },
    onError: (error) => {
      toastManager.add({
        title: error.message || "Could not save price",
        type: "error",
      });
    },
  });
  const { data: printerPresets } = useQuery(
    convexQuery(api.printPricing.presets.listPrinterPresets, {}),
  );
  const { data: filamentPresets } = useQuery(
    convexQuery(api.printPricing.presets.listFilamentPresets, {}),
  );
  const includePrinter = form.watch("includePrinter");
  const includeLabor = form.watch("includeLabor");
  const includeBusiness = form.watch("includeBusiness");
  const printerPresetId = form.watch("printerPresetId");
  const [printerPresetInitial, setPrinterPresetInitial] =
    useState<PrinterPresetInitialValues | null>(null);
  const [filamentPresetInitial, setFilamentPresetInitial] =
    useState<FilamentPresetInitialValues | null>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  useHotkeys(
    "ctrl+enter",
    () => saveButtonRef.current?.click(),
    {
      enabled: !mutation.isPending,
      enableOnFormTags: true,
      enableOnContentEditable: true,
      ignoreEventWhen: (event) => event.repeat,
      preventDefault: true,
    },
    [mutation.isPending],
  );

  const printerPresetItems = useMemo(
    () =>
      (printerPresets ?? []).map((preset) => ({
        label: preset.name,
        value: preset._id,
      })),
    [printerPresets],
  );
  const filamentPresetItems = useMemo(
    () =>
      (filamentPresets ?? []).map((preset) => ({
        label: `${preset.name} · ${formatPeso(preset.costPerKg)}/kg`,
        value: preset._id,
      })),
    [filamentPresets],
  );
  const selectedPrinterPreset = useMemo(
    () =>
      printerPresetId
        ? (printerPresets?.find((preset) => preset._id === printerPresetId) ?? null)
        : null,
    [printerPresets, printerPresetId],
  );
  const defaultPrinterPreset = useMemo(() => {
    if (!printerPresets?.length) {
      return null;
    }

    return printerPresets.reduce((mostUsed, preset) =>
      preset.useCount > mostUsed.useCount ? preset : mostUsed,
    );
  }, [printerPresets]);

  // Keep the parent's breakdown panel in sync. `form.watch(callback)` does not
  // fire for field-array operations, so add/remove/reset sync explicitly.
  useEffect(() => {
    const subscription = form.watch((values) => {
      onInputChange(toPricingInput(values as PricingCalculatorFormData));
    });

    onInputChange(toPricingInput(form.getValues()));

    return () => subscription.unsubscribe();
  }, [form, onInputChange]);

  const appliedDefaultPresetRef = useRef(false);
  // A form opened from a saved snapshot keeps it until "Clear" is pressed.
  const prefillActiveRef = useRef(initialInput !== undefined);

  // Preselect the most-used printer preset once the preset list arrives.
  // Prefilled forms keep the saved snapshot instead.
  useEffect(() => {
    if (
      prefillActiveRef.current ||
      appliedDefaultPresetRef.current ||
      !defaultPrinterPreset
    ) {
      return;
    }

    appliedDefaultPresetRef.current = true;
    applyPrinterPreset(defaultPrinterPreset);
  }, [defaultPrinterPreset]);

  // Snapshots keep their values even if the preset behind them was deleted.
  // Drop dead preset references so the selects fall back to their placeholder.
  useEffect(() => {
    if (!prefillActiveRef.current) {
      return;
    }

    const presetId = form.getValues("printerPresetId");

    if (
      printerPresets &&
      presetId &&
      !printerPresets.some((preset) => preset._id === presetId)
    ) {
      form.setValue("printerPresetId", "");
    }

    if (filamentPresets) {
      form.getValues("filaments").forEach((filament, index) => {
        if (
          filament.presetId &&
          !filamentPresets.some((preset) => preset._id === filament.presetId)
        ) {
          form.setValue(`filaments.${index}.presetId`, "");
        }
      });
    }
  }, [form, printerPresets, filamentPresets]);

  function applyPrinterPreset(preset: PrinterPresetListItem) {
    form.setValue("printerPresetId", preset._id);
    form.setValue("printerName", preset.name);
    form.setValue("printerPowerWatts", preset.powerWatts);
    form.setValue("printerPrice", preset.price);
    form.setValue("printerLifespanHours", preset.lifespanHours);
  }

  function syncInput() {
    onInputChange(toPricingInput(form.getValues()));
  }

  function handleAddFilament() {
    append(createEmptyFilamentRow());
    syncInput();
  }

  function handleRemoveFilament(index: number) {
    remove(index);
    syncInput();
  }

  function handleClear() {
    prefillActiveRef.current = false;
    const defaults = createDefaultValues();
    form.reset(defaults);
    onInputChange(toPricingInput(defaults));

    if (defaultPrinterPreset) {
      appliedDefaultPresetRef.current = true;
      applyPrinterPreset(defaultPrinterPreset);
    }
  }

  function onSubmit(values: PricingCalculatorFormData) {
    const input = toPricingInput(values);

    mutation.mutate({
      itemId,
      note: values.note?.trim() || undefined,
      filaments: input.filaments,
      printTimeHours: input.printTimeHours,
      printer: input.printer,
      labor: input.labor,
      business: input.business,
    });
  }

  return (
    <>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-4">
            <CardTitle>Material</CardTitle>
            <CardDescription>Filament consumed by the print.</CardDescription>
            <CardAction>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  fields.length >= printPricingLimits.maxFilaments || mutation.isPending
                }
                onClick={handleAddFilament}
              >
                <PlusIcon data-icon="inline-start" />
                Add filament
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 p-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex flex-col gap-4 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Filament {index + 1}</p>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={mutation.isPending}
                      onClick={() =>
                        setFilamentPresetInitial({
                          name: form.getValues(`filaments.${index}.name`),
                          costPerKg: form.getValues(`filaments.${index}.costPerKg`),
                        })
                      }
                    >
                      <BookmarkPlusIcon />
                      <span className="sr-only">Save filament {index + 1} as preset</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={fields.length <= 1 || mutation.isPending}
                      onClick={() => handleRemoveFilament(index)}
                    >
                      <Trash2Icon />
                      <span className="sr-only">Remove filament {index + 1}</span>
                    </Button>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Controller
                    name={`filaments.${index}.presetId`}
                    control={form.control}
                    render={({ field: presetField }) => (
                      <Field>
                        <FieldLabel htmlFor={`filament-${index}-preset`}>
                          Preset
                        </FieldLabel>
                        <Select
                          items={filamentPresetItems}
                          name={presetField.name}
                          value={presetField.value || null}
                          onValueChange={(value) => {
                            const presetId = typeof value === "string" ? value : "";
                            presetField.onChange(presetId);
                            const preset = filamentPresets?.find(
                              (item) => item._id === presetId,
                            );
                            if (preset) {
                              form.setValue(`filaments.${index}.name`, preset.name);
                              form.setValue(
                                `filaments.${index}.costPerKg`,
                                preset.costPerKg,
                              );
                            }
                          }}
                          disabled={mutation.isPending}
                        >
                          <SelectTrigger
                            id={`filament-${index}-preset`}
                            className="w-full"
                          >
                            <SelectValue placeholder="Choose a preset" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {filamentPresetItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />
                  <Controller
                    name={`filaments.${index}.name`}
                    control={form.control}
                    render={({ field: nameField, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={`filament-${index}-name`}>Name</FieldLabel>
                        <Input
                          {...nameField}
                          id={`filament-${index}-name`}
                          placeholder="e.g. PLA Basic"
                          aria-invalid={fieldState.invalid}
                          disabled={mutation.isPending}
                        />
                        {fieldState.invalid && (
                          <FieldError>{fieldState.error?.message}</FieldError>
                        )}
                      </Field>
                    )}
                  />
                  <Controller
                    name={`filaments.${index}.weightGrams`}
                    control={form.control}
                    render={({ field: weightField, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={`filament-${index}-weight`}>
                          Weight (g)
                        </FieldLabel>
                        <Input
                          {...weightField}
                          id={`filament-${index}-weight`}
                          type="number"
                          min="0"
                          step="any"
                          aria-invalid={fieldState.invalid}
                          disabled={mutation.isPending}
                          onChange={(event) =>
                            weightField.onChange(Number(event.target.value))
                          }
                        />
                        {fieldState.invalid && (
                          <FieldError>{fieldState.error?.message}</FieldError>
                        )}
                      </Field>
                    )}
                  />
                  <Controller
                    name={`filaments.${index}.costPerKg`}
                    control={form.control}
                    render={({ field: costField, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={`filament-${index}-cost`}>
                          Cost per kg (₱)
                        </FieldLabel>
                        <Input
                          {...costField}
                          id={`filament-${index}-cost`}
                          type="number"
                          min="0"
                          step="any"
                          aria-invalid={fieldState.invalid}
                          disabled={mutation.isPending}
                          onChange={(event) =>
                            costField.onChange(Number(event.target.value))
                          }
                        />
                        {fieldState.invalid && (
                          <FieldError>{fieldState.error?.message}</FieldError>
                        )}
                      </Field>
                    )}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-4">
            <CardTitle>Printer</CardTitle>
            <CardDescription>Machine wear and electricity costs.</CardDescription>
            <CardAction>
              <Controller
                name="includePrinter"
                control={form.control}
                render={({ field }) => (
                  <label
                    htmlFor="include-printer-costs"
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    Include
                    <Switch
                      id="include-printer-costs"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={mutation.isPending}
                    />
                  </label>
                )}
              />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 p-4">
            <Controller
              name="printerPresetId"
              control={form.control}
              render={({ field: presetField }) => (
                <Field>
                  <FieldLabel htmlFor="printer-preset">Printer preset</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Select
                      items={printerPresetItems}
                      name={presetField.name}
                      value={presetField.value || null}
                      onValueChange={(value) => {
                        const presetId = typeof value === "string" ? value : "";
                        const preset = printerPresets?.find(
                          (item) => item._id === presetId,
                        );

                        if (preset) {
                          applyPrinterPreset(preset);
                        } else {
                          presetField.onChange(presetId);
                        }
                      }}
                      disabled={!includePrinter || mutation.isPending}
                    >
                      <SelectTrigger id="printer-preset" className="w-full">
                        <SelectValue placeholder="Choose a preset" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {printerPresetItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={!includePrinter || mutation.isPending}
                      onClick={() =>
                        setPrinterPresetInitial({
                          powerWatts: form.getValues("printerPowerWatts"),
                          price: form.getValues("printerPrice"),
                          lifespanHours: form.getValues("printerLifespanHours"),
                        })
                      }
                    >
                      <BookmarkPlusIcon data-icon="inline-start" />
                      Create preset
                    </Button>
                  </div>
                  <FieldDescription>
                    {selectedPrinterPreset
                      ? `Used ${selectedPrinterPreset.useCount.toLocaleString()} ${
                          selectedPrinterPreset.useCount === 1 ? "time" : "times"
                        }${
                          selectedPrinterPreset._id === defaultPrinterPreset?._id
                            ? " · default"
                            : ""
                        }`
                      : printerPresetItems.length > 0
                        ? "The most-used preset is chosen by default."
                        : "Create a preset to fill these fields in one click."}
                  </FieldDescription>
                </Field>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                name="printTimeHours"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="print-time-hours">Hours</FieldLabel>
                    <Input
                      {...field}
                      id="print-time-hours"
                      type="number"
                      min="0"
                      step="1"
                      aria-invalid={fieldState.invalid}
                      disabled={!includePrinter || mutation.isPending}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                    />
                    {fieldState.invalid && (
                      <FieldError>{fieldState.error?.message}</FieldError>
                    )}
                  </Field>
                )}
              />
              <Controller
                name="printTimeMinutes"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="print-time-minutes">Minutes</FieldLabel>
                    <Input
                      {...field}
                      id="print-time-minutes"
                      type="number"
                      min="0"
                      max="59"
                      step="1"
                      aria-invalid={fieldState.invalid}
                      disabled={!includePrinter || mutation.isPending}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                    />
                    {fieldState.invalid && (
                      <FieldError>{fieldState.error?.message}</FieldError>
                    )}
                  </Field>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                name="electricityRatePerKwh"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="electricity-rate">
                      Electricity rate (₱/kWh)
                    </FieldLabel>
                    <Input
                      {...field}
                      id="electricity-rate"
                      type="number"
                      min="0"
                      step="any"
                      aria-invalid={fieldState.invalid}
                      disabled={!includePrinter || mutation.isPending}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                    />
                    {fieldState.invalid && (
                      <FieldError>{fieldState.error?.message}</FieldError>
                    )}
                  </Field>
                )}
              />
              <Controller
                name="printerPowerWatts"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="printer-power">Power (W)</FieldLabel>
                    <Input
                      {...field}
                      id="printer-power"
                      type="number"
                      min="0"
                      step="any"
                      aria-invalid={fieldState.invalid}
                      disabled={!includePrinter || mutation.isPending}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                    />
                    {fieldState.invalid && (
                      <FieldError>{fieldState.error?.message}</FieldError>
                    )}
                  </Field>
                )}
              />
              <Controller
                name="printerPrice"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="printer-price">Printer price (₱)</FieldLabel>
                    <Input
                      {...field}
                      id="printer-price"
                      type="number"
                      min="0"
                      step="any"
                      aria-invalid={fieldState.invalid}
                      disabled={!includePrinter || mutation.isPending}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                    />
                    {fieldState.invalid && (
                      <FieldError>{fieldState.error?.message}</FieldError>
                    )}
                  </Field>
                )}
              />
              <Controller
                name="printerLifespanHours"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="printer-lifespan">Lifespan (hours)</FieldLabel>
                    <Input
                      {...field}
                      id="printer-lifespan"
                      type="number"
                      min="0"
                      step="any"
                      aria-invalid={fieldState.invalid}
                      disabled={!includePrinter || mutation.isPending}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                    />
                    {fieldState.invalid && (
                      <FieldError>{fieldState.error?.message}</FieldError>
                    )}
                  </Field>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-4">
            <CardTitle>Labor</CardTitle>
            <CardDescription>Hands-on time for this print.</CardDescription>
            <CardAction>
              <Controller
                name="includeLabor"
                control={form.control}
                render={({ field }) => (
                  <label
                    htmlFor="include-labor-costs"
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    Include
                    <Switch
                      id="include-labor-costs"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={mutation.isPending}
                    />
                  </label>
                )}
              />
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
            <Controller
              name="laborRatePerHour"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="labor-rate">Rate per hour (₱)</FieldLabel>
                  <Input
                    {...field}
                    id="labor-rate"
                    type="number"
                    min="0"
                    step="any"
                    aria-invalid={fieldState.invalid}
                    disabled={!includeLabor || mutation.isPending}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                  />
                  {fieldState.invalid && (
                    <FieldError>{fieldState.error?.message}</FieldError>
                  )}
                </Field>
              )}
            />
            <Controller
              name="laborHours"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="labor-hours">Hours</FieldLabel>
                  <Input
                    {...field}
                    id="labor-hours"
                    type="number"
                    min="0"
                    step="any"
                    aria-invalid={fieldState.invalid}
                    disabled={!includeLabor || mutation.isPending}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                  />
                  {fieldState.invalid && (
                    <FieldError>{fieldState.error?.message}</FieldError>
                  )}
                </Field>
              )}
            />
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-4">
            <CardTitle>Business</CardTitle>
            <CardDescription>Failure buffer and profit markup.</CardDescription>
            <CardAction>
              <Controller
                name="includeBusiness"
                control={form.control}
                render={({ field }) => (
                  <label
                    htmlFor="include-business-costs"
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    Include
                    <Switch
                      id="include-business-costs"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={mutation.isPending}
                    />
                  </label>
                )}
              />
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
            <Controller
              name="failureRatePercent"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="failure-rate">Failure rate (%)</FieldLabel>
                  <Input
                    {...field}
                    id="failure-rate"
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    aria-invalid={fieldState.invalid}
                    disabled={!includeBusiness || mutation.isPending}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                  />
                  {fieldState.invalid && (
                    <FieldError>{fieldState.error?.message}</FieldError>
                  )}
                </Field>
              )}
            />
            <Controller
              name="markupPercent"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="markup-percent">Markup (%)</FieldLabel>
                  <Input
                    {...field}
                    id="markup-percent"
                    type="number"
                    min="0"
                    step="any"
                    aria-invalid={fieldState.invalid}
                    disabled={!includeBusiness || mutation.isPending}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                  />
                  {fieldState.invalid && (
                    <FieldError>{fieldState.error?.message}</FieldError>
                  )}
                </Field>
              )}
            />
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-4">
            <CardTitle>Save price</CardTitle>
            <CardDescription>
              Saved prices become history entries and never change afterwards.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 p-4">
            <Controller
              name="note"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="pricing-note">
                    Note <span className="text-muted-foreground">(optional)</span>
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="pricing-note"
                    placeholder="What changed, what to remember..."
                    aria-invalid={fieldState.invalid}
                    disabled={mutation.isPending}
                  />
                  {fieldState.invalid && (
                    <FieldError>{fieldState.error?.message}</FieldError>
                  )}
                </Field>
              )}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={handleClear}
              >
                <RotateCcwIcon data-icon="inline-start" />
                Clear
              </Button>
              <Button ref={saveButtonRef} type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Spinner data-icon="inline-start" />}
                Save price
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {printerPresetInitial ? (
        <PrinterPresetFormDialog
          open
          initialValues={printerPresetInitial}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setPrinterPresetInitial(null);
          }}
        />
      ) : null}

      {filamentPresetInitial ? (
        <FilamentPresetFormDialog
          open
          initialValues={filamentPresetInitial}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setFilamentPresetInitial(null);
          }}
        />
      ) : null}
    </>
  );
}

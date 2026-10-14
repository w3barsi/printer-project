import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Doc } from "@dg/backend/dataModel";
import { formatPeso } from "@dg/backend/printPricing";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@dg/ui-coss/components/alert-dialog";
import { Button } from "@dg/ui-coss/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
  DialogTrigger,
} from "@dg/ui-coss/components/dialog";
import { Field, FieldError, FieldLabel } from "@dg/ui-coss/components/field";
import { Input } from "@dg/ui-coss/components/input";
import { Skeleton } from "@dg/ui-coss/components/skeleton";
import { Spinner } from "@dg/ui-coss/components/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dg/ui-coss/components/tabs";
import { toastManager } from "@dg/ui-coss/components/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PencilIcon, PlusIcon, SlidersHorizontalIcon, Trash2Icon } from "lucide-react";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

export type PrinterPresetListItem = Doc<"printPricingPrinterPresets"> & {
  createdByName: string;
};

export type FilamentPresetListItem = Doc<"printPricingFilamentPresets"> & {
  createdByName: string;
};

export type PrinterPresetInitialValues = {
  name?: string;
  powerWatts?: number;
  price?: number;
  lifespanHours?: number;
};

export type FilamentPresetInitialValues = {
  name?: string;
  costPerKg?: number;
};

export function PresetManagerDialog() {
  const [open, setOpen] = useState(false);
  const { data: printerPresets, isPending: printerPresetsPending } = useQuery({
    ...convexQuery(api.printPricing.presets.listPrinterPresets, {}),
    enabled: open,
  });
  const { data: filamentPresets, isPending: filamentPresetsPending } = useQuery({
    ...convexQuery(api.printPricing.presets.listFilamentPresets, {}),
    enabled: open,
  });
  const [printerFormState, setPrinterFormState] = useState<{
    preset?: PrinterPresetListItem;
  } | null>(null);
  const [filamentFormState, setFilamentFormState] = useState<{
    preset?: FilamentPresetListItem;
  } | null>(null);
  const [printerToDelete, setPrinterToDelete] = useState<PrinterPresetListItem | null>(
    null,
  );
  const [filamentToDelete, setFilamentToDelete] = useState<FilamentPresetListItem | null>(
    null,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <SlidersHorizontalIcon data-icon="inline-start" />
        Manage presets
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Presets</DialogTitle>
          <DialogDescription>
            Save the printers and filaments you price with so you can reuse them.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <Tabs defaultValue="printers" className="flex-col">
            <TabsList variant="underline">
              <TabsTrigger value="printers">Printers</TabsTrigger>
              <TabsTrigger value="filaments">Filaments</TabsTrigger>
            </TabsList>

            <TabsContent value="printers" className="pt-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Printer presets</p>
                    <p className="text-xs text-muted-foreground">
                      Power, price, and lifespan for your machines.
                    </p>
                  </div>
                  <Button type="button" size="sm" onClick={() => setPrinterFormState({})}>
                    <PlusIcon data-icon="inline-start" />
                    Create preset
                  </Button>
                </div>
                <div className="overflow-hidden rounded-lg border">
                  <div className="border-b bg-muted/40 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Printers
                  </div>
                  {printerPresetsPending ? (
                    <div className="flex flex-col gap-3 p-4">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : printerPresets?.length ? (
                    <div className="divide-y">
                      {printerPresets.map((preset) => (
                        <div
                          key={preset._id}
                          className="flex items-center justify-between gap-3 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{preset.name}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {preset.powerWatts.toLocaleString()} W ·{" "}
                              {formatPeso(preset.price)} ·{" "}
                              {preset.lifespanHours.toLocaleString()} h lifespan ·{" "}
                              {`used ${preset.useCount.toLocaleString()} ${
                                preset.useCount === 1 ? "time" : "times"
                              }`}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setPrinterFormState({ preset })}
                            >
                              <PencilIcon />
                              <span className="sr-only">Edit {preset.name}</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setPrinterToDelete(preset)}
                            >
                              <Trash2Icon />
                              <span className="sr-only">Delete {preset.name}</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="p-6 text-center text-sm text-muted-foreground">
                      No printer presets yet. Create the first one above.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="filaments" className="pt-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Filament presets</p>
                    <p className="text-xs text-muted-foreground">
                      Cost per kilogram for your spools.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setFilamentFormState({})}
                  >
                    <PlusIcon data-icon="inline-start" />
                    Create preset
                  </Button>
                </div>
                <div className="overflow-hidden rounded-lg border">
                  <div className="border-b bg-muted/40 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Filaments
                  </div>
                  {filamentPresetsPending ? (
                    <div className="flex flex-col gap-3 p-4">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : filamentPresets?.length ? (
                    <div className="divide-y">
                      {filamentPresets.map((preset) => (
                        <div
                          key={preset._id}
                          className="flex items-center justify-between gap-3 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{preset.name}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {formatPeso(preset.costPerKg)} per kg
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setFilamentFormState({ preset })}
                            >
                              <PencilIcon />
                              <span className="sr-only">Edit {preset.name}</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setFilamentToDelete(preset)}
                            >
                              <Trash2Icon />
                              <span className="sr-only">Delete {preset.name}</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="p-6 text-center text-sm text-muted-foreground">
                      No filament presets yet. Create the first one above.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogPanel>
      </DialogContent>

      {printerFormState ? (
        <PrinterPresetFormDialog
          preset={printerFormState.preset}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setPrinterFormState(null);
          }}
        />
      ) : null}

      {filamentFormState ? (
        <FilamentPresetFormDialog
          preset={filamentFormState.preset}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setFilamentFormState(null);
          }}
        />
      ) : null}

      {printerToDelete ? (
        <DeletePrinterPresetDialog
          preset={printerToDelete}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setPrinterToDelete(null);
          }}
        />
      ) : null}

      {filamentToDelete ? (
        <DeleteFilamentPresetDialog
          preset={filamentToDelete}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setFilamentToDelete(null);
          }}
        />
      ) : null}
    </Dialog>
  );
}

const printerPresetSchema = z.object({
  name: z.string().trim().min(1, "Preset name is required").max(120),
  powerWatts: z.number().positive("Power must be greater than 0"),
  price: z.number().nonnegative("Price cannot be negative"),
  lifespanHours: z.number().positive("Lifespan must be greater than 0"),
});

type PrinterPresetFormData = z.infer<typeof printerPresetSchema>;

export function PrinterPresetFormDialog({
  preset,
  initialValues,
  open,
  onOpenChange,
}: {
  preset?: PrinterPresetListItem;
  initialValues?: PrinterPresetInitialValues;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fieldId = useId();
  const defaultValues: PrinterPresetFormData = {
    name: preset?.name ?? initialValues?.name ?? "",
    powerWatts: preset?.powerWatts ?? initialValues?.powerWatts ?? 0,
    price: preset?.price ?? initialValues?.price ?? 0,
    lifespanHours: preset?.lifespanHours ?? initialValues?.lifespanHours ?? 0,
  };
  const form = useForm<PrinterPresetFormData>({
    resolver: zodResolver(printerPresetSchema),
    defaultValues,
  });
  const createPrinterPreset = useConvexMutation(
    api.printPricing.presets.createPrinterPreset,
  );
  const updatePrinterPreset = useConvexMutation(
    api.printPricing.presets.updatePrinterPreset,
  );
  const mutation = useMutation({
    mutationFn: async (values: PrinterPresetFormData) => {
      if (preset) {
        return await updatePrinterPreset({ presetId: preset._id, ...values });
      }

      return await createPrinterPreset(values);
    },
    onSuccess: () => {
      toastManager.add({
        title: preset ? "Printer preset updated" : "Printer preset created",
        type: "success",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toastManager.add({
        title: error.message || "Could not save printer preset",
        type: "error",
      });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !mutation.isPending) form.reset(defaultValues);
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {preset ? "Edit printer preset" : "Create printer preset"}
          </DialogTitle>
          <DialogDescription>
            A printer preset fills in power, price, and lifespan while pricing.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          className="flex flex-col gap-6"
        >
          <DialogPanel>
            <div className="flex w-full flex-col gap-7">
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${fieldId}-printer-name`}>
                      Preset name
                    </FieldLabel>
                    <Input
                      {...field}
                      id={`${fieldId}-printer-name`}
                      placeholder="e.g. Bambu Lab X1C"
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
                name="powerWatts"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${fieldId}-printer-power`}>
                      Power (W)
                    </FieldLabel>
                    <Input
                      {...field}
                      id={`${fieldId}-printer-power`}
                      type="number"
                      min="0"
                      step="any"
                      aria-invalid={fieldState.invalid}
                      disabled={mutation.isPending}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                    />
                    {fieldState.invalid && (
                      <FieldError>{fieldState.error?.message}</FieldError>
                    )}
                  </Field>
                )}
              />
              <Controller
                name="price"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${fieldId}-printer-price`}>
                      Printer price (₱)
                    </FieldLabel>
                    <Input
                      {...field}
                      id={`${fieldId}-printer-price`}
                      type="number"
                      min="0"
                      step="any"
                      aria-invalid={fieldState.invalid}
                      disabled={mutation.isPending}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                    />
                    {fieldState.invalid && (
                      <FieldError>{fieldState.error?.message}</FieldError>
                    )}
                  </Field>
                )}
              />
              <Controller
                name="lifespanHours"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${fieldId}-printer-lifespan`}>
                      Lifespan (hours)
                    </FieldLabel>
                    <Input
                      {...field}
                      id={`${fieldId}-printer-lifespan`}
                      type="number"
                      min="0"
                      step="any"
                      aria-invalid={fieldState.invalid}
                      disabled={mutation.isPending}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                    />
                    {fieldState.invalid && (
                      <FieldError>{fieldState.error?.message}</FieldError>
                    )}
                  </Field>
                )}
              />
            </div>
          </DialogPanel>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner data-icon="inline-start" />}
              {preset ? "Save changes" : "Create preset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const filamentPresetSchema = z.object({
  name: z.string().trim().min(1, "Preset name is required").max(120),
  costPerKg: z.number().nonnegative("Cost per kg cannot be negative"),
});

type FilamentPresetFormData = z.infer<typeof filamentPresetSchema>;

export function FilamentPresetFormDialog({
  preset,
  initialValues,
  open,
  onOpenChange,
}: {
  preset?: FilamentPresetListItem;
  initialValues?: FilamentPresetInitialValues;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fieldId = useId();
  const defaultValues: FilamentPresetFormData = {
    name: preset?.name ?? initialValues?.name ?? "",
    costPerKg: preset?.costPerKg ?? initialValues?.costPerKg ?? 0,
  };
  const form = useForm<FilamentPresetFormData>({
    resolver: zodResolver(filamentPresetSchema),
    defaultValues,
  });
  const createFilamentPreset = useConvexMutation(
    api.printPricing.presets.createFilamentPreset,
  );
  const updateFilamentPreset = useConvexMutation(
    api.printPricing.presets.updateFilamentPreset,
  );
  const mutation = useMutation({
    mutationFn: async (values: FilamentPresetFormData) => {
      if (preset) {
        return await updateFilamentPreset({ presetId: preset._id, ...values });
      }

      return await createFilamentPreset(values);
    },
    onSuccess: () => {
      toastManager.add({
        title: preset ? "Filament preset updated" : "Filament preset created",
        type: "success",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toastManager.add({
        title: error.message || "Could not save filament preset",
        type: "error",
      });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !mutation.isPending) form.reset(defaultValues);
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {preset ? "Edit filament preset" : "Create filament preset"}
          </DialogTitle>
          <DialogDescription>
            A filament preset fills in the cost per kilogram while pricing.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          className="flex flex-col gap-6"
        >
          <DialogPanel>
            <div className="flex w-full flex-col gap-7">
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${fieldId}-filament-name`}>
                      Preset name
                    </FieldLabel>
                    <Input
                      {...field}
                      id={`${fieldId}-filament-name`}
                      placeholder="e.g. Bambu PLA Basic"
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
                name="costPerKg"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${fieldId}-filament-cost`}>
                      Cost per kg (₱)
                    </FieldLabel>
                    <Input
                      {...field}
                      id={`${fieldId}-filament-cost`}
                      type="number"
                      min="0"
                      step="any"
                      aria-invalid={fieldState.invalid}
                      disabled={mutation.isPending}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                    />
                    {fieldState.invalid && (
                      <FieldError>{fieldState.error?.message}</FieldError>
                    )}
                  </Field>
                )}
              />
            </div>
          </DialogPanel>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner data-icon="inline-start" />}
              {preset ? "Save changes" : "Create preset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeletePrinterPresetDialog({
  preset,
  open,
  onOpenChange,
}: {
  preset: PrinterPresetListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useMutation({
    mutationFn: useConvexMutation(api.printPricing.presets.deletePrinterPreset),
    onSuccess: () => {
      toastManager.add({
        title: `Printer preset "${preset.name}" deleted`,
        type: "success",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toastManager.add({
        title: error.message || "Could not delete printer preset",
        type: "error",
      });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{preset.name}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            Saved calculations keep the values they were priced with, so past prices are
            unaffected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose
            disabled={mutation.isPending}
            render={<Button variant="outline" />}
          >
            Cancel
          </AlertDialogClose>
          <AlertDialogClose
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ presetId: preset._id })}
            render={<Button variant="destructive" />}
          >
            {mutation.isPending && <Spinner data-icon="inline-start" />}
            Delete preset
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteFilamentPresetDialog({
  preset,
  open,
  onOpenChange,
}: {
  preset: FilamentPresetListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useMutation({
    mutationFn: useConvexMutation(api.printPricing.presets.deleteFilamentPreset),
    onSuccess: () => {
      toastManager.add({
        title: `Filament preset "${preset.name}" deleted`,
        type: "success",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toastManager.add({
        title: error.message || "Could not delete filament preset",
        type: "error",
      });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{preset.name}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            Saved calculations keep the values they were priced with, so past prices are
            unaffected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose
            disabled={mutation.isPending}
            render={<Button variant="outline" />}
          >
            Cancel
          </AlertDialogClose>
          <AlertDialogClose
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ presetId: preset._id })}
            render={<Button variant="destructive" />}
          >
            {mutation.isPending && <Spinner data-icon="inline-start" />}
            Delete preset
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

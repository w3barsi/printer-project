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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@dg/ui-coss/components/field";
import { Input } from "@dg/ui-coss/components/input";
import { Skeleton } from "@dg/ui-coss/components/skeleton";
import { Spinner } from "@dg/ui-coss/components/spinner";
import { toastManager } from "@dg/ui-coss/components/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ExternalLinkIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

export type AccessoryListItem = Doc<"printPricingAccessories"> & {
  createdByName: string;
};

export type AccessoryInitialValues = {
  name?: string;
  price?: number;
  storeUrl?: string;
};

export function isValidStoreUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return false;
  }

  try {
    const url = new URL(trimmedValue);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function AccessoryManagerDialog() {
  const [open, setOpen] = useState(false);
  const { data: accessories, isPending } = useQuery({
    ...convexQuery(api.printPricing.accessories.listAccessories, {}),
    enabled: open,
  });
  const [formState, setFormState] = useState<{
    accessory?: AccessoryListItem;
  } | null>(null);
  const [accessoryToDelete, setAccessoryToDelete] = useState<AccessoryListItem | null>(
    null,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <PackageIcon data-icon="inline-start" />
        Manage accessories
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Accessories</DialogTitle>
          <DialogDescription>
            Save the extra parts you buy for prints, with a link for restocking.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Accessory catalog</p>
                <p className="text-xs text-muted-foreground">
                  Pick these in the calculator to add their cost.
                </p>
              </div>
              <Button type="button" size="sm" onClick={() => setFormState({})}>
                <PlusIcon data-icon="inline-start" />
                Add accessory
              </Button>
            </div>
            <div className="overflow-hidden rounded-lg border">
              <div className="border-b bg-muted/40 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Accessories
              </div>
              {isPending ? (
                <div className="flex flex-col gap-3 p-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : accessories?.length ? (
                <div className="divide-y">
                  {accessories.map((accessory) => (
                    <div
                      key={accessory._id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{accessory.name}</p>
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <span className="tabular-nums">
                            {formatPeso(accessory.price)}
                          </span>
                          {accessory.storeUrl ? (
                            <>
                              <span aria-hidden>·</span>
                              <a
                                href={accessory.storeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-w-0 items-center gap-1 underline underline-offset-4 hover:text-foreground"
                              >
                                <span className="max-w-64 truncate">
                                  {accessory.storeUrl}
                                </span>
                                <ExternalLinkIcon className="size-3 shrink-0" />
                              </a>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setFormState({ accessory })}
                        >
                          <PencilIcon />
                          <span className="sr-only">Edit {accessory.name}</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setAccessoryToDelete(accessory)}
                        >
                          <Trash2Icon />
                          <span className="sr-only">Delete {accessory.name}</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No accessories yet. Save the first one above.
                </p>
              )}
            </div>
          </div>
        </DialogPanel>
      </DialogContent>

      {formState ? (
        <AccessoryFormDialog
          accessory={formState.accessory}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setFormState(null);
          }}
        />
      ) : null}

      {accessoryToDelete ? (
        <DeleteAccessoryDialog
          accessory={accessoryToDelete}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setAccessoryToDelete(null);
          }}
        />
      ) : null}
    </Dialog>
  );
}

const accessorySchema = z.object({
  name: z.string().trim().min(1, "Accessory name is required").max(120),
  price: z.number().nonnegative("Price cannot be negative"),
  storeUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .refine(
      (value) => !value || isValidStoreUrl(value),
      "Enter a valid link starting with http:// or https://",
    ),
});

type AccessoryFormData = z.infer<typeof accessorySchema>;

export function AccessoryFormDialog({
  accessory,
  initialValues,
  open,
  onOpenChange,
}: {
  accessory?: AccessoryListItem;
  initialValues?: AccessoryInitialValues;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fieldId = useId();
  const defaultValues: AccessoryFormData = {
    name: accessory?.name ?? initialValues?.name ?? "",
    price: accessory?.price ?? initialValues?.price ?? 0,
    storeUrl: accessory?.storeUrl ?? initialValues?.storeUrl ?? "",
  };
  const form = useForm<AccessoryFormData>({
    resolver: zodResolver(accessorySchema),
    defaultValues,
  });
  const createAccessory = useConvexMutation(api.printPricing.accessories.createAccessory);
  const updateAccessory = useConvexMutation(api.printPricing.accessories.updateAccessory);
  const mutation = useMutation({
    mutationFn: async (values: AccessoryFormData) => {
      const storeUrl = values.storeUrl?.trim() || undefined;

      if (accessory) {
        return await updateAccessory({
          accessoryId: accessory._id,
          name: values.name,
          price: values.price,
          storeUrl,
        });
      }

      return await createAccessory({
        name: values.name,
        price: values.price,
        storeUrl,
      });
    },
    onSuccess: () => {
      toastManager.add({
        title: accessory ? "Accessory updated" : "Accessory saved",
        type: "success",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toastManager.add({
        title: error.message || "Could not save accessory",
        type: "error",
      });
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    if (
      accessory &&
      values.name === accessory.name &&
      values.price === accessory.price &&
      (values.storeUrl ?? "") === (accessory.storeUrl ?? "")
    ) {
      toastManager.add({
        title: "No values were changed",
        type: "warning",
      });
      return;
    }

    mutation.mutate(values);
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
          <DialogTitle>{accessory ? "Edit accessory" : "Save accessory"}</DialogTitle>
          <DialogDescription>
            Keep the price and store link handy so restocking is quick.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <DialogPanel>
            <div className="flex w-full flex-col gap-7">
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${fieldId}-accessory-name`}>
                      Accessory name
                    </FieldLabel>
                    <Input
                      {...field}
                      id={`${fieldId}-accessory-name`}
                      placeholder="e.g. M3 heat inserts"
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
                name="price"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${fieldId}-accessory-price`}>
                      Price (₱)
                    </FieldLabel>
                    <Input
                      {...field}
                      id={`${fieldId}-accessory-price`}
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
                name="storeUrl"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${fieldId}-accessory-store`}>
                      Store link <span className="text-muted-foreground">(optional)</span>
                    </FieldLabel>
                    <Input
                      {...field}
                      id={`${fieldId}-accessory-store`}
                      type="text"
                      inputMode="url"
                      placeholder="https://..."
                      aria-invalid={fieldState.invalid}
                      disabled={mutation.isPending}
                    />
                    <FieldDescription>
                      Optional link to where you buy it when you need to restock.
                    </FieldDescription>
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
              {accessory ? "Save changes" : "Save accessory"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAccessoryDialog({
  accessory,
  open,
  onOpenChange,
}: {
  accessory: AccessoryListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useMutation({
    mutationFn: useConvexMutation(api.printPricing.accessories.deleteAccessory),
    onSuccess: () => {
      toastManager.add({
        title: `Accessory "${accessory.name}" deleted`,
        type: "success",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toastManager.add({
        title: error.message || "Could not delete accessory",
        type: "error",
      });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{accessory.name}&quot;?</AlertDialogTitle>
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
            onClick={() => mutation.mutate({ accessoryId: accessory._id })}
            render={<Button variant="destructive" />}
          >
            {mutation.isPending && <Spinner data-icon="inline-start" />}
            Delete accessory
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

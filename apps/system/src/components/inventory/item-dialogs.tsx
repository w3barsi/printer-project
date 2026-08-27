import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Doc, Id } from "@dg/backend/dataModel";
import { Badge } from "@dg/ui/components/badge";
import { Button } from "@dg/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@dg/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@dg/ui/components/dropdown-menu";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@dg/ui/components/field";
import { Input } from "@dg/ui/components/input";
import { Spinner } from "@dg/ui/components/spinner";
import { Textarea } from "@dg/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  MoreHorizontalIcon,
  MinusIcon,
  PackagePlusIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useId, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { z } from "zod";

import {
  JobOrderCombobox,
  type JobOrderOption,
} from "@/components/inventory/job-order-combobox";
import { SupplierCombobox } from "@/components/inventory/supplier-combobox";

export type InventoryListItem = Doc<"inventoryItems"> & {
  supplierName: string;
  createdByName: string;
};

const addItemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required").max(120),
  supplierId: z.string(),
  initialQuantity: z
    .number()
    .int("Quantity must be a whole number")
    .nonnegative("Quantity cannot be negative"),
  reason: z.string().max(500).optional(),
});

type AddItemFormData = z.infer<typeof addItemSchema>;

export function AddInventoryItemDialog() {
  const [open, setOpen] = useState(false);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const form = useForm<AddItemFormData>({
    resolver: zodResolver(addItemSchema),
    defaultValues: {
      name: "",
      supplierId: "",
      initialQuantity: 0,
      reason: "",
    },
  });
  const mutation = useMutation({
    mutationFn: useConvexMutation(api.inventory.createItem),
    onSuccess: () => {
      toast.success("Inventory item created");
      form.reset();
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Could not create inventory item");
    },
  });
  useHotkeys(
    "ctrl+enter",
    () => createButtonRef.current?.click(),
    {
      enabled: open && !mutation.isPending,
      enableOnFormTags: true,
      enableOnContentEditable: true,
      ignoreEventWhen: (event) => event.repeat,
      preventDefault: true,
    },
    [open, mutation.isPending],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen && !mutation.isPending) form.reset();
      }}
    >
      <DialogTrigger render={<Button type="button" />}>
        <PlusIcon data-icon="inline-start" />
        Add item
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add inventory item</DialogTitle>
          <DialogDescription>
            Create an item and set its opening stock balance.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) =>
            mutation.mutate({
              ...values,
              supplierId: values.supplierId
                ? (values.supplierId as Id<"inventorySuppliers">)
                : undefined,
              reason: values.reason || undefined,
            }),
          )}
          className="flex flex-col gap-6"
        >
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="inventory-item-name">Item name</FieldLabel>
                  <Input
                    {...field}
                    id="inventory-item-name"
                    placeholder="e.g. Matte A4 paper"
                    aria-invalid={fieldState.invalid}
                    disabled={mutation.isPending}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="supplierId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="inventory-item-supplier">
                    Supplier (optional)
                  </FieldLabel>
                  <SupplierCombobox
                    id="inventory-item-supplier"
                    value={field.value ? (field.value as Id<"inventorySuppliers">) : null}
                    onValueChange={field.onChange}
                    disabled={mutation.isPending}
                    invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="initialQuantity"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="inventory-initial-quantity">
                    Initial quantity
                  </FieldLabel>
                  <Input
                    {...field}
                    id="inventory-initial-quantity"
                    type="number"
                    min="0"
                    step="1"
                    aria-invalid={fieldState.invalid}
                    disabled={mutation.isPending}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                  />
                  <FieldDescription>Defaults to zero.</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="reason"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="inventory-create-reason">
                    Reason <span className="text-muted-foreground">(optional)</span>
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="inventory-create-reason"
                    placeholder="Opening delivery, initial count..."
                    aria-invalid={fieldState.invalid}
                    disabled={mutation.isPending}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter>
            <Button ref={createButtonRef} type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner data-icon="inline-start" />}
              Create Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type ItemAction = "add" | "remove" | "correct" | "edit";

export function InventoryItemActions({ item }: { item: InventoryListItem }) {
  const [action, setAction] = useState<ItemAction | null>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" variant="ghost" size="icon-sm" />}
        >
          <MoreHorizontalIcon />
          <span className="sr-only">Actions for {item.name}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setAction("add")}>
              <PackagePlusIcon />
              Add stock
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAction("remove")}>
              <MinusIcon />
              Use stock
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAction("correct")}>
              <RefreshCwIcon />
              Update stock
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAction("edit")}>
              <PencilIcon />
              Edit details
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {action === "edit" ? (
        <EditItemDetailsDialog
          item={item}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setAction(null);
          }}
        />
      ) : action ? (
        <StockAdjustmentDialog
          item={item}
          mode={action}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setAction(null);
          }}
        />
      ) : null}
    </>
  );
}

export function InventoryStockActions({ item }: { item: InventoryListItem }) {
  const [action, setAction] = useState<ItemAction | null>(null);

  return (
    <>
      <div className="flex flex-col gap-2">
        <Button type="button" variant="destructive" onClick={() => setAction("remove")}>
          <MinusIcon data-icon="inline-start" />
          Use Stock
        </Button>
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAction("add")}
          >
            <PackagePlusIcon data-icon="inline-start" />
            Add
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAction("correct")}
          >
            <RefreshCwIcon data-icon="inline-start" />
            Update
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAction("edit")}
          >
            <PencilIcon data-icon="inline-start" />
            Edit
          </Button>
        </div>
      </div>

      {action === "edit" ? (
        <EditItemDetailsDialog
          item={item}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setAction(null);
          }}
        />
      ) : action ? (
        <StockAdjustmentDialog
          item={item}
          mode={action}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setAction(null);
          }}
        />
      ) : null}
    </>
  );
}

const stockAdjustmentSchema = z.object({
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .nonnegative("Quantity cannot be negative"),
  reason: z.string().max(500),
  jobOrderId: z.string(),
});

type StockAdjustmentFormData = z.infer<typeof stockAdjustmentSchema>;
type StockMode = Exclude<ItemAction, "edit">;

const stockDialogCopy: Record<
  StockMode,
  { title: string; description: string; quantityLabel: string; submit: string }
> = {
  add: {
    title: "Add stock",
    description: "Record stock received for this item.",
    quantityLabel: "Quantity received",
    submit: "Add stock",
  },
  remove: {
    title: "Use stock",
    description: "Record stock used for a Job Order or another purpose.",
    quantityLabel: "Quantity used",
    submit: "Use stock",
  },
  correct: {
    title: "Correct stock count",
    description: "Replace the current balance with a verified physical count.",
    quantityLabel: "Corrected quantity",
    submit: "Save correction",
  },
};

function StockAdjustmentDialog({
  item,
  mode,
  open,
  onOpenChange,
}: {
  item: InventoryListItem;
  mode: StockMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fieldId = useId();
  const [selectedJobOrder, setSelectedJobOrder] = useState<JobOrderOption | null>(null);
  const copy = stockDialogCopy[mode];
  const form = useForm<StockAdjustmentFormData>({
    resolver: zodResolver(
      stockAdjustmentSchema.superRefine((values, context) => {
        if (mode !== "correct" && values.quantity < 1) {
          context.addIssue({
            code: "custom",
            path: ["quantity"],
            message: "Quantity must be at least 1",
          });
        }
        if (mode === "correct" && !values.reason.trim()) {
          context.addIssue({
            code: "custom",
            path: ["reason"],
            message: "Reason is required",
          });
        }
        if (mode === "remove" && values.quantity > item.quantity) {
          context.addIssue({
            code: "custom",
            path: ["quantity"],
            message: "Cannot use more than the current balance",
          });
        }
      }),
    ),
    defaultValues: {
      quantity: mode === "correct" ? item.quantity : 1,
      reason: "",
      jobOrderId: "",
    },
  });
  const quantity = useWatch({
    control: form.control,
    name: "quantity",
  });
  const addStock = useConvexMutation(api.inventory.addStock);
  const removeStock = useConvexMutation(api.inventory.removeStock);
  const correctQuantity = useConvexMutation(api.inventory.correctQuantity);
  const mutation = useMutation({
    mutationFn: async (values: StockAdjustmentFormData) => {
      if (mode === "add") {
        return await addStock({
          inventoryItemId: item._id,
          quantity: values.quantity,
          reason: values.reason.trim() || undefined,
        });
      }

      if (mode === "remove") {
        return await removeStock({
          inventoryItemId: item._id,
          quantity: values.quantity,
          reason: values.reason.trim() || undefined,
          jobOrderId: values.jobOrderId ? (values.jobOrderId as Id<"jo">) : undefined,
        });
      }

      return await correctQuantity({
        inventoryItemId: item._id,
        quantity: values.quantity,
        reason: values.reason,
      });
    },
    onSuccess: () => {
      toast.success(
        mode === "add"
          ? "Stock added"
          : mode === "remove"
            ? "Stock used"
            : "Stock count corrected",
      );
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Could not update stock");
    },
  });
  const projectedQuantity =
    mode === "add"
      ? item.quantity + (quantity || 0)
      : mode === "remove"
        ? item.quantity - (quantity || 0)
        : quantity;

  function onSubmit(values: StockAdjustmentFormData) {
    mutation.mutate(values);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !mutation.isPending) {
          form.reset();
          setSelectedJobOrder(null);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.supplierName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Current balance</p>
            <Badge variant="secondary" className="tabular-nums">
              {item.quantity.toLocaleString()}
            </Badge>
          </div>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <FieldGroup>
            <Controller
              name="quantity"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${fieldId}-quantity`}>
                    {copy.quantityLabel}
                  </FieldLabel>
                  <Input
                    {...field}
                    id={`${fieldId}-quantity`}
                    type="number"
                    min="0"
                    step="1"
                    aria-invalid={fieldState.invalid}
                    disabled={mutation.isPending}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                  />
                  <FieldDescription>
                    Resulting balance:{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {Number.isFinite(projectedQuantity)
                        ? projectedQuantity.toLocaleString()
                        : "—"}
                    </span>
                  </FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            {mode === "remove" && (
              <Controller
                name="jobOrderId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${fieldId}-job-order`}>
                      Used for Job Order (optional)
                    </FieldLabel>
                    <JobOrderCombobox
                      id={`${fieldId}-job-order`}
                      value={field.value ? (field.value as Id<"jo">) : null}
                      onValueChange={(jobOrderId) => field.onChange(jobOrderId ?? "")}
                      onOptionChange={setSelectedJobOrder}
                      disabled={mutation.isPending}
                      invalid={fieldState.invalid}
                    />
                    <FieldDescription>
                      Leave blank for damage, disposal, or general use.
                    </FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            )}
            <Controller
              name="reason"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${fieldId}-reason`}>
                    Reason
                    {mode !== "correct" && (
                      <span className="text-muted-foreground">(optional)</span>
                    )}
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id={`${fieldId}-reason`}
                    placeholder={
                      mode === "add"
                        ? "Delivery, returned materials..."
                        : mode === "remove"
                          ? "Usage, damage, disposal..."
                          : "Required for the activity log"
                    }
                    aria-invalid={fieldState.invalid}
                    disabled={mutation.isPending}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          {mode === "remove" && quantity > 0 && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
              You are using{" "}
              <strong className="tabular-nums">{quantity.toLocaleString()}</strong> from{" "}
              {item.name}
              {selectedJobOrder?.joNumber ? ` for JO #${selectedJobOrder.joNumber}` : ""}.
            </p>
          )}
          <DialogFooter>
            <Button
              type="submit"
              variant={mode === "remove" ? "destructive" : "default"}
              disabled={mutation.isPending}
            >
              {mutation.isPending && <Spinner data-icon="inline-start" />}
              {copy.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const editItemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required").max(120),
  supplierId: z.string(),
  reason: z.string().trim().min(1, "Reason is required").max(500),
});

type EditItemFormData = z.infer<typeof editItemSchema>;

function EditItemDetailsDialog({
  item,
  open,
  onOpenChange,
}: {
  item: InventoryListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fieldId = useId();
  const form = useForm<EditItemFormData>({
    resolver: zodResolver(editItemSchema),
    defaultValues: {
      name: item.name,
      supplierId: item.supplierId ?? "",
      reason: "",
    },
  });
  const mutation = useMutation({
    mutationFn: useConvexMutation(api.inventory.updateItemDetails),
    onSuccess: () => {
      toast.success("Item details updated");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Could not update item details");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit item details</DialogTitle>
          <DialogDescription>
            Changes to the item name or supplier are recorded in the activity log.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) =>
            mutation.mutate({
              inventoryItemId: item._id,
              name: values.name,
              supplierId: values.supplierId
                ? (values.supplierId as Id<"inventorySuppliers">)
                : undefined,
              reason: values.reason,
            }),
          )}
          className="flex flex-col gap-6"
        >
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${fieldId}-name`}>Item name</FieldLabel>
                  <Input
                    {...field}
                    id={`${fieldId}-name`}
                    aria-invalid={fieldState.invalid}
                    disabled={mutation.isPending}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="supplierId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${fieldId}-supplier`}>
                    Supplier (optional)
                  </FieldLabel>
                  <SupplierCombobox
                    id={`${fieldId}-supplier`}
                    value={field.value ? (field.value as Id<"inventorySuppliers">) : null}
                    initialLabel={item.supplierId ? item.supplierName : undefined}
                    onValueChange={field.onChange}
                    disabled={mutation.isPending}
                    invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="reason"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${fieldId}-edit-reason`}>Reason</FieldLabel>
                  <Textarea
                    {...field}
                    id={`${fieldId}-edit-reason`}
                    placeholder="Why are these details changing?"
                    aria-invalid={fieldState.invalid}
                    disabled={mutation.isPending}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner data-icon="inline-start" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

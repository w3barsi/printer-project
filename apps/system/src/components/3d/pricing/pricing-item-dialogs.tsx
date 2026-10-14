import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Doc } from "@dg/backend/dataModel";
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
import {
  Menu,
  MenuGroup,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@dg/ui-coss/components/menu";
import { Spinner } from "@dg/ui-coss/components/spinner";
import { Textarea } from "@dg/ui-coss/components/textarea";
import { toastManager } from "@dg/ui-coss/components/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useHotkeys } from "react-hotkeys-hook";
import { z } from "zod";

export type PricingListItem = Doc<"printPricingItems"> & {
  createdByName: string;
};

const pricingItemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required").max(120),
  notes: z.string().max(500).optional(),
});

type PricingItemFormData = z.infer<typeof pricingItemSchema>;

export function CreatePricingItemDialog() {
  const [open, setOpen] = useState(false);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const form = useForm<PricingItemFormData>({
    resolver: zodResolver(pricingItemSchema),
    defaultValues: {
      name: "",
      notes: "",
    },
  });
  const mutation = useMutation({
    mutationFn: useConvexMutation(api.printPricing.items.createItem),
    onSuccess: () => {
      toastManager.add({ title: "Pricing item created", type: "success" });
      form.reset();
      setOpen(false);
    },
    onError: (error) => {
      toastManager.add({
        title: error.message || "Could not create pricing item",
        type: "error",
      });
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
          <DialogTitle>Add pricing item</DialogTitle>
          <DialogDescription>
            Create an item to price a print and keep its price history.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) =>
            mutation.mutate({
              name: values.name,
              notes: values.notes?.trim() || undefined,
            }),
          )}
          className="flex flex-col gap-6"
        >
          <DialogPanel>
            <div className="flex w-full flex-col gap-7">
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="pricing-item-name">Item name</FieldLabel>
                    <Input
                      {...field}
                      id="pricing-item-name"
                      placeholder="e.g. Hex planter v2"
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
                name="notes"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="pricing-item-notes">
                      Notes <span className="text-muted-foreground">(optional)</span>
                    </FieldLabel>
                    <Textarea
                      {...field}
                      id="pricing-item-notes"
                      placeholder="Print settings, finishing, special requirements..."
                      aria-invalid={fieldState.invalid}
                      disabled={mutation.isPending}
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
            <Button ref={createButtonRef} type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner data-icon="inline-start" />}
              Create item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditPricingItemDialog({
  item,
  open,
  onOpenChange,
}: {
  item: PricingListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fieldId = useId();
  const form = useForm<PricingItemFormData>({
    resolver: zodResolver(pricingItemSchema),
    defaultValues: {
      name: item.name,
      notes: item.notes ?? "",
    },
  });
  const mutation = useMutation({
    mutationFn: useConvexMutation(api.printPricing.items.updateItem),
    onSuccess: () => {
      toastManager.add({ title: "Item details updated", type: "success" });
      onOpenChange(false);
    },
    onError: (error) => {
      toastManager.add({
        title: error.message || "Could not update item",
        type: "error",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit item details</DialogTitle>
          <DialogDescription>
            Renaming an item keeps its saved pricing history.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) =>
            mutation.mutate({
              itemId: item._id,
              name: values.name,
              notes: values.notes?.trim() || undefined,
            }),
          )}
          className="flex flex-col gap-6"
        >
          <DialogPanel>
            <div className="flex w-full flex-col gap-7">
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
                    {fieldState.invalid && (
                      <FieldError>{fieldState.error?.message}</FieldError>
                    )}
                  </Field>
                )}
              />
              <Controller
                name="notes"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${fieldId}-notes`}>
                      Notes <span className="text-muted-foreground">(optional)</span>
                    </FieldLabel>
                    <Textarea
                      {...field}
                      id={`${fieldId}-notes`}
                      placeholder="Print settings, finishing, special requirements..."
                      aria-invalid={fieldState.invalid}
                      disabled={mutation.isPending}
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
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeletePricingItemDialog({
  item,
  open,
  onOpenChange,
  onDeleted,
}: {
  item: PricingListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const mutation = useMutation({
    mutationFn: useConvexMutation(api.printPricing.items.deleteItem),
    onSuccess: () => {
      toastManager.add({ title: `"${item.name}" deleted`, type: "success" });
      onDeleted?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toastManager.add({
        title: error.message || "Could not delete item",
        type: "error",
      });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{item.name}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the item and its entire saved pricing history. This
            cannot be undone.
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
            onClick={() => mutation.mutate({ itemId: item._id })}
            render={<Button variant="destructive" />}
          >
            {mutation.isPending && <Spinner data-icon="inline-start" />}
            Delete item
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type PricingItemAction = "edit" | "delete";

export function PricingItemActions({ item }: { item: PricingListItem }) {
  const [action, setAction] = useState<PricingItemAction | null>(null);

  return (
    <>
      <Menu>
        <MenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" />}>
          <MoreHorizontalIcon />
          <span className="sr-only">Actions for {item.name}</span>
        </MenuTrigger>
        <MenuPopup align="end" className="w-40">
          <MenuGroup>
            <MenuItem onClick={() => setAction("edit")}>
              <PencilIcon />
              Edit details
            </MenuItem>
            <MenuItem variant="destructive" onClick={() => setAction("delete")}>
              <Trash2Icon />
              Delete
            </MenuItem>
          </MenuGroup>
        </MenuPopup>
      </Menu>

      {action === "edit" ? (
        <EditPricingItemDialog
          item={item}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setAction(null);
          }}
        />
      ) : action === "delete" ? (
        <DeletePricingItemDialog
          item={item}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setAction(null);
          }}
        />
      ) : null}
    </>
  );
}

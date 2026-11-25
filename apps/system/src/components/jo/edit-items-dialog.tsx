import { api } from "@dg/backend/api";
import type { Id } from "@dg/backend/dataModel";
import { Button } from "@dg/ui-coss/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from "@dg/ui-coss/components/dialog";
import { Field, FieldError, FieldLabel } from "@dg/ui-coss/components/field";
import { Input } from "@dg/ui-coss/components/input";
import { toastManager } from "@dg/ui-coss/components/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { useEffect, useRef } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import type { Item } from "@/types/convex";

const formSchema = z
  .object({
    name: z.string(),
    quantity: z.string(),
    price: z.string(),
  })
  .superRefine((values, context) => {
    const name = values.name.trim();
    const quantity = values.quantity.trim();
    const price = values.price.trim();

    if (!name && !quantity && !price) {
      context.addIssue({
        code: "custom",
        path: ["name"],
        message: "Enter at least one value to update",
      });
      return;
    }

    if (quantity && (!Number.isFinite(Number(quantity)) || Number(quantity) < 1)) {
      context.addIssue({
        code: "custom",
        path: ["quantity"],
        message: "Quantity must be at least 1",
      });
    }

    if (price && (!Number.isFinite(Number(price)) || Number(price) < 0)) {
      context.addIssue({
        code: "custom",
        path: ["price"],
        message: "Price must be at least 0",
      });
    }
  });

type FormData = z.infer<typeof formSchema>;

function sharedValue<T>(items: Item[], pick: (item: Item) => T): T | null {
  if (items.length === 0) return null;

  const first = pick(items[0]);
  return items.every((item) => pick(item) === first) ? first : null;
}

export function EditItemsDialog({
  open,
  setOpen,
  items,
  joId,
  onUpdated,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  items: Item[];
  joId: Id<"jo">;
  onUpdated?: () => void;
}) {
  const editItems = useMutation(api.items.updateItems).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.jo.getOneComplete, { id: joId });
      if (!current) return;

      const selected = new Set(args.itemIds);
      const nextItems = current.items.map((item) =>
        selected.has(item._id)
          ? {
              ...item,
              ...(args.name !== undefined ? { name: args.name } : {}),
              ...(args.quantity !== undefined ? { quantity: args.quantity } : {}),
              ...(args.price !== undefined ? { price: args.price } : {}),
            }
          : item,
      );

      localStore.setQuery(
        api.jo.getOneComplete,
        { id: joId },
        {
          ...current,
          items: nextItems,
          totalOrderValue: nextItems.reduce(
            (sum, item) => sum + item.quantity * item.price,
            0,
          ),
        },
      );
    },
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      quantity: "",
      price: "",
    },
  });

  const selectionKey = items.map((item) => item._id).join(",");
  const lastResetKey = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      lastResetKey.current = null;
      return;
    }
    if (lastResetKey.current === selectionKey) return;

    lastResetKey.current = selectionKey;
    form.reset({
      name: sharedValue(items, (item) => item.name) ?? "",
      quantity: sharedValue(items, (item) => item.quantity)?.toString() ?? "",
      price: sharedValue(items, (item) => item.price)?.toString() ?? "",
    });
  }, [open, selectionKey, items, form]);

  const watched = useWatch({ control: form.control });
  const hasValue = Boolean(
    watched.name?.trim() || watched.quantity?.trim() || watched.price?.trim(),
  );

  const onSubmit = (data: FormData) => {
    if (items.length === 0) return;

    const name = data.name.trim();
    const quantity = data.quantity.trim();
    const price = data.price.trim();

    editItems({
      joId,
      itemIds: items.map((item) => item._id),
      ...(name ? { name } : {}),
      ...(quantity ? { quantity: Number(quantity) } : {}),
      ...(price ? { price: Number(price) } : {}),
    })
      .then(() => {
        toastManager.add({
          title: `${items.length} ${items.length === 1 ? "item" : "items"} updated.`,
          type: "success",
        });
        onUpdated?.();
      })
      .catch((error) => {
        toastManager.add({
          title: "Couldn't update items",
          description:
            error instanceof ConvexError && typeof error.data === "string"
              ? error.data
              : "Please try again.",
          type: "error",
        });
      });

    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    setOpen(newOpen);
  };

  if (items.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Edit {items.length} {items.length === 1 ? "Item" : "Items"}
          </DialogTitle>
          <DialogDescription>
            Blank fields keep each item's current value. Mixed values are left blank.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
          <DialogPanel className="grid gap-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="edit-items-name">Name</FieldLabel>
                  <Input
                    {...field}
                    id="edit-items-name"
                    placeholder="Mixed values"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError>{fieldState.error?.message}</FieldError>
                  )}
                </Field>
              )}
            />
            <Controller
              name="quantity"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="edit-items-quantity">Quantity</FieldLabel>
                  <Input
                    {...field}
                    id="edit-items-quantity"
                    type="number"
                    min="1"
                    placeholder="Mixed values"
                    aria-invalid={fieldState.invalid}
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
                  <FieldLabel htmlFor="edit-items-price">Price</FieldLabel>
                  <Input
                    {...field}
                    id="edit-items-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Mixed values"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError>{fieldState.error?.message}</FieldError>
                  )}
                </Field>
              )}
            />
          </DialogPanel>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting || !hasValue}>
              {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

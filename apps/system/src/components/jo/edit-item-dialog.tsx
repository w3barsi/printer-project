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
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import type { Item } from "@/types/convex";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price must be at least 0"),
});

type FormData = z.infer<typeof formSchema>;

export function EditItemDialog({
  open,
  setOpen,
  item,
  joId,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  item: Item | null;
  joId: Id<"jo">;
}) {
  const editItem = useMutation(api.items.updateItem).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.jo.getOneComplete, { id: joId });
      if (!current) return;

      const existing = current.items.find((item) => item._id === args.itemId);
      if (!existing) return;

      localStore.setQuery(
        api.jo.getOneComplete,
        { id: joId },
        {
          ...current,
          items: current.items.map((item) =>
            item._id === args.itemId
              ? {
                  ...item,
                  name: args.name,
                  quantity: args.quantity,
                  price: args.price,
                }
              : item,
          ),
          totalOrderValue:
            current.totalOrderValue -
            existing.quantity * existing.price +
            args.quantity * args.price,
        },
      );
    },
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      quantity: 1,
      price: 0,
    },
  });

  // Update form values when item changes
  useEffect(() => {
    if (item) {
      form.reset({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      });
    }
  }, [item, form]);

  const onSubmit = (data: FormData) => {
    if (!item) return;

    editItem({
      joId,
      itemId: item._id,
      name: data.name,
      quantity: data.quantity,
      price: data.price,
    })
      .then(() => {
        toastManager.add({
          title: `"${data.name}" has been updated.`,
          type: "success",
        });
      })
      .catch((error) => {
        toastManager.add({
          title: "Couldn't update item",
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

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>
            Update the details below to edit the item.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
          <DialogPanel className="grid gap-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="edit-item-name">Name</FieldLabel>
                  <Input
                    {...field}
                    id="edit-item-name"
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
                  <FieldLabel htmlFor="edit-item-quantity">Quantity</FieldLabel>
                  <Input
                    {...field}
                    id="edit-item-quantity"
                    type="number"
                    aria-invalid={fieldState.invalid}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                  <FieldLabel htmlFor="edit-item-price">Price</FieldLabel>
                  <Input
                    {...field}
                    id="edit-item-price"
                    type="number"
                    step="0.01"
                    aria-invalid={fieldState.invalid}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

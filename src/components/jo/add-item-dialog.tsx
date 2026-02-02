import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useHotkeys } from "react-hotkeys-hook";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price cannot be negative"),
});

type FormData = z.infer<typeof formSchema>;

export function AddItemDialog({ joId }: { joId: Id<"jo"> }) {
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      quantity: 1,
      price: 0,
    },
  });

  const createItem = useMutation(api.items.createItem).withOptimisticUpdate(
    (localStore, args) => {
      const currentValue = localStore.getQuery(api.jo.getOneComplete, { id: joId });
      if (!currentValue) return;

      const newItem = {
        _id: `optimistic-${Date.now()}` as Id<"items">,
        _creationTime: Date.now(),
        joId: args.joId,
        name: args.name,
        quantity: args.quantity,
        price: args.price,
        createdBy: undefined,
        updatedAt: Date.now(),
      };

      const updatedItems = [...currentValue.items, newItem];
      const updatedTotalOrderValue =
        currentValue.totalOrderValue + args.quantity * args.price;

      localStore.setQuery(
        api.jo.getOneComplete,
        { id: joId },
        {
          ...currentValue,
          items: updatedItems,
          totalOrderValue: updatedTotalOrderValue,
        },
      );
    },
  );

  const onSubmit = (data: FormData) => {
    createItem({ joId, ...data });
    toast.success(`"${data.name}" has been added.`);
    form.reset();
    setIsOpen(false);
  };

  useHotkeys("a", (e) => {
    e.preventDefault();
    setIsOpen(true);
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="" /> Add Item
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex items-center gap-2">
            Add Item <Kbd>A</Kbd>
          </div>
        </TooltipContent>
      </Tooltip>
      <DialogContent className="">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new item to the job order.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="item-name">Name</FieldLabel>
                <Input
                  {...field}
                  id="item-name"
                  placeholder="Item name"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="quantity"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="item-quantity">Quantity</FieldLabel>
                <Input
                  {...field}
                  id="item-quantity"
                  type="number"
                  min="1"
                  aria-invalid={fieldState.invalid}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="price"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="item-price">Price</FieldLabel>
                <Input
                  {...field}
                  id="item-price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  aria-invalid={fieldState.invalid}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <DialogFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

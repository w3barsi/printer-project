import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useHotkeys } from "react-hotkeys-hook";

interface FormData {
  name: string;
  quantity: number;
  price: number;
}

export function AddItemDialog({ joId }: { joId: Id<"jo"> }) {
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm<FormData>({
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: "Name is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Item name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantity"
              rules={{
                required: "Quantity is required",
                min: { value: 1, message: "Quantity must be at least 1" },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              rules={{
                required: "Price is required",
                min: { value: 0, message: "Price cannot be negative" },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Adding..." : "Add Item"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

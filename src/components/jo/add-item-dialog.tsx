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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHotkeys } from "react-hotkeys-hook";
import { Badge } from "../ui/badge";

export function AddItemDialog({ joId }: { joId: Id<"jo"> }) {
  const [isOpen, setIsOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm({
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

  const onSubmit = (data: { name: string; quantity: number; price: number }) => {
    createItem({ joId, ...data });
    reset();
    setIsOpen(false);
  };

  useHotkeys("a", (e) => {
    e.preventDefault();
    setIsOpen(true);
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="" /> Add Item <Badge variant="hotkey">A</Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new item to the job order.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input id="name" {...register("name")} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity
            </Label>
            <Input
              id="quantity"
              type="number"
              {...register("quantity", { valueAsNumber: true })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">
              Price
            </Label>
            <Input
              id="price"
              type="number"
              {...register("price", { valueAsNumber: true })}
              className="col-span-3"
            />
          </div>
          <DialogFooter>
            <Button type="submit">Add Item</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

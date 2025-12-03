import type { GetCashflowQueryType } from "@/types/convex";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

export function AddCoh({ start }: { start: number }) {
  const [open, setOpen] = useState(false);

  const { data: session } = authClient.useSession();
  const user = session?.user;

  const createCashOnHand = useMutation(api.cashier.createCashOnHand).withOptimisticUpdate(
    (localStore, args) => {
      if (!user) return;

      const currentValue = localStore.getQuery(api.cashier.getCashflow, {
        dayStart: start,
      });

      if (!currentValue) return;

      const newData: GetCashflowQueryType = {
        ...currentValue,
        startingCash: {
          _id: crypto.randomUUID() as Id<"cashflow">,
          _creationTime: Date.now(),
          amount: args.amount,
          description: args.description,
          type: "Cashflow" as const,
          cashflowType: "COH",
          createdBy: user.id as Id<"users">,
          createdByName: user.name,
          createdAt: start,
        },
      };

      localStore.setQuery(api.cashier.getCashflow, { dayStart: start }, newData);
    },
  );

  const form = useForm({
    defaultValues: {
      amount: 0,
    },
  });

  const onSubmit = async (data: { amount: number }) => {
    createCashOnHand({
      amount: data.amount,
      description: "Cash On Hand",
      date: start,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="underline underline-offset-2">
          Add Cash On Hand
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Cash On Hand</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex w-full justify-end">
              <Button type="submit" className="w-24">
                Submit
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

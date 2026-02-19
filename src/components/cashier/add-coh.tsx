import type { GetCashflowQueryType } from "@/types/convex";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const formSchema = z.object({
  amount: z.number(),
});

type FormData = z.infer<typeof formSchema>;

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
          _creationTime: now,
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
    },
  });

  const onSubmit = async (data: FormData) => {
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="amount"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="coh-amount">Amount</FieldLabel>
                <Input
                  {...field}
                  id="coh-amount"
                  type="number"
                  aria-invalid={fieldState.invalid}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <div className="flex w-full justify-end">
            <Button type="submit" className="w-24">
              Submit
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

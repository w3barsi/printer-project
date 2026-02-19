import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearch } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { todayZero } from "@/routes/(main)/(cashier)/cashflow";

const formSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.number().refine((val) => val !== 0, "Amount must not be zero"),
  type: z.enum(["Expense", "CA"]),
});

type FormData = z.infer<typeof formSchema>;

export function AddCashflow({ date }: { date?: number }) {
  const [open, setOpen] = useState(false);
  const { start } = useSearch({ from: "/(main)/(cashier)/cashflow" });
  const dayStart = start ?? todayZero().getTime();

  const { data: session } = authClient.useSession();
  const user = session?.user;

  const mutate = useMutation(api.cashier.createCashflow).withOptimisticUpdate(
    (localStore, args) => {
      const { date, type, description, amount } = args;

      const currentValue = localStore.getQuery(api.cashier.getCashflow, { dayStart });
      if (!currentValue) return;
      if (!user) return;

      // eslint-disable-next-line react-hooks/purity
      const now = Date.now();

      const newCashflow = {
        type: "Cashflow" as const,
        cashflowType: type,
        createdBy: user.id as Id<"users">,
        createdByName: user.name,
        description,
        amount,
        createdAt: date,
        _creationTime: now,
        _id: crypto.randomUUID() as Id<"cashflow">,
      };

      const newData = [...currentValue.data, newCashflow];
      const newExpensesTotal =
        type === "Expense" || type === "CA"
          ? (currentValue?.expensesTotal ?? 0) + amount
          : (currentValue?.expensesTotal ?? 0);

      localStore.setQuery(
        api.cashier.getCashflow,
        { dayStart },
        {
          data: newData,
          expensesTotal: newExpensesTotal,
          paymentsTotal: currentValue?.paymentsTotal ?? 0,
          startingCash: currentValue?.startingCash ?? undefined,
        },
      );
    },
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { description: "", amount: 0, type: "Expense" },
  });

  const handleSave = form.handleSubmit(async (data) => {
    try {
      mutate({
        description: data.description,
        amount: data.amount,
        type: data.type,
        date: date ? date + 24 * 60 * 60 * 1000 - 1 : new Date().getTime(),
      });
      setOpen(false);
    } catch (e) {
      setOpen(true);
      form.setError("root", { message: "Error saving cashflow" });
    }
    form.reset();
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full md:w-auto">Add Cashflow</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Cashflow</DialogTitle>
        </DialogHeader>
        {form.formState.errors.root && (
          <p className="text-sm text-red-500">{form.formState.errors.root.message}</p>
        )}
        <form onSubmit={handleSave} className="space-y-4">
          <Controller
            name="amount"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="cashflow-amount">Amount</FieldLabel>
                <Input
                  {...field}
                  id="cashflow-amount"
                  type="number"
                  inputMode="decimal"
                  aria-invalid={fieldState.invalid}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="description"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="cashflow-description">Description</FieldLabel>
                <Input
                  {...field}
                  id="cashflow-description"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="type"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="cashflow-type">Type</FieldLabel>
                <select
                  {...field}
                  id="cashflow-type"
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Expense">Expense</option>
                  <option value="CA">Cash Advance</option>
                </select>
              </Field>
            )}
          />
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

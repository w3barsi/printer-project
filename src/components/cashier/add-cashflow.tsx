import type { CashflowType } from "@/types/convex";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useSearch } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { authClient } from "@/lib/auth-client";
import { todayZero } from "@/routes/(main)/(cashier)/cashflow";

type FormData = {
  description: string;
  amount: number;
  type: CashflowType;
};

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

      const newCashflow = {
        type: "Cashflow" as const,
        cashflowType: type,
        createdBy: user.id as Id<"users">,
        createdByName: user.name,
        description,
        amount,
        createdAt: date,
        _creationTime: Date.now(),
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
        <form onSubmit={handleSave}>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="amt">Amount</Label>
              <Input
                id="amt"
                type="number"
                inputMode="decimal"
                {...form.register("amount", {
                  required: "Amount is required",
                  valueAsNumber: true,
                  validate: (value) => value !== 0 || "Amount must not be zero",
                })}
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.amount.message ||
                    "Amount is required and must not be zero"}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc">Description</Label>
              <Input
                id="desc"
                {...form.register("description", { required: "Description is required" })}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <RadioGroup
                {...form.register("type")}
                onValueChange={(value) => form.setValue("type", value as CashflowType)}
                className="grid grid-cols-1 gap-4 md:grid-cols-3"
                defaultValue="Expense"
              >
                <div className="group flex items-center space-x-2">
                  <RadioGroupItem value="Expense" id="expense" defaultChecked={true} />
                  <Label
                    htmlFor="expense"
                    className="w-full text-sm group-hover:font-bold"
                  >
                    Expense
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="CA" id="cash-advance" />
                  <Label htmlFor="cash-advance" className="text-sm">
                    Cash Advance
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

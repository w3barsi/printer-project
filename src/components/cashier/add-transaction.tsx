"use no memo";
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
import { todayZero } from "@/routes/(main)/(cashier)/cashflow";
import type { CashflowType } from "@/types/convex";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useState } from "react";
import { useForm } from "react-hook-form";

type FormData = {
  description: string;
  amount: number;
  type: CashflowType;
};

export function AddCashflow({ date }: { date?: number }) {
  const [open, setOpen] = useState(false);
  const { start } = useSearch({ from: "/(main)/(cashier)/cashflow" });
  const dayStart = start ?? todayZero().getTime();

  const queryClient = useQueryClient();
  const mutate = useMutation(api.cashier.createCashflow).withOptimisticUpdate(
    (localStore, args) => {
      const { date, type, description, amount } = args;
      const currentValue = localStore.getQuery(api.cashier.getCashflow, { dayStart });

      const userData = queryClient.getQueryData(["user"]) as {
        user: { id: Id<"users">; name: string };
      };

      const newCashflow = {
        type: "Cashflow" as const,
        cashflowType: type,
        createdBy: userData.user.id,
        createdByName: userData.user.name,
        description,
        amount,
        createdAt: date,
        _creationTime: Date.now(),
        _id: crypto.randomUUID() as Id<"cashflow">,
      };

      const newData = [...(currentValue?.data ?? []), newCashflow];
      const newExpensesTotal =
        type === "Expense"
          ? (currentValue?.expensesTotal ?? 0) + amount
          : (currentValue?.expensesTotal ?? 0);
      const newPaymentsTotal =
        type === "CA"
          ? (currentValue?.paymentsTotal ?? 0) - amount
          : (currentValue?.paymentsTotal ?? 0);
      const startingCash = currentValue?.startingCash ?? undefined;

      localStore.setQuery(
        api.cashier.getCashflow,
        { dayStart },
        {
          data: newData,
          expensesTotal: newExpensesTotal,
          paymentsTotal: newPaymentsTotal,
          startingCash,
        },
      );
    },
  );

  const form = useForm<FormData>({
    defaultValues: { description: "", amount: 0, type: "Expense" },
  });

  const handleSave = form.handleSubmit(async (data) => {
    if (data.description.trim().length === 0) {
      return form.setError("description", {
        type: "required",
        message: "Description is required",
      });
    }

    mutate({
      description: data.description,
      amount: data.amount,
      type: data.type,
      date: date ? date + 24 * 60 * 60 * 1000 - 1 : new Date().getTime(),
    });
    setOpen(false);
    form.reset();
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full md:w-auto">Add Cashflow</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave}>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="amt">Amount</Label>
              <Input
                id="amt"
                type="number"
                inputMode="decimal"
                {...form.register("amount", {
                  required: true,
                  valueAsNumber: true,
                  validate: (value) => value !== 0,
                })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc">Description</Label>
              <Input id="desc" {...form.register("description", { required: true })} />
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

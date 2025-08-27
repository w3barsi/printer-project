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
import type { CashflowType } from "@/types/convex";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type FormData = {
  description: string;
  amount: number;
  type: CashflowType;
};

export function AddTransaction() {
  const [open, setOpen] = useState(false);
  const { mutateAsync } = useMutation({
    mutationFn: useConvexMutation(api.cashier.createCashflow),
  });
  const form = useForm<FormData>({
    defaultValues: { description: "", amount: 0, type: "Expense" },
  });

  const onSave = form.handleSubmit(async (data) => {
    await mutateAsync({
      description: data.description,
      amount: data.amount,
      type: data.type,
    });
    setOpen(false);
    form.reset();
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full md:w-auto">Add transaction</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave}>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="desc">Description</Label>
              <Input id="desc" {...form.register("description", { required: true })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select
                onValueChange={(value) =>
                  form.setValue("type", value as FormData["type"])
                }
                defaultValue={form.watch("type")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Income">Income</SelectItem>
                  <SelectItem value="Expense">Expense</SelectItem>
                  <SelectItem value="Cash Advance">Cash Advance</SelectItem>
                  <SelectItem value="Starting Cash">Starting Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!form.formState.isValid}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

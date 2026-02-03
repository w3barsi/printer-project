import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";
import { useHotkeys } from "react-hotkeys-hook";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Kbd } from "../ui/kbd";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const formSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  paymentType: z.enum(["cash", "bank"]),
  note: z.string(),
});

type FormData = z.infer<typeof formSchema>;

export function AddPaymentDialog({
  joId,
  totalPayments,
  totalOrderValue,
}: {
  joId: Id<"jo">;
  totalPayments: number;
  totalOrderValue: number;
}) {
  const [open, setOpen] = useState(false);
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const createPayment = useMutation(api.payment.createPayment).withOptimisticUpdate(
    (localStore, args) => {
      if (!user) return;
      const currentValue = localStore.getQuery(api.jo.getOneComplete, { id: joId });
      if (!currentValue) return;

      const newPayment = {
        _id: `optimistic-${Date.now()}` as Id<"payment">,
        _creationTime: Date.now(),
        createdAt: Date.now(),
        joId: args.joId,
        amount: args.amount,
        full: args.full,
        mop: args.mop,
        createdBy: user.id as Id<"users">,
        createdByName: user.name,
        note: args.note,
      };

      const updatedTotalPayments = currentValue.totalPayments + args.amount;

      localStore.setQuery(
        api.jo.getOneComplete,
        { id: joId },
        {
          ...currentValue,
          totalPayments: updatedTotalPayments,
          payments: [newPayment, ...currentValue.payments],
        },
      );
    },
  );

  useHotkeys("p", () => {
    setOpen(true);
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      paymentType: "cash",
      note: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    const full = data.amount >= totalOrderValue - totalPayments;
    createPayment({
      joId,
      amount: data.amount,
      full,
      mop: data.paymentType,
      note: data.note,
    });
    setOpen(false);
    form.reset();
  };

  const handleTotalPayment = async () => {
    form.setValue("amount", totalOrderValue - totalPayments);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button size="lg">
              <PlusIcon /> Add Payment
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex items-center gap-2">
            Add Payment <Kbd>P</Kbd>
          </div>
        </TooltipContent>
      </Tooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Payment</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new payment to the job order.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="amount"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="payment-amount">Amount</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    {...field}
                    id="payment-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    aria-invalid={fieldState.invalid}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTotalPayment}
                    className="whitespace-nowrap"
                  >
                    Full Payment
                  </Button>
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="paymentType"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="payment-type">Payment Type</FieldLabel>
                <Select
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="payment-type" aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="note"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="payment-note">Note (optional)</FieldLabel>
                <Textarea
                  {...field}
                  id="payment-note"
                  placeholder="Add any notes..."
                  className="resize-none"
                  aria-invalid={fieldState.invalid}
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
              {form.formState.isSubmitting ? "Adding..." : "Add Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { authClient } from "@/lib/auth-client";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";

interface FormData {
  amount: number;
  paymentType: "cash" | "bank";
  note: string;
}

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
          payments: [...currentValue.payments, newPayment],
        },
      );
    },
  );

  const form = useForm<FormData>({
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
    toast.success("Payment added successfully");
    setOpen(false);
    form.reset();
  };

  const handleTotalPayment = async () => {
    form.setValue("amount", totalOrderValue - totalPayments);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon /> Add Payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Payment</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new payment to the job order.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              rules={{
                required: "Amount is required",
                min: {
                  value: 0.01,
                  message: "Amount must be greater than 0",
                },
                validate: (value) =>
                  !isNaN(Number(value)) || "Please enter a valid number",
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
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
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes..."
                      className="resize-none"
                      {...field}
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
              {form.formState.isSubmitting ? "Adding..." : "Add Payment"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

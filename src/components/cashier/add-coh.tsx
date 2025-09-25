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
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useMutation } from "@tanstack/react-query";
import { LoaderIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

export function AddCoh({ start }: { start?: number }) {
  const [open, setOpen] = useState(false);
  const { mutateAsync: createCashOnHand, isPending } = useMutation({
    mutationFn: useConvexMutation(api.cashier.createCashOnHand),
  });

  const form = useForm({
    defaultValues: {
      amount: 0,
    },
  });

  const onSubmit = async (data: { amount: number }) => {
    await createCashOnHand({
      amount: data.amount,
      description: "Cash On Hand",
      date: start ?? new Date().getTime(),
    });
    setOpen(false);
    form.reset();
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
              {!isPending ? (
                <Button type="submit" className="w-24">
                  Submit
                </Button>
              ) : (
                <Button type="submit" className="w-24" disabled>
                  <LoaderIcon className="animate-spin" />
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

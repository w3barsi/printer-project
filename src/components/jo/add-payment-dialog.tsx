import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { useMutation } from "convex/react"
import { PlusIcon } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "../ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form"
import { Input } from "../ui/input"

interface FormData {
  amount: number
}

export function AddPaymentDialog({
  joId,
  totalPayments,
  totalOrderValue,
}: {
  joId: Id<"jo">
  totalPayments: number
  totalOrderValue: number
}) {
  const [open, setOpen] = useState(false)
  const createPayment = useMutation(api.payment.createPayment)

  const form = useForm<FormData>({
    defaultValues: {
      amount: 0,
    },
  })

  const onSubmit = async (data: FormData) => {
    const full = data.amount >= totalOrderValue - totalPayments
    try {
      await createPayment({
        joId,
        amount: data.amount,
        full,
      })
      toast.success("Payment added successfully")
      setOpen(false)
      form.reset()
    } catch {
      toast.error("Failed to add payment")
    }
  }

  const handleTotalPayment = async () => {
    form.setValue("amount", totalOrderValue - totalPayments)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="mr-2" /> Add Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="w-sm">
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
  )
}

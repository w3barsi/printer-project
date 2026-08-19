import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { z } from "zod";

import { CustomerCombobox } from "@/components/jo/customer-combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import DateAndTimePicker from "../date-and-time-picker";

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  contact: z.string(),
  date: z.date(),
  time: z.string().nullable(),
});

type FormData = z.infer<typeof formSchema>;

export function CreateJoDialog() {
  const [today] = useState(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [open, setOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: "",
      contact: "",
      date: today,
      time: null,
    },
  });

  const createJo = useMutation(api.jo.createJo);

  const onSubmit = async (data: FormData) => {
    try {
      await createJo({
        customerId: data.customerId as Id<"customer">,
        contactNumber: data.contact.length === 0 ? undefined : data.contact,
        pickupTime: data.time ?? undefined,
        pickupDate: data.date.getTime(),
      });
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create Job Order");
    }
  };

  useHotkeys("c", (e) => {
    e.preventDefault();
    setOpen(true);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={<DialogTrigger render={<Button size="lg" className="px-4" />} />}
        >
          <PlusIcon className="size-4" />
          Create Job Order
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex items-center gap-2">
            Create Job Order <Kbd>C</Kbd>
          </div>
        </TooltipContent>
      </Tooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create job order</DialogTitle>
          <DialogDescription>Add the customer and pickup details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FieldGroup>
            <Controller
              name="customerId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field className="gap-2" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="customer">Customer</FieldLabel>
                  <CustomerCombobox
                    id="customer"
                    value={field.value ? (field.value as Id<"customer">) : null}
                    invalid={fieldState.invalid}
                    onValueChange={(customer) => {
                      field.onChange(customer?._id ?? "");
                      form.setValue("contact", customer?.contactNumbers?.[0] ?? "");
                    }}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="contact"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field className="gap-2" data-invalid={fieldState.invalid}>
                  <div className="flex items-baseline justify-between gap-3">
                    <FieldLabel htmlFor="contact">Contact number</FieldLabel>
                    <span className="text-xs text-muted-foreground">Optional</span>
                  </div>
                  <Input
                    {...field}
                    id="contact"
                    type="tel"
                    className="h-10"
                    placeholder="e.g. 0917 123 4567"
                    autoComplete="tel"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="date"
              control={form.control}
              render={({ field }) => (
                <Field className="gap-2">
                  <FieldLabel htmlFor="pickup-date">Pickup date</FieldLabel>
                  <DateAndTimePicker
                    date={field.value}
                    setDate={(newDate) => {
                      if (newDate) {
                        field.onChange(newDate);
                        form.setValue("time", null);
                      }
                    }}
                    today={today}
                  />
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter>
            <Button
              type="submit"
              className="w-full px-5"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Creating…" : "Create job order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouteContext } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useHotkeys } from "react-hotkeys-hook";
import { z } from "zod";

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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import DateAndTimePicker from "../date-and-time-picker";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
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

  const userData = useRouteContext({ from: "/app/jo/" });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      contact: "",
      date: today,
      time: null,
    },
  });

  const createJo = useMutation(api.jo.createJo).withOptimisticUpdate(
    (localStore, args) => {
      const { name, pickupDate, pickupTime, contactNumber } = args;

      const getWithPaginationArgs = {
        paginationOptions: {
          numItems: 10,
          cursor: null,
        },
      };

      const currentValue = localStore.getQuery(
        api.jo.getWithPagination,
        getWithPaginationArgs,
      );

      // eslint-disable-next-line react-hooks/purity
      const now = Date.now();

      const newJo = {
        _id: crypto.randomUUID() as Id<"jo">,
        _creationTime: now,
        createdBy: userData.user.userId as Id<"users">,
        updatedAt: undefined,
        pickupDate,
        pickupTime,
        contactNumber,
        name,
        joNumber: currentValue?.jos?.length ? currentValue.jos[0].joNumber + 1 : 999,
        status: "pending" as const,
        items: [],
      };

      localStore.setQuery(api.jo.getWithPagination, getWithPaginationArgs, {
        nextCursor: currentValue?.nextCursor,
        jos: [newJo, ...(currentValue?.jos ?? [])],
      });
    },
  );

  const onSubmit = async (data: FormData) => {
    await createJo({
      name: data.name,
      contactNumber: data.contact.length === 0 ? undefined : data.contact,
      pickupTime: data.time ?? undefined,
      pickupDate: data.date.getTime(),
    });
    setOpen(false);
    form.reset();
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field className="gap-2" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="name">Customer name</FieldLabel>
                  <Input
                    {...field}
                    id="name"
                    className="h-10"
                    placeholder="e.g. Maria Santos"
                    autoComplete="name"
                    autoFocus
                    aria-invalid={fieldState.invalid}
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
          </div>
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

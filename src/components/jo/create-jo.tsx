import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { useRouteContext } from "@tanstack/react-router";
import { useHotkeys } from "react-hotkeys-hook";
import DateAndTimePicker from "../date-and-time-picker";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contact: z.string(),
  date: z.date(),
  time: z.string().nullable(),
});

type FormData = z.infer<typeof formSchema>;

export function CreateDialog() {
  const today = new Date();
  const [open, setOpen] = useState(false);

  const userData = useRouteContext({ from: "/(main)/jo/" });

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

      const newJo = {
        _id: crypto.randomUUID() as Id<"jo">,
        // eslint-disable-next-line react-hooks/purity
        _creationTime: Date.now(),
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
    createJo({
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
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4" />
              Create Job Order
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex items-center gap-2">
            Create Job Order <Kbd>C</Kbd>
          </div>
        </TooltipContent>
      </Tooltip>
      <DialogContent className="md:max-w-sm">
        <DialogHeader className="">
          <DialogTitle>Create Job Orders</DialogTitle>
          <DialogDescription>
            Create a new job order to start tracking items and progress.
          </DialogDescription>
        </DialogHeader>
        <div className="">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input
                    {...field}
                    id="name"
                    placeholder="Enter job order name"
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
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="contact">Contact Number</FieldLabel>
                  <Input
                    {...field}
                    id="contact"
                    placeholder="Enter contact number (optional)"
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
                <DateAndTimePicker
                  date={field.value}
                  setDate={(newDate) => {
                    if (newDate) {
                      field.onChange(newDate);
                      form.setValue("time", null);
                    }
                  }}
                  time={form.watch("time")}
                  setTime={(newTime) => {
                    const value =
                      typeof newTime === "function"
                        ? newTime(form.getValues("time"))
                        : newTime;
                    form.setValue("time", value);
                  }}
                  today={today}
                />
              )}
            />
            <DialogFooter className="shrink-0">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

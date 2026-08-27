import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import { Button } from "@dg/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@dg/ui/components/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@dg/ui/components/field";
import { Input } from "@dg/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dg/ui/components/select";
import { SidebarMenuSubButton } from "@dg/ui/components/sidebar";
import { Spinner } from "@dg/ui/components/spinner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const visibilityOptions = [
  { label: "Everyone", value: "everyone" },
  { label: "Admin only", value: "admin" },
] as const;

const createSpaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name must be 60 characters or fewer"),
  description: z.string().trim().max(160, "Description must be 160 characters or fewer"),
  visibility: z.enum(["everyone", "admin"]),
});

type CreateSpaceFormData = z.infer<typeof createSpaceSchema>;

interface CreateSpaceDialogProps {
  variant?: "button" | "sidebar";
}

export function CreateSpaceDialog({ variant = "button" }: CreateSpaceDialogProps) {
  const { user } = useRouteContext({ from: "/app" });
  const id = useId();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const createSpace = useConvexMutation(api.drive.spaces.create);
  const form = useForm<CreateSpaceFormData>({
    resolver: zodResolver(createSpaceSchema),
    defaultValues: {
      name: "",
      description: "",
      visibility: "everyone",
    },
  });
  const mutation = useMutation({
    mutationFn: createSpace,
    onSuccess: () => {
      void qc.invalidateQueries(convexQuery(api.drive.spaces.list, {}));
      toast.success("Space created");
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message || "Could not create the space");
    },
  });

  if (user.role !== "admin") return null;

  function onSubmit(data: CreateSpaceFormData) {
    mutation.mutate({
      ...data,
      description: data.description || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          variant === "sidebar" ? (
            <SidebarMenuSubButton render={<button type="button" />} />
          ) : (
            <Button />
          )
        }
      >
        <PlusIcon data-icon="inline-start" />
        <span>Create space</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a space</DialogTitle>
          <DialogDescription>
            Set up a shared home for files and choose who can discover it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${id}-name`}>Name</FieldLabel>
                  <Input
                    {...field}
                    id={`${id}-name`}
                    placeholder="Client projects"
                    autoFocus
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${id}-description`}>
                    Description (optional)
                  </FieldLabel>
                  <Input
                    {...field}
                    id={`${id}-description`}
                    placeholder="Proofs, artwork, and production files"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>Optional, up to 160 characters.</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="visibility"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${id}-visibility`}>Visibility</FieldLabel>
                  <Select
                    items={visibilityOptions}
                    value={field.value}
                    onValueChange={(value) => field.onChange(value)}
                  >
                    <SelectTrigger id={`${id}-visibility`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {visibilityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Admin-only spaces are hidden from all other users.
                  </FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner data-icon="inline-start" />}
              Create space
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

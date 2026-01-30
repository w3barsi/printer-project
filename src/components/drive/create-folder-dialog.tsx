import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
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

const formSchema = z.object({ name: z.string().min(1, "Name is required") });
type FormData = z.infer<typeof formSchema>;

interface CreateFolderDialogProps {
  parent?: string; // Default parent, e.g., "private" or folder ID
}

export function CreateFolderDialog({
  parent = "private" as const,
}: CreateFolderDialogProps) {
  const [open, setOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  const mutate = useMutation(api.drive.createFolder).withOptimisticUpdate(
    (localStore, args) => {
      const { name, parent } = args;
      const currentValue = localStore.getQuery(api.drive.getDrive, { parent });

      if (currentValue !== undefined) {
        const folders = currentValue.data.filter((f) => !f.isFile);
        const files = currentValue.data.filter((f) => f.isFile);

        const newFolders = [
          ...folders,
          {
            isFile: false as const,
            type: "folder",
            _id: crypto.randomUUID() as Id<"folder">,
            _creationTime: Date.now(),
            toDelete: false,
            name,
            parent,
            createdBy:
              currentValue.currentFolder?.createdBy || ("default" as Id<"users">),
          },
        ].sort((a, b) => a.name.localeCompare(b.name));

        localStore.setQuery(
          api.drive.getDrive,
          { parent },
          {
            ...currentValue,
            data: [...newFolders, ...files],
          },
        );
      }
    },
  );

  const onSubmit = async (data: FormData) => {
    try {
      setOpen(false);
      await mutate({
        parent:
          parent === "private" || parent === "public" ? parent : (parent as Id<"folder">),
        name: data.name,
      });

      form.reset();
    } catch (e) {
      setOpen(true);
      toast.error("Folder of the same name already exists here.");
      form.reset();
      inputRef.current?.focus();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Folder</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            Create a new folder to organize your files.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="folder-name">Folder Name</FieldLabel>
                <Input
                  {...field}
                  id="folder-name"
                  placeholder="Enter folder name"
                  aria-invalid={fieldState.invalid}
                  ref={(el) => {
                    inputRef.current = el;
                    field.ref(el);
                  }}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

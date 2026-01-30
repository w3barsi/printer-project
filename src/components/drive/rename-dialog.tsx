// src/components/CreateFolderDialog.tsx
import type { GetDriveType } from "@/types/convex";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef } from "react";
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
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useRenameFileOrFolder } from "@/lib/convex/optimistic-mutations";
import { useGetParentFolder } from "@/lib/get-parent-folder";

type RenameDialogProps = {
  d: GetDriveType;
  openRename: boolean;
  setOpenRename: (open: boolean) => void;
};

const formSchema = z.object({ name: z.string().min(1, "Name is required") });
type FormData = z.infer<typeof formSchema>;

export function RenameDialog({ d, openRename, setOpenRename }: RenameDialogProps) {
  const parent = useGetParentFolder();

  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate, isPending } = useRenameFileOrFolder(parent);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  const onSubmit = (data: FormData) => {
    mutate({
      id: d._id,
      name: data.name,
    });
    setOpenRename(false);
  };

  return (
    <Dialog open={openRename} onOpenChange={setOpenRename}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename</DialogTitle>
          <DialogDescription>Enter a new name for "{d.name}".</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="rename-name">
                  {d.isFile ? "File " : "Folder "}Name
                </FieldLabel>
                <Input
                  {...field}
                  id="rename-name"
                  placeholder={`Enter ${d.isFile ? "File " : "Folder "} name`}
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenRename(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit">Rename</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

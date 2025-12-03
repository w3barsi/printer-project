// src/components/CreateFolderDialog.tsx
import type { GetDriveType } from "@/types/convex";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef } from "react";
import { useForm } from "react-hook-form";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{d.isFile ? "File " : "Folder "}Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={`Enter ${d.isFile ? "File " : "Folder "} name`}
                      {...field}
                      ref={(el) => {
                        inputRef.current = el;
                        field.ref(el);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
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
        </Form>
      </DialogContent>
    </Dialog>
  );
}

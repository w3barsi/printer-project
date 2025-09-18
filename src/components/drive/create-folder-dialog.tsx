// src/components/CreateFolderDialog.tsx
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  parent: z.union([z.literal("private"), z.literal("public"), z.string()]), // Allow folder ID as string
});

type FormData = z.infer<typeof formSchema>;

interface CreateFolderDialogProps {
  parent?: string; // Default parent, e.g., "private" or folder ID
  onSuccess?: () => void;
}

export function CreateFolderDialog({
  parent = "private" as const,
  onSuccess,
}: CreateFolderDialogProps) {
  const { mutateAsync } = useMutation({
    mutationFn: useConvexMutation(api.drive.createFolder),
  });
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await mutateAsync({
        parent:
          parent === "private" || parent === "public" ? parent : (parent as Id<"folder">),
        name: data.name,
      });
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create folder:", error);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create Folder</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Folder Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter folder name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit">Create</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

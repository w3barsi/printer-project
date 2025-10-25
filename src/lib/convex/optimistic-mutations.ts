import type { Parent } from "@/components/ui/upload-dropzone";
import type { Id } from "@convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";

import { useSelected } from "@/contexts/SelectedContext";

type GetDriveQueryData = FunctionReturnType<typeof api.drive.getDrive>;

export function useMoveFilesOrFolders(parent: Parent) {
  const queryClient = useQueryClient();

  const { mutate } = useMutation<
    null,
    unknown,
    { ids: Array<Id<"folder"> | Id<"file">>; parent: Parent },
    { previousData?: GetDriveQueryData }
  >({
    mutationFn: useConvexMutation(api.drive.moveFilesOrFolders),
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: convexQuery(api.drive.getDrive, { parent }).queryKey,
      });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(
        convexQuery(api.drive.getDrive, { parent }).queryKey,
      ) as GetDriveQueryData | undefined;

      // Optimistically update by removing the moved items only if moving to a different parent
      if (variables.parent !== parent) {
        queryClient.setQueryData(
          convexQuery(api.drive.getDrive, { parent }).queryKey,
          (old: GetDriveQueryData) => {
            if (!old) return old;
            const newData = old.data.filter((item) => !variables.ids.includes(item._id));
            return { ...old, data: newData };
          },
        );
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Revert on error
      if (context?.previousData) {
        queryClient.setQueryData(
          convexQuery(api.drive.getDrive, { parent }).queryKey,
          context.previousData,
        );
      }
    },
    onSettled: () => {
      // Refetch to ensure data is correct
      queryClient.invalidateQueries({
        queryKey: convexQuery(api.drive.getDrive, { parent }).queryKey,
      });
    },
  });

  return mutate;
}

export function useDeleteFilesOrFolders(parent: Parent) {
  const queryClient = useQueryClient();
  const { clearSelected } = useSelected();

  const { mutate } = useMutation<
    null,
    unknown,
    { ids: Array<Id<"folder"> | Id<"file">> },
    { previousData?: GetDriveQueryData }
  >({
    mutationFn: useConvexMutation(api.drive.deleteFilesOrFolders),
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: convexQuery(api.drive.getDrive, { parent }).queryKey,
      });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(
        convexQuery(api.drive.getDrive, { parent }).queryKey,
      ) as GetDriveQueryData | undefined;

      // Optimistically update by removing the deleted items
      queryClient.setQueryData(
        convexQuery(api.drive.getDrive, { parent }).queryKey,
        (old: GetDriveQueryData) => {
          if (!old) return old;
          const newData = old.data.filter((item) => !variables.ids.includes(item._id));
          return { ...old, data: newData };
        },
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Revert on error
      clearSelected();
      if (context?.previousData) {
        queryClient.setQueryData(
          convexQuery(api.drive.getDrive, { parent }).queryKey,
          context.previousData,
        );
      }
    },
    onSettled: () => {
      // Refetch to ensure data is correct
      queryClient.invalidateQueries({
        queryKey: convexQuery(api.drive.getDrive, { parent }).queryKey,
      });
    },
  });

  return mutate;
}

export function useRenameFileOrFolder(parent: Parent) {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation<
    null,
    unknown,
    { id: Id<"folder"> | Id<"file">; name: string },
    { previousData?: GetDriveQueryData }
  >({
    mutationFn: useConvexMutation(api.drive.renameFileOrFolder),
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: convexQuery(api.drive.getDrive, { parent }).queryKey,
      });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(
        convexQuery(api.drive.getDrive, { parent }).queryKey,
      ) as GetDriveQueryData | undefined;

      // Optimistically update the name
      queryClient.setQueryData(
        convexQuery(api.drive.getDrive, { parent }).queryKey,
        (old: GetDriveQueryData) => {
          if (!old) return old;
          const newData = old.data.map((item) =>
            item._id === variables.id ? { ...item, name: variables.name } : item,
          );
          return { ...old, data: newData };
        },
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Revert on error
      if (context?.previousData) {
        queryClient.setQueryData(
          convexQuery(api.drive.getDrive, { parent }).queryKey,
          context.previousData,
        );
      }
    },
    onSettled: () => {
      // Refetch to ensure data is correct
      queryClient.invalidateQueries({
        queryKey: convexQuery(api.drive.getDrive, { parent }).queryKey,
      });
    },
  });

  return { mutate, isPending };
}

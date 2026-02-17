import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useParams } from "@tanstack/react-router";
import { useMutation } from "convex/react";

import { DeleteConfirmButton } from "@/components/ui-custom/delete-confirm-button";

export function DeleteItemButton({ itemId }: { itemId: Id<"items"> }) {
  const { joId } = useParams({ from: "/(main)/jo/$joId" });
  const deleteItem = useMutation(api.items.deleteItem).withOptimisticUpdate(
    (localStore, args) => {
      const currentValue = localStore.getQuery(api.jo.getOneComplete, {
        id: joId as Id<"jo">,
      });

      if (!currentValue) {
        return;
      }
      const itemValue = currentValue.items.find((c) => c._id === args.itemId);

      const newValue = {
        ...currentValue,
        totalOrderValue: currentValue.totalOrderValue - itemValue!.price,

        items: currentValue.items.filter((c) => c._id !== args.itemId),
      };
      localStore.setQuery(api.jo.getOneComplete, { id: joId as Id<"jo"> }, newValue);
    },
  );

  return (
    <DeleteConfirmButton
      deleteFor="job order"
      onConfirm={() => deleteItem({ itemId, joId: joId as Id<"jo"> })}
    />
  );
}

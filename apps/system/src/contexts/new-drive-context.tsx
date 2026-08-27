import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useState,
} from "react";

import { newDriveItems, type NewDriveItem } from "@/lib/new-drive-items";

type NewDriveContextValue = {
  items: NewDriveItem[];
  deleteItems: (itemIds: string[]) => void;
  moveItems: (itemIds: string[], destinationFolderId: string) => boolean;
};

const NewDriveContext = createContext<NewDriveContextValue | null>(null);

export function NewDriveProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NewDriveItem[]>(() => newDriveItems);

  const deleteItems = useCallback((itemIds: string[]) => {
    setItems((current) => current.filter((item) => !itemIds.includes(item.id)));
  }, []);

  const moveItems = useCallback(
    (itemIds: string[], destinationFolderId: string) => {
      const destination = items.find(
        (item) => item.id === destinationFolderId && item.kind === "folder",
      );
      if (!destination) return false;

      let ancestorId: string | null = destination.id;
      while (ancestorId) {
        if (itemIds.includes(ancestorId)) return false;
        ancestorId = items.find((item) => item.id === ancestorId)?.parentId ?? null;
      }

      setItems((current) =>
        current.map((item) =>
          itemIds.includes(item.id)
            ? {
                ...item,
                spaceId: destination.spaceId,
                parentId: destination.id,
                updated: "Just now",
              }
            : item,
        ),
      );
      return true;
    },
    [items],
  );

  const value = useMemo(
    () => ({ items, deleteItems, moveItems }),
    [items, deleteItems, moveItems],
  );

  return <NewDriveContext value={value}>{children}</NewDriveContext>;
}

export function useNewDrive() {
  const context = use(NewDriveContext);
  if (!context) throw new Error("useNewDrive must be used within NewDriveProvider");
  return context;
}

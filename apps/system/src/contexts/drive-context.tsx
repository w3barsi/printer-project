import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useState,
} from "react";

import { driveItems, type DriveItem } from "@/lib/drive-items";

type DriveContextValue = {
  items: DriveItem[];
  deleteItems: (itemIds: string[]) => void;
  moveItems: (itemIds: string[], destinationFolderId: string) => boolean;
};

const DriveContext = createContext<DriveContextValue | null>(null);

export function DriveProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<DriveItem[]>(() => driveItems);

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

  return <DriveContext value={value}>{children}</DriveContext>;
}

export function useDrive() {
  const context = use(DriveContext);
  if (!context) throw new Error("useDrive must be used within DriveProvider");
  return context;
}

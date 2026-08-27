import type { Id } from "@dg/backend/dataModel";
import type { ReactNode } from "react";
import { createContext, use, useCallback, useMemo, useState } from "react";

export type SelectedItem = Id<"folder"> | Id<"file">;

export interface SelectedContextType {
  selected: SelectedItem[];
  addSelected: (item: SelectedItem) => void;
  removeSelected: (item: SelectedItem) => void;
  clearSelected: () => void;
  isSelected: (item: SelectedItem) => boolean;
  selectRange: (items: SelectedItem[], item: SelectedItem) => void;
  setSelectionAnchor: (item: SelectedItem) => void;
}

// Create context with undefined as default
const SelectedContext = createContext<SelectedContextType | undefined>(undefined);

// Provider props interface
interface SelectedProviderProps {
  children: ReactNode;
}

// Provider component
export const SelectedProvider = ({ children }: SelectedProviderProps) => {
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const [selectionAnchor, setSelectionAnchor] = useState<SelectedItem | null>(null);

  const addSelected = useCallback((item: SelectedItem) => {
    setSelected((prev) => {
      if (prev.includes(item)) return prev;
      return [...prev, item];
    });
  }, []);

  const removeSelected = useCallback((item: SelectedItem) => {
    setSelected((prev) => prev.filter((selectedItem) => selectedItem !== item));
  }, []);

  const clearSelected = useCallback(() => {
    setSelected([]);
    setSelectionAnchor(null);
  }, []);

  const selectRange = useCallback(
    (items: SelectedItem[], item: SelectedItem) => {
      const anchorIndex = selectionAnchor ? items.indexOf(selectionAnchor) : -1;
      const itemIndex = items.indexOf(item);

      if (anchorIndex === -1 || itemIndex === -1) {
        setSelected([item]);
        setSelectionAnchor(item);
        return;
      }

      const start = Math.min(anchorIndex, itemIndex);
      const end = Math.max(anchorIndex, itemIndex);
      setSelected(items.slice(start, end + 1));
    },
    [selectionAnchor],
  );

  const isSelected = useCallback(
    (item: SelectedItem) => selected.includes(item),
    [selected],
  );

  const value = useMemo<SelectedContextType>(
    () => ({
      selected,
      addSelected,
      removeSelected,
      clearSelected,
      isSelected,
      selectRange,
      setSelectionAnchor,
    }),
    [selected, addSelected, removeSelected, clearSelected, isSelected, selectRange],
  );

  return <SelectedContext value={value}>{children}</SelectedContext>;
};

// Custom hook to use the selected context
export const useSelected = (): SelectedContextType => {
  const context = use(SelectedContext);

  if (context === undefined) {
    throw new Error("useSelected must be used within a SelectedProvider");
  }

  return context;
};

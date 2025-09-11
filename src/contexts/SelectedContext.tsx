import type { Id } from "@convex/_generated/dataModel";
import type { ReactNode } from "react";
import { createContext, use, useCallback, useMemo, useState } from "react";

export type SelectedItem = Id<"folder"> | Id<"file">;

export interface SelectedContextType {
  selected: SelectedItem[];
  addSelected: (item: SelectedItem) => void;
  removeSelected: (item: SelectedItem) => void;
  clearSelected: () => void;
  isSelected: (item: SelectedItem) => boolean;
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
  }, []);

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
    }),
    [selected, addSelected, removeSelected, clearSelected, isSelected],
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

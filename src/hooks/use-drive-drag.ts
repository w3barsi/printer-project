import type { Id } from "@convex/_generated/dataModel";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useCallback, useMemo } from "react";

import type { SelectedItem } from "@/contexts/SelectedContext";
import { useSelected } from "@/contexts/SelectedContext";
import { createDragId, createDropId, extractId } from "@/lib/drive/drag-utils";

interface Transform {
  x: number;
  y: number;
}

interface UseDriveDragOptions {
  itemId: string;
  activeId: string | null;
  sharedTransform: Transform | null;
}

interface UseDriveDragReturn {
  setNodeRef: (node: HTMLElement | null) => void;
  listeners: ReturnType<typeof useDraggable>["listeners"];
  attributes: ReturnType<typeof useDraggable>["attributes"];
  transform: Transform | null;
  style: React.CSSProperties;
  isDragging: boolean;
  isOver: boolean;
  isItemSelected: boolean;
  over: ReturnType<typeof useDroppable>["over"];
  active: ReturnType<typeof useDroppable>["active"];
  shouldTransform: boolean;
}

export function useDriveDrag({
  itemId,
  activeId,
  sharedTransform,
}: UseDriveDragOptions): UseDriveDragReturn {
  const { selected } = useSelected();

  const dragId = useMemo(() => createDragId(itemId), [itemId]);
  const dropId = useMemo(() => createDropId(itemId), [itemId]);

  const {
    setNodeRef: setDraggableRef,
    listeners,
    attributes,
    transform,
    isDragging,
  } = useDraggable({
    id: dragId,
  });

  const {
    setNodeRef: setDroppableRef,
    isOver,
    over,
    active,
  } = useDroppable({
    id: dropId,
  });

  const setNodeRef = useCallback(
    (node: HTMLElement | null) => {
      setDraggableRef(node);
      setDroppableRef(node);
    },
    [setDraggableRef, setDroppableRef],
  );

  const isItemSelected = useMemo(
    () => selected.includes(itemId as Id<"folder"> | Id<"file">),
    [selected, itemId],
  );

  const draggedItemId = useMemo(() => {
    if (!activeId) return null;
    return extractId(activeId);
  }, [activeId]);

  const shouldTransform = useMemo(() => {
    if (isDragging) return true;
    if (!isItemSelected || !draggedItemId) return false;
    return selected.includes(draggedItemId as SelectedItem);
  }, [isDragging, isItemSelected, draggedItemId, selected]);

  const style = useMemo<React.CSSProperties>(() => {
    if (!shouldTransform) return {};
    const effectiveTransform = transform || sharedTransform;
    if (!effectiveTransform) return {};
    return {
      transform: `translate(${effectiveTransform.x}px, ${effectiveTransform.y}px)`,
    };
  }, [shouldTransform, transform, sharedTransform]);

  return {
    setNodeRef,
    listeners,
    attributes,
    transform,
    style,
    isDragging,
    isOver,
    isItemSelected,
    over,
    active,
    shouldTransform,
  };
}

import type { GetDriveParentFolderType } from "@/types/convex";
import { useDroppable } from "@dnd-kit/core";
import { useNavigate } from "@tanstack/react-router";
import { CornerLeftUpIcon } from "lucide-react";

import { createDropId, extractId } from "@/lib/drive/drag-utils";
import { cn } from "@/lib/utils";

interface ParentFolderProps {
  parentFolder: GetDriveParentFolderType;
}

export function ParentFolder({ parentFolder }: ParentFolderProps) {
  const navigate = useNavigate();
  const { setNodeRef, isOver, over, active } = useDroppable({
    id: createDropId(parentFolder._id as string),
  });

  const overId = extractId(over?.id);
  const activeId = extractId(active?.id);

  return (
    <div
      onDoubleClick={async () => {
        navigate({
          to: "/drive/{-$drive}",
          params: {
            drive: parentFolder._id === "private" ? undefined : parentFolder._id,
          },
        });
      }}
      ref={setNodeRef}
      className={cn(
        "border-border hover:bg-muted/30 bg-card flex h-14 cursor-pointer items-center gap-4 rounded-lg border px-4 transition-colors duration-200 select-none",
        isOver && overId !== activeId && "border-blue-500",
      )}
      role="button"
      aria-label={`Navigate to parent folder: ${parentFolder.name}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          navigate({
            to: "/drive/{-$drive}",
            params: {
              drive: parentFolder._id === "private" ? undefined : parentFolder._id,
            },
          });
        }
      }}
    >
      <CornerLeftUpIcon className="text-muted-foreground size-4" />
      <h3 className="truncate text-sm font-medium">{parentFolder.name}</h3>
    </div>
  );
}

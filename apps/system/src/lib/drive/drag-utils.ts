export const DRAG_ID_SUFFIX = "-drag" as const;
export const DROP_ID_SUFFIX = "-drop" as const;
export const TRASH_ID = "trash" as const;

export function extractId(fullId: string | number | undefined | null): string | null {
  if (fullId === null || fullId === undefined) return null;
  return fullId.toString().split("-")[0];
}

export function createDragId(id: string): string {
  return `${id}${DRAG_ID_SUFFIX}`;
}

export function createDropId(id: string): string {
  return `${id}${DROP_ID_SUFFIX}`;
}

export function isTrashTarget(overId: string | undefined | null): boolean {
  return overId === TRASH_ID;
}

export function isValidDriveId(id: unknown): id is string {
  return typeof id === "string" && (id.startsWith("folder_") || id.startsWith("file_"));
}

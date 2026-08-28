export type DriveItem = {
  id: string;
  name: string;
  kind: "folder" | "pdf" | "image" | "text";
  owner: string;
  updated: string;
  size: string;
  access: "Editors" | "Viewers" | "Restricted";
  spaceId: string;
  parentId: string | null;
};

export type DriveShareItem = Pick<DriveItem, "id" | "name" | "kind">;

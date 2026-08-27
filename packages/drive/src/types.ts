export type NewDriveItem = {
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

export type NewDriveShareItem = Pick<NewDriveItem, "id" | "name" | "kind">;

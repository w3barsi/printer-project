import { Button } from "@dg/ui-coss/components/button";
import { Field, FieldLabel } from "@dg/ui-coss/components/field";
import { Input } from "@dg/ui-coss/components/input";
import {
  Menu,
  MenuPopup,
  MenuGroup,
  MenuItem,
  MenuTrigger,
} from "@dg/ui-coss/components/menu";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@dg/ui-coss/components/popover";
import { Spinner } from "@dg/ui-coss/components/spinner";
import { toastManager } from "@dg/ui-coss/components/toast";
import {
  DownloadIcon,
  FolderPlusIcon,
  FolderUpIcon,
  MoreHorizontalIcon,
  Share2Icon,
  UploadIcon,
} from "lucide-react";
import { type ChangeEvent, useId, useRef, useState } from "react";

import type { DriveUploadSelection } from "../use-upload";

interface AddItemsMenuProps {
  upload: (selection: DriveUploadSelection) => Promise<void>;
  isUploading: boolean;
  onCreateFolder: (name: string) => Promise<unknown>;
  onDownloadFolder?: () => void;
  onShareFolder?: () => void;
}

export function AddItemsMenu({
  upload,
  isUploading,
  onCreateFolder,
  onDownloadFolder,
  onShareFolder,
}: AddItemsMenuProps) {
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const [folderPopoverOpen, setFolderPopoverOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  async function uploadSelectedFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    await upload({
      files: files.map((file) => ({
        file,
        relativePath: file.webkitRelativePath || file.name,
      })),
      folderPaths: [],
    });
  }

  async function submitFolder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!folderName.trim()) return;
    setIsCreatingFolder(true);
    try {
      await onCreateFolder(folderName);
      toastManager.add({ title: "Folder created", type: "success" });
      setFolderName("");
      setFolderPopoverOpen(false);
    } catch (error) {
      toastManager.add({
        title: error instanceof Error ? error.message : "Could not create folder",
        type: "error",
      });
    } finally {
      setIsCreatingFolder(false);
    }
  }

  return (
    <div className="flex items-center gap-2 sm:shrink-0">
      <Menu>
        <MenuTrigger render={<Button disabled={isUploading} />}>
          {isUploading ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <UploadIcon data-icon="inline-start" />
          )}
          {isUploading ? "Uploading..." : "Upload File/Folder"}
        </MenuTrigger>
        <MenuPopup align="end">
          <MenuGroup>
            <MenuItem onClick={() => fileInput.current?.click()}>
              <UploadIcon />
              Upload files
            </MenuItem>
            <MenuItem onClick={() => folderInput.current?.click()}>
              <FolderUpIcon />
              Upload folder
            </MenuItem>
          </MenuGroup>
        </MenuPopup>
      </Menu>

      <Popover open={folderPopoverOpen} onOpenChange={setFolderPopoverOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Create folder"
            />
          }
        >
          <FolderPlusIcon />
        </PopoverTrigger>
        <PopoverContent align="end">
          <div className="flex flex-col gap-1 text-sm">
            <PopoverTitle>Create a folder</PopoverTitle>
            <PopoverDescription>Add an empty folder in this location.</PopoverDescription>
          </div>
          <form onSubmit={submitFolder} className="flex flex-col gap-4">
            <div className="flex w-full flex-col gap-4">
              <Field>
                <FieldLabel htmlFor={`${id}-folder-name`}>Folder name</FieldLabel>
                <Input
                  id={`${id}-folder-name`}
                  value={folderName}
                  onChange={(event) => setFolderName(event.target.value)}
                  maxLength={255}
                  autoFocus
                />
              </Field>
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={isCreatingFolder || !folderName.trim()}
            >
              {isCreatingFolder && <Spinner data-icon="inline-start" />}
              Create folder
            </Button>
          </form>
        </PopoverContent>
      </Popover>

      {(onDownloadFolder || onShareFolder) && (
        <Menu>
          <MenuTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Folder actions"
              />
            }
          >
            <MoreHorizontalIcon />
          </MenuTrigger>
          <MenuPopup align="end" className="min-w-52">
            <MenuGroup>
              {onDownloadFolder && (
                <MenuItem className="whitespace-nowrap" onClick={onDownloadFolder}>
                  <DownloadIcon />
                  Download this folder
                </MenuItem>
              )}
              {onShareFolder && (
                <MenuItem className="whitespace-nowrap" onClick={onShareFolder}>
                  <Share2Icon />
                  Share this folder
                </MenuItem>
              )}
            </MenuGroup>
          </MenuPopup>
        </Menu>
      )}

      <input
        ref={fileInput}
        type="file"
        multiple
        className="hidden"
        onChange={uploadSelectedFiles}
      />
      <input
        ref={(node) => {
          folderInput.current = node;
          node?.setAttribute("webkitdirectory", "");
        }}
        type="file"
        multiple
        className="hidden"
        onChange={uploadSelectedFiles}
      />
    </div>
  );
}

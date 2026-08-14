import {
  FolderPlusIcon,
  FolderUpIcon,
  MoreHorizontalIcon,
  Share2Icon,
  UploadIcon,
} from "lucide-react";
import { type ChangeEvent, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import type { NewDriveUploadSelection } from "@/hooks/use-new-drive-upload";

interface AddItemsMenuProps {
  upload: (selection: NewDriveUploadSelection) => Promise<void>;
  isUploading: boolean;
  onCreateFolder: (name: string) => Promise<unknown>;
  onShareFolder?: () => void;
}

export function AddItemsMenu({
  upload,
  isUploading,
  onCreateFolder,
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
      toast.success("Folder created");
      setFolderName("");
      setFolderPopoverOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create folder");
    } finally {
      setIsCreatingFolder(false);
    }
  }

  return (
    <div className="flex items-center gap-2 sm:shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button disabled={isUploading} />}>
          {isUploading ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <UploadIcon data-icon="inline-start" />
          )}
          {isUploading ? "Uploading..." : "Upload File/Folder"}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => fileInput.current?.click()}>
              <UploadIcon />
              Upload files
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => folderInput.current?.click()}>
              <FolderUpIcon />
              Upload folder
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

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
          <PopoverHeader>
            <PopoverTitle>Create a folder</PopoverTitle>
            <PopoverDescription>Add an empty folder in this location.</PopoverDescription>
          </PopoverHeader>
          <form onSubmit={submitFolder} className="flex flex-col gap-4">
            <FieldGroup className="gap-4">
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
            </FieldGroup>
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

      {onShareFolder && (
        <DropdownMenu>
          <DropdownMenuTrigger
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
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onShareFolder}>
                <Share2Icon />
                Share this folder
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
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

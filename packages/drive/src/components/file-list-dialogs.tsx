import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@dg/ui/components/alert-dialog";
import { Button } from "@dg/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dg/ui/components/dialog";
import { Input } from "@dg/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dg/ui/components/select";
import { Spinner } from "@dg/ui/components/spinner";
import { FolderInputIcon, Trash2Icon } from "lucide-react";
import type { FormEventHandler } from "react";

import type { NewDriveItem } from "../types";

export function DeleteItemsDialog({
  itemIds,
  itemName,
  description,
  isDeleting,
  onOpenChange,
  onConfirm,
}: {
  itemIds: string[];
  itemName?: string;
  description?: string;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={itemIds.length > 0} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>
            Delete {itemIds.length === 1 ? "this item" : "selected items"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {itemIds.length === 1 ? (
              <>
                This will permanently remove <strong>{itemName}</strong>.
              </>
            ) : (
              `This will permanently remove ${itemIds.length} selected items.`
            )}{" "}
            Folders and everything inside them will be deleted. This action cannot be
            undone. {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {isDeleting ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Trash2Icon data-icon="inline-start" />
            )}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RenameItemDialog({
  item,
  value,
  isRenaming,
  onOpenChange,
  onValueChange,
  onSubmit,
}: {
  item: NewDriveItem | null;
  value: string;
  isRenaming: boolean;
  onOpenChange: (open: boolean) => void;
  onValueChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}) {
  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename</DialogTitle>
          <DialogDescription>Enter a new name for {item?.name}.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <Input
            autoFocus
            aria-label="New item name"
            maxLength={255}
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isRenaming}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isRenaming || !value.trim() || value.trim() === item?.name}
            >
              {isRenaming && <Spinner data-icon="inline-start" />}
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MoveItemDialog({
  item,
  destinationId,
  destinations,
  isMoving,
  onOpenChange,
  onDestinationChange,
  onConfirm,
}: {
  item: NewDriveItem | null;
  destinationId: string;
  destinations: Array<{ id: string; name: string }>;
  isMoving: boolean;
  onOpenChange: (open: boolean) => void;
  onDestinationChange: (value: string) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move {item?.name}</DialogTitle>
          <DialogDescription>Choose a folder within this shared area.</DialogDescription>
        </DialogHeader>
        <Select
          value={destinationId}
          onValueChange={(value) => onDestinationChange(value ?? "")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a destination" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {destinations
                .filter(({ id }) => id !== item?.id)
                .map((destination) => (
                  <SelectItem key={destination.id} value={destination.id}>
                    {destination.name}
                  </SelectItem>
                ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isMoving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={isMoving || !destinationId} onClick={onConfirm}>
            {isMoving ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <FolderInputIcon data-icon="inline-start" />
            )}
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

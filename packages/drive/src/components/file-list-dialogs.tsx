import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@dg/ui-coss/components/alert-dialog";
import { Button } from "@dg/ui-coss/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from "@dg/ui-coss/components/dialog";
import { Input } from "@dg/ui-coss/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dg/ui-coss/components/select";
import { Spinner } from "@dg/ui-coss/components/spinner";
import { FolderInputIcon, Trash2Icon } from "lucide-react";
import type { FormEventHandler } from "react";

import type { DriveItem } from "../types";

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
          <div
            data-slot="alert-dialog-media"
            className="mb-2 inline-flex size-16 items-center justify-center rounded-md bg-destructive/10 text-destructive sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-8"
          >
            <Trash2Icon />
          </div>
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
          <AlertDialogClose disabled={isDeleting} render={<Button variant="outline" />}>
            Cancel
          </AlertDialogClose>
          <AlertDialogClose
            disabled={isDeleting}
            onClick={() => {
              onConfirm();
            }}
            render={<Button variant="destructive" />}
          >
            {isDeleting ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Trash2Icon data-icon="inline-start" />
            )}
            Delete
          </AlertDialogClose>
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
  item: DriveItem | null;
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
          <DialogPanel>
            <Input
              autoFocus
              aria-label="New item name"
              maxLength={255}
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
            />
          </DialogPanel>
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
  item: DriveItem | null;
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
        <DialogPanel>
          <Select
            value={destinationId}
            onValueChange={(value) => onDestinationChange(value ?? "")}
            items={destinations
              .filter(({ id }) => id !== item?.id)
              .map((destination) => ({
                value: destination.id,
                label: destination.name,
              }))}
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
        </DialogPanel>
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

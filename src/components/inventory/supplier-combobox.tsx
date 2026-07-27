import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { ChevronsUpDownIcon } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type SupplierComboboxProps = {
  value: Id<"inventorySuppliers"> | null;
  onValueChange: (value: Id<"inventorySuppliers">) => void;
  initialLabel?: string;
  disabled?: boolean;
  invalid?: boolean;
};

export function SupplierCombobox({
  value,
  onValueChange,
  initialLabel,
  disabled,
  invalid,
}: SupplierComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedName, setSelectedName] = useState(initialLabel);
  const listId = useId();
  const { data: suppliers, isPending } = useQuery(
    convexQuery(api.inventory.searchSupplierOptions, {
      query: search,
    }),
  );
  const selectedSupplier = suppliers?.find((supplier) => supplier._id === value);
  const selectedLabel = selectedSupplier?.name ?? (value ? selectedName : undefined);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={invalid}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !selectedLabel && "text-muted-foreground")}>
            {selectedLabel ?? "Select a supplier"}
          </span>
          <ChevronsUpDownIcon data-icon="inline-end" className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search suppliers..."
          />
          <CommandList id={listId}>
            <CommandEmpty>
              {isPending ? "Loading suppliers..." : "No supplier found."}
            </CommandEmpty>
            <CommandGroup>
              {suppliers?.map((supplier) => (
                <CommandItem
                  key={supplier._id}
                  value={supplier._id}
                  data-checked={value === supplier._id}
                  onSelect={() => {
                    onValueChange(supplier._id);
                    setSelectedName(supplier.name);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  {supplier.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

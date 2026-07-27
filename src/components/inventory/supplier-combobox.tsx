import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const MAX_SUPPLIER_NAME_LENGTH = 120;

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
  const trimmedSearch = search.trim();
  const { data: suppliers, isPending } = useQuery(
    convexQuery(api.inventory.searchSupplierOptions, {
      query: search,
    }),
  );
  const createSupplier = useConvexMutation(api.inventory.createSupplier);
  const createMutation = useMutation({
    mutationFn: (args: { name: string }) => createSupplier(args),
    onSuccess: (supplierId, variables) => {
      const supplierName = variables.name.trim();

      onValueChange(supplierId);
      setSelectedName(supplierName);
      setOpen(false);
      setSearch("");
      toast.success(`Supplier "${supplierName}" created`);
    },
    onError: (error) => {
      toast.error(error.message || "Could not create supplier");
    },
  });
  const selectedSupplier = suppliers?.find((supplier) => supplier._id === value);
  const selectedLabel = selectedSupplier?.name ?? (value ? selectedName : undefined);
  const hasExactMatch = suppliers?.some(
    (supplier) =>
      supplier.name.trim().toLocaleLowerCase() === trimmedSearch.toLocaleLowerCase(),
  );
  const canCreate =
    !isPending &&
    trimmedSearch.length > 0 &&
    trimmedSearch.length <= MAX_SUPPLIER_NAME_LENGTH &&
    !hasExactMatch;

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
          disabled={disabled || createMutation.isPending}
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
            disabled={createMutation.isPending}
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
            {canCreate && (
              <>
                {!!suppliers?.length && <CommandSeparator />}
                <CommandGroup>
                  <CommandItem
                    value={`create-${trimmedSearch}`}
                    disabled={createMutation.isPending}
                    onSelect={() => createMutation.mutate({ name: trimmedSearch })}
                  >
                    {createMutation.isPending ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <PlusIcon data-icon="inline-start" />
                    )}
                    <span className="truncate">Create supplier “{trimmedSearch}”</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

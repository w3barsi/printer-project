import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Spinner } from "@/components/ui/spinner";

const MAX_SUPPLIER_NAME_LENGTH = 120;

type SupplierOption = {
  kind: "supplier";
  _id: Id<"inventorySuppliers">;
  name: string;
};

type CreateSupplierOption = {
  kind: "create";
  name: string;
};

type SupplierComboboxOption = SupplierOption | CreateSupplierOption;

type SupplierComboboxProps = {
  value: Id<"inventorySuppliers"> | null;
  onValueChange: (value: Id<"inventorySuppliers">) => void;
  id?: string;
  initialLabel?: string;
  disabled?: boolean;
  invalid?: boolean;
};

export function SupplierCombobox({
  value,
  onValueChange,
  id,
  initialLabel,
  disabled,
  invalid,
}: SupplierComboboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [search, setSearch] = useState(initialLabel ?? "");
  const [selectedName, setSelectedName] = useState(initialLabel);
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
      setSearch(supplierName);
      toast.success(`Supplier "${supplierName}" created`);
    },
    onError: (error) => {
      toast.error(error.message || "Could not create supplier");
    },
  });
  const selectedSupplier = suppliers?.find((supplier) => supplier._id === value);
  const selectedLabel = selectedSupplier?.name ?? (value ? selectedName : undefined);
  const hasExactMatch = suppliers?.some(
    (supplier) => supplier.name.trim().toLowerCase() === trimmedSearch.toLowerCase(),
  );
  const canCreate =
    !isPending &&
    trimmedSearch.length > 0 &&
    trimmedSearch.length <= MAX_SUPPLIER_NAME_LENGTH &&
    !hasExactMatch;
  const selectedOption: SupplierOption | null =
    value && selectedLabel
      ? {
          kind: "supplier",
          _id: value,
          name: selectedLabel,
        }
      : null;
  const supplierOptions: SupplierOption[] =
    suppliers?.map((supplier) => ({
      kind: "supplier",
      ...supplier,
    })) ?? [];
  const options: SupplierComboboxOption[] = selectedOption
    ? supplierOptions.some((supplier) => supplier._id === selectedOption._id)
      ? supplierOptions
      : [...supplierOptions, selectedOption]
    : supplierOptions;

  if (canCreate) {
    options.push({
      kind: "create",
      name: trimmedSearch,
    });
  }

  function getEmptyMessage() {
    if (isPending) return "Loading suppliers...";

    if (trimmedSearch.length > MAX_SUPPLIER_NAME_LENGTH) {
      return `Supplier names cannot exceed ${MAX_SUPPLIER_NAME_LENGTH} characters.`;
    }

    return trimmedSearch ? "No supplier found." : "Start typing to find a supplier.";
  }

  return (
    <Combobox<SupplierComboboxOption>
      items={options}
      value={selectedOption}
      inputValue={search}
      filter={null}
      autoHighlight
      disabled={disabled || createMutation.isPending}
      itemToStringLabel={(option) => option.name}
      itemToStringValue={(option) =>
        option.kind === "supplier" ? option._id : `create:${option.name}`
      }
      isItemEqualToValue={(option, selectedValue) =>
        option.kind === selectedValue.kind &&
        (option.kind === "supplier" && selectedValue.kind === "supplier"
          ? option._id === selectedValue._id
          : option.name === selectedValue.name)
      }
      onInputValueChange={(nextSearch) => setSearch(nextSearch)}
      onValueChange={(option) => {
        if (!option) return;

        if (option.kind === "create") {
          createMutation.mutate({ name: option.name });
          return;
        }

        onValueChange(option._id);
        setSelectedName(option.name);
        setSearch(option.name);
      }}
    >
      <ComboboxInput
        id={inputId}
        placeholder="Search or create a supplier..."
        aria-invalid={invalid}
        disabled={disabled || createMutation.isPending}
        className="w-full"
      />
      <ComboboxContent>
        <ComboboxEmpty>{getEmptyMessage()}</ComboboxEmpty>
        <ComboboxList>
          {(option: SupplierComboboxOption) => (
            <ComboboxItem
              key={option.kind === "supplier" ? option._id : `create:${option.name}`}
              value={option}
            >
              {option.kind === "create" &&
                (createMutation.isPending ? <Spinner /> : <PlusIcon />)}
              <span className="truncate">
                {option.kind === "create"
                  ? `Create supplier “${option.name}”`
                  : option.name}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

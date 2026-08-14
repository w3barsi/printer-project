import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

export type JobOrderOption = {
  _id: Id<"jo"> | null;
  joNumber?: number;
  name: string;
  status?: "pending" | "in-progress" | "completed";
};

const noJobOrderOption: JobOrderOption = {
  _id: null,
  name: "No Job Order",
};

type JobOrderComboboxProps = {
  value: Id<"jo"> | null;
  onValueChange: (value: Id<"jo"> | null) => void;
  onOptionChange?: (option: JobOrderOption | null) => void;
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  "aria-label"?: string;
};

export function JobOrderCombobox({
  value,
  onValueChange,
  onOptionChange,
  id,
  disabled,
  invalid,
  "aria-label": ariaLabel,
}: JobOrderComboboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [search, setSearch] = useState("");
  const [selectedOption, setSelectedOption] = useState<JobOrderOption | null>(null);
  const { data: jobOrders, isPending } = useQuery(
    convexQuery(api.jo.searchOptions, { query: search }),
  );
  const options: JobOrderOption[] = jobOrders ? [...jobOrders] : [];
  const selected = value
    ? (options.find((option) => option._id === value) ?? selectedOption)
    : noJobOrderOption;

  if (!options.some((option) => option._id === null)) {
    options.unshift(noJobOrderOption);
  }

  if (selected?._id && !options.some((option) => option._id === selected._id)) {
    options.push(selected);
  }

  return (
    <Combobox<JobOrderOption>
      items={options}
      value={selected}
      inputValue={search}
      filter={null}
      autoHighlight
      disabled={disabled}
      itemToStringLabel={(option) =>
        option.joNumber ? `JO #${option.joNumber} - ${option.name}` : option.name
      }
      itemToStringValue={(option) => option._id ?? "no-job-order"}
      isItemEqualToValue={(option, selectedValue) => option._id === selectedValue._id}
      onInputValueChange={setSearch}
      onValueChange={(option) => {
        const nextOption = option?._id ? option : null;

        onValueChange(nextOption?._id ?? null);
        onOptionChange?.(nextOption);
        setSelectedOption(nextOption);
        setSearch(nextOption ? `JO #${nextOption.joNumber} - ${nextOption.name}` : "");
      }}
    >
      <ComboboxInput
        id={inputId}
        placeholder="Search by JO number or name..."
        showClear={Boolean(value)}
        aria-label={ariaLabel}
        aria-invalid={invalid}
        disabled={disabled}
        className="w-full"
      />
      <ComboboxContent>
        <ComboboxEmpty>
          {isPending ? "Loading Job Orders..." : "No selectable Job Order found."}
        </ComboboxEmpty>
        <ComboboxList>
          {(option: JobOrderOption) => (
            <ComboboxItem key={option._id ?? "no-job-order"} value={option}>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">
                  {option.joNumber ? `JO #${option.joNumber}` : option.name}
                </span>
                {option.joNumber && (
                  <span className="truncate text-xs text-muted-foreground">
                    {option.name}
                  </span>
                )}
              </span>
              {option.status && (
                <Badge variant="outline">{formatStatus(option.status)}</Badge>
              )}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function formatStatus(status: NonNullable<JobOrderOption["status"]>) {
  return status === "in-progress" ? "In progress" : status;
}

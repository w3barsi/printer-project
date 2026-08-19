import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

const MAX_CUSTOMER_NAME_LENGTH = 120;

type CustomerOption = {
  kind: "customer";
  _id: Id<"customer">;
  name: string;
  handler?: string;
  contactNumbers?: string[];
};

type CreateCustomerOption = {
  kind: "create";
  name: string;
};

type Option = CustomerOption | CreateCustomerOption;

export function CustomerCombobox({
  value,
  onValueChange,
  id,
  invalid,
}: {
  value: Id<"customer"> | null;
  onValueChange: (customer: CustomerOption | null) => void;
  id?: string;
  invalid?: boolean;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [handler, setHandler] = useState("");
  const [contactNumbers, setContactNumbers] = useState("");
  const trimmedSearch = search.trim();
  const { data: customers, isPending } = useQuery(
    convexQuery(api.customer.searchOptions, { query: search }),
  );
  const createMutation = useMutation({
    mutationFn: useConvexMutation(api.customer.create),
    onSuccess: (customerId) => {
      const customer: CustomerOption = {
        kind: "customer",
        _id: customerId,
        name: newName.trim(),
        ...(handler.trim() ? { handler: handler.trim() } : {}),
        ...(parseContactNumbers(contactNumbers).length
          ? { contactNumbers: parseContactNumbers(contactNumbers) }
          : {}),
      };

      setSelectedCustomer(customer);
      setSearch(customer.name);
      onValueChange(customer);
      setCreateOpen(false);
      toast.success(`Customer "${customer.name}" created`);
    },
    onError: (error) => toast.error(error.message || "Could not create customer"),
  });
  const customerOptions: CustomerOption[] =
    customers?.map((customer) => ({ kind: "customer", ...customer })) ?? [];
  const options: Option[] = selectedCustomer
    ? customerOptions.some((customer) => customer._id === selectedCustomer._id)
      ? customerOptions
      : [...customerOptions, selectedCustomer]
    : customerOptions;
  const hasExactMatch = customers?.some(
    (customer) => customer.name.trim().toLowerCase() === trimmedSearch.toLowerCase(),
  );

  if (
    !isPending &&
    trimmedSearch.length > 0 &&
    trimmedSearch.length <= MAX_CUSTOMER_NAME_LENGTH &&
    !hasExactMatch
  ) {
    options.push({ kind: "create", name: trimmedSearch });
  }

  function openCreateDialog(name: string) {
    setNewName(name);
    setHandler("");
    setContactNumbers("");
    setCreateOpen(true);
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate({
      name: newName,
      handler: handler.trim() || undefined,
      contactNumbers: parseContactNumbers(contactNumbers),
    });
  }

  return (
    <>
      <Combobox<Option>
        items={options}
        value={selectedCustomer}
        inputValue={search}
        filter={null}
        autoHighlight
        itemToStringLabel={(option) => option.name}
        itemToStringValue={(option) =>
          option.kind === "customer" ? option._id : `create:${option.name}`
        }
        isItemEqualToValue={(option, selected) =>
          option.kind === selected.kind &&
          (option.kind === "customer" && selected.kind === "customer"
            ? option._id === selected._id
            : option.name === selected.name)
        }
        onInputValueChange={setSearch}
        onValueChange={(option) => {
          if (!option) {
            setSelectedCustomer(null);
            setSearch("");
            onValueChange(null);
          } else if (option.kind === "create") {
            openCreateDialog(option.name);
          } else {
            setSelectedCustomer(option);
            setSearch(option.name);
            onValueChange(option);
          }
        }}
      >
        <ComboboxInput
          id={inputId}
          placeholder="Search or create a customer..."
          showClear={Boolean(value)}
          aria-invalid={invalid}
          className="w-full"
          autoFocus
        />
        <ComboboxContent>
          <ComboboxEmpty>
            {isPending ? "Loading customers..." : "No customer found."}
          </ComboboxEmpty>
          <ComboboxList>
            {(option: Option) => (
              <ComboboxItem
                key={option.kind === "customer" ? option._id : `create:${option.name}`}
                value={option}
              >
                {option.kind === "create" && <PlusIcon />}
                <div className="min-w-0">
                  <p className="truncate">
                    {option.kind === "create"
                      ? `Create customer "${option.name}"`
                      : option.name}
                  </p>
                  {option.kind === "customer" && option.handler && (
                    <p className="truncate text-xs text-muted-foreground">
                      Handler: {option.handler}
                    </p>
                  )}
                </div>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create customer</DialogTitle>
            <DialogDescription>
              Save this customer so they can be reused for future Job Orders.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${inputId}-new-name`}>Customer name</FieldLabel>
                <Input
                  id={`${inputId}-new-name`}
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  maxLength={MAX_CUSTOMER_NAME_LENGTH}
                  required
                  autoFocus
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${inputId}-handler`}>Handler</FieldLabel>
                <Input
                  id={`${inputId}-handler`}
                  value={handler}
                  onChange={(event) => setHandler(event.target.value)}
                  placeholder="Customer's go-to person"
                />
                <FieldDescription>
                  Optional, for customers that are companies or clients.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor={`${inputId}-contacts`}>Contact numbers</FieldLabel>
                <Input
                  id={`${inputId}-contacts`}
                  value={contactNumbers}
                  onChange={(event) => setContactNumbers(event.target.value)}
                  placeholder="0917 123 4567, 0928 765 4321"
                />
                <FieldDescription>
                  Optional. Separate multiple numbers with commas.
                </FieldDescription>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button
                type="submit"
                disabled={createMutation.isPending || !newName.trim()}
              >
                {createMutation.isPending && <Spinner data-icon="inline-start" />}
                Create and select
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function parseContactNumbers(value: string) {
  return [
    ...new Set(
      value
        .split(/[\n,]/)
        .map((number) => number.trim())
        .filter(Boolean),
    ),
  ];
}

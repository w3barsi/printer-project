import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchAuth } from "@/routes/__root";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import DateAndTimePicker from "./date-and-time-picker";

export function CreateDialog() {
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [date, setDate] = useState<Date>(today);
  const [time, setTime] = useState<string | null>(null);
  const { data: userData } = useQuery({ queryKey: ["user"], queryFn: fetchAuth });

  const createJo = useMutation(api.jo.createJo).withOptimisticUpdate(
    (localStore, args) => {
      const { name, pickupDate, pickupTime, contactNumber } = args;

      const getWithPaginationArgs = {
        paginationOptions: {
          numItems: 10,
          cursor: null,
        },
      };

      const currentValue = localStore.getQuery(
        api.jo.getWithPagination,
        getWithPaginationArgs,
      );

      const newJo = {
        _id: crypto.randomUUID() as Id<"jo">,
        _creationTime: Date.now(),
        createdBy: userData!.user.userId as Id<"users">,
        updatedAt: undefined,
        pickupDate,
        pickupTime,
        contactNumber,
        name,
        joNumber: currentValue?.jos?.length ? currentValue.jos[0].joNumber + 1 : 999,
        status: "pending" as const,
        items: [],
      };

      localStore.setQuery(api.jo.getWithPagination, getWithPaginationArgs, {
        nextCursor: currentValue?.nextCursor,
        jos: [newJo, ...(currentValue?.jos ?? [])],
      });
    },
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      console.log({
        name,
        contactNumber: contact.length === 0 ? undefined : contact,
        pickupTime: time ?? undefined,
        pickupDate: date.getTime(),
      });
      createJo({
        name,
        contactNumber: contact.length === 0 ? undefined : contact,
        pickupTime: time ?? undefined,
        pickupDate: date.getTime(),
      });
      setOpen(false);

      setName("");
      setContact("");
      setDate(today);
      setTime(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" />
          Create
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[95vh] flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create Job Orders</DialogTitle>
          <DialogDescription>
            Create a new job order to start tracking items and progress.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-1">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter job order name"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contact">Contact Number</Label>
                <Input
                  id="contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Enter contact number (optional)"
                />
              </div>
              <DateAndTimePicker
                date={date}
                setDate={setDate}
                time={time}
                setTime={setTime}
                today={today}
              />
            </div>
            <DialogFooter className="flex-shrink-0">
              <Button type="submit">{"Create"}</Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

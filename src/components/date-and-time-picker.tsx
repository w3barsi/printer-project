import { format } from "date-fns";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function DateAndTimePicker({
  date,
  setDate,
  today,
}: {
  date: Date;
  setDate: React.Dispatch<React.SetStateAction<Date>>;
  today: Date;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id="pickup-date"
            type="button"
            variant="outline"
            className="h-10 w-full justify-between font-normal"
          />
        }
      >
        {format(date, "MMM d, yyyy")}
        <ChevronDownIcon className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(newDate) => {
            if (!newDate) return;
            setDate(newDate);
            setOpen(false);
          }}
          className="p-1.5 [--cell-size:--spacing(7)]"
          disabled={{ before: today }}
        />
      </PopoverContent>
    </Popover>
  );
}
//       </div>

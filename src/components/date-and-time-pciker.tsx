import { format } from "date-fns";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DateAndTimePicker() {
  const today = new Date();
  const [date, setDate] = useState<Date>(today);
  const [time, setTime] = useState<string | null>(null);

  // Mock time slots data
  const timeSlots = [
    { time: "9:00 AM", available: true },
    { time: "9:30 AM", available: true },
    { time: "10:00 AM", available: true },
    { time: "10:30 AM", available: true },
    { time: "11:00 AM", available: true },
    { time: "11:30 AM", available: true },
    { time: "12:00 PM", available: true },
    { time: "12:30 PM", available: true },
    { time: "1:00 PM", available: true },
    { time: "1:30 PM", available: true },
    { time: "2:00 PM", available: true },
    { time: "2:30 PM", available: true },
    { time: "3:00 PM", available: true },
    { time: "3:30 PM", available: true },
    { time: "4:00 PM", available: true },
    { time: "4:30 PM", available: true },
    { time: "5:00 PM", available: true },
  ];

  return (
    <div>
      <div className="rounded-md border">
        <div className="grid grid-cols-1 md:grid-cols-3">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(newDate) => {
              if (newDate) {
                setDate(newDate);
                setTime(null);
              }
            }}
            className="col-span-1 w-full p-2 sm:pe-5 md:col-span-2"
            disabled={[
              { before: today }, // Dates before today
            ]}
          />
          <div className="relative col-span-1 w-full max-sm:h-48">
            <div className="absolute inset-0 py-4 max-sm:border-t">
              <ScrollArea className="h-full sm:border-s">
                <div className="space-y-3">
                  <div className="flex h-5 shrink-0 items-center px-5">
                    <p className="text-sm font-medium">{format(date, "EEEE, d")}</p>
                  </div>
                  <div className="grid gap-1.5 px-5 max-sm:grid-cols-2">
                    {timeSlots.map(({ time: timeSlot, available }) => (
                      <Button
                        key={timeSlot}
                        variant={time === timeSlot ? "default" : "outline"}
                        size="sm"
                        className="w-full"
                        onClick={() => setTime(timeSlot)}
                        disabled={!available}
                      >
                        {timeSlot}
                      </Button>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
      <p
        className="text-muted-foreground mt-4 text-center text-xs"
        role="region"
        aria-live="polite"
      >
        Appointment picker -{" "}
        <a
          className="hover:text-foreground underline"
          href="https://daypicker.dev/"
          target="_blank"
          rel="noopener nofollow"
        >
          React DayPicker
        </a>
      </p>
    </div>
  );
}

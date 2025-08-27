import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DateAndTimePicker({
  date,
  setDate,
  time,
  setTime,
  today,
}: {
  date: Date;
  setDate: React.Dispatch<React.SetStateAction<Date>>;
  time: string | null;
  setTime: React.Dispatch<React.SetStateAction<string | null>>;
  today: Date;
}) {
  // Mock time slots data
  const timeSlots = [
    { time: "8:00 AM" },
    { time: "8:30 AM" },
    { time: "9:00 AM" },
    { time: "9:30 AM" },
    { time: "10:00 AM" },
    { time: "10:30 AM" },
    { time: "11:00 AM" },
    { time: "11:30 AM" },
    { time: "12:00 PM" },
    { time: "12:30 PM" },
    { time: "1:00 PM" },
    { time: "1:30 PM" },
    { time: "2:00 PM" },
    { time: "2:30 PM" },
    { time: "3:00 PM" },
    { time: "3:30 PM" },
    { time: "4:00 PM" },
    { time: "4:30 PM" },
    { time: "5:00 PM" },
  ];

  // useEffect(() => {
  //   const now = new Date();
  //   const currentMinutes = now.getHours() * 60 + now.getMinutes();
  //   let nearestTime = null;
  //   let minDiff = Infinity;
  //
  //   for (const slot of timeSlots) {
  //     const slotMinutes = timeToMinutes(slot.time);
  //     const diff = Math.abs(slotMinutes - currentMinutes);
  //     if (diff < minDiff) {
  //       minDiff = diff;
  //       nearestTime = slot.time;
  //     }
  //   }
  //
  //   if (nearestTime) {
  //     // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
  //     setTime(nearestTime);
  //     // Scroll to selected time after a short delay to ensure DOM update
  //     const timeoutId = setTimeout(() => {
  //       const button = document.querySelector(
  //         `[data-time="${nearestTime}"]`,
  //       ) as HTMLElement;
  //       if (button) {
  //         button.scrollIntoView({ behavior: "smooth", block: "center" });
  //       }
  //     }, 100);
  //
  //     // Cleanup timeout on unmount or re-run
  //     return () => clearTimeout(timeoutId);
  //   }
  // }, []);

  return (
    <div>
      <div className="overflow-hidden rounded-md border">
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
          <div className="relative col-span-1 w-full max-md:h-48">
            <div className="absolute inset-0 py-4 max-md:border-t">
              <ScrollArea className="h-full md:border-s">
                <div className="space-y-3">
                  <div className="flex h-5 shrink-0 items-center px-5">
                    <p className="text-sm font-medium">{format(date, "EEEE, d")}</p>
                  </div>
                  <div className="grid gap-1.5 px-5 max-sm:grid-cols-2">
                    {timeSlots.map(({ time: timeSlot }) => (
                      <Button
                        key={timeSlot}
                        data-time={timeSlot}
                        variant={time === timeSlot ? "default" : "outline"}
                        size="sm"
                        className="w-full"
                        type="button"
                        onClick={() => setTime(timeSlot)}
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
    </div>
  );
}

import { Calendar } from "@/components/ui/calendar";

export default function DateAndTimePicker({
  date,
  setDate,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  // const timeSlots = [
  //   { time: "8:00 AM" },
  //   { time: "8:30 AM" },
  //   { time: "9:00 AM" },
  //   { time: "9:30 AM" },
  //   { time: "10:00 AM" },
  //   { time: "10:30 AM" },
  //   { time: "11:00 AM" },
  //   { time: "11:30 AM" },
  //   { time: "12:00 PM" },
  //   { time: "12:30 PM" },
  //   { time: "1:00 PM" },
  //   { time: "1:30 PM" },
  //   { time: "2:00 PM" },
  //   { time: "2:30 PM" },
  //   { time: "3:00 PM" },
  //   { time: "3:30 PM" },
  //   { time: "4:00 PM" },
  //   { time: "4:30 PM" },
  //   { time: "5:00 PM" },
  // ];
  //
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
    <div className="overflow-x-auto rounded-md border">
      <Calendar
        mode="single"
        selected={date}
        onSelect={(newDate) => {
          if (newDate) {
            setDate(newDate);
            setTime(null);
          }
        }}
        className="w-full min-w-[280px] p-2"
        disabled={[
          { before: today }, // Dates before today
        ]}
      />
    </div>
  );
}

// <div className="flex max-h-[400px] flex-col gap-1 overflow-y-auto border-t p-2 md:max-h-none md:border-t-0 md:border-l">
//         <p className="pb-1 text-sm font-medium">{format(date, "EEEE, d")}</p>
//         {timeSlots.map(({ time: timeSlot }) => (
//           <Button
//             key={timeSlot}
//             data-time={timeSlot}
//             variant={time === timeSlot ? "default" : "outline"}
//             size="sm"
//             className="w-full"
//             type="button"
//             onClick={() => setTime(timeSlot)}
//           >
//             {timeSlot}
//           </Button>
//         ))}
//       </div>

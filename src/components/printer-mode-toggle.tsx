import { useDevice } from "@/contexts/DeviceContext";
import { Check, PrinterIcon } from "lucide-react";
import { DropdownMenuItem } from "./ui/dropdown-menu";

export function PrinterModeToggle() {
  const { isConnected, isPrinterMode, setIsPrinterMode } = useDevice();

  if (!isConnected) {
    return null;
  }

  return (
    <DropdownMenuItem
      className="flex justify-between"
      onClick={() => setIsPrinterMode(!isPrinterMode)}
    >
      <span className="flex items-center gap-2">
        <PrinterIcon /> Mode
      </span>
      {isPrinterMode ? <Check /> : null}
    </DropdownMenuItem>
  );
}
